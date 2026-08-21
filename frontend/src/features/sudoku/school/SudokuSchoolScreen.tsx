import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../../../components/TopNav";
import { triggerHaptic } from "../../../hooks/useTelegram";
import { celebrate } from "../../../hooks/celebrate";
import { cellCandidates } from "../sudokuLogic";
import { useSudokuStore } from "../sudokuStore";
import { LessonBoard } from "./LessonBoard";
import { LessonPosition } from "./lessonPositions";
import { SUDOKU_LESSONS, SudokuLesson } from "./lessons";
import { isLessonOpen, nextLesson, useSudokuSchool } from "./schoolStore";

/** Первая подсказка — не ответ, а направление поиска. По приёму, а не по позиции. */
const TIPS: Record<string, string> = {
  "naked-single": "Пройдите цифры 1–9 и вычеркните всё, что видно из строки, колонки и блока этой клетки.",
  "hidden-single-box":
    "Возьмите названную цифру и по очереди приложите к блоку строки и колонки, где она уже стоит: каждая вычеркнет свои клетки.",
  "hidden-single-line":
    "Пройдите линию клетка за клеткой и спросите про каждую: видна ли здесь эта цифра из колонки, строки или блока?",
  pointing: "Отмечать нужно все клетки блока, где цифра ещё возможна, — а не только те, что в одной линии.",
  claiming: "Смотрите на линию целиком: в скольких её клетках цифра ещё возможна и все ли они в одном блоке.",
  "naked-pair": "Ищите клетки, где в заметках ровно две цифры, и сверяйте такие клетки между собой.",
  "hidden-pair": "Считайте не по клеткам, а по цифрам: у какой из них в этой линии осталось ровно два места.",
  "naked-triple": "Годятся клетки с двумя и тремя кандидатами. Важно, чтобы всех разных цифр в них было ровно три.",
  "hidden-triple": "Найдите три цифры, у которых в линии осталось по два-три места, и проверьте, что места общие.",
  "x-wing": "В каждой из названных линий у цифры ровно два места. Проверьте, совпадают ли они по второй координате.",
  swordfish: "Мест в линии может быть и два, и три. Считайте, в какие колонки они все вместе попадают.",
  "xy-wing": "Смотрите только на клетки с двумя кандидатами: ось видит оба крыла, а крылья делят с ней по одной цифре.",
};

function parseGrid(grid: string): Array<number | null> {
  return [...grid].map((char) => (char === "." ? null : Number(char)));
}

const rcName = (index: number) => `R${Math.floor(index / 9) + 1}C${(index % 9) + 1}`;

interface TaskViewProps {
  position: LessonPosition;
  showCandidates: boolean;
  onSolved: () => void;
  order: string;
}

/**
 * Одна задача урока.
 *
 * Приёмы-одиночки спрашивают цифру, приёмы-исключения — клетки самого приёма:
 * одно исключение почти никогда не открывает клетку сразу, и вопрос «куда
 * встанет цифра» был бы нечестным. Промахи здесь не считаются — тренажёр.
 */
