#!/bin/bash
# Post-removal script for the Chancery Sheets .deb.
case "$1" in
  upgrade|failed-upgrade) exit 0 ;;
esac
if type update-alternatives >/dev/null 2>&1; then update-alternatives --remove chancery-sheets "/opt/Chancery Sheets/chancery-sheets" >/dev/null 2>&1 || true; fi
[ -L /usr/bin/chancery-sheets ] && [ ! -e /usr/bin/chancery-sheets ] && rm -f /usr/bin/chancery-sheets
if [ -f /etc/apparmor.d/chancery-sheets ]; then
  if hash apparmor_parser 2>/dev/null; then apparmor_parser --remove /etc/apparmor.d/chancery-sheets >/dev/null 2>&1 || true; fi
  rm -f /etc/apparmor.d/chancery-sheets
fi
rm -f /usr/share/mime/packages/chancery-sheets.xml
if hash update-mime-database 2>/dev/null; then update-mime-database /usr/share/mime >/dev/null 2>&1 || true; fi
if hash update-desktop-database 2>/dev/null; then update-desktop-database /usr/share/applications >/dev/null 2>&1 || true; fi
exit 0
