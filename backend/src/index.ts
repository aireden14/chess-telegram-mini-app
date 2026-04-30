import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { gamesRouter } from "./routes/games";
import { initSocket, startTimerWatchdog } from "./socket";

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, t: Date.now() }));
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/games", gamesRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[express error]", err);
  res.status(500).json({ error: err?.message || "server error" });
});

const port = Number(process.env.PORT || 3001);
const httpServer = createServer(app);
initSocket(httpServer, FRONTEND_URL);
startTimerWatchdog();

httpServer.listen(port, () => {
  console.log(`[chess] backend on :${port}`);
});
