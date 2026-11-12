'use strict';
/* Inline SVG icon set (original artwork). */
(() => {
  const s = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true">${body}</svg>`;
  C.ICONS = {
    play: s('<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.4-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor"/>'),
    pause: s('<rect x="6" y="4" width="4.2" height="16" rx="1.2" fill="currentColor"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.2" fill="currentColor"/>'),
    back10: s('<path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><text x="12" y="16.3" font-size="7" text-anchor="middle" fill="currentColor" font-family="sans-serif" font-weight="700">10</text>'),
    fwd10: s('<path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><text x="12" y="16.3" font-size="7" text-anchor="middle" fill="currentColor" font-family="sans-serif" font-weight="700">10</text>'),
    vol: s('<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4M18.2 6.2a8.2 8.2 0 0 1 0 11.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
    volLow: s('<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
    mute: s('<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
    tracks: s('<rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6.5 13.5h5M13.5 13.5h4M6.5 16h3M11.5 16h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
    scenes: s('<rect x="3" y="4" width="7.5" height="6.5" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13.5" y="4" width="7.5" height="6.5" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="13.5" width="7.5" height="6.5" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13.5" y="13.5" width="7.5" height="6.5" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.6"/>'),
    playlist: s('<path d="M4 6h11M4 11h11M4 16h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15 14v6l5-3z" fill="currentColor"/>'),
    trim: s('<path d="M5 3v14h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 7h14v14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
    camera: s('<path d="M4 8.2h3l1.6-2.4h6.8L17 8.2h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.2a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13.2" r="3.4" fill="none" stroke="currentColor" stroke-width="1.7"/>'),
    full: s('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
    unfull: s('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
    close: s('<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
    min: s('<path d="M6 12h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
    max: s('<rect x="6" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/>'),
    restore: s('<rect x="5" y="8.5" width="10.5" height="10.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 5.5h8a2 2 0 0 1 2 2v8" fill="none" stroke="currentColor" stroke-width="1.7"/>'),
    lobby: s('<path d="M3 20V8.5L12 4l9 4.5V20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6 20v-8c2 1 4 1 6 0 2 1 4 1 6 0v8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
    check: s('<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    plus: s('<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
    reel: (() => {
      const circ = (cx, cy, r) => `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
      let d = circ(32, 32, 30) + circ(32, 32, 3.2);
      for (let a = 0; a < 360; a += 60) {
        const r = ((a + 30) * Math.PI) / 180;
        d += circ(32 + Math.cos(r) * 17, 32 + Math.sin(r) * 17, 8);
      }
      return s(`<path fill="currentColor" fill-rule="evenodd" d="${d}"/><circle cx="32" cy="32" r="27.5" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>`, '0 0 64 64');
    })(),
  };
  C.icon = (name) => C.ICONS[name] || '';
})();
