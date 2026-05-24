import React from "react";
import { SudokuPuzzle } from "./types";

interface SudokuBoardProps {
  puzzle: SudokuPuzzle;
  entries: Array<number | null>;
  notes: number[][];
  selectedIndex: number | null;
  selectedNumber: number | null;
  showErrors: boolean;
  onSelect: (index: number) => void;
}

function sameBox(a: number, b: number): boolean {
  const ar = Math.floor(a / 9);
  const ac = a % 9;
  const br = Math.floor(b / 9);
  const bc = b % 9;
  return Math.floor(ar / 3) === Math.floor(br / 3) && Math.floor(ac / 3) === Math.floor(bc / 3);
}

export function SudokuBoard({
  puzzle,
  entries,
  notes,
  selectedIndex,
  selectedNumber,
  showErrors,
  onSelect,
}: SudokuBoardProps) {
  const selectedValue = selectedNumber ?? (selectedIndex === null ? null : entries[selectedIndex]);

  return (
    <div className="sudoku-board" role="grid" aria-label="Судоку 9 на 9">
      {entries.map((value, index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const selectedRow = selectedIndex !== null ? Math.floor(selectedIndex / 9) : -1;
        const selectedCol = selectedIndex !== null ? selectedIndex % 9 : -1;
        const given = puzzle.givens[index] !== null;
        const isSelected = selectedIndex === index;
        const isPeer =
          selectedIndex !== null &&
          !isSelected &&
          (row === selectedRow || col === selectedCol || sameBox(index, selectedIndex));
        const isSameValue = !!value && !!selectedValue && value === selectedValue;
        const isError = showErrors && !!value && value !== puzzle.solution[index];
        const classes = [
          "sudoku-cell",
          given ? "given" : "",
          selectedNumber && !given && !value ? "number-target" : "",
          isSelected ? "selected" : "",
          isPeer ? "peer" : "",
          isSameValue ? "same-value" : "",
          isError ? "error" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={index}
            className={classes}
            onClick={() => onSelect(index)}
            role="gridcell"
            aria-label={`Строка ${row + 1}, колонка ${col + 1}${value ? `, ${value}` : ""}`}
          >
            {value ? (
              <span>{value}</span>
            ) : notes[index]?.length ? (
              <span className="sudoku-notes">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((note) => (
                  <i key={note}>{notes[index].includes(note) ? note : ""}</i>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
