/**
 * Rate Limit Configuration - TypeScript version
 * Predefined rate limiting configurations for different endpoints
 */

import { Request, Response, NextFunction } from "express";
import { RateLimiter } from "./rateLimiter";
import redisClient from "../config/redis";
import { AuthenticatedRequest } from "../types/controllers";

// Variable para la instancia del rate limiter que se creará después de conectar Redis
let rateLimiter: RateLimiter | null = null;

// Función para inicializar el rate limiter una vez que Redis esté conectado
const initializeRateLimiter = (): RateLimiter | null => {
  if (!rateLimiter && redisClient.isConnected) {
    try {
      rateLimiter = new RateLimiter(redisClient.getClient());
    } catch (error) {
      console.error("Error initializing RateLimiter in config:", error);
    }
  }
  return rateLimiter;
};

// Función helper para crear rate limiters de manera lazy
const createLazyRateLimiter = (method: string, ...args: any[]) => {
  return (
    req: Request | AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const limiter = initializeRateLimiter();
    if (limiter && typeof (limiter as any)[method] === "function") {
      return (limiter as any)[method](...args)(req, res, next);
    }
    // Si Redis no está disponible, continuar sin rate limiting
    next();
  };
};

// Rate limiters predefinidos - CONFIGURACIÓN ACTUALIZADA: 3 requests, 10 minutos lockout
export const rateLimiters = {
  // Rate limiter general por IP (3 requests por 10 minutos)
  general: createLazyRateLimiter("createIPRateLimiter", 10 * 60 * 1000, 3),

  // Rate limiter para usuarios autenticados (3 requests por 10 minutos)
  authenticated: createLazyRateLimiter(
    "createUserRateLimiter",
    10 * 60 * 1000,
    3
  ),

  // Rate limiter estricto para autenticación (3 requests por 10 minutos)
  auth: createLazyRateLimiter("createAuthRateLimiter", 10 * 60 * 1000, 3),

  // Rate limiter progresivo para usuarios problemáticos (3 requests por 10 minutos)
  progressive: createLazyRateLimiter(
    "createProgressiveRateLimiter",
    10 * 60 * 1000,
    3
  ),

  // Rate limiters específicos por acción - TODOS CON 3 requests máximo, 10 minutos lockout
  actions: {
    // Crear tweets (3 por 10 minutos)
    createTweet: createLazyRateLimiter(
      "createActionRateLimiter",
      "tweet",
      10 * 60 * 1000,
      3
    ),

    // Likes (3 por 10 minutos)
    like: createLazyRateLimiter(
      "createActionRateLimiter",
      "like",
      10 * 60 * 1000,
      3
    ),

    // Retweets (3 por 10 minutos)
    retweet: createLazyRateLimiter(
      "createActionRateLimiter",
      "retweet",
      10 * 60 * 1000,
      3
    ),

    // Follows (3 por 10 minutos)
    follow: createLazyRateLimiter(
      "createActionRateLimiter",
      "follow",
      10 * 60 * 1000,
      3
    ),

    // Búsquedas (3 por 10 minutos)
    search: createLazyRateLimiter(
      "createActionRateLimiter",
      "search",
      10 * 60 * 1000,
      3
    ),

    // Actualización de perfil (3 por 10 minutos)
    updateProfile: createLazyRateLimiter(
      "createActionRateLimiter",
      "update_profile",
      10 * 60 * 1000,
      3
    ),

    // Cambio de contraseña (3 por 10 minutos)
    changePassword: createLazyRateLimiter(
      "createActionRateLimiter",
      "change_password",
      10 * 60 * 1000,
      3
    ),

    // Bulk operations (1 por 10 minutos - más restrictivo)
    bulkFollow: createLazyRateLimiter(
      "createActionRateLimiter",
      "bulk_follow",
      10 * 60 * 1000,
      1
    ),
    bulkUnfollow: createLazyRateLimiter(
      "createActionRateLimiter",
      "bulk_unfollow",
      10 * 60 * 1000,
      1
    ),
  },

  // Rate limiters por endpoint - TODOS CON 3 requests máximo, 10 minutos lockout
  endpoints: {
    // Timeline endpoints (3 por 10 minutos)
    timeline: createLazyRateLimiter(
      "createEndpointRateLimiter",
      "timeline",
      10 * 60 * 1000,
      3
    ),

    // User registration (3 por 10 minutos)
    register: createLazyRateLimiter(
      "createEndpointRateLimiter",
      "register",
      10 * 60 * 1000,
      3
    ),

    // Password reset (3 por 10 minutos)
    passwordReset: createLazyRateLimiter(
      "createEndpointRateLimiter",
      "password_reset",
      10 * 60 * 1000,
      3
    ),

    // Email verification (1 por 10 minutos - más restrictivo)
    emailVerification: createLazyRateLimiter(
      "createEndpointRateLimiter",
      "email_verification",
      10 * 60 * 1000,
      1
    ),
  },
};

