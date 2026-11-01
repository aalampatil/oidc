import { describe, expect, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import JWT from "jsonwebtoken";
import { loadSigningKeys } from "./signing-keys";

const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privatePem = pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();

describe("signing key configuration", () => {
  test.each([
    [privatePem, publicPem],
    [privatePem.replace(/\n/g, "\\n"), publicPem.replace(/\n/g, "\\n")],
    [pair.privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"), pair.publicKey.export({ type: "spki", format: "der" }).toString("base64")],
  ])("accepts supported PEM and DER formats and signs verifiable tokens", (privateValue, publicValue) => {
    const keys = loadSigningKeys(privateValue, publicValue);
    const token = JWT.sign({ sub: "demo" }, keys.privateKey, { algorithm: "RS256" });
    expect(JWT.verify(token, keys.publicKey, { algorithms: ["RS256"] })).toHaveProperty("sub", "demo");
  });
  test("rejects malformed keys", () => {
    expect(() => loadSigningKeys("not a valid key!", publicPem)).toThrow();
  });
  test("rejects mismatched keys", () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
    expect(() => loadSigningKeys(privatePem, other.publicKey.export({ type: "spki", format: "pem" }).toString())).toThrow("do not match");
  });
});
