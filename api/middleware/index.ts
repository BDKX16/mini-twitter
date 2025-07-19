import { Request, Response, NextFunction } from "express";

// Importar solo el RateLimiter
import { RateLimiter } from "./rateLimiter";
import {
  startCleanupSchedule,
  addRateLimitHeaders,
  applyRateLimiting,
} from "./rateLimitConfig";
import redisClient from "../config/redis";

// Tipos exportados para evitar errores de compilación
export interface RateLimitStats {
  [key: string]: {
    current: number;
    ttl: number;
  };
}

// Variables para instancias que se crearán después de conectar Redis
let rateLimiter: RateLimiter | null = null;

// Función para inicializar el rate limiter una vez que Redis esté conectado
const initializeDetectors = () => {
  if (!rateLimiter && redisClient.isConnected) {
    try {
      rateLimiter = new RateLimiter(redisClient.getClient());
    } catch (error) {
      console.error("Error initializing RateLimiter:", error);
    }
  }
};

interface ProtectionOptions {
  enableRateLimit?: boolean;
  rateLimitConfig?: {
    type?: string;
    action?: string;
  };
}

// Middleware combinado para protección completa
const createProtectionMiddleware = (options: ProtectionOptions = {}) => {
  const { enableRateLimit = true, rateLimitConfig = {} } = options;

  const middlewares: any[] = [];

  // Agregar rate limiting si está habilitado
  if (enableRateLimit) {
    const { type = "authenticated", action = null } = rateLimitConfig;
    middlewares.push(applyRateLimiting(type, action || undefined));
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ejecuta cada middleware secuencialmente
      for (const middleware of middlewares) {
        await new Promise<void>((resolve, reject) => {
          middleware(req, res, (error?: any) => {
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

// Configuraciones predefinidas para diferentes tipos de endpoints
const protectionConfigs = {
  // Protección básica para endpoints públicos (3 requests por 10 minutos)
  public: createProtectionMiddleware({
    enableRateLimit: true,
    rateLimitConfig: { type: "public" },
  }),

  // Protección para autenticación (3 requests por 10 minutos)
  auth: createProtectionMiddleware({
    enableRateLimit: true,
    rateLimitConfig: { type: "auth" },
  }),

  // Protección estándar para usuarios autenticados (3 requests por 10 minutos)
  authenticated: createProtectionMiddleware({
    enableRateLimit: true,
    rateLimitConfig: { type: "authenticated" },
  }),

  // Protección para creación de contenido (3 requests por 10 minutos)
  contentCreation: createProtectionMiddleware({
    enableRateLimit: true,
    rateLimitConfig: { type: "criticalAction", action: "createTweet" },
  }),

  // Protección para acciones sociales (3 requests por 10 minutos)
  socialAction: createProtectionMiddleware({
    enableRateLimit: true,
    rateLimitConfig: { type: "authenticated" },
  }),

  // Protección para operaciones masivas (1 request por 10 minutos)
  bulkOperation: createProtectionMiddleware({
    enableRateLimit: true,
    rateLimitConfig: { type: "bulkOperation" },
  }),
};

// PROCESO DE SELECCION PARA LA PROTECCION ESPECIFICA
const applyProtection = (
  type: keyof typeof protectionConfigs,
  customConfig: ProtectionOptions = {}
) => {
  if (protectionConfigs[type]) {
    return protectionConfigs[type];
  }

  // Si no existe el tipo, crear uno personalizado
  return createProtectionMiddleware(customConfig);
};

// Middleware para monitorear y registrar actividades sospechosas
const monitoringMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Interceptar el final de la respuesta
  const originalSend = res.send;
  res.send = function (body?: any) {
    const duration = Date.now() - startTime;
    const userId = (req as any).user?.id;
    const ip = req.ip || (req as any).connection?.remoteAddress;

    // Registrar actividad sospechosa
    if (duration < 100 && req.method === "POST") {
      console.warn(
        `Suspicious fast request: ${req.method} ${req.path} from ${ip} (${duration}ms)`
      );
    }

    // Registrar errores de rate limiting
    if (res.statusCode === 429) {
      console.warn(
        `Rate limit exceeded: ${req.method} ${req.path} from ${ip} (User: ${userId})`
      );
    }

    return originalSend.call(this, body);
  };

  next();
};

// Función para obtener estadísticas de protección
const getProtectionStats = async (
  userId?: string
): Promise<{
  rateLimitStats: RateLimitStats;
  timestamp: string;
}> => {
  try {
    initializeDetectors();

    const rateLimitStats = rateLimiter
      ? await rateLimiter.getStats(userId ? `user:${userId}` : "global")
      : {};

    return {
      rateLimitStats,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting protection stats:", error);
    return {
      rateLimitStats: {},
      timestamp: new Date().toISOString(),
    };
  }
};

// Función para reiniciar límites
const resetUserProtection = async (userId: string): Promise<boolean> => {
  try {
    initializeDetectors();
    await rateLimiter?.resetLimits(`user:${userId}`);

    console.log(`Protection reset for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error resetting user protection:", error);
    return false;
  }
};

// Inicializar sistema de protección
const initializeProtection = () => {
  // Iniciar limpieza automática
  startCleanupSchedule();

  console.log("Protection system initialized");
};

export {
  rateLimiter,
  protectionConfigs,
  applyProtection,
  createProtectionMiddleware,
  monitoringMiddleware,
  addRateLimitHeaders,
  getProtectionStats,
  resetUserProtection,
  initializeProtection,
};
