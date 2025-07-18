const { RateLimitError, ForbiddenError } = require("../utils/errors");

class SpamDetector {
  constructor(redisClient) {
    this.redis = redisClient;
    this.suspiciousPatterns = {
      // Patrones de contenido sospechoso
      spam: [
        /^(.)\1{10,}$/, // Caracteres repetidos
        /https?:\/\/bit\.ly|tinyurl|t\.co/i, // URLs acortadas sospechosas
        /\b(click here|free money|make money|bitcoin|crypto|investment)\b/i,
        /\b(follow me|follow back|f4f|followback)\b/i,
        /\b(dm me|direct message|private message)\b/i,
      ],
      // Patrones de comportamiento repetitivo
      repetitive: {
        maxSimilarity: 0.8, // 80% de similitud
        timeWindow: 5 * 60 * 1000, // 5 minutos
        maxRepeats: 3,
      },
    };
  }

  // Detectar spam en contenido
  detectSpamContent(content) {
    if (!content || typeof content !== "string") {
      return { isSpam: false, reason: null };
    }

    // Verificar patrones de spam
    for (const pattern of this.suspiciousPatterns.spam) {
      if (pattern.test(content)) {
        return {
          isSpam: true,
          reason: "Suspicious content pattern detected",
          pattern: pattern.source,
        };
      }
    }

    // Verificar contenido muy corto repetitivo
    if (content.length < 10 && /^(.)\1+$/.test(content)) {
      return {
        isSpam: true,
        reason: "Repetitive short content",
        content: content,
      };
    }

    // Verificar exceso de mayúsculas
    if (content.length > 20 && content.toUpperCase() === content) {
      return {
        isSpam: true,
        reason: "Excessive uppercase content",
        content: content,
      };
    }

    // Verificar exceso de emojis
    const emojiCount = (
      content.match(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu
      ) || []
    ).length;
    if (content.length > 0 && emojiCount / content.length > 0.5) {
      return {
        isSpam: true,
        reason: "Excessive emoji usage",
        emojiRatio: emojiCount / content.length,
      };
    }

    return { isSpam: false, reason: null };
  }

  // Calcular similitud entre dos strings
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Calcular distancia de Levenshtein
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Detectar contenido repetitivo
  async detectRepetitiveContent(userId, content) {
    try {
      const key = `recent_content:${userId}`;
      const recentContent = await this.redis.lrange(key, 0, 10);

      // Verificar similitud con contenido reciente
      for (const recent of recentContent) {
        const similarity = this.calculateSimilarity(content, recent);
        if (similarity > this.suspiciousPatterns.repetitive.maxSimilarity) {
          return {
            isRepetitive: true,
            similarity,
            reason: "Content too similar to recent posts",
          };
        }
      }

      // Guardar contenido actual
      await this.redis.lpush(key, content);
      await this.redis.ltrim(key, 0, 10); // Mantener solo los últimos 10
      await this.redis.expire(
        key,
        this.suspiciousPatterns.repetitive.timeWindow / 1000
      );

      return { isRepetitive: false, reason: null };
    } catch (error) {
      console.error("Error detecting repetitive content:", error);
      return { isRepetitive: false, reason: null };
    }
  }

  // Detectar comportamiento de bot
  async detectBotBehavior(userId, req) {
    try {
      const userAgent = req.headers["user-agent"] || "";
      const ip = req.ip || req.connection.remoteAddress;

      // Verificar User-Agent sospechoso
      const suspiciousUserAgents = [
        /bot|crawler|spider|scraper/i,
        /curl|wget|python|node|php/i,
        /^$/,
      ];

      for (const pattern of suspiciousUserAgents) {
        if (pattern.test(userAgent)) {
          return {
            isBot: true,
            reason: "Suspicious user agent",
            userAgent,
          };
        }
      }

      // Verificar patrones de comportamiento muy rápido
      const activityKey = `activity:${userId}`;
      const now = Date.now();
      await this.redis.zadd(activityKey, now, now);

      // Contar actividad en los últimos 10 segundos
      const recentActivity = await this.redis.zcount(
        activityKey,
        now - 10000,
        now
      );

      if (recentActivity > 10) {
        return {
          isBot: true,
          reason: "Too many actions in short time",
          actionsCount: recentActivity,
        };
      }

      // Limpiar actividad antigua
      await this.redis.zremrangebyscore(activityKey, 0, now - 60000);
      await this.redis.expire(activityKey, 60);

      return { isBot: false, reason: null };
    } catch (error) {
      console.error("Error detecting bot behavior:", error);
      return { isBot: false, reason: null };
    }
  }

  // Detectar múltiples cuentas desde la misma IP
  async detectMultipleAccounts(ip, userId) {
    try {
      const key = `ip_accounts:${ip}`;
      const accounts = await this.redis.smembers(key);

      await this.redis.sadd(key, userId);
      await this.redis.expire(key, 24 * 60 * 60); // 24 horas

      if (accounts.length > 5) {
        return {
          suspicious: true,
          reason: "Multiple accounts from same IP",
          accountCount: accounts.length + 1,
        };
      }

      return { suspicious: false, reason: null };
    } catch (error) {
      console.error("Error detecting multiple accounts:", error);
      return { suspicious: false, reason: null };
    }
  }

