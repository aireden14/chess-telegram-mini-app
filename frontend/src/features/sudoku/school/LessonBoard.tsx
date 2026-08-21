import React from "react";
import { blockEdgeClasses, symbolFor, variantOf } from "../sudokuVariants";

const VARIANT = variantOf(9);
const NOTE_VALUES = Array.from({ length: 9 }, (_, i) => i + 1);

export interface LessonBoardProps {
  /** Значения клеток: null — пусто. */
  values: Array<number | null>;
  /** Кандидаты по клеткам; null — не показывать вовсе. */
  candidates: number[][] | null;
  /** Область приёма: линия или блок, внутри которых надо смотреть. */
  scope?: number[];
  /** Клетки самого приёма — показываются в разборе и в раскрытом ответе. */
  focus?: number[];
  /** Клетки, отмеченные игроком. */
  marks?: number[];
  /** Отмеченные ошибочно — после проверки. */
  wrong?: number[];
  /** Вычеркнутые приёмом кандидаты: [клетка, цифра]. */
  strikes?: Array<[number, number]>;
  /** Цифра, поставленная в разборе. */
  placed?: { index: number; digit: number } | null;
  /** Гасить ли доску вне области приёма. Выключается на разборе: вычеркнутые
   *  кандидаты почти всегда лежат снаружи, и в тени их не разглядеть. */
  dim?: boolean;
  selected?: number | null;
  onSelect?: (index: number) => void;
}

/**
 * Доска урока. От боевой отличается тем, что все цифры на ней — данность:
 * играть тут нечего, можно только показать приём или отметить клетки. Поэтому
 * своя разметка подсветок, но те же классы сетки, что и в игре.
 */
export function LessonBoard({
  values,
  candidates,
  scope = [],
  focus = [],
  marks = [],
  wrong = [],
  strikes = [],
  placed = null,
  dim = true,
  selected = null,
  onSelect,
}: LessonBoardProps) {
  const scopeSet = new Set(scope);
  const focusSet = new Set(focus);
  const markSet = new Set(marks);
  const wrongSet = new Set(wrong);
  const struck = new Map<number, Set<number>>();
  for (const [index, digit] of strikes) {
    if (!struck.has(index)) struck.set(index, new Set());
    struck.get(index)!.add(digit);
  }

  return (
    <div
      className="sudoku-board school-board"
      role="grid"
      aria-label="Доска урока"
      style={
        {
          "--sudoku-size": 9,
          "--sudoku-note-cols": 3,
          "--sudoku-note-rows": 3,
        } as React.CSSProperties
      }
    >
      {values.map((value, index) => {
        const shown = placed && placed.index === index ? placed.digit : value;
        const isPlaced = Boolean(placed && placed.index === index && value === null);
        const classes = [
          "sudoku-cell",
          blockEdgeClasses(index, VARIANT),
          shown ? "given" : "",
          isPlaced ? "school-placed" : "",
          scopeSet.has(index) ? "school-scope" : "",
          // Прожектор: область приёма остаётся яркой, остальная доска гаснет.
          // Без этого вопрос «в подсвеченном блоке» повисает — на телефоне
          // слабую подсветку внутри области просто не видно.
          dim && scopeSet.size > 0 && !scopeSet.has(index) ? "school-dim" : "",
          focusSet.has(index) ? "school-focus" : "",
          markSet.has(index) ? "school-mark" : "",
          wrongSet.has(index) ? "school-wrong" : "",
          selected === index ? "selected" : "",
          struck.has(index) ? "school-cut" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const notes = candidates?.[index] ?? [];
        const cellStrikes = struck.get(index);

        return (
          <button
            key={index}
            className={classes}
            onClick={() => onSelect?.(index)}
            disabled={!onSelect}
            role="gridcell"
            aria-label={`Строка ${Math.floor(index / 9) + 1}, колонка ${(index % 9) + 1}${
              shown ? `, ${symbolFor(shown)}` : ""
            }`}
          >
            {shown ? (
              <span>{symbolFor(shown)}</span>
            ) : notes.length ? (
              <span className="sudoku-notes">
                {NOTE_VALUES.map((note) => (
                  <i key={note} className={cellStrikes?.has(note) ? "school-struck" : undefined}>
                    {notes.includes(note) ? symbolFor(note) : ""}
                  </i>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
