#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[[ "$(uname -s)" == Darwin ]] || { echo "This build requires macOS with Xcode command-line tools." >&2; exit 1; }
mkdir -p "$ROOT/build"
OUT="$(mktemp -d "$ROOT/build/run.XXXXXX")"
APP="$OUT/Sizing Studio.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$ROOT/Sources/Info.plist" "$APP/Contents/Info.plist"
cp -R "$ROOT/website" "$APP/Contents/Resources/website"
cp "$ROOT/Sources/storage.js" "$ROOT/Sources/smoke.js" "$APP/Contents/Resources/"
SDK="$(xcrun --sdk macosx --show-sdk-path)"
for ARCH in arm64 x86_64; do
  xcrun swiftc -swift-version 5 -O -whole-module-optimization -sdk "$SDK" -target "${ARCH}-apple-macosx13.0" -framework Cocoa -framework WebKit -framework UniformTypeIdentifiers "$ROOT/Sources/main.swift" -o "$OUT/SizingStudio-$ARCH"
done
xcrun lipo -create "$OUT/SizingStudio-arm64" "$OUT/SizingStudio-x86_64" -output "$APP/Contents/MacOS/SizingStudio"
xcrun swift "$ROOT/Sources/icon.swift" "$OUT/icon.png"
mkdir -p "$OUT/AppIcon.iconset"
for SIZE in 16 32 128 256 512; do
  sips -z "$SIZE" "$SIZE" "$OUT/icon.png" --out "$OUT/AppIcon.iconset/icon_${SIZE}x${SIZE}.png" >/dev/null
  DOUBLE=$((SIZE * 2))
  sips -z "$DOUBLE" "$DOUBLE" "$OUT/icon.png" --out "$OUT/AppIcon.iconset/icon_${SIZE}x${SIZE}@2x.png" >/dev/null
done
iconutil -c icns "$OUT/AppIcon.iconset" -o "$APP/Contents/Resources/AppIcon.icns"
# Ad-hoc signing is for testing only. It is not Developer ID signing or notarization.
codesign --force --sign - "$APP"
codesign --verify --strict "$APP"
xcrun lipo "$APP/Contents/MacOS/SizingStudio" -verify_arch arm64 x86_64
ZIP="$OUT/Sizing-Studio-macOS-universal.zip"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
echo "Built: $APP"
echo "ZIP: $ZIP"
du -h "$ZIP"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  printf 'app_path=%s\nzip_path=%s\n' "$APP" "$ZIP" >> "$GITHUB_OUTPUT"
fi
