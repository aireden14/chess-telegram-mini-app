#!/usr/bin/env node
/**
 * Проверка позиций «Школы судоку» — независимо от генератора.
 *
 * Генератор мог ошибиться в детекторе приёма и тогда урок учил бы неправде:
 * вычёркивал кандидата, который на самом деле стоит в решении. Поэтому здесь
 * приёмы выводятся заново — из доски и кандидатов, посчитанных боевым
 * `cellCandidates` из игры, — и сверяются с тем, что записано в уроке.
 *
 * Что проверяется у каждой позиции:
 *   1. решение — настоящее судоку, а доска ему не противоречит;
 *   2. «place»: клетка пуста, а ответ совпадает с решением;
 *   3. «pattern»: клетки приёма пусты, а каждое вычёркивание безвредно —
 *      снимается только кандидат, которого в решении в этой клетке нет;
 *   4. набор клеток приёма выводится из доски заново, по определению приёма;
 *   5. позиция действительно стоит: боевой решатель ничего не выводит рангом
 *      ниже того, которому учит урок.
 *
 * Запуск: npm run sudoku:lessons:check
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const SIZE = 9;
const CELLS = 81;

const rowOf = (index) => Math.floor(index / SIZE);
const colOf = (index) => index % SIZE;
const boxOf = (index) => Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
const rc = (index) => `R${rowOf(index) + 1}C${colOf(index) + 1}`;

const unitCells = {
  row: (index) => Array.from({ length: SIZE }, (_, i) => index * SIZE + i),
  col: (index) => Array.from({ length: SIZE }, (_, i) => i * SIZE + index),
  box: (index) =>
    Array.from({ length: SIZE }, (_, i) => {
      const row = Math.floor(index / 3) * 3 + Math.floor(i / 3);
      const col = (index % 3) * 3 + (i % 3);
      return row * SIZE + col;
    }),
};

const sees = (a, b) => a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b));
const same = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
const sorted = (cells) => [...new Set(cells)].sort((x, y) => x - y);

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

/** Единица поля, целиком совпадающая с областью приёма. */
function unitOfScope(scope) {
  for (const kind of ["row", "col", "box"]) {
    for (let index = 0; index < SIZE; index += 1) {
      if (same(sorted(unitCells[kind](index)), sorted(scope))) return { kind, index };
    }
  }
  return null;
}

function checkSolution(solution, fail) {
  if (solution.length !== CELLS) fail("решение не на 81 клетку");
  for (const kind of ["row", "col", "box"]) {
    for (let index = 0; index < SIZE; index += 1) {
      const digits = new Set(unitCells[kind](index).map((cell) => solution[cell]));
      if (digits.size !== SIZE) fail(`в решении ${kind} ${index + 1} не содержит все девять цифр`);
    }
  }
}

/**
 * Переводит клетки приёма обратно в приём и сверяет с уроком. Для каждой семьи
 * приёмов это своё определение — то же, что в учебнике, но записанное здесь
 * заново, без единой строчки из генератора.
 */
function checkPattern(position, candidates, fail) {
  const { tech, cells, digits, scope } = position;
  const digit = digits[0];
  const possible = (unit, value) => unit.filter((cell) => candidates[cell].includes(value));

  switch (tech) {
    case "pointing":
    case "claiming": {
      const unit = unitOfScope(scope);
      if (!unit) fail("область приёма не совпадает ни с одной линией или блоком");
      if (!same(sorted(possible(scope, digit)), sorted(cells))) {
        fail(`клетки приёма ≠ клеткам, где цифра ${digit} возможна в области`);
      }
      const kind = tech === "pointing" ? ["row", "col"] : ["box"];
      const locked = kind.some((target) =>
        new Set(cells.map((cell) => (target === "row" ? rowOf(cell) : target === "col" ? colOf(cell) : boxOf(cell))))
          .size === 1,
      );
      if (!locked) fail(`цифра ${digit} в области не заперта`);
      break;
    }
    case "x-wing":
    case "swordfish": {
      const size = tech === "x-wing" ? 2 : 3;
      if (!same(sorted(possible(scope, digit)), sorted(cells))) {
        fail(`клетки приёма ≠ клеткам, где цифра ${digit} возможна в линиях`);
      }
      const rows = new Set(cells.map(rowOf));
      const cols = new Set(cells.map(colOf));
      const ok = (rows.size === size && cols.size === size);
      if (!ok) fail(`${tech}: ${rows.size}×${cols.size} вместо ${size}×${size}`);
      break;
    }
    case "naked-pair":
    case "naked-triple": {
      const size = tech === "naked-pair" ? 2 : 3;
      if (cells.length !== size) fail(`${tech}: клеток ${cells.length}, а нужно ${size}`);
      const union = new Set();
      for (const cell of cells) for (const value of candidates[cell]) union.add(value);
      if (union.size !== size) fail(`${tech}: цифр в клетках ${union.size}, а нужно ${size}`);
      if (!same(sorted([...union]), sorted(digits))) fail(`${tech}: цифры приёма не совпадают`);
      break;
    }
    case "hidden-pair":
    case "hidden-triple": {
      const size = tech === "hidden-pair" ? 2 : 3;
      if (cells.length !== size) fail(`${tech}: клеток ${cells.length}, а нужно ${size}`);
      if (digits.length !== size) fail(`${tech}: цифр ${digits.length}, а нужно ${size}`);
      for (const value of digits) {
        const spots = possible(scope, value);
        if (spots.some((cell) => !cells.includes(cell))) {
          fail(`${tech}: цифра ${value} встречается в области и вне клеток приёма`);
        }
      }
      break;
    }
    case "xy-wing": {
      if (cells.length !== 3) fail("XY-Wing: клеток не три");
      if (cells.some((cell) => candidates[cell].length !== 2)) fail("XY-Wing: не во всех клетках ровно два кандидата");
      const pivot = cells.find((cell) => cells.every((other) => cell === other || sees(cell, other)));
      if (pivot === undefined) fail("XY-Wing: нет клетки, которая видит обе другие");
      const wings = cells.filter((cell) => cell !== pivot);
      if (!wings.every((wing) => candidates[wing].includes(digit))) fail(`XY-Wing: цифры ${digit} нет в крыльях`);
      if (candidates[pivot].includes(digit)) fail(`XY-Wing: цифра ${digit} есть и в оси`);
      break;
    }
    default:
      fail(`неизвестный приём ${tech}`);
  }
}

