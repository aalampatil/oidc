import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

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
