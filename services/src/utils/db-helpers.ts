import { Document, Model } from 'mongoose';

/**
 * Generic MongoDB/Mongoose helper functions
 */

/**
 * Find a document by ID
 */
export const findById = async <T extends Document>(
  model: Model<T>,
  id: string
): Promise<T | null> => {
  try {
    return await model.findById(id).lean().exec() as T | null;
  } catch (error) {
    console.error(`Error finding document by ID: ${id}`, error);
    throw error;
  }
};

/**
 * Find documents with filters
 */
export const findMany = async <T extends Document>(
  model: Model<T>,
  filter: any = {},
  options: any = {}
): Promise<T[]> => {
  try {
    const {
      skip = 0,
      limit = 10,
      sort = { _id: -1 },
      lean = true,
    } = options;

    let query = model.find(filter) as any;

    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);
    if (sort) query = query.sort(sort);
    if (lean) query = query.lean();

    return await query.exec() as T[];
  } catch (error) {
    console.error('Error finding documents:', error);
    throw error;
  }
};

/**
 * Find a single document
 */
export const findOne = async <T extends Document>(
  model: Model<T>,
  filter: any
): Promise<T | null> => {
  try {
    return await model.findOne(filter).lean().exec() as T | null;
  } catch (error) {
    console.error('Error finding single document:', error);
    throw error;
  }
};

/**
 * Create a new document
 */
export const create = async <T extends Document>(
  model: Model<T>,
  data: any
): Promise<T> => {
  try {
    const doc = new model(data);
    return await doc.save() as T;
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
};

/**
 * Update a document by ID
 */
export const updateById = async <T extends Document>(
  model: Model<T>,
  id: string,
  update: any,
  options: any = {}
): Promise<T | null> => {
  try {
    return await model.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
      ...options,
    }) as T | null;
  } catch (error) {
    console.error(`Error updating document by ID: ${id}`, error);
    throw error;
  }
};

/**
 * Update multiple documents
 */
export const updateMany = async <T extends Document>(
  model: Model<T>,
  filter: any,
  update: any
): Promise<{ modifiedCount: number }> => {
  try {
    const result = await model.updateMany(filter, update, { runValidators: true });
    return { modifiedCount: result.modifiedCount };
  } catch (error) {
    console.error('Error updating documents:', error);
    throw error;
  }
};

/**
 * Delete a document by ID
 */
export const deleteById = async <T extends Document>(
  model: Model<T>,
  id: string
): Promise<T | null> => {
  try {
    return await model.findByIdAndDelete(id) as T | null;
  } catch (error) {
    console.error(`Error deleting document by ID: ${id}`, error);
    throw error;
  }
};

/**
 * Delete multiple documents
 */
export const deleteMany = async <T extends Document>(
  model: Model<T>,
  filter: any
): Promise<{ deletedCount: number }> => {
  try {
    const result = await model.deleteMany(filter);
    return { deletedCount: result.deletedCount };
  } catch (error) {
    console.error('Error deleting documents:', error);
    throw error;
  }
};

/**
 * Count documents
 */
export const count = async <T extends Document>(
  model: Model<T>,
  filter: any = {}
): Promise<number> => {
  try {
    return await model.countDocuments(filter);
  } catch (error) {
    console.error('Error counting documents:', error);
    throw error;
  }
};

/**
 * Check if document exists
 */
export const exists = async <T extends Document>(
  model: Model<T>,
  filter: any
): Promise<boolean> => {
  try {
    const doc = await model.findOne(filter).lean().exec();
    return !!doc;
  } catch (error) {
    console.error('Error checking document existence:', error);
    throw error;
  }
};

/**
 * Paginate documents
 */
export const paginate = async <T extends Document>(
  model: Model<T>,
  page: number = 1,
  limit: number = 10,
  filter: any = {},
  sort: any = { _id: -1 }
): Promise<{
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  try {
    const skip = (page - 1) * limit;
    const total = await count(model, filter);
    const pages = Math.ceil(total / limit);

    const data = await findMany(model, filter, {
      skip,
      limit,
      sort,
      lean: true,
    }) as T[];

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  } catch (error) {
    console.error('Error paginating documents:', error);
    throw error;
  }
};

/**
 * Bulk write operations
 */
export const bulkWrite = async <T extends Document>(
  model: Model<T>,
  operations: any[]
): Promise<any> => {
  try {
    return await (model as any).bulkWrite(operations);
  } catch (error) {
    console.error('Error in bulk write:', error);
    throw error;
  }
};

/**
 * Get collection stats
 */
export const getStats = async <T extends Document>(
  model: Model<T>
): Promise<{
  count: number;
  avgObjSize?: number;
  storageSize?: number;
  totalIndexSize?: number;
}> => {
  try {
    const count = await model.countDocuments();
    return {
      count,
      avgObjSize: 0,
      storageSize: 0,
      totalIndexSize: 0,
    };
  } catch (error) {
    console.error('Error getting collection stats:', error);
    throw error;
  }
};
