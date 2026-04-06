import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import app from "@/app.js";
import { bootstrapApplication } from "@/config/bootstrap.config.js";
import { databaseConnector } from "@/config/database.config.js";
import { env } from "@/env.js";
import { realtimeGateway } from "@/realtime/realtime.gateway.js";
import { logger } from "@/utils/logger.js";

async function startServer() {
  await bootstrapApplication();

  const server = createServer(app);
  realtimeGateway.initialize(server);

  server.listen(env.PORT, () => {
    const address = server.address() as AddressInfo | null;
    const port = address?.port ?? env.PORT;
    logger.info("Server started", {
      port,
      url: `http://localhost:${port}`,
    });
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.error("Port is already in use", { port: env.PORT });
    }
    else {
      logger.error("Failed to start server", { error });
    }
    process.exit(1);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info("Shutdown signal received", { signal });
    void realtimeGateway.shutdown().finally(() => {
      server.close(async (closeError) => {
        if (closeError) {
          logger.error("Error while closing server", { error: closeError });
          process.exit(1);
        }

        await databaseConnector.disconnect();
        logger.info("Server closed");
        process.exit(0);
      });
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  logger.error("Fatal startup error", { error });
  process.exit(1);
});
