# AGENTS — онбординг для агентов (читай первым)

Этот репозиторий разрабатывается **несколькими агентами параллельно**. История быстро
двигается; перед работой `git fetch` + сверься с `origin/main`. Документ описывает где что
лежит, как запускать, как деплоить и где грабли. Если что-то поменял существенно — обнови
этот файл.

## Что это
Telegram Mini App «игровой хаб»: один веб-апп с несколькими играми.
- **Frontend**: React 18 + Vite + TypeScript, zustand, react-router. Открывается внутри Telegram (и в обычном браузере).
- **Backend**: Node + Express + **Prisma + SQLite**, socket.io (реалтайм для шахмат/шашек).
- Репо на GitHub: **`aireden14/chess-telegram-mini-app`** (владелец `aireden14`, не `denis540x`).

## Запуск локально
```bash
# backend (порт 3001). DEV_ALLOW_FAKE_AUTH=1 — гостевой вход без Telegram-подписи.
cd backend && cp .env.example .env   # один раз; отредактируй BOT_TOKEN/JWT_SECRET при нужде
DEV_ALLOW_FAKE_AUTH=1 npm run dev

# frontend (порт 5173)
cd frontend && npm run dev
```
Дефолтный API-адрес во фронте: `VITE_API_URL || http://localhost:3001` (см. `frontend/src/api/client.ts`).
Проверка изменений — через preview-инструменты; скриншоты иногда подвисают (инфра), тогда
проверяй DOM через `preview_eval`.

## Карта репозитория
```
frontend/src/
  App.tsx                 # все маршруты (роуты ниже)
  pages/                  # экраны верхнего уровня
    GamePickerScreen      # ЛЕНДИНГ "/" — выбор игры (карточки), тема, "Что нового"
    ChessHubScreen        # "/chess" — хаб шахмат (создать/бот/код/вдвоём, история, лидеры)
    GameScreen            # "/game/:id" — онлайн/бот-партия шахмат (socket)
    LocalGameScreen       # "/local" — шахматы вдвоём на устройстве (клиент, localStorage)
    Create/Join/History/Leaderboard/Paused/Replay/Profile/Loading/WhatsNew
  features/
    sudoku/               # СУДОКУ: движок + стор (sudokuStore) + серверный профиль (sudokuProfileStore)
    checkers/             # ШАШКИ: checkersEngine.ts (правила + бот minimax) + CheckersScreen
    catan/                # КАТАН: CatanScreen — ТОЛЬКО iframe на /games/catan/index.html
    forceDeflector/       # аркада — iframe на /games/force-deflector/index.html
  data/changelog.ts       # источник правды для экрана "Что нового" (+ бейдж по версии)
  styles/global.css       # ВСЯ дизайн-система (один файл; тёмная+светлая темы, токены)
frontend/public/games/    # статичные встраиваемые игры (catan, force-deflector)
backend/src/
  index.ts                # express + роутеры; initSocket(); см. ВНИМАНИЕ ниже
  routes/                 # auth, users, games(chess), sudoku  (+ catan/telegram — UNCOMMITTED WIP)
  socket/                 # index.ts, checkers.ts  (+ catan.ts — UNCOMMITTED WIP)
  services/               # gameService (chess), bot (chess), elo
  prisma/schema.prisma    # модели; provider=sqlite
  prisma/dev.db           # ВНИМАНИЕ: закоммичена и ЭТО и есть прод-БД (см. деплой)
```

Маршруты (`App.tsx`): `/` picker · `/chess` · `/create` · `/join/:id` · `/game/:id` · `/local`
· `/checkers` · `/catan` · `/sudoku` · `/force-deflector` · `/fable-world` · `/profile` · `/whats-new`
· `/history` · `/replay/:id` · `/leaderboard` · `/paused` · `/loading`.

## Игры — как устроены

### Обязательный UX для игровых экранов

- Игровые canvas, доски, drag/touch-поверхности и standalone-игры в iframe не
  должны позволять случайно выделять текст. Используй `user-select: none`,
  `-webkit-user-select: none` и `-webkit-touch-callout: none`.
- В standalone iframe защита должна быть добавлена в сам HTML iframe: CSS
  родительского React-приложения внутрь iframe не действует.
- Для игрового поля блокируй мешающие управлению события `selectionstart`,
  `dragstart` и `contextmenu`.
- Не отключай нативное редактирование у настоящих `input`, `textarea`,
  `select`, `[contenteditable]`, а также в ридерах и редакторах, где
  выделение текста является частью функции.
- Проверяй long-press и drag на телефоне перед публикацией новой игры.

