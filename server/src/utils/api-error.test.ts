import { describe, expect, test } from "bun:test";
import express from "express";
import { apiErrorHandler, getDatabaseErrorCode } from "./api-error";

describe("API error responses", () => {
  test("finds database errors wrapped by Drizzle without looping on cyclic causes", () => {
    expect(getDatabaseErrorCode(new Error("Failed query", { cause: { code: "3D000" } }))).toBe("3D000");
    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;
    expect(getDatabaseErrorCode(cyclic)).toBeUndefined();
  });

  test("database failures return JSON without leaking SQL or credentials", async () => {
    const app = express();
    app.get("/", () => { throw new Error("insert secret-value", { cause: { code: "42P01" } }); });
    app.use(apiErrorHandler);
    const server = app.listen(0, "127.0.0.1");
    try {
      await new Promise<void>((resolve) => server.once("listening", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");
      const response = await fetch(`http://127.0.0.1:${address.port}`);
      expect(response.status).toBe(503);
      expect(response.headers.get("content-type")).toContain("application/json");
      const body = await response.text();
      expect(JSON.parse(body).error).toBe("database_unavailable");
      expect(body).not.toContain("secret-value");
      expect(body).not.toContain("Failed query");
    } finally { server.close(); }
  });
});
