# ♟ Шахматы — Telegram Mini App

Полноценный production-skeleton: React + TS (frontend), Node + TS + Express + Prisma + socket.io (backend), SQLite (dev) / PostgreSQL-ready (prod), Apple-style UI, эмоджи-фигурки и игра против бота (лёгкий/средний).

## Структура

```
chess-app/
├── backend/              Node.js + TS + Express + socket.io + Prisma
│   ├── prisma/schema.prisma
│   └── src/
│       ├── routes/       auth, users, games
│       ├── services/     gameService, elo, bot
│       ├── socket/       socket.io handlers + watchdog таймера
│       ├── middleware/   JWT auth
│       └── utils/        prisma, jwt, telegram HMAC, json
├── frontend/             React 18 + Vite + TS
│   └── src/
│       ├── pages/        Loading / Home / Create / Join / Game / Profile / History / Replay / Leaderboard / Paused
│       ├── components/   PlayerPanel, Modal, TopNav, EmojiPieces
│       ├── store/        zustand: auth, game, socket
│       ├── api/          axios клиент
│       └── styles/       Apple-style design system
└── docker-compose.yml    (опционально) PostgreSQL для прод / нагрузочного теста
```

## Запуск (dev)

### 1. Backend (SQLite уже встроена)

```bash
cd backend
cp .env.example .env
# Отредактировать .env: BOT_TOKEN, BOT_USERNAME, JWT_SECRET (минимум 32 символа)
npm install
npx prisma migrate dev --name init
npm run dev
```

Сервер поднимется на `http://localhost:3001`.

> **Tip:** `DEV_ALLOW_FAKE_AUTH=1` в `.env` разрешает «гостевой» вход без проверки HMAC — удобно для запуска вне Telegram (в обычном браузере).

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Откроется на `http://localhost:5173`.

## Production

1. Выбрать БД: SQLite (по умолчанию) — достаточно синхронизировать файл `backend/prisma/dev.db`. Для серьёзного продакшена можно переключить `DATABASE_URL` на PostgreSQL и выполнить `prisma migrate deploy`.
2. Backend: `npm run build && npm start` (или docker-образ — при желании добавить Dockerfile).
3. Frontend: `npm run build` → залить `dist/` на любой статический хостинг (Netlify/Vercel/Cloudflare Pages).
4. Прописать домен фронта в BotFather → `/newapp` → Web App URL.
5. **Обязательно** убрать `DEV_ALLOW_FAKE_AUTH` (или установить в `0`) — иначе можно входить под любым `telegramId`.

## Игра с ботом

- На главном экране кнопка **🤖 Играть с ботом** или на экране создания игры — параметр `vsBot`.
- Уровни:
  - **Лёгкий** — случайный ход с 30% уклоном в максимально ценный захват.
  - **Средний** — alpha-beta minimax глубины 2 + случайность среди топ-ходов в пределах 30 очков.
- Партия с ботом нерейтинговая (Elo не меняется), но идёт в общую статистику wins/losses.

## Apple-style UI

- Шрифт `-apple-system / SF Pro`, `letter-spacing: -0.01em`.
- Системные цвета iOS (`#007aff` tint, `#34c759` green, `#ff3b30` red, etc.) с автоматической dark mode через `prefers-color-scheme`.
- Скругления, мягкие тени, segmented controls, карточки в стиле iOS Settings.
- Эмоджи-фигурки: `♔♕♖♗♘♙ / ♚♛♜♝♞♟` через `customPieces` `react-chessboard` — шрифт фигур масштабируется под размер клетки.

## Критические правила (см. промт)

- ✅ Источник истины — сервер. chess.js валидирует ход дважды (клиент для UX + сервер).
- ✅ FEN+PGN сохраняются при каждом ходе.
- ✅ Таймер — lazy evaluation (`now - lastMoveAt`) + watchdog каждые 5 сек.
- ✅ Telegram HMAC проверяется на сервере; JWT 30 дней.
- ✅ Elo считается в Prisma-транзакции, минимум 100, K=32.
- ✅ Все события сокета обёрнуты в try/catch.

## Известные ограничения / TODO

- Уведомления через Telegram Bot API при `REQUEST_RESUME` офлайн-игроку — заготовлен слот в коде, реализация требует Bot API token и `node-telegram-bot-api`.
- Стандартное управление промоушеном — через `q` (ферзь) по умолчанию; UI выбора промоушена (Q/R/B/N) можно добавить отдельным модалом.
- В random-color-режиме создатель игры идентифицируется только по факту, что один из слотов уже занят (см. `routes/games.ts` join). При желании — добавить `creatorId` в `Game`.

---
Готово к запуску. Если что-то не запустилось — пинг.
