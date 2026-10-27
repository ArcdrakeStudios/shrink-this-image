# Language integration

The interface supports German and English. Language selection follows this order:

1. A valid `?lang=de` or `?lang=en` query.
2. The saved `arcdrake-tools-language` preference in localStorage.
3. German when the browser language begins with `de`; otherwise English.

Language changes update the query with `history.replaceState` without reloading
the page. The app preserves the current image, settings and result. It does not
translate filenames or image pixels. The language preference and optional yes/no usage-count choice are stored;
feedback drafts stay in memory.

A script running in the same page, such as site navigation, can dispatch or listen
for the `arcdrake-language-change` event on `window`. This event does not cross iframe boundaries. Its detail is
`{ language: 'de' }` or `{ language: 'en' }`. The interface text and event handling
are implemented in `dist/i18n.js`, which must be included when self-hosting.

The shared feedback copy is translated in place using its EN/DE notices; changing
language preserves the draft, pending send and receipt. Its privacy/contact links
follow the language. Hosts can detect the complete, enabled native
`#language-control select#language` and hide their duplicate language links. The
existing Arcdrake Tools wrapper already does this after deferred app modules load.
Keep that selector and both language options when integrating a wrapper.

`node --experimental-vm-modules --test tests/*.test.mjs` checks static copy,
explicit errors, every shared notice, combined page-only consent warnings and
receipt translation without starting a browser. These deterministic checks do
not establish layout, native validation rendering or translation acceptance.

Run `npm run test:i18n` after following the development setup in
[CONTRIBUTING.md](../CONTRIBUTING.md). It checks translated copy and errors, language
preferences, event handling, state preservation and real downloads. It manages
its own local server and browser.
