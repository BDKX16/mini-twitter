import { TweetService } from "../services/TweetService";
import { TweetRepository } from "../infraestructure/database/TweetRepository";
import { UserRepository } from "../infraestructure/database/UserRepository";
import { ITweetDocument, IUserDocument } from "../types/models";
import { CreateTweetData, UpdateTweetData } from "../types/services";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../utils/errors";

// Mock de los repositorios
jest.mock("../infraestructure/database/TweetRepository");
jest.mock("../infraestructure/database/UserRepository");

describe("TweetService", () => {
  let tweetService: TweetService;
  let mockTweetRepository: jest.Mocked<TweetRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  // Datos de prueba hardcodeados
  const mockUserId = "60d5ecb54f8a2b1234567890";
  const mockTweetId = "60d5ecb54f8a2b1234567891";
  const mockAuthorId = "60d5ecb54f8a2b1234567892";

  const mockUser: Partial<IUserDocument> = {
    _id: mockUserId as any,
    firstName: "Juan",
    lastName: "Pérez",
    username: "juan_perez",
    confirmed: true,
    createdAt: new Date("2024-01-01"),
  };

  const mockAuthor: Partial<IUserDocument> = {
    _id: mockAuthorId as any,
    firstName: "Ana",
    lastName: "García",
    username: "ana_garcia",
    confirmed: true,
    createdAt: new Date("2024-01-01"),
  };

  const mockTweet: Partial<ITweetDocument> = {
    _id: mockTweetId as any,
    content: "Este es un tweet de prueba",
    author: mockAuthorId as any,
    likesCount: 0,
    retweetsCount: 0,
    repliesCount: 0,
    mentions: [],
    hashtags: ["test"],
    isDeleted: false,
    createdAt: new Date("2024-01-01"),
  };

  const mockTweetWithInteraction = {
    ...mockTweet,
    isLiked: false,
    isRetweeted: false,
  };

  const validCreateTweetData: CreateTweetData = {
    content: "Nuevo tweet de prueba",
    authorId: mockAuthorId as any,
    hashtags: ["prueba"],
    mentions: [],
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock repositories
    mockTweetRepository = new TweetRepository() as jest.Mocked<TweetRepository>;
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;

    // Create service instance with mocked repositories
    tweetService = new TweetService();
    (tweetService as any).tweetRepository = mockTweetRepository;
    (tweetService as any).userRepository = mockUserRepository;
  });

  describe("createTweet", () => {
    it("should create a new tweet successfully", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(
        mockAuthor as IUserDocument
      );
      mockTweetRepository.create.mockResolvedValue(mockTweet as ITweetDocument);
      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );

      // Act
      const result = await tweetService.createTweet(validCreateTweetData);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockAuthorId);
      expect(mockTweetRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Nuevo tweet de prueba",
          author: mockAuthorId,
          hashtags: ["prueba"],
          mentions: [],
          images: [],
          parentTweetId: undefined,
          createdAt: expect.any(Date),
        })
      );
      expect(result).toEqual(mockTweet);
    });

    it("should throw NotFoundError if author not found", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        tweetService.createTweet(validCreateTweetData)
      ).rejects.toThrow(NotFoundError);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockAuthorId);
      expect(mockTweetRepository.create).not.toHaveBeenCalled();
    });

    it("should throw ValidationError for empty content", async () => {
      // Arrange
      const invalidData: CreateTweetData = {
        content: "",
        authorId: mockAuthorId as any,
      };

      // Mock user exists so validation runs
      mockUserRepository.findById.mockResolvedValue(
        mockAuthor as IUserDocument
      );

      // Act & Assert
      await expect(tweetService.createTweet(invalidData)).rejects.toThrow(
        ValidationError
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockAuthorId);
      expect(mockTweetRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("getTweetById", () => {
    it("should return tweet by ID", async () => {
      // Arrange
      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );

      // Mock the dependencies for enrichTweetsWithUserData
      mockTweetRepository.aggregate = jest.fn().mockResolvedValue([]);
      (tweetService as any).likeRepository = {
        find: jest.fn().mockResolvedValue([]),
      };
      (tweetService as any).retweetRepository = {
        find: jest.fn().mockResolvedValue([]),
      };

      // Act
      const result = await tweetService.getTweetById(mockTweetId as any);

      // Assert
      expect(mockTweetRepository.findById).toHaveBeenCalledWith(mockTweetId);
      expect(result).toEqual(mockTweetWithInteraction);
    });

    it("should throw NotFoundError if tweet not found", async () => {
      // Arrange
      mockTweetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        tweetService.getTweetById(mockTweetId as any)
      ).rejects.toThrow(NotFoundError);

      expect(mockTweetRepository.findById).toHaveBeenCalledWith(mockTweetId);
    });
  });

  describe("getTweetsByUser", () => {
    it("should return tweets by user", async () => {
      // Arrange
      const mockTweets = [mockTweet] as ITweetDocument[];
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockTweetRepository.find.mockResolvedValue(mockTweets);

      // Mock the dependencies for enrichTweetsWithUserData
      mockTweetRepository.aggregate = jest.fn().mockResolvedValue([]);
      (tweetService as any).likeRepository = {
        find: jest.fn().mockResolvedValue([]),
      };
      (tweetService as any).retweetRepository = {
        find: jest.fn().mockResolvedValue([]),
      };

      // Act
      const result = await tweetService.getTweetsByUser(mockUserId as any);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockTweetRepository.find).toHaveBeenCalledWith(
        { author: mockUserId, parentTweetId: null },
        { limit: 20, skip: 0, sort: { createdAt: -1 } }
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTweetWithInteraction);
    });

    it("should throw NotFoundError if user not found", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        tweetService.getTweetsByUser(mockUserId as any)
      ).rejects.toThrow(NotFoundError);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockTweetRepository.find).not.toHaveBeenCalled();
    });
  });

  describe("updateTweet", () => {
    it("should update tweet successfully", async () => {
      // Arrange
      const updateData: UpdateTweetData = {
        content: "Tweet actualizado",
      };
      const updatedTweet = { ...mockTweet, ...updateData };

      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );
      mockTweetRepository.updateById.mockResolvedValue(
        updatedTweet as ITweetDocument
      );

      // Act
      const result = await tweetService.updateTweet(
        mockTweetId as any,
        mockAuthorId as any,
        updateData
      );

      // Assert
      expect(mockTweetRepository.findById).toHaveBeenCalledWith(mockTweetId);
      expect(mockTweetRepository.updateById).toHaveBeenCalledWith(
        mockTweetId,
        expect.objectContaining(updateData)
      );
      expect(result.content).toBe("Tweet actualizado");
    });

    it("should throw NotFoundError if tweet not found", async () => {
      // Arrange
      const updateData: UpdateTweetData = { content: "Nuevo contenido" };
      mockTweetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        tweetService.updateTweet(
          mockTweetId as any,
          mockAuthorId as any,
          updateData
        )
      ).rejects.toThrow(NotFoundError);

      expect(mockTweetRepository.findById).toHaveBeenCalledWith(mockTweetId);
      expect(mockTweetRepository.updateById).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenError if not tweet author", async () => {
      // Arrange
      const updateData: UpdateTweetData = { content: "Nuevo contenido" };
      const differentAuthor = "60d5ecb54f8a2b1234567999";

      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );

      // Act & Assert
      await expect(
        tweetService.updateTweet(
          mockTweetId as any,
          differentAuthor as any,
          updateData
        )
      ).rejects.toThrow(ForbiddenError);

      expect(mockTweetRepository.findById).toHaveBeenCalledWith(mockTweetId);
      expect(mockTweetRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe("deleteTweet", () => {
    it("should delete tweet successfully", async () => {
      // Arrange
      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );
      mockTweetRepository.deleteById.mockResolvedValue(true);

      // Act
      const result = await tweetService.deleteTweet(
        mockTweetId as any,
        mockAuthorId as any
      );

      // Assert
      expect(mockTweetRepository.findById).toHaveBeenCalledWith(mockTweetId);
      expect(mockTweetRepository.deleteById).toHaveBeenCalledWith(mockTweetId);
      expect(result).toEqual({ message: "Tweet deleted successfully" });
    });

    it("should throw NotFoundError if tweet not found", async () => {
      // Arrange
      mockTweetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        tweetService.deleteTweet(mockTweetId as any, mockAuthorId as any)
      ).rejects.toThrow(NotFoundError);

      expect(mockTweetRepository.findById).toHaveBeenCalledWith(mockTweetId);
      expect(mockTweetRepository.deleteById).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenError if not tweet author", async () => {
      // Arrange
      const differentAuthor = "60d5ecb54f8a2b1234567999";
      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );

      // Act & Assert
      await expect(
        tweetService.deleteTweet(mockTweetId as any, differentAuthor as any)
      ).rejects.toThrow(ForbiddenError);

      expect(mockTweetRepository.findById).toHaveBeenCalledWith(mockTweetId);
      expect(mockTweetRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe("getAllTweets", () => {
    it("should return all tweets with default options", async () => {
      // Arrange
      const mockTweets = [mockTweet] as ITweetDocument[];
      mockTweetRepository.find.mockResolvedValue(mockTweets);

      // Mock the dependencies for enrichTweetsWithUserData
      mockTweetRepository.aggregate = jest.fn().mockResolvedValue([]);
      (tweetService as any).likeRepository = {
        find: jest.fn().mockResolvedValue([]),
      };
      (tweetService as any).retweetRepository = {
        find: jest.fn().mockResolvedValue([]),
      };

      // Act
      const result = await tweetService.getAllTweets();

      // Assert
      expect(mockTweetRepository.find).toHaveBeenCalledWith(
        { parentTweetId: { $exists: false } },
        {
          sort: { createdAt: -1 },
          limit: 50,
          skip: 0,
        }
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTweetWithInteraction);
    });

    it("should return tweets with custom options", async () => {
      // Arrange
      const mockTweets = [mockTweet] as ITweetDocument[];
      const options = { limit: 10, skip: 5 };
      mockTweetRepository.find.mockResolvedValue(mockTweets);

      // Mock the dependencies for enrichTweetsWithUserData
      mockTweetRepository.aggregate = jest.fn().mockResolvedValue([]);
      (tweetService as any).likeRepository = {
        find: jest.fn().mockResolvedValue([]),
      };
      (tweetService as any).retweetRepository = {
        find: jest.fn().mockResolvedValue([]),
      };

      // Act
      const result = await tweetService.getAllTweets(undefined, options);

      // Assert
      expect(mockTweetRepository.find).toHaveBeenCalledWith(
        { parentTweetId: { $exists: false } },
        {
          sort: { createdAt: -1 },
          limit: 10,
          skip: 5,
        }
      );
      expect(result).toEqual([mockTweetWithInteraction]);
    });
  });

  describe("searchTweets", () => {
    it("should search tweets by content", async () => {
      // Arrange
      const searchQuery = "prueba";
      const mockTweets = [mockTweet] as ITweetDocument[];
      mockTweetRepository.find.mockResolvedValue(mockTweets);

      // Act
      const result = await tweetService.searchTweets(searchQuery);

      // Assert
      expect(mockTweetRepository.find).toHaveBeenCalledWith(
        {
          content: { $regex: searchQuery, $options: "i" },
          parentTweetId: { $exists: false },
        },
        {
          limit: 20,
          skip: 0,
          sort: { createdAt: -1 },
        }
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTweet);
    });

    it("should return empty array if no tweets found", async () => {
      // Arrange
      const searchQuery = "nonexistent";
      mockTweetRepository.find.mockResolvedValue([]);

      // Act
      const result = await tweetService.searchTweets(searchQuery);

      // Assert
      expect(mockTweetRepository.find).toHaveBeenCalledWith(
        {
          content: { $regex: searchQuery, $options: "i" },
          parentTweetId: { $exists: false },
        },
        {
          limit: 20,
          skip: 0,
          sort: { createdAt: -1 },
        }
      );
      expect(result).toEqual([]);
    });
  });

  describe("getTweetStats", () => {
    it("should return tweet stats", async () => {
      // Arrange
      const mockStats = {
        likesCount: 5,
        retweetsCount: 3,
        repliesCount: 2,
      };
      mockTweetRepository.findById.mockResolvedValue(
        mockTweet as ITweetDocument
      );
      mockTweetRepository.getTweetStats.mockResolvedValue(mockStats);

      // Act
      const result = await tweetService.getTweetStats(mockTweetId as any);

      // Assert
      expect(mockTweetRepository.findById).toHaveBeenCalledWith(mockTweetId);
      expect(mockTweetRepository.getTweetStats).toHaveBeenCalledWith(
        mockTweetId
      );
      expect(result).toEqual({
        tweetId: mockTweetId,
        likesCount: 5,
        retweetsCount: 3,
        repliesCount: 2,
        viewsCount: 0,
      });
    });

    it("should throw NotFoundError if tweet not found", async () => {
      // Arrange
      mockTweetRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        tweetService.getTweetStats(mockTweetId as any)
      ).rejects.toThrow(NotFoundError);

      expect(mockTweetRepository.findById).toHaveBeenCalledWith(mockTweetId);
      expect(mockTweetRepository.getTweetStats).not.toHaveBeenCalled();
    });
  });
});
