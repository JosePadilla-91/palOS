# palOS 27 "Clownfish"

palOS's own source: everything palOS made, gathered from the build 33/34 system image.

| Folder | What's in it |
|---|---|
| `system/` | palOS's files, at the paths they're installed at (Seeker, Dock, session, setup, installer, Kibble's runtime, Time Turner's engine, the portal, translations, icons, sounds…) |
| `apps/` | every app in /Applications, unpacked to its source |
| `packages/` | what each palOS package is, needs, and runs when installed |
| `external.json` | every program, library and third-party folder left out (size and checksum): what the build has to build or fetch |
| `tools/` | the tools used to pack apps and test palOS |
| `notes/` | change logs and the current work's progress |

## To be rebuilt from new source

These exist only as compiled programs (their source was lost), so they will be rewritten as palOS's own code:

- **paladin-wm**: palOS's window manager
- **Kibble's host and window layer** (`/usr/lib/kibble/bin`, `/usr/lib/kibble/webkit`): rebuilt with WebKit's audio and video
- **apps whose source is only their built bundle** (`apps/*/source/out`): rebuilt from readable source over time

## Where palOS is going

palOS's own code for everything above the foundation (kernel, drivers, system libraries, graphics, sound, networking),
built from source here: no GTK, GNOME, KDE, Ubuntu or Debian pieces.
