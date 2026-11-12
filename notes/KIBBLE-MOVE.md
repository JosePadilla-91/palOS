# palOS → 100% Kibble: progress (build 34 work, no ISO until the end)

User decisions: start with first-boot setup; delete each Electron backup as its piece passes; ONE ISO at the end;
installer graphics = NVIDIA open driver on + 2-second systemd-boot menu with "palOS (safe graphics)".

## Done
- **Kibble media engine** (palOS's WebKit has NO media: no video/audio/WebCodecs/getUserMedia)
  - `/usr/lib/kibble/media/kibble-media` (Python + GStreamer playbin): sound → pulsesink (PipeWire) named after the app;
    video → jpegenc → appsink → private HTTP 127.0.0.1:<port>/n/<token>/<pid>/<viewer>/<seq>.jpg (next-frame long poll),
    /f/... still frame. Stalled sound output → after 5 s rebuilds pipeline silently from same position (no freeze).
    Camera op (v4l2src/pipewiresrc). Test overrides: KIBBLE_MEDIA_AUDIO_SINK, KIBBLE_MEDIA_CAMERA_SRC.
  - `/usr/lib/kibble/runtime/media.js`: starts engine per app, routes page ⇄ engine, relay for app schemes
    (discette://, seeker://) with Range support; cleans up on window close.
  - `/usr/lib/kibble/runtime/media-page.js` (appended to bridge): <video>/<audio>/new Audio()/HTMLMediaElement API,
    events, double-buffered <img> pictures inside <video>, drawImage/createImageBitmap, getUserMedia (video).
  - `electron.js`: BRIDGE += media-page; 'kibble:media' channel; closeOwner on window finish; fullscreen/kiosk at creation.
  - Pages need CSP img-src `http://127.0.0.1:*` for VIDEO pictures (audio needs nothing).
- **Stage 1: first-boot setup on Kibble** — run-setup uses /usr/lib/kibble/kibble (PALOS_SCALE, LIBGL_ALWAYS_SOFTWARE in
  safe mode); main.js sound:ready/sound:outputs via pactl; setup.js uses them; index.html CSP; filmLog no duplicate;
  session waits ≤10 s for a real sink; PipeWire sockets enabled in /etc/systemd/user/sockets.target.wants;
  finish-switch copies setup log to /var/log/palos-setup.log; arm checks Kibble.
  Removed: /opt/palos-firstboot/runtime, link-runtime, seeker runtime hook palos-firstboot, apparmor palos-firstboot,
  postinst link-runtime line. Originals in orig-b33/firstboot/.
- **Discette on Kibble only**: own Electron removed (122 MB → 33 MB), CSP img-src += 127.0.0.1, AppRun Kibble-only,
  palos-app.json kind kibble. Plays FLAC in test. Bundle: bundles/Discette2. Original: orig-b33/Discette.app.b33.
- Earlier this build (before the Kibble move): Install Assistant removed (palos-open-app), xdg-open Paladin→gio,
  pack window one-language guide, l10n fixes, carousel apps icon-only, 3D model stills (thumbs.js uses an OFF-SCREEN
  ELECTRON BrowserWindow — must be redone for Kibble in Stage 5), Freebuff.pack, paladin-appd adopt, Winetricks.app,
  Classic removed, .deb as folder.

- **Stage 2 Time Turner engine on Kibble's Node 22** (was Electron-as-Node 24): time-turnerd execs
  /usr/lib/kibble/node/bin/node. Test harness ov/m/tmp/tttest.py (TT_ROOT test mode, path destination): 18/18 on
  Electron, 18/18 on Kibble, via launcher too; cross-adopt both directions pass (old backups usable). Original
  time-turnerd in orig-b33/.
- **Stage 3 on Kibble**: pack window (palos-pack open → kibble; PNG pixel check replaces nativeImage crop;
  pointer-based drag with draggable=false; tested old Chrome pack + drag + Install Just for Me), paladin-portal
  (chooser waits for 'native-window-handle' event added to Kibble; tested OpenFile returns uri), palOS Utilities,
  installer (both launchers → kibble with PALOS_APP_DIR). Removed /opt/palos-installer/runtime,
  /opt/palos-utilities/runtime, their link-runtime, seeker hooks, apparmor profiles (copies in orig-b33/stage3).
- Kibble electron.js also: emits 'native-window-handle' on xid; NativeImage crop/resize/toBitmap are still no-ops.

## Known
- Kibble window layer occasionally shows a seam during fast video (screen copied in strips); source of
  wpe-paladin/kibble-host was lost (built in an earlier workspace), so not fixable without rewriting it.
- Ogg seeking over an app scheme relay is approximate (FLAC/MP3/MKV exact).
- Test desktop: WirePlumber can't run (container), so sound streams never link → engine goes silent after 5 s.

## Next
- Stage 2 Time Turner engine (time-turnerd: electron-44 used as Node) → Kibble's node; full backup/restore tests.
- Stage 3 pack window, paladin-portal, palOS Utilities, installer.
- Stage 4 Composer, Cutting Floor, Site Knitter, Snap Booth, Vid-View; BrushBoard + Bundler drop own Electron;
  28 apps drop electron-44 fallback in AppRun.
- Stage 5 Seeker (+ thumbs model stills without Electron).
- Stage 6 delete /usr/lib/paladin-runtime/electron-44, -45, /opt/*/runtime; UKI cmdline without nouveau.modeset=0 +
  systemd-boot menu; CHANGELOG-build34; ISO on the all clear.

## Scrub (user request: no Ubuntu/Debian/GTK/GNOME/KDE) — phase 1 done
- Purged (dpkg): pluma*, gtksourceview-4, mate-desktop-common, seahorse, compiz* + python3-compizconfig + libcompizconfig0,
  metacity-common + libmetacity3, lightdm-gtk-greeter, system-config-printer*, language-pack-gnome-fr*, unattended-upgrades.
  Dropped stale deps in dpkg status: paladin-session (compiz…, libmetacity3; Recommends gnome-themes-extra, yaru-theme-icon),
  palos-desktop (pluma), paladin-login (lightdm-gtk-greeter). Backup: orig-b33/dpkg-status.pre-scrub.
- Deleted: welcome.webm (setup FILM = welcome.mkv only), /usr/share/{apps(konqueror),kde4,upstart,lintian,bug,doc-base,
  apport,debhelper,gtk-calculator,GConf,gnome-shell,gnome-control-center,unity-control-center,mate-about,libmate-desktop,
  help-langpack,emacs}, python3*.desktop, geoclue demo agent entry+autostart, 60-lightdm-gtk-greeter.conf, ubuntu/debian
  logos, gnome/mate-session.target.wants, unity/gnome-settings-daemon gtk-modules. /usr/share/doc → copyright files only.
  /etc/dpkg/dpkg.cfg.d/palos-clean keeps them from coming back.
- paladin-session: Compiz fallback removed (paladin-wm, then Openbox as emergency). paladin-session-helper: setup_compiz,
  sheet_animations, window_snapping, decorator_running, 'compiz' cmd removed (LIGHT/DARK/GTK4 constants restored).
- Screens: paladin-wm read Compiz's gsettings (org.compiz.core hsize/vsize) → binary-patched string to
  `gsettings get org.palos.screens %s` (orig in orig-b33/paladin-wm.pre-scrub); new schema org.palos.screens;
  Seeker screens.js uses it. Applies when paladin-wm starts (restart live loses Dock transparency → not done).
- Kept (load-bearing, need decisions): Ubuntu archive as software source (apt sources, keyring, swcatalog, apt lists 227 MB,
  ubuntu-drivers-common for NVIDIA, distro-info-data via palos-branding/python3-apt); GTK3 (paladin-greeter login screen,
  Basic Setup, polkit-gnome password prompt, Firefox, GTK portal, pinentry, gcr prompter, appmenu + save-sheet modules);
  GTK4/libadwaita (palos-open-app dialog, libgoa); gnome-keyring (Passkeys.app, Secret portal); org.gnome.desktop.* gsettings
  keys (dark mode, fonts…); dpkg/apt/debianutils/debconf (package system); GNUstep (unar); Openbox (emergency WM).
- Paused mid-way: Stage 4 Vid-View + Site Knitter repacked for Kibble (root/Applications, originals orig-b33/*.app.b33),
  Vid-View launch test not yet checked.
