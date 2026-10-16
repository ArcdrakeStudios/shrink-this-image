# Compatibility and tests

## Browser coverage

The browser suite supports Chromium, Firefox and WebKit desktop engines, including
390px and 320px layouts and enlarged text. CI and the latest local checks run
Chromium. Firefox and WebKit passed earlier local checks; they were not rerun in
the latest check. The tests use synthetic images and real browser encoders and
downloads.

Physical phones, Safari on Apple hardware, screen-reader use, very low-memory
devices, HDR/wide-gamut fidelity and every camera encoding have not been verified.
A test in Playwright's WebKit engine does not establish Safari device compatibility.
The app does not promise visually lossless output or complete metadata forensics.

### Offline use

Processing after the page has loaded passed the current Chromium checks and
earlier Firefox checks. In earlier Playwright WebKit testing, reading a newly
selected local file in offline mode failed with `NotReadableError`. A minimal
file-reading probe reproduced the failure outside the app. The app displays an error when it cannot read a file; successful
offline operation on Safari devices is not established.

### Optional WebMCP integration

The integration is feature-detected and does not affect ordinary browser use.
Native WebMCP compatibility has not been verified. The integration can process an
image the user has already selected; it cannot select a new file or download it
automatically. See the [README](../README.md) for the data it returns.

## What the tests cover

- Encoded bytes below the chosen size limit, and downloaded JPEG signatures.
- PNG/WebP transparency and a white background for JPG output.
- EXIF orientation and omission of the original EXIF marker.
- Corrupt, animated, unsupported and oversized inputs.
- Invalid custom limits, clearing, replacement, stale results and recovery.
- Narrow layouts, enlarged text, a basic keyboard focus check and offline behavior.
- German/English copy, language preferences, state preservation and downloads.

These checks are not a complete accessibility audit. Test reports, screenshots and
downloads are written to the ignored `artifacts/` directory.

## Run the checks

Use Node.js 24 or newer:

```sh
npm ci
npx playwright install chromium firefox webkit
npm test
npm run test:ci
npm run test:i18n
```

On Linux, add `--with-deps` to the Playwright install command for browser libraries.
`test:ci` uses Chromium by default and manages its own preview server. Select other
engines in PowerShell with:

```powershell
$env:BROWSER = 'firefox'
npm run test:ci
$env:BROWSER = 'webkit'
npm run test:ci
Remove-Item Env:BROWSER
```

In a POSIX shell, use `BROWSER=firefox npm run test:ci` and
`BROWSER=webkit npm run test:ci`.

For the focused WebKit offline probe, start `npm start` in another terminal.
Then run:

```sh
node -e "require('node:fs').mkdirSync('artifacts', {recursive: true})"
node tests/webkit-offline-probe.mjs
```

It writes `artifacts/webkit-offline-probe.json`. Stop the preview server with Ctrl+C.
The direct `npm run test:browser` command also needs a running server; prefer
`npm run test:ci` for the managed-server version.
