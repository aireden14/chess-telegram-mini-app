import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeType = "dark" | "light";

interface ThemeState {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
}

function normalizeTheme(value: unknown): ThemeType {
  return value === "light" ? "light" : "dark";
}

function applyTheme(theme: ThemeType) {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => {
        const next = normalizeTheme(theme);
        set({ theme: next });
        applyTheme(next);
      },
    }),
    {
      name: "chess-theme",
      onRehydrateStorage: () => (state) => {
        const next = normalizeTheme(state?.theme);
        state?.setTheme(next);
        applyTheme(next);
      },
    }
  )
);
