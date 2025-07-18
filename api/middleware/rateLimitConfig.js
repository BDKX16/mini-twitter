const RateLimiter = require("./rateLimiter");
const redisClient = require("../config/redis");

// Instancia del rate limiter
const rateLimiter = new RateLimiter(redisClient);

// Rate limiters predefinidos
const rateLimiters = {
  // Rate limiter general por IP (100 requests por 15 minutos)
  general: rateLimiter.createIPRateLimiter(15 * 60 * 1000, 100),

  // Rate limiter para usuarios autenticados (200 requests por 15 minutos)
  authenticated: rateLimiter.createUserRateLimiter(15 * 60 * 1000, 200),

  // Rate limiter estricto para autenticación (5 intentos por 15 minutos)
  auth: rateLimiter.createAuthRateLimiter(15 * 60 * 1000, 5),

  // Rate limiter progresivo para usuarios problemáticos
  progressive: rateLimiter.createProgressiveRateLimiter(15 * 60 * 1000, 100),

  // Rate limiters específicos por acción
  actions: {
    // Crear tweets (10 por minuto)
    createTweet: rateLimiter.createActionRateLimiter("tweet", 60 * 1000, 10),

    // Likes (30 por minuto)
    like: rateLimiter.createActionRateLimiter("like", 60 * 1000, 30),

    // Retweets (20 por minuto)
    retweet: rateLimiter.createActionRateLimiter("retweet", 60 * 1000, 20),

    // Follows (15 por minuto)
    follow: rateLimiter.createActionRateLimiter("follow", 60 * 1000, 15),

    // Búsquedas (60 por minuto)
    search: rateLimiter.createActionRateLimiter("search", 60 * 1000, 60),

    // Actualización de perfil (3 por minuto)
    updateProfile: rateLimiter.createActionRateLimiter(
      "update_profile",
      60 * 1000,
      3
    ),

    // Cambio de contraseña (2 por hora)
    changePassword: rateLimiter.createActionRateLimiter(
      "change_password",
      60 * 60 * 1000,
      2
    ),

    // Bulk operations (5 por minuto)
    bulkFollow: rateLimiter.createActionRateLimiter(
      "bulk_follow",
      60 * 1000,
      5
    ),
    bulkUnfollow: rateLimiter.createActionRateLimiter(
      "bulk_unfollow",
      60 * 1000,
      5
    ),
  },

  // Rate limiters por endpoint
  endpoints: {
    // Timeline endpoints (más permisivos)
    timeline: rateLimiter.createEndpointRateLimiter("timeline", 60 * 1000, 60),

    // User registration (muy restrictivo)
    register: rateLimiter.createEndpointRateLimiter("register", 60 * 1000, 3),

    // Password reset (restrictivo)
    passwordReset: rateLimiter.createEndpointRateLimiter(
      "password_reset",
      60 * 1000,
      5
    ),

    // Email verification (restrictivo)
    emailVerification: rateLimiter.createEndpointRateLimiter(
      "email_verification",
      60 * 1000,
      10
    ),
  },
};

// Middleware combinado para aplicar múltiples rate limiters
const createCombinedRateLimiter = (...limiters) => {
  return async (req, res, next) => {
    try {
      // Aplicar cada rate limiter secuencialmente
      for (const limiter of limiters) {
        await new Promise((resolve, reject) => {
          limiter(req, res, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Rate limiters específicos para diferentes tipos de endpoints
const endpointLimiters = {
  // Para endpoints públicos (sin autenticación)
  public: createCombinedRateLimiter(
    rateLimiters.general,
    rateLimiters.progressive
  ),

  // Para endpoints de autenticación
  auth: createCombinedRateLimiter(rateLimiters.general, rateLimiters.auth),

  // Para endpoints de usuarios autenticados
  authenticated: createCombinedRateLimiter(
    rateLimiters.general,
    rateLimiters.authenticated
  ),

  // Para acciones críticas (crear contenido)
  criticalAction: createCombinedRateLimiter(
    rateLimiters.general,
    rateLimiters.authenticated,
    rateLimiters.progressive
  ),

  // Para bulk operations
  bulkOperation: createCombinedRateLimiter(
    rateLimiters.general,
    rateLimiters.authenticated,
    rateLimiters.actions.bulkFollow // Se puede cambiar según la acción
  ),
};

// Función para aplicar rate limiting específico por ruta
const applyRateLimiting = (type, action = null) => {
  const limiters = [endpointLimiters[type]];

  // Agregar rate limiter específico de acción si se especifica
  if (action && rateLimiters.actions[action]) {
    limiters.push(rateLimiters.actions[action]);
  }

  return createCombinedRateLimiter(...limiters.filter(Boolean));
};

// Middleware para agregar información de rate limiting a todas las respuestas
const addRateLimitHeaders = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    // Agregar información de rate limiting si está disponible
    if (res.get("X-RateLimit-Limit")) {
      if (data && typeof data === "object") {
        data.rateLimitInfo = {
          limit: parseInt(res.get("X-RateLimit-Limit")),
          remaining: parseInt(res.get("X-RateLimit-Remaining")),
          resetTime: res.get("X-RateLimit-Reset"),
          action: res.get("X-RateLimit-Action"),
          endpoint: res.get("X-RateLimit-Endpoint"),
        };
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

// Función para limpiar datos expirados periódicamente
const startCleanupSchedule = () => {
  // Ejecutar cleanup cada hora
  setInterval(async () => {
    await rateLimiter.cleanup();
  }, 60 * 60 * 1000);

  console.log("Rate limiter cleanup schedule started");
};

module.exports = {
  rateLimiter,
  rateLimiters,
  endpointLimiters,
  applyRateLimiting,
  addRateLimitHeaders,
  startCleanupSchedule,
  createCombinedRateLimiter,
};
