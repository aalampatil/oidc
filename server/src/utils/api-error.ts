import type { ErrorRequestHandler } from "express";

export function getDatabaseErrorCode(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && typeof current.code === "string") return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
}

export const apiErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);

  const code = getDatabaseErrorCode(error);
  const databaseUnavailable = ["3D000", "42P01", "42703", "28P01", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "57P01"].includes(code ?? "");
  if (databaseUnavailable) {
    return res.status(503).json({
      error: "database_unavailable",
      message: "The authentication database is unavailable or needs setup. Check the server database configuration and run the database migrations.",
    });
  }

  if (error instanceof SyntaxError && "type" in error && error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "invalid_request", message: "The request must contain valid JSON." });
  }

  // Do not expose SQL parameters, credentials, or stack traces in API responses.
  console.error("API request failed", { code: code ?? "internal_error" });
  return res.status(500).json({ error: "server_error", message: "The request could not be completed. Please try again." });
};
