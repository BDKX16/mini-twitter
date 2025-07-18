/**
 * TypeScript interfaces for Repository patterns
 */

import { Document, FilterQuery, UpdateQuery, QueryOptions } from "mongoose";
import { MongooseObjectId } from "./models";

// Base query options interface
export interface BaseQueryOptions {
  populate?: string | string[] | any;
  select?: string | Record<string, number>;
  sort?: string | Record<string, number>;
  limit?: number;
  skip?: number;
  lean?: boolean;
}

// Repository result interfaces
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

// Base repository interface
export interface IBaseRepository<T extends Document> {
  // Create operations
  create(data: Partial<T>): Promise<T>;
  createMany(dataArray: Partial<T>[]): Promise<T[]>;

  // Read operations
  findById(id: MongooseObjectId, options?: BaseQueryOptions): Promise<T | null>;
  findOne(
    filter: FilterQuery<T>,
    options?: BaseQueryOptions
  ): Promise<T | null>;
  find(filter: FilterQuery<T>, options?: BaseQueryOptions): Promise<T[]>;
  findAll(options?: BaseQueryOptions): Promise<T[]>;
  findWithPagination(
    filter: FilterQuery<T>,
    page: number,
    limit: number,
    options?: BaseQueryOptions
  ): Promise<PaginatedResult<T>>;

  // Update operations
  updateById(id: MongooseObjectId, update: UpdateQuery<T>): Promise<T | null>;
  updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>): Promise<T | null>;
  updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>): Promise<number>;

  // Delete operations
  deleteById(id: MongooseObjectId): Promise<boolean>;
  deleteOne(filter: FilterQuery<T>): Promise<boolean>;
  deleteMany(filter: FilterQuery<T>): Promise<number>;

  // Utility operations
  count(filter?: FilterQuery<T>): Promise<number>;
  exists(filter: FilterQuery<T>): Promise<boolean>;

  // Aggregation operations
  aggregate(pipeline: any[]): Promise<any[]>;
}

// User repository interface
export interface IUserRepository<T extends Document>
  extends IBaseRepository<T> {
  findByEmail(email: string): Promise<T | null>;
  findByUsername(username: string): Promise<T | null>;
  findConfirmedUsers(options?: BaseQueryOptions): Promise<T[]>;
  findRecentUsers(days: number, options?: BaseQueryOptions): Promise<T[]>;
  checkEmailAvailability(email: string): Promise<boolean>;
  checkUsernameAvailability(username: string): Promise<boolean>;
  getUserStats(userId: MongooseObjectId): Promise<any>;
  searchUsers(searchTerm: string, options?: BaseQueryOptions): Promise<T[]>;
}

// Tweet repository interface
export interface ITweetRepository<T extends Document>
  extends IBaseRepository<T> {
  findByAuthor(
    authorId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;
  findRecent(limit: number, options?: BaseQueryOptions): Promise<T[]>;
  findByMention(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;
  searchByContent(searchTerm: string, options?: BaseQueryOptions): Promise<T[]>;
  getTrending(hours: number, limit: number): Promise<any[]>;
  getTweetStats(tweetId: MongooseObjectId): Promise<any>;
  getTimelineForUser(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;
  getHashtagTweets(hashtag: string, options?: BaseQueryOptions): Promise<T[]>;
}

// Like repository interface
export interface ILikeRepository<T extends Document>
  extends IBaseRepository<T> {
  findByUser(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;
  findByTweet(
    tweetId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;
  findByUserAndTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<T | null>;
  countByTweet(tweetId: MongooseObjectId): Promise<number>;
  countByUser(userId: MongooseObjectId): Promise<number>;
  toggleLike(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<{ action: string; like: T | null }>;
  getMostLikedTweets(limit: number): Promise<any[]>;
  getUserLikeStats(userId: MongooseObjectId): Promise<any>;
}

// Retweet repository interface
export interface IRetweetRepository<T extends Document>
  extends IBaseRepository<T> {
  findByUser(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;
  findByTweet(
    tweetId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;
  findByUserAndTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<T | null>;
  findQuoteRetweets(
    tweetId?: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;
  findSimpleRetweets(
    tweetId?: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;
  countByTweet(tweetId: MongooseObjectId): Promise<number>;
  countByUser(userId: MongooseObjectId): Promise<number>;
  toggleRetweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId,
    comment?: string
  ): Promise<{ action: string; retweet: T | null }>;
  getMostRetweetedTweets(limit: number): Promise<any[]>;
  getUserRetweetStats(userId: MongooseObjectId): Promise<any>;
}

// Follow repository interface
export interface IFollowRepository<T extends Document>
  extends IBaseRepository<T> {
  findFollowers(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;
  findFollowing(
    userId: MongooseObjectId,
    options?: BaseQueryOptions
  ): Promise<T[]>;
  findByFollowerAndFollowing(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<T | null>;
  countFollowers(userId: MongooseObjectId): Promise<number>;
  countFollowing(userId: MongooseObjectId): Promise<number>;
  isFollowing(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<boolean>;
  toggleFollow(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<{ action: string; follow: T | null }>;
  getMutualFollowers(
    userId1: MongooseObjectId,
    userId2: MongooseObjectId
  ): Promise<any[]>;
  getFollowSuggestions(userId: MongooseObjectId, limit: number): Promise<any[]>;
  bulkFollow(
    followerId: MongooseObjectId,
    followingIds: MongooseObjectId[]
  ): Promise<T[]>;
}
