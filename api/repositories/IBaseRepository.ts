/**
 * Base Repository Interface
 * Generic interface that all repositories should implement
 */

import { Document, FilterQuery, UpdateQuery } from "mongoose";
import { MongooseObjectId } from "../types/models";

export interface BaseQueryOptions {
  populate?: string | string[] | any;
  select?: string | Record<string, number>;
  sort?: string | Record<string, number>;
  limit?: number;
  skip?: number;
  lean?: boolean;
}

export interface RepositoryResult<T> {
  data: T;
  total?: number;
  page?: number;
  limit?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface PaginatedResult<T> extends RepositoryResult<T[]> {
  pages: number;
  currentPage: number;
}

/**
 * Base Repository Interface
 * Defines the contract that all repositories must implement
 */
export interface IBaseRepository<T extends Document> {
  // ==============================
  // CREATE OPERATIONS
  // ==============================

  /**
   * Create a new document
   * @param data - Partial data for the document
   * @returns Promise with the created document
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Create multiple documents
   * @param dataArray - Array of partial data for documents
   * @returns Promise with array of created documents
   */
  createMany(dataArray: Partial<T>[]): Promise<T[]>;

  // ==============================
  // READ OPERATIONS
  // ==============================

  /**
   * Find document by ID
   * @param id - Document ID
   * @param options - Query options
   * @returns Promise with document or null
   */
  findById(id: MongooseObjectId, options?: BaseQueryOptions): Promise<T | null>;

  /**
   * Find single document by filter
   * @param filter - MongoDB filter query
   * @param options - Query options
   * @returns Promise with document or null
   */
  findOne(
    filter: FilterQuery<T>,
    options?: BaseQueryOptions
  ): Promise<T | null>;

  /**
   * Find multiple documents by filter
   * @param filter - MongoDB filter query
   * @param options - Query options
   * @returns Promise with array of documents
   */
  find(filter: FilterQuery<T>, options?: BaseQueryOptions): Promise<T[]>;

  /**
   * Find all documents
   * @param options - Query options
   * @returns Promise with array of all documents
   */
  findAll(options?: BaseQueryOptions): Promise<T[]>;

  /**
   * Find documents with pagination
   * @param filter - MongoDB filter query
   * @param page - Page number (1-based)
   * @param limit - Number of documents per page
   * @param options - Query options
   * @returns Promise with paginated result
   */
  findWithPagination(
    filter: FilterQuery<T>,
    page: number,
    limit: number,
    options?: BaseQueryOptions
  ): Promise<PaginatedResult<T>>;

  // ==============================
  // UPDATE OPERATIONS
  // ==============================

  /**
   * Update document by ID
   * @param id - Document ID
   * @param update - Update query
   * @returns Promise with updated document or null
   */
  updateById(id: MongooseObjectId, update: UpdateQuery<T>): Promise<T | null>;

  /**
   * Update single document by filter
   * @param filter - MongoDB filter query
   * @param update - Update query
   * @returns Promise with updated document or null
   */
  updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>): Promise<T | null>;

  /**
   * Update multiple documents by filter
   * @param filter - MongoDB filter query
   * @param update - Update query
   * @returns Promise with number of updated documents
   */
  updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>): Promise<number>;

  // ==============================
  // DELETE OPERATIONS
  // ==============================

  /**
   * Delete document by ID
   * @param id - Document ID
   * @returns Promise with boolean indicating success
   */
  deleteById(id: MongooseObjectId): Promise<boolean>;

  /**
   * Delete single document by filter
   * @param filter - MongoDB filter query
   * @returns Promise with boolean indicating success
   */
  deleteOne(filter: FilterQuery<T>): Promise<boolean>;

  /**
   * Delete multiple documents by filter
   * @param filter - MongoDB filter query
   * @returns Promise with number of deleted documents
   */
  deleteMany(filter: FilterQuery<T>): Promise<number>;

  // ==============================
  // UTILITY OPERATIONS
  // ==============================

  /**
   * Count documents by filter
   * @param filter - MongoDB filter query (optional)
   * @returns Promise with count
   */
  count(filter?: FilterQuery<T>): Promise<number>;

  /**
   * Check if document exists by filter
   * @param filter - MongoDB filter query
   * @returns Promise with boolean indicating existence
   */
  exists(filter: FilterQuery<T>): Promise<boolean>;

  /**
   * Execute aggregation pipeline
   * @param pipeline - MongoDB aggregation pipeline
   * @returns Promise with aggregation results
   */
  aggregate(pipeline: any[]): Promise<any[]>;
}
