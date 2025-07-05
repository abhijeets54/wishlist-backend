const express = require('express');
const Product = require('../models/Product');
const Wishlist = require('../models/Wishlist');
const auth = require('../middleware/auth');
const { deleteImage, extractPublicId } = require('../config/cloudinary');

const router = express.Router();

// Get products for a wishlist
router.get('/wishlist/:wishlistId', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findById(req.params.wishlistId);
    
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    // Check access
    const hasAccess = wishlist.owner.toString() === req.user._id.toString() ||
                     wishlist.collaborators.some(collab => collab.user.toString() === req.user._id.toString()) ||
                     wishlist.isPublic;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const products = await Product.find({ wishlist: req.params.wishlistId })
      .populate('addedBy', 'username email avatar')
      .populate('purchasedBy', 'username email avatar')
      .populate('comments.user', 'username email avatar')
      .populate('reactions.user', 'username email avatar')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add product to wishlist
router.post('/', auth, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      currency, 
      imageUrl, 
      productUrl, 
      category, 
      brand, 
      wishlistId, 
      priority, 
      tags 
    } = req.body;

    const wishlist = await Wishlist.findById(wishlistId);
    
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    // Check if user can add products
    const canAdd = wishlist.owner.toString() === req.user._id.toString() ||
                   wishlist.collaborators.some(collab => 
                     collab.user.toString() === req.user._id.toString() && 
                     ['editor', 'admin'].includes(collab.role)
                   );

    if (!canAdd) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const product = new Product({
      name,
      description,
      price,
      currency: currency || 'USD',
      imageUrl,
      productUrl,
      category,
      brand,
      wishlist: wishlistId,
      addedBy: req.user._id,
      priority: priority || 'medium',
      tags: tags || []
    });

    await product.save();
    await product.populate('addedBy', 'username email avatar');

    // Add product to wishlist
    wishlist.products.push(product._id);
    await wishlist.calculateTotalValue();
    await wishlist.save();

    res.status(201).json(product);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('wishlist');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const wishlist = product.wishlist;

    // Check if user can edit
    const canEdit = wishlist.owner.toString() === req.user._id.toString() ||
                    product.addedBy.toString() === req.user._id.toString() ||
                    wishlist.collaborators.some(collab => 
                      collab.user.toString() === req.user._id.toString() && 
                      ['editor', 'admin'].includes(collab.role)
                    );

    if (!canEdit) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = req.body;
    delete updates.wishlist; // Prevent changing wishlist
    delete updates.addedBy; // Prevent changing who added it

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('addedBy', 'username email avatar')
    .populate('purchasedBy', 'username email avatar');

    // Recalculate wishlist total value
    await wishlist.calculateTotalValue();
    await wishlist.save();

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('wishlist');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const wishlist = product.wishlist;

    // Check if user can delete
    const canDelete = wishlist.owner.toString() === req.user._id.toString() ||
                      product.addedBy.toString() === req.user._id.toString() ||
                      wishlist.collaborators.some(collab => 
                        collab.user.toString() === req.user._id.toString() && 
                        ['admin'].includes(collab.role)
                      );

    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete product image from Cloudinary if it exists
    if (product.imageUrl && product.imageUrl.includes('cloudinary.com')) {
      const publicId = extractPublicId(product.imageUrl);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (error) {
          console.error('Error deleting product image:', error);
          // Continue with deletion even if image cleanup fails
        }
      }
    }

    // Remove from wishlist
    wishlist.products.pull(product._id);
    await wishlist.calculateTotalValue();
    await wishlist.save();

    // Delete product
    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment to product
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const product = await Product.findById(req.params.id).populate('wishlist');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const wishlist = product.wishlist;

    // Check access
    const hasAccess = wishlist.owner.toString() === req.user._id.toString() ||
                     wishlist.collaborators.some(collab => collab.user.toString() === req.user._id.toString()) ||
                     wishlist.isPublic;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comment = {
      user: req.user._id,
      text
    };

    product.comments.push(comment);
    await product.save();
    await product.populate('comments.user', 'username email avatar');

    const newComment = product.comments[product.comments.length - 1];
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add reaction to product
router.post('/:id/reactions', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const product = await Product.findById(req.params.id).populate('wishlist');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const wishlist = product.wishlist;

    // Check access
    const hasAccess = wishlist.owner.toString() === req.user._id.toString() ||
                     wishlist.collaborators.some(collab => collab.user.toString() === req.user._id.toString()) ||
                     wishlist.isPublic;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Remove existing reaction from this user if any
    product.reactions = product.reactions.filter(
      reaction => reaction.user.toString() !== req.user._id.toString()
    );

    // Add new reaction
    const reaction = {
      user: req.user._id,
      emoji
    };

    product.reactions.push(reaction);
    await product.save();
    await product.populate('reactions.user', 'username email avatar');

    const newReaction = product.reactions[product.reactions.length - 1];
    res.status(201).json(newReaction);
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove reaction from product
router.delete('/:id/reactions', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Remove user's reaction
    product.reactions = product.reactions.filter(
      reaction => reaction.user.toString() !== req.user._id.toString()
    );

    await product.save();
    res.json({ message: 'Reaction removed successfully' });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
