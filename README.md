# Shrink This Image

**Make an image fit a file-size limit, privately in your browser.**

Choose a JPG, PNG or WebP, set a size limit, preview the smaller copy and download
it. Your image is processed on your device and is not uploaded.

**[Open Shrink This Image](https://tools.arcdrake.com/shrink/)** ·
[Download source](https://github.com/ArcdrakeStudios/shrink-this-image/archive/refs/heads/main.zip) · [All Arcdrake Tools](https://tools.arcdrake.com/) ·
[Report a bug](https://github.com/ArcdrakeStudios/shrink-this-image/issues)

![Shrink This Image with a synthetic example image](docs/screenshot.png)

[Mobile view](docs/mobile-screenshot.png). Both examples use generated imagery.

## How to use it

1. Choose an image, drop it into the image area, or select **Try a sample image**.
   The synthetic sample is drawn locally and includes transparent margins.
2. Select a file-size limit, output format and optional longest-side limit.
3. Select **Shrink image**, inspect the preview and download the result.

Choose 2 MB, 1 MB, 500 KB, 100 KB or a custom limit from 50 KB to 20 MB. Limits use
decimal units: 100 KB means 100,000 bytes. The app checks the encoded file size and
leaves 2% headroom. It adjusts quality and then dimensions when needed; PNG output
uses resizing. It never enlarges the source image.

JPG, WebP and PNG output are available when supported by your browser. The app
detects an unsuccessful WebP export and suggests JPG or PNG instead. PNG/WebP
preserve transparency; JPG uses a white background. The original is unchanged.
Image orientation is applied, and original embedded metadata is not copied.

The interface is available in **English and German**. Use the language selector,
or open [English](https://tools.arcdrake.com/shrink/?lang=en) or
[Deutsch](https://tools.arcdrake.com/shrink/?lang=de) directly. Switching languages
preserves your image, settings and result.

## Privacy and limits

Images and settings stay in the current tab's memory. There is no account, image
upload or server-side image processing. Closing the tab clears the editing
session; downloads remain on your device.

Optional usage counts default off and require your permission. They send only
product and action codes, including actual compression start and successful
completion. Opt-out, Global Privacy Control and Do Not Track are respected. Counts
are daily action totals, not unique visitors; the current UTC day and 89 prior
days are retained. Only language and the yes/no usage-count choice are stored in
browser storage. No image, filename, URL or task settings enter the counts.

The voluntary feedback form offers Problem, Idea, Ease of use and Other categories.
It sends your message and optional reply email to Arcdrake only when you select
**Send feedback**, even when usage counts are off. The form explains storage,
30-day active visibility, hourly cleanup subject to platform failure, separate
backup/export constraints and receipt-based deletion requests. Failed or
unconfirmed sends keep your text; no request is automatically retried.

The page explains that feedback needs a confirmed receipt from this site's
service. Static hosting alone does not activate collection. If the service is
unavailable, your feedback text stays in the form and compression still works.
Ordinary page requests and any optional sends expose connection metadata to the
hosting provider. See the [Tools privacy notice](https://tools.arcdrake.com/privacy/),
[contact Arcdrake](https://arcdrake.com/contact/) and
[measurement integration](docs/MEASUREMENT-FEEDBACK.md).

Inputs are limited to one still JPG, PNG or WebP up to 40 MB, 40 million pixels and
16,384 pixels per side. Animated images, GIF, SVG, HEIC, AVIF, RAW, video and batch
processing are unsupported. Images are checked before decoding, but not every
camera encoding or device is covered.

Compression may reduce detail or change colour appearance. Small text can become
harder to read, and a tiny original may already be smaller than a new encoding.
Inspect the result before sharing. This tool does not redact visible information.

Use a current browser with `createImageBitmap` and Canvas support. The browser
suite supports Chromium, Firefox and WebKit. CI runs Chromium; Firefox and WebKit
checks are run manually and not on every change. Physical phones,
Safari on Apple hardware and screen-reader compatibility have not been verified.
Earlier WebKit testing found an offline file-reading failure; use the app online
if that occurs. See [compatibility and tests](docs/VERIFICATION.md).

## Optional agent integration

An optional WebMCP integration exposes compression of an image already selected
by the user. It cannot choose new files or automatically download them. It replaces
the current compression result and reports its filename, size and dimensions to
the calling agent. The filename can retain identifying words from the original.
Native WebMCP compatibility has not been verified; normal browser use does not
depend on it.

## Run locally

Download and extract the source ZIP, or clone this repository. Open a terminal
in the resulting folder.

Requires Node.js 24 or newer. No package installation or build step is needed:

```sh
npm start
```

Open http://127.0.0.1:4178 and stop the server with Ctrl+C. Serve the app over HTTP(S);
opening `index.html` as a local file will not load its JavaScript modules.

## Development and self-hosting

The application source is in `dist/`. Install the locked development tools to run
the browser checks:

```sh
npm ci
npx playwright install chromium
npm test
npm run test:ci
npm run test:i18n
npm run package:release
```

Browser checks start and stop their own local server. Packaging creates
`release/shrink-this-image-1.0.0.zip` and a SHA-256 manifest; it does not deploy.
See [packaging](docs/RELEASING.md), [self-hosting](docs/DEPLOYMENT.md),
[contributing](CONTRIBUTING.md) and [security reporting](SECURITY.md).

## Licence

An [Arcdrake](https://arcdrake.com/) product. Free to use, modify and redistribute under the [MIT licence](LICENSE).
See [third-party notices](THIRD_PARTY_NOTICES.md). No external artwork or fonts are
bundled with the application.

Feature requests are welcome in the issue tracker. To contribute an improvement,
see [the contribution guide](CONTRIBUTING.md).
