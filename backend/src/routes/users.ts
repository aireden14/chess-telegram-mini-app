import { Router } from "express";
import { prisma } from "../utils/prisma";
import { authMiddleware, AuthedRequest } from "../middleware/auth";
import { safeJson } from "../utils/json";

export const usersRouter = Router();

usersRouter.get("/me", authMiddleware, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) return res.status(404).json({ error: "not found" });
  res.json(safeJson(user));
});

usersRouter.get("/leaderboard", authMiddleware, async (_req, res) => {
  const top = await prisma.user.findMany({
    where: { isBot: false },
    orderBy: { rating: "desc" },
    take: 20,
  });
  res.json(safeJson(top));
});

usersRouter.get("/:telegramId", authMiddleware, async (req, res) => {
  const tid = req.params.telegramId;
  if (!tid || !/^\d+$/.test(tid)) return res.status(400).json({ error: "bad id" });
  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
  if (!user) return res.status(404).json({ error: "not found" });
  res.json(safeJson(user));
});