- **Шахматы**: онлайн (socket) + бот + рейтинг Elo. Backend: `routes/games.ts`, `services/gameService.ts`, `services/bot.ts`, `socket/index.ts`. Стиль фигур хранится в аккаунте (`User.pieceStyle`).
- **Шахматы вдвоём** (`/local`): чисто клиент (chess.js), сохранение в localStorage `chess-local-game-v1`.
- **Шашки** (`/checkers`): русские правила в `features/checkers/checkersEngine.ts` (обязательный бой, бой во все стороны, цепочки, дамки-летучки) + **бот (minimax, уровни)** в том же файле. Есть **онлайн** через `backend/src/socket/checkers.ts` (закоммичен). Локальная партия сохраняется (`chess-app-checkers-v1`).
- **Катан** (`/catan`): встроен **готовый Hexland-билд** iframe'ом. Файл `frontend/public/games/catan/index.html` — это копия `apps/hexland/hexland-standalone.html` (self-contained, без CDN). Чтобы обновить Катан — пересобери Hexland и перекопируй standalone-билд сюда. ⚠️ Есть ОТДЕЛЬНЫЙ незакоммиченный нативный catan-бэкенд (см. ниже) — это другое, фронт его не использует.
- **Судоку** (`/sudoku`): доска сразу + тулбар-иконки (новая/задания/достижения/настройки) с меню. Геймификация **серверная**: `backend/src/routes/sudoku.ts` (`/me`,`/complete`,`/achievements`,`/daily`,`/leaderboard`) + модель `SudokuProfile`. Фронт: `sudokuProfileStore.ts` шлёт результат на победе, всплывают тосты-разблокировки.
- **Отражатель**: аркада, iframe `public/games/force-deflector/index.html`. Мир динамический (подстраивается под вьюпорт, равномерный масштаб `unit=clamp(vh/720, .75, 1.5)`) — НЕ возвращать фиксированные 1280×720.
- **Монополия** (`/monopoly-hp`): standalone iframe `public/games/monopoly-hp/index.html`, сеттинг Гарри Поттера, боты + обмены (botEvalTrade), сейв в localStorage `mhp.save.v2`.
- **Бункер** (`/bunker`): онлайн-мультиплеер, комнаты по КОДУ, который придумывает создатель. Backend: `backend/src/socket/bunker.ts` (in-memory rooms, события BUNKER_*), колоды в `bunkerData.ts` (300+ карточек). Frontend: `features/bunker/BunkerScreen.tsx` через общий socket-стор (JWT). Личные карты шлются отдельным событием BUNKER_HAND только владельцу.
- **Overquest** (`/overquest`): standalone iframe, соло + 2 бота, карточный dungeon-run. Источник — отдельный Vite-проект `apps/overquest` (`engine/game.js` правила без DOM, `engine/story.js` seeded-сюжет, `app/main.js` рендер). Билд копируется в `public/games/overquest/`. Без backend, без сохранения между сессиями.
- **Мачкин** (`/machkin`): standalone iframe, соло + 2 бота, более полный dungeon-crawler по мотивам классики карточных «манчкинов» (классы+расы, золото→уровни, большие шмотки, проклятия мгновенные и «на любого игрока», смерть/мародёрство, уровень до 10). Источник — `apps/machkin` (`engine/content.js` данные, `engine/story.js` процедурный сюжет + комбинаторные монстры, `engine/game.js` правила). Билд копируется в `public/games/machkin/`. Весь контент (имена монстров/шмоток/проклятий) оригинальный, не перевод карт какой-либо конкретной настолки. Без backend; сетевой режим — открытая задача.
- **Fable World** (`/fable-world`): standalone top-down MVP в `frontend/public/games/fable-world/`. Один экран объединяет исследование, бой, поимку фейблов, строительство и автоматизацию базы. Данные вынесены в `data/`: 28 технологий, 20 оригинальных видов, 5 биомов, ресурсы/рецепты и формулы баланса. Сохранение localStorage `gamepass.fable-world.v1`, backend пока не нужен.
- **Nebula Drift** (`/nebula-drift`): standalone вертикальный аркадный шутер, iframe `public/games/nebula-drift/index.html` (тот же паттерн, что force-deflector/neurogrid/webgrid — `TopNav` + `.force-deflector-frame-shell`, экран `features/nebulaDrift/NebulaDriftScreen.tsx`). Всё процедурно: силуэт корабля игрока (генерируется один раз за забег), формы врагов (геометрические/органические/абстрактные), фон (звёзды/туманности/планеты) и паттерны движения/стрельбы врагов. Одна кнопка ввода — тяни пальцем/мышью, авто-огонь. Рекорд в localStorage `gamepass.nebula-drift.highscore.v1`, backend не нужен.
- **Jedi Survivors** (`/jedi-survivors`): standalone выживач в духе Vampire Survivors, один файл canvas+JS, iframe `public/games/jedi-survivors/index.html` (тот же паттерн — `TopNav` + `.force-deflector-frame-shell`, экран `features/jediSurvivors/JediSurvivorsScreen.tsx`). Источник — `apps/jedi-survivors/index.html` (копируй оттуда при обновлении). 7 эволюционируемых оружий + 10 пассивок, волновой спавн по минутам, боссы AT-ST/Дарт Мол/Дарт Вейдер, мета-магазин «Академия джедаев» в localStorage. Управление — джойстик пальцем/WASD, короткий тап — точка «идти сюда». Backend не нужен.
- **NEON BLADE** (`/neon-blade`): standalone ритм-слэшер в `frontend/public/games/neon-blade/index.html`, экран `features/neonBlade/NeonBladeScreen.tsx`. Источник — `apps/neon-blade/index.html`; при обновлении копируй standalone-файл заново. Three.js-визуал, процедурная synthwave-музыка WebAudio, свайпы двумя клинками, комбо x1–x8, энергия, ранги E–SS и локальная прогрессия. Игра рассчитана на landscape и использует full-bleed CSS оболочку GamePass, не зависящую от `requestFullscreen()` в iframe. Backend не нужен.

