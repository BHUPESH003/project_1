import dotenv from 'dotenv';

dotenv.config();

/**
 * MongoDB Database Configuration
 */
export const dbConfig = {
  // Connection URI
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/express-api',

  // Database name
  dbName: 'express-api',

  // Connection options
  options: {
    retryWrites: true,
    w: 'majority',
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    // Connection pool size
    maxPoolSize: 10,
    minPoolSize: 5,
  },

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Development mode
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

/**
 * MongoDB Atlas Connection String Format:
 * mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database-name
 *
 * Local Connection String Format:
 * mongodb://localhost:27017/database-name
 *
 * Environment Variable Setup:
 * Add to your .env file:
 * MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/express-api
 * NODE_ENV=development
 */
