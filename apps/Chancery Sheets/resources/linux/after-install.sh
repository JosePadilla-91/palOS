#!/bin/bash
# Post-install script for the Chancery Sheets .deb (also usable as a postinst if you build the .deb yourself).
# Installs to "/opt/Chancery Sheets"; links /usr/bin/chancery-sheets; registers the .spst MIME type; and on
# Ubuntu 23.10+ (including 24.04) installs an AppArmor profile so Chromium's sandbox can use user namespaces.
set -e
APP_DIR="/opt/Chancery Sheets"
EXE="$APP_DIR/chancery-sheets"
RES="$APP_DIR/resources/linux"

# Command-line launcher
if type update-alternatives >/dev/null 2>&1; then
  if [ -L /usr/bin/chancery-sheets ] && [ "$(readlink /usr/bin/chancery-sheets)" != /etc/alternatives/chancery-sheets ]; then rm -f /usr/bin/chancery-sheets; fi
  update-alternatives --install /usr/bin/chancery-sheets chancery-sheets "$EXE" 100 || ln -sf "$EXE" /usr/bin/chancery-sheets
else
  ln -sf "$EXE" /usr/bin/chancery-sheets
fi

# Chromium sandbox: prefer user namespaces (AppArmor profile below); fall back to the SUID helper
# only where unprivileged user namespaces are unavailable.
if [ -f "$APP_DIR/chrome-sandbox" ]; then
  if [ -L /proc/self/ns/user ] && unshare --user true 2>/dev/null; then
    chmod 0755 "$APP_DIR/chrome-sandbox" || true
  else
    chown root:root "$APP_DIR/chrome-sandbox" || true
    chmod 4755 "$APP_DIR/chrome-sandbox" || true
  fi
fi

# AppArmor (Ubuntu 24.04 restricts unprivileged user namespaces unless a profile allows them)
if [ -d /etc/apparmor.d ] && [ -f "$RES/apparmor-chancery-sheets" ]; then
  if [ -f /etc/apparmor.d/abi/4.0 ]; then
    install -m 0644 "$RES/apparmor-chancery-sheets" /etc/apparmor.d/chancery-sheets
  else
    # Older AppArmor without ABI 4.0: strip the abi line and userns rule (namespaces aren't restricted there).
    sed -e '/^abi /d' -e '/userns,/d' "$RES/apparmor-chancery-sheets" > /etc/apparmor.d/chancery-sheets
  fi
  if hash apparmor_parser 2>/dev/null && { [ -d /sys/kernel/security/apparmor ] || aa-enabled --quiet 2>/dev/null; }; then
    apparmor_parser --replace --write-cache --skip-read-cache /etc/apparmor.d/chancery-sheets 2>/dev/null || \
      echo "Chancery Sheets: could not load the AppArmor profile; run 'sudo apparmor_parser -r /etc/apparmor.d/chancery-sheets' or launch with --no-sandbox." >&2
  fi
fi

# MIME type for .spst files, then refresh desktop/MIME/icon caches
if [ -f "$RES/chancery-sheets-mime.xml" ]; then
  install -D -m 0644 "$RES/chancery-sheets-mime.xml" /usr/share/mime/packages/chancery-sheets.xml
fi
if hash update-mime-database 2>/dev/null; then update-mime-database /usr/share/mime >/dev/null 2>&1 || true; fi
if hash update-desktop-database 2>/dev/null; then update-desktop-database /usr/share/applications >/dev/null 2>&1 || true; fi
if hash gtk-update-icon-cache 2>/dev/null; then gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor >/dev/null 2>&1 || true; fi
exit 0
