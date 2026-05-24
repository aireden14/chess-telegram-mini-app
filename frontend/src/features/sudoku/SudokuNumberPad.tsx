import React from "react";

interface SudokuNumberPadProps {
  entries: Array<number | null>;
  selectedNumber: number | null;
  notesMode: boolean;
  canUndo: boolean;
  onNumber: (value: number) => void;
  onErase: () => void;
  onUndo: () => void;
  onHint: () => void;
  onToggleNotes: () => void;
}

export function SudokuNumberPad({
  entries,
  selectedNumber,
  notesMode,
  canUndo,
  onNumber,
  onErase,
  onUndo,
  onHint,
  onToggleNotes,
}: SudokuNumberPadProps) {
  return (
    <div className="sudoku-pad">
      <div className="sudoku-number-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => {
          const count = entries.filter((entry) => entry === value).length;
          return (
            <button
              key={value}
              className={`sudoku-number${selectedNumber === value ? " active" : ""}`}
              onClick={() => onNumber(value)}
              disabled={count >= 9}
            >
              <strong>{value}</strong>
              <span>{count}/9</span>
            </button>
          );
        })}
      </div>

      <div className="sudoku-actions">
        <button className="sudoku-tool" onClick={onErase}>
          Стереть
        </button>
        <button className={`sudoku-tool${notesMode ? " active" : ""}`} onClick={onToggleNotes}>
          Заметки
        </button>
        <button className="sudoku-tool" onClick={onUndo} disabled={!canUndo}>
          Назад
        </button>
        <button className="sudoku-tool accent" onClick={onHint}>
          Подсказка
        </button>
      </div>
    </div>
  );
}
