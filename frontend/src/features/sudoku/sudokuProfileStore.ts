import { create } from "zustand";
import { api } from "../../api/client";

export interface SudokuProfileDTO {
  rating: number;
  xp: number;
  level: number;
  played: number;
  completed: number;
  dailyStreak: number;
  bestStreak: number;
  bestTimesJson: string;
  achievementsJson: string;
}

export interface AchievementDTO {
  id: string;
  title: string;
  desc: string;
  unlocked: boolean;
}

export interface DailyTaskDTO {
  id: string;
  title: string;
  xp: number;
  done: boolean;
}

export interface DailyDTO {
  date: string;
  allDoneBonus: number;
  tasks: DailyTaskDTO[];
}

export interface LeaderRow {
  userId: number;
  firstName: string;
  rating: number;
  level: number;
  completed: number;
}

export interface SudokuReward {
  points: number;
  base: number;
  taskBonus: number;
  allDoneBonus: number;
  streakBonus: number;
  leveledUp: boolean;
  level: number;
  xp: number;
  levelProgress: number;
  xpToNext: number;
  allDailyDone: boolean;
  newlyUnlocked: Array<{ id: string; title: string; desc: string }>;
}

export interface CompletePayload {
  difficulty: string;
  mode: string;
  elapsedSeconds: number;
  mistakes: number;
  hintsUsed: number;
  dailyDate: string | null;
}

interface State {
  profile: SudokuProfileDTO | null;
  achievements: AchievementDTO[];
  daily: DailyDTO | null;
  leaderboard: LeaderRow[];
  reward: SudokuReward | null;
  loaded: boolean;
  fetchAll: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  report: (payload: CompletePayload) => Promise<void>;
  clearReward: () => void;
}

export const useSudokuProfile = create<State>((set, get) => ({
  profile: null,
  achievements: [],
  daily: null,
  leaderboard: [],
  reward: null,
  loaded: false,

  async fetchAll() {
    try {
      const [me, ach, daily] = await Promise.all([
        api.get<SudokuProfileDTO>("/sudoku/me"),
        api.get<AchievementDTO[]>("/sudoku/achievements"),
        api.get<DailyDTO>("/sudoku/daily"),
      ]);
      set({ profile: me.data, achievements: ach.data, daily: daily.data, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  async fetchLeaderboard() {
    try {
      const r = await api.get<LeaderRow[]>("/sudoku/leaderboard");
      set({ leaderboard: r.data });
    } catch {}
  },

  async report(payload) {
    try {
      const r = await api.post("/sudoku/complete", payload);
      const g = r.data.gained || {};
      set({
        profile: r.data.profile,
        reward: {
          points: g.points ?? 0,
          base: g.base ?? 0,
          taskBonus: g.taskBonus ?? 0,
          allDoneBonus: g.allDoneBonus ?? 0,
          streakBonus: g.streakBonus ?? 0,
          leveledUp: !!g.leveledUp,
          level: g.level ?? get().profile?.level ?? 1,
          xp: g.xp ?? 0,
          levelProgress: g.levelProgress ?? 0,
          xpToNext: g.xpToNext ?? 0,
          allDailyDone: !!g.allDailyDone,
          newlyUnlocked: r.data.newlyUnlocked ?? [],
        },
      });
      get().fetchAll();
    } catch {}
  },

  clearReward() {
    set({ reward: null });
  },
}));
