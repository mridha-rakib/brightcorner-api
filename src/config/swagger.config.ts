import swaggerUi from "swagger-ui-express";

import { coreSwaggerPaths } from "@/config/swagger.paths.core.js";
import { messagingSwaggerPaths } from "@/config/swagger.paths.messaging.js";
import { swaggerComponents } from "@/config/swagger.schemas.js";
import { env } from "@/env.js";

const serverUrl = env.BASE_URL === "/" ? "/" : env.BASE_URL;

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: env.APP_NAME,
    version: "1.0.0",
    description: "OpenAPI documentation for the Bright Corner messaging API.",
  },
  servers: [{ url: serverUrl, description: "Configured API base URL" }],
  tags: [
    { name: "Root", description: "API metadata and health checks" },
    { name: "Auth", description: "Authentication and account access" },
    { name: "Users", description: "User profile and settings" },
    { name: "Admin", description: "Administrator-only operations" },
    { name: "Channels", description: "Channel discovery and membership" },
    { name: "Conversations", description: "Direct conversations" },
    { name: "Messages", description: "Messages and reactions" },
    { name: "Notifications", description: "User notifications" },
    { name: "Legal Content", description: "Public legal content" },
    { name: "Support Requests", description: "Authenticated support requests" },
  ],
  components: swaggerComponents,
  paths: {
    ...coreSwaggerPaths,
    ...messagingSwaggerPaths,
  },
};

export const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: `${env.APP_NAME} Docs`,
};

export { swaggerUi };
