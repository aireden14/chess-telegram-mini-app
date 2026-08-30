import React, { useEffect, useRef, useState } from "react";
import { TopNav } from "../../components/TopNav";
import { triggerHaptic } from "../../hooks/useTelegram";
import { celebrate } from "../../hooks/celebrate";
import { BOT_LEVELS, botLevelById, usePeredel } from "./peredelStore";
import { duelView, usePeredelOnline } from "./peredelOnlineStore";
import { blockEdgeClasses, SUDOKU_VARIANTS } from "../sudoku/sudokuVariants";
import { useAuthStore } from "../../store/auth";
import { useSocketStore } from "../../store/socket";
import "./peredelOnline.css";

function sameBox(a: number, b: number): boolean {
  const rowA = Math.floor(a / 9);
  const rowB = Math.floor(b / 9);
  return (
    Math.floor(rowA / 3) === Math.floor(rowB / 3) &&
    Math.floor((a % 9) / 3) === Math.floor((b % 9) / 3)
  );
}

export function PeredelScreen() {
  const {
    givens,
    entries,
    owners,
    candidates,
    levelId,
    status,
    selectedIndex,
    showCandidates,
    youScore,
    botScore,
    lastBotIndex,
    flash,
    result,
    bestScores,
    start,
    select,
    place,
    tick,
    toggleCandidates,
    clearFlash,
    dismissResult,
  } = usePeredel();

  const [menuOpen, setMenuOpen] = useState(false);
  const [freezeLeft, setFreezeLeft] = useState(0);
  const celebratedRef = useRef(false);

  // Сетевая дуэль: доска и очки приходят с сервера, локальный бот при этом молчит.
  const [online, setOnline] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [duelPassword, setDuelPassword] = useState("");
  const duel = usePeredelOnline();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const socket = useSocketStore((s) => s.socket);
  const connectSocket = useSocketStore((s) => s.connect);
  const myName = user?.firstName || user?.username || "Игрок";

  useEffect(() => {
    if (!online) return;
    const live = socket ?? (token ? connectSocket(token) : null);
    if (live && user) duel.attach(live, user.id);
  }, [online, socket, token, user, connectSocket, duel]);

  // Одна партия не переживает перезагрузку, поэтому доску собираем при входе.
  useEffect(() => {
    if (entries.length !== 81) start();
  }, [entries.length, start]);

  // Тик бота и таймер заморозки — один интервал на всё.
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      if (!online) tick(now);
      const until = online ? usePeredelOnline.getState().frozenUntil : usePeredel.getState().frozenUntil;
      setFreezeLeft(Math.max(0, Math.ceil((until - now) / 1000)));
    }, 200);
    return () => window.clearInterval(id);
  }, [tick, online]);

  const activeFlash = online ? duel.flash : flash;
  useEffect(() => {
    if (!activeFlash) return;
    const id = window.setTimeout(() => (online ? duel.clearFlash() : clearFlash()), 700);
    return () => window.clearTimeout(id);
  }, [activeFlash, clearFlash, online, duel]);

  useEffect(() => {
    if (result && !celebratedRef.current && result.youScore > result.botScore) {
      celebratedRef.current = true;
      celebrate();
    }
    if (!result) celebratedRef.current = false;
  }, [result]);

  if (!online && entries.length !== 81) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  const level = botLevelById(levelId);
  const frozen = freezeLeft > 0;

  // Экран рисует обе партии одним кодом: локальную и сетевую.
  const net = duelView(duel.room, user?.id ?? -1);
  const view = online
    ? net
    : {
        givens, entries, owners, candidates,
        youScore, rivalScore: botScore, rivalName: level.title, rivalOnline: true, status,
      };
  const vSelected = online ? duel.selectedIndex : selectedIndex;
  const vFlash = online ? duel.flash : flash;
  const vLastRival = online ? duel.lastRivalIndex : lastBotIndex;
  const doSelect = online ? duel.select : select;
  const doPlace = online ? duel.place : place;

  const filled = view.entries.filter((value) => value !== null).length;
  const total = view.youScore + view.rivalScore;
  const youShare = total > 0 ? (view.youScore / total) * 100 : 50;

  const startLevel = (id: string) => {
    start(id);
    setMenuOpen(false);
    triggerHaptic("medium");
  };

  const handleNumber = (digit: number) => {
    const outcome = doPlace(digit);
    if (outcome === "taken") triggerHaptic("success");
    else if (outcome === "miss") triggerHaptic("warning");
    else triggerHaptic("light");
  };

  // Сетевой режим до входа в комнату: создать дуэль или войти по коду.
  if (online && !duel.room) {
    return (
      <div className="app-screen peredel-screen">
        <TopNav title="Судоку PVP" backTo="/" />
        <div className="pd-lobby">
          <p className="peredel-rules">
            Доска одна на двоих, и расклад у вас общий. Клетку забирает тот, кто первым поставил
            в неё верную цифру. Промах морозит на 3 секунды и в сетку ничего не пишет.
          </p>
          {duel.error && <div className="pd-error">{duel.error}</div>}
          <div className="pd-field">
            <label>Пароль (необязательно)</label>
            <input
              type="text" value={duelPassword} placeholder="без пароля"
              onChange={(e) => setDuelPassword(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => duel.createRoom(myName, duelPassword)}>
            Создать дуэль
          </button>
          <div className="pd-sep">или</div>
          <div className="pd-field">
            <label>Код дуэли</label>
            <input
              type="text" value={joinCode} placeholder="например SDK7QF"
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
          </div>
          <button className="btn" onClick={() => duel.joinRoom(joinCode, myName, duelPassword)}>
            Войти по коду
          </button>
          <button className="btn pd-back" onClick={() => { setOnline(false); duel.detach(); }}>
            Назад к игре с ботом
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-screen peredel-screen">
      <TopNav title="Судоку PVP" backTo="/" />

      <div className="peredel-scorebar">
        <div className="peredel-side you">
          <span className="peredel-side-name">Ты</span>
          <strong>{view.youScore}</strong>
        </div>
        <div className="peredel-bar" aria-hidden="true">
          <div className="peredel-bar-you" style={{ width: `${youShare}%` }} />
        </div>
        <div className="peredel-side bot">
          <span className="peredel-side-name">{view.rivalName}</span>
          <strong>{view.rivalScore}</strong>
        </div>
      </div>

      {online && duel.room && (
        <div className="pd-roombar">
          <span className="pd-muted">Код дуэли</span>
          <b className="pd-code">{duel.room.code}</b>
          {duel.room.hasPassword && <span title="Под паролем">🔒</span>}
          <span className="pd-muted pd-roombar-status">
            {duel.room.status === "waiting"
              ? "ждём соперника"
              : duel.room.status === "finished"
                ? "дуэль окончена"
                : view.rivalOnline
                  ? "соперник в сети"
                  : "соперник отвалился, ждём 2 минуты"}
          </span>
        </div>
      )}

      <div className="peredel-toolbar">
        <span className="peredel-progress">
          Клеток закрыто {filled - view.givens.filter((value) => value !== null).length} из{" "}
          {81 - view.givens.filter((value) => value !== null).length}
        </span>
        <div className="peredel-toolbar-actions">
          <button
            className={`sudoku-iconbtn${showCandidates ? " active" : ""}`}
            onClick={() => {
              toggleCandidates();
              triggerHaptic("light");
            }}
            title="Показывать варианты"
            aria-label="Показывать варианты"
          >
            ◌
          </button>
          <button
            className="sudoku-iconbtn"
            onClick={() => {
              setMenuOpen(true);
              triggerHaptic("light");
            }}
            title="Соперник и новая партия"
            aria-label="Соперник и новая партия"
          >
            ⚙
          </button>
        </div>
      </div>

      <div className="sudoku-board-shell peredel-shell">
        {frozen && (
          <div className="peredel-freeze" role="status">
            <span className="peredel-freeze-count">{freezeLeft}</span>
            <span>Промах — ход пропущен</span>
          </div>
        )}
        <div className="sudoku-board peredel-board" role="grid" aria-label="Судоку PVP, поле 9 на 9">
          {view.entries.map((value, index) => {
            const given = view.givens[index] !== null;
            const owner = view.owners[index];
            const isSelected = vSelected === index;
            const isPeer =
              vSelected !== null &&
              !isSelected &&
              (Math.floor(index / 9) === Math.floor(vSelected / 9) ||
                index % 9 === vSelected % 9 ||
                sameBox(index, vSelected));
            const classes = [
              "sudoku-cell",
              blockEdgeClasses(index, SUDOKU_VARIANTS[9]),
              given ? "given" : "",
              owner === "you" ? "peredel-you" : "",
              owner === "bot" ? "peredel-bot" : "",
              isSelected ? "selected" : "",
              isPeer ? "peer" : "",
              vLastRival === index ? "peredel-just-bot" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const options = view.candidates[index] || [];

            return (
              <button
                key={index}
                className={classes}
                onClick={() => {
                  doSelect(index);
                  triggerHaptic("light");
                }}
                role="gridcell"
                aria-label={`Строка ${Math.floor(index / 9) + 1}, колонка ${(index % 9) + 1}${
                  value ? `, ${value}` : ""
                }`}
              >
                {value ? (
                  <span>{value}</span>
                ) : showCandidates && options.length ? (
                  <span className="peredel-price">{options.length}</span>
                ) : null}
                {vFlash?.index === index && (
                  <span className={`peredel-flash ${vFlash.owner === "you" ? "you" : "bot"}`}>
                    +{vFlash.points}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="peredel-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
          const left = 9 - view.entries.filter((value) => value === digit).length;
          return (
            <button
              key={digit}
              className="peredel-key"
              disabled={view.status !== "playing" || frozen || vSelected === null || left === 0}
              onClick={() => handleNumber(digit)}
            >
              <b>{digit}</b>
              <i>{left}</i>
            </button>
          );
        })}
      </div>

      <p className="peredel-hint">
        {showCandidates
          ? "Число в пустой клетке — сколько цифр в неё влезает. Столько же очков она и стоит."
          : "Клетка стоит столько очков, сколько цифр в неё влезало."}
      </p>

      {/* ===== Соперник ===== */}
      {menuOpen && (
        <div className="modal-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="modal sudoku-menu" onClick={(event) => event.stopPropagation()}>
            <h3>Соперник</h3>
            <p className="peredel-rules">
              Доска одна на двоих. Кто первым верно закрыл клетку — того она и есть. Промах ничего
              не пишет в сетку, но морозит на 3 секунды. Осторожно: каждая закрытая клетка открывает
              боту новые ходы.
            </p>
            <div className="peredel-levels">
              {BOT_LEVELS.map((option) => (
                <button
                  key={option.id}
                  className={`peredel-level${option.id === levelId ? " active" : ""}`}
                  onClick={() => startLevel(option.id)}
                >
                  <strong>{option.title}</strong>
                  <span>{option.desc}</span>
                  {bestScores[option.id] ? <em>рекорд {bestScores[option.id]}</em> : null}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button
                className="btn"
                onClick={() => { setMenuOpen(false); setOnline(true); }}
              >
                Играть с человеком
              </button>
              <button className="btn" onClick={() => setMenuOpen(false)}>
                Закрыть
              </button>
              <button className="btn btn-primary" onClick={() => startLevel(levelId)}>
                Новая партия
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Итог сетевой дуэли ===== */}
      {online && duel.room?.status === "finished" && (
        <div className="sudoku-victory" role="dialog" aria-modal="true">
          <div className="sudoku-victory-card">
            <div className="sudoku-victory-orb">{duel.room.winner === user?.id ? "★" : "·"}</div>
            <p className="sudoku-kicker">Доска заполнена</p>
            <h2>
              {duel.room.winner === "draw"
                ? "Ничья"
                : duel.room.winner === user?.id
                  ? "Ты забрал больше"
                  : `${view.rivalName} забрал больше`}
            </h2>
            <p>{view.youScore} : {view.rivalScore}</p>
            <div className="sudoku-victory-actions">
              <button className="btn btn-primary" onClick={() => { duel.leaveRoom(); }}>
                Ещё дуэль
              </button>
              <button className="btn" onClick={() => { duel.leaveRoom(); setOnline(false); }}>
                К боту
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Итог ===== */}
      {!online && result && (
        <div className="sudoku-victory" role="dialog" aria-modal="true">
          <div className="sudoku-victory-card">
            <div className="sudoku-victory-orb">{result.youScore > result.botScore ? "★" : "·"}</div>
            <p className="sudoku-kicker">Доска заполнена</p>
            <h2>
              {result.youScore > result.botScore
                ? "Ты забрал больше"
                : result.youScore === result.botScore
                  ? "Ничья"
                  : "Бот забрал больше"}
            </h2>
            <p>
              {result.youScore} : {result.botScore} · клеток {result.youCells} против{" "}
              {result.botCells} · промахов {result.mistakes}
            </p>
            <p className="sudoku-victory-tech">
              Соперник — {botLevelById(result.levelId).title}
              {bestScores[result.levelId] === result.youScore && result.youScore > 0
                ? " · это твой рекорд"
                : ""}
            </p>
            <div className="sudoku-victory-actions">
              <button className="btn btn-primary" onClick={() => startLevel(result.levelId)}>
                Ещё раз
              </button>
              <button className="btn" onClick={dismissResult}>
                Посмотреть доску
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
