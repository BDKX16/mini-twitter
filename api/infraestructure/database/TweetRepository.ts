/**
 * Tweet Repository Implementation in TypeScript
 * Specific repository for Tweet domain operations with Redis caching
 */

import { BaseRepository } from "./BaseRepository";
import { Tweet, Follow } from "../../models";
import { ITweetRepository, BaseQueryOptions } from "../../types/repositories";
import { MongooseObjectId, ITweetDocument } from "../../types/models";
import { AppError, NotFoundError } from "../../utils/errors";
import redisManager, { redisConfig, cachePatterns } from "../../config/redis";

export class TweetRepository
  extends BaseRepository<ITweetDocument>
  implements ITweetRepository<ITweetDocument>
{
  constructor() {
    super(Tweet);
  }

  /**
   * Find tweet by ID with Redis caching (Cache-Aside pattern)
   */
  async findById(id: MongooseObjectId): Promise<ITweetDocument | null> {
    try {
      const cacheKey = cachePatterns.TWEET(id.toString());

      // 1. Try to get from Redis cache first
      const cached = await redisManager.get<ITweetDocument>(cacheKey);
      if (cached) {
        return cached;
      }

      // 2. If not in cache, get from database
      const tweet = await super.findById(id);

      // 3. Cache the result if found
      if (tweet) {
        await redisManager.set(cacheKey, tweet, redisConfig.TWEET_CACHE_TTL);
      }

      return tweet;
    } catch (error: any) {
      console.error("Error in TweetRepository.findById:", error);
      // Fallback to database if Redis fails
      return await super.findById(id);
    }
  }

  /**
   * Create tweet with cache invalidation (Write-through pattern)
   */
  async create(data: Partial<ITweetDocument>): Promise<ITweetDocument> {
    try {
      // 1. Create in database
      const tweet = await super.create(data);

      // 2. Cache the new tweet
      const cacheKey = cachePatterns.TWEET(tweet._id!.toString());
      await redisManager.set(cacheKey, tweet, redisConfig.TWEET_CACHE_TTL);

      // 3. Invalidate related caches
      await Promise.all([
        // Invalidate user's tweets cache
        redisManager.del(cachePatterns.TWEETS_BY_USER(data.author!.toString())),
        // Invalidate public timeline
        redisManager.del(cachePatterns.TIMELINE_PUBLIC),
        // Invalidate trending caches (new tweet might affect trends)
        redisManager.del([
          cachePatterns.TRENDING_TWEETS,
          cachePatterns.TRENDING_HASHTAGS,
        ]),
      ]);

      return tweet;
    } catch (error: any) {
      console.error("Error in TweetRepository.create:", error);
      return await super.create(data);
    }
  }

  /**
   * Update tweet with cache invalidation (Write-through pattern)
   */
  async updateById(
    id: MongooseObjectId,
    data: Partial<ITweetDocument>
  ): Promise<ITweetDocument | null> {
    try {
      // 1. Update in database
      const updatedTweet = await super.updateById(id, data);

      if (updatedTweet) {
        // 2. Update cache immediately (Write-through)
        const cacheKey = cachePatterns.TWEET(id.toString());
        await redisManager.set(
          cacheKey,
          updatedTweet,
          redisConfig.TWEET_CACHE_TTL
        );

        // 3. Invalidate related caches
        await Promise.all([
          redisManager.del(
            cachePatterns.TWEETS_BY_USER(updatedTweet.author.toString())
          ),
          redisManager.del(cachePatterns.TIMELINE_PUBLIC),
          // Invalidate like/retweet counts if those were updated
          redisManager.del([
            cachePatterns.TWEET_LIKES_COUNT(id.toString()),
            cachePatterns.TWEET_RETWEETS_COUNT(id.toString()),
          ]),
        ]);
      }

      return updatedTweet;
    } catch (error: any) {
      console.error("Error in TweetRepository.updateById:", error);
      return await super.updateById(id, data);
    }
  }

  /**
   * Delete tweet with cache invalidation
   */
  async deleteById(id: MongooseObjectId): Promise<boolean> {
    try {
      // Get tweet first for cache invalidation
      const tweet = await this.findById(id);

      // Delete from database
      const deleted = await super.deleteById(id);

      if (deleted && tweet) {
        // Invalidate all related caches
        await Promise.all([
          redisManager.del([
            cachePatterns.TWEET(id.toString()),
            cachePatterns.TWEETS_BY_USER(tweet.author.toString()),
            cachePatterns.TWEET_LIKES_COUNT(id.toString()),
            cachePatterns.TWEET_RETWEETS_COUNT(id.toString()),
            cachePatterns.TIMELINE_PUBLIC,
          ]),
          // Invalidate user timelines (tweet deletion affects timelines)
          redisManager.deleteByPattern(`${cachePatterns.TIMELINE("*")}`),
        ]);
      }

      return deleted;
    } catch (error: any) {
      console.error("Error in TweetRepository.deleteById:", error);
      return await super.deleteById(id);
    }
  }

  /**
   * Find tweets by author with Redis caching
   */
  async findByAuthor(
    authorId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      const cacheKey = `${cachePatterns.TWEETS_BY_USER(
        authorId.toString()
      )}:${JSON.stringify(options)}`;

      // Try to get from cache first
      const cached = await redisManager.get<ITweetDocument[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const filter = { author: authorId };
      const tweets = await this.find(filter, {
        populate: "author",
        sort: { createdAt: -1 },
        ...options,
      });

      // Cache the result
      await redisManager.set(cacheKey, tweets, redisConfig.TWEET_CACHE_TTL);

      return tweets;
    } catch (error: any) {
      console.error("Error in TweetRepository.findByAuthor:", error);
      // Fallback to database
      const filter = { author: authorId };
      return await this.find(filter, {
        populate: "author",
        sort: { createdAt: -1 },
        ...options,
      });
    }
  }

  /**
   * Find recent tweets with Redis caching (for public timeline)
   */
  async findRecent(
    limit: number,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      const cacheKey = `${
        cachePatterns.TIMELINE_PUBLIC
      }:${limit}:${JSON.stringify(options)}`;

      // Try to get from cache first
      const cached = await redisManager.get<ITweetDocument[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const tweets = await this.find(
        {},
        {
          populate: "author",
          sort: { createdAt: -1 },
          limit,
          ...options,
        }
      );

      // Cache the result with shorter TTL for timeline
      await redisManager.set(cacheKey, tweets, redisConfig.TIMELINE_CACHE_TTL);

      return tweets;
    } catch (error: any) {
      console.error("Error in TweetRepository.findRecent:", error);
      // Fallback to database
      return await this.find(
        {},
        {
          populate: "author",
          sort: { createdAt: -1 },
          limit,
          ...options,
        }
      );
    }
  }

  /**
   * Find tweets mentioning a user
   */
  async findByMention(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      const filter = { mentions: userId };
      return await this.find(filter, {
        populate: "author",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find tweets by mention", 500);
    }
  }

  /**
   * Search tweets by content
   */
  async searchByContent(
    searchTerm: string,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      const filter = {
        $text: { $search: searchTerm },
      };
      return await this.find(filter, {
        populate: "author",
        sort: { createdAt: -1 }, // Use createdAt instead of text score
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to search tweets by content", 500);
    }
  }

  /**
   * Get trending tweets
   */
  async getTrending(hours: number, limit: number): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const pipeline = [
        {
          $match: {
            createdAt: { $gte: cutoffDate },
          },
        },
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "tweet",
            as: "likes",
          },
        },
        {
          $lookup: {
            from: "retweets",
            localField: "_id",
            foreignField: "tweet",
            as: "retweets",
          },
        },
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $size: "$likes" },
                { $multiply: [{ $size: "$retweets" }, 2] }, // Retweets worth more
              ],
            },
          },
        },
        {
          $sort: { engagementScore: -1 },
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $unwind: "$author",
        },
      ];

      return await this.aggregate(pipeline);
    } catch (error: any) {
      throw new AppError("Failed to get trending tweets", 500);
    }
  }

  /**
   * Get tweet statistics
   */
  async getTweetStats(tweetId: MongooseObjectId): Promise<any> {
    try {
      const pipeline = [
        { $match: { _id: tweetId } },
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "tweet",
            as: "likes",
          },
        },
        {
          $lookup: {
            from: "retweets",
            localField: "_id",
            foreignField: "tweet",
            as: "retweets",
          },
        },
        {
          $lookup: {
            from: "tweets",
            localField: "_id",
            foreignField: "parentTweetId",
            as: "replies",
          },
        },
        {
          $project: {
            likesCount: { $size: "$likes" },
            retweetsCount: { $size: "$retweets" },
            repliesCount: { $size: "$replies" },
            viewsCount: { $ifNull: ["$views", 0] },
          },
        },
      ];

      const result = await this.aggregate(pipeline);
      return (
        result[0] || {
          likesCount: 0,
          retweetsCount: 0,
          repliesCount: 0,
          viewsCount: 0,
        }
      );
    } catch (error: any) {
      throw new AppError("Failed to get tweet stats", 500);
    }
  }

  /**
   * Get timeline for user (tweets from followed users)
   */
  async getTimelineForUser(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      // First, get the list of users that this user follows
      const followedUsers = await Follow.find({ follower: userId }).select(
        "following"
      );
      const followingIds = followedUsers.map((follow: any) => follow.following);

      // Include the user's own tweets as well
      const authorIds = [...followingIds, userId];

      console.log("User:", userId.toString());
      console.log(
        "Following IDs:",
        followingIds.map((id: any) => id.toString())
      );
      console.log(
        "All author IDs:",
        authorIds.map((id: any) => id.toString())
      );

      // Now get tweets from these users
      const pipeline = [
        {
          $match: {
            author: { $in: authorIds },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $unwind: "$author",
        },
        {
          $sort: { createdAt: -1 },
        },
      ];

      if (options.skip) {
        pipeline.push({ $skip: options.skip } as any);
      }

      if (options.limit) {
        pipeline.push({ $limit: options.limit } as any);
      }

      const result = await this.aggregate(pipeline);
      return result;
    } catch (error: any) {
      throw new AppError("Failed to get timeline for user", 500);
    }
  }

  /**
   * Get tweets by hashtag
   */
  async getHashtagTweets(
    hashtag: string,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      const filter = { hashtags: hashtag };
      return await this.find(filter, {
        populate: "author",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to get hashtag tweets", 500);
    }
  }

  /**
   * Get home timeline (tweets from followed users + famous users)
   */
  async getHomeTimeline(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      // First, get the list of users that this user follows
      const followedUsers = await Follow.find({ follower: userId }).select(
        "following"
      );
      const followingIds = followedUsers.map((follow: any) => follow.following);

      // Get famous users (users with most followers)
      const famousUsersAgg = await Follow.aggregate([
        {
          $group: {
            _id: "$following",
            followerCount: { $sum: 1 },
          },
        },
        {
          $match: {
            followerCount: { $gte: 10 }, // Users with 10+ followers
          },
        },
        {
          $sort: { followerCount: -1 },
        },
        {
          $limit: 20, // Top 20 most followed users
        },
        {
          $project: {
            _id: 1,
          },
        },
      ]);

      const famousUserIds = famousUsersAgg.map((user: any) => user._id);

      // Combine followed users, famous users, and user's own tweets
      const authorIds = [
        ...new Set([...followingIds, ...famousUserIds, userId]),
      ];

      // Get tweets from different categories separately for better mixing
      const [followedTweets, famousTweets, ownTweets] = await Promise.all([
        // Tweets from followed users (if any)
        followingIds.length > 0
          ? this.aggregate([
              { $match: { author: { $in: followingIds } } },
              {
                $lookup: {
                  from: "users",
                  localField: "author",
                  foreignField: "_id",
                  as: "author",
                },
              },
              { $unwind: "$author" },
              { $sort: { createdAt: -1 } },
              { $limit: Math.ceil((options.limit || 20) * 0.6) }, // 60% followed users
            ])
          : [],

        // Tweets from famous users
        this.aggregate([
          { $match: { author: { $in: famousUserIds, $ne: userId } } },
          {
            $lookup: {
              from: "users",
              localField: "author",
              foreignField: "_id",
              as: "author",
            },
          },
          { $unwind: "$author" },
          { $sort: { createdAt: -1 } },
          { $limit: Math.ceil((options.limit || 20) * 0.3) }, // 30% famous users
        ]),

        // User's own tweets
        this.aggregate([
          { $match: { author: userId } },
          {
            $lookup: {
              from: "users",
              localField: "author",
              foreignField: "_id",
              as: "author",
            },
          },
          { $unwind: "$author" },
          { $sort: { createdAt: -1 } },
          { $limit: Math.ceil((options.limit || 20) * 0.1) }, // 10% own tweets
        ]),
      ]);

      // Combine and mix tweets for better user experience
      const allTweets = [
        ...followedTweets.map((tweet: any) => ({
          ...tweet,
          sourceType: "followed",
        })),
        ...famousTweets.map((tweet: any) => ({
          ...tweet,
          sourceType: "famous",
        })),
        ...ownTweets.map((tweet: any) => ({ ...tweet, sourceType: "own" })),
      ];

      // Sort by creation time but maintain content diversity
      const sortedTweets = allTweets.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();

        // If tweets are within 30 minutes of each other, prioritize content diversity
        if (Math.abs(timeA - timeB) < 30 * 60 * 1000) {
          const priorityOrder = { own: 3, followed: 2, famous: 1 };
          return (
            priorityOrder[b.sourceType as keyof typeof priorityOrder] -
            priorityOrder[a.sourceType as keyof typeof priorityOrder]
          );
        }

        return timeB - timeA; // Most recent first
      });

      // Apply pagination
      const startIndex = options.skip || 0;
      const endIndex = startIndex + (options.limit || 20);
      const paginatedTweets = sortedTweets.slice(startIndex, endIndex);

      // Remove the sourceType field from final result
      return paginatedTweets.map((tweet) => {
        const { sourceType, ...cleanTweet } = tweet;
        return cleanTweet;
      });
    } catch (error: any) {
      throw new AppError("Failed to get home timeline", 500);
    }
  }

  /**
   * Count home timeline tweets
   */
  async countHomeTimelineTweets(userId: MongooseObjectId): Promise<number> {
    try {
      // First, get the list of users that this user follows
      const followedUsers = await Follow.find({ follower: userId }).select(
        "following"
      );
      const followingIds = followedUsers.map((follow: any) => follow.following);

      // Get famous users (users with most followers)
      const famousUsersAgg = await Follow.aggregate([
        {
          $group: {
            _id: "$following",
            followerCount: { $sum: 1 },
          },
        },
        {
          $match: {
            followerCount: { $gte: 10 }, // Users with 10+ followers
          },
        },
        {
          $sort: { followerCount: -1 },
        },
        {
          $limit: 20, // Top 20 most followed users
        },
        {
          $project: {
            _id: 1,
          },
        },
      ]);

      const famousUserIds = famousUsersAgg.map((user: any) => user._id);

      // Combine followed users, famous users, and user's own tweets
      const authorIds = [
        ...new Set([...followingIds, ...famousUserIds, userId]),
      ];

      const pipeline = [
        {
          $match: {
            author: { $in: authorIds },
          },
        },
        {
          $count: "total",
        },
      ];

      const result = await this.aggregate(pipeline);
      return result[0]?.total || 0;
    } catch (error: any) {
      throw new AppError("Failed to count home timeline tweets", 500);
    }
  }

  /**
   * Count tweets by author
   */
  async countByAuthor(authorId: MongooseObjectId): Promise<number> {
    try {
      return await this.countDocuments({ author: authorId });
    } catch (error: any) {
      throw new AppError("Failed to count tweets by author", 500);
    }
  }

  /**
   * Find tweets mentioning a specific user
   */
  async findTweetsByMentions(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      const filter = { mentions: userId };
      return await this.find(filter, {
        populate: "author",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find tweets by mentions", 500);
    }
  }

  /**
   * Count tweets mentioning a specific user
   */
  async countTweetsByMentions(userId: MongooseObjectId): Promise<number> {
    try {
      return await this.countDocuments({ mentions: userId });
    } catch (error: any) {
      throw new AppError("Failed to count tweets by mentions", 500);
    }
  }

  /**
   * Count all tweets
   */
  async countAll(): Promise<number> {
    try {
      return await this.countDocuments({});
    } catch (error: any) {
      throw new AppError("Failed to count all tweets", 500);
    }
  }

  /**
   * Find trending tweets
   */
  async findTrendingTweets(
    limit: number,
    skip: number = 0
  ): Promise<ITweetDocument[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24); // Last 24 hours

      const pipeline = [
        {
          $match: {
            createdAt: { $gte: cutoffDate },
          },
        },
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "tweet",
            as: "likes",
          },
        },
        {
          $lookup: {
            from: "retweets",
            localField: "_id",
            foreignField: "tweet",
            as: "retweets",
          },
        },
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $size: "$likes" },
                { $multiply: [{ $size: "$retweets" }, 2] },
              ],
            },
          },
        },
        {
          $sort: { engagementScore: -1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $unwind: "$author",
        },
      ];

      return await this.aggregate(pipeline);
    } catch (error: any) {
      throw new AppError("Failed to find trending tweets", 500);
    }
  }

  /**
   * Find liked tweets by user
   */
  async findLikedTweets(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "tweet",
            as: "likes",
          },
        },
        {
          $match: {
            "likes.user": userId,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $unwind: "$author",
        },
        {
          $sort: { createdAt: -1 },
        },
      ];

      if (options.skip) {
        pipeline.push({ $skip: options.skip } as any);
      }

      if (options.limit) {
        pipeline.push({ $limit: options.limit } as any);
      }

      return await this.aggregate(pipeline);
    } catch (error: any) {
      throw new AppError("Failed to find liked tweets", 500);
    }
  }

  /**
   * Count liked tweets by user
   */
  async countLikedTweets(userId: MongooseObjectId): Promise<number> {
    try {
      const pipeline = [
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "tweet",
            as: "likes",
          },
        },
        {
          $match: {
            "likes.user": userId,
          },
        },
        {
          $count: "total",
        },
      ];

      const result = await this.aggregate(pipeline);
      return result[0]?.total || 0;
    } catch (error: any) {
      throw new AppError("Failed to count liked tweets", 500);
    }
  }

  /**
   * Find replies to a tweet
   */
  async findReplies(
    tweetId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      const filter = { parentTweetId: tweetId };
      return await this.find(filter, {
        populate: "author",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find replies", 500);
    }
  }

  /**
   * Count replies to a tweet
   */
  async countReplies(tweetId: MongooseObjectId): Promise<number> {
    try {
      return await this.countDocuments({ parentTweetId: tweetId });
    } catch (error: any) {
      throw new AppError("Failed to count replies", 500);
    }
  }

  /**
   * Find thread for a tweet
   */
  async findThread(
    tweetId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      // Get the original tweet first
      const originalTweet = await this.findById(tweetId);
      if (!originalTweet) {
        throw new NotFoundError("Tweet not found");
      }

      // Find all tweets in the thread (same thread ID or parent tweet ID)
      const filter = {
        $or: [
          { _id: tweetId },
          { parentTweetId: tweetId },
          { threadId: originalTweet.threadId || tweetId },
        ],
      };

      return await this.find(filter, {
        populate: "author",
        sort: { createdAt: 1 }, // Chronological order for threads
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find thread", 500);
    }
  }

  /**
   * Find tweets by hashtag
   */
  async findByHashtag(
    hashtag: string,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      const filter = { hashtags: hashtag };
      return await this.find(filter, {
        populate: "author",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find tweets by hashtag", 500);
    }
  }

  /**
   * Count tweets by hashtag
   */
  async countByHashtag(hashtag: string): Promise<number> {
    try {
      return await this.countDocuments({ hashtags: hashtag });
    } catch (error: any) {
      throw new AppError("Failed to count tweets by hashtag", 500);
    }
  }

  /**
   * Add like to tweet atomically (increment counter)
   */
  async addLikeToTweet(
    tweetId: MongooseObjectId,
    userId: MongooseObjectId
  ): Promise<ITweetDocument | null> {
    try {
      const result = await this.model
        .findByIdAndUpdate(
          tweetId,
          {
            $inc: { likesCount: 1 },
          },
          {
            new: true,
            runValidators: true,
          }
        )
        .populate("author");

      return result;
    } catch (error: any) {
      console.error("Error adding like to tweet:", error);
      throw new AppError("Failed to add like to tweet", 500);
    }
  }

  /**
   * Remove like from tweet atomically (decrement counter)
   */
  async removeLikeFromTweet(
    tweetId: MongooseObjectId,
    userId: MongooseObjectId
  ): Promise<ITweetDocument | null> {
    try {
      const result = await this.model
        .findOneAndUpdate(
          {
            _id: tweetId,
            likesCount: { $gt: 0 }, // Only decrement if count > 0
          },
          {
            $inc: { likesCount: -1 },
          },
          {
            new: true,
            runValidators: true,
          }
        )
        .populate("author");

      return result;
    } catch (error: any) {
      console.error("Error removing like from tweet:", error);
      throw new AppError("Failed to remove like from tweet", 500);
    }
  }

  /**
   * Add retweet to tweet atomically (increment counter)
   */
  async addRetweetToTweet(
    tweetId: MongooseObjectId,
    userId: MongooseObjectId
  ): Promise<ITweetDocument | null> {
    try {
      const result = await this.model
        .findByIdAndUpdate(
          tweetId,
          {
            $inc: { retweetsCount: 1 },
          },
          {
            new: true,
            runValidators: true,
          }
        )
        .populate("author");

      return result;
    } catch (error: any) {
      console.error("Error adding retweet to tweet:", error);
      throw new AppError("Failed to add retweet to tweet", 500);
    }
  }

  /**
   * Remove retweet from tweet atomically (decrement counter)
   */
  async removeRetweetFromTweet(
    tweetId: MongooseObjectId,
    userId: MongooseObjectId
  ): Promise<ITweetDocument | null> {
    try {
      const result = await this.model
        .findOneAndUpdate(
          {
            _id: tweetId,
            retweetsCount: { $gt: 0 }, // Only decrement if count > 0
          },
          {
            $inc: { retweetsCount: -1 },
          },
          {
            new: true,
            runValidators: true,
          }
        )
        .populate("author");

      return result;
    } catch (error: any) {
      console.error("Error removing retweet from tweet:", error);
      throw new AppError("Failed to remove retweet from tweet", 500);
    }
  }

  /**
   * Check if user has liked a tweet (using Like collection)
   */
  async hasUserLikedTweet(
    tweetId: MongooseObjectId,
    userId: MongooseObjectId
  ): Promise<boolean> {
    try {
      const { default: Like } = await import("../../models/like");
      const like = await Like.findOne({
        tweet: tweetId,
        user: userId,
      });
      return like !== null;
    } catch (error: any) {
      console.error("Error checking if user has liked tweet:", error);
      throw new AppError("Failed to check if user has liked tweet", 500);
    }
  }

  /**
   * Check if user has retweeted a tweet (using Retweet collection)
   */
  async hasUserRetweetedTweet(
    tweetId: MongooseObjectId,
    userId: MongooseObjectId
  ): Promise<boolean> {
    try {
      const { default: Retweet } = await import("../../models/retweet");
      const retweet = await Retweet.findOne({
        tweet: tweetId,
        user: userId,
      });
      return retweet !== null;
    } catch (error: any) {
      console.error("Error checking if user has retweeted tweet:", error);
      throw new AppError("Failed to check if user has retweeted tweet", 500);
    }
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { TweetRepository };
