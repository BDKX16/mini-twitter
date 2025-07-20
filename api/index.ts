import express, { Application } from "express";
import morgan from "morgan";
import cors from "cors";
import colors from "colors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { Server } from "http";
import { EventEmitter } from "events";

// Configuraciones
import dotenv from "dotenv";
dotenv.config();

import database from "./config/database";
import redisCache from "./config/redis";

// Aumentar límite global de event listeners para evitar warnings
EventEmitter.defaultMaxListeners = 20;

// Configure timezone for Argentina/Chile (GMT-3)
process.env.TZ = "America/Argentina/Buenos_Aires";
console.log("🌍 Timezone configurado:", new Date().toString());

class TwitterAPI {
  private app: Application;
  private server: Server | null = null;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupErrorHandling();
  }

  async initialize(): Promise<void> {
    await this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Compression para responses
    this.app.use(compression());

    // Logging mejorado
    if (process.env.NODE_ENV === "development") {
      this.app.use(morgan("dev"));
    } else {
      this.app.use(morgan("combined"));
    }

    // Seguridad mejorada con helmet
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            imgSrc: [
              "'self'",
              "data:",
              "blob:",
              "http://localhost:3001",
              "https://api.dicebear.com",
            ],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
          },
        },
      })
    );

    // JSON parsing con límites
    this.app.use(express.json({ limit: "1mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "1mb" }));

    // CORS configurado
    this.app.use(
      cors({
        origin: process.env.FRONTEND_URL || "*",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    // Headers de performance
    this.app.use((req, res, next) => {
      res.set({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
      });
      next();
    });
  }

  private async setupRoutes(): Promise<void> {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        services: {
          database: {
            database: {
              connected: database.isConnected,
              host: `${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`,
              database: process.env.MONGO_DATABASE,
            },
            redis: {
              connected: redisCache.isConnected,
              host: `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
            },
            api: true,
          },
          version: process.env.npm_package_version || "1.0.0",
        },
      });
    });

    // Servir archivos estáticos (imágenes subidas)
    this.app.use(
      "/uploads",
      express.static(path.join(process.cwd(), "uploads"))
    );

    // API Routes
    this.app.use("/api", (await import("./routes/index")).default);

    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({ error: "Route not found" });
    });
  }

  private setupErrorHandling(): void {
    // Error handler global
    this.app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        console.error("Global error handler:", err);

        if (err.name === "ValidationError") {
          return res.status(400).json({
            error: "Validation error",
            details: err.message,
          });
        }

        if (err.name === "CastError") {
          return res.status(400).json({
            error: "Invalid ID format",
          });
        }

        if (err.name === "MongoError" && err.code === 11000) {
          return res.status(409).json({
            error: "Duplicate entry",
          });
        }

        res.status(500).json({
          error: "Internal server error",
        });
      }
    );
  }

  public async start(): Promise<void> {
    try {
      console.log("🚀 Starting Twitter API Server...");
      console.log(
        `📍 Connecting to MongoDB at: ${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`
      );
      console.log(
        `🔴 Connecting to Redis at: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
      );

      // Conectar a MongoDB
      await database.connect();

      // Conectar a Redis
      await redisCache.connect();

      // Iniciar servidor
      const port = process.env.API_PORT || 4000;
      this.server = this.app.listen(port, () => {
        console.log(
          colors.green("==================================================")
        );
        console.log(
          colors.green("🐦 Twitter API Server Started Successfully!")
        );
        console.log(
          colors.green("==================================================")
        );
        console.log(
          colors.cyan(`🌐 Server running on: http://localhost:${port}`)
        );
        console.log(
          colors.cyan(`🏥 Health check: http://localhost:${port}/health`)
        );
        console.log(
          colors.cyan(
            `🌍 Environment: ${process.env.NODE_ENV || "development"}`
          )
        );
        console.log(
          colors.cyan(
            `📊 MongoDB: ${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`
          )
        );
        console.log(
          colors.cyan(
            `🔴 Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
          )
        );
        console.log(
          colors.green("==================================================")
        );
      });

      this.setupGracefulShutdown();
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      console.log(`\n🔄 ${signal} received. Shutting down gracefully...`);

      if (this.server) {
        this.server.close(async () => {
          console.log("✅ HTTP server closed");

          try {
            await database.disconnect();
            await redisCache.disconnect();
            console.log("✅ All connections closed");
            process.exit(0);
          } catch (error) {
            console.error("❌ Error during shutdown:", error);
            process.exit(1);
          }
        });
      } else {
        process.exit(0);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("uncaughtException", (err) => {
      console.error("❌ Uncaught Exception:", err);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

// Inicializar aplicación
const twitterAPI = new TwitterAPI();

if (require.main === module) {
  (async () => {
    await twitterAPI.initialize();
    await twitterAPI.start();
  })();
}

export default twitterAPI;
