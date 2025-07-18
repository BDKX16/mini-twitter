/**
 * MongoDB Database Configuration for Twitter Clone API
 * Handles MongoDB connection, pool management, and connection events
 */

import mongoose, { ConnectOptions } from "mongoose";

// Environment variables interface
interface MongoEnvVars {
  MONGO_USERNAME?: string;
  MONGO_PASSWORD?: string;
  MONGO_HOST?: string;
  MONGO_PORT?: string;
  MONGO_DATABASE?: string;
}

// Connection statistics interface
interface ConnectionStats {
  connected: boolean;
  database?: string;
  collections?: number;
  connectionPool?: {
    current: number;
    available: number;
    totalCreated: number;
  };
  memory?: {
    resident: number;
    virtual: number;
    mapped: number;
  };
  uptime?: number;
  error?: string;
}

class DatabaseConfig {
  private _isConnected: boolean = false;

  constructor() {
    this._isConnected = false;
  }

  /**
   * Get connection status
   */
  public get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Build MongoDB connection string from environment variables
   */
  private buildConnectionString(): string {
    const {
      MONGO_USERNAME,
      MONGO_PASSWORD,
      MONGO_HOST,
      MONGO_PORT,
      MONGO_DATABASE,
    } = process.env as MongoEnvVars;

    // Validate required environment variables
    if (!MONGO_USERNAME || !MONGO_PASSWORD || !MONGO_HOST || !MONGO_DATABASE) {
      throw new Error("Missing required MongoDB environment variables");
    }

    return `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DATABASE}?authSource=admin`;
  }

  /**
   * Get optimized connection options for high concurrency
   */
  private getConnectionOptions(): ConnectOptions {
    return {
      // Connection pool optimized for high concurrency
      maxPoolSize: 100, // Maximum connections in pool
      minPoolSize: 10, // Minimum connections maintained
      maxIdleTimeMS: 30000, // Maximum time a connection can be idle

      // Timeouts
      serverSelectionTimeoutMS: 5000, // Time to select server
      socketTimeoutMS: 45000, // Socket operation timeout
      connectTimeoutMS: 10000, // Initial connection timeout

      // For applications handling many users
      readPreference: "primary", // Read from primary by default
      writeConcern: {
        w: "majority", // Write to majority of replicas
        j: true, // Write to journal
      },

      // Retry settings
      retryWrites: true,
      retryReads: true,
    };
  }

  /**
   * Setup connection event listeners
   */
  private setupConnectionEvents(): void {
    // Successful connection event
    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB: Connected successfully");
      this._isConnected = true;
    });

    // Error event
    mongoose.connection.on("error", (err: Error) => {
      console.error("❌ MongoDB Connection Error:", err);
      this._isConnected = false;
    });

    // Disconnection event
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB: Disconnected");
      this._isConnected = false;
    });

    // Reconnection event
    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB: Reconnected");
      this._isConnected = true;
    });

    // Connection closed event
    mongoose.connection.on("close", () => {
      console.log("🔌 MongoDB: Connection closed");
      this._isConnected = false;
    });

    // Setup process events for cleanup
    process.on("SIGINT", () => this.gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => this.gracefulShutdown("SIGTERM"));
  }

  /**
   * Connect to MongoDB with proper error handling
   */
  public async connect(): Promise<boolean> {
    try {
      // Setup events before connecting
      this.setupConnectionEvents();

      // Get URI and options
      const uri = this.buildConnectionString();
      const options = this.getConnectionOptions();

      console.log("🔗 Connecting to MongoDB...");
      console.log(
        `📍 Host: ${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`
      );
      console.log(`🗄️  Database: ${process.env.MONGO_DATABASE}`);

      // Connect to MongoDB
      await mongoose.connect(uri, options);

      // Verify connection
      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();

      console.log("🚀 MongoDB Successfully Connected!");
      console.log(`📊 MongoDB Version: ${serverStatus.version}`);
      console.log(`🔧 Connection Pool Size: ${options.maxPoolSize}`);

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("❌ MongoDB Connection Failed:", errorMessage);
      this._isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        console.log("✅ MongoDB connection closed gracefully");
      }
    } catch (error) {
      console.error("❌ Error closing MongoDB connection:", error);
    }
  }

  /**
   * Graceful shutdown handler
   */
  private async gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n🔄 ${signal} received. Closing MongoDB connection...`);
    await this.disconnect();
  }

  /**
   * Get connection statistics
   */
  public async getConnectionStats(): Promise<ConnectionStats> {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const db = mongoose.connection.db;
      const admin = db.admin();
      const serverStatus = await admin.serverStatus();

      return {
        connected: true,
        database: db.databaseName,
        collections: Object.keys(mongoose.connection.collections).length,
        connectionPool: {
          current: serverStatus.connections.current,
          available: serverStatus.connections.available,
          totalCreated: serverStatus.connections.totalCreated,
        },
        memory: {
          resident: serverStatus.mem.resident,
          virtual: serverStatus.mem.virtual,
          mapped: serverStatus.mem.mapped,
        },
        uptime: serverStatus.uptime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error getting connection stats:", error);
      return { connected: this.isConnected, error: errorMessage };
    }
  }

  /**
   * Check if connection is healthy
   */
  public isHealthy(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): number {
    return mongoose.connection.readyState;
  }

  /**
   * Get connection state description
   */
  public getConnectionStateDescription(): string {
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    return (
      states[mongoose.connection.readyState as keyof typeof states] || "unknown"
    );
  }
}

// Export singleton instance
export default new DatabaseConfig();
