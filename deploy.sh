#!/bin/bash
set -e

npm run build

# Assets with content hash - long cache
aws s3 sync dist/ s3://atkpihlainen.fi/yatzy/ \
  --exclude "index.html" \
  --cache-control "max-age=31536000"

# index.html - no cache
aws s3 cp dist/index.html s3://atkpihlainen.fi/yatzy/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

aws cloudfront create-invalidation \
  --distribution-id E2510HPKY7VRD1 \
  --paths "/yatzy/*" \
  --output text

echo "Deployed."
