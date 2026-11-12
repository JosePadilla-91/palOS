# palOS 27 Clownfish — build 30

## Repairs

**Time Turner (critical)**
- Backups work again. In build 29, Time Turner's backup engine (`restic`) was linked to a folder that no longer existed, so setup, every backup, file restores and Restore System all failed. It now lives on disk at `/usr/lib/time-turner/bin/restic`.
- A full backup drive no longer stops backups for good. When a drive fills up mid-backup, Time Turner:
  - clears the half-written data;
  - removes the oldest backups (never the newest one, nor the newest full system image) until the backup fits;
  - tries again.
  If it still can't fit, it says so in plain words and leaves the drive clean.
- Sparse files, such as virtual machine disks, restore at their real size instead of their full size.
- Error messages are in plain language; the technical detail stays in the log.
- The start-up restore screen says palOS. Moving a backup to a new computer rebuilds palOS's start-up file instead of running GRUB.
- **New Time Turner icon** (the purple clock face with the silver rewind arrows). It replaces the old one everywhere: all eight sizes from 16 to 512 pixels, and inside Time Turner.app, whose own icon file used to be empty.

**Scrolling**
- palOS's own apps (everything on Kibble) scrolled the opposite way to Firefox and every other program, whichever direction was chosen. Kibble's window plugin gave WebKit wheel steps with the wrong sign. That's fixed, for up/down and left/right, so one scroll direction applies everywhere.

**Power**
- Settings → Power now really controls the computer. The desktop used to start a fixed 10-minute lock that looked like being logged out, and ignored the Power settings.
- The new idle manager follows the settings within seconds:
  - Turn Off the Screen After, including Never;
  - Lock the Screen, on or off;
  - **Put the Computer to Sleep After** (new; default Never);
  - **Log Out When Idle** (new; default Never, with a one-minute warning).
- Videos that are playing keep the screen on.

**Other repairs**
- **Address Book:** its menus in the menu bar appear again. The shared menu code crashed on its "Card" menu; Mail and Calendar had the same flaw.
- **Discette:** it runs on Kibble like the other apps. It was the last one on its own Electron, whose sandbox might not start. Kibble now answers `better-sqlite3` with Node's built-in SQLite.
- **Dock:** it loads 256-pixel icons, so icons stay sharp when magnified and on scaled displays. They used to be 128-pixel images stretched up to 208 pixels.
- **Installer, NVIDIA:**
  - the codecs/NVIDIA step can no longer stop an install; the install finishes on the built-in driver, and setup offers NVIDIA again;
  - NVIDIA no longer depends on Ubuntu's package lists being reachable;
  - the new system can look up names even when the live session doesn't use systemd-resolved;
  - a failed install says which step failed, and saves every log to `palos-install-logs` on the disk's EFI partition.

## New

**Mouse**
- A new Settings → Mouse page: Scroll Direction (Natural or Standard), Tracking Speed, Pointer Acceleration, Primary Button and Double-Click Speed.
- Scroll direction is one setting for every mouse and the trackpad. It applies from the login screen on, and again whenever a mouse is plugged in.

