module.exports = {
  EMAIL: process.env.SHIPROCKET_EMAIL || 'your-email@example.com',
  PASSWORD: process.env.SHIPROCKET_PASSWORD || 'your-password',
  BASE_URL: 'https://apiv2.shiprocket.in/v1/external',
  
  // Warehouse/Pickup Location
  PICKUP_LOCATION: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
  PICKUP_PINCODE: process.env.PICKUP_PINCODE || '110001',
  
  // Default Package Dimensions (in cm, kg)
  DEFAULT_LENGTH: 10,
  DEFAULT_BREADTH: 10,
  DEFAULT_HEIGHT: 10,
  DEFAULT_WEIGHT: 0.5
};