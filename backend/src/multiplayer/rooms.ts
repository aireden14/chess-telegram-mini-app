// Общее ядро мультиплеера: комнаты, места, присутствие и переподключение.
// Игровая логика сюда не попадает — реестр знает только про участников и снапшот состояния.

import { Server as IOServer, Socket } from "socket.io";

export const DEFAULT_GRACE_MS = 2 * 60 * 1000; // держим место 2 минуты после обрыва
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
const SWEEP_MS = 30 * 60 * 1000;
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type SeatId = string;

export interface Room<TState> {
  id: string;
  state: TState;
  seats: Map<SeatId, number | null>;
  createdAt: number;
  updatedAt: number;
  /** userId -> активные сокеты этого игрока в комнате */
  connections: Map<number, Set<string>>;
  /** userId -> когда истекает удержание места */
  grace: Map<number, { deadline: number; timer: ReturnType<typeof setTimeout> }>;
}

export interface RoomRegistryOptions<TState> {
  /** префикс socket.io-комнаты, например "checkers" */
  channel: string;
  /** префикс кода комнаты, например "CK" */
  idPrefix: string;
  /** порядок мест, например ["w", "b"] */
  seatOrder: SeatId[];
  graceMs?: number;
  ttlMs?: number;
  /** место освободилось: игрок не вернулся за отведённое время */
  onSeatAbandoned?: (room: Room<TState>, seat: SeatId, userId: number) => void;
}

export interface JoinResult<TState> {
  room: Room<TState>;
  seat: SeatId | null;
  /** true, если игрок вернулся в уже занятое им место */
  reconnected: boolean;
}

export class RoomRegistry<TState> {
  private rooms = new Map<string, Room<TState>>();
  private readonly graceMs: number;
  private readonly ttlMs: number;

  constructor(private readonly options: RoomRegistryOptions<TState>) {
    this.graceMs = options.graceMs ?? DEFAULT_GRACE_MS;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  }

  roomName(id: string): string {
    return `${this.options.channel}:${id}`;
  }

  normalizeId(raw: unknown): string {
    return String(raw ?? "").trim().toUpperCase();
  }

  get(id: string): Room<TState> | undefined {
    return this.rooms.get(this.normalizeId(id));
  }

  all(): Room<TState>[] {
    return [...this.rooms.values()];
  }

  private makeId(): string {
    for (let tries = 0; tries < 20; tries += 1) {
      let id = this.options.idPrefix;
      for (let i = 0; i < 4; i += 1) {
        id += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
      }
      if (!this.rooms.has(id)) return id;
    }
    return `${this.options.idPrefix}${Date.now().toString(36).slice(-5).toUpperCase()}`;
  }

  create(ownerId: number, state: TState): Room<TState> {
    const id = this.makeId();
    const seats = new Map<SeatId, number | null>();
    for (const seat of this.options.seatOrder) seats.set(seat, null);
    seats.set(this.options.seatOrder[0], ownerId);

    const room: Room<TState> = {
      id,
      state,
      seats,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      connections: new Map(),
      grace: new Map(),
    };
    this.rooms.set(id, room);
    return room;
  }

  seatOf(room: Room<TState>, userId: number): SeatId | null {
    for (const [seat, occupant] of room.seats.entries()) {
      if (occupant === userId) return seat;
    }
    return null;
  }

  freeSeat(room: Room<TState>): SeatId | null {
    for (const seat of this.options.seatOrder) {
      if (room.seats.get(seat) === null) return seat;
    }
    return null;
  }

  occupiedSeats(room: Room<TState>): SeatId[] {
    return this.options.seatOrder.filter((seat) => room.seats.get(seat) !== null);
  }

  /**
   * Подключает игрока к комнате: возвращает его место, сажает на свободное
   * или сообщает, что мест нет (seat === null и игрок ещё не за столом).
   */
  join(id: string, userId: number, socket: Socket): JoinResult<TState> | null {
    const room = this.get(id);
    if (!room) return null;

    let seat = this.seatOf(room, userId);
    const reconnected = seat !== null;
    if (!seat) {
      seat = this.freeSeat(room);
      if (seat) room.seats.set(seat, userId);
    }

    if (seat) this.cancelGrace(room, userId);
    this.attach(room, userId, socket);
    socket.join(this.roomName(room.id));
    room.updatedAt = Date.now();
    return { room, seat, reconnected };
  }

  private attach(room: Room<TState>, userId: number, socket: Socket): void {
    if (!room.connections.has(userId)) room.connections.set(userId, new Set());
    room.connections.get(userId)!.add(socket.id);
  }

  /** Сокет отвалился: снимаем его и, если это была последняя связь, запускаем удержание места. */
  detach(userId: number, socketId: string, io: IOServer): void {
    for (const room of this.rooms.values()) {
      const sockets = room.connections.get(userId);
      if (!sockets || !sockets.delete(socketId)) continue;
      if (sockets.size > 0) continue;

      room.connections.delete(userId);
      const seat = this.seatOf(room, userId);
      if (!seat) continue;

      this.startGrace(room, seat, userId, io);
    }
  }

  private startGrace(room: Room<TState>, seat: SeatId, userId: number, io: IOServer): void {
    this.cancelGrace(room, userId);
    const deadline = Date.now() + this.graceMs;
    const timer = setTimeout(() => {
      room.grace.delete(userId);
      if (room.connections.has(userId)) return; // успел вернуться
      room.seats.set(seat, null);
      room.updatedAt = Date.now();
      this.options.onSeatAbandoned?.(room, seat, userId);
      io.to(this.roomName(room.id)).emit("ROOM_SEAT_ABANDONED", { roomId: room.id, seat });
    }, this.graceMs);
    timer.unref?.();
    room.grace.set(userId, { deadline, timer });

    io.to(this.roomName(room.id)).emit("ROOM_PRESENCE", {
      roomId: room.id,
      seat,
      online: false,
      reconnectDeadline: deadline,
    });
  }

  private cancelGrace(room: Room<TState>, userId: number): void {
    const pending = room.grace.get(userId);
    if (!pending) return;
    clearTimeout(pending.timer);
    room.grace.delete(userId);
  }

  isOnline(room: Room<TState>, seat: SeatId): boolean {
    const userId = room.seats.get(seat);
    return userId !== null && userId !== undefined && room.connections.has(userId);
  }

  /** Снимок присутствия для клиента: кто за столом, кто онлайн, до когда ждём отвалившихся. */
  presence(room: Room<TState>): Array<{
    seat: SeatId;
    online: boolean;
    reconnectDeadline: number | null;
  }> {
    return this.options.seatOrder.map((seat) => {
      const userId = room.seats.get(seat) ?? null;
      const pending = userId === null ? undefined : room.grace.get(userId);
      return {
        seat,
        online: userId !== null && room.connections.has(userId),
        reconnectDeadline: pending?.deadline ?? null,
      };
    });
  }

  touch(room: Room<TState>): void {
    room.updatedAt = Date.now();
  }

  delete(id: string): void {
    const room = this.get(id);
    if (!room) return;
    for (const pending of room.grace.values()) clearTimeout(pending.timer);
    this.rooms.delete(room.id);
  }

  /** Периодическая уборка комнат, в которые давно никто не ходил. */
  startSweeper(): void {
    setInterval(() => {
      const cutoff = Date.now() - this.ttlMs;
      for (const room of [...this.rooms.values()]) {
        if (room.updatedAt < cutoff) this.delete(room.id);
      }
    }, SWEEP_MS).unref?.();
  }
}
