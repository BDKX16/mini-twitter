/**
 * Follow Controller - TypeScript version
 * Handles HTTP requests for follow/unfollow operations
 */

import { Request, Response, NextFunction } from "express";
import { FollowService } from "../services/FollowService";
import {
  AuthenticatedRequest,
  toObjectId,
  isValidObjectId,
} from "../types/controllers";
import { ValidationError } from "../utils/errors";

export class FollowController {
  private followService: FollowService;

  constructor() {
    this.followService = new FollowService();
  }

  /**
   * Follow a user
   */
  async followUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const followerId = req.user?.id;
      const { userId: followingId } = req.params;

      if (!followerId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(followingId)) {
        throw new ValidationError("Invalid user ID");
      }

      const result = await this.followService.followUser(
        toObjectId(followerId),
        toObjectId(followingId)
      );

      res.status(201).json({
        success: true,
        message: "User followed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const followerId = req.user?.id;
      const { userId: followingId } = req.params;

      if (!followerId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(followingId)) {
        throw new ValidationError("Invalid user ID");
      }

      await this.followService.unfollowUser(
        toObjectId(followerId),
        toObjectId(followingId)
      );

      res.json({
        success: true,
        message: "User unfollowed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle follow/unfollow
   */
  async toggleFollow(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const followerId = req.user?.id;
      const { userId: followingId } = req.params;

      if (!followerId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(followingId)) {
        throw new ValidationError("Invalid user ID");
      }

      const result = await this.followService.toggleFollow(
        toObjectId(followerId),
        toObjectId(followingId)
      );

      res.json({
        success: true,
        message: `User ${result.action} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's followers
   */
  async getFollowers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const result = await this.followService.getFollowers(toObjectId(userId), {
        limit: Number(limit),
        skip: Number(skip),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users being followed
   */
  async getFollowing(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const result = await this.followService.getFollowing(toObjectId(userId), {
        limit: Number(limit),
        skip: Number(skip),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { followerId, followingId } = req.params;

      if (!isValidObjectId(followerId) || !isValidObjectId(followingId)) {
        throw new ValidationError("Invalid user IDs");
      }

      const isFollowing = await this.followService.isFollowing(
        toObjectId(followerId),
        toObjectId(followingId)
      );

      res.json({
        success: true,
        data: { isFollowing },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get follow suggestions
   */
  async getFollowSuggestions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { limit = 10 } = req.query;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      const suggestions = await this.followService.getFollowSuggestions(
        toObjectId(userId),
        Number(limit)
      );

      res.json({
        success: true,
        data: { suggestions },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get mutual followers
   */
  async getMutualFollowers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId1, userId2 } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      if (!isValidObjectId(userId1) || !isValidObjectId(userId2)) {
        throw new ValidationError("Invalid user IDs");
      }

      const mutualFollowers = await this.followService.getMutualFollowers(
        toObjectId(userId1),
        toObjectId(userId2)
      );

      res.json({
        success: true,
        data: { mutualFollowers },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get follow statistics
   */
  async getFollowStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const stats = await this.followService.getFollowStats(toObjectId(userId));

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk follow multiple users
   */
  async bulkFollow(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userIds } = req.body;

      if (!req.user) {
        throw new ValidationError("User not authenticated");
      }

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new ValidationError("User IDs array is required");
      }

      // Validate all user IDs
      for (const userId of userIds) {
        if (!isValidObjectId(userId)) {
          throw new ValidationError(`Invalid user ID: ${userId}`);
        }
      }

      const results = [];
      for (const userId of userIds) {
        try {
          const result = await this.followService.followUser(
            toObjectId(req.user.id),
            toObjectId(userId)
          );
          results.push({ userId, success: true, result });
        } catch (error) {
          results.push({
            userId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      res.json({
        success: true,
        message: "Bulk follow operation completed",
        data: { results },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { FollowController };
