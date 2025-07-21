/**
 * Tweet Repository Implementation in TypeScript
 * Specific repository for Tweet domain operations
 */

import { BaseRepository } from "./BaseRepository";
import { Tweet, Follow } from "../../models";
import { ITweetRepository, BaseQueryOptions } from "../../types/repositories";
import { MongooseObjectId, ITweetDocument } from "../../types/models";
import { AppError, NotFoundError } from "../../utils/errors";

export class TweetRepository
  extends BaseRepository<ITweetDocument>
  implements ITweetRepository<ITweetDocument>
{
  constructor() {
    super(Tweet);
  }

  /**
   * Find tweets by author
   */
  async findByAuthor(
    authorId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      const filter = { author: authorId };
      return await this.find(filter, {
        populate: "author",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find tweets by author", 500);
    }
  }

  /**
   * Find recent tweets
   */
  async findRecent(
    limit: number,
    options: BaseQueryOptions = {}
  ): Promise<ITweetDocument[]> {
    try {
      return await this.find(
        {},
        {
          populate: "author",
          sort: { createdAt: -1 },
          limit,
          ...options,
        }
      );
    } catch (error: any) {
      throw new AppError("Failed to find recent tweets", 500);
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
      const authorIds = [...new Set([...followingIds, ...famousUserIds, userId])];

      // Now get tweets from these users with weighted distribution
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
          $addFields: {
            // Add priority scoring for better content mixing
            priority: {
              $cond: [
                { $eq: ["$author._id", userId] }, // User's own tweets
                3,
                {
                  $cond: [
                    { $in: ["$author._id", followingIds] }, // Followed users
                    2,
                    1, // Famous users
                  ],
                },
              ],
            },
          },
        },
        {
          $sort: { 
            priority: -1, // Higher priority first
            createdAt: -1, // Then by recency
          },
        },
      ];

      if (options.skip) {
        pipeline.push({ $skip: options.skip } as any);
      }

      if (options.limit) {
        pipeline.push({ $limit: options.limit } as any);
      }

      // Remove the priority field from final result
      pipeline.push({
        $project: {
          priority: 0,
        },
      } as any);

      return await this.aggregate(pipeline);
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

      // Include the user's own tweets as well
      const authorIds = [...followingIds, userId];

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
}

// También exportar para compatibilidad con CommonJS
module.exports = { TweetRepository };
