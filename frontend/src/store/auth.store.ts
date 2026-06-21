"use client";
import { create } from "zustand";
import { AuthUser } from "@/services/api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:  null,
  token: null,

  setAuth: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", token);
      localStorage.setItem("user", JSON.stringify(user));
    }
    set({ token, user });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }
    set({ token: null, user: null });
  },

  hydrate: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      const raw   = localStorage.getItem("user");
      if (token && raw) {
        try { set({ token, user: JSON.parse(raw) }); } catch {}
      }
    }
  },
}));