function TaskView({ position, showCandidates, onSolved, order }: TaskViewProps) {
  const values = useMemo(() => parseGrid(position.grid), [position.grid]);
  const candidates = useMemo(() => cellCandidates(values), [values]);
  const isPlace = position.kind === "place";
  /*
   * Отвечают тем, о чём спрашивают.
   *
   * У голой одиночки клетка названа («подсвеченная») — ответ цифра, и нужна
   * панель. У скрытой одиночки цифра названа в самом вопросе — ответ клетка, и
   * заставлять после тапа по клетке нажимать ту же цифру было бы лишним шагом.
   */
  const mode: "digit" | "cell" | "pattern" = !isPlace
    ? "pattern"
    : position.scope.length === 0
      ? "digit"
      : "cell";
  const revealCell = mode === "digit";

  const [selected, setSelected] = useState<number | null>(revealCell ? position.cells[0] : null);
  const [marks, setMarks] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number[]>([]);
  const [note, setNote] = useState<string>("");
  const [hint, setHint] = useState(0);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    setSelected(revealCell ? position.cells[0] : null);
    setMarks([]);
    setWrong([]);
    setNote("");
    setHint(0);
    setSolved(false);
  }, [position, revealCell]);

  const answered = solved || hint >= 2;

  const handleCell = (index: number) => {
    if (answered) return;
    setWrong([]);
    if (mode === "pattern") {
      setMarks((current) =>
        current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
      );
      setNote("");
      triggerHaptic("light");
      return;
    }
    if (mode === "digit") {
      // Клетку задаёт сам вопрос («подсвеченная»). Если позволить её переставить,
      // подсветка и проверяемая клетка разойдутся, и ответ будет судиться не по той.
      if (index !== position.cells[0]) {
        setNote("Клетка для этой задачи уже подсвечена — осталось назвать цифру.");
        triggerHaptic("warning");
      }
      return;
    }
    if (values[index] !== null) {
      setNote("Эта клетка уже занята — ищите пустую.");
      triggerHaptic("warning");
      return;
    }
    // Цифра названа в вопросе: тап по клетке и есть ответ.
    const answer = position.answer!;
    setSelected(index);
    if (index === answer.index) {
      setSolved(true);
      setNote("");
      triggerHaptic("success");
      return;
    }
    triggerHaptic("warning");
    setWrong([index]);
    if (!candidates[index].includes(answer.digit)) {
      setNote(
        `Цифра ${answer.digit} сюда не встаёт: она уже видна из строки, колонки или блока этой клетки.`,
      );
      return;
    }
    setNote(
      `Цифра ${answer.digit} здесь возможна — но возможна и ещё где-то в этой области. Одиночка — это единственное место.`,
    );
  };

  const handleDigit = (digit: number) => {
    if (answered || mode !== "digit") return;
    if (selected === null) {
      setNote("Сначала выберите клетку.");
      return;
    }
    const answer = position.answer!;
    if (selected === answer.index && digit === answer.digit) {
      setSolved(true);
      setNote("");
      triggerHaptic("success");
      return;
    }
    triggerHaptic("warning");
    if (!candidates[selected].includes(digit)) {
      setNote(`Цифра ${digit} сюда не встаёт: она уже видна из строки, колонки или блока этой клетки.`);
      return;
    }
    if (selected !== answer.index) {
      setNote(
        `Цифра ${digit} здесь возможна — но она возможна и ещё где-то в этой области. Одиночка — это единственное место.`,
      );
      return;
    }
    setNote(`В этой клетке ${digit} возможна, но не только она. Посмотрите, что сюда ещё влезает.`);
  };

  const handleCheck = () => {
    if (answered) return;
    const expected = new Set(position.cells);
    const extra = marks.filter((index) => !expected.has(index));
    const missing = position.cells.filter((index) => !marks.includes(index));
    if (extra.length === 0 && missing.length === 0) {
      setSolved(true);
      setNote("");
      setWrong([]);
      triggerHaptic("success");
      return;
    }
    triggerHaptic("warning");
    setWrong(extra);
    const parts: string[] = [];
    if (extra.length > 0) parts.push(`лишних клеток: ${extra.length}`);
    if (missing.length > 0) parts.push(`не хватает: ${missing.length}`);
    setNote(`Пока не сходится — ${parts.join(", ")}.`);
  };

  const showAnswer = () => {
    setHint(2);
    setWrong([]);
    setMarks(isPlace ? [] : position.cells);
    if (isPlace) setSelected(position.answer!.index);
    triggerHaptic("medium");
  };

  const explanation = [position.pattern, position.cut, position.follow].filter(Boolean).join(" ");

  return (
    <div className="school-task">
      <div className="school-task-head">
        <span className="school-task-order">{order}</span>
        <p className="school-ask">{position.ask}</p>
      </div>

      <div className="sudoku-board-shell school-shell">
        <LessonBoard
          values={values}
          candidates={showCandidates ? candidates : null}
          scope={position.scope}
          focus={answered || revealCell ? position.cells : []}
          marks={mode === "pattern" ? marks : []}
          wrong={wrong}
          strikes={answered && mode === "pattern" ? position.strikes : []}
          placed={answered && isPlace ? position.answer : null}
          dim={!answered}
          selected={selected}
          onSelect={handleCell}
        />
      </div>

      {mode === "digit" ? (
        <div className="school-pad">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => (
            <button
              key={digit}
              className="sudoku-number school-number"
              onClick={() => handleDigit(digit)}
              disabled={answered}
            >
              <strong>{digit}</strong>
            </button>
          ))}
        </div>
      ) : mode === "pattern" ? (
        <div className="school-actions">
          <button className="sudoku-tool" onClick={() => setMarks([])} disabled={answered || marks.length === 0}>
            Сбросить
          </button>
          <button className="sudoku-tool accent" onClick={handleCheck} disabled={answered || marks.length === 0}>
            Проверить · {marks.length}
          </button>
        </div>
      ) : (
        <div className="school-hint-line">Ответ — клетка: нажмите на неё.</div>
      )}

      {note && <div className="school-note warn">{note}</div>}

      {hint === 1 && !solved && <div className="school-note">{TIPS[position.tech] ?? ""}</div>}

      {answered && (
        <div className="school-note good">
          {solved ? "Верно. " : "Ответ: "}
          {explanation}
        </div>
      )}

      <div className="school-controls">
        {!answered && (
          <button
            className="btn"
            onClick={() => {
              if (hint === 0) {
                setHint(1);
                triggerHaptic("light");
              } else {
                showAnswer();
              }
            }}
          >
            {hint === 0 ? "Подсказка" : "Показать ответ"}
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={() => {
            onSolved();
            triggerHaptic("medium");
          }}
          disabled={!answered}
        >
          Дальше
        </button>
      </div>
    </div>
  );
}

