import React, { useEffect } from "react";
import { TopNav } from "../components/TopNav";
import { CHANGELOG, markWhatsNewSeen } from "../data/changelog";

export function WhatsNewScreen() {
  useEffect(() => {
    markWhatsNewSeen();
  }, []);

  return (
    <div className="app-screen">
      <TopNav title="Что нового" backTo="/" />
      <div className="whats-new">
        {CHANGELOG.map((entry, idx) => (
          <section key={entry.version} className="menu-group whats-new-entry">
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
        ))}
      </div>
    </div>
  );
}
