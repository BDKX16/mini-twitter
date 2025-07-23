import { LikeService } from "../services/LikeService";
import { LikeRepository } from "../infraestructure/database/LikeRepository";
import { UserRepository } from "../infraestructure/database/UserRepository";
import { TweetRepository } from "../infraestructure/database/TweetRepository";
import { ILikeDocument, IUserDocument, ITweetDocument } from "../types/models";
import { ServiceOptions } from "../types/services";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errors";

// Mock de los repositories
jest.mock("../infraestructure/database/LikeRepository");
jest.mock("../infraestructure/database/UserRepository");
jest.mock("../infraestructure/database/TweetRepository");

describe("LikeService", () => {
  let likeService: LikeService;
  let mockLikeRepository: jest.Mocked<LikeRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockTweetRepository: jest.Mocked<TweetRepository>;

  // Datos de prueba hardcodeados
  const userId = "60d5ecb54f8a2b1234567890" as any;
  const tweetId = "60d5ecb54f8a2b1234567891" as any;
  const likeId = "60d5ecb54f8a2b1234567892" as any;

  const mockUser: Partial<IUserDocument> = {
    _id: userId,
    firstName: "Juan",
    lastName: "Pérez",
    username: "juan_perez",
    confirmed: true,
    createdAt: new Date("2024-01-01"),
  };

  const mockTweet: Partial<ITweetDocument> = {
    _id: tweetId,
    content: "Este es un tweet de prueba",
    author: userId,
    createdAt: new Date("2024-01-01"),
    likesCount: 0,
    retweetsCount: 0,
    repliesCount: 0,
    mentions: [],
    hashtags: [],
    isDeleted: false,
  };

  const mockLike: Partial<ILikeDocument> = {
    _id: likeId,
    user: userId,
    tweet: tweetId,
    createdAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock repositories
    mockLikeRepository = new LikeRepository() as jest.Mocked<LikeRepository>;
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockTweetRepository = new TweetRepository() as jest.Mocked<TweetRepository>;

    // Create service instance
    likeService = new LikeService();

    // Inject mocked repositories
    (likeService as any).likeRepository = mockLikeRepository;
    (likeService as any).userRepository = mockUserRepository;
    (likeService as any).tweetRepository = mockTweetRepository;
  });

  describe("likeTweet", () => {
    it("should successfully like a tweet", async () => {
      // Arrange
      const updatedTweet = { ...mockTweet, likesCount: 1 };
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );
      (mockTweetRepository as any).hasUserLikedTweet = jest
        .fn()
        .mockResolvedValue(false);
      (mockTweetRepository as any).addLikeToTweet = jest
        .fn()
        .mockResolvedValue(updatedTweet);
      mockLikeRepository.create.mockResolvedValue(mockLike as ILikeDocument);

      // Act
      const result = await likeService.likeTweet(userId, tweetId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockTweetRepository.findById).toHaveBeenCalledWith(tweetId);
      expect(
        (mockTweetRepository as any).hasUserLikedTweet
      ).toHaveBeenCalledWith(tweetId, userId);
      expect((mockTweetRepository as any).addLikeToTweet).toHaveBeenCalledWith(
        tweetId,
        userId
      );
      expect(mockLikeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: userId,
          tweet: tweetId,
        })
      );
      expect(result).toEqual({
        tweet: updatedTweet,
        message: "Tweet liked successfully",
        likesCount: 1,
        isLiked: true,
      });
    });

    it("should throw NotFoundError when user does not exist", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(likeService.likeTweet(userId, tweetId)).rejects.toThrow(
        NotFoundError
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it("should throw NotFoundError when tweet does not exist", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockTweetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(likeService.likeTweet(userId, tweetId)).rejects.toThrow(
        NotFoundError
      );
      expect(mockTweetRepository.findById).toHaveBeenCalledWith(tweetId);
    });

    it("should throw ConflictError when tweet is already liked", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );
      (mockTweetRepository as any).hasUserLikedTweet = jest
        .fn()
        .mockResolvedValue(true);

      // Act & Assert
      await expect(likeService.likeTweet(userId, tweetId)).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe("unlikeTweet", () => {
    it("should successfully unlike a tweet", async () => {
      // Arrange
      const updatedTweet = { ...mockTweet, likesCount: 0 };
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );
      (mockTweetRepository as any).hasUserLikedTweet = jest
        .fn()
        .mockResolvedValue(true);
      (mockTweetRepository as any).removeLikeFromTweet = jest
        .fn()
        .mockResolvedValue(updatedTweet);
      mockLikeRepository.findByUserAndTweet.mockResolvedValue(
        mockLike as ILikeDocument
      );
      mockLikeRepository.deleteById.mockResolvedValue(true);

      // Act
      const result = await likeService.unlikeTweet(userId, tweetId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockTweetRepository.findById).toHaveBeenCalledWith(tweetId);
      expect(
        (mockTweetRepository as any).hasUserLikedTweet
      ).toHaveBeenCalledWith(tweetId, userId);
      expect(
        (mockTweetRepository as any).removeLikeFromTweet
      ).toHaveBeenCalledWith(tweetId, userId);
      expect(mockLikeRepository.findByUserAndTweet).toHaveBeenCalledWith(
        userId,
        tweetId
      );
      expect(mockLikeRepository.deleteById).toHaveBeenCalledWith(likeId);
      expect(result).toEqual({
        tweet: updatedTweet,
        message: "Tweet unliked successfully",
        likesCount: 0,
        isLiked: false,
      });
    });

    it("should throw NotFoundError when like does not exist", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );
      (mockTweetRepository as any).hasUserLikedTweet = jest
        .fn()
        .mockResolvedValue(false);

      // Act & Assert
      await expect(likeService.unlikeTweet(userId, tweetId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("getTweetLikes", () => {
    it("should get likes for a tweet with pagination", async () => {
      // Arrange
      const mockLikesWithUser = [
        {
          ...mockLike,
          user: mockUser,
        },
      ];
      const options: ServiceOptions = { limit: 10, skip: 0 };
      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );
      mockLikeRepository.findByTweet.mockResolvedValue(
        mockLikesWithUser as any
      );
      mockLikeRepository.countByTweet.mockResolvedValue(1);

      // Act
      const result = await likeService.getTweetLikes(tweetId, options);

      // Assert
      expect(mockLikeRepository.findByTweet).toHaveBeenCalledWith(tweetId, {
        ...options,
        populate: "user",
      });
      expect(result).toEqual({
        likes: [
          {
            userId: mockUser._id,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            username: mockUser.username,
            profileImage: undefined,
            likedAt: mockLike.createdAt,
          },
        ],
        totalLikes: 1,
        tweetId,
      });
    });

    it("should throw NotFoundError when tweet does not exist", async () => {
      // Arrange
      mockTweetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(likeService.getTweetLikes(tweetId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("getUserLikes", () => {
    it("should get likes by a user with pagination", async () => {
      // Arrange
      const mockLikesWithTweet = [
        {
          ...mockLike,
          tweet: mockTweet,
        },
      ];
      const options: ServiceOptions = { limit: 10, skip: 0 };
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockLikeRepository.findByUser.mockResolvedValue(
        mockLikesWithTweet as any
      );
      mockLikeRepository.countByUser.mockResolvedValue(1);

      // Act
      const result = await likeService.getUserLikes(userId, options);

      // Assert
      expect(mockLikeRepository.findByUser).toHaveBeenCalledWith(userId, {
        ...options,
        populate: "tweet",
      });
      expect(result).toEqual({
        likes: [
          {
            tweetId: mockTweet._id,
            tweetContent: mockTweet.content,
            tweetAuthor: mockTweet.author,
            likedAt: mockLike.createdAt,
          },
        ],
        totalLikes: 1,
        userId,
      });
    });
  });

  describe("hasUserLikedTweet", () => {
    it("should return true when user has liked tweet", async () => {
      // Arrange
      mockLikeRepository.findByUserAndTweet.mockResolvedValue(
        mockLike as ILikeDocument
      );

      // Act
      const result = await likeService.hasUserLikedTweet(userId, tweetId);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when user has not liked tweet", async () => {
      // Arrange
      mockLikeRepository.findByUserAndTweet.mockResolvedValue(null);

      // Act
      const result = await likeService.hasUserLikedTweet(userId, tweetId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("isLiked", () => {
    it("should return same result as hasUserLikedTweet", async () => {
      // Arrange
      mockLikeRepository.findByUserAndTweet.mockResolvedValue(
        mockLike as ILikeDocument
      );

      // Act
      const result = await likeService.isLiked(userId, tweetId);

      // Assert
      expect(result).toBe(true);
      expect(mockLikeRepository.findByUserAndTweet).toHaveBeenCalledWith(
        userId,
        tweetId
      );
    });
  });

  describe("getMostLikedTweets", () => {
    it("should get most liked tweets with limit", async () => {
      // Arrange
      const mockTrendingTweets = [{ _id: tweetId, count: 5 }];
      mockLikeRepository.getMostLikedTweets.mockResolvedValue(
        mockTrendingTweets
      );

      // Act
      const result = await likeService.getMostLikedTweets(10);

      // Assert
      expect(mockLikeRepository.getMostLikedTweets).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockTrendingTweets);
    });
  });

  describe("getUserLikeStats", () => {
    it("should get user like statistics", async () => {
      // Arrange
      const mockStats = {
        totalLikes: 15,
        totalLikesReceived: 12,
        mostLikedTweet: {
          tweetId: tweetId,
          likeCount: 5,
        },
      };
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockLikeRepository.getUserLikeStats.mockResolvedValue(mockStats);

      // Act
      const result = await likeService.getUserLikeStats(userId);

      // Assert
      expect(mockLikeRepository.getUserLikeStats).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockStats);
    });
  });

  describe("getTweetLikesCount", () => {
    it("should get tweet likes count", async () => {
      // Arrange
      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );
      mockLikeRepository.countByTweet.mockResolvedValue(5);

      // Act
      const result = await likeService.getTweetLikesCount(tweetId);

      // Assert
      expect(mockLikeRepository.countByTweet).toHaveBeenCalledWith(tweetId);
      expect(result).toBe(5);
    });
  });

  describe("getRecentLikesActivity", () => {
    it("should get recent likes activity", async () => {
      // Arrange
      const mockRecentLikes = [
        {
          ...mockLike,
          tweet: mockTweet,
          createdAt: new Date(),
        },
      ];
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockLikeRepository.findByUser.mockResolvedValue(mockRecentLikes as any);

      // Act
      const result = await likeService.getRecentLikesActivity(userId, 24, 20);

      // Assert
      expect(mockLikeRepository.findByUser).toHaveBeenCalledWith(userId, {
        limit: 20,
        sort: { createdAt: -1 },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("likeId");
      expect(result[0]).toHaveProperty("tweetId");
      expect(result[0]).toHaveProperty("likedAt");
    });
  });

  describe("getTrendingByLikes", () => {
    it("should get trending tweets by likes", async () => {
      // Arrange
      const mockTrendingTweets = [{ _id: tweetId, count: 10 }];
      mockLikeRepository.getMostLikedTweets.mockResolvedValue(
        mockTrendingTweets
      );

      // Act
      const result = await likeService.getTrendingByLikes(24, 10, "hours");

      // Assert
      expect(mockLikeRepository.getMostLikedTweets).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockTrendingTweets);
    });
  });

  describe("bulkLike", () => {
    it("should successfully bulk like multiple tweets", async () => {
      // Arrange
      const tweetIds = [tweetId, "60d5ecb54f8a2b1234567893" as any];
      const mockTweet2 = {
        ...mockTweet,
        _id: "60d5ecb54f8a2b1234567893" as any,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockTweetRepository.findById
        .mockResolvedValueOnce(mockTweet as ITweetDocument)
        .mockResolvedValueOnce(mockTweet2 as ITweetDocument);
      mockLikeRepository.findByUserAndTweet.mockResolvedValue(null);
      mockLikeRepository.create
        .mockResolvedValueOnce(mockLike as ILikeDocument)
        .mockResolvedValueOnce({
          ...mockLike,
          _id: "60d5ecb54f8a2b1234567894" as any,
        } as ILikeDocument);

      // Act
      const result = await likeService.bulkLike(userId, tweetIds);

      // Assert
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(2);
    });

    it("should handle failed likes in bulk operation", async () => {
      // Arrange
      const tweetIds = [tweetId, "invalid_tweet_id" as any];

      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockTweetRepository.findById
        .mockResolvedValueOnce(mockTweet as ITweetDocument)
        .mockResolvedValueOnce(null);
      mockLikeRepository.findByUserAndTweet.mockResolvedValue(null);
      mockLikeRepository.create.mockResolvedValueOnce(
        mockLike as ILikeDocument
      );

      // Act
      const result = await likeService.bulkLike(userId, tweetIds);

      // Assert
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe("Tweet not found");
    });
  });

  describe("getLikesActivityFeed", () => {
    it("should get likes activity feed", async () => {
      // Arrange
      const mockActivities = [
        {
          ...mockLike,
          tweet: mockTweet,
        },
      ];
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockLikeRepository.findByUser.mockResolvedValue(mockActivities as any);
      mockLikeRepository.countByUser.mockResolvedValue(1);

      // Act
      const result = await likeService.getLikesActivityFeed(userId, {
        limit: 20,
        skip: 0,
      });

      // Assert
      expect(result).toHaveProperty("activities");
      expect(result).toHaveProperty("totalActivities", 1);
      expect(result).toHaveProperty("userId", userId);
      expect(result.activities).toHaveLength(1);
      expect(result.activities[0]).toHaveProperty("type", "like");
    });
  });

  describe("validate", () => {
    it("should return valid for correct data", () => {
      // Arrange
      const data = { userId, tweetId };

      // Act
      const result = likeService.validate(data);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return invalid when userId is missing", () => {
      // Arrange
      const data = { userId: null as any, tweetId };

      // Act
      const result = likeService.validate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("User ID is required");
    });

    it("should return invalid when tweetId is missing", () => {
      // Arrange
      const data = { userId, tweetId: null as any };

      // Act
      const result = likeService.validate(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Tweet ID is required");
    });
  });

  describe("sanitize", () => {
    it("should return like data unchanged", () => {
      // Arrange
      const likeData = mockLike as ILikeDocument;

      // Act
      const result = likeService.sanitize(likeData);

      // Assert
      expect(result).toEqual(likeData);
    });
  });
});
