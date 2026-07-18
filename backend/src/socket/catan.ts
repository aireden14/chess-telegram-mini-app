import { Server as IOServer, Socket } from "socket.io";
import { prisma } from "../utils/prisma";
import { safeJson } from "../utils/json";
import {
  applyActionAndSave, loadGame, runBotIfNeeded, snapshotForClient,
} from "../services/catanService";
import { CatanAction, IllegalActionError } from "../catan/types";

interface AuthedSocket extends Socket {
  data: { userId: number; telegramId: string };
}

function room(gameId: string): string {
  return `catan:${gameId}`;
}

async function broadcastState(io: IOServer, gameId: string): Promise<void> {
  const snap = await loadGame(gameId);
  if (!snap) return;
  const sockets = await io.in(room(gameId)).fetchSockets();
  for (const s of sockets) {
    const userId = (s.data as any)?.userId ?? null;
    s.emit("CATAN_STATE", { snapshot: safeJson(snapshotForClient(snap, userId)) });
  }
}

async function emitEvents(io: IOServer, gameId: string, events: any[]): Promise<void> {
  if (events.length === 0) return;
  io.to(room(gameId)).emit("CATAN_EVENT", { events });
}

async function drainBots(io: IOServer, gameId: string): Promise<void> {
  // защита от бесконечного цикла
  for (let i = 0; i < 200; i++) {
    const r = await runBotIfNeeded(gameId);
    if (!r) break;
    await emitEvents(io, gameId, r.events);
    await broadcastState(io, gameId);
    if (r.snapshot.state.phase === "GAME_OVER") {
      io.to(room(gameId)).emit("CATAN_GAME_OVER", {
        winnerSeat: r.snapshot.state.winnerSeat,
        finalScores: r.snapshot.state.players.map((p) => ({
          seat: p.seat, vp: (p.settlements.length + p.cities.length * 2
            + (p.hasLongestRoad ? 2 : 0) + (p.hasLargestArmy ? 2 : 0) + p.victoryPointsHidden),
        })),
      });
      break;
    }
    // небольшая пауза для естественности
    await new Promise((res) => setTimeout(res, 250));
  }
}

export function registerCatanSocket(io: IOServer): void {
  io.on("connection", (raw: Socket) => {
    const socket = raw as AuthedSocket;

    socket.on("CATAN_JOIN_ROOM", async ({ gameId }) => {
      try {
        const snap = await loadGame(gameId);
        if (!snap) return socket.emit("CATAN_ERROR", { message: "game not found" });
        socket.join(room(gameId));
        socket.emit("CATAN_STATE", {
          snapshot: safeJson(snapshotForClient(snap, socket.data.userId)),
        });
        // Если на ходу бот — раскручиваем
        await drainBots(io, gameId);
      } catch (e: any) {
        socket.emit("CATAN_ERROR", { message: e?.message || "join error" });
      }
    });

    socket.on("CATAN_LEAVE_ROOM", ({ gameId }) => {
      socket.leave(room(gameId));
    });

    socket.on("CATAN_ACTION", async ({ gameId, action }: { gameId: string; action: CatanAction }) => {
      try {
        if (!gameId || !action || !action.type) {
          return socket.emit("CATAN_ERROR", { message: "bad action" });
        }
        // seat игрока в этой партии
        const player = await prisma.catanPlayer.findFirst({
          where: { gameId, userId: socket.data.userId },
        });
        if (!player) return socket.emit("CATAN_ERROR", { message: "not a participant" });
        const seat = player.seat;

        const { events } = await applyActionAndSave(gameId, seat, action);
        await emitEvents(io, gameId, events);
        await broadcastState(io, gameId);

        const snap = await loadGame(gameId);
        if (snap?.state.phase === "GAME_OVER") {
          io.to(room(gameId)).emit("CATAN_GAME_OVER", {
            winnerSeat: snap.state.winnerSeat,
            finalScores: snap.state.players.map((p) => ({
              seat: p.seat,
              vp: (p.settlements.length + p.cities.length * 2
                + (p.hasLongestRoad ? 2 : 0) + (p.hasLargestArmy ? 2 : 0) + p.victoryPointsHidden),
            })),
          });
          return;
        }

        // Если следующий ход за ботом — раскручиваем
        await drainBots(io, gameId);
      } catch (e: any) {
        const msg = e instanceof IllegalActionError ? e.message : (e?.message || "action error");
        socket.emit("CATAN_ERROR", { message: msg });
      }
    });
  });
}
