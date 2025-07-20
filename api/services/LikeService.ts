/**
 * Like Service Implementation in TypeScript
 * Business logic layer for Like operations
 */

import { LikeRepository } from "../infraestructure/database/LikeRepository";
import { TweetRepository } from "../infraestructure/database/TweetRepository";
import { UserRepository } from "../infraestructure/database/UserRepository";
import {
  LikeResult,
  ServiceOptions,
  ValidationResult,
  IBaseService,
} from "../types/services";
import { MongooseObjectId, ILikeDocument } from "../types/models";
import { ValidationError, NotFoundError, ConflictError } from "../utils/errors";

export class LikeService implements IBaseService {
  private likeRepository: LikeRepository;
  private tweetRepository: TweetRepository;
  private userRepository: UserRepository;

  constructor() {
    this.likeRepository = new LikeRepository();
    this.tweetRepository = new TweetRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Like a tweet
   */
  async likeTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<ILikeDocument> {
    try {
      // Verify user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Verify tweet exists
      const tweet = await this.tweetRepository.findById(tweetId);
      if (!tweet) {
        throw new NotFoundError("Tweet not found");
      }

      // Check if like already exists
      const existingLike = await this.likeRepository.findByUserAndTweet(
        userId,
        tweetId
      );
      if (existingLike) {
        throw new ConflictError("You have already liked this tweet");
      }

      // Create like
      const like = await this.likeRepository.create({
        user: userId,
        tweet: tweetId,
        createdAt: new Date(),
      } as Partial<ILikeDocument>);

      return like;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Unlike a tweet
   */
  async unlikeTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<{ message: string }> {
    try {
      // Verify user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Verify tweet exists
      const tweet = await this.tweetRepository.findById(tweetId);
      if (!tweet) {
        throw new NotFoundError("Tweet not found");
      }

      // Check if like exists
      const existingLike = await this.likeRepository.findByUserAndTweet(
        userId,
        tweetId
      );
      if (!existingLike) {
        throw new NotFoundError("You have not liked this tweet");
      }

      // Delete like
      const deleted = await this.likeRepository.deleteById(existingLike._id!);
      if (!deleted) {
        throw new Error("Failed to unlike tweet");
      }

      return { message: "Tweet unliked successfully" };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Toggle like/unlike
   */
  async toggleLike(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<LikeResult> {
    try {
      const result = await this.likeRepository.toggleLike(userId, tweetId);
      const likesCount = await this.likeRepository.countByTweet(tweetId);

      return {
        action: result.action as "liked" | "unliked",
        like: result.like,
        likesCount,
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get likes for a tweet
   */
  async getTweetLikes(
    tweetId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    tweetId: MongooseObjectId;
    likes: any[];
    totalLikes: number;
  }> {
    const { limit = 50, skip = 0 } = options;

    // Verify tweet exists
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    const likes = await this.likeRepository.findByTweet(tweetId, {
      limit,
      skip,
      populate: "user",
    });

    const totalLikes = await this.likeRepository.countByTweet(tweetId);

    return {
      tweetId,
      likes: likes.map((like: any) => ({
        userId: like.user._id,
        firstName: like.user.firstName,
        lastName: like.user.lastName,
        username: like.user.username,
        profileImage: like.user.profileImage,
        likedAt: like.createdAt,
      })),
      totalLikes,
    };
  }

  /**
   * Get user's liked tweets
   */
  async getUserLikes(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    userId: MongooseObjectId;
    likes: any[];
    totalLikes: number;
  }> {
    const { limit = 50, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const likes = await this.likeRepository.findByUser(userId, {
      limit,
      skip,
      populate: "tweet",
    });

    const totalLikes = await this.likeRepository.countByUser(userId);

    return {
      userId,
      likes: likes.map((like: any) => ({
        tweetId: like.tweet._id,
        tweetContent: like.tweet.content,
        tweetAuthor: like.tweet.author,
        likedAt: like.createdAt,
      })),
      totalLikes,
    };
  }

  /**
   * Check if user has liked a tweet
   */
  async hasUserLikedTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<boolean> {
    const like = await this.likeRepository.findByUserAndTweet(userId, tweetId);
    return like !== null;
  }

  /**
   * Get most liked tweets
   */
  async getMostLikedTweets(limit: number = 10): Promise<any[]> {
    const tweets = await this.likeRepository.getMostLikedTweets(limit);
    return tweets;
  }

  /**
   * Get like statistics for a user
   */
  async getUserLikeStats(userId: MongooseObjectId): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const stats = await this.likeRepository.getUserLikeStats(userId);
    return stats;
  }

  /**
   * Get likes count for a tweet
   */
  async getTweetLikesCount(tweetId: MongooseObjectId): Promise<number> {
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    return await this.likeRepository.countByTweet(tweetId);
  }

  /**
   * Validate like operation
   */
  validate(data: {
    userId: MongooseObjectId;
    tweetId: MongooseObjectId;
  }): ValidationResult {
    const errors: string[] = [];

    if (!data.userId) {
      errors.push("User ID is required");
    }

    if (!data.tweetId) {
      errors.push("Tweet ID is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize like data
   */
  sanitize(like: ILikeDocument): ILikeDocument {
    // No sensitive data to remove from likes
    return like;
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { LikeService };
