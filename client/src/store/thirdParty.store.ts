import { getApiErrorMessage } from "@/lib/apiError";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { thirdPartyApi, OIDC_ISSUER_URL } from "@/configs/axiosApi";
import { providerStorageKey } from "@/lib/providerConfig";
import axios from "axios";

type RegisterThirdPartyPayload = {
  name: string;
  redirectUris: string[];
  scopes?: string;
};

type RegisterThirdPartyResponse = {
  issuer?: string;
  clientId: string;
  clientSecret: string;
  message: string;
};

type ClientMetaResponse = {
  name: string;
  scopes: string;
};

type AuthorizePayload = {
  email: string;
  password: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: "S256";
  nonce?: string;
};

type ThirdPartyState = {
  verificationEmail: string | null;
  loading: boolean;
  error: string | null;
  registration: RegisterThirdPartyResponse | null;
  clientMeta: ClientMetaResponse | null;
  trustedApps: Array<{
    name: string;
    scopes: string;
    redirectUris: string[];
    clientId: string;
    issuer: string;
    createdAt: string;
  }>;
  registerClient: (
    payload: RegisterThirdPartyPayload,
  ) => Promise<RegisterThirdPartyResponse | null>;
  fetchClientMeta: (clientId: string) => Promise<ClientMetaResponse | null>;
  authorize: (payload: AuthorizePayload) => Promise<unknown | null>;
  clearState: () => void;
  clearError: () => void;
};

export const useThirdPartyStore = create<ThirdPartyState>()(
  persist(
    (set, get) => ({
      verificationEmail: null,
      loading: false,
      error: null,
      registration: null,
      clientMeta: null,
      trustedApps: [],

      registerClient: async (payload) => {
        set({ loading: true, error: null });
        try {
          const { data } = await thirdPartyApi.post<RegisterThirdPartyResponse>(
            "/register",
            payload,
          );

          if (data.issuer && data.issuer !== OIDC_ISSUER_URL) {
            throw new Error("Registration issuer does not match the configured provider.");
          }

          const nextTrust = {
            name: payload.name,
            scopes: payload.scopes ?? "openid email profile",
            redirectUris: payload.redirectUris,
            clientId: data.clientId,
            issuer: OIDC_ISSUER_URL,
            createdAt: new Date().toISOString(),
          };

          set({
            registration: data,
            trustedApps: [nextTrust, ...get().trustedApps],
            loading: false,
          });
          return data;
        } catch (error) {
          const message = getApiErrorMessage(error, "Client registration failed. Check that the authentication server and database are running.");
          set({ loading: false, error: message });
          return null;
        }
      },

      fetchClientMeta: async (clientId) => {
        set({ loading: true, error: null });
        try {
          const { data } = await thirdPartyApi.get<ClientMetaResponse>(
            `/${clientId}`,
          );
          set({ clientMeta: data, loading: false });
          return data;
        } catch (error) {
          const message = getApiErrorMessage(error, "Failed to fetch client info.");
          set({ loading: false, error: message });
          return null;
        }
      },

      authorize: async (payload) => {
        set({ loading: true, error: null, verificationEmail: null });
        try {
          const { data } = await thirdPartyApi.post("/authorize", payload);
          set({ loading: false });
          return data;
        } catch (error) {
          const message = getApiErrorMessage(error, "Authorization failed.");
          set({ loading: false, error: message, verificationEmail:
            axios.isAxiosError(error) && error.response?.data?.error === "email_not_verified"
              ? error.response.data.email : null });
          return false;
        }
      },

      clearState: () =>
        set({
          loading: false,
          error: null,
          registration: null,
          clientMeta: null,
        }),

      clearError: () => set({ error: null }),
    }),
    {
      name: providerStorageKey("third-party-trust-store", OIDC_ISSUER_URL),
      partialize: (state) => ({
        trustedApps: state.trustedApps,
      }),
    },
  ),
);

