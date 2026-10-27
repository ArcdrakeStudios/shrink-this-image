# Self-hosting

Shrink This Image is a static application. The Arcdrake-hosted version is available
at [tools.arcdrake.com/shrink/](https://tools.arcdrake.com/shrink/).

## Package and routing

Create the ZIP using the [packaging instructions](RELEASING.md). Extract its contents
into your host's public directory. Publish only those files, not the repository,
tests or installed development tools. Retain `LICENSE` when redistributing.

The package includes `index.html`, `style.css`, `app.js`, `i18n.js`, `image.js`,
`sample.js`, `feedback.js`, both modules in `shared/`, `_headers` and `LICENSE`. Its relative asset URLs support a domain root or a
subdirectory such as `/shrink/`. Redirect a directory URL without a trailing slash
to its trailing-slash form. No single-page application rewrite is needed.

## Host configuration

- Use HTTPS and correct MIME types for JavaScript, CSS and HTML.
- Apply the supplied `_headers` rules if your host supports that file. Otherwise
  configure equivalent response headers and exclude `_headers` from publicly
  served files. The HTML's CSP meta tag is a fallback; frame restrictions require
  response headers.
- Deploy all files together. Revalidate HTML on visits and avoid immutable caching
  for unversioned asset names.
- Image processing needs no backend. Optional counts and feedback require the
  same-origin host integration described in [measurement and feedback](MEASUREMENT-FEEDBACK.md).
  No browser API token or privileged secret belongs in these static files.
- Document your host's ordinary access logs in your privacy notice. The app's local
  processing promise does not mean that visiting a hosted page makes no requests.

## Links in your own copy

The footer links to Arcdrake, its legal notice and its support page. Review these
links before publishing your own copy and use contact/legal information appropriate
to your hosting operation. `dist/i18n.js` also changes the company and legal links
when the language changes, so update both language targets if you customize them.
Retain the source copyright and licence notices.

## Check your deployment

1. Open the HTTPS page in English and German and check for asset or CSP errors.
2. Choose a synthetic image larger than 1 MB, select 100 KB, compress and download.
3. Confirm the file is below 100,000 bytes and displays correctly.
4. Check a transparent PNG and a narrow viewport.
5. Confirm no image is uploaded. With usage counts off, no events are sent.
   With consent, inspect that event bodies contain only product and action codes.
   Verify explicit feedback send, unavailable responses and both notice languages.
6. Check response headers and footer links.

Keep the previous complete package for rollback. Recheck these journeys after
restoring it.

The canonical consent style block is permitted by its exact SHA-256 (`sha256-VHXTEYUc0+/a/3/pxtfczPbGydBF1J/t2RF/LB9heIo=`), alongside same-origin styles. All intersecting host style-src policies need the same exact token; never substitute unsafe-inline. The CSP regression hashes the immutable copied source block and verifies the permission. Other directives remain unchanged.
