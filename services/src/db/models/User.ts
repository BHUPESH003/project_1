import { Schema, model, Document } from 'mongoose';

/**
 * User Model - Currently unused
 * Available for future use
 */

export interface IUser extends Document {
  name: string;
  email: string;
  role?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'users' }
);

export const User = model<IUser>('User', userSchema);
