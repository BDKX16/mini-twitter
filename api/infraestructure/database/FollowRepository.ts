/**
 * Follow Repository Implementation in TypeScript
 * Specific repository for Follow domain operations with Redis caching
 */

import { BaseRepository } from "./BaseRepository";
import { Follow } from "../../models";
import { IFollowRepository, BaseQueryOptions } from "../../types/repositories";
import { MongooseObjectId, IFollowDocument } from "../../types/models";
import { AppError, NotFoundError } from "../../utils/errors";
import redisManager, { redisConfig, cachePatterns } from "../../config/redis";

export class FollowRepository
  extends BaseRepository<IFollowDocument>
  implements IFollowRepository<IFollowDocument>
{
  constructor() {
    super(Follow);
  }

  /**
   * Create follow relationship with cache invalidation (Write-through pattern)
   */
  async create(data: Partial<IFollowDocument>): Promise<IFollowDocument> {
    try {
      // 1. Create in database
      const follow = await super.create(data);

      // 2. Invalidate related caches immediately
      const followerId = data.follower!.toString();
      const followingId = data.following!.toString();

      await Promise.all([
        // Invalidate follow relationship cache
        redisManager.del(
          cachePatterns.FOLLOW_RELATIONSHIP(followerId, followingId)
        ),
        // Invalidate followers and following lists
        redisManager.del([
          cachePatterns.FOLLOWERS(followingId),
          cachePatterns.FOLLOWING(followerId),
        ]),
        // Invalidate follow stats for both users
        redisManager.del([
          cachePatterns.FOLLOW_STATS(followerId),
          cachePatterns.FOLLOW_STATS(followingId),
        ]),
        // Invalidate timelines (new follow affects timeline)
        redisManager.del(cachePatterns.TIMELINE(followerId)),
      ]);

      return follow;
    } catch (error: any) {
      console.error("Error in FollowRepository.create:", error);
      return await super.create(data);
    }
  }

  /**
   * Delete follow relationship with cache invalidation
   */
  async deleteById(id: MongooseObjectId): Promise<boolean> {
    try {
      // Get follow relationship first for cache invalidation
      const follow = await super.findById(id);

      // Delete from database
      const deleted = await super.deleteById(id);

      if (deleted && follow) {
        const followerId = follow.follower.toString();
        const followingId = follow.following.toString();

        // Invalidate all related caches
        await Promise.all([
          redisManager.del(
            cachePatterns.FOLLOW_RELATIONSHIP(followerId, followingId)
          ),
          redisManager.del([
            cachePatterns.FOLLOWERS(followingId),
            cachePatterns.FOLLOWING(followerId),
            cachePatterns.FOLLOW_STATS(followerId),
            cachePatterns.FOLLOW_STATS(followingId),
          ]),
          redisManager.del(cachePatterns.TIMELINE(followerId)),
        ]);
      }

      return deleted;
    } catch (error: any) {
      console.error("Error in FollowRepository.deleteById:", error);
      return await super.deleteById(id);
    }
  }

  /**
   * Find followers of a user with Redis caching
   */
  async findFollowers(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<IFollowDocument[]> {
    try {
      const cacheKey = `${cachePatterns.FOLLOWERS(
        userId.toString()
      )}:${JSON.stringify(options)}`;

      // Try to get from cache first
      const cached = await redisManager.get<IFollowDocument[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const filter = { following: userId };
      const followers = await this.find(filter, {
        populate: "follower",
        sort: { createdAt: -1 },
        ...options,
      });

      // Cache the result
      await redisManager.set(cacheKey, followers, redisConfig.FOLLOW_CACHE_TTL);

      return followers;
    } catch (error: any) {
      console.error("Error in FollowRepository.findFollowers:", error);
      // Fallback to database
      const filter = { following: userId };
      return await this.find(filter, {
        populate: "follower",
        sort: { createdAt: -1 },
        ...options,
      });
    }
  }

  /**
   * Find users that a user is following with Redis caching
   */
  async findFollowing(
    userId: MongooseObjectId,
    options: BaseQueryOptions = {}
  ): Promise<IFollowDocument[]> {
    try {
      const cacheKey = `${cachePatterns.FOLLOWING(
        userId.toString()
      )}:${JSON.stringify(options)}`;

      // Try to get from cache first
      const cached = await redisManager.get<IFollowDocument[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from database
      const filter = { follower: userId };
      const following = await this.find(filter, {
        populate: "following",
        sort: { createdAt: -1 },
        ...options,
      });

      // Cache the result
      await redisManager.set(cacheKey, following, redisConfig.FOLLOW_CACHE_TTL);

      return following;
    } catch (error: any) {
      console.error("Error in FollowRepository.findFollowing:", error);
      // Fallback to database
      const filter = { follower: userId };
      return await this.find(filter, {
        populate: "following",
        sort: { createdAt: -1 },
        ...options,
      });
    }
  }

  /**
   * Find follow relationship between two users with Redis caching
   */
  async findByFollowerAndFollowing(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<IFollowDocument | null> {
    try {
      const cacheKey = cachePatterns.FOLLOW_RELATIONSHIP(
        followerId.toString(),
        followingId.toString()
      );

      // Try to get from cache first
      const cached = await redisManager.get<IFollowDocument | null>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      // Get from database
      const filter = { follower: followerId, following: followingId };
      const follow = await this.findOne(filter);

      // Cache the result
      await redisManager.set(cacheKey, follow, redisConfig.FOLLOW_CACHE_TTL);

      return follow;
    } catch (error: any) {
      console.error(
        "Error in FollowRepository.findByFollowerAndFollowing:",
        error
      );
      // Fallback to database
      const filter = { follower: followerId, following: followingId };
      return await this.findOne(filter);
    }
  }

  /**
   * Count followers of a user with Redis caching
   */
  async countFollowers(userId: MongooseObjectId): Promise<number> {
    try {
      const cacheKey = `${cachePatterns.FOLLOW_STATS(
        userId.toString()
      )}:followers`;

      // Try to get from cache first
      const cached = await redisManager.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Get from database
      const filter = { following: userId };
      const count = await this.count(filter);

      // Cache the result
      await redisManager.set(cacheKey, count, redisConfig.FOLLOW_CACHE_TTL);

      return count;
    } catch (error: any) {
      console.error("Error in FollowRepository.countFollowers:", error);
      // Fallback to database
      const filter = { following: userId };
      return await this.count(filter);
    }
  }

  /**
   * Count users that a user is following with Redis caching
   */
  async countFollowing(userId: MongooseObjectId): Promise<number> {
    try {
      const cacheKey = `${cachePatterns.FOLLOW_STATS(
        userId.toString()
      )}:following`;

      // Try to get from cache first
      const cached = await redisManager.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Get from database
      const filter = { follower: userId };
      const count = await this.count(filter);

      // Cache the result
      await redisManager.set(cacheKey, count, redisConfig.FOLLOW_CACHE_TTL);

      return count;
    } catch (error: any) {
      console.error("Error in FollowRepository.countFollowing:", error);
      // Fallback to database
      const filter = { follower: userId };
      return await this.count(filter);
    }
  }

  /**
   * Check if a user is following another user with Redis caching
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
      return !!follow;
    } catch (error: any) {
      console.error("Error in FollowRepository.isFollowing:", error);
      // Direct fallback to database query
      const filter = { follower: followerId, following: followingId };
      const follow = await this.findOne(filter);
      return !!follow;
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
