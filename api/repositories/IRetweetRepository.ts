/**
 * Retweet Repository Interface
 * Defines the contract for Retweet-specific repository operations
 */

import { Document } from "mongoose";
import { IBaseRepository, BaseQueryOptions } from "./IBaseRepository";
import { MongooseObjectId } from "../types/models";

/**
 * Retweet Repository Interface
 * Extends base repository with retweet-specific operations
 */
export interface IRetweetRepository<T extends Document>
  extends IBaseRepository<T> {
  // ==============================
  // RETWEET-SPECIFIC FIND OPERATIONS
  // ==============================

  /**
   * Find retweets by user
   * @param userId - User ID who made the retweets
   * @param options - Query options
   * @returns Promise with array of retweet relationships
   */
  findByUser(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  /**
   * Find retweets of a specific tweet
   * @param tweetId - Tweet ID that was retweeted
   * @param options - Query options
   * @returns Promise with array of retweet relationships
   */
  findByTweet(
    tweetId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  /**
   * Find specific retweet relationship between user and tweet
   * @param userId - User ID who potentially retweeted
   * @param tweetId - Tweet ID that was potentially retweeted
   * @returns Promise with retweet relationship or null
   */
  findByUserAndTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<T | null>;

  /**
   * Find quote retweets (retweets with comments)
   * @param tweetId - Original tweet ID (optional)
   * @param options - Query options
   * @returns Promise with array of quote retweets
   */
  findQuoteRetweets(
    tweetId?: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  /**
   * Find simple retweets (retweets without comments)
   * @param tweetId - Original tweet ID (optional)
   * @param options - Query options
   * @returns Promise with array of simple retweets
   */
  findSimpleRetweets(
    tweetId?: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  // ==============================
  // RETWEET VALIDATION OPERATIONS
  // ==============================

  /**
   * Check if user has retweeted a specific tweet
   * @param userId - User ID
   * @param tweetId - Tweet ID
   * @returns Promise with boolean indicating retweet status
   */
  hasUserRetweeted(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<boolean>;

  // ==============================
  // RETWEET STATISTICS OPERATIONS
  // ==============================

  /**
   * Count retweets for a specific tweet
   * @param tweetId - Tweet ID
   * @returns Promise with retweet count
   */
  countByTweet(tweetId: MongooseObjectId): Promise<number>;

  /**
   * Count retweets made by a specific user
   * @param userId - User ID
   * @returns Promise with retweet count
   */
  countByUser(userId: MongooseObjectId): Promise<number>;

  /**
   * Count quote retweets for a specific tweet
   * @param tweetId - Tweet ID
   * @returns Promise with quote retweet count
   */
  countQuoteRetweets(tweetId: MongooseObjectId): Promise<number>;

  /**
   * Get retweet statistics for a user
   * @param userId - User ID
   * @returns Promise with retweet statistics object
   */
  getUserRetweetStats(userId: MongooseObjectId): Promise<{
    userId: MongooseObjectId;
    totalRetweetsMade: number;
    totalRetweetsReceived: number;
    quoteRetweetsMade: number;
    simpleRetweetsMade: number;
    mostRetweetedTweet?: {
      tweetId: MongooseObjectId;
      content: string;
      retweetsCount: number;
    };
    recentRetweets: number;
    [key: string]: any;
  }>;

  // ==============================
  // RETWEET MANAGEMENT OPERATIONS
  // ==============================

  /**
   * Toggle retweet on a tweet (retweet/unretweet)
   * @param userId - User ID performing the action
   * @param tweetId - Tweet ID being retweeted/unretweeted
   * @param comment - Optional comment for quote retweet
   * @returns Promise with action result
   */
  toggleRetweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId,
    comment?: string
  ): Promise<{
    action: "retweeted" | "unretweeted";
    retweet: T | null;
    newRetweetCount: number;
    type: "simple" | "quote";
  }>;

  /**
   * Add retweet to a tweet
   * @param userId - User ID making the retweet
   * @param tweetId - Tweet ID being retweeted
   * @param comment - Optional comment for quote retweet
   * @returns Promise with created retweet relationship
   */
  addRetweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId,
    comment?: string
  ): Promise<T>;

  /**
   * Remove retweet from a tweet
   * @param userId - User ID removing the retweet
   * @param tweetId - Tweet ID being unretweeted
   * @returns Promise with boolean indicating success
   */
  removeRetweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<boolean>;

  // ==============================
  // RETWEET DISCOVERY OPERATIONS
  // ==============================

  /**
   * Get most retweeted tweets globally
   * @param limit - Maximum number of tweets
   * @param timeframe - Optional timeframe ('day', 'week', 'month', 'all')
   * @returns Promise with array of most retweeted tweets
   */
  getMostRetweetedTweets(
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
      retweetsCount: number;
      quoteRetweetsCount: number;
      createdAt: Date;
    }>
  >;

  /**
   * Get recent retweets from followed users
   * @param userId - User ID to get personalized retweets for
   * @param limit - Maximum number of retweets
   * @returns Promise with array of recent retweets from network
   */
  getNetworkRetweets(
    userId: MongooseObjectId,
    limit: number
  ): Promise<
    Array<{
      retweet: T;
      originalTweet: {
        tweetId: MongooseObjectId;
        content: string;
        author: {
          userId: MongooseObjectId;
          username: string;
        };
      };
      retweeter: {
        userId: MongooseObjectId;
        username: string;
        profileImage?: string;
      };
      comment?: string;
    }>
  >;

  /**
   * Get users who retweeted a specific tweet
   * @param tweetId - Tweet ID
   * @param limit - Maximum number of users
   * @param options - Query options
   * @returns Promise with array of users who retweeted
   */
  getUsersWhoRetweeted(
    tweetId: MongooseObjectId,
    limit: number,
    options?: BaseQueryOptions
  ): Promise<
    Array<{
      userId: MongooseObjectId;
      username: string;
      profileImage?: string;
      retweetedAt: Date;
      comment?: string;
      type: "simple" | "quote";
    }>
  >;

  /**
   * Get quote retweets with their comments
   * @param tweetId - Original tweet ID
   * @param limit - Maximum number of quote retweets
   * @param options - Query options
   * @returns Promise with array of quote retweets
   */
  getQuoteRetweetsWithComments(
    tweetId: MongooseObjectId,
    limit: number,
    options?: BaseQueryOptions
  ): Promise<
    Array<{
      retweetId: MongooseObjectId;
      comment: string;
      user: {
        userId: MongooseObjectId;
        username: string;
        profileImage?: string;
      };
      createdAt: Date;
    }>
  >;

  // ==============================
  // RETWEET BULK OPERATIONS
  // ==============================

  /**
   * Bulk update retweet counts for multiple tweets
   * @param updates - Array of tweet IDs and their new retweet counts
   * @returns Promise with number of updated tweets
   */
  bulkUpdateRetweetCounts(
    updates: Array<{
      tweetId: MongooseObjectId;
      newCount: number;
    }>
  ): Promise<number>;

  /**
   * Get retweet activity for a user (recent retweets made/received)
   * @param userId - User ID
   * @param limit - Maximum number of activities
   * @param type - Type of activity ('made', 'received', 'all')
   * @returns Promise with recent retweet activities
   */
  getRetweetActivity(
    userId: MongooseObjectId,
    limit: number,
    type?: "made" | "received" | "all"
  ): Promise<
    Array<{
      type: "made" | "received";
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
      comment?: string;
      retweetType: "simple" | "quote";
      createdAt: Date;
    }>
  >;

  /**
   * Get retweet chain for a tweet (retweets of retweets)
   * @param tweetId - Original tweet ID
   * @param depth - Maximum depth to traverse
   * @returns Promise with retweet chain data
   */
  getRetweetChain(
    tweetId: MongooseObjectId,
    depth: number
  ): Promise<
    Array<{
      level: number;
      retweet: T;
      user: {
        userId: MongooseObjectId;
        username: string;
      };
      comment?: string;
    }>
  >;
}
