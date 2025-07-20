import { FollowService } from "../services/FollowService";
import { FollowRepository } from "../infraestructure/database/FollowRepository";
import { UserRepository } from "../infraestructure/database/UserRepository";
import { IFollowDocument, IUserDocument } from "../types/models";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errors";

// Mock de los repositorios
jest.mock("../infraestructure/database/FollowRepository");
jest.mock("../infraestructure/database/UserRepository");

describe("FollowService", () => {
  let followService: FollowService;
  let mockFollowRepository: jest.Mocked<FollowRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  // Datos de prueba hardcodeados
  const mockFollowerId = "60d5ecb54f8a2b1234567890";
  const mockFollowedId = "60d5ecb54f8a2b1234567891";
  const mockFollowId = "60d5ecb54f8a2b1234567892";

  const mockFollower: Partial<IUserDocument> = {
    _id: mockFollowerId as any,
    firstName: "Juan",
    lastName: "Pérez",
    username: "juan_perez",
  };

  const mockFollowed: Partial<IUserDocument> = {
    _id: mockFollowedId as any,
    firstName: "Ana",
    lastName: "García",
    username: "ana_garcia",
  };

  const mockFollow: Partial<IFollowDocument> = {
    _id: mockFollowId as any,
    follower: mockFollowerId as any,
    following: mockFollowedId as any,
    createdAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock repositories
    mockFollowRepository =
      new FollowRepository() as jest.Mocked<FollowRepository>;
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;

    // Create service instance with mocked repositories
    followService = new FollowService();
    (followService as any).followRepository = mockFollowRepository;
    (followService as any).userRepository = mockUserRepository;
  });

  describe("followUser", () => {
    it("should follow a user successfully", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValueOnce(
        mockFollower as IUserDocument
      );
      mockUserRepository.findById.mockResolvedValueOnce(
        mockFollowed as IUserDocument
      );
      mockFollowRepository.findByFollowerAndFollowing.mockResolvedValue(null);
      mockFollowRepository.create.mockResolvedValue(
        mockFollow as IFollowDocument
      );

      // Act
      const result = await followService.followUser(
        mockFollowerId as any,
        mockFollowedId as any
      );

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowerId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowedId);
      expect(
        mockFollowRepository.findByFollowerAndFollowing
      ).toHaveBeenCalledWith(mockFollowerId, mockFollowedId);
      expect(mockFollowRepository.create).toHaveBeenCalledWith({
        follower: mockFollowerId,
        following: mockFollowedId,
        createdAt: expect.any(Date),
      });
      expect(result).toEqual(mockFollow);
    });

    it("should throw NotFoundError if follower not found", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        followService.followUser(mockFollowerId as any, mockFollowedId as any)
      ).rejects.toThrow(NotFoundError);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowerId);
      expect(mockFollowRepository.create).not.toHaveBeenCalled();
    });

    it("should throw NotFoundError if followed user not found", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValueOnce(
        mockFollower as IUserDocument
      );
      mockUserRepository.findById.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        followService.followUser(mockFollowerId as any, mockFollowedId as any)
      ).rejects.toThrow(NotFoundError);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowedId);
      expect(mockFollowRepository.create).not.toHaveBeenCalled();
    });

    it("should throw ValidationError if trying to follow yourself", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValueOnce(
        mockFollower as IUserDocument
      );
      mockUserRepository.findById.mockResolvedValueOnce(
        mockFollower as IUserDocument
      );

      // Act & Assert
      await expect(
        followService.followUser(mockFollowerId as any, mockFollowerId as any)
      ).rejects.toThrow(ValidationError);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowerId);
      expect(mockFollowRepository.create).not.toHaveBeenCalled();
    });

    it("should throw ConflictError if already following", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValueOnce(
        mockFollower as IUserDocument
      );
      mockUserRepository.findById.mockResolvedValueOnce(
        mockFollowed as IUserDocument
      );
      mockFollowRepository.findByFollowerAndFollowing.mockResolvedValue(
        mockFollow as IFollowDocument
      );

      // Act & Assert
      await expect(
        followService.followUser(mockFollowerId as any, mockFollowedId as any)
      ).rejects.toThrow(ConflictError);

      expect(
        mockFollowRepository.findByFollowerAndFollowing
      ).toHaveBeenCalledWith(mockFollowerId, mockFollowedId);
      expect(mockFollowRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("unfollowUser", () => {
    it("should unfollow a user successfully", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValueOnce(
        mockFollower as IUserDocument
      );
      mockUserRepository.findById.mockResolvedValueOnce(
        mockFollowed as IUserDocument
      );
      mockFollowRepository.findByFollowerAndFollowing.mockResolvedValue(
        mockFollow as IFollowDocument
      );
      mockFollowRepository.deleteById.mockResolvedValue(true);

      // Act
      const result = await followService.unfollowUser(
        mockFollowerId as any,
        mockFollowedId as any
      );

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowerId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowedId);
      expect(
        mockFollowRepository.findByFollowerAndFollowing
      ).toHaveBeenCalledWith(mockFollowerId, mockFollowedId);
      expect(mockFollowRepository.deleteById).toHaveBeenCalledWith(
        mockFollowId
      );
      expect(result).toEqual({ message: "User unfollowed successfully" });
    });

    it("should throw NotFoundError if follow relationship not found", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValueOnce(
        mockFollower as IUserDocument
      );
      mockUserRepository.findById.mockResolvedValueOnce(
        mockFollowed as IUserDocument
      );
      mockFollowRepository.findByFollowerAndFollowing.mockResolvedValue(null);

      // Act & Assert
      await expect(
        followService.unfollowUser(mockFollowerId as any, mockFollowedId as any)
      ).rejects.toThrow(NotFoundError);

      expect(
        mockFollowRepository.findByFollowerAndFollowing
      ).toHaveBeenCalledWith(mockFollowerId, mockFollowedId);
      expect(mockFollowRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe("getFollowers", () => {
    it("should return followers for a user", async () => {
      // Arrange
      const mockFollows = [mockFollow] as IFollowDocument[];
      mockUserRepository.findById.mockResolvedValue(
        mockFollowed as IUserDocument
      );
      mockFollowRepository.findFollowers.mockResolvedValue(mockFollows);
      mockFollowRepository.countFollowers.mockResolvedValue(1);

      // Act
      const result = await followService.getFollowers(mockFollowedId as any);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowedId);
      expect(mockFollowRepository.findFollowers).toHaveBeenCalledWith(
        mockFollowedId,
        { limit: 50, skip: 0, populate: "follower" }
      );
      expect(result.followers).toHaveLength(1);
      expect(result.totalFollowers).toBe(1);
      expect(result.userId).toBe(mockFollowedId);
    });
  });

  describe("getFollowing", () => {
    it("should return users that a user is following", async () => {
      // Arrange
      const mockFollows = [mockFollow] as IFollowDocument[];
      mockUserRepository.findById.mockResolvedValue(
        mockFollower as IUserDocument
      );
      mockFollowRepository.findFollowing.mockResolvedValue(mockFollows);
      mockFollowRepository.countFollowing.mockResolvedValue(1);

      // Act
      const result = await followService.getFollowing(mockFollowerId as any);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowerId);
      expect(mockFollowRepository.findFollowing).toHaveBeenCalledWith(
        mockFollowerId,
        { limit: 50, skip: 0, populate: "following" }
      );
      expect(result.following).toHaveLength(1);
      expect(result.totalFollowing).toBe(1);
      expect(result.userId).toBe(mockFollowerId);
    });
  });

  describe("isFollowing", () => {
    it("should return true if user is following another user", async () => {
      // Arrange
      mockFollowRepository.isFollowing.mockResolvedValue(true);

      // Act
      const result = await followService.isFollowing(
        mockFollowerId as any,
        mockFollowedId as any
      );

      // Assert
      expect(mockFollowRepository.isFollowing).toHaveBeenCalledWith(
        mockFollowerId,
        mockFollowedId
      );
      expect(result).toBe(true);
    });

    it("should return false if user is not following another user", async () => {
      // Arrange
      mockFollowRepository.isFollowing.mockResolvedValue(false);

      // Act
      const result = await followService.isFollowing(
        mockFollowerId as any,
        mockFollowedId as any
      );

      // Assert
      expect(mockFollowRepository.isFollowing).toHaveBeenCalledWith(
        mockFollowerId,
        mockFollowedId
      );
      expect(result).toBe(false);
    });
  });

  describe("getFollowStats", () => {
    it("should return follow stats for a user", async () => {
      // Arrange
      const mockFollowerCount = 5;
      const mockFollowingCount = 3;

      mockUserRepository.findById.mockResolvedValue(
        mockFollower as IUserDocument
      );
      mockFollowRepository.countFollowers.mockResolvedValue(mockFollowerCount);
      mockFollowRepository.countFollowing.mockResolvedValue(mockFollowingCount);

      // Act
      const result = await followService.getFollowStats(mockFollowerId as any);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowerId);
      expect(mockFollowRepository.countFollowers).toHaveBeenCalledWith(
        mockFollowerId
      );
      expect(mockFollowRepository.countFollowing).toHaveBeenCalledWith(
        mockFollowerId
      );
      expect(result).toEqual({
        followersCount: 5,
        followingCount: 3,
        mutualFollowersCount: 0,
      });
    });

    it("should throw NotFoundError if user not found", async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        followService.getFollowStats(mockFollowerId as any)
      ).rejects.toThrow(NotFoundError);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockFollowerId);
      expect(mockFollowRepository.countFollowers).not.toHaveBeenCalled();
    });
  });
});
