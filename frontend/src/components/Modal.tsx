import React from "react";

interface Props {
  title: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  children?: React.ReactNode;
}

export function Modal({
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  children,
}: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        {children}
        <div className="modal-actions">
          {secondaryLabel && (
            <button className="btn" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          )}
          {primaryLabel && (
            <button className="btn btn-primary" onClick={onPrimary}>
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
