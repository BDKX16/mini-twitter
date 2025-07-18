/**
 * Retweet Controller - TypeScript version
 * Handles HTTP requests for retweet operations
 */

import { Request, Response, NextFunction } from "express";
import { RetweetService } from "../services/RetweetService";
import { CreateRetweetData } from "../types/services";
import {
  AuthenticatedRequest,
  toObjectId,
  isValidObjectId,
} from "../types/controllers";
import { ValidationError } from "../utils/errors";

export class RetweetController {
  private retweetService: RetweetService;

  constructor() {
    this.retweetService = new RetweetService();
  }

  /**
   * Retweet a tweet
   */
  async retweetTweet(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { tweetId } = req.params;
      const { comment } = req.body;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const retweetData: CreateRetweetData = {
        userId: toObjectId(userId),
        tweetId: toObjectId(tweetId),
        comment,
      };

      const retweet = await this.retweetService.retweetTweet(retweetData);

      res.status(201).json({
        success: true,
        message: "Tweet retweeted successfully",
        data: { retweet },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unretweet a tweet
   */
  async unretweetTweet(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { tweetId } = req.params;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      await this.retweetService.unretweetTweet(
        toObjectId(userId),
        toObjectId(tweetId)
      );

      res.json({
        success: true,
        message: "Tweet unretweeted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle retweet/unretweet
   */
  async toggleRetweet(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { tweetId } = req.params;
      const { comment } = req.body;

      if (!userId) {
        throw new ValidationError("User must be authenticated");
      }

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const retweetData: CreateRetweetData = {
        userId: toObjectId(userId),
        tweetId: toObjectId(tweetId),
        comment,
      };

      const result = await this.retweetService.toggleRetweet(retweetData);

      res.json({
        success: true,
        message: `Tweet ${result.action} successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tweet retweets
   */
  async getTweetRetweets(
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

      const result = await this.retweetService.getTweetRetweets(
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
   * Get user retweets
   */
  async getUserRetweets(
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

      const result = await this.retweetService.getUserRetweets(
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
   * Get quote retweets
   */
  async getQuoteRetweets(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;
      const { limit = 20, skip = 0 } = req.query;

      let tweetObjectId;
      if (tweetId && isValidObjectId(tweetId)) {
        tweetObjectId = toObjectId(tweetId);
      }

      const quotes = await this.retweetService.getQuoteRetweets(tweetObjectId, {
        limit: Number(limit),
        skip: Number(skip),
      });

      res.json({
        success: true,
        data: { quotes },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user retweeted a tweet
   */
  async hasUserRetweetedTweet(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId, tweetId } = req.params;

      if (!isValidObjectId(userId) || !isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid user or tweet ID");
      }

      const hasRetweeted = await this.retweetService.hasUserRetweetedTweet(
        toObjectId(userId),
        toObjectId(tweetId)
      );

      res.json({
        success: true,
        data: { hasRetweeted },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get most retweeted tweets
   */
  async getMostRetweetedTweets(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      const tweets = await this.retweetService.getMostRetweetedTweets(
        Number(limit)
      );

      res.json({
        success: true,
        data: { tweets },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get retweet statistics
   */
  async getRetweetStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      if (!isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID");
      }

      const stats = await this.retweetService.getUserRetweetStats(
        toObjectId(userId)
      );

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get retweets count for a tweet
   */
  async getTweetRetweetsCount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      const count = await this.retweetService.getTweetRetweetsCount(
        toObjectId(tweetId)
      );

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Alias for retweetTweet to maintain compatibility with routes
   */
  async retweet(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    return this.retweetTweet(req, res, next);
  }

  /**
   * Create a quote retweet
   */
  async quoteRetweet(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { tweetId } = req.params;
      const { content } = req.body;

      if (!isValidObjectId(tweetId)) {
        throw new ValidationError("Invalid tweet ID");
      }

      if (!req.user) {
        throw new ValidationError("User not authenticated");
      }

      // Use retweetTweet with comment as quote retweet
      const quoteRetweet = await this.retweetService.retweetTweet({
        userId: toObjectId(req.user.id),
        tweetId: toObjectId(tweetId),
        comment: content,
      });

      res.status(201).json({
        success: true,
        message: "Quote retweet created successfully",
        data: { retweet: quoteRetweet },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { RetweetController };
