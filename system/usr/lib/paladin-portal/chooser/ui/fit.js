'use strict';
// Tell the window how big the sheet is (it grows when "Show all folders" opens the full browser).
(() => {
  const sheetEl = document.getElementById('sheet');
  let last = '';
  const report = () => {
    if (!sheetEl.firstChild) return;                 // not built yet
    const w = sheetEl.offsetWidth, h = sheetEl.offsetHeight, k = w + 'x' + h;
    if (k !== last && w && h) { last = k; window.paladinSheetFit.size(w, h); }
  };
  new ResizeObserver(report).observe(sheetEl);
  new MutationObserver(report).observe(sheetEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
})();
