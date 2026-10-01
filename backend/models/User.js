const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'doctor', 'staff', 'peon', 'chemist', 'user'],
    required: true
  },
  duty_shift: {
    type: String,
    enum: ['day', 'night', 'none'],
    default: 'none'
  },
  account_status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  
  // Doctor & Staff profile fields
  employee_id: { type: String, default: null },
  contact_info: { type: String, default: null },
  qualification: { type: String, default: null },
  assigned_department: { type: String, default: null },
  duty_log: [
    {
      action: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ],

  // Patient profile fields
  patient_details: {
    allocated_floor: { type: Number, default: null },
    allocated_bed: { type: Number, default: null },
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    contact: { type: String, default: null },
    clinical_history: [
      {
        event: { type: String, required: true }, // e.g. "Admission", "Symptom", "Diagnosis"
        note: { type: String, required: true },
        logged_by: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    medication_log: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        dispensed_by: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ]
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
