const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

// Store socket.io instance in application context
app.set('socketio', io);

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mount Routes
app.use('/api/auth', require('./routes/auth_routes'));
app.use('/api/admin', require('./routes/admin_routes'));
app.use('/api/orders', require('./routes/order_routes'));
app.use('/api/alerts', require('./routes/alert_routes'));
app.use('/api/profiles', require('./routes/profile_routes'));

const path = require('path');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'MEDIBOT Express Server is running' });
});

// Serve static assets from React production build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback all other routes to index.html for SPA router support
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] MEDIBOT backend running on port ${PORT}`);
});
