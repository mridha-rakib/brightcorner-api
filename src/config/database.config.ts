import mongoose from "mongoose";

import { env } from "@/env.js";
import { logger } from "@/utils/logger.js";

export type DatabaseConnector = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export class MongoDatabaseConnector implements DatabaseConnector {
  async connect(): Promise<void> {
    if (mongoose.connection.readyState === 1) {
      logger.info("MongoDB connection already established");
      return;
    }

    await mongoose.connect(env.MONGO_URI, {
      dbName: env.MONGO_DB_NAME,
    });

    logger.info("MongoDB connection established", {
      databaseName: env.MONGO_DB_NAME,
    });
  }

  async disconnect(): Promise<void> {
    if (mongoose.connection.readyState === 0)
      return;

    await mongoose.disconnect();
    logger.info("MongoDB connection closed");
  }
}

export const databaseConnector = new MongoDatabaseConnector();
