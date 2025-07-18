/**
 * TypeScript interfaces for Service layer
 */

import {
  MongooseObjectId,
  IUserDocument,
  ITweetDocument,
  ILikeDocument,
  IFollowDocument,
  IRetweetDocument,
} from "./models";

// Common service interfaces
export interface ServiceOptions {
  limit?: number;
  skip?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchOptions extends ServiceOptions {
  filter?: Record<string, any>;
}

// User service interfaces
export interface CreateUserData {
  username: string;
  firstName: string;
  lastName?: string;
  email: string;
  password?: string;
  bio?: string;
  profileImage?: string;
  website?: string;
  location?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  profileImage?: string;
  website?: string;
  location?: string;
}

export interface UserStats {
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  likesGiven: number;
  likesReceived: number;
  retweetsCount: number;
}

export interface UserProfile
  extends Omit<
    IUserDocument,
    "password" | "resetPasswordToken" | "resetPasswordExpires"
  > {
  stats: UserStats;
}

export interface SanitizedUser
  extends Omit<
    IUserDocument,
    "password" | "resetPasswordToken" | "resetPasswordExpires"
  > {}

// Tweet service interfaces
export interface CreateTweetData {
  content: string;
  authorId: MongooseObjectId;
  images?: string[];
  hashtags?: string[];
  mentions?: MongooseObjectId[];
  parentTweetId?: MongooseObjectId; // For replies
}

export interface UpdateTweetData {
  content?: string;
  images?: string[];
  hashtags?: string[];
  mentions?: MongooseObjectId[];
}

export interface TweetWithAuthor extends Omit<ITweetDocument, "author"> {
  author: SanitizedUser;
  isLiked?: boolean;
  isRetweeted?: boolean;
  likesCount: number;
  retweetsCount: number;
  repliesCount: number;
}

export interface TimelineOptions extends ServiceOptions {
  userId?: MongooseObjectId;
  includeReplies?: boolean;
  includeRetweets?: boolean;
}

// Like service interfaces
export interface CreateLikeData {
  userId: MongooseObjectId;
  tweetId: MongooseObjectId;
}

export interface LikeResult {
  action: "liked" | "unliked";
  like: ILikeDocument | null;
  likesCount: number;
}

// Follow service interfaces
export interface FollowResult {
  action: "followed" | "unfollowed";
  follow: IFollowDocument | null;
  followersCount: number;
  followingCount?: number;
}

// Retweet service interfaces
export interface CreateRetweetData {
  userId: MongooseObjectId;
  tweetId: MongooseObjectId;
  comment?: string; // For quote tweets
}

export interface RetweetResult {
  action: "retweeted" | "unretweeted";
  retweet: IRetweetDocument | null;
  retweetsCount: number;
}

export interface FollowSuggestion {
  user: SanitizedUser;
  mutualFollowers: number;
  reason: string;
}

// Timeline service interfaces
export interface TimelineTweet extends TweetWithAuthor {
  retweetedBy?: SanitizedUser; // If this tweet was retweeted in the timeline
  originalTweet?: TweetWithAuthor; // For retweets with comments
}

export interface Timeline {
  tweets: TimelineTweet[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

// Service result interfaces
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedServiceResult<T> extends ServiceResult<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Cache interfaces
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string;
  refresh?: boolean;
}

// Base service interface
export interface IBaseService {
  // Common service methods that all services should implement
  validate?(data: any): ValidationResult;
  sanitize?(data: any): any;
}
