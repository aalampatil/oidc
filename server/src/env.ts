import { parseProviderConfig } from "./provider-config";

export const env = parseProviderConfig(process.env);