// Middleware combinado para aplicar múltiples rate limiters
export const createCombinedRateLimiter = (...limiters: any[]) => {
  return async (
    req: Request | AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Aplicar cada rate limiter secuencialmente
      for (const limiter of limiters) {
        await new Promise<void>((resolve, reject) => {
          limiter(req, res, (error?: any) => {
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

// Función para aplicar rate limiting basado en tipo y acción
export const applyRateLimiting = (type: string, action?: string) => {
  return (
    req: Request | AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    let limiter: any;

    switch (type) {
      case "auth":
        limiter = rateLimiters.auth;
        break;
      case "authenticated":
        limiter = rateLimiters.authenticated;
        break;
      case "general":
      case "public":
        limiter = rateLimiters.general;
        break;
      case "progressive":
        limiter = rateLimiters.progressive;
        break;
      case "action":
        if (action && (rateLimiters.actions as any)[action]) {
          limiter = (rateLimiters.actions as any)[action];
        } else {
          limiter = rateLimiters.authenticated;
        }
        break;
      case "endpoint":
        if (action && (rateLimiters.endpoints as any)[action]) {
          limiter = (rateLimiters.endpoints as any)[action];
        } else {
          limiter = rateLimiters.general;
        }
        break;
      case "criticalAction":
        if (action && (rateLimiters.actions as any)[action]) {
          limiter = (rateLimiters.actions as any)[action];
        } else {
          limiter = rateLimiters.actions.createTweet;
        }
        break;
      case "bulkOperation":
        limiter = createCombinedRateLimiter(
          rateLimiters.authenticated,
          rateLimiters.actions.bulkFollow
        );
        break;
      default:
        limiter = rateLimiters.general;
    }

    return limiter(req, res, next);
  };
};

// Headers de rate limiting
export const addRateLimitHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Headers estándar de rate limiting
  res.set({
    "X-RateLimit-Policy": "sliding-window",
    "X-RateLimit-Scope": "user",
  });

  next();
};

// Programar limpieza automática
export const startCleanupSchedule = () => {
  // Limpiar cada hora
  setInterval(async () => {
    try {
      const limiter = initializeRateLimiter();
      if (limiter) {
        await limiter.cleanup();
      }
    } catch (error) {
      console.error("Rate limit cleanup error:", error);
    }
  }, 60 * 60 * 1000); // 1 hora

  console.log("Rate limit cleanup schedule started");
};

// Configuraciones específicas para diferentes endpoints
export const endpointConfigs = {
  // Auth endpoints
  auth: {
    login: rateLimiters.auth,
    register: rateLimiters.endpoints.register,
    resetPassword: rateLimiters.endpoints.passwordReset,
    verifyEmail: rateLimiters.endpoints.emailVerification,
  },

  // User endpoints
  users: {
    profile: rateLimiters.authenticated,
    search: rateLimiters.actions.search,
    update: rateLimiters.actions.updateProfile,
    follow: rateLimiters.actions.follow,
    bulkFollow: rateLimiters.actions.bulkFollow,
  },

  // Tweet endpoints
  tweets: {
    create: rateLimiters.actions.createTweet,
    like: rateLimiters.actions.like,
    retweet: rateLimiters.actions.retweet,
    timeline: rateLimiters.endpoints.timeline,
    search: rateLimiters.actions.search,
  },

  // Timeline endpoints
  timeline: {
    home: rateLimiters.endpoints.timeline,
    public: rateLimiters.general,
    mentions: rateLimiters.authenticated,
  },
};

// Función para obtener configuración específica
export const getRateLimitConfig = (
  category: keyof typeof endpointConfigs,
  action: string
) => {
  const config = endpointConfigs[category];
  if (config && (config as any)[action]) {
    return (config as any)[action];
  }
  return rateLimiters.general;
};

// Función para crear rate limiter personalizado
export const createCustomRateLimiter = (options: {
  windowMs?: number;
  maxRequests?: number;
  type?: "ip" | "user" | "action" | "endpoint" | "auth";
  identifier?: string;
}) => {
  const {
    windowMs = 15 * 60 * 1000,
    maxRequests = 100,
    type = "ip",
    identifier = "custom",
  } = options;

  return createLazyRateLimiter(
    type === "ip"
      ? "createIPRateLimiter"
      : type === "user"
      ? "createUserRateLimiter"
      : type === "action"
      ? "createActionRateLimiter"
      : type === "endpoint"
      ? "createEndpointRateLimiter"
      : type === "auth"
      ? "createAuthRateLimiter"
      : "createIPRateLimiter",
    ...(type === "action" || type === "endpoint" ? [identifier] : []),
    windowMs,
    maxRequests
  );
};

// Middleware para monitorear rate limiting
export const rateLimitMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;

  res.send = function (body?: any) {
    // Registrar hits de rate limiting
    if (res.statusCode === 429) {
      console.warn(`Rate limit hit: ${req.method} ${req.path} from ${req.ip}`);
    }

    return originalSend.call(this, body);
  };

  next();
};

// Inicializar el sistema de rate limiting
export const initializeRateLimiting = () => {
  startCleanupSchedule();
  console.log("Rate limiting system initialized");
};

export { initializeRateLimiter };

// También exportar para compatibilidad con CommonJS
module.exports = {
  rateLimiters,
  createCombinedRateLimiter,
  applyRateLimiting,
  addRateLimitHeaders,
  startCleanupSchedule,
  endpointConfigs,
  getRateLimitConfig,
  createCustomRateLimiter,
  rateLimitMonitoringMiddleware,
  initializeRateLimiting,
  initializeRateLimiter,
};
