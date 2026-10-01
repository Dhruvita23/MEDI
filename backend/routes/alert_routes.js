const express = require('express');
const router = express.Router();
const { authMiddleware, requireRoles } = require('../middleware/auth');
const CallAlert = require('../models/CallAlert');

router.use(authMiddleware);

// Trigger a call alert
router.post('/call', async (req, res) => {
  const { target_role, floor, bed, message } = req.body;
  if (!target_role || floor === undefined || bed === undefined) {
    return res.status(400).json({ detail: 'Target role, floor number, and bed number are required.' });
  }

  try {
    const alert = new CallAlert({
      from_user_id: req.user.user_id,
      from_role: req.user.role,
      target_role,
      floor: parseInt(floor),
      bed: parseInt(bed),
      message: message || `Alert triggered by ${req.user.role}`
    });

    const saved = await alert.save();

    // Access socket.io instance from app context and emit event in real-time
    const io = req.app.get('socketio');
    if (io) {
      io.emit('new_alert', {
        id: saved._id,
        from_role: saved.from_role,
        target_role: saved.target_role,
        floor: saved.floor,
        bed: saved.bed,
        message: saved.message,
        createdAt: saved.createdAt
      });
    }

    return res.status(201).json({
      message: 'Call signal sent successfully.',
      alert: saved
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Get all active calls
router.get('/active', async (req, res) => {
  try {
    // Filter alerts where target_role matches the caller's role, or general query
    const alerts = await CallAlert.find({ is_active: true }).sort({ createdAt: -1 });
    return res.json(alerts);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// Resolve a call
router.post('/resolve/:id', async (req, res) => {
  try {
    const alert = await CallAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ detail: 'Alert not found.' });
    }

    alert.is_active = false;
    await alert.save();

    const io = req.app.get('socketio');
    if (io) {
      io.emit('resolve_alert', { id: alert._id });
    }

    return res.json({ message: 'Call resolved.', alert });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
