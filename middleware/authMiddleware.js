const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authorizationUser = async (req, res, next) => {
    try {
        const key = process.env.JWT_SECRET;
        
        if (!key) {
            const error = new Error('JWT_SECRET not configured');
            error.status = 500;
            return next(error);
        }

        // Extract token from Authorization header or cookies
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : req.cookies?.token;
        
        if (!token) {
           return res.status(401).json({ message: 'Login is required' });
        }
        
        // Verify the token
        const decoded = jwt.verify(token, key);
        
        // Fetch the user from the database
        const user = await User.findById(decoded.id);
        
        if (!user) {
            const error = new Error('User not found');
            error.status = 401;
            return next(error);
        }
        
        // console.log(user,"user")
        // Attach the user object to the request
        req.user = user;
        next();
        
    } catch (error) {
        // Handle JWT errors specifically
        if (error.name === 'JsonWebTokenError') {
            error.message = 'Invalid token';
            error.status = 401;
        } else if (error.name === 'TokenExpiredError') {
            error.message = 'Token expired';
            error.status = 401;
        } else if (!error.status) {
            error.status = 401;
        }
        
        next(error); // Pass error to error middleware
    }
};

const authorizationRoles = (roles) => {
    return (req, res, next) => {
        try {
            // Ensure the user is authenticated and their role is valid
            if (!req.user || !roles.includes(req.user.role)) {
                return res.status(403).json({ message: "Access Denied: Insufficient permissions" });
              }
            next(); // User has the required role, allow them to proceed
        } catch (error) {
            next(error); // Pass error to error middleware
        }
    };
};
  


module.exports = { authorizationUser,authorizationRoles };