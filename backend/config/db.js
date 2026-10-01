const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medibot_hospital';
    await mongoose.connect(connStr);
    console.log('[DB] Connected to MongoDB via Mongoose');
  } catch (err) {
    console.error(`[DB Error] ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
