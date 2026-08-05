import React, { useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { BorderBeam } from "border-beam";
import { TopNav } from "../components/TopNav";
import { CHANGELOG, markWhatsNewSeen } from "../data/changelog";
import { useThemeStore } from "../store/theme";

export function WhatsNewScreen() {
  const reduceMotion = useReducedMotion();
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    markWhatsNewSeen();
  }, []);

  return (
    <div className="app-screen">
      <TopNav title="Что нового" backTo="/" />
      <div className="whats-new">
        {CHANGELOG.map((entry, idx) => {
          const content = (
            <section className="menu-group whats-new-entry">
            <div className="whats-new-head">
              <span className="whats-new-version">
                v{entry.version}
                {idx === 0 && <span className="whats-new-tag">сейчас</span>}
              </span>
              <span className="whats-new-date">{entry.date}</span>
            </div>
            <h3 className="whats-new-title">{entry.title}</h3>
            <ul className="whats-new-list">
              {entry.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            </section>
          );

          return idx === 0 ? (
            <BorderBeam
              key={entry.version}
              size="pulse-inner"
              colorVariant="sunset"
              theme={theme}
              strength={0.5}
              duration={3.2}
              active={!reduceMotion}
              style={{ width: "100%" }}
            >
              {content}
            </BorderBeam>
          ) : (
            <React.Fragment key={entry.version}>{content}</React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
