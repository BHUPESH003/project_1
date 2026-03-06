import { Document, Model } from 'mongoose';
import { logger } from './logger';

/**
 * Mobile-Optimized Database Helpers
 * Fast, simple, and easy to understand
 */

// ============================================
// QUICK QUERIES FOR MOBILE APPS
// ============================================

/**
 * Find by ID - Returns only essential fields
 * ✅ Latest, Fastest
 */
export const findByIdMobile = async <T extends Document>(
  model: Model<T>,
  id: string,
  fields?: string[]
): Promise<T | null> => {
  const startTime = Date.now();
  try {
    let query = model.findById(id).lean();
    if (fields) query = query.select(fields.join(' '));
    
    const result = await query.exec() as T | null;
    const duration = Date.now() - startTime;
    
    logger.query('findById', model.collection.name, duration, { id });
    return result;
  } catch (error) {
    logger.error('DB Error - findById', error as Error, { id });
    throw error;
  }
};

/**
 * Find many with filters - Optimized for mobile
 * ✅ Fast pagination, minimal fields
 */
export const findManyMobile = async <T extends Document>(
  model: Model<T>,
  filter: any = {},
  options?: {
    page?: number;      // Default: 1
    limit?: number;     // Default: 20 for mobile
    fields?: string[];  // Only fetch needed fields
    sort?: any;         // Sort by field
  }
): Promise<{ data: T[]; total: number; hasMore: boolean }> => {
  const startTime = Date.now();
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;
    const fields = options?.fields;
    const sort = options?.sort || { _id: -1 };

    // Fetch data
    let query = model.find(filter).lean().skip(skip).limit(limit).sort(sort);
    if (fields) query = query.select(fields.join(' '));
    
    const data = await query.exec() as T[];
    
    // Count total
    const total = await model.countDocuments(filter);
    const duration = Date.now() - startTime;
    
    logger.query('findMany', model.collection.name, duration, { page, limit, total });
    
    return {
      data,
      total,
      hasMore: skip + data.length < total,
    };
  } catch (error) {
    logger.error('DB Error - findMany', error as Error, { filter });
    throw error;
  }
};

/**
 * Find one document - Simple and fast
 * ✅ Best for unique lookups
 */
export const findOneMobile = async <T extends Document>(
  model: Model<T>,
  filter: any,
  fields?: string[]
): Promise<T | null> => {
  const startTime = Date.now();
  try {
    let query = model.findOne(filter).lean();
    if (fields) query = query.select(fields.join(' '));
    
    const result = await query.exec() as T | null;
    const duration = Date.now() - startTime;
    
    logger.query('findOne', model.collection.name, duration, { filter });
    return result;
  } catch (error) {
    logger.error('DB Error - findOne', error as Error, { filter });
    throw error;
  }
};

/**
 * Create document
 * ✅ Simple and clean
 */
export const createMobile = async <T extends Document>(
  model: Model<T>,
  data: any
): Promise<T> => {
  const startTime = Date.now();
  try {
    const doc = new model(data);
    const saved = await doc.save() as T;
    const duration = Date.now() - startTime;
    
    logger.query('create', model.collection.name, duration, { id: (saved as any)._id });
    return saved;
  } catch (error) {
    logger.error('DB Error - create', error as Error, { data });
    throw error;
  }
};

/**
 * Update document
 * ✅ Fast update with returned fields only
 */
export const updateMobile = async <T extends Document>(
  model: Model<T>,
  id: string,
  updateData: any,
  fields?: string[]
): Promise<T | null> => {
  const startTime = Date.now();
  try {
    let query = model.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (fields) query = query.select(fields.join(' '));
    
    const result = await query.exec() as T | null;
    const duration = Date.now() - startTime;
    
    logger.query('update', model.collection.name, duration, { id });
    return result;
  } catch (error) {
    logger.error('DB Error - update', error as Error, { id });
    throw error;
  }
};

/**
 * Delete document
 * ✅ Simple delete
 */
export const deleteMobile = async <T extends Document>(
  model: Model<T>,
  id: string
): Promise<boolean> => {
  const startTime = Date.now();
  try {
    const result = await model.findByIdAndDelete(id);
    const duration = Date.now() - startTime;
    
    logger.query('delete', model.collection.name, duration, { id });
    return !!result;
  } catch (error) {
    logger.error('DB Error - delete', error as Error, { id });
    throw error;
  }
};

/**
 * Count documents
 * ✅ Fast count with optional filter
 */
export const countMobile = async <T extends Document>(
  model: Model<T>,
  filter: any = {}
): Promise<number> => {
  const startTime = Date.now();
  try {
    const count = await model.countDocuments(filter);
    const duration = Date.now() - startTime;
    
    logger.query('count', model.collection.name, duration, { filter });
    return count;
  } catch (error) {
    logger.error('DB Error - count', error as Error, { filter });
    throw error;
  }
};

/**
 * Check if exists
 * ✅ Fastest way to check existence
 */
export const existsMobile = async <T extends Document>(
  model: Model<T>,
  filter: any
): Promise<boolean> => {
  const startTime = Date.now();
  try {
    const exists = await model.findOne(filter).lean().exec();
    const duration = Date.now() - startTime;
    
    logger.query('exists', model.collection.name, duration, { filter });
    return !!exists;
  } catch (error) {
    logger.error('DB Error - exists', error as Error, { filter });
    throw error;
  }
};

// ============================================
// ORIGINAL HELPERS (For backward compatibility)
// ============================================

export const findById = async <T extends Document>(
  model: Model<T>,
  id: string
): Promise<T | null> => {
  return findByIdMobile(model, id);
};

export const findMany = async <T extends Document>(
  model: Model<T>,
  filter: any = {},
  options: any = {}
): Promise<T[]> => {
  const result = await findManyMobile(model, filter, options);
  return result.data;
};

export const findOne = async <T extends Document>(
  model: Model<T>,
  filter: any
): Promise<T | null> => {
  return findOneMobile(model, filter);
};

export const create = async <T extends Document>(
  model: Model<T>,
  data: any
): Promise<T> => {
  return createMobile(model, data);
};

export const updateById = async <T extends Document>(
  model: Model<T>,
  id: string,
  update: any
): Promise<T | null> => {
  return updateMobile(model, id, update);
};

export const deleteById = async <T extends Document>(
  model: Model<T>,
  id: string
): Promise<T | null> => {
  const result = await deleteMobile(model, id);
  return result ? ({} as T) : null;
};

export const count = async <T extends Document>(
  model: Model<T>,
  filter: any = {}
): Promise<number> => {
  return countMobile(model, filter);
};

export const exists = async <T extends Document>(
  model: Model<T>,
  filter: any
): Promise<boolean> => {
  return existsMobile(model, filter);
};
