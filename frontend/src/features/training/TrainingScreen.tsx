import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BorderBeam } from "border-beam";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useThemeStore } from "../../store/theme";
import { getTelegram, triggerHaptic } from "../../hooks/useTelegram";
import {
  activeExercises,
  formatDate,
  localDateKey,
  MODE_META,
  MODE_ORDER,
  optimisticDashboard,
  preparedLayouts,
  shiftDateKey,
  shortWeekday,
  targetForMode,
} from "./model";
import {
  completeTraining,
  deleteTrainingDay,
  fetchTraining,
  readTrainingCache,
  saveTrainingSettings,
  writeTrainingCache,
  type CompletionPayload,
  type SettingsPayload,
} from "./trainingApi";
import type {
  ExerciseSnapshot,
  TrainingDashboard,
  TrainingExercise,
  TrainingMode,
  TrainingSession,
  TrainingSettings,
  TrainingState,
  WorkoutPlanExercise,
} from "./types";
import "./training.css";

type Page = "home" | "progress" | "history" | "settings";

function sessionFromPayload(payload: CompletionPayload): TrainingSession {
  const totalPlanned = payload.exercises.reduce(
    (sum, exercise) => sum + exercise.plannedSets.reduce((inner, reps) => inner + reps, 0),
    0,
  );
  const totalActual = payload.exercises.reduce(
    (sum, exercise) => sum + exercise.actualSets.reduce((inner, reps) => inner + reps, 0),
    0,
  );
  const goalCompleted = payload.exercises.every(
    (exercise) => sum(exercise.actualSets) >= sum(exercise.plannedSets),
  );
  return {
    id: `local-${payload.dateKey}`,
    dateKey: payload.dateKey,
    mode: payload.mode,
    plan: payload.exercises.map((exercise) => ({ ...exercise, actualSets: [] })),
    actual: payload.exercises,
    totalPlanned,
    totalActual,
    goalCompleted,
    recordProgressApplied: payload.mode === "record" && goalCompleted,
    completedAt: new Date().toISOString(),
  };
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function TrainingScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id);
  const theme = useThemeStore((state) => state.theme);
  const reduceMotion = useReducedMotion();
  const initialDateKey = localDateKey();
  const initialCache = readTrainingCache(userId);
  const [dashboard, setDashboard] = useState<TrainingDashboard | null>(initialCache.dashboard);
  const [offline, setOffline] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [page, setPage] = useState<Page>("home");
  const [mode, setMode] = useState<TrainingMode | null>(null);
  const [layoutByExercise, setLayoutByExercise] = useState<Record<string, string>>({});
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanExercise[] | null>(null);
  const [celebration, setCelebration] = useState<TrainingSession | null>(null);

  const dateKey = dashboard?.dateKey || initialDateKey;

  useEffect(() => {
    const tg = getTelegram();
    try {
      tg?.expand?.();
      tg?.disableVerticalSwipes?.();
      tg?.requestFullscreen?.();
    } catch {}
  }, []);

  useEffect(() => {
    const tg = getTelegram();
    if (!tg?.BackButton) return;
    const goBack = () => {
      triggerHaptic("light");
      if (workoutPlan) {
        const close = (confirmed: boolean) => confirmed && setWorkoutPlan(null);
        if (tg.showConfirm) tg.showConfirm("Выйти из тренировки? Незакрытые подходы не сохранятся.", close);
        else close(window.confirm("Выйти из тренировки? Незакрытые подходы не сохранятся."));
      } else if (page !== "home") setPage("home");
      else navigate("/");
    };
    tg.BackButton.show();
    tg.BackButton.onClick(goBack);
    return () => {
      tg.BackButton.offClick(goBack);
      tg.BackButton.hide();
    };
  }, [navigate, page, workoutPlan]);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const cache = readTrainingCache(userId);
      if (cache.dashboard && !dashboard) setDashboard(cache.dashboard);
      setSyncing(true);
      try {
        let fresh = cache.dashboard;
        let pendingSettings = cache.pendingSettings;
        let pendingCompletion = cache.pendingCompletion;
        if (pendingSettings) {
          fresh = await saveTrainingSettings(pendingSettings);
          pendingSettings = null;
        }
        if (pendingCompletion) {
          fresh = await completeTraining(pendingCompletion);
          pendingCompletion = null;
        }
        fresh = await fetchTraining(initialDateKey);
        if (cancelled) return;
        setDashboard(fresh);
        setOffline(false);
        writeTrainingCache(userId, { dashboard: fresh, pendingCompletion, pendingSettings });
      } catch {
        if (!cancelled) setOffline(true);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };
    void sync();
    return () => { cancelled = true; };
  }, [userId]);

  const exercises = useMemo(
    () => dashboard ? activeExercises(dashboard.state) : [],
    [dashboard],
  );

  useEffect(() => {
    if (!mode) return;
    setLayoutByExercise((current) => {
      const next = { ...current };
      for (const exercise of exercises) {
        const layouts = preparedLayouts(exercise, mode);
        if (!layouts.some((layout) => layout.id === next[exercise.id])) {
          next[exercise.id] = layouts[0]?.id || "one";
        }
      }
      return next;
    });
  }, [exercises, mode]);

  const startWorkout = () => {
    if (!dashboard || !mode || exercises.length === 0) return;
    const plan = exercises.map((exercise) => {
      const layouts = preparedLayouts(exercise, mode);
      const layout = layouts.find((item) => item.id === layoutByExercise[exercise.id]) || layouts[0];
      return {
        exerciseId: exercise.id,
        name: exercise.name,
        plannedSets: layout.sets,
        actualSets: [...layout.sets],
        accent: exercise.accent,
        emoji: exercise.emoji,
        restSecondsPerRep: exercise.restSecondsPerRep,
        layoutId: layout.id,
      };
    });
    triggerHaptic("medium");
    setWorkoutPlan(plan);
  };

  const finishWorkout = async (payload: CompletionPayload) => {
    if (!dashboard) return;
    const localSession = sessionFromPayload(payload);
    const optimistic = optimisticDashboard(dashboard, localSession);
    setDashboard(optimistic);
    setWorkoutPlan(null);
    setCelebration(localSession);
    setMode(null);
    triggerHaptic("success");
    const currentCache = readTrainingCache(userId);
    writeTrainingCache(userId, {
      dashboard: optimistic,
      pendingCompletion: payload,
      pendingSettings: currentCache.pendingSettings,
    });
    try {
      const fresh = await completeTraining(payload);
      setDashboard(fresh);
      setOffline(false);
      writeTrainingCache(userId, { dashboard: fresh, pendingCompletion: null, pendingSettings: currentCache.pendingSettings });
    } catch {
      setOffline(true);
    }
  };

  const saveSettings = async (state: TrainingState, settings: TrainingSettings) => {
    if (!dashboard) return;
    const payload: SettingsPayload = { dateKey, state, settings };
    const optimistic = { ...dashboard, state, settings };
    setDashboard(optimistic);
    setPage("home");
    triggerHaptic("success");
    const currentCache = readTrainingCache(userId);
    writeTrainingCache(userId, {
      dashboard: optimistic,
      pendingCompletion: currentCache.pendingCompletion,
      pendingSettings: payload,
    });
    try {
      const fresh = await saveTrainingSettings(payload);
      setDashboard(fresh);
      setOffline(false);
      writeTrainingCache(userId, {
        dashboard: fresh,
        pendingCompletion: currentCache.pendingCompletion,
        pendingSettings: null,
      });
    } catch {
      setOffline(true);
    }
  };

  const clearToday = () => {
    if (!dashboard?.today) return;
    const tg = getTelegram();
    const remove = async (confirmed: boolean) => {
      if (!confirmed) return;
      try {
        const fresh = await deleteTrainingDay(dashboard.today!.dateKey);
        setDashboard(fresh);
        setCelebration(null);
        setOffline(false);
        writeTrainingCache(userId, { dashboard: fresh, pendingCompletion: null, pendingSettings: readTrainingCache(userId).pendingSettings });
        triggerHaptic("success");
      } catch {
        setOffline(true);
        tg?.showAlert?.("Не удалось очистить день. Проверь интернет и попробуй ещё раз.");
      }
    };
    const message = `Удалить все подходы за ${formatDate(dashboard.today.dateKey)}? Это действие нельзя отменить.`;
    if (tg?.showConfirm) tg.showConfirm(message, remove);
    else void remove(window.confirm(message));
  };

  if (!dashboard) {
    return (
      <main className="training-app training-loading">
        <div className="training-loader-orbit" aria-hidden><span /></div>
        <strong>Готовим задание</strong>
        <p>Считаем подходы и поднимаем дневник…</p>
      </main>
    );
  }

  if (workoutPlan && mode) {
    return (
      <WorkoutFlow
        dateKey={dateKey}
        mode={mode}
        plan={workoutPlan}
        reduceMotion={!!reduceMotion}
        onCancel={() => setWorkoutPlan(null)}
        onComplete={finishWorkout}
      />
    );
  }

  return (
    <main className="training-app">
      <div className="training-ambient training-ambient-one" aria-hidden />
      <div className="training-ambient training-ambient-two" aria-hidden />
      <header className="training-topbar">
        <button className="training-icon-button" onClick={() => page === "home" ? navigate("/") : setPage("home")} aria-label="Назад">
          <ChevronLeft />
        </button>
        <div className="training-brand">
          <span>СКРЫТЫЙ ПРОЕКТ</span>
          <strong>БРАКОВАНЫЙ РИТМ но симпитаичный дизайн</strong>
        </div>
        <button className="training-icon-button" onClick={() => setPage("settings")} aria-label="Настройки">
          <SlidersIcon />
        </button>
      </header>

      <div className="training-viewport">
        <AnimatePresence mode="wait">
          {page === "home" && (
            <motion.div
            key="home"
            className="training-page training-today-page"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          >
            <div className="training-status-row">
              <span>{formatDate(dateKey, { weekday: "long", day: "numeric", month: "long" })}</span>
              <span className={`training-sync${offline ? " is-offline" : ""}`}>
                {offline ? "Сохранено на телефоне" : syncing ? "Синхронизация" : "Всё сохранено"}
              </span>
            </div>

            {dashboard.today ? (
              <CompletedToday session={dashboard.today} state={dashboard.state} onHistory={() => setPage("history")} onClear={clearToday} />
            ) : (
              <DailyTask
                dashboard={dashboard}
                exercises={exercises}
                mode={mode}
                layoutByExercise={layoutByExercise}
                theme={theme}
                reduceMotion={!!reduceMotion}
                onMode={(nextMode) => { triggerHaptic("light"); setMode(nextMode); }}
                onLayout={(exerciseId, layoutId) => {
                  triggerHaptic("light");
                  setLayoutByExercise((current) => ({ ...current, [exerciseId]: layoutId }));
                }}
                onStart={startWorkout}
                onResetMode={() => setMode(null)}
              />
            )}

          </motion.div>
        )}

        {page === "progress" && (
          <ProgressPanel key="progress" dashboard={dashboard} theme={theme} reduceMotion={!!reduceMotion} />
        )}

        {page === "history" && (
          <HistoryPanel key="history" dashboard={dashboard} reduceMotion={!!reduceMotion} />
        )}

        {page === "settings" && (
          <SettingsPanel
            key="settings"
            dashboard={dashboard}
            reduceMotion={!!reduceMotion}
            onSave={saveSettings}
          />
        )}
        </AnimatePresence>
      </div>

      <nav className="training-tabbar" aria-label="Разделы дневника">
        <button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}><TodayIcon /><span>Сегодня</span></button>
        <button className={page === "progress" ? "active" : ""} onClick={() => setPage("progress")}><ProgressIcon /><span>Прогресс</span></button>
        <button className={page === "history" ? "active" : ""} onClick={() => setPage("history")}><HistoryIcon /><span>Дневник</span></button>
        <button className={page === "settings" ? "active" : ""} onClick={() => setPage("settings")}><SlidersIcon /><span>Настройки</span></button>
        <small>Powered by <a href="https://t.me/Denrech" target="_blank" rel="noopener noreferrer">@Denrech</a></small>
      </nav>

      <AnimatePresence>
        {celebration && (
          <CompletionCelebration
            session={celebration}
            reduceMotion={!!reduceMotion}
            onClose={() => setCelebration(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function ProgressPanel({ dashboard, theme, reduceMotion }: { dashboard: TrainingDashboard; theme: "light" | "dark"; reduceMotion: boolean }) {
  return (
    <motion.section
      className="training-page training-progress-page"
      initial={reduceMotion ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: -14 }}
    >
      <div className="training-page-title training-progress-title"><span>ТВОЙ РИТМ</span><h1>Прогресс</h1></div>
      <ProgressHero dashboard={dashboard} theme={theme} reduceMotion={reduceMotion} />
      <WeekChain dashboard={dashboard} />
      <section className="training-stats-grid" aria-label="Статистика тренировок">
        <article><strong>{dashboard.stats.totalReps}</strong><span>повторов всего</span></article>
        <article><strong>{dashboard.stats.bestStreak}</strong><span>лучшая серия</span></article>
        <article><strong>{dashboard.stats.recordWorkouts}</strong><span>рекордных дней</span></article>
      </section>
    </motion.section>
  );
}

function ProgressHero({ dashboard, theme, reduceMotion }: { dashboard: TrainingDashboard; theme: "light" | "dark"; reduceMotion: boolean }) {
  const complete = !!dashboard.today;
  const weeklyProgress = Math.min(7, dashboard.stats.currentStreak);
  const circumference = 2 * Math.PI * 92;
  const progress = complete ? 1 : Math.max(0.12, weeklyProgress / 7);
  const dots = Array.from({ length: 11 }, (_, index) => ({
    x: 36 + ((index * 47) % 190),
    y: 35 + ((index * 71) % 150),
    on: index < Math.min(11, dashboard.stats.totalWorkouts),
  }));
  const hero = (
    <section className={`training-hero${complete ? " is-complete" : ""}`}>
      <svg className="training-constellation" viewBox="0 0 280 220" aria-hidden>
        <path d="M38 143 L71 76 L108 118 L151 52 L201 96 L240 48" />
        {dots.map((dot, index) => <circle key={index} cx={dot.x} cy={dot.y} r={dot.on ? 2.8 : 1.6} className={dot.on ? "on" : ""} />)}
      </svg>
      <svg className="training-ring" viewBox="0 0 220 220" aria-hidden>
        <defs>
          <linearGradient id="training-ring-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ff7d55" />
            <stop offset="0.5" stopColor="#ffb45e" />
            <stop offset="1" stopColor="#6a8cff" />
          </linearGradient>
        </defs>
        <circle className="training-ring-track" cx="110" cy="110" r="92" />
        <motion.circle
          className="training-ring-value"
          cx="110"
          cy="110"
          r="92"
          strokeDasharray={circumference}
          initial={reduceMotion ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="training-hero-center">
        <span className="training-hero-kicker">ТРЕНИРОВОК</span>
        <motion.strong
          key={dashboard.stats.totalWorkouts}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.84 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {dashboard.stats.totalWorkouts}
        </motion.strong>
        <span className="training-hero-caption">серия {dashboard.stats.currentStreak} {dayWord(dashboard.stats.currentStreak)}</span>
      </div>
      <div className="training-mountain" aria-hidden>
        <svg viewBox="0 0 300 70"><path d="M0 65 L54 42 L82 52 L137 8 L172 42 L198 25 L246 52 L300 32 L300 70 L0 70Z" /></svg>
      </div>
    </section>
  );
  return (
    <BorderBeam
      size="md"
      colorVariant={complete ? "ocean" : "sunset"}
      theme={theme}
      strength={0.62}
      duration={3.2}
      active={!reduceMotion && !complete}
      borderRadius={36}
      style={{ width: "100%", overflow: "visible" }}
    >
      {hero}
    </BorderBeam>
  );
}

function DailyTask({
  dashboard,
  exercises,
  mode,
  layoutByExercise,
  theme,
  reduceMotion,
  onMode,
  onLayout,
  onStart,
  onResetMode,
}: {
  dashboard: TrainingDashboard;
  exercises: TrainingExercise[];
  mode: TrainingMode | null;
  layoutByExercise: Record<string, string>;
  theme: "light" | "dark";
  reduceMotion: boolean;
  onMode: (mode: TrainingMode) => void;
  onLayout: (exerciseId: string, layoutId: string) => void;
  onStart: () => void;
  onResetMode: () => void;
}) {
  if (!mode) {
    return (
      <section className="training-task training-mode-picker">
        <div className="training-section-head">
          <div><span>ЗАДАНИЕ НА ДЕНЬ</span><h1>Как ты сегодня?</h1></div>
          <span className="training-task-number">01</span>
        </div>
        <div className="training-mode-grid">
          {MODE_ORDER.map((item, index) => {
            const total = exercises.reduce((value, exercise) => value + targetForMode(exercise, item), 0);
            return (
              <motion.button
                key={item}
                className={`training-mode-card training-mode-${item}`}
                onClick={() => onMode(item)}
                whileTap={reduceMotion ? undefined : { scale: 0.975 }}
              >
                <span className="training-mode-index">0{index + 1}</span>
                <span className="training-mode-copy">
                  <strong>{MODE_META[item].label}</strong>
                  <em>{MODE_META[item].eyebrow}</em>
                </span>
                <span className="training-mode-target">{total}<small>раз</small></span>
                <ChevronRight />
              </motion.button>
            );
          })}
        </div>
      </section>
    );
  }

  const totalTarget = exercises.reduce((value, exercise) => value + targetForMode(exercise, mode), 0);
  return (
    <section className="training-task training-plan-builder">
      <div className="training-section-head">
        <div><span>{MODE_META[mode].label}</span><h1>План уже посчитан</h1></div>
        <button className="training-text-button" onClick={onResetMode}>Сменить</button>
      </div>
      <p className="training-plan-note">{MODE_META[mode].note}. Можно сделать больше — дневник сохранит каждый лишний повтор.</p>
      <div className="training-exercise-plans">
        {exercises.map((exercise, exerciseIndex) => {
          const layouts = preparedLayouts(exercise, mode);
          const selected = layouts.find((layout) => layout.id === layoutByExercise[exercise.id]) || layouts[0];
          return (
            <article className="training-exercise-plan" key={exercise.id} style={{ "--exercise-accent": exercise.accent } as React.CSSProperties}>
              <header>
                <span className="training-exercise-symbol">{exercise.emoji}</span>
                <div><em>УПРАЖНЕНИЕ {String(exerciseIndex + 1).padStart(2, "0")}</em><strong>{exercise.name}</strong></div>
                <span className="training-exercise-target">{targetForMode(exercise, mode)}</span>
              </header>
              <div className="training-layout-tabs" role="tablist" aria-label={`Раскладка для ${exercise.name}`}>
                {layouts.map((layout) => (
                  <button
                    key={layout.id}
                    className={selected.id === layout.id ? "active" : ""}
                    onClick={() => onLayout(exercise.id, layout.id)}
                    role="tab"
                    aria-selected={selected.id === layout.id}
                  >
                    <strong>{layout.title}</strong>
                    <span>{layout.sets.join(" + ")}</span>
                  </button>
                ))}
              </div>
              <p>{selected.hint}</p>
            </article>
          );
        })}
      </div>
      <button className="training-primary-button" onClick={onStart}>
        <span>Начать тренировку</span>
        <strong>{totalTarget} повторов</strong>
      </button>
      <p className="training-reminder-note">
        Напоминания бота отключены.
      </p>
    </section>
  );
}

function CompletedToday({ session, state, onHistory, onClear }: { session: TrainingSession; state: TrainingState; onHistory: () => void; onClear: () => void }) {
  const extras = Math.max(0, session.totalActual - session.totalPlanned);
  return (
    <section className="training-task training-complete-card">
      <div className="training-complete-check"><CheckIcon /></div>
      <div className="training-complete-copy">
        <span>{session.goalCompleted ? "ЗАДАНИЕ ВЫПОЛНЕНО" : "ДЕНЬ ЗАКРЫТ"}</span>
        <h1>{session.totalActual} повторов</h1>
        <p>{MODE_META[session.mode]?.label || session.mode}{session.goalCompleted ? (extras ? ` · +${extras} сверх плана` : " · цель выполнена") : " · без роста рекорда"}</p>
      </div>
      <div className="training-next-targets">
        {activeExercises(state).map((exercise) => (
          <span key={exercise.id}>Следующий рекорд · {exercise.name} {exercise.recordTarget}</span>
        ))}
      </div>
      <button className="training-secondary-button" onClick={onHistory}>Открыть запись дня</button>
      <button className="training-clear-day" onClick={onClear}>
        <span className="training-clear-icon"><TrashIcon /></span>
        <span className="training-clear-copy"><strong>Очистить тренировку</strong><small>Удалить все подходы за этот день</small></span>
        <ChevronRight />
      </button>
    </section>
  );
}

function WeekChain({ dashboard }: { dashboard: TrainingDashboard }) {
  const done = new Set(dashboard.history.map((session) => session.dateKey));
  const dates = Array.from({ length: 7 }, (_, index) => shiftDateKey(dashboard.dateKey, index - 6));
  return (
    <section className="training-week">
      <div className="training-section-minihead"><span>ЦЕПОЧКА ДНЕЙ</span><strong>{dashboard.stats.currentStreak} подряд</strong></div>
      <div className="training-week-track">
        {dates.map((dateKey, index) => (
          <React.Fragment key={dateKey}>
            <div className={`training-day${done.has(dateKey) ? " done" : ""}${dateKey === dashboard.dateKey ? " today" : ""}`}>
              <span>{shortWeekday(dateKey)}</span>
              <strong>{Number(dateKey.slice(-2))}</strong>
              <i>{done.has(dateKey) ? <CheckIcon /> : ""}</i>
            </div>
            {index < dates.length - 1 && <span className={`training-day-link${done.has(dateKey) && done.has(dates[index + 1]) ? " done" : ""}`} />}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

function HistoryPanel({ dashboard, reduceMotion }: { dashboard: TrainingDashboard; reduceMotion: boolean }) {
  return (
    <motion.section
      className="training-page training-journal"
      initial={reduceMotion ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: -14 }}
    >
      <div className="training-page-title"><span>ВСЯ ИСТОРИЯ</span><h1>Дневник</h1><p>{dashboard.stats.totalWorkouts} тренировок · {dashboard.stats.totalReps} повторов</p></div>
      <div className="training-journal-list">
        {dashboard.history.map((session, index) => (
          <article className="training-journal-entry" key={session.id}>
            <div className="training-journal-date"><strong>{String(Number(session.dateKey.slice(-2))).padStart(2, "0")}</strong><span>{formatDate(session.dateKey, { month: "short" }).replace(".", "")}</span></div>
            <div className="training-journal-body">
              <header><span>{MODE_META[session.mode]?.label || session.mode}</span><strong>{session.totalActual}</strong></header>
              {session.actual.map((exercise) => (
                <p key={exercise.exerciseId}><b>{exercise.name}</b><span>{exercise.actualSets.join(" + ")}</span></p>
              ))}
              {session.totalActual > session.totalPlanned && <em>+{session.totalActual - session.totalPlanned} сверх плана</em>}
            </div>
            <span className="training-journal-index">{String(index + 1).padStart(2, "0")}</span>
          </article>
        ))}
      </div>
    </motion.section>
  );
}

function SettingsPanel({
  dashboard,
  reduceMotion,
  onSave,
}: {
  dashboard: TrainingDashboard;
  reduceMotion: boolean;
  onSave: (state: TrainingState, settings: TrainingSettings) => void;
}) {
  const [state, setState] = useState<TrainingState>(() => structuredClone(dashboard.state));
  const [settings, setSettings] = useState<TrainingSettings>(() => ({ ...dashboard.settings }));
  const [newExercise, setNewExercise] = useState("");

  const updateExercise = (id: string, patch: Partial<TrainingExercise>) => {
    setState((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id === id ? { ...exercise, ...patch } : exercise),
    }));
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    setState((current) => {
      const exercises = [...current.exercises];
      const next = index + direction;
      if (next < 0 || next >= exercises.length) return current;
      [exercises[index], exercises[next]] = [exercises[next], exercises[index]];
      return { ...current, exercises };
    });
  };

  const addExercise = () => {
    const name = newExercise.trim();
    if (!name) return;
    const hue = (state.exercises.length * 71 + 214) % 360;
    const exercise: TrainingExercise = {
      id: `exercise-${Date.now().toString(36)}`,
      name: name.slice(0, 40),
      emoji: "●",
      accent: hslToHex(hue, 72, 58),
      active: true,
      recordTarget: 10,
      recordStep: 1,
      recordCap: 50,
      leadSet: 5,
      restSecondsPerRep: 6,
      levels: { sick: 3, light: 6, medium: 8 },
      unlockAfterExerciseId: null,
      unlockAtTarget: null,
    };
    setState((current) => ({ ...current, exercises: [...current.exercises, exercise] }));
    setNewExercise("");
    triggerHaptic("success");
  };

  return (
    <motion.section
      className="training-page training-settings"
      initial={reduceMotion ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: -14 }}
    >
      <div className="training-page-title"><span>ВСЁ МОЖНО ИЗМЕНИТЬ</span><h1>Настройки</h1><p>Старые записи останутся такими, какими были в день тренировки.</p></div>

      <section className="training-settings-section">
        <div className="training-section-minihead"><span>УПРАЖНЕНИЯ ПО ПОРЯДКУ</span><strong>{state.exercises.filter((item) => item.active).length} активно</strong></div>
        <div className="training-settings-exercises">
          {state.exercises.map((exercise, index) => {
            const previous = state.exercises[index - 1];
            return (
              <details className="training-settings-exercise" key={exercise.id} open={index === 0}>
                <summary>
                  <span className="training-settings-dot" style={{ background: exercise.accent }} />
                  <div><strong>{exercise.name}</strong><em>Рекорд {exercise.recordTarget} · шаг +{exercise.recordStep}</em></div>
                  <span className={exercise.active ? "active" : "archived"}>{exercise.active ? "В плане" : "Скрыто"}</span>
                </summary>
                <div className="training-settings-form">
                  <label className="wide"><span>Название</span><input value={exercise.name} onChange={(event) => updateExercise(exercise.id, { name: event.target.value })} /></label>
                  <label><span>«Болею»</span><input type="number" inputMode="numeric" value={exercise.levels.sick} onChange={(event) => updateExercise(exercise.id, { levels: { ...exercise.levels, sick: positive(event.target.value, 1) } })} /></label>
                  <label><span>Лайтовый</span><input type="number" inputMode="numeric" value={exercise.levels.light} onChange={(event) => updateExercise(exercise.id, { levels: { ...exercise.levels, light: positive(event.target.value, 1) } })} /></label>
                  <label><span>Средний</span><input type="number" inputMode="numeric" value={exercise.levels.medium} onChange={(event) => updateExercise(exercise.id, { levels: { ...exercise.levels, medium: positive(event.target.value, 1) } })} /></label>
                  <label><span>Рекорд сейчас</span><input type="number" inputMode="numeric" value={exercise.recordTarget} onChange={(event) => updateExercise(exercise.id, { recordTarget: positive(event.target.value, 1) })} /></label>
                  <label><span>Шаг роста</span><input type="number" inputMode="numeric" value={exercise.recordStep} onChange={(event) => updateExercise(exercise.id, { recordStep: positive(event.target.value, 1) })} /></label>
                  <label><span>Максимум</span><input type="number" inputMode="numeric" placeholder="Без лимита" value={exercise.recordCap ?? ""} onChange={(event) => updateExercise(exercise.id, { recordCap: event.target.value ? positive(event.target.value, exercise.recordTarget) : null })} /></label>
                  <label><span>Сильный 1-й</span><input type="number" inputMode="numeric" value={exercise.leadSet} onChange={(event) => updateExercise(exercise.id, { leadSet: positive(event.target.value, 1) })} /></label>
                  <label><span>Секунд за повтор</span><input type="number" inputMode="numeric" value={exercise.restSecondsPerRep} onChange={(event) => updateExercise(exercise.id, { restSecondsPerRep: Math.max(0, Number(event.target.value) || 0) })} /></label>
                  {previous && (
                    <label className="wide"><span>Когда появится в задании</span>
                      <select
                        value={exercise.unlockAfterExerciseId ? "after" : "now"}
                        onChange={(event) => updateExercise(exercise.id, event.target.value === "after" ? {
                          unlockAfterExerciseId: previous.id,
                          unlockAtTarget: previous.recordCap ?? previous.recordTarget,
                        } : { unlockAfterExerciseId: null, unlockAtTarget: null })}
                      >
                        <option value="now">Сразу, после {previous.name}</option>
                        <option value="after">Когда {previous.name} достигнет лимита</option>
                      </select>
                    </label>
                  )}
                  {exercise.unlockAfterExerciseId && (
                    <label className="wide"><span>Открыть на цели</span><input type="number" inputMode="numeric" value={exercise.unlockAtTarget ?? ""} onChange={(event) => updateExercise(exercise.id, { unlockAtTarget: positive(event.target.value, 1) })} /></label>
                  )}
                  <div className="training-settings-actions wide">
                    <button onClick={() => moveExercise(index, -1)} disabled={index === 0}>↑ Раньше</button>
                    <button onClick={() => moveExercise(index, 1)} disabled={index === state.exercises.length - 1}>↓ Позже</button>
                    <button onClick={() => updateExercise(exercise.id, { active: !exercise.active })}>{exercise.active ? "Скрыть" : "Вернуть"}</button>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
        <div className="training-add-exercise">
          <input value={newExercise} onChange={(event) => setNewExercise(event.target.value)} placeholder="Например, Приседания" maxLength={40} />
          <button onClick={addExercise} disabled={!newExercise.trim()}>Добавить</button>
        </div>
        <p className="training-settings-help">Новое упражнение добавляется в конец одной тренировки. Его цель растёт независимо от берпи.</p>
      </section>

      <button className="training-primary-button training-save-button" onClick={() => onSave(state, settings)}>Сохранить настройки</button>
    </motion.section>
  );
}

function WorkoutFlow({
  dateKey,
  mode,
  plan,
  reduceMotion,
  onCancel,
  onComplete,
}: {
  dateKey: string;
  mode: TrainingMode;
  plan: WorkoutPlanExercise[];
  reduceMotion: boolean;
  onCancel: () => void;
  onComplete: (payload: CompletionPayload) => void;
}) {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [actual, setActual] = useState<Record<string, number[]>>(() => Object.fromEntries(plan.map((exercise) => [exercise.exerciseId, [...exercise.plannedSets]])));
  const [checked, setChecked] = useState<Record<string, boolean[]>>(() => Object.fromEntries(plan.map((exercise) => [exercise.exerciseId, exercise.plannedSets.map(() => false)])));
  const [rest, setRest] = useState<{ left: number; total: number; advance: boolean; label: string } | null>(null);
  const current = plan[exerciseIndex];

  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) {
      triggerHaptic("success");
      if (rest.advance) setExerciseIndex((value) => Math.min(plan.length - 1, value + 1));
      setRest(null);
      return;
    }
    const timer = window.setTimeout(() => setRest((value) => value ? { ...value, left: value.left - 1 } : null), 1000);
    return () => window.clearTimeout(timer);
  }, [plan.length, rest]);

  const totalPlan = plan.reduce((total, exercise) => total + sum(exercise.plannedSets), 0);
  const doneReps = plan.reduce((total, exercise) => total + (actual[exercise.exerciseId] || []).reduce(
    (inner, reps, index) => inner + (checked[exercise.exerciseId]?.[index] ? reps : 0),
    0,
  ), 0);
  const hasDoneAny = doneReps > 0;
  const goalReached = plan.every((exercise) => {
    const performed = (actual[exercise.exerciseId] || []).reduce(
      (total, reps, index) => total + (checked[exercise.exerciseId]?.[index] ? reps : 0),
      0,
    );
    return performed >= sum(exercise.plannedSets);
  });
  const currentChecked = checked[current.exerciseId] || [];

  const changeActual = (setIndex: number, value: number) => {
    setActual((currentActual) => ({
      ...currentActual,
      [current.exerciseId]: currentActual[current.exerciseId].map((reps, index) => index === setIndex ? Math.max(5, Math.min(100000, value)) : reps),
    }));
  };

  const addSet = () => {
    const nextValue = 5;
    setActual((value) => ({ ...value, [current.exerciseId]: [...(value[current.exerciseId] || []), nextValue] }));
    setChecked((value) => ({ ...value, [current.exerciseId]: [...(value[current.exerciseId] || []), false] }));
    triggerHaptic("light");
  };

  const removeSet = (setIndex: number) => {
    if ((actual[current.exerciseId] || []).length <= 1) return;
    setActual((value) => ({ ...value, [current.exerciseId]: value[current.exerciseId].filter((_, index) => index !== setIndex) }));
    setChecked((value) => ({ ...value, [current.exerciseId]: value[current.exerciseId].filter((_, index) => index !== setIndex) }));
    triggerHaptic("light");
  };

  const toggleSet = (setIndex: number) => {
    const wasChecked = !!currentChecked[setIndex];
    setChecked((currentValue) => ({
      ...currentValue,
      [current.exerciseId]: currentValue[current.exerciseId].map((value, index) => index === setIndex ? !value : value),
    }));
    if (wasChecked) return;
    triggerHaptic("medium");
    const currentValues = actual[current.exerciseId] || [];
    const isLastSet = setIndex === currentValues.length - 1;
    const hasNextExercise = exerciseIndex < plan.length - 1;
    const performedAfterCheck = currentValues.reduce(
      (total, reps, index) => total + ((index === setIndex || currentChecked[index]) ? reps : 0),
      0,
    );
    const exerciseGoalReached = performedAfterCheck >= sum(current.plannedSets);
    const shouldRest = !exerciseGoalReached && (!isLastSet || hasNextExercise);
    if (shouldRest) {
      const seconds = Math.max(0, (actual[current.exerciseId]?.[setIndex] || current.plannedSets[setIndex]) * current.restSecondsPerRep);
      if (seconds > 0) setRest({ left: seconds, total: seconds, advance: isLastSet && hasNextExercise, label: current.name });
      else if (isLastSet && hasNextExercise) setExerciseIndex((value) => value + 1);
    }
  };

  const finish = () => {
    if (!hasDoneAny) return;
    const exercises: ExerciseSnapshot[] = plan.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      plannedSets: exercise.plannedSets,
      actualSets: (actual[exercise.exerciseId] || []).filter((_, index) => checked[exercise.exerciseId]?.[index]),
    }));
    const performed = exercises.reduce((total, exercise) => total + sum(exercise.actualSets), 0);
    if (performed <= 0) return;
    void onComplete({ dateKey, mode, exercises });
  };

  return (
    <main className="training-app training-workout" style={{ "--exercise-accent": current.accent } as React.CSSProperties}>
      <header className="training-workout-top">
        <button className="training-icon-button" onClick={onCancel} aria-label="Закрыть тренировку"><CloseIcon /></button>
        <div className="training-workout-progress"><span style={{ width: `${Math.min(100, (doneReps / totalPlan) * 100)}%` }} /></div>
        <span className="training-workout-count">{doneReps}/{totalPlan}</span>
      </header>

      <motion.section
        key={current.exerciseId}
        className="training-workout-body"
        initial={reduceMotion ? false : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="training-workout-step"><span>УПРАЖНЕНИЕ {exerciseIndex + 1} ИЗ {plan.length}</span><strong>{MODE_META[mode].label}</strong></div>
        <div className="training-workout-title"><span>{current.emoji}</span><div><h1>{current.name}</h1><p>цель {sum(current.plannedSets)} · подходов сколько хочешь</p></div></div>

        <div className="training-set-list">
          {(actual[current.exerciseId] || []).map((storedValue, setIndex) => {
            const planned = current.plannedSets[setIndex];
            const value = storedValue;
            const isChecked = !!currentChecked[setIndex];
            return (
              <article className={`training-set-card${isChecked ? " done" : ""}`} key={setIndex}>
                <button className="training-set-check" onClick={() => toggleSet(setIndex)} aria-label={`${isChecked ? "Отменить" : "Выполнить"} подход ${setIndex + 1}`}>
                  {isChecked ? <CheckIcon /> : <span>{setIndex + 1}</span>}
                </button>
                <div className="training-set-main">
                  <span>ПОДХОД {String(setIndex + 1).padStart(2, "0")}</span>
                  <div><input type="number" inputMode="numeric" value={value} onChange={(event) => changeActual(setIndex, Number(event.target.value) || 0)} /><em>раз</em></div>
                  <small>{planned == null ? "свободный подход" : `вариант ${planned}${value > planned ? ` · +${value - planned}` : ""}`}</small>
                </div>
                <div className="training-set-adjust">
                  <button onClick={() => changeActual(setIndex, value - 5)} aria-label="Минус пять">−5</button>
                  <button onClick={() => changeActual(setIndex, value - 1)} aria-label="Минус один">−1</button>
                  <button onClick={() => changeActual(setIndex, value + 1)} aria-label="Плюс один">+1</button>
                  <button onClick={() => changeActual(setIndex, value + 5)} aria-label="Плюс пять">+5</button>
                  <button className="training-remove-set" onClick={() => removeSet(setIndex)} disabled={(actual[current.exerciseId] || []).length <= 1}>Удалить</button>
                </div>
              </article>
            );
          })}
          <button className="training-add-set" onClick={addSet}>+ Добавить подход</button>
        </div>
      </motion.section>

      <div className="training-workout-bottom">
        {hasDoneAny ? (
          <button className={`training-primary-button${goalReached ? "" : " training-partial-button"}`} onClick={finish}>
            {goalReached ? `Завершить — цель выполнена · ${doneReps}` : `Закончить сегодня · ${doneReps} · без роста рекорда`}
          </button>
        ) : exerciseIndex < plan.length - 1 && currentChecked.some(Boolean) && !rest ? (
          <button className="training-secondary-button" onClick={() => setExerciseIndex((value) => value + 1)}>Следующее упражнение</button>
        ) : (
          <p>Сделал подход — отметь галочкой. Можно закончить после любого количества повторов.</p>
        )}
      </div>

      <AnimatePresence>
        {rest && (
          <RestTimer
            rest={rest}
            reduceMotion={reduceMotion}
            onAdd={() => setRest((value) => value ? { ...value, left: value.left + 30, total: value.total + 30 } : null)}
            onSkip={() => {
              if (rest.advance) setExerciseIndex((value) => Math.min(plan.length - 1, value + 1));
              setRest(null);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function RestTimer({
  rest,
  reduceMotion,
  onAdd,
  onSkip,
}: {
  rest: { left: number; total: number; advance: boolean; label: string };
  reduceMotion: boolean;
  onAdd: () => void;
  onSkip: () => void;
}) {
  const radius = 118;
  const circumference = 2 * Math.PI * radius;
  const progress = rest.total ? rest.left / rest.total : 0;
  const minutes = Math.floor(rest.left / 60);
  const seconds = rest.left % 60;
  return (
    <motion.div className="training-rest-overlay" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="training-rest-sheet" initial={reduceMotion ? false : { y: 36, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 24, opacity: 0 }}>
        <span className="training-rest-kicker">УМНЫЙ ОТДЫХ · {rest.label.toUpperCase()}</span>
        <div className="training-rest-ring">
          <svg viewBox="0 0 280 280" aria-hidden>
            <circle className="track" cx="140" cy="140" r={radius} />
            <circle className="value" cx="140" cy="140" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
          </svg>
          <div><strong>{minutes}:{String(seconds).padStart(2, "0")}</strong><span>до следующего подхода</span></div>
        </div>
        <p>6 секунд отдыха за каждый фактически сделанный повтор.</p>
        <div className="training-rest-actions"><button onClick={onAdd}>+30 секунд</button><button className="primary" onClick={onSkip}>Готов раньше</button></div>
      </motion.div>
    </motion.div>
  );
}

function CompletionCelebration({ session, reduceMotion, onClose }: { session: TrainingSession; reduceMotion: boolean; onClose: () => void }) {
  const extras = Math.max(0, session.totalActual - session.totalPlanned);
  return (
    <motion.div className="training-celebration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="training-celebration-card" initial={reduceMotion ? false : { y: 30, scale: 0.9 }} animate={{ y: 0, scale: 1 }}>
        <div className="training-celebration-star"><CheckIcon /></div>
        <span>ДЕНЬ ЗАКРЫТ</span>
        <strong>{session.totalActual}</strong>
        <h2>Ты сделал тренировку</h2>
        <p>{session.goalCompleted ? (extras ? `И ещё ${extras} сверх заявленного.` : "Цель выполнена.") : "День сохранён без роста рекордной цели."}</p>
        <button className="training-primary-button" onClick={onClose}>Продолжить</button>
      </motion.div>
    </motion.div>
  );
}

function positive(value: string, fallback: number) {
  return Math.max(1, Math.floor(Number(value) || fallback));
}

function hslToHex(h: number, s: number, l: number) {
  const saturation = s / 100;
  const lightness = l / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((value) => Math.round((value + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function dayWord(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

function ChevronLeft() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>; }
function ChevronRight() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M9 18l6-6-6-6" /></svg>; }
function CheckIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12.5l4.2 4.1L19 7" /></svg>; }
function CloseIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>; }
function HistoryIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 12a8 8 0 108-8 8.8 8.8 0 00-6.2 2.6L4 8.5M4 4v4.5h4.5M12 7v5l3 2" /></svg>; }
function SlidersIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 7h10M18 7h2M4 17h3M11 17h9M14 4v6M8 14v6" /></svg>; }
function TodayIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M6 3v3M18 3v3M4 9h16M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1zM8 13h3v3H8z" /></svg>; }
function ProgressIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /></svg>; }
function TrashIcon() { return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>; }
