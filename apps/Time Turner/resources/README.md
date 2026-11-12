# Time Turner

Whole-system backups for Ubuntu 24.04, with a carousel browser for stepping back in time.

## Build and install

On Ubuntu 24.04 with Node.js 20 or newer:

```bash
npm install
npm run dist                         # downloads restic, builds dist/time-turner_1.0.0_amd64.deb
sudo apt install ./dist/time-turner_1.0.0_amd64.deb
```

Then open **Time Turner** from the app grid. The first launch runs the setup wizard.

`npm run dist` downloads restic 0.19.1 from GitHub and checks it against the release's SHA256SUMS.
For an ARM machine, use `npm run dist:arm64`.

## Development

```bash
npm run start:mock    # the UI with built-in sample data; no service needed
npm start             # the real UI; needs the service installed (from the .deb)
npm test              # service tests against real restic (needs restic on PATH or TT_RESTIC)
```

`npm test` runs the background service against a scratch folder, and over a private
D-Bus when `dbus-daemon` is installed. To test against the bundled restic:
`TT_RESTIC=vendor/restic/restic npm test`.

## How it works

| Piece | Where | What it does |
|---|---|---|
| App (UI) | `src/renderer`, `src/main`, `src/preload` | Electron window. Talks to the service over the system D-Bus. |
| Background service | `src/daemon` → `time-turnerd.service` | Runs as root. Scheduled backups, browsing, search, restores. Started with the app's own Electron binary in Node mode, so there's one runtime. |
| Backup engine | restic (bundled) | Deduplicated, compressed, encrypted storage. Every backup is complete on its own. |
| Permissions | `system/com.timeturner.policy` | Ubuntu's own password prompt (polkit). Browsing and restoring your own files needs no password; settings and Restore System do. |
| Upgrade hook | `system/apt-hook` | After a new kernel or Ubuntu release, asks for a labelled full system image (taken once apt has been quiet for 10 minutes). |
| System restore | `system/initramfs/local-bottom` | Runs at boot before Ubuntu starts. Rebuilds `/` from the chosen backup, then restarts into it. |

What gets backed up: all of `/` plus separate local partitions (`/home`, `/boot`, `/boot/efi`, …).
Skipped: `/proc`, `/sys`, `/dev`, `/run`, `/tmp`, `/mnt`, `/media`, swap, caches, the Trash and the backup drive itself (see `BASE_EXCLUDES` in `src/daemon/config.js`).

Retention is rolling: everything from the last day, one per day for a month, one per week after that.
Full system images (first backup, kernel updates, upgrades) and "before system restore" backups are kept.
When the drive gets full, the oldest backups go first.

### Files on the installed system

| Path | Contents |
|---|---|
| `/etc/time-turner/config.json` | Settings |
| `/etc/time-turner/repo.key` | Backup key (root only). A copy also travels with the backups, in `<drive>/TimeTurner.key`, so restoring never asks for it. |
| `/var/lib/time-turner/` | State, pending restores, last restore result |
| `<drive>/TimeTurner/` | The backups (a restic repository) |

Logs: `journalctl -u time-turnerd -f`

### Looking at backups without the app

The backups are a standard restic repository; its key is in `TimeTurner.key` next to it:

```bash
sudo /usr/lib/time-turner/restic -r /media/$USER/<drive>/TimeTurner --password-file /media/$USER/<drive>/TimeTurner.key snapshots
```

## Test whole-system restores in a VM first

**Restore System** replaces every file on the computer. The code has been checked with a simulated system, but it has not yet been run end to end on real hardware.
Before relying on it, try it in a virtual machine (GNOME Boxes or VirtualBox, Ubuntu 24.04):

1. Install the .deb in the VM and set up backups to a second virtual disk.
2. Make a backup, then change some things: install a package, delete files in your home folder.
3. Choose that backup and click **Restore System**. The VM restarts, shows "Time Turner: restoring…" on the console, and then restarts again.
4. Check that everything is back. `journalctl -b -1` shows the restore boot.

If something goes wrong during a restore, the computer still starts normally after three failed attempts.
The result is shown in the app the next time it opens.

## Known limits (version 1)

- Whole-system restores need the backup on a USB or internal drive. Network shares (SMB) work for backups and file restores, but not yet for whole-system restores.
- Ubuntu's default filesystem (ext4) can't take an instant snapshot, so a file that changes during a backup is saved as it was when it was read.
- The browser shows and restores files in your own home folder. Other locations come back with Restore System.
- File icons are Time Turner's own. Swapping in the system's Yaru icons is a possible later improvement.

## Uninstall

```bash
sudo apt remove time-turner     # keeps settings and the backup key
sudo apt purge time-turner      # also removes settings and the key (backups on the drive stay)
```
