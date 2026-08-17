import React, { useEffect, useRef, useState } from "react";
import { TopNav } from "../../components/TopNav";
import { triggerHaptic } from "../../hooks/useTelegram";
import { celebrate } from "../../hooks/celebrate";
import { BOT_LEVELS, botLevelById, usePeredel } from "./peredelStore";
import { blockEdgeClasses, SUDOKU_VARIANTS } from "../sudoku/sudokuVariants";

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

  // Одна партия не переживает перезагрузку, поэтому доску собираем при входе.
  useEffect(() => {
    if (entries.length !== 81) start();
  }, [entries.length, start]);

  // Тик бота и таймер заморозки — один интервал на всё.
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      tick(now);
      setFreezeLeft(Math.max(0, Math.ceil((usePeredel.getState().frozenUntil - now) / 1000)));
    }, 200);
    return () => window.clearInterval(id);
  }, [tick]);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => clearFlash(), 700);
    return () => window.clearTimeout(id);
  }, [flash, clearFlash]);

  useEffect(() => {
    if (result && !celebratedRef.current && result.youScore > result.botScore) {
      celebratedRef.current = true;
      celebrate();
    }
    if (!result) celebratedRef.current = false;
  }, [result]);

  if (entries.length !== 81) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  const level = botLevelById(levelId);
  const frozen = freezeLeft > 0;
  const filled = entries.filter((value) => value !== null).length;
  const total = youScore + botScore;
  const youShare = total > 0 ? (youScore / total) * 100 : 50;

  const startLevel = (id: string) => {
    start(id);
    setMenuOpen(false);
    triggerHaptic("medium");
  };

  const handleNumber = (digit: number) => {
    const outcome = place(digit);
    if (outcome === "taken") triggerHaptic("success");
    else if (outcome === "miss") triggerHaptic("warning");
    else triggerHaptic("light");
  };

  return (
    <div className="app-screen peredel-screen">
      <TopNav title="Передел" backTo="/" />

      <div className="peredel-scorebar">
        <div className="peredel-side you">
          <span className="peredel-side-name">Ты</span>
          <strong>{youScore}</strong>
        </div>
        <div className="peredel-bar" aria-hidden="true">
          <div className="peredel-bar-you" style={{ width: `${youShare}%` }} />
        </div>
        <div className="peredel-side bot">
          <span className="peredel-side-name">{level.title}</span>
          <strong>{botScore}</strong>
        </div>
      </div>

      <div className="peredel-toolbar">
        <span className="peredel-progress">
          Клеток закрыто {filled - givens.filter((value) => value !== null).length} из{" "}
          {81 - givens.filter((value) => value !== null).length}
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
        <div className="sudoku-board peredel-board" role="grid" aria-label="Передел, поле 9 на 9">
          {entries.map((value, index) => {
            const given = givens[index] !== null;
            const owner = owners[index];
            const isSelected = selectedIndex === index;
            const isPeer =
              selectedIndex !== null &&
              !isSelected &&
              (Math.floor(index / 9) === Math.floor(selectedIndex / 9) ||
                index % 9 === selectedIndex % 9 ||
                sameBox(index, selectedIndex));
            const classes = [
              "sudoku-cell",
              blockEdgeClasses(index, SUDOKU_VARIANTS[9]),
              given ? "given" : "",
              owner === "you" ? "peredel-you" : "",
              owner === "bot" ? "peredel-bot" : "",
              isSelected ? "selected" : "",
              isPeer ? "peer" : "",
              lastBotIndex === index ? "peredel-just-bot" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const options = candidates[index] || [];

            return (
              <button
                key={index}
                className={classes}
                onClick={() => {
                  select(index);
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
                {flash?.index === index && (
                  <span className={`peredel-flash ${flash.owner === "you" ? "you" : "bot"}`}>
                    +{flash.points}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="peredel-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
          const left = 9 - entries.filter((value) => value === digit).length;
          return (
            <button
              key={digit}
              className="peredel-key"
              disabled={status !== "playing" || frozen || selectedIndex === null || left === 0}
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

      {/* ===== Итог ===== */}
      {result && (
        <div className="sudoku-victory" role="dialog" aria-modal="true">
          <div className="sudoku-victory-card">
            <div className="sudoku-victory-orb">{result.youScore > result.botScore ? "★" : "·"}</div>
            <p className="sudoku-kicker">Доска заполнена</p>
            <h2>
              {result.youScore > result.botScore
                ? "Передел твой"
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
