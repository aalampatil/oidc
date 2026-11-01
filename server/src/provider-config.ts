import { z } from "zod";
import { parseWebUrl } from "./utils/url-policy";

const providerUrl = z.string().refine((value) => {
  const url = parseWebUrl(value);
  return url !== null && !value.includes("?");
}, "Use an absolute HTTPS URL without credentials, query, or fragment; HTTP is only allowed on loopback for development.");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  ISSUER_URL: providerUrl,
  CONSENT_UI_URL: providerUrl.optional(),
  CLIENT: providerUrl.optional(), // Backward-compatible name for the provider's own UI.
  SERVER: z.string().optional(), // Legacy informational value; never used to infer the issuer.
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  PRIVATE_KEY: z.string().min(1),
  PUBLIC_KEY: z.string().min(1),
}).superRefine((config, context) => {
  const ui = config.CONSENT_UI_URL ?? config.CLIENT;
  if (!ui) context.addIssue({ code: "custom", path: ["CONSENT_UI_URL"], message: "Set CONSENT_UI_URL (or legacy CLIENT) to the provider's hosted sign-in UI." });
  if (config.NODE_ENV === "production") {
    for (const [field, value] of [["ISSUER_URL", config.ISSUER_URL], ["CONSENT_UI_URL", ui]] as const) {
      if (value && new URL(value).protocol !== "https:") context.addIssue({ code: "custom", path: [field], message: "Production provider URLs must use HTTPS." });
    }
  }
  for (const value of config.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)) {
    const url = parseWebUrl(value);
    if (!url || url.pathname !== "/" || value.includes("?") || value.endsWith("/")) {
      context.addIssue({ code: "custom", path: ["CORS_ALLOWED_ORIGINS"], message: "Use comma-separated exact origins such as https://app.example.com or http://localhost:3000, without paths, trailing slashes, or wildcards." });
    }
  }
});

export function parseProviderConfig(input: Record<string, string | undefined>) {
  const config = schema.parse(input);
  const consentUi = (config.CONSENT_UI_URL ?? config.CLIENT)!;
  return {
    ...config,
    CONSENT_UI_URL: consentUi.replace(/\/$/, ""),
    allowedOrigins: [...new Set([
      new URL(consentUi).origin,
      ...config.CORS_ALLOWED_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean).map((value) => new URL(value).origin),
    ])],
  };
}
