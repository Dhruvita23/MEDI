const mongoose = require('mongoose');

const CallAlertSchema = new mongoose.Schema({
  from_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  from_role: {
    type: String,
    required: true
  },
  target_role: {
    type: String,
    required: true
  },
  floor: {
    type: Number,
    required: true
  },
  bed: {
    type: Number,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('CallAlert', CallAlertSchema);
