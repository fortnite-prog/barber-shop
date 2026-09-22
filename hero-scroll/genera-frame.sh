#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Estrae i fotogrammi della hero da assets/hero.mp4.
# Da rilanciare ogni volta che si sostituisce il video sorgente.
#
#   ./genera-frame.sh
#
# Produce due set:
#   assets/frames/         1920px, qualità 80  — desktop
#   assets/frames-mobile/   960px, qualità 75  — mobile (un fotogramma su due)
#
# ATTENZIONE: il numero di file prodotti deve corrispondere ai valori
# "totale" in main.js (CONFIG.desktop.totale e CONFIG.mobile.totale).
# Lo script li stampa alla fine: se cambiano, aggiorna main.js.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")"

SORGENTE="assets/hero.mp4"
[ -f "$SORGENTE" ] || { echo "Manca $SORGENTE"; exit 1; }

rm -rf assets/frames assets/frames-mobile
mkdir -p assets/frames assets/frames-mobile

echo "→ set desktop (1920px, q80)"
ffmpeg -hide_banner -loglevel error -y -i "$SORGENTE" \
  -vf "scale=1920:-2" \
  -c:v libwebp -quality 80 -compression_level 6 -preset picture \
  assets/frames/frame_%04d.webp

echo "→ set mobile (960px, q75, un fotogramma su due)"
ffmpeg -hide_banner -loglevel error -y -i "$SORGENTE" \
  -vf "select='not(mod(n,2))',scale=960:-2" -vsync 0 \
  -c:v libwebp -quality 75 -compression_level 6 -preset picture \
  assets/frames-mobile/frame_%04d.webp

echo
echo "desktop: $(ls assets/frames | wc -l) file  ($(du -sh assets/frames | cut -f1))"
echo "mobile:  $(ls assets/frames-mobile | wc -l) file  ($(du -sh assets/frames-mobile | cut -f1))"
echo
echo "Controlla che questi numeri siano uguali a CONFIG.desktop.totale e"
echo "CONFIG.mobile.totale in main.js."
