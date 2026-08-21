import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../../components/TopNav";
import { triggerHaptic } from "../../hooks/useTelegram";
import { celebrate } from "../../hooks/celebrate";
import { SudokuDifficulty } from "./types";
import { useSudokuStore } from "./sudokuStore";
import { useSudokuProfile, SudokuReward } from "./sudokuProfileStore";
import { SudokuBoard } from "./SudokuBoard";
import { SudokuNumberPad } from "./SudokuNumberPad";
import { difficultyLabel, formatSudokuTime, DIFFICULTY_HINTS } from "./SudokuStats";
import { TECHNIQUE_LABELS, SudokuTechnique } from "./sudokuLogic";
import { difficultiesForSize } from "./sudokuEngine";
import { SUDOKU_SIZES, SUDOKU_VARIANTS, SudokuSize, variantOf } from "./sudokuVariants";
import { useSudokuSchool } from "./school/schoolStore";
import { LESSON_COUNT } from "./school/lessons";

// Тёмные эмодзи на тёмной панели не читаются — у «Бездны» намеренно светящийся значок.
const DIFFICULTY_ICONS: Partial<Record<SudokuDifficulty, string>> = {
  labyrinth: "🌀",
  abyss: "🌌",
};

type Menu = "settings" | "tasks" | "ach" | "leaders" | null;
interface Toast {
  id: number;
  icon: string;
  text: string;
}

