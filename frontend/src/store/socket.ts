import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../api/client";

const WS_URL = import.meta.env.VITE_WS_URL || API_URL;

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  connect: (token: string) => Socket;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,
  connect(token) {
    const existing = get().socket;
    if (existing) return existing;
    const s = io(WS_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 800,
      transports: ["websocket", "polling"],
    });
    s.on("connect", () => set({ connected: true }));
    s.on("disconnect", () => set({ connected: false }));
    s.on("connect_error", (err) => {
      console.warn("[socket] connect_error", err.message);
    });
    set({ socket: s });
    return s;
  },
  disconnect() {
    const s = get().socket;
    if (s) s.disconnect();
    set({ socket: null, connected: false });
  },
  emit(event, data) {
    const s = get().socket;
    if (s) s.emit(event, data);
  },
}));
