// Toolbar symbols (stroked, 20×20).
const s = (d) => `<svg viewBox="0 0 20 20">${d}</svg>`;
export const ICON = {
  sidebar: s('<rect x="2.5" y="3.5" width="15" height="13" rx="2"/><path d="M7.5 3.5v13"/>'),
  film: s('<rect x="2.5" y="4" width="15" height="12" rx="1.5"/><path d="M2.5 13h15M5 13v3M8.5 13v3M12 13v3M15.5 13v3"/>'),
  minus: s('<circle cx="8.5" cy="8.5" r="5.5"/><path d="M6 8.5h5M12.6 12.6l4.4 4.4"/>'),
  plus: s('<circle cx="8.5" cy="8.5" r="5.5"/><path d="M6 8.5h5M8.5 6v5M12.6 12.6l4.4 4.4"/>'),
  rotl: s('<path d="M4.5 9.5a6 6 0 1 1 1.8 4.6"/><path d="M4.2 5.2v4.6h4.6"/>'),
  rotr: s('<path d="M15.5 9.5a6 6 0 1 0-1.8 4.6"/><path d="M15.8 5.2v4.6h-4.6"/>'),
  crop: s('<path d="M5.5 2v12.5H18"/><path d="M2 5.5h12.5V18"/>'),
  resize: s('<rect x="2.5" y="7.5" width="10" height="10" rx="1"/><path d="M10.5 2.5h7v7M17.5 2.5l-6 6"/>'),
  play: s('<rect x="2.5" y="3.5" width="15" height="11" rx="1.5"/><path d="M8.5 6.5l4 2.5-4 2.5z"/><path d="M7 17.5h6"/>'),
  info: s('<circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 6.2v.3"/>'),
  prev: s('<path d="M12.5 4.5L7 10l5.5 5.5"/>'),
  next: s('<path d="M7.5 4.5L13 10l-5.5 5.5"/>'),
  pause: s('<path d="M7 4.5v11M13 4.5v11"/>'),
  playtri: s('<path d="M6.5 4.5l9 5.5-9 5.5z"/>'),
  close: s('<path d="M5 5l10 10M15 5L5 15"/>'),
  tselect: s('<path d="M7 3.5h6M7 16.5h6M10 3.5v13"/>'),
  thighlight: s('<path d="M12.5 3.5l4 4-7 7H5.5v-4z"/><path d="M3 17.5h14" stroke-width="2.4" opacity=".55"/>'),
  ttext: s('<path d="M4.5 5V3.5h11V5M10 3.5v13M7.5 16.5h5"/>'),
  tdraw: s('<path d="M3.5 15.5c2-4 4-6 5.5-5s-1 4 1 4.5 3-3 6.5-6.5"/>'),
  tsign: s('<path d="M3 14.5c1.6-5 3.6-8.5 5-8.5 1.8 0-1.4 8 .6 8 1.4 0 2.2-3 3.4-3s.6 2.6 2 2.6 1.6-1 2.5-1"/><path d="M3 17.5h14"/>'),
};
