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
   * Check if user has liked a tweet (alias for better naming)
   */
  async isLiked(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<boolean> {
    return await this.hasUserLikedTweet(userId, tweetId);
  }

  /**
   * Get recent likes activity for a user
   */
  async getRecentLikesActivity(
    userId: MongooseObjectId,
    hours: number = 24,
    limit: number = 20
  ): Promise<any[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get user's recent likes
    const userLikes = await this.likeRepository.findByUser(userId, {
      limit,
      sort: { createdAt: -1 },
    });

    // Filter by timeframe
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentLikes = userLikes.filter(
      (like) => like.createdAt && like.createdAt >= cutoffDate
    );

    return recentLikes.map((like: any) => ({
      likeId: like._id,
      tweetId: like.tweet._id,
      likedAt: like.createdAt,
      tweet: {
        content: like.tweet.content,
        author: like.tweet.author,
        createdAt: like.tweet.createdAt,
      },
    }));
  }

  /**
   * Get trending tweets by likes in a timeframe
   */
  async getTrendingByLikes(
    timeframe: number = 24,
    limit: number = 10,
    period: string = "hours"
  ): Promise<any[]> {
    // Use repository method directly for trending
    const tweets = await this.likeRepository.getMostLikedTweets(limit);
    return tweets;
  }

  /**
   * Bulk like operation
   */
  async bulkLike(
    userId: MongooseObjectId,
    tweetIds: MongooseObjectId[]
  ): Promise<{
    successful: any[];
    failed: any[];
    totalProcessed: number;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const successful: any[] = [];
    const failed: any[] = [];

    for (const tweetId of tweetIds) {
      try {
        // Check if tweet exists
        const tweet = await this.tweetRepository.findById(tweetId);
        if (!tweet) {
          failed.push({
            tweetId,
            error: "Tweet not found",
          });
          continue;
        }

        // Check if already liked
        const existingLike = await this.likeRepository.findByUserAndTweet(
          userId,
          tweetId
        );
        if (existingLike) {
          failed.push({
            tweetId,
            error: "Already liked",
          });
          continue;
        }

        // Create like
        const like = await this.likeRepository.create({
          user: userId,
          tweet: tweetId,
          createdAt: new Date(),
        } as Partial<ILikeDocument>);

        successful.push({
          tweetId,
          likeId: like._id,
          likedAt: like.createdAt,
        });
      } catch (error) {
        failed.push({
          tweetId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      successful,
      failed,
      totalProcessed: tweetIds.length,
    };
  }

  /**
   * Get likes activity feed for user timeline
   */
  async getLikesActivityFeed(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    activities: any[];
    totalActivities: number;
    userId: MongooseObjectId;
  }> {
    const { limit = 20, skip = 0 } = options;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get all likes for activity feed
    const activities = await this.likeRepository.findByUser(userId, {
      limit,
      skip,
      sort: { createdAt: -1 },
    });

    const totalActivities = await this.likeRepository.countByUser(userId);

    return {
      activities: activities.map((activity: any) => ({
        activityId: activity._id,
        userId: activity.user,
        tweetId: activity.tweet._id,
        tweetInfo: {
          content: activity.tweet.content,
          authorId: activity.tweet.author,
          createdAt: activity.tweet.createdAt,
        },
        likedAt: activity.createdAt,
        type: "like",
      })),
      totalActivities,
      userId,
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
   * Get most liked tweets
   */
  async getMostLikedTweets(limit: number = 10): Promise<any[]> {
    const tweets = await this.likeRepository.getMostLikedTweets(limit);
    return tweets;
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
