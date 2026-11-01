#!/bin/bash
# Ücretsiz, açık lisanslı kaynakları indirir.
#  - MakeHuman/MPFB2 CC0 varlık paketleri (büyük; depoya yazılmaz, önbellekte tutulur)
#  - Quaternius Universal Animation Library 1 ve 2 (CC0) -> assets-src/quaternius/
set -u
mkdir -p /tmp/mhpacks assets-src/quaternius
log=tools/kaynak/out/indirme.txt; mkdir -p tools/kaynak/out; : > $log
get() { # hedef aday...
  local out=$1; shift
  [ -s "$out" ] && { echo "VAR $out" | tee -a $log; return 0; }
  for u in "$@"; do
    if curl -fsSL --retry 2 -o "$out.part" "$u"; then mv "$out.part" "$out"; echo "OK $(basename $out) <- $u ($(du -h $out | cut -f1))" | tee -a $log; return 0; fi
  done
  rm -f "$out.part"; echo "BAŞARISIZ $out" | tee -a $log
}
# MakeHuman CC0 paketleri
for p in makehuman_system_assets skins01 skins02 skins03 hair01 dress01 shirts01 pants01 shoes01 suits01 suits02 hats01 hats02 eyebrows01 glasses01; do
  get /tmp/mhpacks/$p.zip \
    https://files2.makehumancommunity.org/asset_packs/$p/${p}_cc0.zip \
    https://files.makehumancommunity.org/asset_packs/$p/${p}_cc0.zip
done
# Quaternius animasyon kütüphaneleri (CC0)
get assets-src/quaternius/ual1_standard.zip \
  "https://opengameart.org/sites/default/files/Universal%20Animation%20Library%5BStandard%5D.zip" \
  https://opengameart.org/sites/default/files/universal_animation_library_standard.zip \
  https://opengameart.org/sites/default/files/ual_standard.zip
get assets-src/quaternius/ual2_standard.zip \
  https://opengameart.org/sites/default/files/universal_animation_library_2standard.zip \
  https://opengameart.org/sites/default/files/universal_animation_library_2_standard.zip
for z in assets-src/quaternius/*.zip; do [ -s "$z" ] && unzip -l "$z" | tail -n +4 | head -60 > tools/kaynak/out/$(basename $z .zip)_liste.txt; done
ls -la /tmp/mhpacks assets-src/quaternius | tee -a $log
