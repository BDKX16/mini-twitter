/**
 * Retweet Repository Implementation in TypeScript
 * Specific repository for Retweet domain operations with Redis caching
 */

import { BaseRepository } from "./BaseRepository";
import { Retweet } from "../../models";
import { IRetweetRepository, BaseQueryOptions } from "../../types/repositories";
import { MongooseObjectId, IRetweetDocument } from "../../types/models";
import { AppError, NotFoundError } from "../../utils/errors";
import redisManager, { redisConfig, cachePatterns } from "../../config/redis";

export class RetweetRepository
  extends BaseRepository<IRetweetDocument>
  implements IRetweetRepository<IRetweetDocument>
{
  constructor() {
    super(Retweet);
  }

  /**
   * Create retweet with cache invalidation (Write-through pattern)
   */
  async create(data: Partial<IRetweetDocument>): Promise<IRetweetDocument> {
    try {
      // 1. Create in database
      const retweet = await super.create(data);

      // 2. Invalidate related caches immediately
      const userId = data.user!.toString();
      const tweetId = data.tweet!.toString();

      await Promise.all([
        // Invalidate retweet state cache
        redisManager.del(cachePatterns.RETWEET_STATE(userId, tweetId)),
        // Invalidate tweet retweets count cache
        redisManager.del(cachePatterns.TWEET_RETWEETS_COUNT(tweetId)),
        // Invalidate user retweets cache
        redisManager.del(cachePatterns.USER_RETWEETS(userId)),
        // Invalidate tweet cache (retweet count affects tweet data)
        redisManager.del(cachePatterns.TWEET(tweetId)),
        // Invalidate trending cache (retweets affect trending)
        redisManager.del(cachePatterns.TRENDING_TWEETS),
        // Invalidate timeline (new retweet affects timeline)
        redisManager.del(cachePatterns.TIMELINE(userId)),
      ]);

      return retweet;
    } catch (error: any) {
      console.error("Error in RetweetRepository.create:", error);
      return await super.create(data);
    }
  }

  /**
   * Delete retweet with cache invalidation
   */
  async deleteById(id: MongooseObjectId): Promise<boolean> {
    try {
      // Get retweet relationship first for cache invalidation
      const retweet = await super.findById(id);

      // Delete from database
      const deleted = await super.deleteById(id);

      if (deleted && retweet) {
        const userId = retweet.user.toString();
        const tweetId = retweet.tweet.toString();

        // Invalidate all related caches
        await Promise.all([
          redisManager.del(cachePatterns.RETWEET_STATE(userId, tweetId)),
          redisManager.del(cachePatterns.TWEET_RETWEETS_COUNT(tweetId)),
          redisManager.del(cachePatterns.USER_RETWEETS(userId)),
          redisManager.del(cachePatterns.TWEET(tweetId)),
          redisManager.del(cachePatterns.TRENDING_TWEETS),
          redisManager.del(cachePatterns.TIMELINE(userId)),
        ]);
      }

      return deleted;
    } catch (error: any) {
      console.error("Error in RetweetRepository.deleteById:", error);
      return await super.deleteById(id);
    }
  }

  /**
   * Find retweets by user with Redis caching
   */
  async findByUser(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<IRetweetDocument[]> {
    try {
      const cacheKey = `${cachePatterns.USER_RETWEETS(
        userId.toString()
      )}:${JSON.stringify(options)}`;

      // Try to get from cache first
      const cached = await redisManager.get<IRetweetDocument[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const filter = { user: userId };
      const retweets = await this.find(filter, {
        populate: "tweet",
        sort: { createdAt: -1 },
        ...options,
      });

      // Cache the result
      await redisManager.set(cacheKey, retweets, redisConfig.LIKE_STATE_TTL);

      return retweets;
    } catch (error: any) {
      console.error("Error in RetweetRepository.findByUser:", error);
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
   * Find retweets of a tweet with Redis caching
   */
  async findByTweet(
    tweetId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<IRetweetDocument[]> {
    try {
      const cacheKey = `${cachePatterns.TWEET_RETWEETS_COUNT(
        tweetId.toString()
      )}:${JSON.stringify(options)}`;

      // Try to get from cache first
      const cached = await redisManager.get<IRetweetDocument[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const filter = { tweet: tweetId };
      const retweets = await this.find(filter, {
        populate: "user",
        sort: { createdAt: -1 },
        ...options,
      });

      // Cache the result
      await redisManager.set(cacheKey, retweets, redisConfig.LIKE_STATE_TTL);

      return retweets;
    } catch (error: any) {
      console.error("Error in RetweetRepository.findByTweet:", error);
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
   * Find retweet by user and tweet with Redis caching
   */
  async findByUserAndTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<IRetweetDocument | null> {
    try {
      const cacheKey = cachePatterns.RETWEET_STATE(
        userId.toString(),
        tweetId.toString()
      );

      // Try to get from cache first
      const cached = await redisManager.get<IRetweetDocument | null>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      // Get from database
      const filter = { user: userId, tweet: tweetId };
      const retweet = await this.findOne(filter);

      // Cache the result
      await redisManager.set(cacheKey, retweet, redisConfig.LIKE_STATE_TTL);

      return retweet;
    } catch (error: any) {
      console.error("Error in RetweetRepository.findByUserAndTweet:", error);
      // Fallback to database
      const filter = { user: userId, tweet: tweetId };
      return await this.findOne(filter);
    }
  }

  /**
   * Find quote retweets (retweets with comments)
   */
  async findQuoteRetweets(
    tweetId?: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<IRetweetDocument[]> {
    try {
      const filter: any = { comment: { $exists: true, $ne: "" } };
      if (tweetId) {
        filter.tweet = tweetId;
      }

      return await this.find(filter, {
        populate: ["user", "tweet"],
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find quote retweets", 500);
    }
  }

  /**
   * Find simple retweets (retweets without comments)
   */
  async findSimpleRetweets(
    tweetId?: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<IRetweetDocument[]> {
    try {
      const filter: any = {
        $or: [{ comment: { $exists: false } }, { comment: "" }],
      };
      if (tweetId) {
        filter.tweet = tweetId;
      }

      return await this.find(filter, {
        populate: ["user", "tweet"],
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find simple retweets", 500);
    }
  }

  /**
   * Count retweets of a tweet with Redis caching
   */
  async countByTweet(tweetId: MongooseObjectId): Promise<number> {
    try {
      const cacheKey = `${cachePatterns.TWEET_RETWEETS_COUNT(
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
      console.error("Error in RetweetRepository.countByTweet:", error);
      // Fallback to database
      const filter = { tweet: tweetId };
      return await this.count(filter);
    }
  }

  /**
   * Count retweets by user with Redis caching
   */
  async countByUser(userId: MongooseObjectId): Promise<number> {
    try {
      const cacheKey = `${cachePatterns.USER_RETWEETS(
        userId.toString()
      )}:count`;

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
      console.error("Error in RetweetRepository.countByUser:", error);
      // Fallback to database
      const filter = { user: userId };
      return await this.count(filter);
    }
  }

  /**
   * Toggle retweet (retweet/unretweet)
   */
  async toggleRetweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId,
    comment?: string
  ): Promise<{ action: string; retweet: IRetweetDocument | null }> {
    try {
      const existingRetweet = await this.findByUserAndTweet(userId, tweetId);

      if (existingRetweet) {
        // Unretweet
        await this.deleteById(existingRetweet._id!);
        return { action: "unretweeted", retweet: null };
      } else {
        // Retweet
        const retweet = await this.create({
          user: userId,
          tweet: tweetId,
          comment: comment || "",
          createdAt: new Date(),
        } as Partial<IRetweetDocument>);
        return { action: "retweeted", retweet };
      }
    } catch (error: any) {
      throw new AppError("Failed to toggle retweet", 500);
    }
  }

  /**
   * Check if a user has retweeted a tweet
   */
  async hasUserRetweetedTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<boolean> {
    try {
      const retweet = await this.findByUserAndTweet(userId, tweetId);
      return !!retweet;
    } catch (error: any) {
      console.error("Error in RetweetRepository.hasUserRetweetedTweet:", error);
      // Direct fallback to database query
      const filter = { user: userId, tweet: tweetId };
      const retweet = await this.findOne(filter);
      return !!retweet;
    }
  }

  /**
   * Get most retweeted tweets with Redis caching
   */
  async getMostRetweetedTweets(
    limit: number = 10,
    timeFrame?: Date
  ): Promise<any[]> {
    try {
      const cacheKey = `${
        cachePatterns.TRENDING_TWEETS
      }:most_retweeted:${limit}:${timeFrame?.getTime() || "all"}`;

      // Try to get from cache first
      const cached = await redisManager.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Aggregation pipeline
      const pipeline = [
        // Filter by time frame if provided
        ...(timeFrame ? [{ $match: { createdAt: { $gte: timeFrame } } }] : []),
        {
          $group: {
            _id: "$tweet",
            retweetsCount: { $sum: 1 },
            latestRetweet: { $max: "$createdAt" },
          },
        },
        {
          $sort: { retweetsCount: -1, latestRetweet: -1 },
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: "tweets",
            localField: "_id",
            foreignField: "_id",
            as: "tweet",
          },
        },
        {
          $unwind: "$tweet",
        },
        {
          $lookup: {
            from: "users",
            localField: "tweet.author",
            foreignField: "_id",
            as: "tweet.author",
          },
        },
        {
          $unwind: "$tweet.author",
        },
        {
          $project: {
            tweet: 1,
            retweetsCount: 1,
          },
        },
      ];

      const results = await this.aggregate(pipeline);

      // Cache the result
      await redisManager.set(cacheKey, results, redisConfig.TRENDING_CACHE_TTL);

      return results;
    } catch (error: any) {
      console.error(
        "Error in RetweetRepository.getMostRetweetedTweets:",
        error
      );
      throw new AppError("Failed to get most retweeted tweets", 500);
    }
  }

  /**
   * Get user retweet statistics
   */
  async getUserRetweetStats(userId: MongooseObjectId): Promise<any> {
    try {
      const pipeline = [
        {
          $match: { user: userId },
        },
        {
          $group: {
            _id: null,
            totalRetweets: { $sum: 1 },
            quoteRetweets: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $exists: ["$comment"] },
                      { $ne: ["$comment", ""] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            simpleRetweets: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $not: { $exists: ["$comment"] } },
                      { $eq: ["$comment", ""] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalRetweets: 1,
            quoteRetweets: 1,
            simpleRetweets: 1,
            quoteRetweetPercentage: {
              $multiply: [
                { $divide: ["$quoteRetweets", "$totalRetweets"] },
                100,
              ],
            },
          },
        },
      ];

      const result = await this.aggregate(pipeline);
      return (
        result[0] || {
          totalRetweets: 0,
          quoteRetweets: 0,
          simpleRetweets: 0,
          quoteRetweetPercentage: 0,
        }
      );
    } catch (error: any) {
      throw new AppError("Failed to get user retweet stats", 500);
    }
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { RetweetRepository };
