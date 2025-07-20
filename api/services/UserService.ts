/**
 * User Service Implementation in TypeScript
 * Business logic layer for User operations
 */

import { UserRepository } from "../infraestructure/database/UserRepository";
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

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<SanitizedUser> {
    try {
      // Validate required data
      this.validateUserData(userData);

      // Check if username already exists
      const existingUser = await this.userRepository.findByUsername(
        userData.username
      );
      if (existingUser) {
        throw new ConflictError("Username already exists");
      }

      // Create user
      const user = await this.userRepository.create({
        ...userData,
        confirmed: false,
        createdAt: new Date(),
      } as Partial<IUserDocument>);

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

    const updatedUser = await this.userRepository.updateById(
      userId,
      updateData
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
      confirmedAt: new Date(),
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
    username: string,
    password: string
  ): Promise<{ user: SanitizedUser; token: string }> {
    try {
      const user = await this.userRepository.findByUsername(username);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Here you would validate password (assuming password is hashed)
      // For now, just returning the user
      const token = "temporary-token"; // In real app, generate JWT token

      return {
        user: this.sanitizeUser(user),
        token,
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
      const options: ServiceOptions = { limit, page: 1 };
      const users = await this.userRepository.findAll(options);

      // Filter out the current user and return suggestions
      return users
        .filter((user) => user._id?.toString() !== userId.toString())
        .slice(0, limit)
        .map((user) => this.sanitizeUser(user));
    } catch (error) {
      throw error;
    }
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { UserService };
