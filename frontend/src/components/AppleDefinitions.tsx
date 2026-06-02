import React from 'react';

export const AppleDefinitions = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
    <defs>
      <linearGradient id="whiteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: 'var(--piece-light-1)', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'var(--piece-light-2)', stopOpacity: 1 }} />
      </linearGradient>
      <linearGradient id="blackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: 'var(--palette-bg-tertiary)', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'var(--palette-bg-primary)', stopOpacity: 1 }} />
      </linearGradient>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: 'var(--piece-dark-1)', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'var(--piece-dark-2)', stopOpacity: 1 }} />
      </linearGradient>
      <filter id="pieceLift" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="rgba(0,0,0,0.38)" />
        <feDropShadow dx="0" dy="0" stdDeviation="2.4" floodColor="rgba(255,255,255,0.16)" />
      </filter>
      
      {/* Glow for Black Pieces - makes them pop on dark background */}
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
        <feFlood floodColor="white" floodOpacity="0.4" result="flood" />
        <feComposite in="flood" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Subtle Inner Glow for pieces */}
      <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  </svg>
);
