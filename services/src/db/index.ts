import mongoose, { Connection } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/express-api';
const NODE_ENV = process.env.NODE_ENV || 'development';

let cachedConnection: Connection | null = null;

/**
 * Connect to MongoDB database
 * Uses connection pooling and caching for better performance
 */
export const connectDB = async (): Promise<Connection> => {
  // Return cached connection if available
  if (cachedConnection) {
    console.log('📦 Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`📍 Database: ${NODE_ENV}`);
    console.log(`🌐 URI: ${MONGODB_URI.replace(/mongodb\+srv:\/\/.*:.*@/, 'mongodb+srv://***:***@')}`);

    const connection = await mongoose.connect(MONGODB_URI, {
      dbName: 'express-api',
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    cachedConnection = connection.connection;

    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Host: ${connection.connection.host}`);
    console.log(`📦 Database: ${connection.connection.db?.databaseName}`);

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
      cachedConnection = null;
    });

    mongoose.connection.on('reconnect', () => {
      console.log('✅ MongoDB reconnected');
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    return connection.connection;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    cachedConnection = null;
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      cachedConnection = null;
      console.log('✅ MongoDB disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
};

/**
 * Get current MongoDB connection status
 */
export const getConnectionStatus = (): {
  connected: boolean;
  readyState: number;
  host?: string;
  database?: string;
} => {
  const readyState = mongoose.connection.readyState;
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    connected: readyState === 1,
    readyState,
    host: mongoose.connection.host,
    database: mongoose.connection.db?.databaseName,
  };
};

/**
 * Get MongoDB connection instance
 */
export const getConnection = (): mongoose.Mongoose => {
  return mongoose;
};

export default mongoose;
