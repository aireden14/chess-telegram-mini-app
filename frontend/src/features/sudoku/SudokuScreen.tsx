import React, { useEffect } from "react";
import { TopNav } from "../../components/TopNav";
import { triggerHaptic } from "../../hooks/useTelegram";
import { SudokuDifficulty } from "./types";
import { useSudokuStore } from "./sudokuStore";
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

  useEffect(() => {
    if (!puzzle) startNew("medium");
  }, [puzzle, startNew]);

  useEffect(() => {
    const id = window.setInterval(() => tick(), 1000);
    tick();
    return () => window.clearInterval(id);
  }, [tick]);

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
              <strong>{stats.dailyStreak}</strong>
            </div>
            <div className="sudoku-victory-actions">
              <button className="btn btn-primary" onClick={() => startNew(victory.difficulty)}>
                Новая
              </button>
              <button className="btn" onClick={dismissVictory}>
                Остаться
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
