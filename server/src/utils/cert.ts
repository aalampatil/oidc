import { env } from "../env";
import { loadSigningKeys } from "./signing-keys";

const keys = loadSigningKeys(env.PRIVATE_KEY, env.PUBLIC_KEY);

export const PRIVATE_KEY = keys.privateKey;
export const PUBLIC_KEY = keys.publicKey;
