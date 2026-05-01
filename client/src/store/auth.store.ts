import axios from "axios";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/configs/axiosApi";

type RegisterPayload = {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type TokenResponse = {
  access_token: string;
  id_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
};

type UserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name: string | null;
  family_name: string | null;
  name: string;
  picture: string | null;
};

type AuthState = {
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  expiresIn: number | null;
  user: UserInfo | null;
  loading: boolean;
  authStatus: boolean;
  error: string | null;
  register: (payload: RegisterPayload) => Promise<boolean>;
  login: (payload: LoginPayload) => Promise<boolean>;
  getUserInfo: () => Promise<UserInfo | null>;
  clearError: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      idToken: null,
      refreshToken: null,
      tokenType: null,
      expiresIn: null,
      user: null,
      loading: false,
      authStatus: false,
      error: null,

      register: async (payload) => {
        // console.log(payload);
        // console.log();
        set({ loading: true, error: null });
        try {
          await authApi.post("/authenticate/register", payload);
          set({ loading: false });
          return true;
        } catch (error) {
          const message = axios.isAxiosError(error)
            ? ((error.response?.data?.message as string | undefined) ??
              "Registration failed.")
            : "Registration failed.";
          set({ loading: false, error: message });
          return false;
        }
      },

      login: async (payload) => {
        set({ loading: true, error: null });
        try {
          const { data } = await authApi.post<TokenResponse>(
            "/authenticate/login",
            payload,
          );
          console.log(data);

          set({
            accessToken: data.access_token,
            idToken: data.id_token,
            refreshToken: data.refresh_token,
            tokenType: data.token_type,
            expiresIn: data.expires_in,
            loading: false,
            authStatus: true,
          });
          return true;
        } catch (error) {
          const message = axios.isAxiosError(error)
            ? ((error.response?.data?.message as string | undefined) ??
              "Login failed.")
            : "Login failed.";
          set({
            loading: false,
            authStatus: false,
            error: message,
            accessToken: null,
            idToken: null,
            refreshToken: null,
            tokenType: null,
            expiresIn: null,
            user: null,
          });
          return false;
        }
      },

      getUserInfo: async () => {
        const { accessToken, tokenType } = get();
        if (!accessToken || !tokenType) {
          return null;
        }

        set({ loading: true, error: null });
        try {
          const { data } = await authApi.get<UserInfo>("/userinfo", {
            headers: {
              Authorization: `${tokenType} ${accessToken}`,
            },
          });
          set({ user: data, loading: false });
          return data;
        } catch (error) {
          const message = axios.isAxiosError(error)
            ? ((error.response?.data?.message as string | undefined) ??
              "Failed to fetch user info.")
            : "Failed to fetch user info.";
          set({ loading: false, error: message });
          return null;
        }
      },

      clearError: () => set({ error: null }),

      logout: () =>
        set({
          accessToken: null,
          idToken: null,
          refreshToken: null,
          tokenType: null,
          expiresIn: null,
          user: null,
          loading: false,
          error: null,
        }),
    }),
    {
      name: "oidc-auth-store",
      partialize: (state) => ({
        accessToken: state.accessToken,
        idToken: state.idToken,
        refreshToken: state.refreshToken,
        tokenType: state.tokenType,
        expiresIn: state.expiresIn,
        user: state.user,
      }),
    },
  ),
);
