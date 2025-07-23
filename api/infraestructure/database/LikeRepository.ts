/**
 * Like Repository Implementation in TypeScript
 * Specific repository for Like domain operations with Redis caching
 */

import { BaseRepository } from "./BaseRepository";
import { Like } from "../../models";
import { ILikeRepository, BaseQueryOptions } from "../../types/repositories";
import { MongooseObjectId, ILikeDocument } from "../../types/models";
import { AppError, NotFoundError } from "../../utils/errors";
import redisManager, { redisConfig, cachePatterns } from "../../config/redis";

export class LikeRepository
  extends BaseRepository<ILikeDocument>
  implements ILikeRepository<ILikeDocument>
{
  constructor() {
    super(Like);
  }

  /**
   * Create like relationship with cache invalidation (Write-through pattern)
   */
  async create(data: Partial<ILikeDocument>): Promise<ILikeDocument> {
    try {
      // 1. Create in database
      const like = await super.create(data);

      // 2. Invalidate related caches immediately
      const userId = data.user!.toString();
      const tweetId = data.tweet!.toString();

      await Promise.all([
        // Invalidate like state cache
        redisManager.del(cachePatterns.LIKE_STATE(userId, tweetId)),
        // Invalidate tweet likes count cache
        redisManager.del(cachePatterns.TWEET_LIKES_COUNT(tweetId)),
        // Invalidate user likes cache
        redisManager.del(cachePatterns.USER_LIKES(userId)),
        // Invalidate tweet cache (like count affects tweet data)
        redisManager.del(cachePatterns.TWEET(tweetId)),
        // Invalidate trending cache (likes affect trending)
        redisManager.del(cachePatterns.TRENDING_TWEETS),
      ]);

      return like;
    } catch (error: any) {
      console.error("Error in LikeRepository.create:", error);
      return await super.create(data);
    }
  }

  /**
   * Delete like relationship with cache invalidation
   */
  async deleteById(id: MongooseObjectId): Promise<boolean> {
    try {
      // Get like relationship first for cache invalidation
      const like = await super.findById(id);

      // Delete from database
      const deleted = await super.deleteById(id);

      if (deleted && like) {
        const userId = like.user.toString();
        const tweetId = like.tweet.toString();

        // Invalidate all related caches
        await Promise.all([
          redisManager.del(cachePatterns.LIKE_STATE(userId, tweetId)),
          redisManager.del(cachePatterns.TWEET_LIKES_COUNT(tweetId)),
          redisManager.del(cachePatterns.USER_LIKES(userId)),
          redisManager.del(cachePatterns.TWEET(tweetId)),
          redisManager.del(cachePatterns.TRENDING_TWEETS),
        ]);
      }

      return deleted;
    } catch (error: any) {
      console.error("Error in LikeRepository.deleteById:", error);
      return await super.deleteById(id);
    }
  }

  /**
   * Find likes by user with Redis caching
   */
  async findByUser(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ILikeDocument[]> {
    try {
      const cacheKey = `${cachePatterns.USER_LIKES(
        userId.toString()
      )}:${JSON.stringify(options)}`;

      // Try to get from cache first
      const cached = await redisManager.get<ILikeDocument[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const filter = { user: userId };
      const likes = await this.find(filter, {
        populate: "tweet",
        sort: { createdAt: -1 },
        ...options,
      });

      // Cache the result
      await redisManager.set(cacheKey, likes, redisConfig.LIKE_STATE_TTL);

      return likes;
    } catch (error: any) {
      console.error("Error in LikeRepository.findByUser:", error);
      // Fallback to database
      const filter = { user: userId };
      return await this.find(filter, {
        populate: "tweet",
        sort: { createdAt: -1 },
        ...options,
      });
    }
  }

  /**
   * Find likes by tweet with Redis caching
   */
  async findByTweet(
    tweetId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ILikeDocument[]> {
    try {
      const cacheKey = `${cachePatterns.TWEET_LIKES_COUNT(
        tweetId.toString()
      )}:${JSON.stringify(options)}`;

      // Try to get from cache first
      const cached = await redisManager.get<ILikeDocument[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const filter = { tweet: tweetId };
      const likes = await this.find(filter, {
        populate: "user",
        sort: { createdAt: -1 },
        ...options,
      });

      // Cache the result
      await redisManager.set(cacheKey, likes, redisConfig.LIKE_STATE_TTL);

      return likes;
    } catch (error: any) {
      console.error("Error in LikeRepository.findByTweet:", error);
      // Fallback to database
      const filter = { tweet: tweetId };
      return await this.find(filter, {
        populate: "user",
        sort: { createdAt: -1 },
        ...options,
      });
    }
  }

  /**
   * Find like by user and tweet with Redis caching
   */
  async findByUserAndTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<ILikeDocument | null> {
    try {
      const cacheKey = cachePatterns.LIKE_STATE(
        userId.toString(),
        tweetId.toString()
      );

      // Try to get from cache first
      const cached = await redisManager.get<ILikeDocument | null>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      // Get from database
      const filter = { user: userId, tweet: tweetId };
      const like = await this.findOne(filter);

      // Cache the result
      await redisManager.set(cacheKey, like, redisConfig.LIKE_STATE_TTL);

      return like;
    } catch (error: any) {
      console.error("Error in LikeRepository.findByUserAndTweet:", error);
      // Fallback to database
      const filter = { user: userId, tweet: tweetId };
      return await this.findOne(filter);
    }
  }

  /**
   * Count likes for a tweet with Redis caching
   */
  async countByTweet(tweetId: MongooseObjectId): Promise<number> {
    try {
      const cacheKey = `${cachePatterns.TWEET_LIKES_COUNT(
        tweetId.toString()
      )}:count`;

      // Try to get from cache first
      const cached = await redisManager.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Get from database
      const filter = { tweet: tweetId };
      const count = await this.count(filter);

      // Cache the result
      await redisManager.set(cacheKey, count, redisConfig.LIKE_STATE_TTL);

      return count;
    } catch (error: any) {
      console.error("Error in LikeRepository.countByTweet:", error);
      // Fallback to database
      const filter = { tweet: tweetId };
      return await this.count(filter);
    }
  }

  /**
   * Check if a user has liked a tweet with Redis caching (Cache-Aside pattern)
   */
  async hasUserLikedTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<boolean> {
    try {
      const like = await this.findByUserAndTweet(userId, tweetId);
      return !!like;
    } catch (error: any) {
      console.error("Error in LikeRepository.hasUserLikedTweet:", error);
      // Direct fallback to database query
      const filter = { user: userId, tweet: tweetId };
      const like = await this.findOne(filter);
      return !!like;
    }
  }

  /**
   * Get most liked tweets with Redis caching
   */
  async getMostLikedTweets(
    limit: number = 10,
    timeFrame?: Date
  ): Promise<{ _id: MongooseObjectId; count: number }[]> {
    try {
      const cacheKey = `${cachePatterns.TRENDING_TWEETS}:most_liked:${limit}:${
        timeFrame?.getTime() || "all"
      }`;

      // Try to get from cache first
      const cached = await redisManager.get<
        { _id: MongooseObjectId; count: number }[]
      >(cacheKey);
      if (cached) {
        return cached;
      }

      // Aggregation pipeline
      const pipeline: any[] = [
        // Filter by time frame if provided
        ...(timeFrame ? [{ $match: { createdAt: { $gte: timeFrame } } }] : []),
        {
          $group: {
            _id: "$tweet",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: limit,
        },
      ];

      const results = await this.model.aggregate(pipeline);

      // Cache the result
      await redisManager.set(cacheKey, results, redisConfig.TRENDING_CACHE_TTL);

      return results;
    } catch (error: any) {
      console.error("Error in LikeRepository.getMostLikedTweets:", error);
      throw new AppError("Failed to get most liked tweets", 500);
    }
  }

  /**
   * Count likes by user with Redis caching
   */
  async countByUser(userId: MongooseObjectId): Promise<number> {
    try {
      const cacheKey = `${cachePatterns.USER_LIKES(userId.toString())}:count`;

      // Try to get from cache first
      const cached = await redisManager.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Get from database
      const filter = { user: userId };
      const count = await this.count(filter);

      // Cache the result
      await redisManager.set(cacheKey, count, redisConfig.LIKE_STATE_TTL);

      return count;
    } catch (error: any) {
      console.error("Error in LikeRepository.countByUser:", error);
      // Fallback to database
      const filter = { user: userId };
      return await this.count(filter);
    }
  }

  /**
   * Delete likes by tweet ID (for tweet deletion)
   */
  async deleteByTweet(tweetId: MongooseObjectId): Promise<boolean> {
    try {
      const filter = { tweet: tweetId };
      const deleted = await this.deleteMany(filter);

      // Invalidate related caches
      await Promise.all([
        redisManager.del(cachePatterns.TWEET_LIKES_COUNT(tweetId.toString())),
        redisManager.del(cachePatterns.TWEET(tweetId.toString())),
        redisManager.del(cachePatterns.TRENDING_TWEETS),
      ]);

      return deleted > 0;
    } catch (error: any) {
      console.error("Error in LikeRepository.deleteByTweet:", error);
      throw new AppError("Failed to delete likes by tweet", 500);
    }
  }

  /**
   * Delete likes by user ID (for user deletion)
   */
  async deleteByUser(userId: MongooseObjectId): Promise<boolean> {
    try {
      const filter = { user: userId };
      const deleted = await this.deleteMany(filter);

      // Invalidate related caches
      await Promise.all([
        redisManager.del(cachePatterns.USER_LIKES(userId.toString())),
        redisManager.del(cachePatterns.TRENDING_TWEETS),
      ]);

      return deleted > 0;
    } catch (error: any) {
      console.error("Error in LikeRepository.deleteByUser:", error);
      throw new AppError("Failed to delete likes by user", 500);
    }
  }

  /**
   * Toggle like for a tweet (like/unlike)
   */
  async toggleLike(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<{ action: string; like: ILikeDocument | null }> {
    try {
      const existingLike = await this.findByUserAndTweet(userId, tweetId);

      if (existingLike) {
        // Unlike - delete existing like
        await this.deleteById(existingLike._id!);
        return { action: "unliked", like: null };
      } else {
        // Like - create new like
        const likeDocument = await this.create({
          user: userId,
          tweet: tweetId,
        });
        return { action: "liked", like: likeDocument };
      }
    } catch (error: any) {
      console.error("Error in LikeRepository.toggleLike:", error);
      throw new AppError("Failed to toggle like", 500);
    }
  }

  /**
   * Get user like statistics with Redis caching
   */
  async getUserLikeStats(userId: MongooseObjectId): Promise<{
    totalLikes: number;
    totalLikesReceived: number;
    mostLikedTweet?: { tweetId: MongooseObjectId; likeCount: number };
  }> {
    try {
      const cacheKey = `${cachePatterns.USER_STATS(userId.toString())}:likes`;

      // Try to get from cache first
      const cached = await redisManager.get<{
        totalLikes: number;
        totalLikesReceived: number;
        mostLikedTweet?: { tweetId: MongooseObjectId; likeCount: number };
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get total likes given by user
      const totalLikes = await this.countByUser(userId);

      // Get total likes received on user's tweets (requires aggregation)
      const likesReceivedPipeline: any[] = [
        {
          $lookup: {
            from: "tweets",
            localField: "tweet",
            foreignField: "_id",
            as: "tweetData",
          },
        },
        {
          $unwind: "$tweetData",
        },
        {
          $match: {
            "tweetData.author": userId,
          },
        },
        {
          $group: {
            _id: "$tweet",
            likeCount: { $sum: 1 },
          },
        },
        {
          $sort: { likeCount: -1 },
        },
      ];

      const likesReceived = await this.model.aggregate(likesReceivedPipeline);
      const totalLikesReceived = likesReceived.reduce(
        (sum, item) => sum + item.likeCount,
        0
      );
      const mostLikedTweet = likesReceived[0]
        ? {
            tweetId: likesReceived[0]._id,
            likeCount: likesReceived[0].likeCount,
          }
        : undefined;

      const stats = {
        totalLikes,
        totalLikesReceived,
        mostLikedTweet,
      };

      // Cache the result
      await redisManager.set(cacheKey, stats, redisConfig.USER_CACHE_TTL);

      return stats;
    } catch (error: any) {
      console.error("Error in LikeRepository.getUserLikeStats:", error);
      throw new AppError("Failed to get user like stats", 500);
    }
  }
}
