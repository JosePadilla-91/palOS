# paladin-wm: what it does

palOS's window manager and compositor. Rewritten here from scratch as palOS source (the first version's source
was lost; only its program survived). This is the behaviour the new one must match, gathered from that program,
from the rest of palOS that talks to it, and from the notes kept while the first one was built.

## Foundation

- X11 window manager and compositing manager in one program, written in C.
- Draws with OpenGL: window contents via `GLX_EXT_texture_from_pixmap`, V-sync via `GLX_EXT_swap_control` /
  `GLX_MESA_swap_control`. Title bars and buttons drawn with Cairo and Pango (font: Noto Sans).
- X extensions: Composite (redirect subwindows, overlay window), Damage, XFixes (regions, shape of the overlay),
  Shape, Xcursor.
- Without texture-from-pixmap it keeps managing windows with no effects ("paladin-wm: no
  GLX_EXT_texture_from_pixmap, running without effects"). `PALADIN_WM_NO_COMPOSITE=1` forces that.
  `PALADIN_WM_DEBUG=1` logs. Refuses to start if another window manager runs.
- Announces itself: `_NET_SUPPORTING_WM_CHECK` window named `paladin-wm` (version `paladin-wm 1.0`), and owns
  `_NET_WM_CM_S<screen>` so apps know see-through windows work.

## Standards (EWMH / ICCCM)

Supports and keeps up to date: `_NET_SUPPORTED`, `_NET_CLIENT_LIST`, `_NET_CLIENT_LIST_STACKING`,
`_NET_ACTIVE_WINDOW`, `_NET_NUMBER_OF_DESKTOPS` (1), `_NET_CURRENT_DESKTOP`, `_NET_DESKTOP_GEOMETRY`,
`_NET_DESKTOP_VIEWPORT`, `_NET_WORKAREA`, `_NET_WM_DESKTOP`, `_NET_FRAME_EXTENTS`, `_NET_REQUEST_FRAME_EXTENTS`,
`_NET_CLOSE_WINDOW`, `_NET_WM_MOVERESIZE`, `_NET_MOVERESIZE_WINDOW`, `_NET_WM_STATE` (HIDDEN, FULLSCREEN,
MAXIMIZED_VERT/HORZ, ABOVE, BELOW, SKIP_TASKBAR, SKIP_PAGER, MODAL, STICKY, FOCUSED), `_NET_WM_WINDOW_TYPE`
(DESKTOP, DOCK, TOOLBAR, MENU, UTILITY, SPLASH, DIALOG, TOOLTIP, COMBO, DND, NORMAL), `_NET_WM_STRUT`,
`_NET_WM_STRUT_PARTIAL`, `_NET_WM_ICON_GEOMETRY`, `_NET_WM_PID`, `_NET_WM_ALLOWED_ACTIONS`, `_NET_WM_NAME`
(UTF-8), `WM_PROTOCOLS` (`WM_DELETE_WINDOW`, `WM_TAKE_FOCUS`), `WM_CHANGE_STATE`, `WM_HINTS`, `WM_NORMAL_HINTS`,
`WM_TRANSIENT_FOR`. Clients are in the save-set (they survive a restart of the window manager).

## Screens (viewports)

- The desktop is a grid of screens, `hsize` × `vsize`, read at start from palOS's setting `org.palos.screens`
  (`gsettings get org.palos.screens hsize|vsize`; default 2 × 1). `_NET_DESKTOP_GEOMETRY` = grid × screen size.
- Switching screens: `_NET_DESKTOP_VIEWPORT` client messages (Seeker's menu bar and `xdotool set_desktop_viewport`).
  Sticky windows, the desktop, docks and the menu bar stay put.
- New: follow changes to `org.palos.screens` while running (the first version only read it at start).

## Windows

- Frames: steel title bar 22 px, top corners rounded (radius 8), a bevel round ordinary windows' content (light edge
  left, soft dark edge right and below), soft shadows (stronger for the focused window).
- Title bar art from palOS's interface kit: `titlebar-active.png`, `titlebar-inactive.png` and `-dark` versions
  for Dark Mode; buttons `close`, `minimize`, `maximize` (ruby, amber, jade) in states `normal`, `prelight`,
  `pressed`, `inactive` (`<button>-<state>[-dark].png`). Buttons on the left. Title centred.
- Kit location: `/usr/lib/paladium/assets` (to move under a palOS path with the rest of the kit).
- Cursors at the edges and corners for resizing (`top_left_corner`, `top_side`, … `left_side`), `fleur` to move.
- Title bars are kept below the menu bar: a window never goes above the work area's top; ordinary windows are
  kept no larger than the work area.
- Snapping: dragging a window to a screen edge snaps it to that half; to a corner, that quarter; to the top,
  maximised.
- Double-clicking the title bar maximises / restores.

## Sheets

- A dialog that belongs to a window (`WM_TRANSIENT_FOR`, type DIALOG or modal) hangs under that window's title
  bar, centred, sliding down out of it, and moves with it. Sheets get no frame, no bevel.
- A dialog that doesn't say which window it belongs to stays a separate framed window.

## Minimising (Magic Lamp)

- Effect chosen in the Dock's settings: `minimize_effect` in `~/.config/paladin-dock/config.json` (falls back to
  `/etc/paladin-dock/config.json`): `"genie"` (Magic Lamp) or `"scale"`.
- The window pours into its Dock icon: target from `_NET_WM_ICON_GEOMETRY`, set by the Dock. Restoring plays
  it backwards.

## Compositing

- Redraws only what changed (Damage), at the screen's refresh rate.
- See-through windows (32-bit visuals) blended correctly; menus and tooltips get small shadows, the Dock and
  menu bar none.
- Full-screen windows are drawn without effects.

## Talks to

- Seeker: menu bar (screens grid, active window), desktop (type DESKTOP).
- Dock: icon geometry for Magic Lamp, its `config.json`.
- paladin-session: starts it, restarts it if it stops, waits for it (`paladin-session-helper wait-wm`).
- Settings: Dark Mode (title bar art switches between light and dark).

## Build

C, Makefile, depends on libX11, libXext, libXcomposite, libXdamage, libXfixes, libXcursor, libGL, cairo,
pango. Output `/usr/bin/paladin-wm`.
