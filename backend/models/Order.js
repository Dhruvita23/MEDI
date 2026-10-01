const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  order_id: {
    type: String,
    required: true,
    unique: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ordered_by_role: {
    type: String,
    required: true
  },
  ordered_by_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order_type: {
    type: String,
    enum: ['text_input', 'prescription_upload'],
    default: 'text_input'
  },
  prescription_image_url: {
    type: String,
    default: null
  },
  items_list: {
    type: [String],
    default: []
  },
  items: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true }
    }
  ],
  subtotal: {
    type: Number,
    default: 0
  },
  order_status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
