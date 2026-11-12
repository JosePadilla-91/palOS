/* Renderer entry point. */
(async function () {
  const app = new self.App();
  self.sheetsApp = app; // handy for debugging in DevTools
  try {
    const initial = await self.sheetsAPI.initialDoc();
    if (initial) app.loadDoc(initial.doc, initial.filePath, initial.warnings);
  } catch (e) {
    self.UI.toast('Could not open the file: ' + e.message, 'error', 6000);
  }
  app.grid.resize();
  app.focusGrid();
})();
