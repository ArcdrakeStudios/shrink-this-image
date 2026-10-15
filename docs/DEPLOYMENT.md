# Deployment

Serve the static package on an HTTPS host. Production hosting is managed separately
from this source repository; see [release procedure](RELEASING.md).

## Artifact

Run `npm run check`, then `npm run package` in the repository root.
The resulting `release/shrink-this-image-1.0.0.zip` contains `index.html`,
`style.css`, `app.js`, `image.js`, `_headers` and `LICENSE` at its root.
No package installation or bundler is required. Serve `dist/` for source-based
hosting, or extract the ZIP into a static public directory.

The app uses relative asset URLs, so it supports a standalone domain or a
subdirectory. A trailing slash is required when serving it as a directory.
Configure a redirect from a bare directory URL to its trailing-slash version.
There are no application routes and no SPA rewrite is necessary.

## Host configuration

- HTTPS, correct MIME types for `.js`, `.css` and `.html`.
- Publish only `dist/` or the contents of the release ZIP, never the repository
  root, tests, docs or artifacts.
- `_headers` is supplied for hosts supporting that convention. On other hosts,
  translate it into equivalent response headers. The HTML also includes a CSP
  meta tag as a fallback; frame restrictions require response headers.
- No environment variables, billing, databases, API tokens, functions or outbound
  server access are required. No automatic publication workflow is included.
- Revalidate HTML on each visit; immutable caching is inappropriate for these
  unversioned asset filenames. Deploy all files together.
- Existing Imprint and Arcdrake links point to the established company website.
  The app's privacy explanation describes local image handling. The eventual
  host's ordinary access logs should be reflected in that host's privacy notice.

Select an authorized hosting destination and confirm access before deployment.
A locally generated package does not establish hosting ownership or availability.
The static package contains no hosting identifiers or credentials.

## Arcdrake hosting

The planned collection home is `tools.arcdrake.com`, with this app at `/shrink/`.
Hosting is configured separately from this repository. Preserve relative asset
paths, response headers and the existing Imprint link when mounting the app.

## Source publication

The public source is maintained in this repository. Follow [RELEASING.md](RELEASING.md) for protected release preparation and artifact retention.

## Post-deployment smoke check

1. Open the HTTPS page and check the console for asset/CSP errors.
2. Choose a non-private image over 1 MB, choose 100 KB, compress and download.
3. Confirm the file is below 100,000 bytes and displays correctly.
4. Check a transparent PNG and narrow mobile layout.
5. Confirm Network contains only page/assets/blob previews during processing;
   no image upload or telemetry request should occur.
6. Verify response headers and the Imprint link.

These are future deployed-host checks, not unfinished local engineering. Rollback
is replacing the static assets with the preceding complete release.
