import { env } from "../env";

const normalizePem = (value: string) => value.replace(/\\n/g, "\n");

export const PRIVATE_KEY = normalizePem(env.PRIVATE_KEY);
export const PUBLIC_KEY = normalizePem(env.PUBLIC_KEY);
