/**
 * TypeScript interfaces and types for MongoDB models
 */

import { Document, Types } from "mongoose";

// Base types
export type MongooseObjectId = Types.ObjectId;

// User interfaces
export interface IUser {
  username: string;
  password: string;
  confirmed: boolean;
  bio: string;
  website?: string;
  nullDate?: Date | null;
  createdAt: Date;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  profileImage?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

export interface IUserDocument extends IUser, Document<MongooseObjectId> {}

// Tweet interfaces
export interface ITweetLike {
  user: MongooseObjectId;
  createdAt: Date;
}

export interface ITweetRetweet {
  user: MongooseObjectId;
  createdAt: Date;
}

export interface ITweet {
  author: MongooseObjectId;
  content: string;
  createdAt: Date;
  likesCount: number;
  retweetsCount: number;
  repliesCount: number;
  mentions: MongooseObjectId[];
  hashtags: string[];
  images?: string[];
  parentTweetId?: MongooseObjectId;
  threadId?: MongooseObjectId;
  isDeleted: boolean;
  updatedAt?: Date;
}

export interface ITweetDocument extends ITweet, Document<MongooseObjectId> {}

// Like interfaces
export interface ILike {
  user: MongooseObjectId;
  tweet: MongooseObjectId;
  createdAt: Date;
}

export interface ILikeDocument extends ILike, Document<MongooseObjectId> {}

// Retweet interfaces
export interface IRetweet {
  user: MongooseObjectId;
  tweet: MongooseObjectId;
  createdAt: Date;
  comment?: string;
}

export interface IRetweetDocument
  extends IRetweet,
    Document<MongooseObjectId> {}

// Follow interfaces
export interface IFollow {
  follower: MongooseObjectId;
  following: MongooseObjectId;
  createdAt: Date;
}

export interface IFollowDocument extends IFollow, Document<MongooseObjectId> {}

// Populated interfaces (for when documents are populated)
export interface IPopulatedTweet extends Omit<ITweet, "author" | "mentions"> {
  author: IUser;
  mentions: IUser[];
}

export interface IPopulatedLike extends Omit<ILike, "user" | "tweet"> {
  user: IUser;
  tweet: ITweet;
}

export interface IPopulatedRetweet extends Omit<IRetweet, "user" | "tweet"> {
  user: IUser;
  tweet: ITweet;
}

export interface IPopulatedFollow
  extends Omit<IFollow, "follower" | "following"> {
  follower: IUser;
  following: IUser;
}

// Model creation interfaces
export interface IUserModel {
  username: string;
  password: string;
  confirmed?: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}

export interface ITweetModel {
  author: MongooseObjectId;
  content: string;
  mentions?: MongooseObjectId[];
}

export interface ILikeModel {
  user: MongooseObjectId;
  tweet: MongooseObjectId;
}

export interface IRetweetModel {
  user: MongooseObjectId;
  tweet: MongooseObjectId;
  comment?: string;
}

export interface IFollowModel {
  follower: MongooseObjectId;
  following: MongooseObjectId;
}

// Query interfaces
export interface IUserQuery {
  _id?: MongooseObjectId;
  username?: string;
  confirmed?: boolean;
  isDeleted?: boolean;
}

export interface ITweetQuery {
  _id?: MongooseObjectId;
  author?: MongooseObjectId;
  content?: RegExp | string;
  isDeleted?: boolean;
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export interface ILikeQuery {
  _id?: MongooseObjectId;
  user?: MongooseObjectId;
  tweet?: MongooseObjectId;
}

export interface IRetweetQuery {
  _id?: MongooseObjectId;
  user?: MongooseObjectId;
  tweet?: MongooseObjectId;
}

export interface IFollowQuery {
  _id?: MongooseObjectId;
  follower?: MongooseObjectId;
  following?: MongooseObjectId;
}

// Aggregation result interfaces
export interface ITweetStats {
  tweetId: MongooseObjectId;
  likesCount: number;
  retweetsCount: number;
  repliesCount: number;
}

export interface IUserStats {
  userId: MongooseObjectId;
  tweetsCount: number;
  followersCount: number;
  followingCount: number;
  likesCount: number;
}

// API response interfaces
export interface IUserResponse {
  id: string;
  username: string;
  confirmed: boolean;
  createdAt: Date;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}

export interface ITweetResponse {
  id: string;
  author: IUserResponse;
  content: string;
  createdAt: Date;
  images: string[];
  likesCount: number;
  retweetsCount: number;
  isLiked: boolean;
  isRetweeted: boolean;
}

export interface ILikeResponse {
  id: string;
  user: IUserResponse;
  tweet: ITweetResponse;
  createdAt: Date;
}

export interface IRetweetResponse {
  id: string;
  user: IUserResponse;
  tweet: ITweetResponse;
  comment?: string;
  createdAt: Date;
}

export interface IFollowResponse {
  id: string;
  follower: IUserResponse;
  following: IUserResponse;
  createdAt: Date;
}
