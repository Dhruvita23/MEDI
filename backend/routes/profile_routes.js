const express = require('express');
const router = express.Router();
const { authMiddleware, requireRoles } = require('../middleware/auth');
const User = require('../models/User');
const Billing = require('../models/Billing');

// All profile endpoints require login
router.use(authMiddleware);

// Get any user profile by ID
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ detail: 'User profile not found.' });
    }
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Post a clinical history timeline event (Doctor, Nurse/Staff, or Admin only)
router.post('/:userId/clinical-event', requireRoles('doctor', 'staff', 'admin'), async (req, res) => {
  const { event, note } = req.body;
  if (!event || !note) {
    return res.status(400).json({ detail: 'Event type and note are required.' });
  }

  try {
    const patient = await User.findById(req.params.userId);
    if (!patient || patient.role !== 'user') {
      return res.status(404).json({ detail: 'Patient user not found.' });
    }

    if (!patient.patient_details) {
      patient.patient_details = {};
    }
    if (!patient.patient_details.clinical_history) {
      patient.patient_details.clinical_history = [];
    }

    patient.patient_details.clinical_history.push({
      event,
      note,
      logged_by: req.user.full_name,
      timestamp: new Date()
    });

    await patient.save();
    return res.json({
      message: 'Clinical event logged successfully.',
      clinical_history: patient.patient_details.clinical_history
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Dispense medicine directly and inject pricing into billing (Chemist, Nurse/Staff, or Admin)
router.post('/:userId/dispense-medicine', requireRoles('chemist', 'staff', 'admin'), async (req, res) => {
  const { name, quantity, price } = req.body;
  if (!name || !quantity || !price) {
    return res.status(400).json({ detail: 'Medicine name, quantity, and unit price are required.' });
  }

  try {
    const patient = await User.findById(req.params.userId);
    if (!patient || patient.role !== 'user') {
      return res.status(404).json({ detail: 'Patient user not found.' });
    }

    if (!patient.patient_details) {
      patient.patient_details = {};
    }
    if (!patient.patient_details.medication_log) {
      patient.patient_details.medication_log = [];
    }

    // 1. Add to Medication Administration Log
    patient.patient_details.medication_log.push({
      name,
      quantity: parseInt(quantity),
      dispensed_by: req.user.full_name,
      timestamp: new Date()
    });

    await patient.save();

    // 2. Instantly update Billing ledger balance
    const cost = parseFloat(price) * parseInt(quantity);
    let openBilling = await Billing.findOne({ patient_id: patient._id, is_paid: false });
    if (!openBilling) {
      // Create an active billing session if none exists
      const invoiceId = `INV-${Date.now().toString().slice(-6)}`;
      openBilling = new Billing({
        invoice_id: invoiceId,
        patient_id: patient._id,
        room_charges: 2000,
        service_charges: 1500,
        grand_total: 3500 + cost,
        is_paid: false
      });
    } else {
      openBilling.grand_total += cost;
    }
    
    await openBilling.save();

    return res.json({
      message: 'Medicine logged to profile and cost injected directly into billing ledger.',
      medication_log: patient.patient_details.medication_log,
      current_bill_price: openBilling.grand_total
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
