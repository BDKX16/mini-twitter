/**
 * User Service Implementation in TypeScript
 * Business logic layer for User operations
 */

import { UserRepository } from "../infraestructure/database/UserRepository";
import { FollowRepository } from "../infraestructure/database/FollowRepository";
import { FollowService } from "./FollowService";
import {
  CreateUserData,
  UpdateUserData,
  UserStats,
  UserProfile,
  SanitizedUser,
  ServiceOptions,
  ValidationResult,
  IBaseService,
} from "../types/services";
import { MongooseObjectId, IUserDocument } from "../types/models";
import { ValidationError, NotFoundError, ConflictError } from "../utils/errors";

export class UserService implements IBaseService {
  private userRepository: UserRepository;
  private followRepository: FollowRepository;
  private followService: FollowService;

  constructor() {
    this.userRepository = new UserRepository();
    this.followRepository = new FollowRepository();
    this.followService = new FollowService();
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<SanitizedUser> {
    try {
      console.log("UserService.createUser - userData:", userData);

      // Validate required data
      this.validateUserData(userData);
      console.log("UserService.createUser - validation passed");

      // Check if username already exists
      const existingUser = await this.userRepository.findByUsername(
        userData.username
      );
      if (existingUser) {
        throw new ConflictError("Username already exists");
      }
      console.log("UserService.createUser - username available");

      // Create user
      const createData = {
        ...userData,
        confirmed: false,
        createdAt: new Date(),
      } as Partial<IUserDocument>;

      // Map location to address for database storage
      if (userData.location !== undefined) {
        (createData as any).address = userData.location;
        delete (createData as any).location;
      }

      console.log("UserService.createUser - createData:", createData);

      const user = await this.userRepository.create(createData);
      console.log("UserService.createUser - user created:", user);

      return this.sanitizeUser(user);
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictError("Username already exists");
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: MongooseObjectId): Promise<SanitizedUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return this.sanitizeUser(user);
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<SanitizedUser> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return this.sanitizeUser(user);
  }

  /**
   * Get user by username with follow status
   */
  async getUserByUsernameWithFollowStatus(
    username: string,
    currentUserId?: MongooseObjectId
  ): Promise<
    SanitizedUser & {
      isFollowing?: boolean;
      followersCount: number;
      followingCount: number;
    }
  > {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const sanitizedUser = this.sanitizeUser(user);

    // Get follower and following counts
    const [followersCount, followingCount] = await Promise.all([
      this.followRepository.countFollowers(user._id!),
      this.followRepository.countFollowing(user._id!),
    ]);

    // If current user is provided, check if they follow this user
    if (currentUserId && user._id) {
      const isFollowing = await this.followService.isFollowing(
        currentUserId,
        user._id
      );
      return {
        ...sanitizedUser,
        isFollowing,
        followersCount,
        followingCount,
      };
    }

    return {
      ...sanitizedUser,
      followersCount,
      followingCount,
    };
  }

  /**
   * Update user data
   */
  async updateUser(
    userId: MongooseObjectId,
    updateData: UpdateUserData
  ): Promise<SanitizedUser> {
    // Validate that user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    // Map location to address for database storage
    const mappedUpdateData: any = { ...updateData };
    if (updateData.location !== undefined) {
      mappedUpdateData.address = updateData.location;
      delete mappedUpdateData.location;
    }

    const updatedUser = await this.userRepository.updateById(
      userId,
      mappedUpdateData
    );
    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: MongooseObjectId): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const deleted = await this.userRepository.deleteById(userId);
    if (!deleted) {
      throw new Error("Failed to delete user");
    }

    return { message: "User deleted successfully" };
  }

