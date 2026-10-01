const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authMiddleware, requireRoles } = require('../middleware/auth');
const User = require('../models/User');
const Bed = require('../models/Bed');
const Order = require('../models/Order');
const Billing = require('../models/Billing');
const PDFDocument = require('pdfkit');

// All routes here require admin access
router.use(authMiddleware);

// Admit Patient
router.post('/admit-patient', requireRoles('admin'), async (req, res) => {
  const { full_name, email, password, allocated_floor, allocated_bed } = req.body;
  if (!full_name || !email || !password || !allocated_floor || !allocated_bed) {
    return res.status(400).json({ detail: 'All fields are required.' });
  }

  try {
    // Check if bed is available
    const bed = await Bed.findOne({ floor: allocated_floor, bed_number: allocated_bed });
    if (!bed) {
      return res.status(404).json({ detail: `Bed ${allocated_bed} on Floor ${allocated_floor} does not exist.` });
    }
    if (bed.is_occupied) {
      return res.status(409).json({ detail: `Bed ${allocated_bed} on Floor ${allocated_floor} is already occupied.` });
    }

    // Check if patient email is already used
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ detail: 'Email is already registered.' });
    }

    // Create User
    const passwordHash = await bcrypt.hash(password, 10);
    const newPatient = new User({
      full_name,
      email,
      passwordHash,
      role: 'user',
      patient_details: {
        allocated_floor,
        allocated_bed
      }
    });

    const savedPatient = await newPatient.save();

    // Mark Bed Occupied
    bed.is_occupied = true;
    bed.current_patient_id = savedPatient._id;
    await bed.save();

    return res.status(201).json({
      message: 'Patient admitted successfully.',
      patient_id: savedPatient._id,
      floor: allocated_floor,
      bed: allocated_bed
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Discharge Patient
router.post('/discharge-patient/:id', requireRoles('admin'), async (req, res) => {
  try {
    const patient = await User.findById(req.params.id);
    if (!patient || patient.role !== 'user') {
      return res.status(404).json({ detail: 'Patient not found.' });
    }

    if (patient.account_status === 'Inactive') {
      return res.status(400).json({ detail: 'Patient is already discharged.' });
    }

    // Free the Bed
    const details = patient.patient_details || {};
    await Bed.updateOne(
      { floor: details.allocated_floor, bed_number: details.allocated_bed },
      { $set: { is_occupied: false, current_patient_id: null } }
    );

    // Deactivate account
    patient.account_status = 'Inactive';
    await patient.save();

    // Compile billing on discharge automatically if not yet done
    let billing = await Billing.findOne({ patient_id: patient._id });
    let invoiceId;
    if (!billing) {
      invoiceId = `INV-${Date.now().toString().slice(-6)}`;
      const orders = await Order.find({ patient_id: patient._id, order_status: 'completed' });
      const orderSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);

      const room_charges = 2000; // Flat charge
      const service_charges = 1500; // Base consult charge
      const grand_total = orderSubtotal + room_charges + service_charges;

      billing = new Billing({
        invoice_id: invoiceId,
        patient_id: patient._id,
        orders: orders.map(o => o._id),
        room_charges,
        service_charges,
        grand_total,
        is_paid: false
      });
      await billing.save();
    } else {
      invoiceId = billing.invoice_id;
    }

    return res.json({
      message: 'Patient discharged. Bed has been freed. Invoice compiled.',
      patient_id: patient._id,
      invoice_id: invoiceId
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Get Patients Registry
router.get('/patients', requireRoles('admin'), async (req, res) => {
  try {
    const patients = await User.find({ role: 'user' }).sort({ createdAt: -1 });
    return res.json(patients);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Get Staff Registry (Doctors, Staff/Nurses, Peons, Chemist)
router.get('/staff', requireRoles('admin'), async (req, res) => {
  try {
    const staff = await User.find({ role: { $ne: 'user' } }).sort({ role: 1 });
    return res.json(staff);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Get Beds Map
router.get('/beds', requireRoles('admin', 'chemist', 'doctor', 'staff'), async (req, res) => {
  try {
    const beds = await Bed.find({}).sort({ floor: 1, bed_number: 1 }).populate('current_patient_id', 'full_name');
    return res.json(beds);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Get All Bills
router.get('/billing', requireRoles('admin'), async (req, res) => {
  try {
    const bills = await Billing.find({}).populate('patient_id', 'full_name email patient_details').sort({ createdAt: -1 });
    return res.json(bills);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Compile active patient billing ledger
router.post('/billing/compile/:patientId', requireRoles('admin'), async (req, res) => {
  try {
    const patient = await User.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ detail: 'Patient not found.' });

    // Check if invoice already exists
    const existingBill = await Billing.findOne({ patient_id: patient._id });
    if (existingBill) {
      return res.json(existingBill);
    }

    const invoiceId = `INV-${Date.now().toString().slice(-6)}`;
    const orders = await Order.find({ patient_id: patient._id, order_status: 'completed' });
    const orderSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);

    const room_charges = 2000;
    const service_charges = 1500;
    const grand_total = orderSubtotal + room_charges + service_charges;

    const billing = new Billing({
      invoice_id: invoiceId,
      patient_id: patient._id,
      orders: orders.map(o => o._id),
      room_charges,
      service_charges,
      grand_total,
      is_paid: false
    });

    const saved = await billing.save();
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PDF Invoicing Route
router.get('/billing/pdf/:invoiceId', requireRoles('admin'), async (req, res) => {
  try {
    const billing = await Billing.findOne({ invoice_id: req.params.invoiceId })
      .populate('patient_id')
      .populate({
        path: 'orders',
        populate: { path: 'ordered_by_id', select: 'full_name' }
      });

    if (!billing) {
      return res.status(404).json({ detail: 'Invoice not found.' });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${billing.invoice_id}.pdf`);

    doc.pipe(res);

    // Beautiful Header Design
    doc.fillColor('#1a365d').fontSize(24).text('MEDIBOT MEDICAL CENTER', { align: 'center' });
    doc.fontSize(10).fillColor('#4a5568').text('Floor 1-5 General Logistics & Inpatient Service', { align: 'center' });
    doc.moveDown(2);

    // Invoice Details
    doc.fillColor('#2d3748');
    doc.fontSize(16).text(`INVOICE: ${billing.invoice_id}`, { underline: true });
    doc.fontSize(10).text(`Generated: ${new Date(billing.createdAt).toLocaleString()}`);
    doc.moveDown(1);

    // Patient Details Table
    doc.rect(50, 160, 500, 75).fill('#f7fafc');
    doc.fillColor('#2d3748').fontSize(11);
    doc.text(`Patient Name: ${billing.patient_id.full_name}`, 60, 170);
    doc.text(`Patient Email: ${billing.patient_id.email}`, 60, 190);
    doc.text(`Location: Floor ${billing.patient_id.patient_details?.allocated_floor || 'N/A'}, Bed ${billing.patient_id.patient_details?.allocated_bed || 'N/A'}`, 60, 210);
    doc.moveDown(3);

    // Invoice Cost breakdown
    doc.fontSize(14).text('Services & Hospitalization Fees', 50, 260, { underline: true });
    doc.moveDown(1);

    doc.fontSize(11);
    doc.text('Base Service & Consultation Fee:', 50, 290);
    doc.text(`Rs. ${billing.service_charges}`, 450, 290, { align: 'right' });

    doc.text('Room Stay & Bed Maintenance Charges:', 50, 310);
    doc.text(`Rs. ${billing.room_charges}`, 450, 310, { align: 'right' });

    // Itemized Orders
    doc.moveDown(2);
    doc.fontSize(14).text('Pharmacy & Medical Shop Itemized Charges', 50, doc.y, { underline: true });
    doc.moveDown(1);

    let currentY = doc.y;
    billing.orders.forEach((order) => {
      doc.fontSize(11).text(`Order Subtotal (UUID: ${order.order_id.slice(0, 8)}...):`, 50, currentY);
      doc.text(`Rs. ${order.subtotal}`, 450, currentY, { align: 'right' });
      currentY += 20;

      order.items.forEach((itm) => {
        doc.fontSize(9).text(`  - ${itm.name}`, 70, currentY);
        doc.text(`Rs. ${itm.price}`, 450, currentY, { align: 'right' });
        currentY += 15;
      });
      currentY += 10;
    });

    // Grand Total Divider line
    doc.moveTo(50, currentY + 10).lineTo(550, currentY + 10).stroke('#cbd5e1');

    doc.fontSize(16).fillColor('#1a202c').text('GRAND TOTAL DUE:', 50, currentY + 25, { bold: true });
    doc.text(`Rs. ${billing.grand_total}`, 450, currentY + 25, { align: 'right', bold: true });

    doc.end();
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Add Staff Member
router.post('/add-staff', requireRoles('admin'), async (req, res) => {
  const { full_name, email, password, role, duty_shift, contact_info, qualification, assigned_department } = req.body;
  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ detail: 'Full name, email, password, and role are required.' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ detail: 'Email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const employee_id = `EMP-${role.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-3)}`;

    const newStaff = new User({
      full_name,
      email,
      passwordHash,
      role,
      duty_shift: duty_shift || 'none',
      employee_id,
      contact_info: contact_info || '+91 9999999999',
      qualification: qualification || 'Certified Practitioner',
      assigned_department: assigned_department || 'General Medicine',
      duty_log: [{ action: 'Profile registered by Supreme Admin' }]
    });

    const saved = await newStaff.save();
    return res.status(201).json({
      message: 'Staff profile provisioned successfully.',
      user_id: saved._id,
      employee_id
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
