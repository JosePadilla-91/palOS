# palOS 27 Clownfish — build 31

Build 30 plus the fixes below. Everything in build 30's changelog still applies.

## Smoothness

**Dock**
- Icons are smooth at every size, including while they magnify.
- They were 256-pixel images shrunk to about 55 pixels in one step, which leaves stair-stepped edges.
- Each icon now keeps pre-shrunk copies at 128, 64 and 32 pixels, each made by halving the one before. The Dock draws from the nearest copy, so no single step shrinks an icon more than 2×.
- Window thumbnails and the drag image get the same treatment.

**Menu bar**
- **Screens indicator:** the box was always black, so on a dark menu bar it showed as a solid black square. It now follows the menu bar's text colour like the other icons.
- **Widgets icon:** two of its four tiles stayed black on a dark menu bar. Fixed the same way.
- **Older-style tray icons:**
  - an icon that hasn't really been drawn yet (one colour everywhere) is no longer shown as a black square; palOS waits for the real picture;
  - icons drawn without transparency lose their grey backdrop with a little tolerance, so no light fringe is left around their edges.

**Checked and already smooth**
- text everywhere (smoothing on, light hinting)
- Seeker's icons, the desktop's icons and the menu bar's text
- the pointer (24, 32, 48 and 64-pixel sizes, so it stays sharp at any display scale)

## Cover Flow
- **Size:** covers fill the panel. They used to stop at 300 pixels, in a panel taking 48% of the window. Now:
  - they grow as tall as the panel allows, up to about half its width;
  - they follow the panel live as you drag the divider or resize the window;
  - the panel starts at 58% of the window.
- **Sharpness:**
  - the front cover sits flat at exactly 1:1; it used to be pushed toward you in 3D, which enlarged an already-drawn picture by about 10% and blurred it;
  - PDF and document pages are drawn at exactly the screen pixels they fill, and redrawn when the cover changes size, so 11-point text is crisp;
  - pictures and thumbnails load at the right resolution for the cover's size (now up to 1,024 pixels; thumbnails used to stop at 512).
- **3D depth** grows with the covers, so big side covers keep their shape instead of swinging out toward you.

## Setup's welcome film: sound
- If playing with sound is refused for any reason, the film starts muted and turns its sound on as soon as it's playing. Before, that fallback left the whole film silent.
- A sound output that turns up or changes while the film plays (sound cards found late, headphones plugged in) now carries the film's sound. That applies to the backup video player too.
- The film's log (`/var/lib/palos-setup/.cache/palos-setup.log`) now records which sound outputs it found, whether the sound was on, and the volume.

## Tested in a test copy of this build
- **Dock:** zoomed before-and-after captures show smooth edges: the Firefox circle, the lettering on the Presentation board, the guitar and the microphone.
- **Cover Flow:**
  - a two-page PDF of 11-point text is crisp at actual size, and readable once the panel is dragged larger;
  - it's redrawn sharp at the new size;
  - side covers keep their shape;
  - a photo in front is sharp.
- **Menu bar:** Screens and Widgets are correct on light and dark.
- **Tray:** a test tray icon shows correctly.
- **Setup film:** starts, logs its sound state and plays with sound on (this workspace has no sound card, so it can't be heard here).

## Not done in this build
- **The window manager's shrunken windows** (the all-windows view, Magic Lamp) still use plain linear filtering without mipmaps, so windows drawn small can shimmer. Fixing that needs paladin-wm's source code, which isn't in the image.
- **Setup film sound on your PC:** if it's still silent, the log above will say why.

## Your package repo
These packages own files that changed:
- `paladin-seeker`: `ui/browser.js`, `ui/live.js`, `ui/common.js`, `ui/browser.css`, `ui/paladin.css`, `main/thumbs.js`
- `paladin-session`: `xembed-tray`
- `palos-firstboot`: `app/ui/setup.js`, `app/ui/filmsw.js`

The current Dock (`/usr/lib/paladin-dock/app/`) isn't in any package: the `paladin-dock` package only lists the older Python Dock files beside it. The new `dock.js` only arrives through this ISO until you add `app/` to `paladin-dock`.
