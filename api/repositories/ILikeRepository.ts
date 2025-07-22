/**
 * Like Repository Interface
 * Defines the contract for Like-specific repository operations
 */

import { Document } from "mongoose";
import { IBaseRepository, BaseQueryOptions } from "./IBaseRepository";
import { MongooseObjectId } from "../types/models";

/**
 * Like Repository Interface
 * Extends base repository with like-specific operations
 */
export interface ILikeRepository<T extends Document>
  extends IBaseRepository<T> {
  // ==============================
  // LIKE-SPECIFIC FIND OPERATIONS
  // ==============================

  /**
   * Find likes by user
   * @param userId - User ID who gave the likes
   * @param options - Query options
   * @returns Promise with array of like relationships
   */
  findByUser(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  /**
   * Find likes for a specific tweet
   * @param tweetId - Tweet ID that received likes
   * @param options - Query options
   * @returns Promise with array of like relationships
   */
  findByTweet(
    tweetId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  /**
   * Find specific like relationship between user and tweet
   * @param userId - User ID who potentially liked
   * @param tweetId - Tweet ID that was potentially liked
   * @returns Promise with like relationship or null
   */
  findByUserAndTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<T | null>;

  // ==============================
  // LIKE VALIDATION OPERATIONS
  // ==============================

  /**
   * Check if user has liked a specific tweet
   * @param userId - User ID
   * @param tweetId - Tweet ID
   * @returns Promise with boolean indicating like status
   */
  hasUserLikedTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<boolean>;

  // ==============================
  // LIKE STATISTICS OPERATIONS
  // ==============================

  /**
   * Count likes for a specific tweet
   * @param tweetId - Tweet ID
   * @returns Promise with like count
   */
  countByTweet(tweetId: MongooseObjectId): Promise<number>;

  /**
   * Count likes given by a specific user
   * @param userId - User ID
   * @returns Promise with like count
   */
  countByUser(userId: MongooseObjectId): Promise<number>;

  /**
   * Get like statistics for a user
   * @param userId - User ID
   * @returns Promise with like statistics object
   */
  getUserLikeStats(userId: MongooseObjectId): Promise<{
    userId: MongooseObjectId;
    totalLikesGiven: number;
    totalLikesReceived: number;
    mostLikedTweet?: {
      tweetId: MongooseObjectId;
      content: string;
      likesCount: number;
    };
    recentLikes: number;
    [key: string]: any;
  }>;

  // ==============================
  // LIKE MANAGEMENT OPERATIONS
  // ==============================

  /**
   * Toggle like on a tweet (like/unlike)
   * @param userId - User ID performing the action
   * @param tweetId - Tweet ID being liked/unliked
   * @returns Promise with action result
   */
  toggleLike(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<{
    action: "liked" | "unliked";
    like: T | null;
    newLikeCount: number;
  }>;

  /**
   * Add like to a tweet
   * @param userId - User ID giving the like
   * @param tweetId - Tweet ID being liked
   * @returns Promise with created like relationship
   */
  addLike(userId: MongooseObjectId, tweetId: MongooseObjectId): Promise<T>;

  /**
   * Remove like from a tweet
   * @param userId - User ID removing the like
   * @param tweetId - Tweet ID being unliked
   * @returns Promise with boolean indicating success
   */
  removeLike(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<boolean>;

  // ==============================
  // LIKE DISCOVERY OPERATIONS
  // ==============================

  /**
   * Get most liked tweets globally
   * @param limit - Maximum number of tweets
   * @param timeframe - Optional timeframe ('day', 'week', 'month', 'all')
   * @returns Promise with array of most liked tweets
   */
  getMostLikedTweets(
    limit: number,
    timeframe?: string
  ): Promise<
    Array<{
      tweetId: MongooseObjectId;
      content: string;
      author: {
        userId: MongooseObjectId;
        username: string;
        profileImage?: string;
      };
      likesCount: number;
      createdAt: Date;
    }>
  >;

  /**
   * Get recently liked tweets by followed users
   * @param userId - User ID to get personalized likes for
   * @param limit - Maximum number of likes
   * @returns Promise with array of recent likes from network
   */
  getNetworkLikes(
    userId: MongooseObjectId,
    limit: number
  ): Promise<
    Array<{
      like: T;
      tweet: {
        tweetId: MongooseObjectId;
        content: string;
        author: {
          userId: MongooseObjectId;
          username: string;
        };
      };
      liker: {
        userId: MongooseObjectId;
        username: string;
        profileImage?: string;
      };
    }>
  >;

  /**
   * Get users who liked a specific tweet
   * @param tweetId - Tweet ID
   * @param limit - Maximum number of users
   * @param options - Query options
   * @returns Promise with array of users who liked the tweet
   */
  getUsersWhoLiked(
    tweetId: MongooseObjectId,
    limit: number,
    options?: BaseQueryOptions
  ): Promise<
    Array<{
      userId: MongooseObjectId;
      username: string;
      profileImage?: string;
      likedAt: Date;
    }>
  >;

  // ==============================
  // LIKE BULK OPERATIONS
  // ==============================

  /**
   * Bulk update like counts for multiple tweets
   * @param updates - Array of tweet IDs and their new like counts
   * @returns Promise with number of updated tweets
   */
  bulkUpdateLikeCounts(
    updates: Array<{
      tweetId: MongooseObjectId;
      newCount: number;
    }>
  ): Promise<number>;

  /**
   * Get like activity for a user (recent likes given/received)
   * @param userId - User ID
   * @param limit - Maximum number of activities
   * @param type - Type of activity ('given', 'received', 'all')
   * @returns Promise with recent like activities
   */
  getLikeActivity(
    userId: MongooseObjectId,
    limit: number,
    type?: "given" | "received" | "all"
  ): Promise<
    Array<{
      type: "given" | "received";
      tweet: {
        tweetId: MongooseObjectId;
        content: string;
        author: {
          userId: MongooseObjectId;
          username: string;
        };
      };
      user: {
        userId: MongooseObjectId;
        username: string;
      };
      createdAt: Date;
    }>
  >;
}
