/**
 * Timeline Controller - TypeScript version
 * Handles HTTP requests for timeline operations
 */

import { Request, Response, NextFunction } from "express";
import { TimelineService } from "../services/TimelineService";
import {
  AuthenticatedRequest,
  toObjectId,
  isValidObjectId,
} from "../types/controllers";
import { ValidationError } from "../utils/errors";

export class TimelineController {
  private timelineService: TimelineService;

  constructor() {
    this.timelineService = new TimelineService();
  }

  /**
   * Get home timeline (tweets from followed users)
   */
  async getHomeTimeline(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { limit = 20, skip = 0 } = req.query;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      const result = await this.timelineService.getHomeTimeline(
        toObjectId(userId),
        {
          limit: Number(limit),
          skip: Number(skip),
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user timeline (their own tweets)
   */
  async getUserTimeline(
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

      const result = await this.timelineService.getUserTimeline(
        toObjectId(userId),
        {
          limit: Number(limit),
          skip: Number(skip),
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get mentions timeline
   */
  async getMentionsTimeline(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { limit = 20, skip = 0 } = req.query;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      const result = await this.timelineService.getMentionsTimeline(
        toObjectId(userId),
        {
          limit: Number(limit),
          skip: Number(skip),
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get public timeline
   */
  async getPublicTimeline(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 20, skip = 0 } = req.query;

      const result = await this.timelineService.getPublicTimeline({
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
   * Get trending timeline
   */
  async getTrendingTimeline(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 20, skip = 0 } = req.query;

      const result = await this.timelineService.getTrendingTimeline({
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
   * Get liked tweets timeline
   */
  async getLikedTimeline(
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

      const result = await this.timelineService.getLikedTimeline(
        toObjectId(userId),
        {
          limit: Number(limit),
          skip: Number(skip),
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get replies timeline
   */
  async getRepliesTimeline(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const result = await this.timelineService.getRepliesTimeline(
        toObjectId(tweetId),
        {
          limit: Number(limit),
          skip: Number(skip),
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get thread timeline
   */
  async getThreadTimeline(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;
      const { limit = 50, skip = 0 } = req.query;

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const result = await this.timelineService.getThreadTimeline(
        toObjectId(tweetId),
        {
          limit: Number(limit),
          skip: Number(skip),
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get hashtag timeline
   */
  async getHashtagTimeline(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { hashtag } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      if (!hashtag) {
        throw new ValidationError("Hashtag is required");
      }

      const result = await this.timelineService.getHashtagTimeline(hashtag, {
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
   * Get timeline for a specific user (as viewed by another user)
   */
  async getTimelineForUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId: targetUserId } = req.params;
      const { viewerId, limit = 20, skip = 0 } = req.query;

      if (!isValidObjectId(targetUserId)) {
        throw new ValidationError("Invalid target user ID");
      }

      let viewerObjectId;
      if (
        viewerId &&
        typeof viewerId === "string" &&
        isValidObjectId(viewerId)
      ) {
        viewerObjectId = toObjectId(viewerId);
      }

      const result = await this.timelineService.getTimelineForUser(
        toObjectId(targetUserId),
        viewerObjectId,
        {
          limit: Number(limit),
          skip: Number(skip),
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get timeline statistics
   */
  async getTimelineStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const stats = await this.timelineService.getTimelineStats(
        toObjectId(userId)
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { TimelineController };
