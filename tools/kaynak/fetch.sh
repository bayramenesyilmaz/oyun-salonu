#!/bin/bash
# Ücretsiz, açık lisanslı kaynakları indirir.
#  - MakeHuman/MPFB2 CC0 varlık paketleri (büyük; depoya yazılmaz, önbellekte tutulur)
#  - Quaternius Universal Animation Library 1 ve 2 (CC0) -> assets-src/quaternius/
set -u
mkdir -p assets-src/quaternius
log=tools/kaynak/out/indirme.txt; mkdir -p tools/kaynak/out; : > $log
get() { # hedef aday...
  local out=$1; shift
  [ -s "$out" ] && { echo "VAR $out" | tee -a $log; return 0; }
  for u in "$@"; do
    if curl -fsSL --retry 1 --connect-timeout 20 --max-time 1200 --speed-limit 30000 --speed-time 90 -o "$out.part" "$u"; then mv "$out.part" "$out"; echo "OK $(basename $out) <- $u ($(du -h $out | cut -f1))" | tee -a $log; return 0; fi
  done
  rm -f "$out.part"; echo "BAŞARISIZ $out" | tee -a $log
}
# Quaternius animasyon kütüphaneleri (CC0)
get assets-src/quaternius/ual2_standard.zip \
  https://opengameart.org/sites/default/files/universal_animation_library_2standard.zip \
  https://opengameart.org/sites/default/files/universal_animation_library_2_standard.zip
for z in assets-src/quaternius/*.zip; do [ -s "$z" ] && unzip -l "$z" | tail -n +4 | head -60 > tools/kaynak/out/$(basename $z .zip)_liste.txt; done
ls -la /tmp/mhpacks assets-src/quaternius | tee -a $log
