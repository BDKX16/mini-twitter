/**
 * User Repository Implementation in TypeScript
 * Specific repository for User domain operations with Redis caching
 */

import { BaseRepository } from "./BaseRepository";
import { User } from "../../models";
import { IUserRepository, BaseQueryOptions } from "../../types/repositories";
import { MongooseObjectId, IUserDocument } from "../../types/models";
import { AppError, NotFoundError } from "../../utils/errors";
import redisManager, { redisConfig, cachePatterns } from "../../config/redis";

export class UserRepository
  extends BaseRepository<IUserDocument>
  implements IUserRepository<IUserDocument>
{
  constructor() {
    super(User);
  }

  /**
   * Find user by ID with Redis caching (Cache-Aside pattern)
   */
  async findById(id: MongooseObjectId): Promise<IUserDocument | null> {
    try {
      const cacheKey = cachePatterns.USER(id.toString());

      // 1. Try to get from Redis cache first
      const cached = await redisManager.get<IUserDocument>(cacheKey);
      if (cached) {
        return cached;
      }

      // 2. If not in cache, get from database
      const user = await super.findById(id);

      // 3. Cache the result if found
      if (user) {
        await redisManager.set(cacheKey, user, redisConfig.USER_CACHE_TTL);
      }

      return user;
    } catch (error: any) {
      console.error("Error in UserRepository.findById:", error);
      // Fallback to database if Redis fails
      return await super.findById(id);
    }
  }

  /**
   * Find user by username with Redis caching (Cache-Aside pattern)
   */
  async findByUsername(username: string): Promise<IUserDocument | null> {
    try {
      const cacheKey = cachePatterns.USER_USERNAME(username);

      // 1. Try to get from Redis cache first
      const cached = await redisManager.get<IUserDocument>(cacheKey);
      if (cached) {
        return cached;
      }

      // 2. If not in cache, get from database
      const user = await this.findOne({ username: username });

      // 3. Cache the result if found
      if (user) {
        await redisManager.set(cacheKey, user, redisConfig.USER_CACHE_TTL);
        // Also cache by ID for consistency
        await redisManager.set(
          cachePatterns.USER(user._id!.toString()),
          user,
          redisConfig.USER_CACHE_TTL
        );
      }

      return user;
    } catch (error: any) {
      console.error("Error in UserRepository.findByUsername:", error);
      // Fallback to database if Redis fails
      return await this.findOne({ username: username });
    }
  }

  /**
   * Update user with cache invalidation (Write-through pattern)
   */
  async updateById(
    id: MongooseObjectId,
    data: Partial<IUserDocument>
  ): Promise<IUserDocument | null> {
    try {
      // 1. Update in database first
      const updatedUser = await super.updateById(id, data);

      if (updatedUser) {
        // 2. Update cache immediately (Write-through)
        const userCacheKey = cachePatterns.USER(id.toString());
        const usernameCacheKey = cachePatterns.USER_USERNAME(
          updatedUser.username
        );

        await Promise.all([
          redisManager.set(
            userCacheKey,
            updatedUser,
            redisConfig.USER_CACHE_TTL
          ),
          redisManager.set(
            usernameCacheKey,
            updatedUser,
            redisConfig.USER_CACHE_TTL
          ),
          // Invalidate related caches
          redisManager.del([
            cachePatterns.USER_STATS(id.toString()),
            cachePatterns.USER_SUGGESTIONS("*"), // Invalidate all user suggestions
          ]),
        ]);
      }

      return updatedUser;
    } catch (error: any) {
      console.error("Error in UserRepository.updateById:", error);
      // Fallback to database operation
      return await super.updateById(id, data);
    }
  }

  /**
   * Delete user with cache invalidation
   */
  async deleteById(id: MongooseObjectId): Promise<boolean> {
    try {
      // Get user first to get username for cache invalidation
      const user = await this.findById(id);

      // Delete from database
      const deleted = await super.deleteById(id);

      if (deleted && user) {
        // Invalidate all related caches
        await Promise.all([
          redisManager.del([
            cachePatterns.USER(id.toString()),
            cachePatterns.USER_USERNAME(user.username),
            cachePatterns.USER_STATS(id.toString()),
          ]),
          redisManager.deleteByPattern(
            `${cachePatterns.USER_SUGGESTIONS("*")}`
          ),
          redisManager.deleteByPattern(`${cachePatterns.TIMELINE("*")}`), // User deletion affects timelines
        ]);
      }

      return deleted;
    } catch (error: any) {
      console.error("Error in UserRepository.deleteById:", error);
      return await super.deleteById(id);
    }
  }

  /**
   * Find confirmed users
   */
  async findConfirmedUsers(
    options: BaseQueryOptions = {}
  ): Promise<IUserDocument[]> {
    try {
      const filter = { confirmed: true };
      return await this.find(filter, options);
    } catch (error: any) {
      throw new AppError("Failed to find confirmed users", 500);
    }
  }

  /**
   * Find recent users
   */
  async findRecentUsers(
    days: number = 7,
    options: BaseQueryOptions = {}
  ): Promise<IUserDocument[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const filter = {
        createdAt: { $gte: cutoffDate },
      };

      return await this.find(filter, {
        sort: { createdAt: -1 },
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to find recent users", 500);
    }
  }

  /**
   * Check username availability
   */
  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const filter = { username: username };
      return !(await this.exists(filter));
    } catch (error: any) {
      throw new AppError("Failed to check username availability", 500);
    }
  }

  /**
   * Get user statistics with Redis caching
   */
  async getUserStats(userId?: MongooseObjectId): Promise<any> {
    try {
      if (userId) {
        const cacheKey = cachePatterns.USER_STATS(userId.toString());

        // Try to get from cache first
        const cached = await redisManager.get(cacheKey);
        if (cached) {
          return cached;
        }

        // Get from database
        const user = await this.findById(userId);
        if (!user) {
          throw new NotFoundError("User not found");
        }

        const stats = {
          userId,
          username: user.username,
          confirmed: user.confirmed,
          createdAt: user.createdAt,
        };

        // Cache the stats
        await redisManager.set(cacheKey, stats, redisConfig.USER_CACHE_TTL);
        return stats;
      }
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new AppError("Failed to get user stats", 500);
    }
  }

  /**
   * Search users by name or username
   */
  async searchUsers(
    searchTerm: string,
    options: BaseQueryOptions = {}
  ): Promise<IUserDocument[]> {
    try {
      const regex = new RegExp(searchTerm, "i");
      const filter = {
        $or: [{ username: regex }, { firstName: regex }, { lastName: regex }],
      };

      return await this.find(filter, {
        select: "username firstName lastName bio profileImage",
        limit: 20,
        ...options,
      });
    } catch (error: any) {
      throw new AppError("Failed to search users", 500);
    }
  }

  /**
   * Update last access time
   */
  async updateLastAccess(
    userId: MongooseObjectId
  ): Promise<IUserDocument | null> {
    try {
      return await this.updateById(userId, {
        // lastAccess: new Date(), // Campo no existe en el modelo
      });
    } catch (error: any) {
      throw new AppError("Failed to update last access", 500);
    }
  }

  /**
   * Confirm user account
   */
  async confirmUser(userId: MongooseObjectId): Promise<IUserDocument | null> {
    try {
      return await this.updateById(userId, {
        confirmed: true,
        // confirmedAt: new Date(), // Campo no existe en el modelo
      });
    } catch (error: any) {
      throw new AppError("Failed to confirm user", 500);
    }
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(
    username: string,
    token: string,
    expiresAt: Date
  ): Promise<IUserDocument | null> {
    try {
      return await this.updateOne(
        { username: username },
        {
          resetPasswordToken: token,
          resetPasswordExpires: expiresAt,
        }
      );
    } catch (error: any) {
      throw new AppError("Failed to set password reset token", 500);
    }
  }

  /**
   * Clear password reset token
   */
  async clearPasswordResetToken(
    userId: MongooseObjectId
  ): Promise<IUserDocument | null> {
    try {
      return await this.updateById(userId, {
        $unset: {
          resetPasswordToken: 1,
          resetPasswordExpires: 1,
        },
      } as any);
    } catch (error: any) {
      throw new AppError("Failed to clear password reset token", 500);
    }
  }

  /**
   * Find user by reset token
   */
  async findByResetToken(token: string): Promise<IUserDocument | null> {
    try {
      return await this.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });
    } catch (error: any) {
      throw new AppError("Failed to find user by reset token", 500);
    }
  }

  /**
   * Get user registrations by month
   */
  async getUserRegistrationsByMonth(
    year: number = new Date().getFullYear()
  ): Promise<any[]> {
    try {
      const pipeline = [
        {
          $match: {
            createdAt: {
              $gte: new Date(year, 0, 1),
              $lt: new Date(year + 1, 0, 1),
            },
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
        {
          $project: {
            month: "$_id",
            count: 1,
            _id: 0,
          },
        },
      ];

      return await this.aggregate(pipeline);
    } catch (error: any) {
      throw new AppError("Failed to get user registrations by month", 500);
    }
  }

  /**
   * Find similar users by location
   */
  async findSimilarUsersByLocation(
    userId: MongooseObjectId,
    limit: number = 10
  ): Promise<IUserDocument[]> {
    try {
      const user = await this.findById(userId);
      if (!user || !user.firstName) {
        return [];
      }

      // Use firstName and lastName for location-based suggestions
      const searchTerms = [new RegExp(user.firstName, "i")];
      if (user.lastName) {
        searchTerms.push(new RegExp(user.lastName, "i"));
      }

      const filter = {
        _id: { $ne: userId },
        $or: [
          { firstName: { $in: searchTerms } },
          ...(user.lastName ? [{ lastName: { $in: searchTerms } }] : []),
        ],
      };

      return await this.find(filter, {
        select: "firstName lastName username profileImage",
        limit,
      });
    } catch (error: any) {
      throw new AppError("Failed to find similar users by location", 500);
    }
  }

  /**
   * Cleanup unconfirmed users
   */
  async cleanupUnconfirmedUsers(
    daysOld: number = 30
  ): Promise<{ deletedCount: number; cutoffDate: Date }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await this.deleteMany({
        confirmed: false,
        createdAt: { $lt: cutoffDate },
      });

      return {
        deletedCount,
        cutoffDate,
      };
    } catch (error: any) {
      throw new AppError("Failed to cleanup unconfirmed users", 500);
    }
  }

  /**
   * Check if username is unique (excluding a specific user)
   */
  async isUsernameUnique(
    username: string,
    excludeUserId?: MongooseObjectId
  ): Promise<boolean> {
    try {
      const filter: any = { username: username };
      if (excludeUserId) {
        filter._id = { $ne: excludeUserId };
      }

      return !(await this.exists(filter));
    } catch (error: any) {
      throw new AppError("Failed to check username uniqueness", 500);
    }
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { UserRepository };
