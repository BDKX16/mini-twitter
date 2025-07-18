/**
 * Servicio base con funcionalidades comunes
 * Provee métodos y utilidades compartidas entre servicios
 */
class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Validar parámetros requeridos
   */
  validateRequired(params, requiredFields) {
    const missing = requiredFields.filter((field) => !params[field]);
    if (missing.length > 0) {
      throw {
        type: "VALIDATION_ERROR",
        message: "Missing required fields",
        fields: missing,
      };
    }
  }

  /**
   * Validar formato de ObjectId
   */
  validateObjectId(id, fieldName = "id") {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw {
        type: "VALIDATION_ERROR",
        message: `Invalid ${fieldName} format`,
        field: fieldName,
        value: id,
      };
    }
  }

  /**
   * Validar email
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw {
        type: "VALIDATION_ERROR",
        message: "Invalid email format",
        field: "email",
        value: email,
      };
    }
  }

  /**
   * Sanitizar entrada de texto
   */
  sanitizeText(text) {
    if (typeof text !== "string") return text;
    return text.trim().replace(/\s+/g, " ");
  }

  /**
   * Validar opciones de paginación
   */
  validatePaginationOptions(options) {
    const { page = 1, limit = 10 } = options;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      throw {
        type: "VALIDATION_ERROR",
        message: "Page must be a positive number",
        field: "page",
        value: page,
      };
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw {
        type: "VALIDATION_ERROR",
        message: "Limit must be between 1 and 100",
        field: "limit",
        value: limit,
      };
    }

    return { page: pageNum, limit: limitNum };
  }

  /**
   * Manejar errores de manera consistente
   */
  handleError(error, operation, context = {}) {
    const errorResponse = {
      timestamp: new Date().toISOString(),
      operation,
      context,
      ...error,
    };

    // Log del error
    console.error(
      `[${this.constructor.name}] ${operation} Error:`,
      errorResponse
    );

    // Mapear tipos de error comunes
    switch (error.type) {
      case "VALIDATION_ERROR":
        return {
          ...errorResponse,
          statusCode: 400,
          userMessage: error.message || "Invalid input data",
        };

      case "NOT_FOUND":
        return {
          ...errorResponse,
          statusCode: 404,
          userMessage: error.message || "Resource not found",
        };

      case "UNAUTHORIZED":
        return {
          ...errorResponse,
          statusCode: 401,
          userMessage: error.message || "Unauthorized access",
        };

      case "FORBIDDEN":
        return {
          ...errorResponse,
          statusCode: 403,
          userMessage: error.message || "Access forbidden",
        };

      case "CONFLICT":
        return {
          ...errorResponse,
          statusCode: 409,
          userMessage: error.message || "Resource conflict",
        };

      case "DUPLICATE_KEY_ERROR":
        return {
          ...errorResponse,
          statusCode: 409,
          userMessage: `${error.field} already exists`,
        };

      case "CAST_ERROR":
        return {
          ...errorResponse,
          statusCode: 400,
          userMessage: `Invalid ${error.field} format`,
        };

      default:
        return {
          ...errorResponse,
          statusCode: 500,
          userMessage: "Internal server error",
        };
    }
  }

  /**
   * Formatear respuesta exitosa
   */
  formatResponse(data, message = "Success", meta = {}) {
    return {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Formatear respuesta con paginación
   */
  formatPaginatedResponse(result, message = "Success", meta = {}) {
    return {
      success: true,
      message,
      data: result.data,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Ejecutar operación con manejo de errores
   */
  async execute(operation, operationName, context = {}) {
    try {
      const result = await operation();
      return this.formatResponse(
        result,
        `${operationName} completed successfully`
      );
    } catch (error) {
      throw this.handleError(error, operationName, context);
    }
  }

  /**
   * Ejecutar operación con paginación
   */
  async executePaginated(operation, operationName, context = {}) {
    try {
      const result = await operation();
      return this.formatPaginatedResponse(
        result,
        `${operationName} completed successfully`
      );
    } catch (error) {
      throw this.handleError(error, operationName, context);
    }
  }

  /**
   * Verificar si un recurso existe
   */
  async ensureExists(id, resourceName = "Resource") {
    this.validateObjectId(id, "id");

    const resource = await this.repository.findById(id);
    if (!resource) {
      throw {
        type: "NOT_FOUND",
        message: `${resourceName} not found`,
        resourceId: id,
      };
    }

    return resource;
  }

  /**
   * Verificar autorización básica
   */
  ensureAuthorization(userId, resourceUserId, action = "access") {
    if (!userId) {
      throw {
        type: "UNAUTHORIZED",
        message: "Authentication required",
      };
    }

    if (userId.toString() !== resourceUserId.toString()) {
      throw {
        type: "FORBIDDEN",
        message: `Not authorized to ${action} this resource`,
      };
    }
  }

  /**
   * Crear filtros de búsqueda
   */
  buildSearchFilter(searchText, searchFields) {
    if (!searchText || !searchFields.length) return {};

    const regex = new RegExp(searchText, "i");
    return {
      $or: searchFields.map((field) => ({ [field]: regex })),
    };
  }

  /**
   * Crear filtros de fecha
   */
  buildDateFilter(startDate, endDate, dateField = "createdAt") {
    const filter = {};

    if (startDate) {
      filter[dateField] = { $gte: new Date(startDate) };
    }

    if (endDate) {
      filter[dateField] = {
        ...filter[dateField],
        $lte: new Date(endDate),
      };
    }

    return filter;
  }

  /**
   * Limpiar objeto de campos undefined/null
   */
  cleanObject(obj) {
    return Object.keys(obj).reduce((clean, key) => {
      if (obj[key] !== undefined && obj[key] !== null) {
        clean[key] = obj[key];
      }
      return clean;
    }, {});
  }

  /**
   * Generar slug único
   */
  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Validar límites de rate limiting
   */
  validateRateLimit(requests, maxRequests, timeWindow) {
    if (requests >= maxRequests) {
      throw {
        type: "RATE_LIMIT_EXCEEDED",
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${timeWindow}`,
        retryAfter: timeWindow,
      };
    }
  }

  /**
   * Obtener repositorio
   */
  getRepository() {
    return this.repository;
  }
}

module.exports = BaseService;