async function main() {
  const featureDir = new URL("../src/features/sudoku/", import.meta.url);
  const workDir = await mkdtemp(join(tmpdir(), "sudoku-lessons-check-"));
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

  const app = await load("sudokuLogic");
  const data = await load("school/lessonPositions");
  const lessons = await load("school/lessons");

  const problems = [];
  let checked = 0;

  for (const [tech, positions] of Object.entries(data.LESSON_POSITIONS)) {
    positions.forEach((position, order) => {
      const where = `${tech}[${order}]`;
      const fail = (message) => problems.push(`${where}: ${message}`);

      const solution = [...position.solution].map(Number);
      const grid = [...position.grid].map((char) => (char === "." ? null : Number(char)));
      checkSolution(solution, fail);
      grid.forEach((value, cell) => {
        if (value !== null && value !== solution[cell]) fail(`клетка ${rc(cell)} расходится с решением`);
      });

      const candidates = app.cellCandidates(grid);

      if (position.kind === "place") {
        const { index, digit } = position.answer ?? {};
        if (index === undefined) fail("у задачи «place» нет ответа");
        else {
          if (grid[index] !== null) fail(`клетка ответа ${rc(index)} не пуста`);
          if (solution[index] !== digit) fail(`ответ ${digit} в ${rc(index)} расходится с решением`);
          if (!candidates[index].includes(digit)) fail(`ответ ${digit} не входит в кандидатов ${rc(index)}`);
        }
      } else {
        if (position.cells.length === 0) fail("у задачи «pattern» пустой ответ");
        for (const cell of position.cells) if (grid[cell] !== null) fail(`клетка приёма ${rc(cell)} не пуста`);
        // Главная проверка: приём не смеет снимать цифру, которая стоит в решении.
        for (const [cell, digit] of position.strikes) {
          if (grid[cell] !== null) fail(`вычёркивание в занятой клетке ${rc(cell)}`);
          if (!candidates[cell].includes(digit)) fail(`вычёркивают ${digit} из ${rc(cell)}, где её и так нет`);
          if (solution[cell] === digit) fail(`ВРАНЬЁ: вычёркивают ${digit} из ${rc(cell)}, а она там и стоит`);
        }
        if (position.strikes.length === 0) fail("приём ничего не вычёркивает");
        checkPattern(position, candidates, fail);
      }

      // Позиция обязана стоять: рангом ниже боевой решатель ничего не выводит.
      const tier = APP_TIER[tech];
      if (tier > 1 && app.findDeduction(grid, tier - 1) !== null) {
        fail(`позиция решается рангом ${tier - 1}, а урок про ранг ${tier}`);
      }
      checked += 1;
    });
  }

  // Уроки не должны ссылаться на позицию, которой нет, и делить одну доску на двоих.
  const used = new Map();
  for (const lesson of lessons.SUDOKU_LESSONS) {
    const boards = [lesson.demo, ...lesson.tasks].filter(Boolean);
    if (!lesson.demo && lesson.id !== 20) problems.push(`урок ${lesson.id}: нет разбора`);
    if (lesson.tasks.length === 0) problems.push(`урок ${lesson.id}: нет задач`);
    for (const board of boards) {
      const key = board.grid;
      if (used.has(key)) problems.push(`урок ${lesson.id}: доска повторяет урок ${used.get(key)}`);
      else used.set(key, lesson.id);
    }
  }
  if (lessons.SUDOKU_LESSONS.length !== 20) {
    problems.push(`уроков ${lessons.SUDOKU_LESSONS.length}, а обещано 20`);
  }

  await rm(workDir, { recursive: true, force: true });

  console.log(`проверено позиций: ${checked}, уроков: ${lessons.SUDOKU_LESSONS.length}`);
  if (problems.length > 0) {
    console.error(`\nнайдено ${problems.length} проблем:`);
    for (const problem of problems.slice(0, 40)) console.error(`  ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log("все позиции честные");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
