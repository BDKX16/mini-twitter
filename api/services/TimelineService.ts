/**
 * Timeline Service Implementation in TypeScript
 * Business logic layer for Timeline operations
 */

import { TweetRepository } from "../infraestructure/database/TweetRepository";
import { FollowRepository } from "../infraestructure/database/FollowRepository";
import { UserRepository } from "../infraestructure/database/UserRepository";
import { LikeRepository } from "../infraestructure/database/LikeRepository";
import { RetweetRepository } from "../infraestructure/database/RetweetRepository";
import { TweetService } from "./TweetService";
import {
  ServiceOptions,
  ValidationResult,
  IBaseService,
} from "../types/services";
import { MongooseObjectId, ITweetDocument } from "../types/models";
import { NotFoundError } from "../utils/errors";

export class TimelineService implements IBaseService {
  private tweetRepository: TweetRepository;
  private followRepository: FollowRepository;
  private userRepository: UserRepository;
  private likeRepository: LikeRepository;
  private retweetRepository: RetweetRepository;
  private tweetService: TweetService;

  constructor() {
    this.tweetRepository = new TweetRepository();
    this.followRepository = new FollowRepository();
    this.userRepository = new UserRepository();
    this.likeRepository = new LikeRepository();
    this.retweetRepository = new RetweetRepository();
    this.tweetService = new TweetService();
  }

