/**
 * Follow Service Implementation in TypeScript
 * Business logic layer for Follow/Unfollow operat      // Delete follow relationship
      const deleted = await this.followRepository.deleteById(existingFollow._id!);
      if (!deleted) {
        throw new Error('Failed to unfollow user');
      }
 */

import { FollowRepository } from "../infraestructure/database/FollowRepository";
import { UserRepository } from "../infraestructure/database/UserRepository";
import {
  FollowResult,
  FollowSuggestion,
  ServiceOptions,
  SanitizedUser,
  ValidationResult,
  IBaseService,
} from "../types/services";
import { MongooseObjectId, IFollowDocument } from "../types/models";
import { ValidationError, NotFoundError, ConflictError } from "../utils/errors";

export class FollowService implements IBaseService {
  private followRepository: FollowRepository;
  private userRepository: UserRepository;

  constructor() {
    this.followRepository = new FollowRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Follow a user
   */
  async followUser(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<IFollowDocument> {
    try {
      // Verify both users exist
      const [follower, following] = await Promise.all([
        this.userRepository.findById(followerId),
        this.userRepository.findById(followingId),
      ]);

      if (!follower) {
        throw new NotFoundError("Follower user not found");
      }

      if (!following) {
        throw new NotFoundError("Following user not found");
      }

      // Verify not following self
      if (followerId.toString() === followingId.toString()) {
        throw new ValidationError("You cannot follow yourself");
      }

      // Check if relationship already exists
      const existingFollow =
        await this.followRepository.findByFollowerAndFollowing(
          followerId,
          followingId
        );

      if (existingFollow) {
        throw new ConflictError("You are already following this user");
      }

      // Create follow relationship
      const follow = await this.followRepository.create({
        follower: followerId,
        following: followingId,
        createdAt: new Date(),
      } as Partial<IFollowDocument>);

      return follow;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<{ message: string }> {
    try {
      // Verify both users exist
      const [follower, following] = await Promise.all([
        this.userRepository.findById(followerId),
        this.userRepository.findById(followingId),
      ]);

      if (!follower) {
        throw new NotFoundError("Follower user not found");
      }

      if (!following) {
        throw new NotFoundError("Following user not found");
      }

      // Check if relationship exists
      const existingFollow =
        await this.followRepository.findByFollowerAndFollowing(
          followerId,
          followingId
        );

      if (!existingFollow) {
        throw new NotFoundError("You are not following this user");
      }

      // Delete relationship
      const deleted = await this.followRepository.deleteById(
        existingFollow._id!
      );
      if (!deleted) {
        throw new Error("Failed to unfollow user");
      }

      return { message: "User unfollowed successfully" };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Toggle follow/unfollow
   */
  async toggleFollow(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<FollowResult> {
    try {
      const result = await this.followRepository.toggleFollow(
        followerId,
        followingId
      );

      // Get updated counts
      const followersCount = await this.followRepository.countFollowers(
        followingId
      );
      const followingCount = await this.followRepository.countFollowing(
        followerId
      );

      return {
        action: result.action as "followed" | "unfollowed",
        follow: result.follow,
        followersCount,
        followingCount,
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get user followers
   */
  async getFollowers(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    userId: MongooseObjectId;
    followers: any[];
    totalFollowers: number;
  }> {
    const { limit = 50, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const followers = await this.followRepository.findFollowers(userId, {
      limit,
      skip,
      populate: "follower",
    });

    const totalFollowers = await this.followRepository.countFollowers(userId);

    return {
      userId,
      followers: followers.map((follow: any) => ({
        userId: follow.follower._id,
        firstName: follow.follower.firstName,
        lastName: follow.follower.lastName,
        bio: follow.follower.bio,
        profileImage: follow.follower.profileImage,
        followedAt: follow.createdAt,
        verified: follow.follower.verified || false,
      })),
      totalFollowers,
    };
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    userId: MongooseObjectId;
    following: any[];
    totalFollowing: number;
  }> {
    const { limit = 50, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const following = await this.followRepository.findFollowing(userId, {
      limit,
      skip,
      populate: "following",
    });

    const totalFollowing = await this.followRepository.countFollowing(userId);

    return {
      userId,
      following: following.map((follow: any) => ({
        userId: follow.following._id,
        firstName: follow.following.firstName,
        lastName: follow.following.lastName,
        bio: follow.following.bio,
        profileImage: follow.following.profileImage,
        followedAt: follow.createdAt,
        verified: follow.following.verified || false,
      })),
      totalFollowing,
    };
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(
    followerId: MongooseObjectId,
    followingId: MongooseObjectId
  ): Promise<boolean> {
    return await this.followRepository.isFollowing(followerId, followingId);
  }

  /**
   * Get mutual followers between two users
   */
  async getMutualFollowers(
    userId1: MongooseObjectId,
    userId2: MongooseObjectId
  ): Promise<any[]> {
    const mutualFollowers = await this.followRepository.getMutualFollowers(
      userId1,
      userId2
    );
    return mutualFollowers;
  }

  /**
   * Get follow suggestions for a user
   */
  async getFollowSuggestions(
    userId: MongooseObjectId,
    limit: number = 10
  ): Promise<FollowSuggestion[]> {
    const suggestions = await this.followRepository.getFollowSuggestions(
      userId,
      limit
    );

    return suggestions.map((suggestion: any) => ({
      user: suggestion.user,
      mutualFollowers: suggestion.mutualFollowers || 0,
      reason: suggestion.reason || "Suggested for you",
    }));
  }

  /**
   * Get follow statistics for a user
   */
  async getFollowStats(userId: MongooseObjectId): Promise<{
    followersCount: number;
    followingCount: number;
    mutualFollowersCount: number;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const [followersCount, followingCount] = await Promise.all([
      this.followRepository.countFollowers(userId),
      this.followRepository.countFollowing(userId),
    ]);

    return {
      followersCount,
      followingCount,
      mutualFollowersCount: 0, // Could be enhanced
    };
  }

  /**
   * Bulk follow multiple users
   */
  async bulkFollow(
    followerId: MongooseObjectId,
    followingIds: MongooseObjectId[]
  ): Promise<IFollowDocument[]> {
    // Verify follower exists
    const follower = await this.userRepository.findById(followerId);
    if (!follower) {
      throw new NotFoundError("Follower user not found");
    }

    // Remove self from list
    const validFollowingIds = followingIds.filter(
      (id) => id.toString() !== followerId.toString()
    );

    if (validFollowingIds.length === 0) {
      throw new ValidationError("No valid users to follow");
    }

    const follows = await this.followRepository.bulkFollow(
      followerId,
      validFollowingIds
    );
    return follows;
  }

  /**
   * Validate follow operation
   */
  validate(data: {
    followerId: MongooseObjectId;
    followingId: MongooseObjectId;
  }): ValidationResult {
    const errors: string[] = [];

    if (!data.followerId) {
      errors.push("Follower ID is required");
    }

    if (!data.followingId) {
      errors.push("Following ID is required");
    }

    if (
      data.followerId &&
      data.followingId &&
      data.followerId.toString() === data.followingId.toString()
    ) {
      errors.push("You cannot follow yourself");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize follow data
   */
  sanitize(follow: IFollowDocument): IFollowDocument {
    // No sensitive data to remove from follow relationships
    return follow;
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { FollowService };