interface DemoViewProps {
  position: LessonPosition;
  showCandidates: boolean;
  onDone: () => void;
}

/** Разбор: тот же приём, но показанный по шагам — область, приём, вывод. */
function DemoView({ position, showCandidates, onDone }: DemoViewProps) {
  const values = useMemo(() => parseGrid(position.grid), [position.grid]);
  const candidates = useMemo(() => cellCandidates(values), [values]);
  const [step, setStep] = useState(0);

  useEffect(() => setStep(0), [position]);

  const isPlace = position.kind === "place";
  const captions = [
    position.ask,
    position.pattern,
    isPlace
      ? `Ставим ${position.answer!.digit} в ${rcName(position.answer!.index)}.`
      : [position.cut, position.follow].filter(Boolean).join(" "),
  ];

  return (
    <div className="school-task">
      <div className="school-task-head">
        <span className="school-task-order">Разбор · шаг {step + 1} из 3</span>
        <p className="school-ask">{captions[step]}</p>
      </div>

      <div className="sudoku-board-shell school-shell">
        <LessonBoard
          values={values}
          candidates={showCandidates ? candidates : null}
          scope={position.scope}
          focus={step >= 1 ? position.cells : []}
          strikes={step >= 2 && !isPlace ? position.strikes : []}
          placed={step >= 2 && isPlace ? position.answer : null}
          dim={step < 2}
        />
      </div>

      <div className="school-controls">
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            if (step < 2) setStep(step + 1);
            else onDone();
            triggerHaptic("light");
          }}
        >
          {step < 2 ? "Дальше" : "К задачам"}
        </button>
      </div>
    </div>
  );
}

interface RunnerProps {
  lesson: SudokuLesson;
  onExit: () => void;
  onFinished: () => void;
}

