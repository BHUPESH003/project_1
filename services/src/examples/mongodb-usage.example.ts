/**
 * Example Usage of MongoDB Database Helpers
 * 
 * This file demonstrates how to use the database helpers
 * Created files:
 * - src/db/index.ts - Connection management
 * - src/db/config.ts - Configuration  
 * - src/db/models/User.ts - Example User model
 * - src/utils/db-helpers.ts - Helper functions
 */

// ============================================
// 1. SET UP MODEL (src/db/models/Product.ts)
// ============================================

import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  price: number;
  description?: string;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be positive'],
    },
    description: String,
    inStock: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'products',
  }
);

productSchema.index({ name: 'text' });
productSchema.index({ inStock: 1, createdAt: -1 });

export const Product = model<IProduct>('Product', productSchema);

// ============================================
// 2. USE IN CONTROLLERS
// ============================================

import { Request, Response } from 'express';
import { create, findMany, findById, updateById, deleteById, paginate } from '../utils/db-helpers';

/**
 * Create Product
 */
export const createProduct = async (req: Request, res: Response) => {
  try {
    const product = await create(Product, req.body);
    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get All Products with Pagination
 */
export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const inStock = req.query.inStock === 'true' ? { inStock: true } : {};

    const result = await paginate(Product, page, limit, inStock, { createdAt: -1 });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get Product by ID
 */
export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await findById(Product, req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Update Product
 */
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await updateById(Product, req.params.id, req.body);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Delete Product
 */
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await deleteById(Product, req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ============================================
// 3. USE IN ROUTES
// ============================================

import express from 'express';

const router = express.Router();

router.post('/products', createProduct);
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

export default router;

// ============================================
// 4. ADD ROUTE TO MAIN APP (src/index.ts)
// ============================================

// import productRoutes from './routes/products';
// app.use('/api', productRoutes);

// ============================================
// QUICK API HELPER REFERENCE
// ============================================

/**
 * Query Examples Using Helpers:
 * 
 * CREATE:
 * const user = await create(User, { name: 'John', email: 'john@example.com' });
 * 
 * FIND:
 * const user = await findById(User, '507f1f77bcf86cd799439011');
 * const users = await findMany(User, { role: 'admin' }, { limit: 20 });
 * const user = await findOne(User, { email: 'john@example.com' });
 * 
 * UPDATE:
 * const updated = await updateById(User, userId, { name: 'Jane' });
 * await updateMany(User, { role: 'user' }, { isActive: false });
 * 
 * DELETE:
 * const deleted = await deleteById(User, userId);
 * await deleteMany(User, { isActive: false });
 * 
 * CHECK:
 * const count = await count(User, { role: 'admin' });
 * const userExists = await exists(User, { email: 'john@example.com' });
 * 
 * PAGINATE:
 * const result = await paginate(User, 1, 10, { role: 'admin' });
 * result.data - Array of documents
 * result.pagination - { page, limit, total, pages }
 */
