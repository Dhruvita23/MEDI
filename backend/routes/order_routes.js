const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authMiddleware, requireRoles } = require('../middleware/auth');
const Order = require('../models/Order');
const Billing = require('../models/Billing');

// All routes require authentication
router.use(authMiddleware);

// Patient: Place Order
router.post('/patient', requireRoles('user'), async (req, res) => {
  const { items_list, prescription_image_url } = req.body;
  if ((!items_list || items_list.length === 0) && !prescription_image_url) {
    return res.status(400).json({ detail: 'Please add items or upload a prescription.' });
  }

  try {
    const order_id = crypto.randomUUID();
    const order_type = prescription_image_url ? 'prescription_upload' : 'text_input';

    const newOrder = new Order({
      order_id,
      patient_id: req.user.user_id,
      ordered_by_role: 'user',
      ordered_by_id: req.user.user_id,
      order_type,
      prescription_image_url: prescription_image_url || null,
      items_list: items_list || [],
      order_status: 'pending'
    });

    const saved = await newOrder.save();
    return res.status(201).json({
      message: 'Order placed successfully.',
      order: saved
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Staff/Doctor: Place Order on behalf of Patient
router.post('/staff', requireRoles('staff', 'doctor'), async (req, res) => {
  const { patient_id, items_list, prescription_image_url } = req.body;
  if (!patient_id) {
    return res.status(400).json({ detail: 'Patient ID is required.' });
  }
  if ((!items_list || items_list.length === 0) && !prescription_image_url) {
    return res.status(400).json({ detail: 'Please add items or upload a prescription.' });
  }

  try {
    const order_id = crypto.randomUUID();
    const order_type = prescription_image_url ? 'prescription_upload' : 'text_input';

    const newOrder = new Order({
      order_id,
      patient_id,
      ordered_by_role: req.user.role,
      ordered_by_id: req.user.user_id,
      order_type,
      prescription_image_url: prescription_image_url || null,
      items_list: items_list || [],
      order_status: 'pending'
    });

    const saved = await newOrder.save();
    return res.status(201).json({
      message: 'Order placed successfully.',
      order: saved
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Chemist/All: List orders
router.get('/', requireRoles('admin', 'chemist', 'doctor', 'staff', 'user'), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'user') {
      // Patients only see their own orders
      query = { patient_id: req.user.user_id };
    } else if (req.user.role === 'doctor' || req.user.role === 'staff') {
      // Doctors/Staff see orders they placed or general orders
      query = { $or: [{ patient_id: req.user.user_id }, { ordered_by_id: req.user.user_id }] };
    }

    const orders = await Order.find(query).populate('patient_id', 'full_name patient_details').sort({ createdAt: -1 });
    return res.json(orders);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Chemist: Submit pricing / calculate order subtotal
router.post('/chemist/calculate', requireRoles('chemist', 'admin'), async (req, res) => {
  const { order_id, items } = req.body;
  if (!order_id || !items || !Array.isArray(items)) {
    return res.status(400).json({ detail: 'Order ID and items list are required.' });
  }

  try {
    const order = await Order.findOne({ order_id });
    if (!order) {
      return res.status(404).json({ detail: 'Order not found.' });
    }

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price), 0);

    // Update order
    order.items = items;
    order.subtotal = subtotal;
    order.order_status = 'completed';
    await order.save();

    // Auto-update Billing ledger if one is already open for this patient
    const openBilling = await Billing.findOne({ patient_id: order.patient_id, is_paid: false });
    if (openBilling) {
      if (!openBilling.orders.includes(order._id)) {
        openBilling.orders.push(order._id);
      }
      openBilling.grand_total += subtotal;
      await openBilling.save();
    }

    return res.json({
      message: 'Order priced & completed. Cost injected to patient billing ledger.',
      order
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
