// HDFC Payment Gateway Configuration
module.exports = {
  // HDFC Bank Parameters
  MERCHANT_ID: process.env.HDFC_MERCHANT_ID || '123456',
  ACCESS_CODE: process.env.HDFC_ACCESS_CODE || 'AvVkYOBpXlX9Ksb0',
  ENCRYPTION_KEY: process.env.HDFC_ENCRYPTION_KEY || 'your-encryption-key',
  
  // URLs
  REDIRECT_URL: process.env.HDFC_REDIRECT_URL || 'https://yourdomain.com/api/payments/hdfc/response',
  CANCEL_URL: process.env.HDFC_CANCEL_URL || 'https://yourdomain.com/payment/cancelled',
  
  // API Endpoints (Test/Live)
  PAYMENT_URL: process.env.NODE_ENV === 'production' 
    ? 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction'
    : 'https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction',
  
  // Encryption method
  ENCRYPTION_METHOD: 'AES-256-CBC'
};