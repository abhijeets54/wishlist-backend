const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadAvatar, uploadProductImage, deleteImage, extractPublicId } = require('../config/cloudinary');
const User = require('../models/User');

// Test endpoint to check Cloudinary configuration
router.get('/test', async (req, res) => {
  try {
    const cloudinary = require('cloudinary').v2;

    // Test Cloudinary connection
    const pingResult = await cloudinary.api.ping();

    res.json({
      message: 'Upload routes are working',
      cloudinary_configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      cloudinary_connection: 'success',
      ping_result: pingResult,
      config: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key_set: !!process.env.CLOUDINARY_API_KEY,
        api_secret_set: !!process.env.CLOUDINARY_API_SECRET
      }
    });
  } catch (error) {
    console.error('Cloudinary test error:', error);
    res.status(500).json({
      message: 'Upload routes are working but Cloudinary connection failed',
      cloudinary_configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      cloudinary_connection: 'failed',
      error: error.message
    });
  }
});

// Upload avatar
router.post('/avatar', auth, (req, res) => {
  // Check if Cloudinary is configured
  const isCloudinaryConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name_here'
  );

  if (!isCloudinaryConfigured) {
    return res.status(503).json({
      message: 'Avatar upload service not configured',
      error: 'Cloudinary credentials are missing. Please configure them in the .env file.',
      instructions: 'Get credentials from: https://console.cloudinary.com/settings/api-keys'
    });
  }

  uploadAvatar.single('avatar')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Avatar upload error:', err);
        return res.status(400).json({
          message: 'Upload failed',
          error: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const user = await User.findById(req.user._id);

      // Delete old avatar if it exists and is from Cloudinary
      if (user.avatar && user.avatar.includes('cloudinary.com')) {
        const oldPublicId = extractPublicId(user.avatar);
        if (oldPublicId) {
          try {
            await deleteImage(oldPublicId);
          } catch (error) {
            console.error('Error deleting old avatar:', error);
            // Continue with upload even if deletion fails
          }
        }
      }

      // Update user with new avatar URL
      user.avatar = req.file.path;
      await user.save();

      res.json({
        message: 'Avatar uploaded successfully',
        avatarUrl: req.file.path,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        }
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ message: 'Server error during avatar upload' });
    }
  });
});

// Upload product image
router.post('/product-image', auth, (req, res) => {
  console.log('Product image upload request received');
  console.log('User:', req.user?._id);

  // Check if Cloudinary is configured
  const isCloudinaryConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name_here'
  );

  if (!isCloudinaryConfigured) {
    return res.status(503).json({
      message: 'Image upload service not configured',
      error: 'Cloudinary credentials are missing. Please configure them in the .env file.',
      instructions: 'Get credentials from: https://console.cloudinary.com/settings/api-keys'
    });
  }

  uploadProductImage.single('image')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer/Cloudinary error:', err);
        return res.status(400).json({
          message: 'Upload failed',
          error: err.message,
          details: err.toString()
        });
      }

      console.log('File:', req.file ? 'File received' : 'No file');
      console.log('File details:', req.file);

      if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).json({ message: 'No file uploaded' });
      }

      console.log('File uploaded successfully:', req.file.path);
      res.json({
        message: 'Product image uploaded successfully',
        imageUrl: req.file.path,
        publicId: req.file.filename,
        fileDetails: {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('Product image upload error:', error);
      res.status(500).json({
        message: 'Server error during image upload',
        error: error.message,
        stack: error.stack
      });
    }
  });
});

// Delete image (generic endpoint)
router.delete('/image', auth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const publicId = extractPublicId(imageUrl);
    if (!publicId) {
      return res.status(400).json({ message: 'Invalid Cloudinary URL' });
    }

    const result = await deleteImage(publicId);
    
    if (result.result === 'ok') {
      res.json({ message: 'Image deleted successfully' });
    } else {
      res.status(400).json({ message: 'Failed to delete image' });
    }
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({ message: 'Server error during image deletion' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  console.error('Upload middleware error:', error);

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large' });
  }

  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({ message: 'Only image files are allowed' });
  }

  if (error.message && error.message.includes('Cloudinary')) {
    return res.status(500).json({ message: 'Image upload service error' });
  }

  res.status(500).json({ message: 'Upload error', error: error.message });
});

module.exports = router;
