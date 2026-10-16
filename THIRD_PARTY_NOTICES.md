# Third-party materials

The shipped static app has no bundled third-party JavaScript packages, fonts,
images or icon libraries. Its favicon is inline SVG; its interface uses system
fonts and browser Canvas/image APIs. The MIT copyright notice in
[LICENSE](LICENSE) names Michael Eigner-Dietl, 2026. Retain applicable author and
licence notices when redistributing.

Documentation screenshots use project-created synthetic examples, not private
photographs or client content.

Browser tests use the pinned Playwright development dependency and its browsers.
Node.js, Playwright and browser binaries are not included in the static release;
their own licenses apply to those installations. No third-party redistribution
notice is currently required by the included runtime-asset inventory. Recheck
this inventory before adding a package, font, image, icon or generated asset.

## Development dependencies

Playwright is pinned in package-lock.json for browser regression tests and is licensed under Apache-2.0. It and its downloaded browser binaries are development tools, not bundled static application assets. Consult their distributed license files when installing or redistributing them.
