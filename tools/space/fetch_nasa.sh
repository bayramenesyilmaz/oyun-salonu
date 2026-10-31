#!/bin/bash
# NASA kamu malı görüntüler (Visible Earth / SVS). Her dosya için birkaç aday adres denenir.
set -u
mkdir -p /tmp/nasa assets-src/space
get() { # ad aday...
  local n=$1; shift
  for u in "$@"; do
    if curl -fsSL --retry 2 -o /tmp/nasa/$n "$u"; then echo "OK $n <- $u" | tee -a assets-src/space/SOURCES.txt; return 0; fi
    echo "yok: $u"
  done
  echo "BAŞARISIZ $n"
}
: > assets-src/space/SOURCES.txt
get day.jpg \
  https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74092/world.200407.3x5400x2700.jpg \
  https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg \
  https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg
get night.jpg \
  https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg \
  https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg \
  https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg \
  https://eoimages.gsfc.nasa.gov/images/imagerecords/55000/55167/earth_lights_lrg.jpg
get clouds.jpg \
  https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg \
  https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif
get moon.jpg \
  https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_2k.jpg \
  https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg \
  https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif
python3 - <<'P'
from PIL import Image
import os
Image.MAX_IMAGE_PIXELS = None
for n, size, q in (('day.jpg', (2048, 1024), 86), ('night.jpg', (2048, 1024), 86), ('clouds.jpg', (1024, 512), 82), ('moon.jpg', (1024, 512), 84)):
    p = '/tmp/nasa/' + n
    if not os.path.exists(p):
        continue
    im = Image.open(p)
    im = im.convert('L' if n in ('night.jpg', 'clouds.jpg') and False else 'RGB').resize(size, Image.LANCZOS)
    im.save('assets-src/space/' + n, quality=q)
    print(n, im.size, os.path.getsize('assets-src/space/' + n))
P