## Telegram-бот / Mini App контекст
Главная ближайшая цель пользователя: **из этого репозитория напрямую апгрейдить Telegram-бота** (`Liquid_Chess_bot`) и Mini App, не теряя контекст проекта.
- Mini App авторизация уже есть: `frontend/index.html` подключает Telegram WebApp SDK, фронт отправляет `initData`, backend проверяет подпись в `routes/auth.ts` через `BOT_TOKEN`. Для локальной разработки вне Telegram используй `DEV_ALLOW_FAKE_AUTH=1`.
- `BOT_USERNAME` возвращается из `/api/auth/telegram` и используется для deep-link invite (`https://t.me/<bot>/app?...`) в шахматах/шашках.
- Webhook закоммичен: `routes/telegramWebhook.ts`, `scripts/set-telegram-webhook.ts`, роут `/api/telegram`. Env: `TELEGRAM_WEBHOOK_SECRET`/`FRONTEND_URL`/`BACKEND_URL`.
- Текущий webhook умеет только отвечать на `/start` кнопкой открытия Mini App. Следующий безопасный апгрейд: вынести webhook в чистый worktree от `origin/main`, добавить команды/меню бота и проверить `npm run build` перед деплоем.
- Для прод-настройки webhook нужен `BOT_TOKEN`, `BACKEND_URL=https://gamepass-backend.fly.dev`, `FRONTEND_URL=https://chess-telegram-mini-app.vercel.app`, случайный `TELEGRAM_WEBHOOK_SECRET`, затем `cd backend && npm run telegram:webhook:set`.

## Деплой (и ГРАБЛИ — читай обязательно)
- **Frontend → Vercel**, автодеплой при push в `main`. Есть **3 Vercel-проекта** (главный + `-1nbe` + `-s6br`), все собираются из репо. Сборка ~1–2 мин.
- **Backend → Fly.io**: app `gamepass-backend`, region `fra`, URL `https://gamepass-backend.fly.dev`. Конфиги в `backend/Dockerfile` и `backend/fly.toml`; health `GET /api/health`.
- **DB → Supabase Postgres**, region West EU. Runtime использует transaction pooler (`DATABASE_URL`, port 6543), а Prisma schema sync — session pooler (`DIRECT_URL`, port 5432). Оба URL хранятся только в Fly secrets.
- `fly.toml` запускает безопасный `prisma db push` перед каждым релизом; потеря данных не подтверждается автоматически.
- **`VITE_API_URL` обязателен**: без него `vite build` зашивает `localhost:3001` и прод-мини-апп не видит API. Зафиксировано в `frontend/.env.production` (коммитится; `.gitignore` игнорит только `.env`, не `.env.*`).
- **gh CLI**: `/Users/windsurf/dev/re/.local/gh_2.91.0_macOS_arm64/bin/gh` (НЕ в PATH). Токен в keyring протухает; переавторизация `gh auth login -h github.com -p https -w` — запускать в терминале пользователя (device-код истекает за время чат-раунда). Логиниться под `aireden14`.

### Постоянные сохранения
- Online-шахматы пишут FEN, PGN, таймеры, статус и рейтинг в Supabase на каждом ходе. Выход из Mini App не удаляет партию.
- Локальные шахматы `/local` по-прежнему хранят FEN в `localStorage` под ключом `chess-local-game-v1`.
- Не возвращать `provider = sqlite` и не класть production-данные в `prisma/dev.db`.

## Мультиагентная координация
- `git fetch` ПЕРЕД работой. Локальный `main` может отставать от `origin/main`, потому что часть
  пушей делается из worktree (после этого `git reset --soft origin/main` чтобы выровнять, рабочее дерево не пострадает).
- Если push отклонён (non-fast-forward) — НЕ ребейзи поверх грязного дерева; используй worktree +
  `git cherry-pick <твой-коммит>` на `origin/main`, потом push.
- Прод URL: backend `https://gamepass-backend.fly.dev`, фронт `https://chess-telegram-mini-app.vercel.app`.

## Открытые задачи (на момент написания)
- **Апгрейд Telegram-бота**: добавить полноценные команды/меню и задеплоить webhook чисто, без незакоммиченного catan WIP.
- **Гайд по покупке сервера** — пользователь просил пошаговый гайд (дешёвый always-on VPS с постоянной памятью под бэкенд+БД+будущие идеи).
- История changelog ведётся в `frontend/src/data/changelog.ts` (+ `CHANGELOG.md`); при заметной фиче добавляй версию сверху.
