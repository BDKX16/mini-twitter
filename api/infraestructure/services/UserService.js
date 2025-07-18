const BaseService = require("./BaseService");
const { getRepository } = require("../database");

/**
 * Servicio para la gestión de usuarios
 * Contiene toda la lógica de negocio relacionada con usuarios
 */
class UserService extends BaseService {
  constructor() {
    super(getRepository("user"));
  }

  /**
   * Crear un nuevo usuario
   */
  async createUser(userData) {
    return await this.execute(
      async () => {
        // Validar datos requeridos
        this.validateRequired(userData, ["name", "email"]);

        // Validar formato de email
        this.validateEmail(userData.email);

        // Verificar unicidad del email
        const emailExists = await this.repository.findByEmail(userData.email);
        if (emailExists) {
          throw {
            type: "CONFLICT",
            message: "Email already exists",
            field: "email",
            value: userData.email,
          };
        }

        // Limpiar y preparar datos
        const cleanData = this.cleanObject({
          name: this.sanitizeText(userData.name),
          email: userData.email.toLowerCase(),
          firstName: userData.firstName
            ? this.sanitizeText(userData.firstName)
            : undefined,
          lastName: userData.lastName
            ? this.sanitizeText(userData.lastName)
            : undefined,
          phone: userData.phone,
          address: userData.address
            ? this.sanitizeText(userData.address)
            : undefined,
          password: userData.password,
          confirmed: userData.confirmed || false,
        });

        // Crear usuario
        const user = await this.repository.create(cleanData);

        // Remover password de la respuesta
        const { password, ...userResponse } = user.toObject();
        return userResponse;
      },
      "CREATE_USER",
      { email: userData.email }
    );
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(userId) {
    return await this.execute(
      async () => {
        this.validateObjectId(userId);

        const user = await this.repository.findById(userId, {
          select: "-password -resetPasswordToken",
        });

        if (!user) {
          throw {
            type: "NOT_FOUND",
            message: "User not found",
            userId,
          };
        }

        return user;
      },
      "GET_USER_BY_ID",
      { userId }
    );
  }

  /**
   * Obtener usuario por email
   */
  async getUserByEmail(email) {
    return await this.execute(
      async () => {
        this.validateEmail(email);

        const user = await this.repository.findByEmail(email);

        if (!user) {
          throw {
            type: "NOT_FOUND",
            message: "User not found",
            email,
          };
        }

        // Remover campos sensibles
        const { password, resetPasswordToken, ...userResponse } =
          user.toObject();
        return userResponse;
      },
      "GET_USER_BY_EMAIL",
      { email }
    );
  }

  /**
   * Obtener lista de usuarios con paginación
   */
  async getUsers(options = {}) {
    return await this.executePaginated(
      async () => {
        const { page, limit } = this.validatePaginationOptions(options);

        const filter = {};

        // Filtro por confirmación
        if (options.confirmed !== undefined) {
          filter.confirmed = options.confirmed;
        }

        // Filtro por ubicación
        if (options.location) {
          const locationRegex = new RegExp(options.location, "i");
          filter.address = locationRegex;
        }

        // Filtro de búsqueda
        if (options.search) {
          const searchFilter = this.buildSearchFilter(options.search, [
            "name",
            "firstName",
            "lastName",
            "email",
          ]);
          Object.assign(filter, searchFilter);
        }

        // Filtro de fecha
        if (options.startDate || options.endDate) {
          const dateFilter = this.buildDateFilter(
            options.startDate,
            options.endDate
          );
          Object.assign(filter, dateFilter);
        }

        return await this.repository.findMany(filter, {
          page,
          limit,
          sort: options.sort || { createdAt: -1 },
          select: "-password -resetPasswordToken",
        });
      },
      "GET_USERS",
      { options }
    );
  }

  /**
   * Actualizar usuario
   */
  async updateUser(userId, updateData, requestingUserId) {
    return await this.execute(
      async () => {
        this.validateObjectId(userId);

        // Verificar autorización
        this.ensureAuthorization(requestingUserId, userId, "update");

        // Verificar que el usuario existe
        await this.ensureExists(userId, "User");

        // Limpiar datos de actualización
        const cleanData = this.cleanObject({
          name: updateData.name
            ? this.sanitizeText(updateData.name)
            : undefined,
          firstName: updateData.firstName
            ? this.sanitizeText(updateData.firstName)
            : undefined,
          lastName: updateData.lastName
            ? this.sanitizeText(updateData.lastName)
            : undefined,
          phone: updateData.phone,
          address: updateData.address
            ? this.sanitizeText(updateData.address)
            : undefined,
        });

        // No permitir actualizar email directamente
        if (updateData.email) {
          throw {
            type: "FORBIDDEN",
            message: "Email cannot be updated directly",
          };
        }

        // Actualizar usuario
        const updatedUser = await this.repository.updateById(userId, cleanData);

        // Remover campos sensibles
        const { password, resetPasswordToken, ...userResponse } =
          updatedUser.toObject();
        return userResponse;
      },
      "UPDATE_USER",
      { userId, requestingUserId }
    );
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(userId, requestingUserId) {
    return await this.execute(
      async () => {
        this.validateObjectId(userId);

        // Verificar autorización
        this.ensureAuthorization(requestingUserId, userId, "delete");

        // Verificar que el usuario existe
        await this.ensureExists(userId, "User");

        // Eliminar usuario
        await this.repository.deleteById(userId);

        return { message: "User deleted successfully" };
      },
      "DELETE_USER",
      { userId, requestingUserId }
    );
  }

  /**
   * Buscar usuarios por nombre
   */
  async searchUsers(searchText, options = {}) {
    return await this.executePaginated(
      async () => {
        if (!searchText || searchText.trim().length < 2) {
          throw {
            type: "VALIDATION_ERROR",
            message: "Search text must be at least 2 characters long",
          };
        }

        const { page, limit } = this.validatePaginationOptions(options);

        return await this.repository.searchByName(searchText, {
          page,
          limit,
          select: "-password -resetPasswordToken",
        });
      },
      "SEARCH_USERS",
      { searchText, options }
    );
  }

  /**
   * Confirmar usuario
   */
  async confirmUser(userId) {
    return await this.execute(
      async () => {
        this.validateObjectId(userId);

        const user = await this.repository.confirmUser(userId);

        if (!user) {
          throw {
            type: "NOT_FOUND",
            message: "User not found",
            userId,
          };
        }

        return { message: "User confirmed successfully" };
      },
      "CONFIRM_USER",
      { userId }
    );
  }

  /**
   * Obtener usuarios activos
   */
  async getActiveUsers(options = {}) {
    return await this.executePaginated(
      async () => {
        const { page, limit } = this.validatePaginationOptions(options);

        return await this.repository.getActiveUsers({
          page,
          limit,
          select: "-password -resetPasswordToken",
          sort: options.sort || { createdAt: -1 },
        });
      },
      "GET_ACTIVE_USERS",
      { options }
    );
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStatistics() {
    return await this.execute(async () => {
      const [stats, registrationsByMonth] = await Promise.all([
        this.repository.getUserStats(),
        this.repository.getUserRegistrationsByMonth(),
      ]);

      return {
        overview: stats,
        registrationsByMonth,
      };
    }, "GET_USER_STATISTICS");
  }

  /**
   * Obtener usuarios recientes
   */
  async getRecentUsers(days = 7, options = {}) {
    return await this.executePaginated(
      async () => {
        const { page, limit } = this.validatePaginationOptions(options);

        return await this.repository.getRecentUsers(days, {
          page,
          limit,
          select: "-password -resetPasswordToken",
        });
      },
      "GET_RECENT_USERS",
      { days, options }
    );
  }

  /**
   * Obtener usuarios por ubicación
   */
  async getUsersByLocation(location, options = {}) {
    return await this.executePaginated(
      async () => {
        if (!location || location.trim().length < 2) {
          throw {
            type: "VALIDATION_ERROR",
            message: "Location must be at least 2 characters long",
          };
        }

        const { page, limit } = this.validatePaginationOptions(options);

        return await this.repository.getUsersByLocation(location, {
          page,
          limit,
          select: "-password -resetPasswordToken",
        });
      },
      "GET_USERS_BY_LOCATION",
      { location, options }
    );
  }

  /**
   * Encontrar usuarios similares por ubicación
   */
  async findSimilarUsers(userId, limit = 10) {
    return await this.execute(
      async () => {
        this.validateObjectId(userId);

        // Verificar que el usuario existe
        await this.ensureExists(userId, "User");

        const similarUsers = await this.repository.findSimilarUsersByLocation(
          userId,
          limit
        );

        return similarUsers;
      },
      "FIND_SIMILAR_USERS",
      { userId, limit }
    );
  }

  /**
   * Limpiar usuarios no confirmados antiguos
   */
  async cleanupUnconfirmedUsers(daysOld = 30) {
    return await this.execute(
      async () => {
        const result = await this.repository.cleanupUnconfirmedUsers(daysOld);

        return {
          message: `Cleaned up ${result.deletedCount} unconfirmed users older than ${daysOld} days`,
          deletedCount: result.deletedCount,
          cutoffDate: result.cutoffDate,
        };
      },
      "CLEANUP_UNCONFIRMED_USERS",
      { daysOld }
    );
  }

  /**
   * Validar si un email es único
   */
  async validateEmailUniqueness(email, excludeUserId = null) {
    return await this.execute(
      async () => {
        this.validateEmail(email);

        const isUnique = await this.repository.isEmailUnique(
          email,
          excludeUserId
        );

        return {
          email,
          isUnique,
          message: isUnique ? "Email is available" : "Email is already taken",
        };
      },
      "VALIDATE_EMAIL_UNIQUENESS",
      { email, excludeUserId }
    );
  }

  /**
   * Actualizar último acceso del usuario
   */
  async updateLastAccess(userId) {
    return await this.execute(
      async () => {
        this.validateObjectId(userId);

        await this.repository.updateLastAccess(userId);

        return { message: "Last access updated successfully" };
      },
      "UPDATE_LAST_ACCESS",
      { userId }
    );
  }
}

module.exports = UserService;
