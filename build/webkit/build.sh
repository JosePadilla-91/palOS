#!/bin/bash
# Kibble's web engine: WPE WebKit, built from upstream source with sound and video (GStreamer).
#   build/webkit/build.sh WORKDIR OUT.tar.xz
# Installs under /usr/lib/kibble/webkit (where Kibble looks for it). Needs the packages in deps.txt.
set -euo pipefail
WORK=${1:?work dir}; OUT=${2:?output tarball}
HERE=$(cd "$(dirname "$0")" && pwd)
. "$HERE/version"
mkdir -p "$WORK"; cd "$WORK"
if [ ! -d "wpewebkit-$VERSION" ]; then
  curl -fsSLo wpe.tar.xz "https://wpewebkit.org/releases/wpewebkit-$VERSION.tar.xz"
  echo "$SHA256  wpe.tar.xz" | sha256sum -c -
  tar xf wpe.tar.xz && rm wpe.tar.xz
fi
PREFIX=/usr/lib/kibble/webkit
cmake -S "wpewebkit-$VERSION" -B build -G Ninja \
  -DPORT=WPE -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=$PREFIX -DCMAKE_INSTALL_LIBDIR=lib \
  -DCMAKE_C_FLAGS="-g0" -DCMAKE_CXX_FLAGS="-g0" -DCMAKE_C_COMPILER_LAUNCHER=ccache -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
  -DENABLE_WPE_PLATFORM=ON -DENABLE_WPE_LEGACY_API=OFF \
  -DENABLE_WPE_PLATFORM_DRM=OFF -DENABLE_WPE_PLATFORM_WAYLAND=OFF -DENABLE_WPE_PLATFORM_HEADLESS=ON \
  -DENABLE_VIDEO=ON -DENABLE_WEB_AUDIO=ON -DENABLE_MEDIA_SOURCE=ON -DENABLE_MEDIA_RECORDER=ON -DENABLE_WEB_CODECS=ON \
  -DENABLE_MEDIA_STREAM=ON -DENABLE_ENCRYPTED_MEDIA=OFF -DENABLE_WEB_RTC=OFF \
  -DENABLE_DOCUMENTATION=OFF -DENABLE_INTROSPECTION=OFF -DENABLE_JOURNALD_LOG=OFF -DENABLE_BUBBLEWRAP_SANDBOX=OFF \
  -DENABLE_SPEECH_SYNTHESIS=OFF -DENABLE_GAMEPAD=OFF -DENABLE_WEBXR=OFF -DENABLE_WPE_QT_API=OFF \
  -DENABLE_MINIBROWSER=OFF -DENABLE_WEBDRIVER=OFF -DENABLE_API_TESTS=OFF -DENABLE_LAYOUT_TESTS=OFF \
  -DUSE_ATK=OFF -DUSE_SYSPROF_CAPTURE=OFF -DUSE_LIBBACKTRACE=OFF -DUSE_SPIEL=OFF -DUSE_FLITE=OFF
ninja -C build -j"$(nproc)"
DESTDIR="$WORK/stage" ninja -C build install
# only what Kibble runs: no headers' docs, no static bits; headers and .pc stay (Kibble's host is built against them)
find "$WORK/stage" -name '*.a' -delete
strip --strip-unneeded "$WORK/stage$PREFIX"/lib/*.so* "$WORK/stage$PREFIX"/libexec/wpe-webkit-*/* 2>/dev/null || true
tar -C "$WORK/stage" -cJf "$OUT" .
echo "built $OUT ($(du -h "$OUT" | cut -f1))"
