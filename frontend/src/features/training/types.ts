export type TrainingMode = "sick" | "light" | "medium" | "record";

export interface TrainingExercise {
  id: string;
  name: string;
  emoji: string;
  accent: string;
  active: boolean;
  recordTarget: number;
  recordStep: number;
  recordCap: number | null;
  leadSet: number;
  restSecondsPerRep: number;
  levels: { sick: number; light: number; medium: number };
  unlockAfterExerciseId: string | null;
  unlockAtTarget: number | null;
}

export interface TrainingState {
  version: 1;
  exercises: TrainingExercise[];
}

export interface TrainingSettings {
  reminderEnabled: boolean;
  reminderStartHour: number;
  reminderEndHour: number;
  reminderTimezone: string;
}

export interface ExerciseSnapshot {
  exerciseId: string;
  name: string;
  plannedSets: number[];
  actualSets: number[];
}

export interface TrainingSession {
  id: string;
  dateKey: string;
  mode: TrainingMode;
  plan: ExerciseSnapshot[];
  actual: ExerciseSnapshot[];
  totalPlanned: number;
  totalActual: number;
  goalCompleted: boolean;
  recordProgressApplied: boolean;
  completedAt: string;
}

export interface TrainingDashboard {
  profileId: number;
  dateKey: string;
  state: TrainingState;
  settings: TrainingSettings;
  today: TrainingSession | null;
  history: TrainingSession[];
  stats: {
    currentStreak: number;
    bestStreak: number;
    totalWorkouts: number;
    totalReps: number;
    recordWorkouts: number;
  };
  remindersPrivate: boolean;
}

export interface WorkoutPlanExercise extends ExerciseSnapshot {
  accent: string;
  emoji: string;
  restSecondsPerRep: number;
  layoutId: string;
}

export interface PreparedLayout {
  id: string;
  title: string;
  hint: string;
  sets: number[];
}
