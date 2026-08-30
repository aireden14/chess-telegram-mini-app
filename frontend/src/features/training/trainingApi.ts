import { api } from "../../api/client";
import type {
  ExerciseSnapshot,
  TrainingDashboard,
  TrainingMode,
  TrainingSettings,
  TrainingState,
} from "./types";

interface CachedTraining {
  dashboard: TrainingDashboard | null;
  pendingCompletion: CompletionPayload | null;
  pendingSettings: SettingsPayload | null;
}

export interface CompletionPayload {
  dateKey: string;
  mode: TrainingMode;
  exercises: ExerciseSnapshot[];
}

export interface SettingsPayload {
  dateKey: string;
  state: TrainingState;
  settings: TrainingSettings;
}

const EMPTY_CACHE: CachedTraining = {
  dashboard: null,
  pendingCompletion: null,
  pendingSettings: null,
};

function key(userId: number | null | undefined) {
  return `gamepass.training.v1.${userId || "guest"}`;
}

export function readTrainingCache(userId: number | null | undefined): CachedTraining {
  try {
    const parsed = JSON.parse(localStorage.getItem(key(userId)) || "null");
    return parsed && typeof parsed === "object" ? { ...EMPTY_CACHE, ...parsed } : { ...EMPTY_CACHE };
  } catch {
    return { ...EMPTY_CACHE };
  }
}

export function writeTrainingCache(userId: number | null | undefined, value: CachedTraining) {
  localStorage.setItem(key(userId), JSON.stringify(value));
}

export async function fetchTraining(dateKey: string): Promise<TrainingDashboard> {
  const response = await api.get<TrainingDashboard>("/training/me", { params: { date: dateKey } });
  return response.data;
}

export async function completeTraining(payload: CompletionPayload): Promise<TrainingDashboard> {
  const response = await api.post<TrainingDashboard>("/training/complete", payload);
  return response.data;
}

export async function deleteTrainingDay(dateKey: string): Promise<TrainingDashboard> {
  const response = await api.delete<TrainingDashboard>(`/training/day/${dateKey}`);
  return response.data;
}

export async function saveTrainingSettings(payload: SettingsPayload): Promise<TrainingDashboard> {
  const response = await api.patch<TrainingDashboard>("/training/settings", payload);
  return response.data;
}
