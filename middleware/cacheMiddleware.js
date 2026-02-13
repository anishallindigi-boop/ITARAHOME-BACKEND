// middleware/cacheMiddleware.js
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

exports.cacheMiddleware = (duration) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = req.originalUrl || req.url;
    
    // Check cache
    const cachedData = cache.get(key);
    if (cachedData) {
      console.log('Cache HIT for:', key);
      return res.json(cachedData);
    }
    
    // Store original res.json method
    const originalJson = res.json;
    
    // Override res.json to cache response
    res.json = function(data) {
      // Convert Mongoose document to plain object if needed
      let dataToCache = data;
      
      if (data && typeof data === 'object') {
        if (data.toObject && typeof data.toObject === 'function') {
          dataToCache = data.toObject();
        } else if (data._doc) {
          dataToCache = { ...data._doc };
        } else {
          dataToCache = JSON.parse(JSON.stringify(data));
        }
      }
      
      // Cache the data
      cache.set(key, dataToCache, duration);
      
      console.log('Cache SET for:', key);
      
      // Call original res.json
      originalJson.call(this, data);
    };
    
    next();
  };
};