const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const wishlistRoutes = require('./routes/wishlists');
const productRoutes = require('./routes/products');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wishlist-app';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'WishlistApp Backend API',
    version: '1.0.0',
    status: 'Running'
  });
});

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join wishlist room
  socket.on('join-wishlist', (wishlistId) => {
    socket.join(wishlistId);
    console.log(`User ${socket.id} joined wishlist ${wishlistId}`);
  });

  // Leave wishlist room
  socket.on('leave-wishlist', (wishlistId) => {
    socket.leave(wishlistId);
    console.log(`User ${socket.id} left wishlist ${wishlistId}`);
  });

  // Handle product updates
  socket.on('product-added', (data) => {
    socket.to(data.wishlistId).emit('product-added', data);
  });

  socket.on('product-updated', (data) => {
    socket.to(data.wishlistId).emit('product-updated', data);
  });

  socket.on('product-deleted', (data) => {
    socket.to(data.wishlistId).emit('product-deleted', data);
  });

  // Handle comments and reactions
  socket.on('comment-added', (data) => {
    socket.to(data.wishlistId).emit('comment-added', data);
  });

  socket.on('reaction-added', (data) => {
    socket.to(data.wishlistId).emit('reaction-added', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
