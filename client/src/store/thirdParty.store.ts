import axios from "axios";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { thirdPartyApi } from "@/configs/axiosApi";

type RegisterThirdPartyPayload = {
  name: string;
  redirectUris: string[];
  scopes?: string;
};

type RegisterThirdPartyResponse = {
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
};

type ThirdPartyState = {
  loading: boolean;
  error: string | null;
  registration: RegisterThirdPartyResponse | null;
  clientMeta: ClientMetaResponse | null;
  trustedApps: Array<{
    name: string;
    scopes: string;
    redirectUris: string[];
    clientId: string;
    clientSecret: string;
    createdAt: string;
  }>;
  registerClient: (
    payload: RegisterThirdPartyPayload,
  ) => Promise<RegisterThirdPartyResponse | null>;
  fetchClientMeta: (clientId: string) => Promise<ClientMetaResponse | null>;
  authorize: (payload: AuthorizePayload) => Promise<ThirdPartyState | null>;
  clearState: () => void;
  clearError: () => void;
};

export const useThirdPartyStore = create<ThirdPartyState>()(
  persist(
    (set, get) => ({
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

          const nextTrust = {
            name: payload.name,
            scopes: payload.scopes ?? "openid email profile",
            redirectUris: payload.redirectUris,
            clientId: data.clientId,
            clientSecret: data.clientSecret,
            createdAt: new Date().toISOString(),
          };

          set({
            registration: data,
            trustedApps: [nextTrust, ...get().trustedApps],
            loading: false,
          });
          return data;
        } catch (error) {
          const message = axios.isAxiosError(error)
            ? ((error.response?.data?.message as string | undefined) ??
              "Client registration failed.")
            : "Client registration failed.";
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
          const message = axios.isAxiosError(error)
            ? ((error.response?.data?.error as string | undefined) ??
              "Failed to fetch client info.")
            : "Failed to fetch client info.";
          set({ loading: false, error: message });
          return null;
        }
      },

      authorize: async (payload) => {
        set({ loading: true, error: null });
        try {
          const { data } = await thirdPartyApi.post("/authorize", payload);
          set({ loading: false });
          return data;
        } catch (error) {
          const message = axios.isAxiosError(error)
            ? ((error.response?.data?.message as string | undefined) ??
              (error.response?.data?.error as string | undefined) ??
              "Authorization failed.")
            : "Authorization failed.";
          set({ loading: false, error: message });
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
      name: "third-party-trust-store",
      partialize: (state) => ({
        registration: state.registration,
        trustedApps: state.trustedApps,
      }),
    },
  ),
);

// thirdParty.store.ts — just add these 3 things:
