const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helmet = require('helmet');
const fs = require('fs-extra');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorMiddleware');
const path = require('path');
const apiKeyMiddleware = require('./middleware/apiKeyMiddleware');
const userroute=require('./routes/userRoutes');
const categoryroute=require('./routes/categoryRoutes');
const orderroute=require('./routes/orderRoutes');
const shippingroute=require('./routes/shippingRoutes');
const productroute=require('./routes/productRoutes');
const cartroute=require('./routes/cartRoutes');
const attributeroute=require('./routes/attributeRoutes');
const blogRoutes = require('./routes/blogRoute');
const blogCategoryRoutes = require('./routes/blocategoryRoute');
const wishlistroute=require('./routes/wishlistRoutes');
const imageRoutes = require('./routes/imageRoutes');
const subcategoryroute=require('./routes/subCategoryRoutes');
const enquiryformroute=require('./routes/enquiryformRoute');
const stylingenquiryroute=require('./routes/stylingenquiryRoute');
const newsletterroute=require('./routes/newsletterRoute');
const contactformroute=require('./routes/contactformRoute');
const couponroute=require('./routes/couponRoutes');
// const shippingRoute = require('./routes/shippingRoute');
const reviewroute=require('./routes/reviewRoutes');
const seoRoutes = require('./routes/seoRoute');
const axios = require('axios');

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '/uploads')));






// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


// ✅ Add CORP header middleware for static uploads (before serving files)
// app.use('/uploads', (req, res, next) => {
//   // Match image file extensions (add more if needed)
//   if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
//     res.set('Cross-Origin-Resource-Policy', 'cross-origin');
//   }
//   next();
// });

app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)


app.use(cookieParser());
app.use(helmet());
// app.use(cors({
//   origin: function (origin, callback) {
//     const allowedOrigins = ['http://localhost:3000','http://localhost:5000', 'https://www.itarahome.com','https://itarahome-frontend.vercel.app',
//        'https://smartgateway.hdfcuat.bank.in',  // HDFC Sandbox
//   'https://smartgateway.hdfc.bank.in',       // HDFC Production
//     ];
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   methods: ["GET", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
//   allowedHeaders: [
//     "Content-Type",
//     "Authorization",
//     "x-api-key",
//     'Accept',   // ✅ allow API key header
//   ],
//   credentials: true
// }));

// ✅ SIMPLE FIX - Just add this one line change
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000', 
      'https://www.itarahome.com',
      'https://itarahome-frontend.vercel.app',
      'https://smartgateway.hdfcuat.bank.in',  // HDFC Sandbox
      'https://smartgateway.hdfc.bank.in',       // HDFC Production
    ];
    
    // ✅ THIS IS THE FIX - Allow requests with NO origin
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", 'Accept'],
  credentials: true
}));




// Routes
app.use('/api/images', imageRoutes);

// ✅ API Key Middleware
app.use("/api/auth", apiKeyMiddleware,userroute);
app.use("/api/category", apiKeyMiddleware,categoryroute);
app.use("/api/orders", apiKeyMiddleware,orderroute);

app.use("/api/shipping", apiKeyMiddleware,shippingroute);
app.use("/api/product", apiKeyMiddleware,productroute);
app.use("/api/cart", apiKeyMiddleware,cartroute);
app.use("/api/attribute", apiKeyMiddleware,attributeroute);
app.use('/api/blog',apiKeyMiddleware,blogRoutes);
app.use('/api/blog-category',apiKeyMiddleware,blogCategoryRoutes);
app.use('/api/wishlist',apiKeyMiddleware,wishlistroute);
app.use('/api/subcategory',apiKeyMiddleware,subcategoryroute);
app.use("/api/enquiry",apiKeyMiddleware,enquiryformroute);
app.use("/api/styling-enquiry",apiKeyMiddleware,stylingenquiryroute);
app.use("/api/newsletter",apiKeyMiddleware,newsletterroute);
app.use("/api/contactform",apiKeyMiddleware,contactformroute);
app.use("/api/coupons",apiKeyMiddleware,couponroute);
// app.use('/api/shipping',shippingRoute);
app.use("/api/review",apiKeyMiddleware,reviewroute);
app.use('/api/seo',apiKeyMiddleware,seoRoutes);


app.use(morgan('dev'));
// app.use(xss()); // Temporarily disabled due to Express 5.x compatibility issue
app.use(rateLimiter);

// Routes

// Error Handler
app.use(errorHandler);







// DB & Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error(err));