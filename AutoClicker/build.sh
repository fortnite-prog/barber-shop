#!/bin/bash
# Compila AutoClicker.app (universale Apple Silicon + Intel). Serve: xcode-select --install
set -e
cd "$(dirname "$0")"
APP="build/AutoClicker.app"
rm -rf build && mkdir -p "$APP/Contents/MacOS"

for ARCH in arm64 x86_64; do
  swiftc -O -parse-as-library -target "$ARCH-apple-macos13.0" Sources/*.swift -o "build/bin-$ARCH"
done
lipo -create build/bin-arm64 build/bin-x86_64 -output "$APP/Contents/MacOS/AutoClicker"
rm build/bin-*
cp Info.plist "$APP/Contents/Info.plist"

# Firma ad-hoc: necessaria su Apple Silicon e rende stabile il permesso Accessibilità
codesign --force --deep --sign - "$APP"
echo "Fatto: $APP"
echo "Aprila con: open \"$APP\"  (o copiala in Applicazioni)"
