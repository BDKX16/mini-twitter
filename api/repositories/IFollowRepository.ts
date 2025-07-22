/**
 * Follow Repository Interface
 * Defines the contract for Follow-specific repository operations
 */

import { Document } from "mongoose";
import { IBaseRepository, BaseQueryOptions } from "./IBaseRepository";
import { MongooseObjectId } from "../types/models";

/**
 * Follow Repository Interface
 * Extends base repository with follow-specific operations
 */
export interface IFollowRepository<T extends Document>
  extends IBaseRepository<T> {
  // ==============================
  // FOLLOW-SPECIFIC FIND OPERATIONS
  // ==============================

  /**
   * Find followers of a user
   * @param userId - User ID to find followers for
   * @param options - Query options
   * @returns Promise with array of follow relationships
   */
  findFollowers(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  /**
   * Find users that a user is following
   * @param userId - User ID to find following for
   * @param options - Query options
   * @returns Promise with array of follow relationships
   */
  findFollowing(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  /**
   * Find specific follow relationship between two users
   * @param followerId - ID of the user who follows
   * @param followingId - ID of the user being followed
   * @returns Promise with follow relationship or null
   */
  findByFollowerAndFollowing(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<T | null>;

  // ==============================
  // FOLLOW VALIDATION OPERATIONS
  // ==============================

  /**
   * Check if one user is following another
   * @param followerId - ID of the potential follower
   * @param followingId - ID of the potentially followed user
   * @returns Promise with boolean indicating follow status
   */
  isFollowing(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<boolean>;

  // ==============================
  // FOLLOW STATISTICS OPERATIONS
  // ==============================

  /**
   * Count followers of a user
   * @param userId - User ID
   * @returns Promise with follower count
   */
  countFollowers(userId: MongooseObjectId): Promise<number>;

  /**
   * Count users that a user is following
   * @param userId - User ID
   * @returns Promise with following count
   */
  countFollowing(userId: MongooseObjectId): Promise<number>;

  /**
   * Get follow statistics for a user
   * @param userId - User ID
   * @returns Promise with follow statistics object
   */
  getFollowStats(userId: MongooseObjectId): Promise<{
    userId: MongooseObjectId;
    followersCount: number;
    followingCount: number;
    mutualFollowsCount?: number;
    followRatio?: number;
    [key: string]: any;
  }>;

  // ==============================
  // FOLLOW MANAGEMENT OPERATIONS
  // ==============================

  /**
   * Toggle follow relationship (follow/unfollow)
   * @param followerId - ID of the user performing the action
   * @param followingId - ID of the user being followed/unfollowed
   * @returns Promise with action result
   */
  toggleFollow(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<{
    action: "followed" | "unfollowed";
    follow: T | null;
    followersCount: number;
    followingCount: number;
  }>;

  // ==============================
  // FOLLOW DISCOVERY OPERATIONS
  // ==============================

  /**
   * Get mutual followers between two users
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns Promise with array of mutual followers
   */
  getMutualFollowers(
    userId1: MongooseObjectId,
    userId2: MongooseObjectId
  ): Promise<
    Array<{
      userId: MongooseObjectId;
      username: string;
      profileImage?: string;
      [key: string]: any;
    }>
  >;

  /**
   * Get follow suggestions for a user
   * @param userId - User ID to get suggestions for
   * @param limit - Maximum number of suggestions
   * @returns Promise with array of suggested users
   */
  getFollowSuggestions(
    userId: MongooseObjectId,
    limit: number
  ): Promise<
    Array<{
      userId: MongooseObjectId;
      username: string;
      profileImage?: string;
      mutualFollowersCount: number;
      reason: string;
      [key: string]: any;
    }>
  >;

  /**
   * Get users followed by followed users (friend of friends)
   * @param userId - User ID
   * @param limit - Maximum number of suggestions
   * @returns Promise with array of second-degree connections
   */
  getSecondDegreeConnections(
    userId: MongooseObjectId,
    limit: number
  ): Promise<
    Array<{
      userId: MongooseObjectId;
      username: string;
      mutualFollowersCount: number;
      [key: string]: any;
    }>
  >;

  // ==============================
  // FOLLOW BULK OPERATIONS
  // ==============================

  /**
   * Bulk follow multiple users
   * @param followerId - ID of the user following
   * @param followingIds - Array of user IDs to follow
   * @returns Promise with array of created follow relationships
   */
  bulkFollow(
    followerId: MongooseObjectId,
    followingIds: MongooseObjectId[]
  ): Promise<T[]>;

  /**
   * Bulk unfollow multiple users
   * @param followerId - ID of the user unfollowing
   * @param followingIds - Array of user IDs to unfollow
   * @returns Promise with number of removed relationships
   */
  bulkUnfollow(
    followerId: MongooseObjectId,
    followingIds: MongooseObjectId[]
  ): Promise<number>;

  /**
   * Get follow activity for a user (recent follows)
   * @param userId - User ID
   * @param limit - Maximum number of activities
   * @returns Promise with recent follow activities
   */
  getFollowActivity(
    userId: MongooseObjectId,
    limit: number
  ): Promise<
    Array<{
      action: "followed" | "unfollowed";
      targetUser: {
        userId: MongooseObjectId;
        username: string;
        profileImage?: string;
      };
      createdAt: Date;
    }>
  >;
}
