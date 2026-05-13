const DEMO_FLOW_KEY = "oidc-demo-flow";

export type DemoFlowSession = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  codeVerifier: string;
  state: string;
  nonce: string;
  createdAt: string;
};

const randomBase64Url = (bytes = 32) => {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);

  return btoa(String.fromCharCode(...values))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const toBase64Url = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export const createPkcePair = async () => {
  const codeVerifier = randomBase64Url(48);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );

  return {
    codeVerifier,
    codeChallenge: toBase64Url(digest),
  };
};

export const createDemoNonce = () => randomBase64Url(24);

export const saveDemoFlowSession = (session: DemoFlowSession) => {
  sessionStorage.setItem(DEMO_FLOW_KEY, JSON.stringify(session));
};

export const readDemoFlowSession = () => {
  const rawSession = sessionStorage.getItem(DEMO_FLOW_KEY);
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as DemoFlowSession;
  } catch {
    sessionStorage.removeItem(DEMO_FLOW_KEY);
    return null;
  }
};

export const clearDemoFlowSession = () => {
  sessionStorage.removeItem(DEMO_FLOW_KEY);
};
