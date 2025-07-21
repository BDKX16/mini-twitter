/**
 * Tweet Service Implementation in TypeScript
 * Business logic layer for Tweet operations
 */

import { TweetRepository } from "../infraestructure/database/TweetRepository";
import { UserRepository } from "../infraestructure/database/UserRepository";
import { LikeRepository } from "../infraestructure/database/LikeRepository";
import { RetweetRepository } from "../infraestructure/database/RetweetRepository";
import {
  CreateTweetData,
  UpdateTweetData,
  TweetWithAuthor,
  ServiceOptions,
  ValidationResult,
  IBaseService,
} from "../types/services";
import { MongooseObjectId, ITweetDocument } from "../types/models";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "../utils/errors";

export class TweetService implements IBaseService {
  private tweetRepository: TweetRepository;
  private userRepository: UserRepository;
  private likeRepository: LikeRepository;
  private retweetRepository: RetweetRepository;

  constructor() {
    this.tweetRepository = new TweetRepository();
    this.userRepository = new UserRepository();
    this.likeRepository = new LikeRepository();
    this.retweetRepository = new RetweetRepository();
  }

  /**
   * Create a new tweet
   */
  async createTweet(createData: CreateTweetData): Promise<any> {
    try {
      // Validate that user exists
      const user = await this.userRepository.findById(createData.authorId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Validate tweet content
      this.validateTweetContent(createData.content);

      // Extract hashtags and mentions from content
      const hashtags = this.extractHashtags(createData.content);
      const mentionUsernames = this.extractMentions(createData.content);

      // Create tweet
      const tweet = await this.tweetRepository.create({
        author: createData.authorId,
        content: createData.content.trim(),
        images: createData.images || [],
        hashtags: [...(createData.hashtags || []), ...hashtags],
        mentions: createData.mentions || [], // Use provided mentions, not extracted ones
        parentTweetId: createData.parentTweetId,
        createdAt: new Date(),
      } as Partial<ITweetDocument>);

      // Convert to plain object and include author
      const tweetObj =
        typeof tweet.toObject === "function" ? tweet.toObject() : tweet;
      const userObj =
        typeof user.toObject === "function" ? user.toObject() : user;
      return { ...tweetObj, author: userObj };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get tweet by ID
   */
  async getTweetById(
    tweetId: MongooseObjectId,
    currentUserId?: MongooseObjectId
  ): Promise<any> {
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    // Enrich with user interaction data
    return await this.enrichTweetWithUserData(tweet, currentUserId);
  }

  /**
   * Get tweets by user
   */
  async getTweetsByUser(
    userId: MongooseObjectId,
    currentUserId?: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<any[]> {
    const { limit = 20, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    console.log(userId);
    // Only get main tweets by user (not replies/comments)
    const tweets = await this.tweetRepository.find(
      { author: userId, parentTweetId: null },
      {
        limit,
        skip,
        sort: { createdAt: -1 },
      }
    );

    // Enrich with user interaction data
    return await this.enrichTweetsWithUserData(tweets, currentUserId);
  }

  /**
   * Get all tweets with pagination
   */
  async getAllTweets(
    currentUserId?: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<any[]> {
    const {
      limit = 50,
      skip = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    // Only get main tweets (not replies/comments)
    const tweets = await this.tweetRepository.find(
      { parentTweetId: { $exists: false } },
      {
        limit,
        skip,
        sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      }
    );

    // Enrich with user interaction data
    return await this.enrichTweetsWithUserData(tweets, currentUserId);
  }

  /**
   * Update tweet
   */
  async updateTweet(
    tweetId: MongooseObjectId,
    userId: MongooseObjectId,
    updateData: UpdateTweetData
  ): Promise<ITweetDocument> {
    // Verify tweet exists
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    // Verify user is the author
    if (tweet.author.toString() !== userId.toString()) {
      throw new ForbiddenError("You can only edit your own tweets");
    }

    // Validate new content if updating
    if (updateData.content) {
      this.validateTweetContent(updateData.content);
      updateData.content = updateData.content.trim();

      // Update hashtags and mentions if content changed
      const hashtags = this.extractHashtags(updateData.content);
      const mentionUsernames = this.extractMentions(updateData.content);
      updateData.hashtags = [...(updateData.hashtags || []), ...hashtags];

      // For mentions, we would need to look up users by username to get their ObjectIds
      // For now, we'll skip adding new mentions in updates to avoid complexity
      if (mentionUsernames.length > 0) {
        // TODO: Implement user lookup for mentions
        console.warn("Mention extraction in tweet updates not yet implemented");
      }
    }

    const updatedTweet = await this.tweetRepository.updateById(
      tweetId,
      updateData
    );
    if (!updatedTweet) {
      throw new NotFoundError("Tweet not found");
    }

    return updatedTweet;
  }

  /**
   * Delete tweet
   */
  async deleteTweet(
    tweetId: MongooseObjectId,
    userId: MongooseObjectId
  ): Promise<{ message: string }> {
    // Verify tweet exists
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    // Verify user is the author
    if (tweet.author.toString() !== userId.toString()) {
      throw new ForbiddenError("You can only delete your own tweets");
    }

    const deleted = await this.tweetRepository.deleteById(tweetId);
    if (!deleted) {
      throw new Error("Failed to delete tweet");
    }

    return { message: "Tweet deleted successfully" };
  }

  /**
   * Search tweets
   */
  async searchTweets(
    query: string,
    options: ServiceOptions = {}
  ): Promise<ITweetDocument[]> {
    const { limit = 20, skip = 0 } = options;

    if (!query || query.trim().length === 0) {
      throw new ValidationError("Search query is required");
    }

    // Search only main tweets (not replies/comments)
    const tweets = await this.tweetRepository.find(
      {
        content: { $regex: query, $options: "i" },
        parentTweetId: { $exists: false },
      },
      {
        limit,
        skip,
        sort: { createdAt: -1 },
      }
    );
    return tweets;
  }

  /**
   * Get tweet statistics
   */
  async getTweetStats(tweetId: MongooseObjectId): Promise<any> {
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    const stats = await this.tweetRepository.getTweetStats(tweetId);
    return {
      tweetId,
      likesCount: stats.likesCount || 0,
      retweetsCount: stats.retweetsCount || 0,
      repliesCount: stats.repliesCount || 0,
      viewsCount: stats.viewsCount || 0,
    };
  }

  /**
   * Get trending tweets
   */
  async getTrendingTweets(
    currentUserId?: MongooseObjectId,
    timeframe: number = 24,
    limit: number = 10
  ): Promise<any[]> {
    // Get trending tweets but exclude replies/comments
    const tweets = await this.tweetRepository.find(
      { parentTweetId: { $exists: false } },
      {
        limit,
        skip: 0,
        sort: { createdAt: -1 },
      }
    );

    // Enrich with user interaction data
    return await this.enrichTweetsWithUserData(tweets, currentUserId);
  }

  /**
   * Get user timeline
   */
  async getTimeline(
    userId: MongooseObjectId,
    currentUserId?: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<any[]> {
    const { limit = 20, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get timeline (tweets from followed users + own tweets)
    const timeline = await this.tweetRepository.getTimelineForUser(userId, {
      limit,
      skip,
    });
    return timeline;
  }

  /**
   * Get mentions for user
   */
  async getMentions(
    userId: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<ITweetDocument[]> {
    const { limit = 20, skip = 0 } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const mentions = await this.tweetRepository.findByMention(userId, {
      limit,
      skip,
    });
    return mentions;
  }

  /**
   * Get tweets by hashtag
   */
  async getHashtagTweets(
    hashtag: string,
    options: ServiceOptions = {}
  ): Promise<ITweetDocument[]> {
    const { limit = 20, skip = 0 } = options;

    if (!hashtag || hashtag.trim().length === 0) {
      throw new ValidationError("Hashtag is required");
    }

    // Clean hashtag (remove # if exists)
    const cleanHashtag = hashtag.replace("#", "").toLowerCase();

    // Get tweets by hashtag but exclude replies/comments
    const tweets = await this.tweetRepository.find(
      {
        hashtags: cleanHashtag,
        parentTweetId: { $exists: false },
      },
      {
        limit,
        skip,
        sort: { createdAt: -1 },
      }
    );
    return tweets;
  }

  /**
   * Get replies to a tweet
   */
  async getTweetReplies(
    tweetId: MongooseObjectId,
    currentUserId?: MongooseObjectId,
    options: ServiceOptions = {}
  ): Promise<any[]> {
    const { limit = 20, skip = 0 } = options;

    // Verify tweet exists
    const tweet = await this.tweetRepository.findById(tweetId);
    if (!tweet) {
      throw new NotFoundError("Tweet not found");
    }

    const replies = await this.tweetRepository.find(
      { parentTweetId: tweetId },
      { limit, skip, sort: { createdAt: 1 }, populate: "author" }
    );

    // Enrich with user interaction data
    return await this.enrichTweetsWithUserData(replies, currentUserId);
  }

  /**
   * Reply to a tweet
   */
  async replyToTweet(
    userId: MongooseObjectId,
    tweetId: MongooseObjectId,
    content: string
  ): Promise<ITweetDocument> {
    // Verify original tweet exists
    const originalTweet = await this.tweetRepository.findById(tweetId);
    if (!originalTweet) {
      throw new NotFoundError("Original tweet not found");
    }

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Validate reply content
    this.validateTweetContent(content);

    // Create reply
    const reply = await this.createTweet({
      content: content.trim(),
      authorId: userId,
      parentTweetId: tweetId,
    });

    return reply;
  }

  /**
   * Get user tweet statistics
   */
  async getUserTweetStats(userId: MongooseObjectId): Promise<any> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get basic tweet count
    const totalTweets = await this.tweetRepository.count({ author: userId });

    // For now, return basic stats. Could be enhanced with aggregation
    return {
      userId,
      totalTweets,
      totalLikesReceived: 0, // Would need aggregation with likes collection
      totalRetweetsReceived: 0, // Would need aggregation with retweets collection
      averageLikesPerTweet: 0,
      mostLikedTweet: null,
    };
  }

  /**
   * Validate tweet content
   */
  validate(data: { content: string }): ValidationResult {
    return this.validateTweetContent(data.content);
  }

  /**
   * Validate tweet content
   */
  private validateTweetContent(content: string): ValidationResult {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push("Tweet content is required");
    }

    if (content.trim().length > 280) {
      errors.push("Tweet content cannot exceed 280 characters");
    }

    // Check for basic inappropriate content
    const inappropriateWords = ["spam", "fake", "scam"]; // Basic list
    const hasInappropriateContent = inappropriateWords.some((word) =>
      content.toLowerCase().includes(word)
    );

    if (hasInappropriateContent) {
      errors.push("Tweet contains inappropriate content");
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
   * Extract hashtags from content
   */
  private extractHashtags(content: string): string[] {
    const hashtags = content.match(/#\w+/g) || [];
    return hashtags.map((tag) => tag.toLowerCase().replace("#", ""));
  }

  /**
   * Extract mentions from content
   */
  private extractMentions(content: string): string[] {
    const mentions = content.match(/@\w+/g) || [];
    return mentions.map((mention) => mention.replace("@", ""));
  }

  /**
   * Get trending topics based on tweet engagement
   */
  async getTrendingTopics(options: {
    hours?: number;
    limit?: number;
  }): Promise<any[]> {
    try {
      const { hours = 24, limit = 10 } = options;
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const trends = await this.tweetRepository.aggregate([
        {
          $match: {
            createdAt: { $gte: cutoffDate },
            isDeleted: false,
          },
        },
        {
          $addFields: {
            likesCount: { $size: "$likes" },
            retweetsCount: { $size: "$retweets" },
            totalEngagement: {
              $add: [{ $size: "$likes" }, { $size: "$retweets" }],
            },
          },
        },
        {
          $sort: { totalEngagement: -1 },
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "authorData",
          },
        },
        {
          $unwind: "$authorData",
        },
        {
          $project: {
            content: 1,
            totalEngagement: 1,
            likesCount: 1,
            retweetsCount: 1,
            createdAt: 1,
            author: {
              username: "$authorData.username",
              name: {
                $concat: [
                  { $ifNull: ["$authorData.firstName", ""] },
                  " ",
                  { $ifNull: ["$authorData.lastName", ""] },
                ],
              },
              profileImage: "$authorData.profileImage",
            },
          },
        },
      ]);

      return trends;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get trending hashtags
   */
  async getTrendingHashtags(options: {
    hours?: number;
    limit?: number;
  }): Promise<any[]> {
    try {
      const { hours = 24, limit = 10 } = options;
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const hashtags = await this.tweetRepository.aggregate([
        {
          $match: {
            createdAt: { $gte: cutoffDate },
            hashtags: { $exists: true, $ne: [] },
          },
        },
        {
          $unwind: "$hashtags",
        },
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "tweet",
            as: "likes",
          },
        },
        {
          $lookup: {
            from: "retweets",
            localField: "_id",
            foreignField: "tweet",
            as: "retweets",
          },
        },
        {
          $group: {
            _id: "$hashtags",
            count: { $sum: 1 },
            totalLikes: { $sum: { $size: "$likes" } },
            totalRetweets: { $sum: { $size: "$retweets" } },
          },
        },
        {
          $addFields: {
            totalEngagement: { $add: ["$totalLikes", "$totalRetweets"] },
            hashtag: { $concat: ["#", "$_id"] },
          },
        },
        {
          $sort: { count: -1, totalEngagement: -1 },
        },
        {
          $limit: limit,
        },
        {
          $project: {
            _id: 0,
            hashtag: 1,
            count: 1,
            totalEngagement: 1,
            category: "Trending",
          },
        },
      ]);

      return hashtags;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Enrich tweets with user interaction data (isLiked, isRetweeted)
   */
  async enrichTweetsWithUserData(
    tweets: ITweetDocument[],
    currentUserId?: MongooseObjectId
  ): Promise<any[]> {
    if (tweets.length === 0) {
      return [];
    }

    try {
      // Get tweet IDs
      const tweetIds = tweets.map((tweet) => tweet._id);

      // Get user's likes and retweets for these tweets in parallel (if user is authenticated)
      // Also get replies count for all tweets
      const promises: Promise<any>[] = [
        // Get replies count for each tweet
        this.tweetRepository.aggregate([
          { $match: { parentTweetId: { $in: tweetIds } } },
          { $group: { _id: "$parentTweetId", count: { $sum: 1 } } },
        ]),
      ];

      if (currentUserId) {
        promises.push(
          this.likeRepository.find(
            { user: currentUserId, tweet: { $in: tweetIds } },
            { select: "tweet" }
          ),
          this.retweetRepository.find(
            { user: currentUserId, tweet: { $in: tweetIds } },
            { select: "tweet" }
          )
        );
      }

      const results = await Promise.all(promises);
      const repliesCounts = results[0];
      const userLikes = currentUserId ? results[1] : [];
      const userRetweets = currentUserId ? results[2] : [];

      // Create Maps for faster lookup
      const repliesCountMap = new Map(
        repliesCounts.map((item: any) => [item._id?.toString(), item.count])
      );

      const likedTweetIds = new Set(
        userLikes.map((like: any) => like.tweet.toString())
      );
      const retweetedTweetIds = new Set(
        userRetweets.map((retweet: any) => retweet.tweet.toString())
      );

      // Enrich tweets with user interaction data and replies count
      return tweets.map((tweet) => {
        const tweetObj =
          typeof tweet.toObject === "function" ? tweet.toObject() : tweet;
        const tweetId = tweet._id?.toString();

        if (!tweetId) {
          return {
            ...tweetObj,
            isLiked: false,
            isRetweeted: false,
            repliesCount: 0,
          };
        }

        return {
          ...tweetObj,
          isLiked: currentUserId ? likedTweetIds.has(tweetId) : false,
          isRetweeted: currentUserId ? retweetedTweetIds.has(tweetId) : false,
          repliesCount: repliesCountMap.get(tweetId) || 0,
        };
      });
    } catch (error: any) {
      console.error("Error enriching tweets with user data:", error);
      // Fallback: return tweets without interaction data
      return tweets.map((tweet) => ({
        ...(typeof tweet.toObject === "function" ? tweet.toObject() : tweet),
        isLiked: false,
        isRetweeted: false,
        repliesCount: 0,
      }));
    }
  }

  /**
   * Enrich single tweet with user interaction data
   */
  async enrichTweetWithUserData(
    tweet: ITweetDocument,
    currentUserId?: MongooseObjectId
  ): Promise<any> {
    const enrichedTweets = await this.enrichTweetsWithUserData(
      [tweet],
      currentUserId
    );
    return enrichedTweets[0];
  }

  /**
   * Sanitize method for IBaseService
   */
  sanitize(tweet: ITweetDocument): ITweetDocument {
    // For tweets, we don't need to remove sensitive data like with users
    return tweet;
  }
}

// También exportar para compatibilidad con CommonJS
module.exports = { TweetService };