function LessonRunner({ lesson, onExit, onFinished }: RunnerProps) {
  const { skip } = useSudokuSchool();
  const [stage, setStage] = useState<"theory" | "demo" | "task" | "done">("theory");
  const [taskIndex, setTaskIndex] = useState(0);

  useEffect(() => {
    setStage("theory");
    setTaskIndex(0);
  }, [lesson.id]);

  const startPractice = () => {
    if (lesson.demo) setStage("demo");
    else setStage("task");
  };

  if (stage === "theory") {
    return (
      <div className="school-lesson">
        <div className="school-theory">
          <span className="sudoku-kicker">Урок {lesson.id} из {SUDOKU_LESSONS.length}</span>
          <h2>{lesson.title}</h2>
          <p className="school-goal">{lesson.goal}</p>
          {lesson.theory.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <div className="school-controls">
          <button
            className="btn"
            onClick={() => {
              skip(lesson.id);
              onExit();
              triggerHaptic("light");
            }}
          >
            Пропустить
          </button>
          <button className="btn btn-primary" onClick={startPractice}>
            {lesson.demo ? "К разбору" : "К задачам"}
          </button>
        </div>
      </div>
    );
  }

  if (stage === "demo" && lesson.demo) {
    return (
      <div className="school-lesson">
        <DemoView position={lesson.demo} showCandidates={lesson.candidates} onDone={() => setStage("task")} />
      </div>
    );
  }

  if (stage === "task") {
    const position = lesson.tasks[taskIndex];
    if (!position) {
      return (
        <div className="school-lesson">
          <div className="school-theory">
            <h2>Урок пуст</h2>
            <p>Задачи для этого урока не собрались — сообщите об этом, пожалуйста.</p>
          </div>
          <div className="school-controls">
            <button className="btn btn-primary btn-block" onClick={onExit}>
              К списку
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="school-lesson">
        <TaskView
          key={`${lesson.id}-${taskIndex}`}
          position={position}
          showCandidates={lesson.candidates}
          order={`Задача ${taskIndex + 1} из ${lesson.tasks.length}`}
          onSolved={() => {
            if (taskIndex + 1 < lesson.tasks.length) {
              setTaskIndex(taskIndex + 1);
              return;
            }
            onFinished();
            setStage("done");
          }}
        />
      </div>
    );
  }

  return (
    <div className="school-lesson">
      <div className="school-done">
        <div className="school-done-orb">✓</div>
        <span className="sudoku-kicker">Урок {lesson.id} пройден</span>
        <h2>{lesson.title}</h2>
        <p>{lesson.goal}</p>
      </div>
      <div className="school-controls">
        <button className="btn btn-primary btn-block" onClick={onExit}>
          К списку уроков
        </button>
      </div>
    </div>
  );
}

export function SudokuSchoolScreen() {
  const nav = useNavigate();
  const { completed, skipped, complete } = useSudokuSchool();
  const startNew = useSudokuStore((state) => state.startNew);
  const [activeId, setActiveId] = useState<number | null>(null);

  const active = activeId === null ? null : SUDOKU_LESSONS.find((item) => item.id === activeId) ?? null;
  const done = completed.length;
  const resume = nextLesson(completed);
  const graduated = done >= SUDOKU_LESSONS.length;

  if (active) {
    return (
      <div className="app-screen school-screen">
        <TopNav title={`Урок ${active.id}`} onBack={() => setActiveId(null)} />
        <LessonRunner
          lesson={active}
          onExit={() => setActiveId(null)}
          onFinished={() => {
            complete(active.id);
            celebrate();
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-screen school-screen">
      <TopNav title="Школа судоку" backTo="/sudoku" />

      <div className="school-head">
        <span className="sudoku-kicker">Тренажёр приёмов</span>
        <h2>Двадцать уроков</h2>
        <p>
          От «как читать доску» до Swordfish. Каждый урок — теория, разбор на доске и задачи, где приём надо
          найти самому. Ошибки здесь не считаются и время не идёт.
        </p>
        <div className="school-progress">
          <div className="school-progress-track">
            <div
              className="school-progress-fill"
              style={{ width: `${Math.round((done / SUDOKU_LESSONS.length) * 100)}%` }}
            />
          </div>
          <span>
            {done} из {SUDOKU_LESSONS.length}
          </span>
        </div>
        {!graduated && (
          <button className="btn btn-primary btn-block" onClick={() => setActiveId(resume)}>
            {done === 0 ? "Начать с первого урока" : `Продолжить — урок ${resume}`}
          </button>
        )}
        {graduated && (
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              startNew("abyss", 9);
              nav("/sudoku");
            }}
          >
            Школа окончена — сыграть «Бездну»
          </button>
        )}
      </div>

      <div className="school-list">
        {SUDOKU_LESSONS.map((lesson) => {
          const isDone = completed.includes(lesson.id);
          const isSkipped = skipped.includes(lesson.id);
          const open = isLessonOpen(lesson.id, completed, skipped);
          return (
            <button
              key={lesson.id}
              className={`school-card${isDone ? " done" : ""}${open ? "" : " locked"}`}
              onClick={() => {
                if (!open) {
                  triggerHaptic("warning");
                  return;
                }
                setActiveId(lesson.id);
                triggerHaptic("light");
              }}
            >
              <span className="school-card-num">{isDone ? "✓" : open ? lesson.id : "🔒"}</span>
              <span className="school-card-body">
                <strong>{lesson.title}</strong>
                <em>{lesson.tag}</em>
              </span>
              {isSkipped && <span className="school-card-skip">пропущен</span>}
            </button>
          );
        })}
      </div>

      <p className="school-footer">
        Powered by{" "}
        <a href="https://t.me/Denrech" target="_blank" rel="noopener noreferrer">
          @Denrech
        </a>
      </p>
    </div>
  );
}
