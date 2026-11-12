const { Menu } = require('electron');
const path = require('path');

/**
 * Application menu. Shortcuts are shown here but handled in the renderer
 * (registerAccelerator: false) so they behave correctly inside the grid and in text fields.
 */
function buildMenu({ recent, send, newWindow, openPath, clearRecent, toggleDevTools, about }) {
  const item = (label, cmd, accelerator, extra = {}) =>
    Object.assign({ label, accelerator, registerAccelerator: false, click: () => send(cmd) }, extra);
  const sep = { type: 'separator' };

  const template = [
    {
      label: '&File',
      submenu: [
        { label: 'New Window', accelerator: 'CmdOrCtrl+N', click: newWindow },
        item('Open…', 'open', 'CmdOrCtrl+O'),
        {
          label: 'Open Recent',
          submenu: recent.length
            ? [...recent.map((p) => ({ label: path.basename(p), sublabel: p, click: () => openPath(p) })), sep, { label: 'Clear Recent', click: clearRecent }]
            : [{ label: 'No recent files', enabled: false }],
        },
        sep,
        item('Save', 'save', 'CmdOrCtrl+S'),
        item('Save As…', 'save-as', 'CmdOrCtrl+Shift+S'),
        {
          label: 'Export',
          submenu: [
            item('Excel Workbook (.xlsx)…', 'export', null, { click: () => send('export', 'xlsx') }),
            item('OpenDocument (.ods)…', 'export', null, { click: () => send('export', 'ods') }),
            item('CSV, current sheet (.csv)…', 'export', null, { click: () => send('export', 'csv') }),
            item('TSV, current sheet (.tsv)…', 'export', null, { click: () => send('export', 'tsv') }),
            item('PDF, current sheet…', 'export-pdf'),
          ],
        },
        sep,
        item('Print…', 'print', 'CmdOrCtrl+P'),
        sep,
        { label: 'Close Window', accelerator: 'CmdOrCtrl+W', role: 'close' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: '&Edit',
      submenu: [
        item('Undo', 'undo', 'CmdOrCtrl+Z'),
        item('Redo', 'redo', 'CmdOrCtrl+Y'),
        sep,
        item('Cut', 'cut', 'CmdOrCtrl+X'),
        item('Copy', 'copy', 'CmdOrCtrl+C'),
        item('Paste', 'paste', 'CmdOrCtrl+V'),
        item('Paste Values Only', 'paste-values', 'CmdOrCtrl+Shift+V'),
        sep,
        item('Fill Down', 'fill-down', 'CmdOrCtrl+D'),
        item('Fill Right', 'fill-right', 'CmdOrCtrl+R'),
        sep,
        item('Clear Contents', 'clear-contents', 'Delete'),
        item('Clear Formatting', 'clear-formats', 'CmdOrCtrl+\\'),
        item('Clear All', 'clear-all'),
        sep,
        item('Find…', 'find', 'CmdOrCtrl+F'),
        item('Find and Replace…', 'replace', 'CmdOrCtrl+H'),
        item('Go To…', 'goto', 'CmdOrCtrl+G'),
        sep,
        item('Select All', 'select-all', 'CmdOrCtrl+A'),
      ],
    },
    {
      label: '&View',
      submenu: [
        item('Zoom In', 'zoom-in', 'CmdOrCtrl+='),
        item('Zoom Out', 'zoom-out', 'CmdOrCtrl+-'),
        item('Actual Size', 'zoom-reset', 'CmdOrCtrl+0'),
        sep,
        item('Freeze Panes at Selection', 'freeze'),
        item('Freeze Top Row', 'freeze-row'),
        item('Freeze First Column', 'freeze-col'),
        item('Unfreeze Panes', 'unfreeze'),
        sep,
        item('Show/Hide Gridlines', 'toggle-grid'),
        item('Show/Hide Formulas', 'toggle-formulas', 'CmdOrCtrl+`'),
        sep,
        { label: 'Toggle Full Screen', role: 'togglefullscreen' },
        { label: 'Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', click: toggleDevTools },
      ],
    },
    {
      label: '&Insert',
      submenu: [
        item('Row Above', 'insert-row-above'),
        item('Row Below', 'insert-row-below'),
        item('Column Left', 'insert-col-left'),
        item('Column Right', 'insert-col-right'),
        sep,
        item('New Sheet', 'add-sheet', 'Shift+F11'),
        item('Chart…', 'insert-chart'),
        item('Function…', 'insert-function', 'Shift+F3'),
        sep,
        item('Current Date', 'insert-date', 'CmdOrCtrl+;'),
        item('Current Time', 'insert-time', 'CmdOrCtrl+Shift+;'),
      ],
    },
    {
      label: 'F&ormat',
      submenu: [
        item('Bold', 'bold', 'CmdOrCtrl+B'),
        item('Italic', 'italic', 'CmdOrCtrl+I'),
        item('Underline', 'underline', 'CmdOrCtrl+U'),
        item('Strikethrough', 'strike', 'CmdOrCtrl+5'),
        sep,
        {
          label: 'Number',
          submenu: [
            item('General', 'nf', null, { click: () => send('nf', 'General') }),
            item('Number (1,234.56)', 'nf', 'CmdOrCtrl+Shift+1', { click: () => send('nf', '#,##0.00') }),
            item('Currency ($1,234.56)', 'nf', 'CmdOrCtrl+Shift+4', { click: () => send('nf', '"$"#,##0.00') }),
            item('Percent (12.34%)', 'nf', 'CmdOrCtrl+Shift+5', { click: () => send('nf', '0.00%') }),
            item('Scientific (1.23E+03)', 'nf', null, { click: () => send('nf', '0.00E+00') }),
            item('Date (2026-10-09)', 'nf', 'CmdOrCtrl+Shift+3', { click: () => send('nf', 'yyyy-mm-dd') }),
            item('Time (13:45:00)', 'nf', 'CmdOrCtrl+Shift+2', { click: () => send('nf', 'hh:mm:ss') }),
            item('Date and Time', 'nf', null, { click: () => send('nf', 'yyyy-mm-dd hh:mm') }),
            item('Text', 'nf', null, { click: () => send('nf', '@') }),
            sep,
            item('Custom…', 'nf-custom'),
          ],
        },
        item('Format Cells…', 'format-cells', 'CmdOrCtrl+1'),
        sep,
        item('Merge Cells', 'merge'),
        item('Unmerge Cells', 'unmerge'),
        item('Wrap Text', 'wrap'),
        sep,
        item('Column Width…', 'col-width'),
        item('Row Height…', 'row-height'),
        item('Auto-fit Column Width', 'autofit-cols'),
        sep,
        item('Hide Rows', 'hide-rows'),
        item('Hide Columns', 'hide-cols'),
        item('Unhide Rows in Selection', 'unhide-rows'),
        item('Unhide Columns in Selection', 'unhide-cols'),
      ],
    },
    {
      label: '&Data',
      submenu: [
        item('Sort A → Z', 'sort-asc'),
        item('Sort Z → A', 'sort-desc'),
        item('Sort Range…', 'sort-dialog'),
        sep,
        item('Toggle Filter', 'toggle-filter', 'CmdOrCtrl+Shift+L'),
        item('Clear Filter', 'clear-filter'),
        sep,
        item('Remove Duplicates…', 'dedupe'),
        item('Split Text to Columns…', 'text-to-columns'),
        sep,
        item('Recalculate', 'recalc', 'F9'),
      ],
    },
    {
      label: '&Sheet',
      submenu: [
        item('New Sheet', 'add-sheet'),
        item('Duplicate Sheet', 'dup-sheet'),
        item('Rename Sheet…', 'rename-sheet'),
        item('Delete Sheet', 'delete-sheet'),
        sep,
        item('Move Sheet Left', 'sheet-left'),
        item('Move Sheet Right', 'sheet-right'),
        sep,
        item('Delete Rows', 'delete-rows'),
        item('Delete Columns', 'delete-cols'),
      ],
    },
    {
      label: '&Help',
      submenu: [
        item('Keyboard Shortcuts', 'shortcuts', 'F1'),
        item('Function List', 'insert-function'),
        { label: 'About Chancery Sheets', click: about },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

module.exports = { buildMenu };
