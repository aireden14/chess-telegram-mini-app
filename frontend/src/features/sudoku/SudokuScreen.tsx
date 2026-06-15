import React, { useEffect, useRef, useState } from "react";
import { TopNav } from "../../components/TopNav";
import { triggerHaptic } from "../../hooks/useTelegram";
import { celebrate } from "../../hooks/celebrate";
import { SudokuDifficulty } from "./types";
import { useSudokuStore } from "./sudokuStore";
import { useSudokuProfile } from "./sudokuProfileStore";
import { SudokuBoard } from "./SudokuBoard";
import { SudokuNumberPad } from "./SudokuNumberPad";
import { SudokuStats, difficultyLabel, formatSudokuTime } from "./SudokuStats";

const DIFFICULTIES: SudokuDifficulty[] = ["easy", "medium", "hard", "expert"];

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
    stats,
    undoStack,
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
  const reportedRef = useRef<string | null>(null);
  const [showLeaders, setShowLeaders] = useState(false);

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
    const key = `${victory.mode}-${victory.difficulty}-${victory.elapsedSeconds}-${victory.mistakes}-${victory.hintsUsed}`;
    if (reportedRef.current === key) return;
    reportedRef.current = key;
    celebrate();
    report({
      difficulty: victory.difficulty,
      mode: victory.mode,
      elapsedSeconds: victory.elapsedSeconds,
      mistakes: victory.mistakes,
      hintsUsed: victory.hintsUsed,
      dailyDate: puzzle?.dailyDate ?? null,
    });
  }, [victory, report, puzzle]);

  useEffect(() => {
    if (reward?.leveledUp) celebrate();
  }, [reward]);

  if (!puzzle) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  const hasProgress = !isComplete && entries.some((value, index) => value !== puzzle.givens[index]);
  const showErrors = checkMode === "instant" || checkedAt !== null;
  const hasEditableSelection =
    selectedIndex !== null && puzzle.givens[selectedIndex] === null && !isComplete;
  const inputHint = selectedIndex === null
    ? selectedNumber
      ? `Цифра ${selectedNumber} выбрана для подсветки. Тап по клетке не поставит её автоматически.`
      : "Выбери клетку, затем цифру."
    : hasEditableSelection
      ? notesMode
        ? "Режим заметок: нажми цифру, чтобы добавить или убрать кандидат."
        : "Теперь нажми цифру снизу, чтобы поставить её в выбранную клетку."
      : "Это стартовая клетка. Выбери пустую клетку, затем цифру.";

  const confirmReplace = () =>
    !hasProgress ||
    window.confirm("Начать новую партию? Текущий прогресс в судоку будет заменён.");

  const startClassic = (difficulty: SudokuDifficulty) => {
    if (!confirmReplace()) return;
    startNew(difficulty);
    triggerHaptic("medium");
  };

  const startToday = () => {
    if (!confirmReplace()) return;
    startDaily();
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

  return (
    <div className="app-screen sudoku-screen">
      <TopNav title="Судоку" backTo="/" />

      <section className="sudoku-hero card">
        <div>
          <p className="sudoku-kicker">Игры · Судоку</p>
          <h1 className="h1">▦ Судоку</h1>
          <p className="muted">
            Чистая логика, заметки, подсказки и ежедневная задачка внутри Telegram.
          </p>
        </div>
        <div className="sudoku-hero-time">{formatSudokuTime(elapsedSeconds)}</div>
      </section>

      {profile && (
        <div className="sudoku-progress card">
          <div className="sudoku-rank">
            <div className="sudoku-rank-item">
              <span>Рейтинг</span>
              <strong>{profile.rating}</strong>
            </div>
            <div className="sudoku-rank-item">
              <span>Уровень</span>
              <strong>{profile.level}</strong>
            </div>
            <button
              className="sudoku-rank-item sudoku-rank-leaders"
              onClick={() => {
                fetchLeaderboard();
                setShowLeaders(true);
                triggerHaptic("light");
              }}
            >
              <span>Лидеры</span>
              <strong>›</strong>
            </button>
          </div>
          <div className="sudoku-xpbar">
            <div className="sudoku-xpbar-track">
              <div
                className="sudoku-xpbar-fill"
                style={{ width: `${profile.xp % 100}%` }}
              />
            </div>
            <div className="sudoku-xpbar-label">
              <span>Ур. {profile.level}</span>
              <span>{100 - (profile.xp % 100)} XP до {profile.level + 1} ур.</span>
            </div>
          </div>
          <div className="sudoku-streak">
            <span className="sudoku-streak-flame">🔥</span>
            Серия {profile.dailyStreak}
            {profile.bestStreak > 0 && <em> · рекорд {profile.bestStreak}</em>}
          </div>
        </div>
      )}

      <div className="sudoku-mode-panel">
        <div className="segment">
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty}
              className={`seg-item${puzzle.mode === "classic" && puzzle.difficulty === difficulty ? " active" : ""}`}
              onClick={() => startClassic(difficulty)}
            >
              {difficultyLabel(difficulty)}
            </button>
          ))}
        </div>
        <button
          className={`sudoku-daily${puzzle.mode === "daily" ? " active" : ""}`}
          onClick={startToday}
        >
          День
        </button>
      </div>

      <div className="sudoku-check-panel">
        <div className="segment">
          <button
            className={`seg-item${checkMode === "instant" ? " active" : ""}`}
            onClick={() => {
              setCheckMode("instant");
              triggerHaptic("light");
            }}
          >
            Проверять сразу
          </button>
          <button
            className={`seg-item${checkMode === "manual" ? " active" : ""}`}
            onClick={() => {
              setCheckMode("manual");
              triggerHaptic("light");
            }}
          >
            Проверять в конце
          </button>
        </div>
        {checkMode === "manual" && (
          <button className="sudoku-daily sudoku-check-button" onClick={handleCheck}>
            Проверить
          </button>
        )}
      </div>

      <SudokuStats
        puzzle={puzzle}
        elapsedSeconds={elapsedSeconds}
        mistakes={mistakes}
        hintsUsed={hintsUsed}
        entries={entries}
        stats={stats}
      />

      {daily && daily.tasks.length > 0 && (
        <div className="menu-group">
          <h2 className="h2">
            Задания дня · {daily.tasks.filter((t) => t.done).length}/{daily.tasks.length}
          </h2>
          <div className="sudoku-tasks">
            {daily.tasks.map((t) => (
              <div key={t.id} className={`sudoku-task${t.done ? " done" : ""}`}>
                <span className="sudoku-task-check">{t.done ? "✓" : ""}</span>
                <span className="sudoku-task-title">{t.title}</span>
                <span className="sudoku-task-xp">+{t.xp} XP</span>
              </div>
            ))}
          </div>
          {daily.tasks.every((t) => t.done) ? (
            <div className="sudoku-tasks-done">Все задания выполнены! +{daily.allDoneBonus} XP 🎉</div>
          ) : (
            <div className="sudoku-tasks-hint">Выполни все три — бонус +{daily.allDoneBonus} XP</div>
          )}
        </div>
      )}

      {achievements.length > 0 && (
        <div className="menu-group">
          <h2 className="h2">
            Достижения · {achievements.filter((a) => a.unlocked).length}/{achievements.length}
          </h2>
          <div className="sudoku-ach-grid">
            {achievements.map((a) => (
              <div key={a.id} className={`sudoku-ach${a.unlocked ? " unlocked" : ""}`}>
                <strong>{a.title}</strong>
                <span>{a.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sudoku-board-shell">
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

      <div className="sudoku-input-hint">{inputHint}</div>

      <SudokuNumberPad
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

      {isComplete && !victory && (
        <div className="card sudoku-complete-inline">
          <strong>Пазл решён</strong>
          <span>Можно начать новую партию или daily challenge.</span>
        </div>
      )}

      {victory && (
        <div className="sudoku-victory" role="dialog" aria-modal="true">
          <div className="sudoku-victory-card">
            <div className="sudoku-victory-orb">✓</div>
            <p className="sudoku-kicker">Решено</p>
            <h2>Чистая партия</h2>
            <p>
              {victory.mode === "daily" ? "Ежедневная" : difficultyLabel(victory.difficulty)} ·{" "}
              {formatSudokuTime(victory.elapsedSeconds)} · ошибок {victory.mistakes} · подсказок{" "}
              {victory.hintsUsed}
            </p>
            <div className="sudoku-victory-score">
              <span>Серия дней</span>
              <strong>{profile?.dailyStreak ?? stats.dailyStreak}</strong>
            </div>
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
                {reward.newlyUnlocked.length > 0 && (
                  <div className="sudoku-reward-unlocked">
                    🏅 {reward.newlyUnlocked.map((a) => a.title).join(", ")}
                  </div>
                )}
              </div>
            )}
            <div className="sudoku-victory-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  clearReward();
                  startNew(victory.difficulty);
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
      {showLeaders && (
        <div className="modal-backdrop" onClick={() => setShowLeaders(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
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
              <button className="btn btn-primary" onClick={() => setShowLeaders(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
