#!/bin/sh
# Copy both editions' PDFs and spread previews to the project's shared folder.
#   sh brochure/publish.sh [dest]   (default /mnt/project-files/brochure)
set -e
dest="${1:-/mnt/project-files/brochure}"
dist="$(dirname "$0")/dist"
for pair in "buy:販売のみ" "rent:レンタルあり"; do
  ed="${pair%%:*}"; ja="${pair#*:}"
  out="$dest/${ja}版"
  mkdir -p "$out/preview"
  cp "$dist/brochure-$ed-bleed0.pdf" "$out/野田の消煙機_製品カタログ_${ja}_A4.pdf"
  cp "$dist/brochure-$ed-bleed3.pdf" "$out/野田の消煙機_製品カタログ_${ja}_印刷用_塗り足し3mm.pdf"
  cp "$dist/brochure-$ed-spreads.pdf" "$out/野田の消煙機_製品カタログ_${ja}_見開き.pdf"
  cp "$dist/preview-$ed"/spread-*.jpg "$out/preview/"
done
ls -R "$dest" | head -40
