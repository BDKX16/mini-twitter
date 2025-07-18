/**
 * Retweet Repository Implementation in TypeScript
 * Specific repository for Retweet domain operations
 */

import { BaseRepository } from "./BaseRepository";
import { Retweet } from "../../models";
import { IRetweetRepository, BaseQueryOptions } from "../../types/repositories";
import { MongooseObjectId, IRetweetDocument } from "../../types/models";
import { AppError, NotFoundError } from "../../utils/errors";

export class RetweetRepository
  extends BaseRepository<IRetweetDocument>
  implements IRetweetRepository<IRetweetDocument>
{
  constructor() {
    super(Retweet);
  }

  /**
   * Find retweets by user
   */
  async findByUser(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<IRetweetDocument[]> {
    try {
      const filter = { user: userId };
      return await this.find(filter, {
        populate: "tweet",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find retweets by user", 500);
    }
  }

  /**
   * Find retweets of a tweet
   */
  async findByTweet(
    tweetId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<IRetweetDocument[]> {
    try {
      const filter = { tweet: tweetId };
      return await this.find(filter, {
        populate: "user",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find retweets by tweet", 500);
    }
  }

  /**
   * Find retweet by user and tweet
   */
  async findByUserAndTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<IRetweetDocument | null> {
    try {
      const filter = { user: userId, tweet: tweetId };
      return await this.findOne(filter);
    } catch (error: any) {
      throw new AppError("Failed to find retweet by user and tweet", 500);
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
   * Count retweets of a tweet
   */
  async countByTweet(tweetId: MongooseObjectId): Promise<number> {
    try {
      const filter = { tweet: tweetId };
      return await this.count(filter);
    } catch (error: any) {
      throw new AppError("Failed to count retweets by tweet", 500);
    }
  }

  /**
   * Count retweets by user
   */
  async countByUser(userId: MongooseObjectId): Promise<number> {
    try {
      const filter = { user: userId };
      return await this.count(filter);
    } catch (error: any) {
      throw new AppError("Failed to count retweets by user", 500);
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
   * Get most retweeted tweets
   */
  async getMostRetweetedTweets(limit: number): Promise<any[]> {
    try {
      const pipeline = [
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

      return await this.aggregate(pipeline);
    } catch (error: any) {
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
