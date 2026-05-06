import { readFileSync } from "node:fs";
import path from "node:path";
import { env } from "../env";

export const PRIVATE_KEY = env.PRIVATE_KEY;
export const PUBLIC_KEY = env.PUBLIC_KEY;
