#!/bin/bash
# testenv.sh up|down : throwaway overlay of root with X, dbus, alice and the palOS session
cd /home/claude/b30; M=ov/m
if [ "$1" = down ]; then pkill -u 1000; pkill -f time-turner/engine; pkill dbus-daemon; pkill polkitd; sleep 2
  for m in tmp/.X11-unix dev/shm dev/pts dev sys proc; do umount $M/$m 2>/dev/null || umount -l $M/$m 2>/dev/null; done; umount ov/m 2>/dev/null || umount -l ov/m; rm -rf ov; exit 0; fi
mkdir -p ov/upper ov/work ov/m && mount -t overlay overlay -o lowerdir=root,upperdir=ov/upper,workdir=ov/work $M
for d in proc sys dev dev/pts; do mount --bind /$d $M/$d; done; mount -t tmpfs -o mode=1777 tmpfs $M/dev/shm
chmod 666 /dev/fuse; mkdir -p /tmp/.X11-unix $M/tmp/.X11-unix; chmod 1777 $M/tmp
pgrep -x Xvfb >/dev/null || { Xvfb :5 -screen 0 1920x1080x24 -nolisten tcp >/tmp/xvfb.log 2>&1 & sleep 2; }
mount --bind /tmp/.X11-unix $M/tmp/.X11-unix; DISPLAY=:5 xhost + >/dev/null
mkdir -p $M/run/dbus; chroot $M dbus-daemon --system --fork --nopidfile 2>/dev/null
chroot $M useradd -m -s /bin/bash alice 2>/dev/null; mkdir -p $M/run/user/1000; chroot $M chown alice:alice /run/user/1000; chmod 700 $M/run/user/1000
cat > $M/tmp/sess.sh <<'S'
#!/bin/sh
exec env -i HOME=/home/alice USER=alice LOGNAME=alice DISPLAY=:5 XDG_RUNTIME_DIR=/run/user/1000 XDG_SESSION_TYPE=x11 SHELL=/bin/bash LANG=en_CA.UTF-8 PATH=/usr/local/bin:/usr/bin:/bin dbus-run-session -- /usr/bin/paladin-session
S
chmod 755 $M/tmp/sess.sh
chroot --userspec=alice:alice $M /usr/bin/env -i /bin/sh -c 'nohup /tmp/sess.sh > /tmp/sess.out 2>&1 &'
sleep 50
for P in $(pgrep -u 1000); do if tr '\0' '\n' < /proc/$P/environ 2>/dev/null | grep -q DBUS_SESSION_BUS_ADDRESS; then tr '\0' '\n' < /proc/$P/environ | grep -E "^(DBUS_SESSION_BUS_ADDRESS|DISPLAY|HOME|USER|LANG|PATH|XDG_[A-Z_]+|LOGNAME|SHELL)=" > $M/tmp/env.list; break; fi; done
echo "up: $(wc -l < $M/tmp/env.list) env vars"
