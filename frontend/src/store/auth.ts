import { create } from "zustand";
import { MeUser } from "../types";
import axios from "axios";
import { API_URL } from "../api/client";

interface AuthState {
  user: MeUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (initData: string, fakeUser?: any) => Promise<void>;
  setUser: (u: MeUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  async login(initData, fakeUser) {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`${API_URL}/api/auth/telegram`, {
        initData,
        fakeUser,
      });
      set({ token: res.data.token, user: res.data.user, isLoading: false });
    } catch (e: any) {
      set({
        error: e?.response?.data?.error || e?.message || "auth error",
        isLoading: false,
      });
      throw e;
    }
  },
  setUser(u) {
    set({ user: u });
  },
  logout() {
    set({ user: null, token: null });
  },
}));
