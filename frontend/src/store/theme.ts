import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeType = "dark" | "colorful" | "light";

interface ThemeState {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => {
        set({ theme });
        if (theme === "dark") {
          document.documentElement.removeAttribute("data-theme");
        } else {
          document.documentElement.setAttribute("data-theme", theme);
        }
      },
    }),
    {
      name: "chess-theme",
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          if (state.theme === "dark") {
            document.documentElement.removeAttribute("data-theme");
          } else {
            document.documentElement.setAttribute("data-theme", state.theme);
          }
        }
      },
    }
  )
);
