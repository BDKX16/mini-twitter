const { RateLimitError } = require("../utils/errors");

class RateLimiter {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  // Rate limiter genérico
  async checkRateLimit(key, windowMs, maxRequests, identifier = "request") {
    try {
      const now = Date.now();
      const window = Math.floor(now / windowMs);
      const redisKey = `rate_limit:${key}:${window}`;

      // Incrementar contador
      const current = await this.redis.incr(redisKey);

      // Establecer expiración en la primera solicitud
      if (current === 1) {
        await this.redis.expire(redisKey, Math.ceil(windowMs / 1000));
      }

      // Verificar si se excedió el límite
      if (current > maxRequests) {
        const ttl = await this.redis.ttl(redisKey);
        const resetTime = now + ttl * 1000;

        throw new RateLimitError(
          `Rate limit exceeded for ${identifier}. Try again in ${ttl} seconds.`,
          {
            limit: maxRequests,
            current,
            windowMs,
            resetTime,
          }
        );
      }

      return {
        limit: maxRequests,
        current,
        remaining: maxRequests - current,
        resetTime: now + (windowMs - (now % windowMs)),
      };
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      // Si Redis falla, permitir la solicitud pero registrar el error
      console.error("Rate limiter error:", error);
      return {
        limit: maxRequests,
        current: 0,
        remaining: maxRequests,
        resetTime: Date.now() + windowMs,
      };
    }
  }

