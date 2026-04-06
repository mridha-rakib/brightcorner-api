import { bootstrapApplication } from "@/config/bootstrap.config.js";
import { databaseConnector } from "@/config/database.config.js";
import { logger } from "@/utils/logger.js";

async function run() {
  await bootstrapApplication();
  await databaseConnector.disconnect();
}

run().catch(async (error) => {
  logger.error("Admin seed command failed", { error });
  await databaseConnector.disconnect();
  process.exit(1);
});
