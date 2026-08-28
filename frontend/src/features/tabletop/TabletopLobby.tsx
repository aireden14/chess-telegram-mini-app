import React, { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SETTINGS, TabletopPreset, TabletopSettings,
  deletePreset, loadLastSettings, loadPresets, savePreset, saveLastSettings,
} from "./presets";
import { RoomState } from "./useTabletopRoom";
import "./tabletop.css";

interface Props {
  game: string;
  title: string;
  room: RoomState | null;
  amHost: boolean;
  error: string;
  onCreate: (settings: TabletopSettings) => void;
  onJoin: (code: string, password: string) => void;
  onSettings: (settings: TabletopSettings) => void;
  onStart: () => void;
  onLeave: () => void;
  onExit: () => void;
}

const TURN_CHOICES = [0, 30, 60, 120, 300];
const turnLabel = (s: number) => (s === 0 ? "без таймера" : `${s} сек`);

export function TabletopLobby(props: Props) {
  const { game, title, room, amHost, error } = props;
  const [tab, setTab] = useState<"create" | "join">("create");
  const [settings, setSettings] = useState<TabletopSettings>(() => loadLastSettings(game));
  const [presets, setPresets] = useState<TabletopPreset[]>(() => loadPresets(game));
  const [presetName, setPresetName] = useState("");
  const [code, setCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");

  useEffect(() => { saveLastSettings(game, settings); }, [game, settings]);

  const patch = (next: Partial<TabletopSettings>) => setSettings((s) => ({ ...s, ...next }));

  const applyPreset = (preset: TabletopPreset) => {
    setSettings({ ...preset.settings });
    if (room && amHost) props.onSettings(preset.settings);
  };

  const onSavePreset = () => {
    setPresets(savePreset(game, presetName || `Стол на ${settings.seats}`, settings));
    setPresetName("");
  };

  const humans = useMemo(() => room?.players.filter((p) => !p.bot).length ?? 0, [room]);
  const canStart = amHost && room?.phase === "lobby" && (humans >= 2 || settings.botFill || room.settings.botFill);

  if (room) {
    return (
      <div className="tt-lobby">
        <div className="tt-head">
          <h2>{title}</h2>
          <button className="tt-ghost" onClick={props.onExit}>В игры</button>
        </div>

        <div className="tt-code-card">
          <span className="tt-muted">Код стола</span>
          <b className="tt-code">{room.code}</b>
          {room.hasPassword && <span className="tt-lock" title="Комната под паролем">🔒</span>}
        </div>

        <ul className="tt-players">
          {room.players.map((p) => (
            <li key={p.userId} className={p.online || p.bot ? "" : "tt-off"}>
              <span>{p.name}{p.bot ? " 🤖" : ""}</span>
              <span className="tt-muted">
                {p.isHost ? "ведущий" : p.bot ? "бот" : p.online ? "в сети" : "ждём возврата"}
              </span>
            </li>
          ))}
        </ul>

        <div className="tt-muted tt-note">
          Мест за столом: {room.settings.seats} · ход: {turnLabel(room.settings.turnSeconds)}
          {room.settings.botFill ? " · добор ботами" : ""}
        </div>

        {amHost && room.phase === "lobby" && (
          <div className="tt-presets">
            {presets.map((p) => (
              <button key={p.id} className="tt-chip" onClick={() => applyPreset(p)}>{p.name}</button>
            ))}
          </div>
        )}

        {error && <div className="tt-error">{error}</div>}

        <div className="tt-actions">
          {canStart && <button className="tt-primary" onClick={props.onStart}>Начать партию</button>}
          {!amHost && room.phase === "lobby" && <div className="tt-muted">Ждём, пока ведущий начнёт партию</div>}
          <button className="tt-ghost" onClick={props.onLeave}>Выйти из комнаты</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tt-lobby">
      <div className="tt-head">
        <h2>{title} · игра с людьми</h2>
        <button className="tt-ghost" onClick={props.onExit}>В игры</button>
      </div>

      <div className="tt-tabs">
        <button className={tab === "create" ? "on" : ""} onClick={() => setTab("create")}>Создать стол</button>
        <button className={tab === "join" ? "on" : ""} onClick={() => setTab("join")}>Войти по коду</button>
      </div>

      {tab === "create" ? (
        <div className="tt-form">
          {presets.length > 0 && (
            <div className="tt-field">
              <label>Пресеты</label>
              <div className="tt-presets">
                {presets.map((p) => (
                  <span key={p.id} className="tt-chip-wrap">
                    <button className="tt-chip" onClick={() => applyPreset(p)}>{p.name}</button>
                    <button
                      className="tt-chip-x"
                      title="Удалить пресет"
                      onClick={() => setPresets(deletePreset(game, p.id))}
                    >×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="tt-field">
            <label>Мест за столом: {settings.seats}</label>
            <input
              type="range" min={2} max={6} value={settings.seats}
              onChange={(e) => patch({ seats: Number(e.target.value) })}
            />
          </div>

          <div className="tt-field">
            <label>Время на ход</label>
            <div className="tt-row">
              {TURN_CHOICES.map((t) => (
                <button
                  key={t}
                  className={settings.turnSeconds === t ? "tt-chip on" : "tt-chip"}
                  onClick={() => patch({ turnSeconds: t })}
                >{turnLabel(t)}</button>
              ))}
            </div>
          </div>

          <label className="tt-check">
            <input
              type="checkbox" checked={settings.botFill}
              onChange={(e) => patch({ botFill: e.target.checked })}
            />
            Добирать ботами, если людей не хватает
          </label>

          <div className="tt-field">
            <label>Пароль (необязательно)</label>
            <input
              type="text" value={settings.password} placeholder="без пароля"
              onChange={(e) => patch({ password: e.target.value })}
            />
          </div>

          <div className="tt-field">
            <label>Сохранить эти настройки пресетом</label>
            <div className="tt-row">
              <input
                type="text" value={presetName} placeholder="Название пресета"
                onChange={(e) => setPresetName(e.target.value)}
              />
              <button className="tt-ghost" onClick={onSavePreset}>Сохранить</button>
            </div>
          </div>

          {error && <div className="tt-error">{error}</div>}
          <button className="tt-primary" onClick={() => props.onCreate(settings)}>Создать стол</button>
        </div>
      ) : (
        <div className="tt-form">
          <div className="tt-field">
            <label>Код стола</label>
            <input
              type="text" value={code} placeholder="например TTAB12"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="tt-field">
            <label>Пароль, если есть</label>
            <input
              type="text" value={joinPassword} placeholder="без пароля"
              onChange={(e) => setJoinPassword(e.target.value)}
            />
          </div>
          {error && <div className="tt-error">{error}</div>}
          <button className="tt-primary" onClick={() => props.onJoin(code, joinPassword)}>Войти</button>
        </div>
      )}
    </div>
  );
}

export const DEFAULT_TABLETOP_SETTINGS = DEFAULT_SETTINGS;
