const mongoose = require('mongoose');

const BillingSchema = new mongoose.Schema({
  invoice_id: {
    type: String,
    required: true,
    unique: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orders: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  ],
  room_charges: {
    type: Number,
    default: 0
  },
  service_charges: {
    type: Number,
    default: 1500 // Flat base consultation/admin service charge
  },
  grand_total: {
    type: Number,
    default: 0
  },
  is_paid: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Billing', BillingSchema);
