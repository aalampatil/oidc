import { createPrivateKey, createPublicKey } from "node:crypto";

export function loadSigningKeys(privateValue: string, publicValue: string) {
  const normalize = (value: string, label: string) => {
    const text = value.trim().replace(/\\n/g, "\n");
    if (text.startsWith("-----BEGIN ")) return text;
    const body = text.replace(/\s/g, "");
    if (!body || !/^[A-Za-z0-9+/]+={0,2}$/.test(body)) {
      throw new Error("Signing keys must use PEM or base64-encoded DER.");
    }
    return `-----BEGIN ${label}-----\n${body.match(/.{1,64}/g)!.join("\n")}\n-----END ${label}-----`;
  };

  const privateKey = createPrivateKey(normalize(privateValue, "PRIVATE KEY"));
  const publicKey = createPublicKey(normalize(publicValue, "PUBLIC KEY"));
  if (privateKey.asymmetricKeyType !== "rsa" || publicKey.asymmetricKeyType !== "rsa" ||
      (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
    throw new Error("RS256 signing requires an RSA key pair of at least 2048 bits.");
  }
  const derivedPublic = createPublicKey(privateKey).export({ type: "spki", format: "der" });
  if (!derivedPublic.equals(publicKey.export({ type: "spki", format: "der" }))) {
    throw new Error("The signing private and public keys do not match.");
  }
  return {
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}
