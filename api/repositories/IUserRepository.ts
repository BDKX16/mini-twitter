/**
 * User Repository Interface
 * Defines the contract for User-specific repository operations
 */

import { Document } from "mongoose";
import { IBaseRepository, BaseQueryOptions } from "./IBaseRepository";
import { MongooseObjectId } from "../types/models";

/**
 * User Repository Interface
 * Extends base repository with user-specific operations
 */
export interface IUserRepository<T extends Document>
  extends IBaseRepository<T> {
  // ==============================
  // USER-SPECIFIC FIND OPERATIONS
  // ==============================

  /**
   * Find user by username
   * @param username - User's unique username
   * @returns Promise with user document or null
   */
  findByUsername(username: string): Promise<T | null>;

  /**
   * Find confirmed users only
   * @param options - Query options
   * @returns Promise with array of confirmed users
   */
  findConfirmedUsers(options?: BaseQueryOptions): Promise<T[]>;

  /**
   * Find recently registered users
   * @param days - Number of days to look back (default: 7)
   * @param options - Query options
   * @returns Promise with array of recent users
   */
  findRecentUsers(days?: number, options?: BaseQueryOptions): Promise<T[]>;

  /**
   * Search users by term (username, firstName, lastName)
   * @param searchTerm - Search term
   * @param options - Query options
   * @returns Promise with array of matching users
   */
  searchUsers(searchTerm: string, options?: BaseQueryOptions): Promise<T[]>;

  // ==============================
  // USER VALIDATION OPERATIONS
  // ==============================

  /**
   * Check if username is available
   * @param username - Username to check
   * @returns Promise with boolean indicating availability
   */
  checkUsernameAvailability(username: string): Promise<boolean>;

  // ==============================
  // USER STATISTICS OPERATIONS
  // ==============================

  /**
   * Get user statistics
   * @param userId - User ID (optional, if not provided returns global stats)
   * @returns Promise with user statistics object
   */
  getUserStats(userId?: MongooseObjectId): Promise<{
    userId?: MongooseObjectId;
    username?: string;
    confirmed?: boolean;
    createdAt?: Date;
    totalUsers?: number;
    confirmedUsers?: number;
    recentUsers?: number;
    [key: string]: any;
  }>;

  // ==============================
  // USER BULK OPERATIONS
  // ==============================

  /**
   * Get suggested users for a user
   * @param userId - Current user ID
   * @param limit - Maximum number of suggestions
   * @returns Promise with array of suggested users
   */
  getSuggestedUsers(userId: MongooseObjectId, limit: number): Promise<T[]>;

  /**
   * Get users with most followers
   * @param limit - Maximum number of users to return
   * @returns Promise with array of popular users
   */
  getPopularUsers(limit: number): Promise<T[]>;
}
