'use strict';
// Menus for apps that don't share their own menus with the menu bar (Firefox, new GNOME apps ...).
// Each item presses the app's keyboard shortcut, so it does exactly what the keys do.
// Distros and users can add apps in /etc/paladin-seeker/keymenus.json or ~/.config/paladin-seeker/keymenus.json:
//   { "match": ["firefox", "firefox_firefox"], "menus": [ { "label": "File", "items": [ ["New Tab", "ctrl+t"], "-", ... ] } ] }
const path = require('path');
const { HOME, readJSON } = require('./util');

const EDIT = { label: 'Edit', items: [['Undo', 'ctrl+z'], ['Redo', 'ctrl+shift+z'], '-', ['Cut', 'ctrl+x'], ['Copy', 'ctrl+c'], ['Paste', 'ctrl+v'], '-', ['Select All', 'ctrl+a']] };

const BUILT_IN = [
  {
    match: ['firefox', 'firefox_firefox', 'firefox-esr', 'org.mozilla.firefox', 'navigator'],
    menus: [
      { label: 'File', items: [['New Tab', 'ctrl+t'], ['New Window', 'ctrl+n'], ['New Private Window', 'ctrl+shift+p'], '-', ['Open File…', 'ctrl+o'],
        ['Save Page As…', 'ctrl+s'], '-', ['Print…', 'ctrl+p'], '-', ['Close Tab', 'ctrl+w'], ['Close Window', 'ctrl+shift+w']] },
      { label: 'Edit', items: [...EDIT.items, '-', ['Find in Page…', 'ctrl+f'], ['Find Again', 'ctrl+g']] },
      { label: 'View', items: [['Reload Page', 'ctrl+r'], ['Stop', 'Escape'], '-', ['Zoom In', 'ctrl+plus'], ['Zoom Out', 'ctrl+minus'], ['Actual Size', 'ctrl+0'], '-',
        ['Reader View', 'F9'], ['Full Screen', 'F11']] },
      { label: 'History', items: [['Back', 'alt+Left'], ['Forward', 'alt+Right'], ['Home', 'alt+Home'], '-', ['Show All History', 'ctrl+shift+h'],
        ['Clear Recent History…', 'ctrl+shift+Delete'], '-', ['Reopen Closed Tab', 'ctrl+shift+t'], ['Reopen Closed Window', 'ctrl+shift+n']] },
      { label: 'Bookmarks', items: [['Bookmark This Page…', 'ctrl+d'], ['Bookmark All Tabs…', 'ctrl+shift+d'], '-', ['Show Bookmarks Sidebar', 'ctrl+b'],
        ['Manage Bookmarks', 'ctrl+shift+o'], ['Show Bookmarks Toolbar', 'ctrl+shift+b']] },
      { label: 'Tools', items: [['Downloads', 'ctrl+shift+y'], ['Add-ons and Themes', 'ctrl+shift+a'], '-', ['Web Developer Tools', 'ctrl+shift+i']] },
    ],
  },
  {
    match: ['google-chrome', 'chromium', 'chromium-browser', 'chromium_chromium', 'brave-browser', 'microsoft-edge'],
    menus: [
      { label: 'File', items: [['New Tab', 'ctrl+t'], ['New Window', 'ctrl+n'], ['New Incognito Window', 'ctrl+shift+n'], '-', ['Open File…', 'ctrl+o'],
        ['Save Page As…', 'ctrl+s'], '-', ['Print…', 'ctrl+p'], '-', ['Close Tab', 'ctrl+w'], ['Close Window', 'ctrl+shift+w']] },
      { label: 'Edit', items: [...EDIT.items, '-', ['Find…', 'ctrl+f']] },
      { label: 'View', items: [['Reload Page', 'ctrl+r'], '-', ['Zoom In', 'ctrl+plus'], ['Zoom Out', 'ctrl+minus'], ['Actual Size', 'ctrl+0'], '-', ['Full Screen', 'F11']] },
      { label: 'History', items: [['Back', 'alt+Left'], ['Forward', 'alt+Right'], '-', ['Show Full History', 'ctrl+h'], ['Reopen Closed Tab', 'ctrl+shift+t']] },
      { label: 'Bookmarks', items: [['Bookmark This Tab…', 'ctrl+d'], ['Bookmark Manager', 'ctrl+shift+o'], ['Show Bookmarks Bar', 'ctrl+shift+b']] },
      { label: 'Tools', items: [['Downloads', 'ctrl+j'], ['Developer Tools', 'ctrl+shift+i']] },
    ],
  },
];
// Any other app without menus of its own still gets a working Edit menu.
const FALLBACK = { menus: [EDIT] };

function load() {
  const extra = [...(readJSON('/etc/paladin-seeker/keymenus.json', []) || []), ...(readJSON(path.join(HOME, '.config/paladin-seeker/keymenus.json'), []) || [])];
  return [...(Array.isArray(extra) ? extra : []), ...BUILT_IN];
}

/** The key menus for a window: matched by desktop file id, WM class or app name. */
function forApp(appInfo, cls) {
  const keys = [appInfo && appInfo.id, appInfo && appInfo.name, ...(String(cls || '').split(/[.\s]/))]
    .filter(Boolean).map((s) => String(s).toLowerCase().replace(/\.desktop$/, ''));
  for (const spec of load()) {
    if ((spec.match || []).some((m) => keys.includes(String(m).toLowerCase()))) return spec;
  }
  return FALLBACK;
}

module.exports = { forApp };
