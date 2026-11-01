import axios from "axios";
import { resolveProviderIssuer } from "@/lib/providerConfig";

export const OIDC_ISSUER_URL = resolveProviderIssuer(import.meta.env.VITE_API_BASE_URL, import.meta.env.DEV);
export const API_BASE_URL = OIDC_ISSUER_URL.replace(/\/$/, "");

export const authApi = axios.create({
  baseURL: `${API_BASE_URL}/o`,
  headers: {
    "Content-Type": "application/json",
  },
});

export const thirdPartyApi = axios.create({
  baseURL: `${API_BASE_URL}/o/3rd-party-client`,
  headers: {
    "Content-Type": "application/json",
  },
});