  /**
   * Search users
   */
  async searchUsers(
    query: string,
    options: ServiceOptions = {}
  ): Promise<SanitizedUser[]> {
    const { limit = 20, skip = 0 } = options;

    const users = await this.userRepository.searchUsers(query, {
      limit,
      skip,
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  /**
   * Get user profile with stats
   */
  async getUserProfile(userId: MongooseObjectId): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get additional user statistics
    const stats = await this.getUserStats(userId);

    return {
      ...this.sanitizeUser(user),
      stats,
    } as UserProfile;
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: MongooseObjectId): Promise<UserStats> {
    const stats = await this.userRepository.getUserStats(userId);

    return {
      followersCount: stats.followersCount || 0,
      followingCount: stats.followingCount || 0,
      tweetsCount: stats.tweetsCount || 0,
      likesGiven: stats.likesGiven || 0,
      likesReceived: stats.likesReceived || 0,
      retweetsCount: stats.retweetsCount || 0,
    };
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(options: ServiceOptions = {}): Promise<SanitizedUser[]> {
    const {
      limit = 50,
      skip = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const users = await this.userRepository.find(
      {},
      {
        limit,
        skip,
        sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      }
    );

    return users.map((user) => this.sanitizeUser(user));
  }

  /**
   * Confirm user account
   */
  async confirmUser(userId: MongooseObjectId): Promise<SanitizedUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.confirmed) {
      throw new ConflictError("User already confirmed");
    }

    const updatedUser = await this.userRepository.updateById(userId, {
      confirmed: true,
      // confirmedAt: new Date(), // Campo no existe en el modelo
    });

    if (!updatedUser) {
      throw new Error("Failed to confirm user");
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Get recent users
   */
  async getRecentUsers(
    days: number = 7,
    options: ServiceOptions = {}
  ): Promise<SanitizedUser[]> {
    const users = await this.userRepository.findRecentUsers(days, options);
    return users.map((user) => this.sanitizeUser(user));
  }

  /**
   * Check username availability
   */
  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByUsername(username);
      return !user;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup unconfirmed users
   */
  async cleanupUnconfirmedUsers(
    daysOld: number = 30
  ): Promise<{ deletedCount: number; cutoffDate: Date }> {
    return await this.userRepository.cleanupUnconfirmedUsers(daysOld);
  }

  /**
   * Method to clean sensitive data from user
   */
  sanitize(user: IUserDocument): SanitizedUser {
    return this.sanitizeUser(user);
  }

  /**
   * Method to clean sensitive data from user
   */
  private sanitizeUser(user: IUserDocument): SanitizedUser {
    if (!user) return null as any;

    const userObj = user.toObject ? user.toObject() : user;

    // Remove sensitive fields
    const sanitized = { ...userObj };
    delete (sanitized as any).password;
    delete (sanitized as any).resetPasswordToken;
    delete (sanitized as any).resetPasswordExpires;
    delete (sanitized as any).__v;

    // Map address field to location for frontend consistency
    if ((sanitized as any).address !== undefined) {
      (sanitized as any).location = (sanitized as any).address;
      delete (sanitized as any).address;
    }

    return sanitized as SanitizedUser;
  }

  /**
   * Method to validate user data
   */
  validate(userData: CreateUserData | UpdateUserData): ValidationResult {
    return this.validateUserData(userData);
  }

  /**
   * Method to validate user data
   */
  private validateUserData(
    userData: CreateUserData | UpdateUserData
  ): ValidationResult {
    const errors: string[] = [];

    // For creation, firstName is required
    if ("firstName" in userData) {
      if (!userData.firstName || userData.firstName.trim().length === 0) {
        errors.push("First name is required");
      }
    }

    // Username validation
    if ("username" in userData) {
      if (!userData.username || userData.username.trim().length === 0) {
        errors.push("Username is required");
      } else if (userData.username.length < 3) {
        errors.push("Username must be at least 3 characters long");
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
    };

    if (!result.isValid) {
      throw new ValidationError(errors.join(", "));
    }

    return result;
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  }

  /**
   * Login user with username and password
   */
  async loginUser(
    username: string
  ): Promise<{ user: SanitizedUser; token: string }> {
    try {
      const user = await this.userRepository.findByUsername(username);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      return {
        user: this.sanitizeUser(user),
        token: "temporary-token", // In real app, generate JWT token
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reactivate a deactivated account
   */
  async reactivateAccount(username: string): Promise<SanitizedUser> {
    try {
      const user = await this.userRepository.findByUsername(username);
      if (!user || !user._id) {
        throw new NotFoundError("User not found");
      }

      const updatedUser = await this.userRepository.updateById(user._id, {
        active: true,
        updatedAt: new Date(),
      } as Partial<IUserDocument>);

      if (!updatedUser) {
        throw new Error("Failed to update user");
      }

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: MongooseObjectId,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Here you would validate current password and hash new password
      await this.userRepository.updateById(userId, {
        updatedAt: new Date(),
      } as Partial<IUserDocument>);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: MongooseObjectId): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      await this.userRepository.updateById(userId, {
        active: false,
        updatedAt: new Date(),
      } as Partial<IUserDocument>);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get suggested users for a user
   */
  async getSuggestedUsers(
    userId: MongooseObjectId,
    limit: number = 10
  ): Promise<SanitizedUser[]> {
    try {
      // Get users that the current user is already following (using find method directly to avoid populate)
      const followingRelations = await this.followRepository.find({
        follower: userId,
      });
      const followingIds = followingRelations.map((follow) =>
        follow.following.toString()
      );

      // Get all users with a higher limit to account for filtering
      const options: ServiceOptions = { limit: limit * 3, page: 1 };
      const users = await this.userRepository.findAll(options);

      // Filter out the current user and users already being followed
      const suggestedUsers = users
        .filter((user) => {
          const userIdStr = user._id?.toString();
          return (
            userIdStr !== userId.toString() &&
            !followingIds.includes(userIdStr!)
          );
        })
        .slice(0, limit)
        .map((user) => this.sanitizeUser(user));

      return suggestedUsers;
    } catch (error) {
      throw error;
    }
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { UserService };
