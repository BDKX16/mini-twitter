import { UserService } from "../services/UserService";
import { UserRepository } from "../infraestructure/database/UserRepository";
import { IUserDocument } from "../types/models";
import { CreateUserData, UpdateUserData } from "../types/services";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errors";

// Mock del UserRepository
jest.mock("../infraestructure/database/UserRepository");

describe("UserService", () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  // Datos de prueba hardcodeados
  const mockUser: Partial<IUserDocument> = {
    _id: "60d5ecb54f8a2b1234567890" as any,
    firstName: "Juan",
    lastName: "Pérez",
    username: "juan_perez",
    confirmed: true,
    createdAt: new Date("2024-01-01"),
  };

  const mockSanitizedUser = {
    _id: "60d5ecb54f8a2b1234567890" as any,
    firstName: "Juan",
    lastName: "Pérez",
    username: "juan_perez",
    confirmed: true,
    createdAt: new Date("2024-01-01"),
  };

  const validCreateUserData: CreateUserData = {
    firstName: "Ana",
    lastName: "García",
    username: "ana_garcia",
    password: "password123",
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock repository
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;

    // Create service instance with mocked repository
    userService = new UserService();
    (userService as any).userRepository = mockUserRepository;
  });

  describe("createUser", () => {
    it("should create a new user successfully", async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser as IUserDocument);

      // Act
      const result = await userService.createUser(validCreateUserData);

      // Assert
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        "ana_garcia"
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Ana",
          lastName: "García",
          username: "ana_garcia",
          confirmed: false,
          createdAt: expect.any(Date),
        })
      );
      expect(result).toEqual(mockSanitizedUser);
    });

    it("should throw ConflictError if username already exists", async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(
        mockUser as IUserDocument
      );

      // Act & Assert
      await expect(userService.createUser(validCreateUserData)).rejects.toThrow(
        ConflictError
      );

      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        "ana_garcia"
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("should throw ValidationError for invalid data", async () => {
      // Arrange
      const invalidData: CreateUserData = {
        firstName: "", // Invalid: empty firstName
        username: "test",
        password: "pass",
      };

      // Act & Assert
      await expect(userService.createUser(invalidData)).rejects.toThrow(
        ValidationError
      );

      expect(mockUserRepository.findByUsername).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("getUserById", () => {
    it("should return user by ID", async () => {
      // Arrange
      const userId = "60d5ecb54f8a2b1234567890";
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);

      // Act
      const result = await userService.getUserById(userId as any);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockSanitizedUser);
    });

    it("should throw NotFoundError if user not found", async () => {
      // Arrange
      const userId = "60d5ecb54f8a2b1234567890";
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUserById(userId as any)).rejects.toThrow(
        NotFoundError
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe("loginUser", () => {
    it("should login user with valid username", async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(
        mockUser as IUserDocument
      );

      // Act
      const result = await userService.loginUser("juan_perez");

      // Assert
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        "juan_perez"
      );
      expect(result).toEqual({
        user: mockSanitizedUser,
        token: "temporary-token",
      });
    });

    it("should throw NotFoundError for non-existent user", async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.loginUser("nonexistent_user")).rejects.toThrow(
        NotFoundError
      );

      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        "nonexistent_user"
      );
    });
  });

  describe("updateUser", () => {
    it("should update user successfully", async () => {
      // Arrange
      const userId = "60d5ecb54f8a2b1234567890";
      const updateData: UpdateUserData = {
        firstName: "Juan Carlos",
      };

      const updatedUser = { ...mockUser, ...updateData };

      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockUserRepository.updateById.mockResolvedValue(
        updatedUser as IUserDocument
      );

      // Act
      const result = await userService.updateUser(userId as any, updateData);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.updateById).toHaveBeenCalledWith(
        userId,
        updateData
      );
      expect(result.firstName).toBe("Juan Carlos");
    });

    it("should throw NotFoundError if user to update not found", async () => {
      // Arrange
      const userId = "60d5ecb54f8a2b1234567890";
      const updateData: UpdateUserData = { firstName: "Nuevo Nombre" };

      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.updateUser(userId as any, updateData)
      ).rejects.toThrow(NotFoundError);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe("checkUsernameAvailability", () => {
    it("should return true if username is available", async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);

      // Act
      const result = await userService.checkUsernameAvailability(
        "new_username"
      );

      // Assert
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        "new_username"
      );
      expect(result).toBe(true);
    });

    it("should return false if username is taken", async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(
        mockUser as IUserDocument
      );

      // Act
      const result = await userService.checkUsernameAvailability("juan_perez");

      // Assert
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        "juan_perez"
      );
      expect(result).toBe(false);
    });

    it("should return false on repository error", async () => {
      // Arrange
      mockUserRepository.findByUsername.mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await userService.checkUsernameAvailability("test_user");

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      // Arrange
      const userId = "60d5ecb54f8a2b1234567890";
      mockUserRepository.findById.mockResolvedValue(mockUser as IUserDocument);
      mockUserRepository.deleteById.mockResolvedValue(true);

      // Act
      const result = await userService.deleteUser(userId as any);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.deleteById).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ message: "User deleted successfully" });
    });

    it("should throw NotFoundError if user to delete not found", async () => {
      // Arrange
      const userId = "60d5ecb54f8a2b1234567890";
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.deleteUser(userId as any)).rejects.toThrow(
        NotFoundError
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe("searchUsers", () => {
    it("should search users by term", async () => {
      // Arrange
      const searchTerm = "juan";
      const mockUsers = [mockUser] as IUserDocument[];
      mockUserRepository.searchUsers.mockResolvedValue(mockUsers);

      // Act
      const result = await userService.searchUsers(searchTerm);

      // Assert
      expect(mockUserRepository.searchUsers).toHaveBeenCalledWith(searchTerm, {
        limit: 20,
        skip: 0,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockSanitizedUser);
    });

    it("should return empty array if no users found", async () => {
      // Arrange
      const searchTerm = "nonexistent";
      mockUserRepository.searchUsers.mockResolvedValue([]);

      // Act
      const result = await userService.searchUsers(searchTerm);

      // Assert
      expect(mockUserRepository.searchUsers).toHaveBeenCalledWith(searchTerm, {
        limit: 20,
        skip: 0,
      });
      expect(result).toEqual([]);
    });
  });

  describe("sanitizeUser", () => {
    it("should remove sensitive fields from user data", () => {
      // Arrange
      const userWithSensitiveData = {
        ...mockUser,
        password: "secret123",
        __v: 1,
      } as IUserDocument;

      // Act
      const result = (userService as any).sanitizeUser(userWithSensitiveData);

      // Assert
      expect(result.password).toBeUndefined();
      expect(result.__v).toBeUndefined();
      expect(result._id).toBeDefined();
      expect(result.username).toBe("juan_perez");
    });
  });
});
