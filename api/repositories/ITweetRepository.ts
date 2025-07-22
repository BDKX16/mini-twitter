/**
 * Tweet Repository Interface
 * Defines the contract for Tweet-specific repository operations
 */

import { Document } from "mongoose";
import { IBaseRepository, BaseQueryOptions } from "./IBaseRepository";
import { MongooseObjectId } from "../types/models";

/**
 * Tweet Repository Interface
 * Extends base repository with tweet-specific operations
 */
export interface ITweetRepository<T extends Document>
  extends IBaseRepository<T> {
  // ==============================
  // TWEET-SPECIFIC FIND OPERATIONS
  // ==============================

  /**
   * Find tweets by author
   * @param authorId - Author's user ID
   * @param options - Query options
   * @returns Promise with array of tweets
   */
  findByAuthor(
    authorId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  /**
   * Find recent tweets
   * @param limit - Maximum number of tweets
   * @param options - Query options
   * @returns Promise with array of recent tweets
   */
  findRecent(limit: number, options?: BaseQueryOptions): Promise<T[]>;

  /**
   * Find tweets that mention a specific user
   * @param userId - User ID that was mentioned
   * @param options - Query options
   * @returns Promise with array of tweets mentioning the user
   */
  findByMention(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  /**
   * Find tweets by hashtag
   * @param hashtag - Hashtag to search for (without #)
   * @param options - Query options
   * @returns Promise with array of tweets containing the hashtag
   */
  getHashtagTweets(hashtag: string, options?: BaseQueryOptions): Promise<T[]>;

  /**
   * Find replies to a specific tweet
   * @param tweetId - Parent tweet ID
   * @param options - Query options
   * @returns Promise with array of reply tweets
   */
  findReplies(
    tweetId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  /**
   * Find tweets in a thread
   * @param threadId - Thread ID
   * @param options - Query options
   * @returns Promise with array of tweets in thread
   */
  findByThread(
    threadId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  // ==============================
  // TWEET SEARCH OPERATIONS
  // ==============================

  /**
   * Search tweets by content
   * @param searchTerm - Text to search for in tweet content
   * @param options - Query options
   * @returns Promise with array of matching tweets
   */
  searchByContent(searchTerm: string, options?: BaseQueryOptions): Promise<T[]>;

  // ==============================
  // TWEET TIMELINE OPERATIONS
  // ==============================

  /**
   * Get timeline for a user (tweets from followed users)
   * @param userId - User ID requesting timeline
   * @param options - Query options
   * @returns Promise with array of timeline tweets
   */
  getTimelineForUser(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  /**
   * Get personal timeline for a user (own tweets + retweets)
   * @param userId - User ID
   * @param options - Query options
   * @returns Promise with array of personal timeline tweets
   */
  getPersonalTimeline(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;

  // ==============================
  // TWEET STATISTICS OPERATIONS
  // ==============================

  /**
   * Get trending tweets
   * @param hours - Time period in hours to analyze
   * @param limit - Maximum number of trending tweets
   * @returns Promise with array of trending tweet data
   */
  getTrending(hours: number, limit: number): Promise<any[]>;

  /**
   * Get tweet statistics
   * @param tweetId - Tweet ID
   * @returns Promise with tweet statistics object
   */
  getTweetStats(tweetId: MongooseObjectId): Promise<{
    tweetId: MongooseObjectId;
    likesCount: number;
    retweetsCount: number;
    repliesCount: number;
    views?: number;
    engagement?: number;
    [key: string]: any;
  }>;

  /**
   * Get hashtag statistics
   * @param hours - Time period in hours to analyze
   * @param limit - Maximum number of hashtags
   * @returns Promise with hashtag trend data
   */
  getHashtagTrends(
    hours: number,
    limit: number
  ): Promise<
    Array<{
      hashtag: string;
      count: number;
      category?: string;
    }>
  >;

  // ==============================
  // TWEET BULK OPERATIONS
  // ==============================

  /**
   * Get most liked tweets
   * @param limit - Maximum number of tweets
   * @param timeframe - Optional timeframe ('day', 'week', 'month')
   * @returns Promise with array of most liked tweets
   */
  getMostLikedTweets(limit: number, timeframe?: string): Promise<T[]>;

  /**
   * Get most retweeted tweets
   * @param limit - Maximum number of tweets
   * @param timeframe - Optional timeframe ('day', 'week', 'month')
   * @returns Promise with array of most retweeted tweets
   */
  getMostRetweetedTweets(limit: number, timeframe?: string): Promise<T[]>;

  /**
   * Bulk update tweet counters
   * @param updates - Array of tweet ID and counter updates
   * @returns Promise with number of updated tweets
   */
  bulkUpdateCounters(
    updates: Array<{
      tweetId: MongooseObjectId;
      likesCount?: number;
      retweetsCount?: number;
      repliesCount?: number;
    }>
  ): Promise<number>;
}
