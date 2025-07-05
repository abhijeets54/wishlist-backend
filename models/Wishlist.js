const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'editor'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  totalValue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate invite code
wishlistSchema.methods.generateInviteCode = function() {
  this.inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return this.inviteCode;
};

// Calculate total value
wishlistSchema.methods.calculateTotalValue = async function() {
  await this.populate('products');
  this.totalValue = this.products.reduce((total, product) => total + (product.price || 0), 0);
  return this.totalValue;
};

module.exports = mongoose.model('Wishlist', wishlistSchema);
