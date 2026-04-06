import type { DatabaseConnector } from "@/config/database.config.js";

import { databaseConnector as defaultDatabaseConnector } from "@/config/database.config.js";
import { env } from "@/env.js";
import { AdminSeedService } from "@/modules/admin/admin-seed.service.js";
import { logger } from "@/utils/logger.js";

export type BootstrapDependencies = {
  adminSeedService?: AdminSeedService;
  databaseConnector?: DatabaseConnector;
};

export class BootstrapConfig {
  private readonly adminSeedService: AdminSeedService;
  private readonly databaseConnector: DatabaseConnector;

  constructor({ adminSeedService, databaseConnector }: BootstrapDependencies = {}) {
    this.adminSeedService = adminSeedService ?? new AdminSeedService();
    this.databaseConnector = databaseConnector ?? defaultDatabaseConnector;
  }

  async run(): Promise<void> {
    logger.info("Starting application bootstrap");
    await this.databaseConnector.connect();
    await this.seedAdminUser();
    logger.info("Application bootstrap completed");
  }

  private async seedAdminUser(): Promise<void> {
    if (!env.ADMIN_SEED_EMAIL || !env.ADMIN_SEED_PASSWORD) {
      logger.info("Admin seed skipped because credentials are not configured");
      return;
    }

    const result = await this.adminSeedService.seed({
      email: env.ADMIN_SEED_EMAIL,
      firstName: env.ADMIN_SEED_FIRST_NAME,
      lastName: env.ADMIN_SEED_LAST_NAME,
      password: env.ADMIN_SEED_PASSWORD,
    });

    logger.info("Admin seed completed", {
      email: env.ADMIN_SEED_EMAIL,
      result,
    });
  }
}

export async function bootstrapApplication(
  dependencies: BootstrapDependencies = {},
): Promise<void> {
  const bootstrap = new BootstrapConfig(dependencies);
  await bootstrap.run();
}
