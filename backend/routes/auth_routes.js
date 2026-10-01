const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    if (user.account_status === 'Inactive') {
      return res.status(403).json({ detail: 'Access Denied: This account has been deactivated upon discharge.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    // Build JWT payload
    const tokenPayload = {
      user_id: user._id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      allocated_floor: user.patient_details?.allocated_floor || null,
      allocated_bed: user.patient_details?.allocated_bed || null
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production',
      { expiresIn: '2h' }
    );

    return res.json({
      access_token: token,
      token_type: 'bearer',
      user_id: user._id,
      role: user.role,
      full_name: user.full_name,
      allocated_floor: user.patient_details?.allocated_floor || null,
      allocated_bed: user.patient_details?.allocated_bed || null
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
