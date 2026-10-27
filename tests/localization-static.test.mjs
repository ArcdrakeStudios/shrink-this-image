import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture} from './helpers/app-fixture.mjs';

test('static page copy, availability, accessible labels and explicit errors have German translations', async () => {
  const f = await fixture({optedIn:false});
  f.language.setLanguage('de');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const markup = html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/g, '');
  const allowed = new Set(['Feedback','▧','ARCDRAKE','.','01','02','KB','MB','Arcdrake']);
  const texts = [...markup.matchAll(/>([^<]+)/g)].map(match => match[1].trim()).filter(Boolean);
  const attributes = [...markup.matchAll(/(?:aria-label|alt)="([^"]+)"/g)].map(match => match[1]);
  const missing = [...texts,...attributes].filter(text => !allowed.has(text) && f.language.translate(text) === text);
  assert.deepEqual(missing, []);
  assert.doesNotMatch(markup, /Local preview|local build|not activated|Lokale Vorschau/);
  for (const name of ['image','app','sample']) {
    const source = await readFile(new URL(`../dist/${name}.js`, import.meta.url), 'utf8');
    const messages = [...source.matchAll(/(?:new Error|throw Error)\('([^']+)'\)/g)].map(match => match[1]);
    for (const message of messages) assert.notEqual(f.language.translate(message), message, message);
  }
});
