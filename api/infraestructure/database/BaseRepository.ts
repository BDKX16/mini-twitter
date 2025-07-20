/**
 * Base Repository Implementation in TypeScript
 * Generic repository pattern for MongoDB operations
 */

import {
  Document,
  Model,
  FilterQuery,
  UpdateQuery,
  QueryOptions,
} from "mongoose";
import {
  IBaseRepository,
  BaseQueryOptions,
  PaginatedResult,
  RepositoryResult,
} from "../../types/repositories";
import { MongooseObjectId } from "../../types/models";
import { AppError, NotFoundError, ValidationError } from "../../utils/errors";

export class BaseRepository<T extends Document> implements IBaseRepository<T> {
  protected model: Model<T>;
  protected modelName: string;

  constructor(model: Model<T>) {
    this.model = model;
    this.modelName = model.modelName;
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      console.log(
        `BaseRepository.create - Creating ${this.modelName} with data:`,
        data
      );
      const document = new this.model(data);
      console.log(`BaseRepository.create - Document created, saving...`);
      const result = await document.save();
      console.log(
        `BaseRepository.create - Document saved successfully:`,
        result
      );
      return result;
    } catch (error: any) {
      console.error(
        `BaseRepository.create - Error creating ${this.modelName}:`,
        error
      );
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Validation failed for ${this.modelName}`,
          error.errors
        );
      }
      throw new AppError(`Failed to create ${this.modelName}`, 500);
    }
  }

  /**
   * Create multiple documents
   */
  async createMany(dataArray: Partial<T>[]): Promise<T[]> {
    try {
      const result = await this.model.insertMany(dataArray);
      return result as unknown as T[];
    } catch (error: any) {
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Validation failed for ${this.modelName} bulk insert`,
          error.errors
        );
      }
      throw new AppError(`Failed to create multiple ${this.modelName}`, 500);
    }
  }

  /**
   * Find document by ID
   */
  async findById(
    id: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<T | null> {
    try {
      let query = this.model.findById(id);
      query = this.applyQueryOptions(query, options);
      return await query.exec();
    } catch (error: any) {
      throw new AppError(`Failed to find ${this.modelName} by ID`, 500);
    }
  }

  /**
   * Find one document by filter
   */
  async findOne(
    filter: FilterQuery<T>,
    options: BaseQueryOptions = {}
  ): Promise<T | null> {
    try {
      let query = this.model.findOne(filter);
      query = this.applyQueryOptions(query, options);
      return await query.exec();
    } catch (error: any) {
      throw new AppError(`Failed to find ${this.modelName}`, 500);
    }
  }

  /**
   * Find multiple documents by filter
   */
  async find(
    filter: FilterQuery<T>,
    options: BaseQueryOptions = {}
  ): Promise<T[]> {
    try {
      let query = this.model.find(filter);
      query = this.applyQueryOptions(query, options);
      return await query.exec();
    } catch (error: any) {
      throw new AppError(`Failed to find ${this.modelName} documents`, 500);
    }
  }

  /**
   * Find all documents
   */
  async findAll(options: BaseQueryOptions = {}): Promise<T[]> {
    return this.find({}, options);
  }

  /**
   * Find documents with pagination
   */
  async findWithPagination(
    filter: FilterQuery<T>,
    page: number = 1,
    limit: number = 10,
    options: BaseQueryOptions = {}
  ): Promise<PaginatedResult<T>> {
    try {
      // Validate pagination parameters
      page = Math.max(1, page);
      limit = Math.max(1, Math.min(100, limit)); // Max 100 items per page

      const skip = (page - 1) * limit;

      // Count total documents
      const total = await this.model.countDocuments(filter);

      // Calculate pagination info
      const pages = Math.ceil(total / limit);
      const hasNext = page < pages;
      const hasPrev = page > 1;

      // Find documents
      let query = this.model.find(filter).skip(skip).limit(limit);
      query = this.applyQueryOptions(query, options);
      const data = await query.exec();

      return {
        data,
        total,
        page,
        limit,
        pages,
        currentPage: page,
        hasNext,
        hasPrev,
      };
    } catch (error: any) {
      throw new AppError(`Failed to paginate ${this.modelName} documents`, 500);
    }
  }

  /**
   * Update document by ID
   */
  async updateById(
    id: MongooseObjectId,
    update: UpdateQuery<T>
  ): Promise<T | null> {
    try {
      const document = await this.model.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      });

      if (!document) {
        throw new NotFoundError(`${this.modelName} not found`);
      }

      return document;
    } catch (error: any) {
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Validation failed for ${this.modelName} update`,
          error.errors
        );
      }
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError(`Failed to update ${this.modelName}`, 500);
    }
  }

  /**
   * Update one document by filter
   */
  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>
  ): Promise<T | null> {
    try {
      const document = await this.model.findOneAndUpdate(filter, update, {
        new: true,
        runValidators: true,
      });

      if (!document) {
        throw new NotFoundError(`${this.modelName} not found`);
      }

      return document;
    } catch (error: any) {
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Validation failed for ${this.modelName} update`,
          error.errors
        );
      }
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError(`Failed to update ${this.modelName}`, 500);
    }
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>
  ): Promise<number> {
    try {
      const result = await this.model.updateMany(filter, update, {
        runValidators: true,
      });
      return result.modifiedCount || 0;
    } catch (error: any) {
      if (error.name === "ValidationError") {
        throw new ValidationError(
          `Validation failed for ${this.modelName} bulk update`,
          error.errors
        );
      }
      throw new AppError(`Failed to update multiple ${this.modelName}`, 500);
    }
  }

  /**
   * Delete document by ID
   */
  async deleteById(id: MongooseObjectId): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id);
      return result !== null;
    } catch (error: any) {
      throw new AppError(`Failed to delete ${this.modelName}`, 500);
    }
  }

  /**
   * Delete one document by filter
   */
  async deleteOne(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const result = await this.model.findOneAndDelete(filter);
      return result !== null;
    } catch (error: any) {
      throw new AppError(`Failed to delete ${this.modelName}`, 500);
    }
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(filter: FilterQuery<T>): Promise<number> {
    try {
      const result = await this.model.deleteMany(filter);
      return result.deletedCount || 0;
    } catch (error: any) {
      throw new AppError(`Failed to delete multiple ${this.modelName}`, 500);
    }
  }

  /**
   * Count documents
   */
  async count(filter: FilterQuery<T> = {}): Promise<number> {
    try {
      return await this.model.countDocuments(filter);
    } catch (error: any) {
      throw new AppError(`Failed to count ${this.modelName} documents`, 500);
    }
  }

  /**
   * Count documents (alias for count)
   */
  async countDocuments(filter: FilterQuery<T> = {}): Promise<number> {
    return this.count(filter);
  }

  /**
   * Check if document exists
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const result = await this.model.exists(filter);
      return result !== null;
    } catch (error: any) {
      throw new AppError(`Failed to check ${this.modelName} existence`, 500);
    }
  }

  /**
   * Run aggregation pipeline
   */
  async aggregate(pipeline: any[]): Promise<any[]> {
    try {
      return await this.model.aggregate(pipeline);
    } catch (error: any) {
      throw new AppError(`Failed to aggregate ${this.modelName} data`, 500);
    }
  }

  /**
   * Apply query options (populate, select, sort, etc.)
   */
  protected applyQueryOptions(query: any, options: BaseQueryOptions): any {
    if (options.populate) {
      query = query.populate(options.populate);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    if (options.sort) {
      query = query.sort(options.sort);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.skip) {
      query = query.skip(options.skip);
    }

    if (options.lean) {
      query = query.lean();
    }

    return query;
  }

  /**
   * Get model instance (for advanced operations)
   */
  getModel(): Model<T> {
    return this.model;
  }

  /**
   * Get model name
   */
  getModelName(): string {
    return this.modelName;
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { BaseRepository };
