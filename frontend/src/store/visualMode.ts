import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VisualMode = "classic" | "beta";

interface VisualModeState {
  mode: VisualMode;
  setMode: (mode: VisualMode) => void;
  toggleMode: () => void;
}

function normalizeMode(value: unknown): VisualMode {
  return value === "beta" ? "beta" : "classic";
}

function applyVisualMode(mode: VisualMode) {
  if (typeof document === "undefined") return;
  if (mode === "beta") {
    document.documentElement.setAttribute("data-ui-mode", "beta");
  } else {
    document.documentElement.removeAttribute("data-ui-mode");
  }
}

export const useVisualModeStore = create<VisualModeState>()(
  persist(
    (set, get) => ({
      mode: "classic",
      setMode: (mode) => {
        const next = normalizeMode(mode);
        set({ mode: next });
        applyVisualMode(next);
      },
      toggleMode: () => {
        const next = get().mode === "beta" ? "classic" : "beta";
        set({ mode: next });
        applyVisualMode(next);
      },
    }),
    {
      name: "chess-visual-mode",
      onRehydrateStorage: () => (state) => {
        const next = normalizeMode(state?.mode);
        state?.setMode(next);
        applyVisualMode(next);
      },
    }
  )
);
