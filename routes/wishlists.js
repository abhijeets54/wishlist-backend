const express = require('express');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all wishlists for user
router.get('/', auth, async (req, res) => {
  try {
    const wishlists = await Wishlist.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id }
      ]
    })
    .populate('owner', 'username email avatar')
    .populate('collaborators.user', 'username email avatar')
    .populate('products')
    .sort({ updatedAt: -1 });

    res.json(wishlists);
  } catch (error) {
    console.error('Get wishlists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single wishlist
router.get('/:id', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findById(req.params.id)
      .populate('owner', 'username email avatar')
      .populate('collaborators.user', 'username email avatar')
      .populate({
        path: 'products',
        populate: {
          path: 'addedBy',
          select: 'username email avatar'
        }
      });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    // Check if user has access
    const hasAccess = wishlist.owner._id.toString() === req.user._id.toString() ||
                     wishlist.collaborators.some(collab => collab.user._id.toString() === req.user._id.toString()) ||
                     wishlist.isPublic;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(wishlist);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new wishlist
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, isPublic, tags } = req.body;

    const wishlist = new Wishlist({
      title,
      description,
      owner: req.user._id,
      isPublic: isPublic || false,
      tags: tags || []
    });

    if (isPublic) {
      wishlist.generateInviteCode();
    }

    await wishlist.save();
    await wishlist.populate('owner', 'username email avatar');

    res.status(201).json(wishlist);
  } catch (error) {
    console.error('Create wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update wishlist
router.put('/:id', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findById(req.params.id);

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    // Check if user is owner or admin collaborator
    const isOwner = wishlist.owner.toString() === req.user._id.toString();
    const isAdmin = wishlist.collaborators.some(collab => 
      collab.user.toString() === req.user._id.toString() && collab.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, isPublic, tags } = req.body;
    const updates = {};

    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (isPublic !== undefined) {
      updates.isPublic = isPublic;
      if (isPublic && !wishlist.inviteCode) {
        updates.inviteCode = wishlist.generateInviteCode();
      }
    }
    if (tags) updates.tags = tags;

    const updatedWishlist = await Wishlist.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('owner', 'username email avatar')
    .populate('collaborators.user', 'username email avatar');

    res.json(updatedWishlist);
  } catch (error) {
    console.error('Update wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete wishlist
router.delete('/:id', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findById(req.params.id);

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    // Only owner can delete
    if (wishlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can delete wishlist' });
    }

    // Delete all products in the wishlist
    await Product.deleteMany({ wishlist: req.params.id });

    // Delete the wishlist
    await Wishlist.findByIdAndDelete(req.params.id);

    res.json({ message: 'Wishlist deleted successfully' });
  } catch (error) {
    console.error('Delete wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join wishlist by invite code
router.post('/join/:inviteCode', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ inviteCode: req.params.inviteCode });

    if (!wishlist) {
      return res.status(404).json({ message: 'Invalid invite code' });
    }

    // Check if user is already a collaborator
    const isAlreadyCollaborator = wishlist.collaborators.some(collab =>
      collab.user.toString() === req.user._id.toString()
    );

    if (isAlreadyCollaborator || wishlist.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You are already part of this wishlist' });
    }

    // Add user as collaborator
    wishlist.collaborators.push({
      user: req.user._id,
      role: 'editor'
    });

    await wishlist.save();
    await wishlist.populate('owner', 'username email avatar');
    await wishlist.populate('collaborators.user', 'username email avatar');

    res.json({
      message: 'Successfully joined wishlist',
      wishlist
    });
  } catch (error) {
    console.error('Join wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate new invite code
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const wishlist = await Wishlist.findById(req.params.id);

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    // Check if user is owner or admin
    const isOwner = wishlist.owner.toString() === req.user._id.toString();
    const isAdmin = wishlist.collaborators.some(collab =>
      collab.user.toString() === req.user._id.toString() && collab.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const inviteCode = wishlist.generateInviteCode();
    await wishlist.save();

    res.json({ inviteCode });
  } catch (error) {
    console.error('Generate invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
