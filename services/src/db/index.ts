import mongoose, { Connection } from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

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
    logger.debug('Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    logger.info('Connecting to MongoDB...', { environment: NODE_ENV });

    const connection = await mongoose.connect(MONGODB_URI, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    cachedConnection = connection.connection;

    logger.info('MongoDB connected successfully', {
      host: connection.connection.host,
      database: connection.connection.db?.databaseName,
    });

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      cachedConnection = null;
    });

    mongoose.connection.on('reconnect', () => {
      logger.info('MongoDB reconnected');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', error);
    });

    return connection.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error as Error);
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
      logger.info('MongoDB disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', error as Error);
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