  // Rate limiter por IP
  createIPRateLimiter(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    return async (req, res, next) => {
      try {
        const ip =
          req.ip ||
          req.connection.remoteAddress ||
          req.headers["x-forwarded-for"];
        const key = `ip:${ip}`;

        const result = await this.checkRateLimit(
          key,
          windowMs,
          maxRequests,
          "IP"
        );

        // Agregar headers de rate limiting
        res.set({
          "X-RateLimit-Limit": result.limit,
          "X-RateLimit-Remaining": result.remaining,
          "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
        });

        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          res.status(429).json({
            success: false,
            error: "Rate limit exceeded",
            message: error.message,
            retryAfter: Math.ceil((error.resetTime - Date.now()) / 1000),
          });
        } else {
          next(error);
        }
      }
    };
  }

  // Rate limiter por usuario
  createUserRateLimiter(windowMs = 15 * 60 * 1000, maxRequests = 50) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return next(); // Si no hay usuario, usar IP limiter
        }

        const key = `user:${userId}`;

        const result = await this.checkRateLimit(
          key,
          windowMs,
          maxRequests,
          "user"
        );

        // Agregar headers de rate limiting
        res.set({
          "X-RateLimit-Limit": result.limit,
          "X-RateLimit-Remaining": result.remaining,
          "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
        });

        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          res.status(429).json({
            success: false,
            error: "Rate limit exceeded",
            message: error.message,
            retryAfter: Math.ceil((error.resetTime - Date.now()) / 1000),
          });
        } else {
          next(error);
        }
      }
    };
  }

  // Rate limiter específico para acciones (tweets, likes, etc.)
  createActionRateLimiter(action, windowMs = 60 * 1000, maxRequests = 10) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return next(); // Si no hay usuario, usar IP limiter
        }

        const key = `action:${action}:${userId}`;

        const result = await this.checkRateLimit(
          key,
          windowMs,
          maxRequests,
          `${action} action`
        );

        // Agregar headers de rate limiting
        res.set({
          "X-RateLimit-Limit": result.limit,
          "X-RateLimit-Remaining": result.remaining,
          "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
          "X-RateLimit-Action": action,
        });

        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          res.status(429).json({
            success: false,
            error: "Rate limit exceeded",
            message: error.message,
            action: action,
            retryAfter: Math.ceil((error.resetTime - Date.now()) / 1000),
          });
        } else {
          next(error);
        }
      }
    };
  }

  // Rate limiter progresivo (aumenta penalización con violaciones)
  createProgressiveRateLimiter(
    baseWindowMs = 15 * 60 * 1000,
    baseMaxRequests = 100
  ) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const ip =
          req.ip ||
          req.connection.remoteAddress ||
          req.headers["x-forwarded-for"];
        const identifier = userId ? `user:${userId}` : `ip:${ip}`;

        // Verificar violaciones previas
        const violationKey = `violations:${identifier}`;
        const violations = (await this.redis.get(violationKey)) || 0;

        // Calcular límites ajustados
        const penaltyMultiplier = Math.pow(2, violations);
        const adjustedWindowMs = baseWindowMs * penaltyMultiplier;
        const adjustedMaxRequests = Math.max(
          1,
          Math.floor(baseMaxRequests / penaltyMultiplier)
        );

        const result = await this.checkRateLimit(
          identifier,
          adjustedWindowMs,
          adjustedMaxRequests,
          "progressive"
        );

        // Agregar headers de rate limiting
        res.set({
          "X-RateLimit-Limit": result.limit,
          "X-RateLimit-Remaining": result.remaining,
          "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
          "X-RateLimit-Violations": violations,
          "X-RateLimit-Penalty": penaltyMultiplier,
        });

        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          // Incrementar violaciones
          const userId = req.user?.id;
          const ip =
            req.ip ||
            req.connection.remoteAddress ||
            req.headers["x-forwarded-for"];
          const identifier = userId ? `user:${userId}` : `ip:${ip}`;
          const violationKey = `violations:${identifier}`;

          await this.redis.incr(violationKey);
          await this.redis.expire(violationKey, 24 * 60 * 60); // 24 horas

          res.status(429).json({
            success: false,
            error: "Rate limit exceeded",
            message: error.message,
            retryAfter: Math.ceil((error.resetTime - Date.now()) / 1000),
          });
        } else {
          next(error);
        }
      }
    };
  }

  // Rate limiter por endpoint específico
  createEndpointRateLimiter(endpoint, windowMs = 60 * 1000, maxRequests = 20) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const ip =
          req.ip ||
          req.connection.remoteAddress ||
          req.headers["x-forwarded-for"];
        const identifier = userId ? `user:${userId}` : `ip:${ip}`;
        const key = `endpoint:${endpoint}:${identifier}`;

        const result = await this.checkRateLimit(
          key,
          windowMs,
          maxRequests,
          `${endpoint} endpoint`
        );

        // Agregar headers de rate limiting
        res.set({
          "X-RateLimit-Limit": result.limit,
          "X-RateLimit-Remaining": result.remaining,
          "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
          "X-RateLimit-Endpoint": endpoint,
        });

        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          res.status(429).json({
            success: false,
            error: "Rate limit exceeded",
            message: error.message,
            endpoint: endpoint,
            retryAfter: Math.ceil((error.resetTime - Date.now()) / 1000),
          });
        } else {
          next(error);
        }
      }
    };
  }

  // Rate limiter específico para autenticación
  createAuthRateLimiter(windowMs = 15 * 60 * 1000, maxRequests = 5) {
    return async (req, res, next) => {
      try {
        const ip =
          req.ip ||
          req.connection.remoteAddress ||
          req.headers["x-forwarded-for"];
        const { username, email } = req.body;

        // Combinar IP y username/email para prevenir ataques distribuidos
        const identifier = `${ip}:${username || email || "unknown"}`;
        const key = `auth:${identifier}`;

        const result = await this.checkRateLimit(
          key,
          windowMs,
          maxRequests,
          "authentication"
        );

        // Agregar headers de rate limiting
        res.set({
          "X-RateLimit-Limit": result.limit,
          "X-RateLimit-Remaining": result.remaining,
          "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
        });

        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          res.status(429).json({
            success: false,
            error: "Authentication rate limit exceeded",
            message:
              "Too many authentication attempts. Please try again later.",
            retryAfter: Math.ceil((error.resetTime - Date.now()) / 1000),
          });
        } else {
          next(error);
        }
      }
    };
  }

  // Cleanup de datos expirados (para ejecutar periódicamente)
  async cleanup() {
    try {
      const keys = await this.redis.keys("rate_limit:*");
      const expiredKeys = [];

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await this.redis.del(expiredKeys);
        console.log(`Cleaned up ${expiredKeys.length} expired rate limit keys`);
      }
    } catch (error) {
      console.error("Rate limiter cleanup error:", error);
    }
  }

  // Obtener estadísticas de rate limiting
  async getStats(identifier) {
    try {
      const keys = await this.redis.keys(`rate_limit:${identifier}:*`);
      const stats = {};

      for (const key of keys) {
        const value = await this.redis.get(key);
        const ttl = await this.redis.ttl(key);
        stats[key] = {
          current: parseInt(value),
          ttl: ttl,
        };
      }

      return stats;
    } catch (error) {
      console.error("Error getting rate limit stats:", error);
      return {};
    }
  }

  // Resetear límites para un identificador específico
  async resetLimits(identifier) {
    try {
      const keys = await this.redis.keys(`rate_limit:${identifier}:*`);
      if (keys.length > 0) {
        await this.redis.del(keys);
        console.log(`Reset rate limits for ${identifier}`);
      }
    } catch (error) {
      console.error("Error resetting rate limits:", error);
    }
  }
}

module.exports = RateLimiter;
