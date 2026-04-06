import type { DatabaseConnector } from "@/config/database.config.js";

import { databaseConnector as defaultDatabaseConnector } from "@/config/database.config.js";
import { logger } from "@/utils/logger.js";

export type BootstrapDependencies = {
  databaseConnector?: DatabaseConnector;
};

export class BootstrapConfig {
  private readonly databaseConnector: DatabaseConnector;

  constructor({ databaseConnector }: BootstrapDependencies = {}) {
    this.databaseConnector = databaseConnector ?? defaultDatabaseConnector;
  }

  async run(): Promise<void> {
    logger.info("Starting application bootstrap");
    await this.databaseConnector.connect();
    logger.info("Application bootstrap completed");
  }
}

export async function bootstrapApplication(
  dependencies: BootstrapDependencies = {},
): Promise<void> {
  const bootstrap = new BootstrapConfig(dependencies);
  await bootstrap.run();
}