**Parental Controls** (Settings → Parental Controls)
- **Screen Time:** separate limits for school days and weekends. Only active use counts. Warnings come 10 minutes and 1 minute before the limit, then the child is logged out.
- **Bedtime:** the child is logged out, and the login screen says when the computer can be used again.
- **Apps:** all apps, or only the ticked ones. The others can't be opened from anywhere.
- **palOS Store:** child accounts are Standard accounts, so downloads need a parent's password.
- **Websites:**
  - modes: Off, Limit Adult Websites (Cloudflare's family filter, plus forced SafeSearch on Google, Bing and YouTube), or Only These Websites;
  - an always-blocked list;
  - works in every app; Firefox's private DNS and proxies are locked for the child.
- **Activity:** minutes per day for the past week, the apps used and the websites visited.
- Enforced by the `palos-parental` system service, with nftables (added to the system), PAM and file access rules.

**Live Cover Flow** (Seeker): the cover in front comes alive.
- **Video:** a play button; it plays right on the cover, with sound, controls and seeking. Formats Chromium can't play (MKV, HEVC, AVI, WMV…) are piped through ffmpeg: remuxed when the codecs fit, converted when they don't.
- **Songs:** album art, title and artist, and a play button.
- **PDFs and documents** (Word, Excel, PowerPoint, Chancery): turn through the real pages. Click the right or left half, use the arrows, or press Page Up / Page Down. Document pages are drawn by the Chancery app itself; Writer, Sheets and Presentation gained a `--pages` mode for this.
- **Code and text:** shown with colours, and scrollable.
- **Fonts:** a specimen.
- **3D models** (STL, OBJ, glTF/GLB, PLY): they turn on the cover; drag to spin. Without 3D graphics (no driver yet, or a VM), palOS draws them itself.
- **Pictures:** sharp at full size; animated GIF and WebP move.

## No more Ubuntu or GNOME

- **Identity files:** `lsb-release`, `issue`, `issue.net`, `legal`, dpkg's vendor and the live USB's start-up file all say palOS. Base-system updates can't put Ubuntu back. Virtual machines and programs that ask now get palOS.
- **os-release:** `ID_LIKE=debian`. The package base's codename `noble` stays, because third-party installers (WineHQ, Steam, NVIDIA's) read it to pick the right packages.
- **Fonts and icon themes:** the start-up screen draws in Noto Sans. Ubuntu's font and the Ubuntu Mono and Humanity icon theme packages are gone; `palos-base-compat` stands in for them, so base updates still work. gnome-online-accounts is removed.
- **Login services:** they're called palOS Keychain, palOS Certificates, palOS SSH Keys, palOS Password Prompt, palOS Location Services, palOS Accessibility and palOS Print Queue.
- **Activity Monitor:** shows base-system services by palOS names.
- **Text:** Settings and the Classic command no longer mention Ubuntu or GNOME.
- **What stays, out of sight:**
  - the libraries Firefox, WINE and NVIDIA need: GTK, GLib, Adwaita's icons and GNOME Keyring's programs;
  - Ubuntu's archive keyring, which checks updates;
  - the license files;
  - the kernel's own record of the compiler that built it (`/proc/version` says "gcc (Ubuntu …)"). Changing that needs a kernel rebuild.

## Tested in a test copy of this build
- **Time Turner** (checked again on the final image, with the new icon):
  - setup, a first backup and an incremental backup work as shipped;
  - all 2,010 test files came back byte for byte: Unicode names, links, hardlinks, permissions, a 2,000-file folder;
  - restoring a deleted file, a deleted folder and a "keep both" copy works through the service;
  - restic's full data check finds no errors;
  - sparse files restore at 4 KB;
  - a drive that fills mid-backup removes an older backup (never the first or newest), makes room and finishes;
  - a backup that can't fit even then fails with a plain message; the failed attempt's leftovers are cleared and the next backup works;
  - the start-up restore says palOS and rebuilds palOS's start-up file;
  - the window opens with the new icon.
- **Parental Controls:**
  - a child's lookups go through the filter and a parent's don't;
  - blocked sites don't resolve, and allowed ones do;
  - apps that aren't allowed can't be opened;
  - the login check refuses at bedtime and when screen time is used up;
  - the Settings page and activity report work.
- **Power:**
  - "Never" switches the real timer off, and 15 minutes sets it;
  - Lock off doesn't lock;
  - Log Out When Idle fires.
- **Scrolling:** palOS apps now scroll the same way as Firefox.
- **Live Cover Flow:** every kind above was checked on screen, including MKV/HEVC and AVI through the stream, and PDF and Word page turning.
- **Apps:** all 36 open.
- **Not testable here (please check on your PC):**
  - NVIDIA's download and install;
  - sleep;
  - real logout and lock (no login manager here);
  - mouse settings on a real mouse;
  - web filtering against the real internet;
  - 3D models with real graphics.

## Your package repo
These packages own files that changed. Update them before you next publish, or an update could bring old versions back:
- `paladin-session`: `paladin-session` and `paladin-session-helper` (idle manager start, mouse double-click)
- `paladin-seeker`: Seeker (live Cover Flow, preview engine, three.js)
- `paladin-boot`: the start-up screen font (`paladin.script`)
- `palos-branding`: `os-release` (`ID_LIKE=debian`, no `UBUNTU_CODENAME`)

From build 29's list, still open: `palos-desktop`, `paladin-session` and `palos-icons` still point at Nave and Yaru.
New files no package owns yet:
- `/usr/lib/palos-parental/`, `palos-parental.service` and `org.palos.parental.policy`
- `/usr/lib/paladin-session/paladin-idle`
- `palos-base-compat` (a new .deb, included in the system)
