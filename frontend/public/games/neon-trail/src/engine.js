import { keyFor } from "./levels.js";

export const isAdjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

export const createGame = (level) => ({
  level,
  path: [],
  backtracks: 0,
  mistakes: 0,
  completed: false,
});

export const activeKeys = (level) => new Set(level.solution.map(keyFor));

export function tryVisit(game, point) {
  if (game.completed) return { game, status: "completed" };
  const pointKey = keyFor(point);
  if (!activeKeys(game.level).has(pointKey)) return { game, status: "inactive" };

  if (game.path.length === 0) {
    if (pointKey !== keyFor(game.level.solution[0])) {
      return { game: { ...game, mistakes: game.mistakes + 1 }, status: "wrong-start" };
    }
    return { game: { ...game, path: [point] }, status: "started" };
  }

  const last = game.path.at(-1);
  if (keyFor(last) === pointKey) return { game, status: "same" };

  const previous = game.path.at(-2);
  if (previous && keyFor(previous) === pointKey) {
    return {
      game: { ...game, path: game.path.slice(0, -1), backtracks: game.backtracks + 1 },
      status: "backtracked",
    };
  }

  if (!isAdjacent(last, point)) return { game, status: "not-adjacent" };
  if (game.path.some((visited) => keyFor(visited) === pointKey)) {
    return { game: { ...game, mistakes: game.mistakes + 1 }, status: "already-visited" };
  }

  const nextPath = [...game.path, point];
  const completed = nextPath.length === game.level.solution.length;
  return {
    game: { ...game, path: nextPath, completed },
    status: completed ? "won" : "visited",
  };
}

export function undo(game) {
  if (!game.path.length || game.completed) return game;
  return { ...game, path: game.path.slice(0, -1), backtracks: game.backtracks + 1 };
}

export const progress = (game) => game.path.length / game.level.solution.length;

export function starsFor(game) {
  const penalty = game.mistakes + Math.max(0, game.backtracks - game.level.parBacktracks);
  if (penalty === 0) return 3;
  if (penalty <= 2) return 2;
  return 1;
}

export function nextHint(game) {
  if (game.completed) return null;
  if (game.path.length === 0) return game.level.solution[0];
  const exactPrefix = game.path.every((point, index) => keyFor(point) === keyFor(game.level.solution[index]));
  if (!exactPrefix) return game.path.at(-2) || game.level.solution[0];
  return game.level.solution[game.path.length] || null;
}
