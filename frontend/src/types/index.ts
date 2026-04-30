export interface PublicUser {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string;
  photoUrl: string | null;
  rating: number;
  isBot: boolean;
}

export interface GameStateDTO {
  id: string;
  status:
    | "WAITING"
    | "ACTIVE"
    | "PAUSED"
    | "PAUSE_REQUESTED"
    | "COMPLETED"
    | "ABANDONED";
  fen: string;
  pgn: string;
  timerWhite: number;
  timerBlack: number;
  increment: number;
  currentTurn: "w" | "b";
  playerWhite: PublicUser | null;
  playerBlack: PublicUser | null;
  winner: string | null;
  endReason: string | null;
  pauseRequestBy: string | null;
  drawOfferBy: string | null;
  isBotGame: boolean;
  botDifficulty: string | null;
  botColor: string | null;
  settings: { timeControl: number; increment: number; colorChoice: string };
  serverTime: number;
  lastMoveAt: number | null;
}

export interface MeUser {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
}