  // Middleware para detectar spam en tweets
  createSpamDetectionMiddleware() {
    return async (req, res, next) => {
      try {
        const { content } = req.body;
        const userId = req.user?.id;

        if (!content || !userId) {
          return next();
        }

        // Detectar spam en contenido
        const spamCheck = this.detectSpamContent(content);
        if (spamCheck.isSpam) {
          await this.markSpamAttempt(userId, spamCheck);
          throw new ForbiddenError(`Spam detected: ${spamCheck.reason}`);
        }

        // Detectar contenido repetitivo
        const repetitiveCheck = await this.detectRepetitiveContent(
          userId,
          content
        );
        if (repetitiveCheck.isRepetitive) {
          await this.markSpamAttempt(userId, repetitiveCheck);
          throw new ForbiddenError(
            `Repetitive content detected: ${repetitiveCheck.reason}`
          );
        }

        // Detectar comportamiento de bot
        const botCheck = await this.detectBotBehavior(userId, req);
        if (botCheck.isBot) {
          await this.markSpamAttempt(userId, botCheck);
          throw new ForbiddenError(`Bot behavior detected: ${botCheck.reason}`);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Middleware para detectar IP sospechosas
  createIPDetectionMiddleware() {
    return async (req, res, next) => {
      try {
        const ip = req.ip || req.connection.remoteAddress;
        const userId = req.user?.id;

        if (!ip || !userId) {
          return next();
        }

        // Detectar múltiples cuentas
        const multiAccountCheck = await this.detectMultipleAccounts(ip, userId);
        if (multiAccountCheck.suspicious) {
          await this.markSuspiciousActivity(userId, multiAccountCheck);
          // No bloquear, pero marcar como sospechoso
          req.suspiciousActivity = multiAccountCheck;
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Marcar intento de spam
  async markSpamAttempt(userId, details) {
    try {
      const key = `spam_attempts:${userId}`;
      const attempt = {
        timestamp: Date.now(),
        details,
        severity: this.calculateSeverity(details),
      };

      await this.redis.lpush(key, JSON.stringify(attempt));
      await this.redis.ltrim(key, 0, 50); // Mantener últimos 50 intentos
      await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 días

      // Incrementar contador de spam
      const countKey = `spam_count:${userId}`;
      const count = await this.redis.incr(countKey);
      await this.redis.expire(countKey, 24 * 60 * 60); // 24 horas

      // Si supera cierto umbral, marcar como spammer
      if (count > 10) {
        await this.markAsSpammer(userId);
      }
    } catch (error) {
      console.error("Error marking spam attempt:", error);
    }
  }

  // Marcar actividad sospechosa
  async markSuspiciousActivity(userId, details) {
    try {
      const key = `suspicious_activity:${userId}`;
      const activity = {
        timestamp: Date.now(),
        details,
      };

      await this.redis.lpush(key, JSON.stringify(activity));
      await this.redis.ltrim(key, 0, 20);
      await this.redis.expire(key, 24 * 60 * 60);
    } catch (error) {
      console.error("Error marking suspicious activity:", error);
    }
  }

  // Marcar usuario como spammer
  async markAsSpammer(userId) {
    try {
      const key = `spammer:${userId}`;
      await this.redis.set(key, Date.now(), "EX", 7 * 24 * 60 * 60); // 7 días
      console.log(`User ${userId} marked as spammer`);
    } catch (error) {
      console.error("Error marking user as spammer:", error);
    }
  }

  // Verificar si un usuario es spammer
  async isSpammer(userId) {
    try {
      const key = `spammer:${userId}`;
      const marked = await this.redis.get(key);
      return !!marked;
    } catch (error) {
      console.error("Error checking if user is spammer:", error);
      return false;
    }
  }

  // Calcular severidad del spam
  calculateSeverity(details) {
    let severity = 1;

    if (details.reason?.includes("pattern")) severity += 2;
    if (details.reason?.includes("repetitive")) severity += 1;
    if (details.reason?.includes("bot")) severity += 3;
    if (details.similarity > 0.9) severity += 2;

    return Math.min(severity, 5);
  }

  // Middleware para bloquear spammers conocidos
  createSpammerBlockMiddleware() {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;

        if (!userId) {
          return next();
        }

        const isSpammer = await this.isSpammer(userId);
        if (isSpammer) {
          throw new ForbiddenError(
            "Account temporarily restricted due to spam activity"
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Obtener estadísticas de spam
  async getSpamStats(userId) {
    try {
      const [spamAttempts, suspiciousActivity, isSpammer] = await Promise.all([
        this.redis.llen(`spam_attempts:${userId}`),
        this.redis.llen(`suspicious_activity:${userId}`),
        this.isSpammer(userId),
      ]);

      return {
        spamAttempts,
        suspiciousActivity,
        isSpammer,
        status: isSpammer
          ? "blocked"
          : spamAttempts > 5
          ? "monitored"
          : "clean",
      };
    } catch (error) {
      console.error("Error getting spam stats:", error);
      return {
        spamAttempts: 0,
        suspiciousActivity: 0,
        isSpammer: false,
        status: "clean",
      };
    }
  }
}

module.exports = SpamDetector;
