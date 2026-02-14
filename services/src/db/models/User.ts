import { Schema, model, Document } from 'mongoose';

/**
 * User Collection Schema
 * Example model for reference - modify or delete based on your needs
 */

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Index for frequently queried fields
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1, createdAt: -1 });

export const User = model<IUser>('User', userSchema);
