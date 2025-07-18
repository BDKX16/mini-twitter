/**
 * Follow Repository Implementation in TypeScript
 * Specific repository for Follow domain operations
 */

import { BaseRepository } from "./BaseRepository";
import { Follow } from "../../models";
import { IFollowRepository, BaseQueryOptions } from "../../types/repositories";
import { MongooseObjectId, IFollowDocument } from "../../types/models";
import { AppError, NotFoundError } from "../../utils/errors";

export class FollowRepository
  extends BaseRepository<IFollowDocument>
  implements IFollowRepository<IFollowDocument>
{
  constructor() {
    super(Follow);
  }

  /**
   * Find followers of a user
   */
  async findFollowers(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<IFollowDocument[]> {
    try {
      const filter = { following: userId };
      return await this.find(filter, {
        populate: "follower",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find followers", 500);
    }
  }

  /**
   * Find users that a user is following
   */
  async findFollowing(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<IFollowDocument[]> {
    try {
      const filter = { follower: userId };
      return await this.find(filter, {
        populate: "following",
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find following", 500);
    }
  }

  /**
   * Find follow relationship between two users
   */
  async findByFollowerAndFollowing(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<IFollowDocument | null> {
    try {
      const filter = { follower: followerId, following: followingId };
      return await this.findOne(filter);
    } catch (error: any) {
      throw new AppError("Failed to find follow relationship", 500);
    }
  }

  /**
   * Count followers of a user
   */
  async countFollowers(userId: MongooseObjectId): Promise<number> {
    try {
      const filter = { following: userId };
      return await this.count(filter);
    } catch (error: any) {
      throw new AppError("Failed to count followers", 500);
    }
  }

  /**
   * Count users that a user is following
   */
  async countFollowing(userId: MongooseObjectId): Promise<number> {
    try {
      const filter = { follower: userId };
      return await this.count(filter);
    } catch (error: any) {
      throw new AppError("Failed to count following", 500);
    }
  }

  /**
   * Check if a user is following another user
   */
  async isFollowing(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<boolean> {
    try {
      const follow = await this.findByFollowerAndFollowing(
        followerId,
        followingId
      );
      return follow !== null;
    } catch (error: any) {
      throw new AppError("Failed to check if following", 500);
    }
  }

  /**
   * Toggle follow/unfollow
   */
  async toggleFollow(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<{ action: string; follow: IFollowDocument | null }> {
    try {
      const existingFollow = await this.findByFollowerAndFollowing(
        followerId,
        followingId
      );

      if (existingFollow) {
        // Unfollow
        await this.deleteById(existingFollow._id!);
        return { action: "unfollowed", follow: null };
      } else {
        // Follow
        const follow = await this.create({
          follower: followerId,
          following: followingId,
          createdAt: new Date(),
        } as Partial<IFollowDocument>);
        return { action: "followed", follow };
      }
    } catch (error: any) {
      throw new AppError("Failed to toggle follow", 500);
    }
  }

  /**
   * Get mutual followers between two users
   */
  async getMutualFollowers(
    userId1: MongooseObjectId,
    userId2: MongooseObjectId
  ): Promise<any[]> {
    try {
      const pipeline = [
        // Get followers of user1
        {
          $match: { following: userId1 },
        },
        {
          $lookup: {
            from: "follows",
            let: { followerId: "$follower" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$follower", "$$followerId"] },
                      { $eq: ["$following", userId2] },
                    ],
                  },
                },
              },
            ],
            as: "alsofollowsuser2",
          },
        },
        {
          $match: { alsofollowsuser2: { $ne: [] } },
        },
        {
          $lookup: {
            from: "users",
            localField: "follower",
            foreignField: "_id",
            as: "followerData",
          },
        },
        {
          $unwind: "$followerData",
        },
        {
          $project: {
            _id: 0,
            user: "$followerData",
          },
        },
      ];

      return await this.aggregate(pipeline);
    } catch (error: any) {
      throw new AppError("Failed to get mutual followers", 500);
    }
  }

  /**
   * Get follow suggestions for a user
   */
  async getFollowSuggestions(
    userId: MongooseObjectId,
    limit: number
  ): Promise<any[]> {
    try {
      const pipeline = [
        // Get users that people I follow also follow
        {
          $match: { follower: userId },
        },
        {
          $lookup: {
            from: "follows",
            localField: "following",
            foreignField: "follower",
            as: "theirFollowing",
          },
        },
        {
          $unwind: "$theirFollowing",
        },
        // Exclude users I already follow
        {
          $lookup: {
            from: "follows",
            let: { suggestedUserId: "$theirFollowing.following" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$follower", userId] },
                      { $eq: ["$following", "$$suggestedUserId"] },
                    ],
                  },
                },
              },
            ],
            as: "alreadyFollowing",
          },
        },
        {
          $match: {
            alreadyFollowing: { $eq: [] },
            "theirFollowing.following": { $ne: userId }, // Don't suggest self
          },
        },
        {
          $group: {
            _id: "$theirFollowing.following",
            mutualFollowers: { $sum: 1 },
          },
        },
        {
          $sort: { mutualFollowers: -1 },
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            user: 1,
            mutualFollowers: 1,
            reason: { $literal: "Followed by people you follow" },
          },
        },
      ];

      return await this.aggregate(pipeline);
    } catch (error: any) {
      throw new AppError("Failed to get follow suggestions", 500);
    }
  }

  /**
   * Bulk follow multiple users
   */
  async bulkFollow(
    followerId: MongooseObjectId,
    followingIds: MongooseObjectId[]
  ): Promise<IFollowDocument[]> {
    try {
      const followData = followingIds.map((followingId) => ({
        follower: followerId,
        following: followingId,
        createdAt: new Date(),
      }));

      return await this.createMany(followData as Partial<IFollowDocument>[]);
    } catch (error: any) {
      throw new AppError("Failed to bulk follow users", 500);
    }
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { FollowRepository };