export function SudokuScreen() {
  const {
    puzzle,
    entries,
    notes,
    selectedIndex,
    selectedNumber,
    notesMode,
    checkMode,
    checkedAt,
    mistakes,
    hintsUsed,
    elapsedSeconds,
    isComplete,
    victory,
    undoStack,
    generating,
    startNew,
    startDaily,
    selectCell,
    selectNumber,
    enterNumber,
    erase,
    undo,
    hint,
    checkPuzzle,
    tick,
    setCheckMode,
    toggleNotesMode,
    dismissVictory,
  } = useSudokuStore();

  const {
    profile,
    achievements,
    daily,
    leaderboard,
    reward,
    fetchAll,
    fetchLeaderboard,
    report,
    clearReward,
  } = useSudokuProfile();

  const nav = useNavigate();
  const schoolDone = useSudokuSchool((state) => state.completed.length);

  const reportedRef = useRef<string | null>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const toastedRewardRef = useRef<SudokuReward | null>(null);

  function pushToast(icon: string, text: string) {
    const id = (toastIdRef.current += 1);
    setToasts((t) => [...t, { id, icon, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }

  useEffect(() => {
    if (!puzzle) startNew("medium");
  }, [puzzle, startNew]);

  useEffect(() => {
    const id = window.setInterval(() => tick(), 1000);
    tick();
    return () => window.clearInterval(id);
  }, [tick]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!victory) return;
    const key = `${victory.mode}-${victory.difficulty}-${victory.size}-${victory.elapsedSeconds}-${victory.mistakes}-${victory.hintsUsed}`;
    if (reportedRef.current === key) return;
    reportedRef.current = key;
    celebrate();
    report({
      difficulty: victory.difficulty,
      size: victory.size,
      mode: victory.mode,
      elapsedSeconds: victory.elapsedSeconds,
      mistakes: victory.mistakes,
      hintsUsed: victory.hintsUsed,
      dailyDate: puzzle?.dailyDate ?? null,
    });
  }, [victory, report, puzzle]);

  // Transient toasts for unlocks/tasks/level-up
  useEffect(() => {
    if (!reward || reward === toastedRewardRef.current) return;
    toastedRewardRef.current = reward;
    reward.newlyCompletedTasks.forEach((t) => pushToast("🎯", `Задание: ${t.title} +${t.xp} XP`));
    reward.newlyUnlocked.forEach((a) => pushToast("🏅", `Достижение: ${a.title}`));
    if (reward.leveledUp) {
      pushToast("⬆️", `Новый уровень ${reward.level}!`);
      celebrate();
    }
  }, [reward]);

  if (!puzzle) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  const variant = variantOf(puzzle.size);
  const difficulties = difficultiesForSize(variant.size);
  const hasProgress = !isComplete && entries.some((value, index) => value !== puzzle.givens[index]);
  const showErrors = checkMode === "instant" || checkedAt !== null;
  const hasEditableSelection =
    selectedIndex !== null && puzzle.givens[selectedIndex] === null && !isComplete;

  const confirmReplace = () =>
    !hasProgress ||
    window.confirm("Начать новую партию? Текущий прогресс в судоку будет заменён.");

  const startClassic = (difficulty: SudokuDifficulty) => {
    if (!confirmReplace()) return;
    startNew(difficulty, variant.size);
    triggerHaptic("medium");
    setMenu(null);
  };

  const startSize = (size: SudokuSize) => {
    if (size === variant.size && puzzle.mode === "classic") return;
    if (!confirmReplace()) return;
    // Сложность сохраняем: «Лабиринт» и «Бездна» на больших полях сами
    // сведутся к «Эксперту» — их решателя там нет.
    startNew(puzzle.difficulty, size);
    triggerHaptic("medium");
    setMenu(null);
  };

  const startToday = () => {
    if (!confirmReplace()) return;
    startDaily();
    triggerHaptic("medium");
    setMenu(null);
  };

  const restartPuzzle = () => {
    if (!confirmReplace()) return;
    if (puzzle.mode === "daily") startDaily();
    else startNew(puzzle.difficulty, variant.size);
    triggerHaptic("medium");
  };

  const handleNumber = (value: number) => {
    selectNumber(selectedNumber === value ? null : value);
    if (!hasEditableSelection) {
      triggerHaptic("light");
      return;
    }
    const result = enterNumber(value);
    if (result === "error") triggerHaptic("warning");
    else if (result === "complete") triggerHaptic("success");
    else triggerHaptic("light");
  };

  const handleCell = (index: number) => {
    selectCell(index);
    triggerHaptic("light");
  };

  const handleHint = () => {
    const result = hint();
    if (result === "complete") triggerHaptic("success");
    else if (result === "ok") triggerHaptic("medium");
    else triggerHaptic("warning");
  };

  const handleCheck = () => {
    const result = checkPuzzle();
    if (result === "complete") triggerHaptic("success");
    else if (result === "errors") triggerHaptic("warning");
    else triggerHaptic("medium");
  };

  const tasksDone = daily ? daily.tasks.filter((t) => t.done).length : 0;
  const tasksTotal = daily ? daily.tasks.length : 0;
  const achUnlocked = achievements.filter((a) => a.unlocked).length;
  const modeLabel = puzzle.mode === "daily" ? "День" : difficultyLabel(puzzle.difficulty);
  const sizeLabel = variant.size === 9 ? null : variant.label;

  return (
    <div className="app-screen sudoku-screen">
      <TopNav title="Судоку" backTo="/" />

      <div className="sudoku-toolbar">
        <div className="sudoku-toolbar-left">
          <span className="sudoku-toolbar-time">{formatSudokuTime(elapsedSeconds)}</span>
          <span className="sudoku-toolbar-mode">{modeLabel}</span>
          {sizeLabel && <span className="sudoku-toolbar-size">{sizeLabel}</span>}
        </div>
        <div className="sudoku-toolbar-actions">
          <button className="sudoku-iconbtn" onClick={restartPuzzle} aria-label="Новая партия" title="Новая партия">
            ↻
          </button>
          <button
            className="sudoku-iconbtn"
            onClick={() => {
              nav("/sudoku/school");
              triggerHaptic("light");
            }}
            aria-label="Школа судоку"
            title="Школа судоку: 20 уроков"
          >
            🎓
            {schoolDone < LESSON_COUNT && (
              <span className="sudoku-iconbtn-badge">
                {schoolDone}/{LESSON_COUNT}
              </span>
            )}
          </button>
          <button
            className="sudoku-iconbtn"
            onClick={() => {
              setMenu("tasks");
              triggerHaptic("light");
            }}
            aria-label="Задания"
            title="Задания дня"
          >
            🎯
            {tasksTotal > 0 && tasksDone < tasksTotal && (
              <span className="sudoku-iconbtn-badge">
                {tasksDone}/{tasksTotal}
              </span>
            )}
          </button>
          <button
            className="sudoku-iconbtn"
            onClick={() => {
              setMenu("ach");
              triggerHaptic("light");
            }}
            aria-label="Достижения и прогресс"
            title="Достижения и прогресс"
          >
            🏆
          </button>
          <button
            className="sudoku-iconbtn"
            onClick={() => {
              setMenu("settings");
              triggerHaptic("light");
            }}
            aria-label="Настройки"
            title="Настройки"
          >
            ⚙
          </button>
        </div>
      </div>

      <div className="sudoku-board-shell">
        {generating && (
          <div className="sudoku-generating" role="status">
            <div className="spinner" />
            <span>Подбираем расклад…</span>
          </div>
        )}
        <SudokuBoard
          puzzle={puzzle}
          entries={entries}
          notes={notes}
          selectedIndex={selectedIndex}
          selectedNumber={selectedNumber}
          showErrors={showErrors}
          onSelect={handleCell}
        />
      </div>

      <SudokuNumberPad
        variant={variant}
        entries={entries}
        selectedNumber={selectedNumber}
        notesMode={notesMode}
        canUndo={undoStack.length > 0}
        onNumber={handleNumber}
        onErase={() => {
          erase();
          triggerHaptic("light");
        }}
        onUndo={() => {
          undo();
          triggerHaptic("light");
        }}
        onHint={handleHint}
        onToggleNotes={() => {
          toggleNotesMode();
          triggerHaptic("light");
        }}
      />

      {/* ===== Toasts ===== */}
      {toasts.length > 0 && (
        <div className="sudoku-toasts">
          {toasts.map((t) => (
            <div key={t.id} className="sudoku-toast">
              <span className="sudoku-toast-icon">{t.icon}</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* ===== Settings menu ===== */}
      {menu === "settings" && (
        <div className="modal-backdrop" onClick={() => setMenu(null)}>
          <div className="modal sudoku-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Настройки</h3>
            <div className="sudoku-menu-section">
              <span className="sudoku-menu-label">Размер поля</span>
              <div className="segment sudoku-size-grid">
                {SUDOKU_SIZES.map((size) => {
                  const item = SUDOKU_VARIANTS[size];
                  return (
                    <button
                      key={size}
                      className={`seg-item seg-item-size${
                        puzzle.mode === "classic" && variant.size === size ? " active" : ""
                      }`}
                      onClick={() => startSize(size)}
                    >
                      <strong>{item.label}</strong>
                      <em>{item.name}</em>
                    </button>
                  );
                })}
              </div>
              <div className="sudoku-menu-notes">
                <p>
                  На больших полях клетки заполняются символами <strong>1–9</strong>, дальше{" "}
                  <strong>A, B, C…</strong> — двузначные числа в такой клетке нечитаемы.
                  «Лабиринт» и «Бездна» остаются только на 9×9.
                </p>
              </div>
            </div>
            <div className="sudoku-menu-section">
              <span className="sudoku-menu-label">Сложность</span>
              <div className="segment sudoku-menu-grid">
                {difficulties.map((d) => (
                  <button
                    key={d}
                    className={`seg-item${puzzle.mode === "classic" && puzzle.difficulty === d ? " active" : ""}${
                      DIFFICULTY_HINTS[d] ? " seg-item-graded" : ""
                    }`}
                    onClick={() => startClassic(d)}
                  >
                    {DIFFICULTY_ICONS[d] ? `${DIFFICULTY_ICONS[d]} ` : ""}
                    {difficultyLabel(d)}
                  </button>
                ))}
              </div>
              <div className="sudoku-menu-notes">
                {difficulties.filter((d) => DIFFICULTY_HINTS[d]).map((d) => (
                  <p key={d}>
                    <strong>
                      {DIFFICULTY_ICONS[d]} {difficultyLabel(d)}
                    </strong>{" "}
                    — {DIFFICULTY_HINTS[d]}
                  </p>
                ))}
              </div>
              <button
                className={`btn btn-block${puzzle.mode === "daily" ? " btn-primary" : ""}`}
                style={{ marginTop: 10 }}
                onClick={startToday}
              >
                Задача дня
              </button>
              <button className="btn btn-block" style={{ marginTop: 10 }} onClick={() => nav("/sudoku/school")}>
                🎓 Школа судоку · {schoolDone}/{LESSON_COUNT}
              </button>
            </div>
            <div className="sudoku-menu-section">
              <span className="sudoku-menu-label">Проверка ошибок</span>
              <div className="segment">
                <button
                  className={`seg-item${checkMode === "instant" ? " active" : ""}`}
                  onClick={() => setCheckMode("instant")}
                >
                  Сразу
                </button>
                <button
                  className={`seg-item${checkMode === "manual" ? " active" : ""}`}
                  onClick={() => setCheckMode("manual")}
                >
                  В конце
                </button>
              </div>
              {checkMode === "manual" && (
                <button className="btn btn-block" style={{ marginTop: 10 }} onClick={handleCheck}>
                  Проверить сейчас
                </button>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setMenu(null)}>
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Daily tasks menu ===== */}
      {menu === "tasks" && (
        <div className="modal-backdrop" onClick={() => setMenu(null)}>
          <div className="modal sudoku-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Задания дня · {tasksDone}/{tasksTotal}</h3>
            <div className="sudoku-tasks" style={{ marginTop: 12 }}>
              {daily?.tasks.map((t) => (
                <div key={t.id} className={`sudoku-task${t.done ? " done" : ""}`}>
                  <span className="sudoku-task-check">{t.done ? "✓" : ""}</span>
                  <span className="sudoku-task-title">{t.title}</span>
                  <span className="sudoku-task-xp">+{t.xp} XP</span>
                </div>
              ))}
            </div>
            {daily && (daily.tasks.every((t) => t.done) ? (
              <div className="sudoku-tasks-done">Все задания выполнены! +{daily.allDoneBonus} XP 🎉</div>
            ) : (
              <div className="sudoku-tasks-hint">Выполни все — бонус +{daily.allDoneBonus} XP</div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setMenu(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Achievements + progress menu ===== */}
      {menu === "ach" && (
        <div className="modal-backdrop" onClick={() => setMenu(null)}>
          <div className="modal sudoku-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Прогресс</h3>
            {profile && (
              <>
                <div className="sudoku-rank" style={{ marginTop: 12 }}>
                  <div className="sudoku-rank-item">
                    <span>Рейтинг</span>
                    <strong>{profile.rating}</strong>
                  </div>
                  <div className="sudoku-rank-item">
                    <span>Уровень</span>
                    <strong>{profile.level}</strong>
                  </div>
                  <div className="sudoku-rank-item">
                    <span>Решено</span>
                    <strong>{profile.completed}</strong>
                  </div>
                </div>
                <div className="sudoku-xpbar" style={{ marginTop: 12 }}>
                  <div className="sudoku-xpbar-track">
                    <div className="sudoku-xpbar-fill" style={{ width: `${profile.xp % 100}%` }} />
                  </div>
                  <div className="sudoku-xpbar-label">
                    <span>Ур. {profile.level}</span>
                    <span>{100 - (profile.xp % 100)} XP до {profile.level + 1} ур.</span>
                  </div>
                </div>
                <div className="sudoku-streak" style={{ marginTop: 10 }}>
                  <span className="sudoku-streak-flame">🔥</span>
                  Серия {profile.dailyStreak}
                  {profile.bestStreak > 0 && <em> · рекорд {profile.bestStreak}</em>}
                </div>
                <button
                  className="btn btn-block"
                  style={{ marginTop: 12 }}
                  onClick={() => {
                    fetchLeaderboard();
                    setMenu("leaders");
                  }}
                >
                  🏆 Лидеры судоку
                </button>
              </>
            )}
            <h3 style={{ marginTop: 18 }}>Достижения · {achUnlocked}/{achievements.length}</h3>
            <div className="sudoku-ach-grid" style={{ marginTop: 12 }}>
              {achievements.map((a) => (
                <div key={a.id} className={`sudoku-ach${a.unlocked ? " unlocked" : ""}`}>
                  <strong>{a.title}</strong>
                  <span>{a.desc}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setMenu(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Leaderboard ===== */}
      {menu === "leaders" && (
        <div className="modal-backdrop" onClick={() => setMenu("ach")}>
          <div className="modal sudoku-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Лидеры судоку</h3>
            <div className="card-grouped" style={{ marginTop: 12, textAlign: "left" }}>
              {leaderboard.length === 0 ? (
                <div className="row">
                  <div className="row-title">Пока пусто</div>
                </div>
              ) : (
                leaderboard.map((r, i) => (
                  <div key={r.userId} className="row">
                    <div style={{ width: 26, fontWeight: 800 }}>{i + 1}</div>
                    <div className="row-title">{r.firstName}</div>
                    <div className="row-value">{r.rating}</div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setMenu("ach")}>
                Назад
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Victory ===== */}
      {victory && (
        <div className="sudoku-victory" role="dialog" aria-modal="true">
          <div className="sudoku-victory-card">
            <div className="sudoku-victory-orb">✓</div>
            <p className="sudoku-kicker">Решено</p>
            <h2>Чистая партия</h2>
            <p>
              {victory.mode === "daily" ? "Ежедневная" : difficultyLabel(victory.difficulty)} ·{" "}
              {SUDOKU_VARIANTS[victory.size].label} · {formatSudokuTime(victory.elapsedSeconds)} ·
              ошибок {victory.mistakes} · подсказок {victory.hintsUsed}
            </p>
            {puzzle.techniques && puzzle.techniques.length > 0 && (
              <p className="sudoku-victory-tech">
                Без этого расклад не сходился:{" "}
                {puzzle.techniques
                  .map((technique) => TECHNIQUE_LABELS[technique as SudokuTechnique] ?? technique)
                  .join(", ")}
              </p>
            )}
            {reward && (
              <div className="sudoku-reward">
                {reward.leveledUp && (
                  <div className="sudoku-reward-levelup">⬆️ Новый уровень {reward.level}!</div>
                )}
                <div className="sudoku-reward-points">+{reward.points} XP</div>
                <div className="sudoku-reward-breakdown">
                  <span>Партия +{reward.base}</span>
                  {reward.taskBonus > 0 && <span>Задания +{reward.taskBonus}</span>}
                  {reward.allDoneBonus > 0 && <span>Все задания +{reward.allDoneBonus}</span>}
                  {reward.streakBonus > 0 && <span>Серия +{reward.streakBonus}</span>}
                </div>
              </div>
            )}
            <div className="sudoku-victory-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  clearReward();
                  startNew(victory.difficulty, victory.size);
                }}
              >
                Новая
              </button>
              <button
                className="btn"
                onClick={() => {
                  clearReward();
                  dismissVictory();
                }}
              >
                Остаться
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
