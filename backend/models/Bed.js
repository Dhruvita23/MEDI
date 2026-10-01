const mongoose = require('mongoose');

const BedSchema = new mongoose.Schema({
  floor: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  bed_number: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  is_occupied: {
    type: Boolean,
    default: false
  },
  current_patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

// Ensure uniqueness of bed per floor
BedSchema.index({ floor: 1, bed_number: 1 }, { unique: true });

module.exports = mongoose.model('Bed', BedSchema);
