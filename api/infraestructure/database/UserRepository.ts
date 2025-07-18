/**
 * User Repository Implementation in TypeScript
 * Specific repository for User domain operations
 */

import { BaseRepository } from "./BaseRepository";
import { User } from "../../models";
import { IUserRepository, BaseQueryOptions } from "../../types/repositories";
import { MongooseObjectId, IUserDocument } from "../../types/models";
import { AppError, NotFoundError } from "../../utils/errors";

export class UserRepository
  extends BaseRepository<IUserDocument>
  implements IUserRepository<IUserDocument>
{
  constructor() {
    super(User);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<IUserDocument | null> {
    try {
      return await this.findOne({ email: email.toLowerCase() });
    } catch (error: any) {
      throw new AppError("Failed to find user by email", 500);
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<IUserDocument | null> {
    try {
      return await this.findOne({ username: username });
    } catch (error: any) {
      throw new AppError("Failed to find user by username", 500);
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
   * Check email availability
   */
  async checkEmailAvailability(email: string): Promise<boolean> {
    try {
      const filter = { email: email.toLowerCase() };
      return !(await this.exists(filter));
    } catch (error: any) {
      throw new AppError("Failed to check email availability", 500);
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
   * Get user statistics
   */
  async getUserStats(userId?: MongooseObjectId): Promise<any> {
    try {
      if (userId) {
        // Individual user stats
        const user = await this.findById(userId);
        if (!user) {
          throw new NotFoundError("User not found");
        }

        // Could include follower count, tweet count, etc.
        return {
          userId,
          email: user.email,
          confirmed: user.confirmed,
          createdAt: user.createdAt,
        };
      }

      // General user statistics
      const pipeline = [
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            confirmedUsers: {
              $sum: { $cond: [{ $eq: ["$confirmed", true] }, 1, 0] },
            },
            unconfirmedUsers: {
              $sum: { $cond: [{ $eq: ["$confirmed", false] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalUsers: 1,
            confirmedUsers: 1,
            unconfirmedUsers: 1,
            confirmationRate: {
              $multiply: [{ $divide: ["$confirmedUsers", "$totalUsers"] }, 100],
            },
          },
        },
      ];

      const result = await this.aggregate(pipeline);
      return (
        result[0] || {
          totalUsers: 0,
          confirmedUsers: 0,
          unconfirmedUsers: 0,
          confirmationRate: 0,
        }
      );
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
        $or: [
          { username: regex },
          { firstName: regex },
          { lastName: regex },
          { email: regex },
        ],
      };

      return await this.find(filter, {
        select: "username firstName lastName email bio profileImage",
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
        lastAccess: new Date(),
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
        confirmedAt: new Date(),
      });
    } catch (error: any) {
      throw new AppError("Failed to confirm user", 500);
    }
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(
    email: string,
    token: string,
    expiresAt: Date
  ): Promise<IUserDocument | null> {
    try {
      return await this.updateOne(
        { email: email.toLowerCase() },
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
      const user = await this.findById(userId, {
        select: "firstName lastName",
      });
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
        select: "firstName lastName email profileImage",
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
   * Check if email is unique (excluding a specific user)
   */
  async isEmailUnique(
    email: string,
    excludeUserId?: MongooseObjectId
  ): Promise<boolean> {
    try {
      const filter: any = { email: email.toLowerCase() };
      if (excludeUserId) {
        filter._id = { $ne: excludeUserId };
      }

      return !(await this.exists(filter));
    } catch (error: any) {
      throw new AppError("Failed to check email uniqueness", 500);
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
