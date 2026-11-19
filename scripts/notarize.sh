#!/bin/bash
set -euo pipefail
APP="$1"
ZIP="$2"
: "${MAC_CERT_P12_BASE64:?Missing Developer ID certificate}"
: "${MAC_CERT_PASSWORD:?Missing certificate password}"
: "${MAC_SIGN_IDENTITY:?Missing Developer ID Application identity}"
: "${APPLE_ID:?Missing Apple ID}"
: "${APPLE_TEAM_ID:?Missing Apple team ID}"
: "${APPLE_APP_PASSWORD:?Missing app-specific password}"
TMP="$(mktemp -d "${RUNNER_TEMP:-/tmp}/sizing-sign.XXXXXX")"
KEYCHAIN="$TMP/build.keychain-db"
cleanup() { security delete-keychain "$KEYCHAIN" >/dev/null 2>&1 || true; }
trap cleanup EXIT
KEYCHAIN_PASSWORD="$(openssl rand -hex 24)"
printf '%s' "$MAC_CERT_P12_BASE64" | base64 --decode > "$TMP/certificate.p12"
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security set-keychain-settings -lut 21600 "$KEYCHAIN"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security import "$TMP/certificate.p12" -P "$MAC_CERT_PASSWORD" -A -t cert -f pkcs12 -k "$KEYCHAIN" >/dev/null
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN" >/dev/null
codesign --force --options runtime --timestamp --keychain "$KEYCHAIN" --sign "$MAC_SIGN_IDENTITY" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$TMP/submission.zip"
xcrun notarytool store-credentials sizing-build --keychain "$KEYCHAIN" --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" --password "$APPLE_APP_PASSWORD" >/dev/null
xcrun notarytool submit "$TMP/submission.zip" --keychain-profile sizing-build --keychain "$KEYCHAIN" --wait
xcrun stapler staple "$APP"
xcrun stapler validate "$APP"
spctl --assess --type execute --verbose=2 "$APP"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
