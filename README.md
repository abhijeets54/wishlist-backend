# WishlistApp Backend

> Node.js/Express backend API for the collaborative wishlist application

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MongoDB Atlas account

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

4. **Verify server is running**
   - API: http://localhost:5000
   - Health check: http://localhost:5000/health

## 🛠 Tech Stack

- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** with Mongoose - Database
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Cloudinary** - Image storage
- **Multer** - File upload handling

## 📁 Project Structure

```
wishlist-backend/
├── server.js              # Main server entry point
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variables template
├── render.yaml            # Render deployment config
├── config/
│   └── cloudinary.js      # Cloudinary configuration
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── models/
│   ├── User.js            # User schema
│   ├── Wishlist.js        # Wishlist schema
│   └── Product.js         # Product schema
└── routes/
    ├── auth.js            # Authentication routes
    ├── wishlists.js       # Wishlist CRUD routes
    ├── products.js        # Product CRUD routes
    └── upload.js          # File upload routes
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Wishlists
- `GET /api/wishlists` - Get user's wishlists
- `POST /api/wishlists` - Create new wishlist
- `GET /api/wishlists/:id` - Get wishlist by ID
- `PUT /api/wishlists/:id` - Update wishlist
- `DELETE /api/wishlists/:id` - Delete wishlist
- `POST /api/wishlists/join/:inviteCode` - Join wishlist by invite code
- `POST /api/wishlists/:id/invite` - Generate invite code

### Products
- `GET /api/products/wishlist/:wishlistId` - Get products in wishlist
- `POST /api/products` - Add product to wishlist
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/comments` - Add comment to product
- `POST /api/products/:id/reactions` - Add reaction to product
- `DELETE /api/products/:id/reactions` - Remove reaction

### File Upload
- `POST /api/upload/avatar` - Upload user avatar
- `POST /api/upload/product-image` - Upload product image

### Health Check
- `GET /health` - Server health status

## 🔐 Environment Variables

Create `.env` file with these variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wishlist-app

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# CORS
FRONTEND_URL=http://localhost:5173

# Cloudinary (Optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🗄️ Database Schema

### User Model
```javascript
{
  username: String (required, unique)
  email: String (required, unique)
  password: String (required, hashed)
  avatar: String (optional)
  wishlists: [ObjectId] (references to Wishlist)
  timestamps: true
}
```

### Wishlist Model
```javascript
{
  title: String (required)
  description: String (optional)
  owner: ObjectId (required, ref: User)
  collaborators: [{
    user: ObjectId (ref: User)
    role: String (viewer/editor/admin)
    joinedAt: Date
  }]
  products: [ObjectId] (ref: Product)
  isPublic: Boolean
  inviteCode: String (unique)
  tags: [String]
  totalValue: Number
  timestamps: true
}
```

### Product Model
```javascript
{
  name: String (required)
  description: String
  price: Number
  currency: String (default: USD)
  imageUrl: String
  productUrl: String
  category: String
  brand: String
  wishlist: ObjectId (required, ref: Wishlist)
  addedBy: ObjectId (required, ref: User)
  priority: String (low/medium/high)
  status: String (wanted/purchased/unavailable)
  comments: [CommentSchema]
  reactions: [ReactionSchema]
  tags: [String]
  timestamps: true
}
```

## 🔄 Real-time Features

Socket.io events:
- `join-wishlist` - Join wishlist room
- `leave-wishlist` - Leave wishlist room
- `product-added` - New product added
- `product-updated` - Product updated
- `product-deleted` - Product deleted
- `comment-added` - New comment added
- `reaction-added` - New reaction added

## 🚀 Deployment

### Render Deployment
1. Connect GitHub repository
2. Set environment variables in Render dashboard
3. Deploy with these settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_production_jwt_secret
FRONTEND_URL=https://your-frontend.vercel.app
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🧪 Testing

The backend includes comprehensive error handling and validation:
- Input validation on all routes
- JWT token verification
- MongoDB connection error handling
- File upload error handling
- CORS configuration

## 📝 Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run build      # No build step required
```

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- File upload restrictions
- Rate limiting ready
- Environment variable protection

---

**Part of WishlistApp - FlockShop.ai Full Stack Intern Assignment**
