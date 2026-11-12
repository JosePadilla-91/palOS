#!/usr/bin/python3
"""to-kibble.py BUNDLE_DIR "App Name": a palOS .app bundle runs on Kibble only (its Electron fallback removed)."""
import json, os, re, sys
d, name = sys.argv[1], sys.argv[2]
run = open(os.path.join(d, 'AppRun')).read()
m = re.search(r'^export PALOS_APP_DIR=.*$', run, re.M)
assert m, 'no PALOS_APP_DIR line'
appdir = m.group(0)
open(os.path.join(d, 'AppRun'), 'w').write(f'''#!/bin/sh
# palOS .app: {name}, on Kibble (palOS's app runtime: WebKit, palOS windows and Kibble's media engine)
HERE="$(dirname "$(readlink -f "$0")")"
export PALOS_APP="${{APPIMAGE:-$HERE}}"
{appdir}
if [ ! -x /usr/lib/kibble/kibble ]; then
  notify-send -i dialog-warning "{name}" "{name} needs Kibble, palOS's app runtime, which isn't on this computer." 2>/dev/null
  echo "{name}: Kibble (/usr/lib/kibble) is missing" >&2; exit 1
fi
exec /usr/lib/kibble/kibble "$@"
''')
os.chmod(os.path.join(d, 'AppRun'), 0o755)
p = os.path.join(d, 'palos-app.json')
if os.path.exists(p):
    j = json.load(open(p)); j['runtime'] = 'kibble'; j.pop('fallback', None)
    if j.get('kind') in ('shared', 'electron-own'): j['kind'] = 'kibble'
    json.dump(j, open(p, 'w'), indent=1)
print('ok', name)
