#!/bin/bash
set -e

npm run build

# Assets with content hash - long cache
aws s3 sync dist/ s3://atkpihlainen.fi/yatzy/ \
  --exclude "index.html" \
  --exclude "sw.js" \
  --exclude "manifest.webmanifest" \
  --cache-control "max-age=31536000"

# No-cache files: index.html, service worker, manifest
for file in index.html sw.js manifest.webmanifest; do
  [ -f "dist/$file" ] && aws s3 cp "dist/$file" "s3://atkpihlainen.fi/yatzy/$file" \
    --cache-control "no-cache, no-store, must-revalidate"
done

aws cloudfront create-invalidation \
  --distribution-id E2510HPKY7VRD1 \
  --paths "/yatzy/*" \
  --output text

echo "Deployed."
