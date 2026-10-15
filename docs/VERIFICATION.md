# Verification

## Browser and packaging checks — 14 October 2026

Release version 1.0.0. Node 24.14.0,
syntax checks and 8/8 deterministic tests passed. The browser suite passed
20 checks each in Chromium 151.0.7922.34 and Firefox 153.0; WebKit 26.5 passed
19 ordinary checks and its graceful offline-error check. Real saved JPEG downloads
matched advertised bytes/signature. The suite covers 100 KB and 50 KB limits,
transparency, orientation, invalid files, recovery, 390/320px layouts and 200% text.
Desktop/mobile result screenshots were visually inspected; controls and preview
remain readable without horizontal overflow. `docs/mobile-screenshot.png` is the
synthetic-data mobile example. No external runtime request or page error
was observed.

Physical devices, screen readers, native WebMCP and the hosted HTTPS origin were
not tested in this run. The original engine-specific limits below remain applicable.

## Original verification — 8 October 2026

### Result

The local checks below passed. Physical devices were not tested.
The static app requires no runtime dependencies.

- `npm run check`: JavaScript syntax checks and **8/8 deterministic tests** passed.
- Chromium **151.0.7922.34**: **20 browser checks** passed.
- Firefox **153.0**: **20 browser checks** passed.
- WebKit **26.5**: **19 ordinary checks plus one graceful offline-error check**
  passed. Successful offline file loading is not established for this engine.
- Desktop and mobile screenshots were visually inspected. Layout checks at 390
  and 320 CSS pixels, plus 200% base text size, found no horizontal overflow.
- Browser traffic contained only localhost page/assets and local blob previews;
  no external requests or uncaught application errors were observed.

### What was exercised

A deterministic 2400×1600 noise/text fixture produced a real JPEG below 100,000
bytes; a custom 50,000-byte limit also succeeded. The downloaded file's size,
filename and JPEG magic bytes were checked independently of its UI label.

The browser journeys include PNG and WebP transparency, explicit white flattening
for JPG, EXIF orientation 6 (400×300 becomes 300×400), removal of the input EXIF
marker, invalid custom limits, corrupted and unsupported inputs, oversize pixel
headers, clear/reset, replacing a result with a bad file, stale-output removal
after changing settings, recovery after errors, one Tab press moving focus into the page, and offline
processing in Chromium/Firefox. Unit cases additionally cover animated PNG and
WebP flags, malformed header lengths, dimensions, filename sanitizing and targets.

Tests use actual browser encoders. The harness records the blobs created by
`URL.createObjectURL` for byte inspection; the app's CSP intentionally disallows
fetch requests, so it does not fetch its own blobs in the test. The saved download
is also read from disk and compared. No CSP or network interception is used to
make the privacy check pass.

### WebKit offline limitation

The first WebKit run failed when attempting to read a new file under Playwright's
`setOffline(true)`. A standalone probe, without application logic, reproduced
`NotReadableError: The I/O read operation failed` for both `Blob.arrayBuffer()`
and `FileReader` on a newly created 11-byte local blob. Both worked online.
An in-page File produced the same outcome, ruling out only the driver-upload
transport as the cause.

The app now gives a readable error for any failed local-file read. WebKit's final
test records that graceful failure instead of claiming successful offline support.
Use the reproduction commands below for the focused file-reading probe. No Safari-specific workaround
or unverified assertion about a real disconnected Apple device is included.

### Evidence and limits

Reproducible scripts: `tests/image.test.mjs`, `tests/browser.mjs` and the focused
WebKit probe. Running `npm run test:ci` writes reports, desktop/mobile screenshots
and downloads to the ignored `artifacts/` directory. Those generated files are not
included in this repository.
`docs/screenshot.png` is the distributable, synthetic-data initial-screen preview.

Native WebMCP validation was unavailable: the installed browser context did not
provide the proposed `document.modelContext` interface. Its optional registration
is feature-detected and does not gate or alter normal UI operation. No native
WebMCP conformance claim is made.

Not tested: physical phones, native Safari on Apple hardware, HDR/wide-gamut
fidelity, every camera encoding, very low-memory devices, screen-reader interaction
or every host's response-header interpretation. The app does not claim perfect
colour preservation, perceptual quality or complete metadata forensics.

A one-off local verification on 14 October opened the final release ZIP with
Python zipfile, ran testzip() for CRC integrity, checked its six allowed entries,
and compared every entry byte-for-byte with the source assets and LICENSE. This
manual packaging check is not part of the published test commands above.
Deployment instructions preserve a final HTTPS/headers smoke check for the chosen
host.

## Reproduce browser checks

Install Node.js 24 or newer, then install the locked dependencies and engines:

```sh
npm ci
npx playwright install chromium firefox webkit
```

On Linux, use `npx playwright install --with-deps chromium firefox webkit` to
install the required system libraries as well.

The CI wrapper starts and stops its own preview server. Run Chromium with
`npm run test:ci`. To select the other engines, use these PowerShell commands:

```powershell
$env:BROWSER = 'firefox'
npm run test:ci
$env:BROWSER = 'webkit'
npm run test:ci
Remove-Item Env:BROWSER
```

In a POSIX shell, use `BROWSER=firefox npm run test:ci` and
`BROWSER=webkit npm run test:ci` instead.

For the standalone offline probe, start `npm start` in a separate terminal and
leave it running at http://127.0.0.1:4178. In the repository root, run:

```sh
node -e "require('node:fs').mkdirSync('artifacts', {recursive: true})"
node tests/webkit-offline-probe.mjs
```

The probe writes `artifacts/webkit-offline-probe.json`. Stop the preview server
with Ctrl+C afterward. The direct `npm run test:browser` command also requires
this separately running server; `npm run test:ci` manages the server for you.
