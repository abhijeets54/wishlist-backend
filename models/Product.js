const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const reactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emoji: {
    type: String,
    required: true,
    enum: ['❤️', '👍', '👎', '😍', '🤔', '💰', '🔥', '⭐']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  price: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: 3
  },
  imageUrl: {
    type: String,
    trim: true
  },
  productUrl: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    maxlength: 50
  },
  brand: {
    type: String,
    trim: true,
    maxlength: 100
  },
  wishlist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wishlist',
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['wanted', 'purchased', 'unavailable'],
    default: 'wanted'
  },
  purchasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  purchasedAt: {
    type: Date
  },
  comments: [commentSchema],
  reactions: [reactionSchema],
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for better search performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ wishlist: 1, status: 1 });

module.exports = mongoose.model('Product', productSchema);
