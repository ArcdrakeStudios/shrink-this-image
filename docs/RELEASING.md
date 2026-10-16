# Packaging

The hosted app is at [tools.arcdrake.com/shrink/](https://tools.arcdrake.com/shrink/).
This repository contains its source and packaging tools. Repository CI and artifact
preparation do not deploy the hosted app.

With Node.js 24 or newer, run from the repository root:

```sh
npm test
npm run package:release
```

These commands need no package installation. Browser checks require the development
setup in [CONTRIBUTING.md](../CONTRIBUTING.md).

The package command writes:

- `release/shrink-this-image-1.0.0.zip`, containing the static app and licence.
- `release/manifest.json`, listing each file's size and SHA-256 hash, plus the
  archive's size and hash.

The ZIP contains `index.html`, `style.css`, `app.js`, `i18n.js`, `image.js`,
`_headers` and `LICENSE`. No development dependencies or test outputs are included.
The manual **Prepare release artifact** GitHub workflow runs checks and uploads
the package identified by its source commit.

For host configuration and a deployment check, see [self-hosting](DEPLOYMENT.md).
