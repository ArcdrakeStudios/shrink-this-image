# Self-hosting

Shrink This Image is a static application. The Arcdrake-hosted version is available
at [tools.arcdrake.com/shrink/](https://tools.arcdrake.com/shrink/).

## Package and routing

Create the ZIP using the [packaging instructions](RELEASING.md). Extract its contents
into your host's public directory. Publish only those files, not the repository,
tests or installed development tools. Retain `LICENSE` when redistributing.

The package includes `index.html`, `style.css`, `app.js`, `i18n.js`, `image.js`,
`_headers` and `LICENSE`. Its relative asset URLs support a domain root or a
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
- No backend, database, API token or environment variable is required by the app.
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
5. Confirm image processing sends no image upload or analytics request.
6. Check response headers and footer links.

Keep the previous complete package for rollback. Recheck these journeys after
restoring it.
