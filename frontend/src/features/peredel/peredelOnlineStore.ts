import { create } from "zustand";
import { Socket } from "socket.io-client";
import { generateSudokuPuzzle } from "../sudoku/sudokuEngine";
import { analyzePuzzle, cellCandidates } from "../sudoku/sudokuLogic";
import { Owner } from "./peredelStore";

/**
 * Сетевая дуэль: доска и очки приходят с сервера, он же судит гонку за клетку.
 * Форма состояния намеренно повторяет локальный стор, чтобы экран рисовал
 * сетевую партию тем же кодом.
 */

const CELLS = 81;

export interface DuelPlayer {
  userId: number;
  name: string;
  score: number;
  cells: number;
  mistakes: number;
  frozenUntil: number;
  online: boolean;
}

export interface DuelRoom {
  code: string;
  hostId: number;
  hasPassword: boolean;
  status: "waiting" | "playing" | "finished";
  winner: number | "draw" | null;
  givens: Array<number | null>;
  entries: Array<number | null>;
  owners: Array<number | null>;
  players: DuelPlayer[];
}

interface OnlineState {
  socket: Socket | null;
  myId: number;
  room: DuelRoom | null;
  error: string;
  selectedIndex: number | null;
  frozenUntil: number;
  flash: { index: number; points: number; owner: Owner } | null;
  lastRivalIndex: number | null;

  attach: (socket: Socket, myId: number) => void;
  detach: () => void;
  createRoom: (name: string, password: string) => void;
  joinRoom: (code: string, name: string, password: string) => void;
  leaveRoom: () => void;
  select: (index: number) => void;
  place: (digit: number) => "taken" | "miss" | "blocked";
  clearFlash: () => void;
  clearError: () => void;
}

/** Расклад для дуэли обязан решаться логикой — иначе оба игрока встанут. */
function buildDuelPuzzle() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const puzzle = generateSudokuPuzzle("hard");
    if (analyzePuzzle(puzzle.givens, 8).solvable) return puzzle;
  }
  return generateSudokuPuzzle("medium");
}

export const usePeredelOnline = create<OnlineState>()((set, get) => ({
  socket: null,
  myId: -1,
  room: null,
  error: "",
  selectedIndex: null,
  frozenUntil: 0,
  flash: null,
  lastRivalIndex: null,

  attach(socket, myId) {
    if (get().socket === socket) return;
    set({ socket, myId });

    socket.on("SD_STATE", ({ room }: { room: DuelRoom }) => {
      const me = room.players.find((p) => p.userId === get().myId);
      set({ room, frozenUntil: me?.frozenUntil ?? 0 });
    });

    socket.on("SD_CELL", ({ index, points, userId }: { index: number; points: number; userId: number }) => {
      const mine = userId === get().myId;
      set({
        flash: { index, points, owner: mine ? "you" : "bot" },
        lastRivalIndex: mine ? get().lastRivalIndex : index,
      });
    });

    socket.on("SD_ERROR", ({ message }: { message: string }) => set({ error: message }));
  },

  detach() {
    const s = get().socket;
    if (!s) return;
    s.off("SD_STATE");
    s.off("SD_CELL");
    s.off("SD_ERROR");
    set({ socket: null, room: null, selectedIndex: null, flash: null });
  },

  createRoom(name, password) {
    const puzzle = buildDuelPuzzle();
    set({ error: "" });
    get().socket?.emit("SD_CREATE", {
      puzzle: { givens: puzzle.givens, solution: puzzle.solution },
      name,
      password: password || undefined,
    });
  },

  joinRoom(code, name, password) {
    set({ error: "" });
    get().socket?.emit("SD_JOIN", {
      code: String(code || "").trim().toUpperCase(),
      name,
      password: password || undefined,
    });
  },

  leaveRoom() {
    get().socket?.emit("SD_LEAVE");
    set({ room: null, selectedIndex: null, flash: null, lastRivalIndex: null });
  },

  select(index) {
    const { room } = get();
    if (!room || room.status !== "playing") return;
    if (index < 0 || index >= CELLS) return;
    if (room.entries[index] !== null) return;
    set({ selectedIndex: index });
  },

  place(digit) {
    const { room, selectedIndex, socket, frozenUntil } = get();
    if (!room || room.status !== "playing" || selectedIndex === null || !socket) return "blocked";
    if (Date.now() < frozenUntil) return "blocked";
    if (room.entries[selectedIndex] !== null) return "blocked";
    if (digit < 1 || digit > 9) return "blocked";

    // Ответ сервера — единственная правда: гонку за клетку решает он.
    socket.emit("SD_CLAIM", { index: selectedIndex, digit }, (outcome: any) => {
      if (outcome?.result === "miss") set({ frozenUntil: outcome.frozenUntil });
      if (outcome?.result === "taken") set({ selectedIndex: null });
    });
    return "taken";
  },

  clearFlash: () => set({ flash: null }),
  clearError: () => set({ error: "" }),
}));

/** Приводим серверную комнату к форме, которую уже умеет рисовать экран. */
export function duelView(room: DuelRoom | null, myId: number) {
  if (!room) {
    return {
      givens: [] as Array<number | null>,
      entries: [] as Array<number | null>,
      owners: [] as Owner[],
      candidates: [] as number[][],
      youScore: 0,
      rivalScore: 0,
      rivalName: "Соперник",
      rivalOnline: false,
      status: "waiting" as const,
    };
  }
  const me = room.players.find((p) => p.userId === myId);
  const rival = room.players.find((p) => p.userId !== myId);
  return {
    givens: room.givens,
    entries: room.entries,
    owners: room.owners.map((owner) => (owner === null ? null : owner === myId ? "you" : "bot")) as Owner[],
    candidates: cellCandidates(room.entries),
    youScore: me?.score ?? 0,
    rivalScore: rival?.score ?? 0,
    rivalName: rival?.name ?? "Ждём соперника",
    rivalOnline: rival?.online ?? false,
    status: room.status,
  };
}