  /**
   * Get user's home timeline (tweets from followed users + famous users)
   */
  async getHomeTimeline(
    userId: MongooseObjectId,
    currentUserId?: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    userId: MongooseObjectId;
    tweets: any[];
    totalTweets: number;
  }> {
    const { limit = 20, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get tweets from followed users + famous users
    const tweets = await this.tweetRepository.getHomeTimeline(userId, {
      limit,
      skip,
      populate: "author",
    });

    // Enrich tweets with user interaction data
    const enrichedTweets = await this.tweetService.enrichTweetsWithUserData(
      tweets,
      currentUserId || userId
    );

    const totalTweets = await this.tweetRepository.countHomeTimelineTweets(
      userId
    );

    return {
      userId,
      tweets: enrichedTweets,
      totalTweets,
    };
  }

  /**
   * Get enhanced home timeline with mixed content
   */
  async getEnhancedHomeTimeline(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    userId: MongooseObjectId;
    tweets: ITweetDocument[];
    totalTweets: number;
    contentMix: {
      followedUsers: number;
      famousUsers: number;
      ownTweets: number;
    };
  }> {
    const { limit = 20, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get enhanced timeline with mixed content
    const tweets = await this.tweetRepository.getHomeTimeline(userId, {
      limit,
      skip,
      populate: "author",
    });

    const totalTweets = await this.tweetRepository.countHomeTimelineTweets(
      userId
    );

    // Calculate content mix for analytics
    const contentMix = {
      followedUsers: 0,
      famousUsers: 0,
      ownTweets: 0,
    };

    // Get following list for classification
    const followedUsers = await this.followRepository.findFollowing(userId);
    const followingIds = followedUsers.map(
      (follow: any) => follow.following._id || follow.following
    );

    tweets.forEach((tweet) => {
      const authorId = tweet.author._id || tweet.author;
      if (authorId.toString() === userId.toString()) {
        contentMix.ownTweets++;
      } else if (
        followingIds.some((id: any) => id.toString() === authorId.toString())
      ) {
        contentMix.followedUsers++;
      } else {
        contentMix.famousUsers++;
      }
    });

    return {
      userId,
      tweets,
      totalTweets,
      contentMix,
    };
  }

  /**
   * Get user's profile timeline (their own tweets)
   */
  async getUserTimeline(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    userId: MongooseObjectId;
    tweets: ITweetDocument[];
    totalTweets: number;
  }> {
    const { limit = 20, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get user's tweets
    const tweets = await this.tweetRepository.findByAuthor(userId, {
      limit,
      skip,
      populate: "author",
    });

    const totalTweets = await this.tweetRepository.countByAuthor(userId);

    return {
      userId,
      tweets,
      totalTweets,
    };
  }

  /**
   * Get mentions timeline (tweets mentioning the user)
   */
  async getMentionsTimeline(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    userId: MongooseObjectId;
    tweets: ITweetDocument[];
    totalTweets: number;
  }> {
    const { limit = 20, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get tweets mentioning the user
    const tweets = await this.tweetRepository.findTweetsByMentions(userId, {
      limit,
      skip,
      populate: "author",
    });

    const totalTweets = await this.tweetRepository.countTweetsByMentions(
      userId
    );

    return {
      userId,
      tweets,
      totalTweets,
    };
  }

  /**
   * Get public timeline (all tweets)
   */
  async getPublicTimeline(options: ServiceOptions = {}): Promise<{
    tweets: ITweetDocument[];
    totalTweets: number;
  }> {
    const { limit = 20, skip = 0 } = options;

    // Get all tweets
    const tweets = await this.tweetRepository.findAll({
      limit,
      skip,
      populate: "author",
      sort: { createdAt: -1 },
    });

    const totalTweets = await this.tweetRepository.countAll();

    return {
      tweets,
      totalTweets,
    };
  }

  /**
   * Get trending tweets
   */
  async getTrendingTimeline(options: ServiceOptions = {}): Promise<{
    tweets: ITweetDocument[];
    totalTweets: number;
  }> {
    const { limit = 20, skip = 0 } = options;

    // Get trending tweets
    const tweets = await this.tweetRepository.findTrendingTweets(limit, skip);

    return {
      tweets,
      totalTweets: tweets.length,
    };
  }

  /**
   * Get liked tweets timeline
   */
  async getLikedTimeline(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    userId: MongooseObjectId;
    tweets: ITweetDocument[];
    totalTweets: number;
  }> {
    const { limit = 20, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get liked tweets
    const tweets = await this.tweetRepository.findLikedTweets(userId, {
      limit,
      skip,
      populate: "author",
    });

    const totalTweets = await this.tweetRepository.countLikedTweets(userId);

    return {
      userId,
      tweets,
      totalTweets,
    };
  }

  /**
   * Get replies to a tweet
   */
  async getRepliesTimeline(
    tweetId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    tweetId: MongooseObjectId;
    replies: ITweetDocument[];
    totalReplies: number;
  }> {
    const { limit = 20, skip = 0 } = options;

    // Verify tweet exists
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    // Get replies to the tweet
    const replies = await this.tweetRepository.findReplies(tweetId, {
      limit,
      skip,
      populate: "author",
    });

    const totalReplies = await this.tweetRepository.countReplies(tweetId);

    return {
      tweetId,
      replies,
      totalReplies,
    };
  }

  /**
   * Get thread for a tweet
   */
  async getThreadTimeline(
    tweetId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    tweetId: MongooseObjectId;
    thread: ITweetDocument[];
    totalTweets: number;
  }> {
    const { limit = 50, skip = 0 } = options;

    // Verify tweet exists
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    // Get thread tweets
    const thread = await this.tweetRepository.findThread(tweetId, {
      limit,
      skip,
      populate: "author",
    });

    return {
      tweetId,
      thread,
      totalTweets: thread.length,
    };
  }

  /**
   * Get hashtag timeline
   */
  async getHashtagTimeline(
    hashtag: string,
    options: ServiceOptions = {}
  ): Promise<{
    hashtag: string;
    tweets: ITweetDocument[];
    totalTweets: number;
  }> {
    const { limit = 20, skip = 0 } = options;

    // Clean hashtag
    const cleanHashtag = hashtag.replace("#", "");

    // Get tweets with hashtag
    const tweets = await this.tweetRepository.findByHashtag(cleanHashtag, {
      limit,
      skip,
      populate: "author",
    });

    const totalTweets = await this.tweetRepository.countByHashtag(cleanHashtag);

    return {
      hashtag: cleanHashtag,
      tweets,
      totalTweets,
    };
  }

  /**
   * Get timeline for a specific user (as viewed by another user)
   */
  async getTimelineForUser(
    targetUserId: MongooseObjectId,
    viewerUserId?: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<{
    targetUserId: MongooseObjectId;
    tweets: ITweetDocument[];
    totalTweets: number;
  }> {
    const { limit = 20, skip = 0 } = options;

    // Verify target user exists
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError("Target user not found");
    }

    // If viewer is specified, verify they exist
    if (viewerUserId) {
      const viewer = await this.userRepository.findById(viewerUserId);
      if (!viewer) {
        throw new NotFoundError("Viewer user not found");
      }
    }

    // Get user's tweets
    const tweets = await this.tweetRepository.findByAuthor(targetUserId, {
      limit,
      skip,
      populate: "author",
    });

    const totalTweets = await this.tweetRepository.countByAuthor(targetUserId);

    return {
      targetUserId,
      tweets,
      totalTweets,
    };
  }

  /**
   * Get timeline statistics
   */
  async getTimelineStats(userId: MongooseObjectId): Promise<{
    userId: MongooseObjectId;
    homeTimelineCount: number;
    userTimelineCount: number;
    mentionsCount: number;
    likedTweetsCount: number;
  }> {
    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const [
      homeTimelineCount,
      userTimelineCount,
      mentionsCount,
      likedTweetsCount,
    ] = await Promise.all([
      this.tweetRepository.countHomeTimelineTweets(userId),
      this.tweetRepository.countByAuthor(userId),
      this.tweetRepository.countTweetsByMentions(userId),
      this.tweetRepository.countLikedTweets(userId),
    ]);

    return {
      userId,
      homeTimelineCount,
      userTimelineCount,
      mentionsCount,
      likedTweetsCount,
    };
  }

  /**
   * Validate timeline request
   */
  validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (data.userId && !data.userId) {
      errors.push("Invalid user ID");
    }

    if (
      data.limit &&
      (typeof data.limit !== "number" || data.limit <= 0 || data.limit > 100)
    ) {
      errors.push("Limit must be a number between 1 and 100");
    }

    if (data.skip && (typeof data.skip !== "number" || data.skip < 0)) {
      errors.push("Skip must be a non-negative number");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize timeline data
   */
  sanitize(tweets: ITweetDocument[]): ITweetDocument[] {
    return tweets.map((tweet) => {
      // Remove sensitive data if any
      return tweet;
    });
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { TimelineService };
