import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("GET /", () => {
  it("responds with service info", async () => {
    const response = await request(app)
      .get("/")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Bright Corner API");
  });
});

describe("GET unknown route", () => {
  it("responds with a structured 404 payload", async () => {
    const response = await request(app)
      .get("/what-is-this-even")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });
});

describe("GET /api-docs.json", () => {
  it("responds with the OpenAPI specification", async () => {
    const response = await request(app)
      .get("/api-docs.json")
      .set("Accept", "application/json")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.paths).toHaveProperty("/auth/sign-in");
    expect(response.body.paths).toHaveProperty("/messages");
  });
});
