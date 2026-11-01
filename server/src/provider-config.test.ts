import { describe, expect, test } from "bun:test";
import { parseProviderConfig } from "./provider-config";
import { validateRedirectUri, validateCodeChallenge } from "./utils/oidc";

const production = {
  NODE_ENV: "production", DATABASE_URL: "postgresql://localhost/test",
  ISSUER_URL: "https://auth.example.com", CONSENT_UI_URL: "https://identity.example.com",
  PRIVATE_KEY: "test", PUBLIC_KEY: "test",
};

describe("provider configuration across environments", () => {
  test("production issuer and hosted UI are independent of local client origins", () => {
    const config = parseProviderConfig({ ...production, CORS_ALLOWED_ORIGINS: "http://localhost:3000,https://app.example.com" });
    expect(config.ISSUER_URL).toBe("https://auth.example.com");
    expect(config.CONSENT_UI_URL).toBe("https://identity.example.com");
    expect(config.allowedOrigins).toEqual(["https://identity.example.com", "http://localhost:3000", "https://app.example.com"]);
  });
  test("defaults CORS to the provider UI only, without hardcoded local ports", () => {
    expect(parseProviderConfig(production).allowedOrigins).toEqual(["https://identity.example.com"]);
  });
  test("retains the CLIENT alias and preserves the exact configured issuer", () => {
    const config = parseProviderConfig({ ...production, CONSENT_UI_URL: undefined, CLIENT: "https://identity.example.com/", ISSUER_URL: "https://auth.example.com/" });
    expect(config.CONSENT_UI_URL).toBe("https://identity.example.com");
    expect(config.ISSUER_URL).toBe("https://auth.example.com/");
  });
  test.each(["auth.example.com", "http://auth.example.com", "https://auth.example.com?issuer=other", "https://user:pass@auth.example.com", "https://auth.example.com/#"])("rejects unsafe issuer %s", (issuer) => {
    expect(() => parseProviderConfig({ ...production, ISSUER_URL: issuer })).toThrow();
  });
  test("rejects HTTP provider URLs in production but permits local development", () => {
    expect(() => parseProviderConfig({ ...production, ISSUER_URL: "http://localhost:3000" })).toThrow();
    expect(parseProviderConfig({ ...production, NODE_ENV: "development", ISSUER_URL: "http://localhost:3000", CONSENT_UI_URL: "http://localhost:5173" }).ISSUER_URL).toBe("http://localhost:3000");
  });
  test.each(["*", "https://*.example.com", "null", "http://192.168.1.4:3000", "https://app.example.com/callback", "https://app.example.com/"])("rejects broad or invalid CORS origin %s", (origin) => {
    expect(() => parseProviderConfig({ ...production, CORS_ALLOWED_ORIGINS: origin })).toThrow();
  });
});

describe("redirect and PKCE security", () => {
  test.each(["http://localhost:3000/auth/callback", "http://127.0.0.1:4567/callback", "http://[::1]:3000/callback", "https://app.example.com/callback?integration=test"])("permits explicitly registrable callback %s", (uri) => {
    expect(validateRedirectUri(uri)).toBe(true);
  });
  test.each(["http://app.example.com/callback", "http://localhost.evil.test/callback", "http://localhost@evil.test/callback", "https://user:pass@app.example.com/callback", "https://*.example.com/callback", "https://app.example.com/callback#", "https://app.example.com/callback#token", "https://app.example.com/\ncallback", "javascript:alert(1)"])("rejects unsafe callback %s", (uri) => {
    expect(validateRedirectUri(uri)).toBe(false);
  });
  test("only accepts SHA-256 base64url challenges", () => {
    expect(validateCodeChallenge("a".repeat(43), "S256")).toBe(true);
    expect(validateCodeChallenge("a".repeat(44), "S256")).toBe(false);
    expect(validateCodeChallenge(".".repeat(43), "S256")).toBe(false);
    expect(validateCodeChallenge("a".repeat(43), "plain")).toBe(false);
  });
});
