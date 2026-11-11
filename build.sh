#!/bin/sh
# Rebuild the minified twins served by index.html.
# Run this after editing assets/main.js or assets/styles.css:
#
#     ./build.sh
#
# The page loads assets/main.min.js and assets/styles.min.css;
# the lazy companions (terrarium.js, memory.js, audio-data.js) are
# served as-is, loaded on demand by main.js.
set -e
cd "$(dirname "$0")"
npx --yes esbuild assets/main.js   --minify --charset=utf8 --outfile=assets/main.min.js
npx --yes esbuild assets/styles.css --minify --charset=utf8 --outfile=assets/styles.min.css
echo "built: assets/main.min.js assets/styles.min.css"
