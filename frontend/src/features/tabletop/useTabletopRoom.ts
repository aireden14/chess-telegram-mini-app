// Комната настолки на общем ядре: создание, вход по коду, состав, снапшоты.
// Экран игры получает готовое состояние и функции, а весь socket.io — здесь.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store/auth";
import { useSocketStore } from "../../store/socket";
import { TabletopSettings } from "./presets";

export interface RoomPlayer {
  userId: number;
  name: string;
  bot: boolean;
  online: boolean;
  isHost: boolean;
}

export interface RoomState {
  code: string;
  game: string;
  hostId: number;
  phase: "lobby" | "playing" | "finished";
  settings: { seats: number; botFill: boolean; turnSeconds: number };
  turnIndex: number;
  turnDeadline: number | null;
  hasPassword: boolean;
  hasSnapshot: boolean;
  players: RoomPlayer[];
}

export interface TabletopRoom {
  room: RoomState | null;
  error: string;
  amHost: boolean;
  mySeat: number;
  /** снапшот, пришедший с сервера и ещё не отданный в игру */
  pendingSnapshot: { snapshot: string; turnIndex: number } | null;
  /** намерение игрока, которое должен применить ведущий */
  pendingIntent: { from: number; intent: any } | null;
  createRoom: (settings: TabletopSettings) => void;
  joinRoom: (code: string, password: string) => void;
  leaveRoom: () => void;
  updateSettings: (settings: TabletopSettings) => void;
  startGame: (snapshot?: string) => void;
  publishSnapshot: (snapshot: string, turnIndex: number, finished: boolean) => void;
  sendIntent: (intent: any) => void;
  clearSnapshot: () => void;
  clearIntent: () => void;
  clearError: () => void;
}

export function useTabletopRoom(game: string): TabletopRoom {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const socket = useSocketStore((s) => s.socket);
  const connect = useSocketStore((s) => s.connect);

  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [pendingSnapshot, setPendingSnapshot] = useState<{ snapshot: string; turnIndex: number } | null>(null);
  const [pendingIntent, setPendingIntent] = useState<{ from: number; intent: any } | null>(null);
  const joinedCode = useRef<string | null>(null);

  useEffect(() => {
    if (!socket && token) connect(token);
  }, [socket, token, connect]);

  useEffect(() => {
    if (!socket) return;
    const onState = ({ room: next }: { room: RoomState }) => {
      joinedCode.current = next.code;
      setRoom(next);
    };
    const onSnapshot = (payload: { snapshot: string; turnIndex: number }) => setPendingSnapshot(payload);
    const onIntent = (payload: { from: number; intent: any }) => setPendingIntent(payload);
    const onError = ({ message }: { message: string }) => setError(message);

    socket.on("TT_STATE", onState);
    socket.on("TT_SNAPSHOT", onSnapshot);
    socket.on("TT_INTENT", onIntent);
    socket.on("TT_ERROR", onError);
    return () => {
      socket.off("TT_STATE", onState);
      socket.off("TT_SNAPSHOT", onSnapshot);
      socket.off("TT_INTENT", onIntent);
      socket.off("TT_ERROR", onError);
    };
  }, [socket]);

  // Переподключились — возвращаемся в свою комнату сами, без действий игрока.
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      if (joinedCode.current) {
        socket.emit("TT_JOIN", { code: joinedCode.current, name: user?.firstName || "Игрок" });
      }
    };
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket, user]);

  const myName = user?.firstName || user?.username || "Игрок";

  const createRoom = useCallback((settings: TabletopSettings) => {
    setError("");
    socket?.emit("TT_CREATE", {
      game,
      name: myName,
      password: settings.password || undefined,
      settings: { seats: settings.seats, botFill: settings.botFill, turnSeconds: settings.turnSeconds },
    });
  }, [socket, game, myName]);

  const joinRoom = useCallback((code: string, password: string) => {
    setError("");
    socket?.emit("TT_JOIN", { code: code.trim().toUpperCase(), name: myName, password: password || undefined });
  }, [socket, myName]);

  const leaveRoom = useCallback(() => {
    socket?.emit("TT_LEAVE");
    joinedCode.current = null;
    setRoom(null);
    setPendingSnapshot(null);
  }, [socket]);

  const updateSettings = useCallback((settings: TabletopSettings) => {
    socket?.emit("TT_SETTINGS", {
      settings: { seats: settings.seats, botFill: settings.botFill, turnSeconds: settings.turnSeconds },
    });
  }, [socket]);

  const startGame = useCallback((snapshot?: string) => {
    socket?.emit("TT_START", { snapshot });
  }, [socket]);

  const publishSnapshot = useCallback((snapshot: string, turnIndex: number, finished: boolean) => {
    socket?.emit("TT_SNAPSHOT", { snapshot, turnIndex, finished });
  }, [socket]);

  const sendIntent = useCallback((intent: any) => {
    socket?.emit("TT_INTENT", { intent });
  }, [socket]);

  const myId = user?.id ?? -1;
  const amHost = room?.hostId === myId;
  const mySeat = room ? room.players.findIndex((p) => p.userId === myId) : -1;

  return {
    room,
    error,
    amHost,
    mySeat: mySeat < 0 ? 0 : mySeat,
    pendingSnapshot,
    pendingIntent,
    createRoom,
    joinRoom,
    leaveRoom,
    updateSettings,
    startGame,
    publishSnapshot,
    sendIntent,
    clearSnapshot: () => setPendingSnapshot(null),
    clearIntent: () => setPendingIntent(null),
    clearError: () => setError(""),
  };
}
