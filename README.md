# Sizing Studio for Mac

A small native Cocoa/WebKit application wrapping the offline sizing calculator. No Electron, Node runtime, local web server, installer or third-party application framework is shipped. Target: macOS 13 or later, Apple Silicon and Intel. Final size is reported by the GitHub build, not assumed.

## Current status

This folder is source code, not a compiled Mac application. Compilation and native launch tests must run through GitHub Actions. Do not distribute a test artifact as a notarized customer release.

## Build with GitHub Actions

1. Put the CONTENTS of this folder at the root of your GitHub repository, including the hidden `.github` directory. Do not upload the source ZIP as a single file. Use a private repository if the calculator should remain private.
2. In GitHub, open Actions > Build Mac app > Run workflow. The workflow must be on the default branch to appear. Pushes to main also create test builds.
3. Leave notarization unchecked for an initial internal test, or configure the Apple secrets below and enable notarization for distribution.
4. Wait for BOTH jobs to pass. The second job opens the same app on an Intel runner.
5. Download the workflow artifact. Extract the outer GitHub artifact ZIP; distribute the inner `Sizing-Studio-macOS-universal.zip`. An artifact labelled TEST-unsigned is only ad-hoc signed and can trigger Gatekeeper.

No repository is created, uploaded or published by these local files. GitHub private-repository Actions usage can consume the account's included minutes.

## Customer experience

For a successfully signed and notarized build: download the app ZIP, double-click it to extract, then double-click Sizing Studio.app. It can remain in Downloads; copying to Applications is optional. No Terminal commands, server startup or dependency installation is needed. macOS may show the normal downloaded-app confirmation. Managed corporate policies can impose additional restrictions.

The app works offline. Settings and reset defaults persist in the user's Mac preferences, separate from browser settings, without modifying the app bundle. Closing the last window exits the app. Cmd+Q, copy/paste and a native CSV Save dialog are supported. Previous Windows/browser settings are not automatically transferred.

## Apple signing and notarization

Configure these repository Actions secrets through GitHub Settings > Secrets and variables > Actions. Do not put credentials in source or chat.

- MAC_CERT_P12_BASE64: base64 of the exported Developer ID Application certificate AND private key (.p12).
- MAC_CERT_PASSWORD: password for the .p12 file.
- MAC_SIGN_IDENTITY: complete Developer ID Application identity from that certificate.
- APPLE_ID: Apple developer account email.
- APPLE_TEAM_ID: Apple developer team ID.
- APPLE_APP_PASSWORD: Apple app-specific password for notarization.

Enable the notarize workflow input. The build enables hardened runtime, submits to Apple, staples the ticket and runs Gatekeeper assessment. A failure stops release packaging. Test builds cannot guarantee a warning-free double-click launch. Do not disable Gatekeeper.

Apple documentation: https://developer.apple.com/developer-id/ and https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution

## Validation and release checks

Windows-compatible checks: `node tests/model.cjs` and `node tests/bridge.cjs`.
GitHub additionally compiles both architectures and launches the native WKWebView on Apple Silicon and Intel to check the six tabs, EPS, ingestion, retention, AIO, CSV bridge and native settings bridge. macOS 13 compatibility is a deployment target; the workflow runs on macOS 15, so testing on macOS 13 itself is still needed if supporting that release.

Before customer release, download the notarized ZIP onto a separate Mac and verify Finder launch from Downloads, CSV save/cancel, reset cancel/confirm, settings after quitting/reopening and moving the app, and offline operation. Those interactive checks are not replaced by CI.

## Maintenance

The `website` folder is a snapshot of the calculator. The Mac copy adds a CSV native bridge, an offline content policy and Mac-specific status labels. The original Windows website is unchanged. Update the snapshot and rerun the workflow when calculations or UI change.

Local Mac build alternative: `bash scripts/build.sh` (Xcode command-line tools needed only by the builder). Output goes to a new build/run.* directory on each run.
