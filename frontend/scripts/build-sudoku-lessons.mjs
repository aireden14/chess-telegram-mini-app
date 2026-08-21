#!/usr/bin/env node
/**
 * Генератор позиций для «Школы судоку» (`src/features/sudoku/school`).
 *
 * Позиция честна, если из неё нельзя выжать ничего проще изучаемого приёма, а сам
 * приём в ней читается однозначно. Каждая позиция проверяется дважды:
 *
 *  1. Собственным инструментированным решателем — он же рассказывает, из каких
 *     клеток состоит приём и каких кандидатов он лишает: это нужно и для
 *     подсветки, и для текста разбора.
 *  2. Боевым `sudokuLogic.ts` из игры: `findDeduction(позиция, ранг−1)` обязан
 *     вернуть `null` (проще — никак), а `findDeduction(позиция, ранг)` — что-то
 *     найти. Если решатель игры не согласен, позиция летит.
 *
 * Кандидаты считаются заново на каждом шаге — ровно как у игрока, который стирает
 * заметки после хода. Иначе урок опирался бы на невидимое игроку состояние.
 *
 * Два вида задач:
 *   • «place»   — приёмы-одиночки: игрок ставит цифру в клетку.
 *   • «pattern» — приёмы-исключения: игрок отмечает клетки, из которых приём
 *                 состоит. Одно исключение почти никогда не закрывает клетку
 *                 сразу, поэтому спрашивать «куда встанет цифра» тут нечестно.
 *
 * Запуск: npm run sudoku:lessons  (флаги: --expert=N --labyrinth=N --abyss=N --why)
 */

import { writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const SIZE = 9;
const CELLS = 81;
const ALL_MASK = 0x1ff;

// ─────────────────────────── единицы поля ───────────────────────────

const ROW_UNITS = [];
const COL_UNITS = [];
const BOX_UNITS = [];

for (let i = 0; i < SIZE; i += 1) {
  const row = [];
  const col = [];
  const box = [];
  for (let j = 0; j < SIZE; j += 1) {
    row.push(i * SIZE + j);
    col.push(j * SIZE + i);
    const boxRow = Math.floor(i / 3) * 3 + Math.floor(j / 3);
    const boxCol = (i % 3) * 3 + (j % 3);
    box.push(boxRow * SIZE + boxCol);
  }
  ROW_UNITS.push(row);
  COL_UNITS.push(col);
  BOX_UNITS.push(box);
}

const PEERS = [];
for (let index = 0; index < CELLS; index += 1) {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  const peers = new Set([...ROW_UNITS[row], ...COL_UNITS[col], ...BOX_UNITS[box]]);
  peers.delete(index);
  PEERS.push([...peers]);
}

const SEES = PEERS.map((peers) => {
  const row = new Array(CELLS).fill(false);
  for (const peer of peers) row[peer] = true;
  return row;
});

const boxOf = (index) => Math.floor(Math.floor(index / SIZE) / 3) * 3 + Math.floor((index % SIZE) / 3);
const bit = (digit) => 1 << (digit - 1);

function popcount(mask) {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

function digitsOf(mask) {
  const digits = [];
  for (let digit = 1; digit <= SIZE; digit += 1) if (mask & bit(digit)) digits.push(digit);
  return digits;
}

const UNITS = [
  ...ROW_UNITS.map((cells, index) => ({ cells, kind: "row", index })),
  ...COL_UNITS.map((cells, index) => ({ cells, kind: "col", index })),
  ...BOX_UNITS.map((cells, index) => ({ cells, kind: "box", index })),
];

const BOX_UNIT_LIST = UNITS.filter((unit) => unit.kind === "box");
const LINE_UNIT_LIST = UNITS.filter((unit) => unit.kind !== "box");

// ─────────────────────────── доска ───────────────────────────

/** Кандидаты считаются от значений — ровно то, что видит игрок с чистыми заметками. */
function createBoard(values) {
  const cands = new Int16Array(CELLS).fill(ALL_MASK);
  for (let index = 0; index < CELLS; index += 1) if (values[index]) cands[index] = 0;
  for (let index = 0; index < CELLS; index += 1) {
    const digit = values[index];
    if (!digit) continue;
    for (const peer of PEERS[index]) cands[peer] &= ~bit(digit);
  }
  return { values: Int8Array.from(values), cands };
}

function applyStep(board, step) {
  if (step.place) {
    const { index, digit } = step.place;
    board.values[index] = digit;
    board.cands[index] = 0;
    for (const peer of PEERS[index]) board.cands[peer] &= ~bit(digit);
    return;
  }
  for (const [index, digit] of step.strikes) board.cands[index] &= ~bit(digit);
}

// ─────────────────────────── приёмы ───────────────────────────
// Детекторы ничего не меняют: они только описывают найденные приёмы. `limit`
// обрывает перебор — обычно нужен либо первый приём, либо ответ «их больше одного».

function nakedSingle(board, limit = 1) {
  const found = [];
  for (let index = 0; index < CELLS; index += 1) {
    if (board.values[index] || popcount(board.cands[index]) !== 1) continue;
    const digit = digitsOf(board.cands[index])[0];
    found.push({ tech: "naked-single", cells: [index], digits: [digit], place: { index, digit } });
    if (found.length >= limit) return found;
  }
  return found;
}

function hiddenSingleIn(units, tech) {
  return (board, limit = 1) => {
    const found = [];
    for (const unit of units) {
      for (let digit = 1; digit <= SIZE; digit += 1) {
        if (unit.cells.some((index) => board.values[index] === digit)) continue;
        const spots = unit.cells.filter((index) => !board.values[index] && board.cands[index] & bit(digit));
        if (spots.length !== 1) continue;
        found.push({ tech, cells: [spots[0]], digits: [digit], unit, place: { index: spots[0], digit } });
        if (found.length >= limit) return found;
      }
    }
    return found;
  };
}

const hiddenSingleBox = hiddenSingleIn(BOX_UNIT_LIST, "hidden-single-box");
const hiddenSingleLine = hiddenSingleIn(LINE_UNIT_LIST, "hidden-single-line");

/** Указующая пара: в блоке цифра заперта внутри одной строки/колонки. */
function pointing(board, limit = 1) {
  const found = [];
  for (let digit = 1; digit <= SIZE; digit += 1) {
    for (const unit of BOX_UNIT_LIST) {
      const spots = unit.cells.filter((index) => !board.values[index] && board.cands[index] & bit(digit));
      if (spots.length < 2) continue;
      const rows = new Set(spots.map((index) => Math.floor(index / SIZE)));
      const cols = new Set(spots.map((index) => index % SIZE));
      const kind = rows.size === 1 ? "row" : cols.size === 1 ? "col" : null;
      if (!kind) continue;
      const lineIndex = kind === "row" ? [...rows][0] : [...cols][0];
      const line = LINE_UNIT_LIST.find((item) => item.kind === kind && item.index === lineIndex);
      const strikes = [];
      for (const index of line.cells) {
        if (spots.includes(index) || board.values[index]) continue;
        if (board.cands[index] & bit(digit)) strikes.push([index, digit]);
      }
      if (strikes.length === 0) continue;
      found.push({ tech: "pointing", cells: spots, digits: [digit], unit, target: line, strikes });
      if (found.length >= limit) return found;
    }
  }
  return found;
}

/** Обратный случай: в строке/колонке цифра возможна только внутри одного блока. */
function claiming(board, limit = 1) {
  const found = [];
  for (let digit = 1; digit <= SIZE; digit += 1) {
    for (const unit of LINE_UNIT_LIST) {
      const spots = unit.cells.filter((index) => !board.values[index] && board.cands[index] & bit(digit));
      if (spots.length < 2) continue;
      const boxes = new Set(spots.map(boxOf));
      if (boxes.size !== 1) continue;
      const box = BOX_UNIT_LIST.find((item) => item.index === [...boxes][0]);
      const strikes = [];
      for (const index of box.cells) {
        if (spots.includes(index) || board.values[index]) continue;
        if (board.cands[index] & bit(digit)) strikes.push([index, digit]);
      }
      if (strikes.length === 0) continue;
      found.push({ tech: "claiming", cells: spots, digits: [digit], unit, target: box, strikes });
      if (found.length >= limit) return found;
    }
  }
  return found;
}

function combinations(items, size) {
  const result = [];
  const current = [];
  const walk = (start) => {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < items.length; i += 1) {
      current.push(items[i]);
      walk(i + 1);
      current.pop();
    }
  };
  walk(0);
  return result;
}

function nakedSubset(size) {
  const tech = size === 2 ? "naked-pair" : "naked-triple";
  return (board, limit = 1) => {
    const found = [];
    for (const unit of UNITS) {
      const open = unit.cells.filter((index) => {
        if (board.values[index]) return false;
        const count = popcount(board.cands[index]);
        return count > 1 && count <= size;
      });
      if (open.length <= size) continue;
      for (const combo of combinations(open, size)) {
        let union = 0;
        for (const index of combo) union |= board.cands[index];
        if (popcount(union) !== size) continue;
        const strikes = [];
        for (const index of unit.cells) {
          if (combo.includes(index) || board.values[index]) continue;
          for (const digit of digitsOf(board.cands[index] & union)) strikes.push([index, digit]);
        }
        if (strikes.length === 0) continue;
        found.push({ tech, cells: combo, digits: digitsOf(union), unit, strikes });
        if (found.length >= limit) return found;
      }
    }
    return found;
  };
}

function hiddenSubset(size) {
  const tech = size === 2 ? "hidden-pair" : "hidden-triple";
  return (board, limit = 1) => {
    const found = [];
    for (const unit of UNITS) {
      const spotsByDigit = new Map();
      for (let digit = 1; digit <= SIZE; digit += 1) {
        if (unit.cells.some((index) => board.values[index] === digit)) continue;
        const spots = unit.cells.filter((index) => !board.values[index] && board.cands[index] & bit(digit));
        if (spots.length >= 2 && spots.length <= size) spotsByDigit.set(digit, spots);
      }
      if (spotsByDigit.size < size) continue;
      for (const combo of combinations([...spotsByDigit.keys()], size)) {
        const cells = new Set();
        let mask = 0;
        for (const digit of combo) {
          for (const index of spotsByDigit.get(digit)) cells.add(index);
          mask |= bit(digit);
        }
        if (cells.size !== size) continue;
        const strikes = [];
        for (const index of cells) {
          for (const digit of digitsOf(board.cands[index] & ~mask)) strikes.push([index, digit]);
        }
        if (strikes.length === 0) continue;
        found.push({ tech, cells: [...cells], digits: combo, unit, strikes });
        if (found.length >= limit) return found;
      }
    }
    return found;
  };
}

function fish(size) {
  const tech = size === 2 ? "x-wing" : "swordfish";
  return (board, limit = 1) => {
    const found = [];
    for (let digit = 1; digit <= SIZE; digit += 1) {
      for (const orientation of ["row", "col"]) {
        const lines = orientation === "row" ? ROW_UNITS : COL_UNITS;
        const crossLines = orientation === "row" ? COL_UNITS : ROW_UNITS;
        const usable = [];
        for (let lineIndex = 0; lineIndex < SIZE; lineIndex += 1) {
          const spots = lines[lineIndex].filter(
            (index) => !board.values[index] && board.cands[index] & bit(digit),
          );
          if (spots.length < 2 || spots.length > size) continue;
          usable.push({
            line: lineIndex,
            spots,
            positions: spots.map((index) => (orientation === "row" ? index % SIZE : Math.floor(index / SIZE))),
          });
        }
        if (usable.length < size) continue;
        for (const combo of combinations(usable, size)) {
          const cover = new Set();
          for (const entry of combo) for (const position of entry.positions) cover.add(position);
          if (cover.size !== size) continue;
          const lineSet = new Set(combo.map((entry) => entry.line));
          const strikes = [];
          for (const position of cover) {
            for (const index of crossLines[position]) {
              const lineOfCell = orientation === "row" ? Math.floor(index / SIZE) : index % SIZE;
              if (lineSet.has(lineOfCell) || board.values[index]) continue;
              if (board.cands[index] & bit(digit)) strikes.push([index, digit]);
            }
          }
          if (strikes.length === 0) continue;
          found.push({
            tech,
            cells: combo.flatMap((entry) => entry.spots),
            digits: [digit],
            fish: {
              orientation,
              lines: [...lineSet].sort((a, b) => a - b),
              cross: [...cover].sort((a, b) => a - b),
            },
            scope: combo.flatMap((entry) => lines[entry.line]),
            strikes,
          });
          if (found.length >= limit) return found;
        }
      }
    }
    return found;
  };
}

function xyWing(board, limit = 1) {
  const found = [];
  const bivalue = [];
  for (let index = 0; index < CELLS; index += 1) {
    if (!board.values[index] && popcount(board.cands[index]) === 2) bivalue.push(index);
  }
  for (const pivot of bivalue) {
    const [x, y] = digitsOf(board.cands[pivot]);
    const wings = bivalue.filter((index) => index !== pivot && SEES[pivot][index]);
    for (let a = 0; a < wings.length; a += 1) {
      for (let b = a + 1; b < wings.length; b += 1) {
        const first = wings[a];
        const second = wings[b];
        const maskA = board.cands[first];
        const maskB = board.cands[second];
        const shared = maskA & maskB & ~board.cands[pivot];
        if (popcount(shared) !== 1) continue;
        const hasX = (maskA & bit(x)) !== 0 && (maskB & bit(y)) !== 0;
        const hasY = (maskA & bit(y)) !== 0 && (maskB & bit(x)) !== 0;
        if (!hasX && !hasY) continue;
        if (popcount(maskA & board.cands[pivot]) !== 1 || popcount(maskB & board.cands[pivot]) !== 1) continue;
        if ((maskA & board.cands[pivot]) === (maskB & board.cands[pivot])) continue;
        const digit = digitsOf(shared)[0];
        const strikes = [];
        for (let index = 0; index < CELLS; index += 1) {
          if (board.values[index] || index === pivot || index === first || index === second) continue;
          if (!SEES[first][index] || !SEES[second][index]) continue;
          if (board.cands[index] & shared) strikes.push([index, digit]);
        }
        if (strikes.length === 0) continue;
        found.push({
          tech: "xy-wing",
          cells: [pivot, first, second],
          digits: [digit],
          wing: { pivot, wings: [first, second] },
          strikes,
        });
        if (found.length >= limit) return found;
      }
    }
  }
  return found;
}

/** Порядок = «что игрок уже умеет»: всё, что выше, считается более простым. */
const ORDER = [
  ["naked-single", nakedSingle],
  ["hidden-single-box", hiddenSingleBox],
  ["hidden-single-line", hiddenSingleLine],
  ["pointing", pointing],
  ["claiming", claiming],
  ["naked-pair", nakedSubset(2)],
  ["hidden-pair", hiddenSubset(2)],
  ["naked-triple", nakedSubset(3)],
  ["hidden-triple", hiddenSubset(3)],
  ["x-wing", fish(2)],
  ["xy-wing", xyWing],
  ["swordfish", fish(3)],
];

const TECHS = ORDER.map(([tech]) => tech);
const DETECT = Object.fromEntries(ORDER);
const PLACEMENT_TECHS = new Set(["naked-single", "hidden-single-box", "hidden-single-line"]);

/** Ранги боевого решателя игры — по ним идёт перекрёстная проверка. */
const APP_TIER = {
  "naked-single": 1,
  "hidden-single-box": 2,
  "hidden-single-line": 2,
  pointing: 3,
  claiming: 3,
  "naked-pair": 4,
  "hidden-pair": 4,
  "naked-triple": 5,
  "hidden-triple": 5,
  "x-wing": 6,
  "xy-wing": 7,
  swordfish: 8,
};

function firstStep(board, techs = TECHS) {
  for (const tech of techs) {
    const [step] = DETECT[tech](board, 1);
    if (step) return step;
  }
  return null;
}

/** Все клетки, которые закрываются прямо сейчас одиночками — обычными и скрытыми. */
function forcedPlacements(board) {
  const found = new Map();
  for (const step of nakedSingle(board, Infinity)) {
    found.set(step.place.index, { ...step.place, reason: "naked" });
  }
  for (const step of [...hiddenSingleBox(board, Infinity), ...hiddenSingleLine(board, Infinity)]) {
    if (found.has(step.place.index)) continue;
    found.set(step.place.index, { ...step.place, reason: "hidden", unit: step.unit });
  }
  return [...found.values()];
}

// ─────────────────────────── текст разбора ───────────────────────────

const rc = (index) => `R${Math.floor(index / SIZE) + 1}C${(index % SIZE) + 1}`;
const listCells = (cells) => [...new Set(cells)].sort((a, b) => a - b).map(rc).join(", ");
const listDigits = (digits) => [...digits].sort((a, b) => a - b).join(" и ");

function unitDative({ kind, index }) {
  return kind === "row" ? `строке ${index + 1}` : kind === "col" ? `колонке ${index + 1}` : `блоке ${index + 1}`;
}

function unitNominative({ kind, index }) {
  return kind === "row" ? `строка ${index + 1}` : kind === "col" ? `колонка ${index + 1}` : `блок ${index + 1}`;
}

function fishLines({ orientation, lines }) {
  const word = orientation === "row" ? "строках" : "колонках";
  return `${word} ${lines.map((i) => i + 1).join(", ")}`;
}

function unitGenitive({ kind, index }) {
  return kind === "row" ? `строки ${index + 1}` : kind === "col" ? `колонки ${index + 1}` : `блока ${index + 1}`;
}

function fishCross({ orientation, cross }) {
  const word = orientation === "row" ? "колонки" : "строки";
  return `${word} ${cross.map((i) => i + 1).join(", ")}`;
}

function fishCrossGenitive({ orientation, cross }) {
  const word = orientation === "row" ? "колонок" : "строк";
  return `${word} ${cross.map((i) => i + 1).join(", ")}`;
}

function describePattern(step) {
  const digit = step.digits[0];
  switch (step.tech) {
    case "naked-single":
      return `В клетке ${rc(step.cells[0])} все цифры, кроме ${digit}, уже стоят в её строке, колонке или блоке.`;
    case "hidden-single-box":
      return `В ${unitDative(step.unit)} цифра ${digit} помещается только в ${rc(step.cells[0])}: в остальных пустых клетках блока она уже видна по строке или колонке.`;
    case "hidden-single-line":
      return `В ${unitDative(step.unit)} цифра ${digit} помещается только в ${rc(step.cells[0])}: во всех прочих пустых клетках этой линии ${digit} уже видна.`;
    case "pointing":
      return `В ${unitDative(step.unit)} цифра ${digit} возможна только в клетках ${listCells(step.cells)} — и ${step.cells.length === 2 ? "обе они лежат" : "все они лежат"} в одной линии, это ${unitNominative(step.target)}. Где бы ${digit} ни встала в блоке, она окажется в этой линии.`;
    case "claiming":
      return `В ${unitDative(step.unit)} цифра ${digit} возможна только в клетках ${listCells(step.cells)} — и ${step.cells.length === 2 ? "обе они лежат" : "все они лежат"} в одном блоке, это ${unitNominative(step.target)}. Значит ${digit} этого блока стоит в одной из них.`;
    case "naked-pair":
      return `В ${unitDative(step.unit)} клетки ${listCells(step.cells)} держат ровно две цифры — ${listDigits(step.digits)}. В каком бы порядке они ни легли, обе клетки заняты этой парой.`;
    case "naked-triple":
      return `В ${unitDative(step.unit)} клетки ${listCells(step.cells)} держат между собой всего три цифры — ${listDigits(step.digits)}. Три клетки на три цифры: посторонним там места нет.`;
    case "hidden-pair":
      return `В ${unitDative(step.unit)} цифры ${listDigits(step.digits)} встречаются только в клетках ${listCells(step.cells)}. Две цифры на две клетки — значит эти клетки заняты именно ими.`;
    case "hidden-triple":
      return `В ${unitDative(step.unit)} цифры ${listDigits(step.digits)} встречаются только в клетках ${listCells(step.cells)}. Три цифры на три клетки — всё остальное оттуда уходит.`;
    case "x-wing":
      return `Цифра ${digit} в ${fishLines(step.fish)} возможна только в двух местах каждая, и это одни и те же ${fishCross(step.fish)}. Как ни разложи — обе линии окажутся заняты этой цифрой.`;
    case "swordfish":
      return `Цифра ${digit} в ${fishLines(step.fish)} умещается только в ${fishCross(step.fish)}. Три линии заберут эти три — в каком бы порядке ни легли.`;
    case "xy-wing": {
      const [pivot, first, second] = step.cells;
      return `Ось ${rc(pivot)} держит две цифры, крылья ${rc(first)} и ${rc(second)} — тоже по две, и каждое делит с осью свою. Какая бы цифра ни встала в ось, ${digit} обязательно окажется в одном из крыльев.`;
    }
    default:
      return "";
  }
}

function describeCut(step) {
  if (!step.strikes || step.strikes.length === 0) return "";
  const digit = step.digits[0];
  const cells = listCells(step.strikes.map(([index]) => index));
  switch (step.tech) {
    case "pointing":
    case "claiming":
      return `Значит из остальных клеток ${unitGenitive(step.target)} цифру ${digit} можно убрать: ${cells}.`;
    case "naked-pair":
    case "naked-triple":
      return `Значит ${listDigits(step.digits)} уходят из остальных клеток ${unitGenitive(step.unit)}: ${cells}.`;
    case "hidden-pair":
    case "hidden-triple":
      return `Значит все прочие кандидаты из ${cells} уходят.`;
    case "x-wing":
    case "swordfish":
      return `Значит из остальных клеток ${fishCrossGenitive(step.fish)} цифру ${digit} можно убрать: ${cells}.`;
    case "xy-wing":
      return `Значит из клеток, которые видят оба крыла, цифру ${digit} можно убрать: ${cells}.`;
    default:
      return "";
  }
}

function describeFollow(board) {
  const [answer] = forcedPlacements(board);
  if (!answer) return "";
  if (answer.reason === "naked") {
    return `И сразу появляется ход: в ${rc(answer.index)} остаётся единственный кандидат — ${answer.digit}.`;
  }
  return `И сразу появляется ход: в ${unitDative(answer.unit)} цифра ${answer.digit} теперь помещается только в ${rc(answer.index)}.`;
}

function describeAsk(step) {
  const digit = step.digits[0];
  switch (step.tech) {
    case "naked-single":
      return "Какая цифра встанет в подсвеченную клетку?";
    case "hidden-single-box":
      return `Где в подсвеченном блоке стоит цифра ${digit}?`;
    case "hidden-single-line":
      return `Где в подсвеченной ${step.unit.kind === "row" ? "строке" : "колонке"} стоит цифра ${digit}?`;
    case "pointing":
      return `В ${unitDative(step.unit)} цифра ${digit} заперта в одной линии. Отметь все клетки блока, где ${digit} ещё возможна.`;
    case "claiming":
      return `В ${unitDative(step.unit)} цифра ${digit} возможна только внутри одного блока. Отметь все клетки этой линии, где ${digit} ещё возможна.`;
    case "naked-pair":
      return `В ${unitDative(step.unit)} спряталась голая пара. Отметь две клетки, из которых она состоит.`;
    case "naked-triple":
      return `В ${unitDative(step.unit)} есть голая тройка. Отметь три клетки, из которых она состоит.`;
    case "hidden-pair":
      return `В ${unitDative(step.unit)} две цифры встречаются только в двух клетках. Отметь эти клетки.`;
    case "hidden-triple":
      return `В ${unitDative(step.unit)} три цифры встречаются только в трёх клетках. Отметь эти клетки.`;
    case "x-wing":
      return `Цифра ${digit} образует X-Wing в ${fishLines(step.fish)}. Отметь клетки, где она в этих линиях возможна.`;
    case "swordfish":
      return `Цифра ${digit} образует Swordfish в ${fishLines(step.fish)}. Отметь клетки, где она в этих линиях возможна.`;
    case "xy-wing":
      return `Найди XY-Wing, который убирает цифру ${digit}: ось и два крыла. Отметь три клетки.`;
    default:
      return "";
  }
}

/** Что показывает подсказка — та часть доски, внутри которой живёт приём. */
function scopeOf(step) {
  if (step.scope) return [...new Set(step.scope)].sort((a, b) => a - b);
  if (step.unit) return [...step.unit.cells].sort((a, b) => a - b);
  return [];
}

// ─────────────────────────── добыча позиций ───────────────────────────

/**
 * Проходит расклад до конца, снимая позицию перед каждой поставленной цифрой.
 * Кандидаты на входе в каждый шаг считаются заново; накопленные вычерки живут
 * только внутри шага.
 */
function walk(puzzle, onSnapshot) {
  const values = puzzle.givens.map((value) => value ?? 0);
  for (let guard = 0; guard < 200; guard += 1) {
    if (values.every((value) => value)) return;
    const board = createBoard(values);
    const opener = firstStep(board);
    if (!opener) return;
    onSnapshot(values.slice(), opener.tech);
    for (let inner = 0; inner < 60; inner += 1) {
      const step = firstStep(board);
      if (!step) return;
      applyStep(board, step);
      if (step.place) {
        values[step.place.index] = step.place.digit;
        break;
      }
    }
  }
}

/** Почему позиции не проходят отбор — видно, что подкрутить, если приём не набирается. */
const REJECTS = new Map();
function reject(tech, why) {
  const key = `${tech} · ${why}`;
  REJECTS.set(key, (REJECTS.get(key) ?? 0) + 1);
  return null;
}

/**
 * Приём должен читаться однозначно. Формулировка задачи всегда называет цифру и
 * линию или блок, поэтому у «указующих» и «рыб» ответ определён уже ею: набор
 * клеток, где цифра возможна, у позиции ровно один. А вот пар и троек в одной
 * единице поля может оказаться несколько — такие позиции не берём.
 */
function isUnambiguous(board, step) {
  switch (step.tech) {
    case "naked-pair":
    case "naked-triple":
    case "hidden-pair":
    case "hidden-triple": {
      const all = DETECT[step.tech](board, Infinity);
      return (
        all.filter((item) => item.unit.kind === step.unit.kind && item.unit.index === step.unit.index).length === 1
      );
    }
    case "xy-wing": {
      const all = DETECT[step.tech](board, Infinity);
      return all.filter((item) => item.digits[0] === step.digits[0]).length === 1;
    }
    default:
      return true;
  }
}

/**
 * Ранг, ниже которого позиция не сдвигается с места: самый простой ранг приёмов
 * боевого решателя, которым из неё вообще выводится хоть одна цифра.
 *
 * Это и есть «игрок застрял»: урок ранга N честен, когда всё, что проще N, цифру
 * поставить уже не может. Требовать сверх этого, чтобы рядом не было ни одного
 * более простого вычёркивания, бессмысленно — в реальной партии их сколько угодно,
 * и они точно так же никуда не ведут.
 */
function breakTier(grid, app) {
  for (let tier = 1; tier <= 8; tier += 1) {
    if (app.findDeduction(grid, tier) !== null) return tier;
  }
  return 9;
}

function validate(values, tech, solution, app, stuckAt) {
  const board = createBoard(values);
  const tier = APP_TIER[tech];
  if (tier > stuckAt) return reject(tech, "решатель игры выводит проще");

  const [step] = DETECT[tech](board, 1);
  if (!step) return reject(tech, "приём не найден");
  if (!isUnambiguous(board, step)) return reject(tech, "приём читается неоднозначно");

  const place = PLACEMENT_TECHS.has(tech);
  if (place && solution[step.place.index] !== step.place.digit) {
    return reject(tech, "ответ разошёлся с решением");
  }

  const after = createBoard(values);
  applyStep(after, step);

  return {
    tech,
    kind: place ? "place" : "pattern",
    grid: values.map((value) => (value ? String(value) : ".")).join(""),
    solution: solution.join(""),
    answer: place ? { index: step.place.index, digit: step.place.digit } : null,
    cells: [...new Set(step.cells)].sort((a, b) => a - b),
    digits: [...step.digits].sort((a, b) => a - b),
    scope: scopeOf(step),
    strikes: (step.strikes ?? []).map(([index, digit]) => [index, digit]),
    pattern: describePattern(step),
    cut: describeCut(step),
    follow: place ? "" : describeFollow(after),
    ask: describeAsk(step),
    filled: values.filter(Boolean).length,
    // Позиция чиста, если рядом не лежит вообще ничего проще — такие идут в урок первыми.
    clean: firstStep(board, TECHS.slice(0, TECHS.indexOf(tech))) === null,
  };
}

/** Сколько позиций какого приёма нужно урокам — таблица обязана совпадать с lessons.ts. */
const DEMAND = {
  "naked-single": 8,
  "hidden-single-box": 12,
  "hidden-single-line": 13,
  pointing: 8,
  claiming: 7,
  "naked-pair": 6,
  "hidden-pair": 6,
  "naked-triple": 5,
  "hidden-triple": 5,
  "x-wing": 5,
  "xy-wing": 4,
  swordfish: 4,
};

/** Из одного расклада берём немного — иначе три задачи урока окажутся одной доской. */
const PER_PUZZLE = 2;

function arg(name, fallback) {
  const found = process.argv.find((item) => item.startsWith(`--${name}=`));
  return found ? Number(found.split("=")[1]) : fallback;
}

/**
 * Собирает движок игры в один ESM-файл и подключает его: уроки обязаны опираться
 * ровно на тот код, что стоит в игре, а он на TypeScript — Node его не читает.
 * На вход esbuild идут только файлы этого репозитория.
 */
async function loadGameModules(featureDir, workDir) {
  const load = async (name) => {
    const outfile = join(workDir, `${name}.mjs`);
    await esbuild.build({
      entryPoints: [fileURLToPath(new URL(`${name}.ts`, featureDir))],
      bundle: true,
      format: "esm",
      platform: "node",
      outfile,
      logLevel: "silent",
    });
    return import(pathToFileURL(outfile).href);
  };
  return { engine: await load("sudokuEngine"), app: await load("sudokuLogic") };
}

async function main() {
  const featureDir = new URL("../src/features/sudoku/", import.meta.url);
  const workDir = await mkdtemp(join(tmpdir(), "sudoku-lessons-"));
  const { engine, app } = await loadGameModules(featureDir, workDir);

  const plan = [
    ["expert", arg("expert", 260)],
    ["labyrinth", arg("labyrinth", 120)],
    ["abyss", arg("abyss", 140)],
  ];

  const pools = Object.fromEntries(TECHS.map((tech) => [tech, []]));
  const seen = new Set();
  const started = Date.now();

  for (const [difficulty, count] of plan) {
    for (let i = 0; i < count; i += 1) {
      const puzzle = engine.generateSudokuPuzzle(difficulty, { size: 9 });
      const snapshots = [];
      walk(puzzle, (values) => snapshots.push({ values }));

      const takenHere = Object.fromEntries(TECHS.map((tech) => [tech, 0]));
      for (const { values } of snapshots) {
        const key = values.join("");
        if (seen.has(key)) continue;
        const stuckAt = breakTier(values.map((value) => value || null), app);
        // Приём годится в урок, если он в позиции есть и не проще того ранга,
        // на котором позиция встала: иначе игрок решил бы её тем, что уже знает.
        // Сложные приёмы выбирают первыми: позиций под Swordfish в разы меньше,
        // чем под голую пару, и отдавать их паре — значит остаться без Swordfish.
        const fits = TECHS.filter(
          (tech) =>
            APP_TIER[tech] <= stuckAt &&
            pools[tech].length < DEMAND[tech] * 4 &&
            takenHere[tech] < PER_PUZZLE,
        ).sort((a, b) => APP_TIER[b] - APP_TIER[a]);
        for (const tech of fits) {
          const position = validate(values, tech, puzzle.solution, app, stuckAt);
          if (!position) continue;
          seen.add(key);
          takenHere[tech] += 1;
          pools[tech].push(position);
          break;
        }
      }
      if ((i + 1) % 40 === 0) {
        const short = TECHS.filter((tech) => pools[tech].length < DEMAND[tech]);
        process.stdout.write(
          `${difficulty} ${i + 1}/${count} · не хватает: ${
            short.length ? short.map((t) => `${t}:${pools[t].length}/${DEMAND[t]}`).join(" ") : "—"
          }\n`,
        );
      }
    }
  }

  // Добор: редкие приёмы (Swordfish, XY-Wing) выпадают только в глубоких раскладах,
  // поэтому доливаем «Бездной», пока не наберётся комплект или не кончится бюджет.
  const topUp = arg("topup", 900);
  for (let i = 0; i < topUp; i += 1) {
    if (TECHS.every((tech) => pools[tech].length >= DEMAND[tech])) break;
    const puzzle = engine.generateSudokuPuzzle("abyss", { size: 9 });
    const snapshots = [];
    walk(puzzle, (values) => snapshots.push({ values }));
    const takenHere = Object.fromEntries(TECHS.map((tech) => [tech, 0]));
    for (const { values } of snapshots) {
      const key = values.join("");
      if (seen.has(key)) continue;
      const stuckAt = breakTier(values.map((value) => value || null), app);
      const fits = TECHS.filter(
        (tech) => APP_TIER[tech] <= stuckAt && pools[tech].length < DEMAND[tech] && takenHere[tech] < PER_PUZZLE,
      ).sort((a, b) => APP_TIER[b] - APP_TIER[a]);
      for (const tech of fits) {
        const position = validate(values, tech, puzzle.solution, app, stuckAt);
        if (!position) continue;
        seen.add(key);
        takenHere[tech] += 1;
        pools[tech].push(position);
        break;
      }
    }
    if ((i + 1) % 50 === 0) {
      const short = TECHS.filter((tech) => pools[tech].length < DEMAND[tech]);
      process.stdout.write(
        `добор ${i + 1}/${topUp} · не хватает: ${
          short.length ? short.map((t) => `${t}:${pools[t].length}/${DEMAND[t]}`).join(" ") : "—"
        }\n`,
      );
    }
  }

  // Чем полнее доска, тем легче читается приём — самые полные уходят в ранние уроки.
  for (const tech of TECHS) {
    pools[tech].sort((a, b) => Number(b.clean) - Number(a.clean) || b.filled - a.filled);
    pools[tech] = pools[tech].slice(0, DEMAND[tech]);
  }

  if (process.argv.includes("--why")) {
    console.log("\nотбраковка:");
    [...REJECTS.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .forEach(([key, count]) => console.log(`  ${String(count).padStart(6)}  ${key}`));
  }

  console.log(
    `\nсобрано за ${((Date.now() - started) / 1000).toFixed(1)} с:\n` +
      TECHS.map((tech) => `  ${tech.padEnd(20)} ${pools[tech].length}/${DEMAND[tech]}`).join("\n"),
  );

  const missing = TECHS.filter((tech) => pools[tech].length < DEMAND[tech]);
  if (missing.length > 0) {
    await rm(workDir, { recursive: true, force: true });
    console.error(`\nне хватило позиций: ${missing.join(", ")} — увеличь --expert/--abyss`);
    process.exitCode = 1;
    return;
  }

  const serialize = (position) =>
    [
      "    {",
      `      tech: ${JSON.stringify(position.tech)},`,
      `      kind: ${JSON.stringify(position.kind)},`,
      `      grid: ${JSON.stringify(position.grid)},`,
      `      solution: ${JSON.stringify(position.solution)},`,
      `      answer: ${
        position.answer ? `{ index: ${position.answer.index}, digit: ${position.answer.digit} }` : "null"
      },`,
      `      cells: ${JSON.stringify(position.cells)},`,
      `      digits: ${JSON.stringify(position.digits)},`,
      `      scope: ${JSON.stringify(position.scope)},`,
      `      strikes: ${JSON.stringify(position.strikes)},`,
      `      pattern: ${JSON.stringify(position.pattern)},`,
      `      cut: ${JSON.stringify(position.cut)},`,
      `      follow: ${JSON.stringify(position.follow)},`,
      `      ask: ${JSON.stringify(position.ask)},`,
      "    }",
    ].join("\n");

  const body = TECHS.map(
    (tech) => `  ${JSON.stringify(tech)}: [\n${pools[tech].map(serialize).join(",\n")}\n  ],`,
  ).join("\n");

  const out = `/**
 * Позиции «Школы судоку». Сгенерировано scripts/build-sudoku-lessons.mjs — руками не править.
 *
 * Что гарантирует генератор для каждой позиции:
 *   • ничего проще изучаемого приёма из неё не выводится — проверено и своим
 *     решателем, и боевым sudokuLogic.ts;
 *   • приём читается однозначно: формулировка задачи называет цифру и линию;
 *   • у задач вида «place» ответ сверен с решением расклада.
 */

export type LessonTaskKind = "place" | "pattern";

export interface LessonPosition {
  tech: string;
  kind: LessonTaskKind;
  /** 81 символ, «.» — пустая клетка. */
  grid: string;
  solution: string;
  /** «place»: какую цифру и куда ставить. */
  answer: { index: number; digit: number } | null;
  /** Клетки, из которых состоит приём; для «pattern» это и есть ответ. */
  cells: number[];
  /** Цифры приёма. */
  digits: number[];
  /** Линия или блок, внутри которых живёт приём — их показывает подсказка. */
  scope: number[];
  /** Кандидаты, которых приём лишает: [клетка, цифра]. */
  strikes: Array<[number, number]>;
  /** Разбор: как приём читается на этой доске. */
  pattern: string;
  /** Что приём вычёркивает. */
  cut: string;
  /** Какой ход открывается сразу после приёма (может быть пустым). */
  follow: string;
  /** Вопрос игроку. */
  ask: string;
}

export const LESSON_POSITIONS: Record<string, LessonPosition[]> = {
${body}
};
`;

  const outDir = new URL("../src/features/sudoku/school/", import.meta.url);
  await mkdir(outDir, { recursive: true });
  await writeFile(new URL("lessonPositions.ts", outDir), out, "utf8");
  await rm(workDir, { recursive: true, force: true });
  console.log("\nзаписано: src/features/sudoku/school/lessonPositions.ts");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
