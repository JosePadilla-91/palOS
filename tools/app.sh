#!/bin/bash
# app.sh unpack BUNDLE DIR   |  app.sh pack BUNDLE DIR   (palOS .app = AppImage runtime + squashfs)
set -e
cmd=$1; B=$2; D=$3
off() { for o in $(grep -obUaP "hsqs" "$B" | cut -d: -f1); do unsquashfs -s -o $o "$B" >/dev/null 2>&1 && { echo $o; return; }; done; return 1; }
case $cmd in
  unpack) o=$(off); rm -rf "$D"; unsquashfs -q -o $o -d "$D" "$B" >/dev/null; echo "$o" > "$D.offset"; unsquashfs -s -o $o "$B" | grep -E "^Compression" | awk '{print $2}' > "$D.comp" ;;
  pack) o=$(cat "$D.offset"); c=$(cat "$D.comp"); t=$(mktemp); head -c $o "$B" > "$t.run"; mksquashfs "$D" "$t.sqfs" -root-owned -noappend -comp $c -quiet -no-progress >/dev/null; cat "$t.run" "$t.sqfs" > "$B.new"; chmod 755 "$B.new"; mv -f "$B.new" "$B"; rm -f "$t" "$t.run" "$t.sqfs"; echo "packed $(basename "$B") ($(stat -c %s "$B") bytes)" ;;
esac
