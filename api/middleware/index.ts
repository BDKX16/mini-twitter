import { Request, Response, NextFunction } from "express";

// Temporalmente usar require para módulos JS mientras migramos
const RateLimiter = require("./rateLimiter");
const SpamDetector = require("./spamDetector");
const {
  startCleanupSchedule,
  addRateLimitHeaders,
} = require("./rateLimitConfig");
import redisClient from "../config/redis";

// Instanciar detectores
const rateLimiter = new RateLimiter(redisClient);
const spamDetector = new SpamDetector(redisClient);

interface ProtectionOptions {
  enableRateLimit?: boolean;
  enableSpamDetection?: boolean;
  enableIPDetection?: boolean;
  enableSpammerBlock?: boolean;
  rateLimitConfig?: {
    type?: string;
    action?: string;
  };
}

// Middleware combinado para protección completa
const createProtectionMiddleware = (options: ProtectionOptions = {}) => {
  const {
    enableRateLimit = true,
    enableSpamDetection = true,
    enableIPDetection = true,
    enableSpammerBlock = true,
    rateLimitConfig = {},
  } = options;

  const middlewares: any[] = [];

  // Agregar rate limiting si está habilitado
  if (enableRateLimit) {
    const { type = "authenticated", action = null } = rateLimitConfig;
    const { applyRateLimiting } = require("./rateLimitConfig");
    middlewares.push(applyRateLimiting(type, action));
  }

  // Agregar detección de IP si está habilitada
  if (enableIPDetection) {
    middlewares.push(spamDetector.createIPDetectionMiddleware());
  }

  // Agregar bloqueo de spammers si está habilitado
  if (enableSpammerBlock) {
    middlewares.push(spamDetector.createSpammerBlockMiddleware());
  }

  // Agregar detección de spam si está habilitada
  if (enableSpamDetection) {
    middlewares.push(spamDetector.createSpamDetectionMiddleware());
  }

  // Middleware combinado
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ejecutar cada middleware secuencialmente
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
  // Protección básica para endpoints públicos
  public: createProtectionMiddleware({
    enableRateLimit: true,
    enableSpamDetection: false,
    enableIPDetection: true,
    enableSpammerBlock: false,
    rateLimitConfig: { type: "public" },
  }),

  // Protección para autenticación
  auth: createProtectionMiddleware({
    enableRateLimit: true,
    enableSpamDetection: false,
    enableIPDetection: true,
    enableSpammerBlock: false,
    rateLimitConfig: { type: "auth" },
  }),

  // Protección estándar para usuarios autenticados
  authenticated: createProtectionMiddleware({
    enableRateLimit: true,
    enableSpamDetection: false,
    enableIPDetection: true,
    enableSpammerBlock: true,
    rateLimitConfig: { type: "authenticated" },
  }),

  // Protección para creación de contenido
  contentCreation: createProtectionMiddleware({
    enableRateLimit: true,
    enableSpamDetection: true,
    enableIPDetection: true,
    enableSpammerBlock: true,
    rateLimitConfig: { type: "criticalAction", action: "createTweet" },
  }),

  // Protección para acciones sociales (like, retweet, follow)
  socialAction: createProtectionMiddleware({
    enableRateLimit: true,
    enableSpamDetection: false,
    enableIPDetection: true,
    enableSpammerBlock: true,
    rateLimitConfig: { type: "authenticated" },
  }),

  // Protección para operaciones masivas
  bulkOperation: createProtectionMiddleware({
    enableRateLimit: true,
    enableSpamDetection: false,
    enableIPDetection: true,
    enableSpammerBlock: true,
    rateLimitConfig: { type: "bulkOperation" },
  }),
};

// Función para aplicar protección específica
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

    // Registrar errores de spam
    if (res.statusCode === 403 && res.get("X-Spam-Detection")) {
      console.warn(
        `Spam detected: ${req.method} ${req.path} from ${ip} (User: ${userId})`
      );
    }

    return originalSend.call(this, body);
  };

  next();
};

// Función para obtener estadísticas de protección
const getProtectionStats = async (userId?: string) => {
  try {
    const [rateLimitStats, spamStats] = await Promise.all([
      rateLimiter.getStats(userId ? `user:${userId}` : "global"),
      spamDetector.getSpamStats(userId),
    ]);

    return {
      rateLimitStats,
      spamStats,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting protection stats:", error);
    return {
      rateLimitStats: {},
      spamStats: { status: "unknown" },
      timestamp: new Date().toISOString(),
    };
  }
};

// Función para reiniciar límites y marcas de spam
const resetUserProtection = async (userId: string): Promise<boolean> => {
  try {
    await Promise.all([
      rateLimiter.resetLimits(`user:${userId}`),
      redisClient.delSingle(`spammer:${userId}`),
      redisClient.delSingle(`spam_attempts:${userId}`),
      redisClient.delSingle(`suspicious_activity:${userId}`),
    ]);

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

  // Configurar limpieza adicional para spam detector
  setInterval(async () => {
    try {
      // Limpiar datos antiguos de spam
      const keys = await redisClient.keys("spam_attempts:*");
      for (const key of keys) {
        const ttl = await redisClient.ttl(key);
        if (ttl <= 0) {
          await redisClient.delSingle(key);
        }
      }
    } catch (error) {
      console.error("Error cleaning spam data:", error);
    }
  }, 60 * 60 * 1000); // Cada hora

  console.log("Protection system initialized");
};

export {
  rateLimiter,
  spamDetector,
  protectionConfigs,
  applyProtection,
  createProtectionMiddleware,
  monitoringMiddleware,
  addRateLimitHeaders,
  getProtectionStats,
  resetUserProtection,
  initializeProtection,
};
