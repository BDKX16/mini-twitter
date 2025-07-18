/**
 * Like Repository Implementation in TypeScript
 * Specific repository for Like domain operations
 */

import { BaseRepository } from "./BaseRepository";
import { Like } from "../../models";
import { ILikeRepository, BaseQueryOptions } from "../../types/repositories";
import { MongooseObjectId, ILikeDocument } from "../../types/models";
import { AppError, NotFoundError } from "../../utils/errors";

export class LikeRepository
  extends BaseRepository<ILikeDocument>
  implements ILikeRepository<ILikeDocument>
{
  constructor() {
    super(Like);
  }

  /**
   * Find likes by user
   */
  async findByUser(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ILikeDocument[]> {
    try {
      const filter = { user: userId };
      return await this.find(filter, {
        populate: "tweet",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find likes by user", 500);
    }
  }

  /**
   * Find likes by tweet
   */
  async findByTweet(
    tweetId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<ILikeDocument[]> {
    try {
      const filter = { tweet: tweetId };
      return await this.find(filter, {
        populate: "user",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find likes by tweet", 500);
    }
  }

  /**
   * Find like by user and tweet
   */
  async findByUserAndTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<ILikeDocument | null> {
    try {
      const filter = { user: userId, tweet: tweetId };
      return await this.findOne(filter);
    } catch (error: any) {
      throw new AppError("Failed to find like by user and tweet", 500);
    }
  }

  /**
   * Count likes by tweet
   */
  async countByTweet(tweetId: MongooseObjectId): Promise<number> {
    try {
      const filter = { tweet: tweetId };
      return await this.count(filter);
    } catch (error: any) {
      throw new AppError("Failed to count likes by tweet", 500);
    }
  }

  /**
   * Count likes by user
   */
  async countByUser(userId: MongooseObjectId): Promise<number> {
    try {
      const filter = { user: userId };
      return await this.count(filter);
    } catch (error: any) {
      throw new AppError("Failed to count likes by user", 500);
    }
  }

  /**
   * Toggle like (like/unlike)
   */
  async toggleLike(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId
  ): Promise<{ action: string; like: ILikeDocument | null }> {
    try {
      const existingLike = await this.findByUserAndTweet(userId, tweetId);

      if (existingLike) {
        // Unlike
        await this.deleteById(existingLike._id!);
        return { action: "unliked", like: null };
      } else {
        // Like
        const like = await this.create({
          user: userId,
          tweet: tweetId,
          createdAt: new Date(),
        } as Partial<ILikeDocument>);
        return { action: "liked", like };
      }
    } catch (error: any) {
      throw new AppError("Failed to toggle like", 500);
    }
  }

  /**
   * Get most liked tweets
   */
  async getMostLikedTweets(limit: number): Promise<any[]> {
    try {
      const pipeline = [
        {
          $group: {
            _id: "$tweet",
            likesCount: { $sum: 1 },
            latestLike: { $max: "$createdAt" },
          },
        },
        {
          $sort: { likesCount: -1, latestLike: -1 },
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
            likesCount: 1,
          },
        },
      ];

      return await this.aggregate(pipeline);
    } catch (error: any) {
      throw new AppError("Failed to get most liked tweets", 500);
    }
  }

  /**
   * Get user like statistics
   */
  async getUserLikeStats(userId: MongooseObjectId): Promise<any> {
    try {
      const pipeline = [
        {
          $match: { user: userId },
        },
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
          $group: {
            _id: null,
            totalLikes: { $sum: 1 },
            uniqueTweets: { $addToSet: "$tweet" },
            avgLikesPerDay: {
              $avg: {
                $dayOfYear: "$createdAt",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalLikes: 1,
            uniqueTweetsLiked: { $size: "$uniqueTweets" },
            avgLikesPerDay: { $round: ["$avgLikesPerDay", 2] },
          },
        },
      ];

      const result = await this.aggregate(pipeline);
      return (
        result[0] || {
          totalLikes: 0,
          uniqueTweetsLiked: 0,
          avgLikesPerDay: 0,
        }
      );
    } catch (error: any) {
      throw new AppError("Failed to get user like stats", 500);
    }
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { LikeRepository };
