import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext, SourceTextModule} from 'node:vm';
import {fileURLToPath} from 'node:url';

// In-process control-flow harness, not a browser or real image encoder.
class Element {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase(); this.ownerDocument = doc;
    this.children = []; this.listeners = {}; this.attributes = {}; this.value = '';
    this.hidden = false; this.disabled = false; this.validity = {};
    this.classList = {toggle() {}, add() {}, remove() {}};
  }
  append(child) { child.parentElement = this; this.children.push(child); }
  set textContent(value) {
    this.children = []; this._text = value;
    const element = this;
    this.textNode = {parentElement: this, get data() { return element._text; }, set data(next) { element._text = next; }};
  }
  get textContent() { return this._text ?? ''; }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  hasAttribute(key) { return key in this.attributes; }
  removeAttribute(key) { delete this.attributes[key]; delete this[key]; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  focus() { this.ownerDocument.focused = this; }
  setCustomValidity(value) { this.validity.customError = !!value; }
  closest() { return null; }
  reset() { for (const el of descendants(this)) if (['INPUT', 'TEXTAREA'].includes(el.tagName)) el.value = ''; }
  remove() {}
  set innerHTML(_value) { assert.fail('No HTML rendering'); }
}
export const descendants = el => [el, ...el.children.flatMap(descendants)];
export async function fixture({optedIn = true, privacy = {}, unavailable = false, fetchImpl, storageUnavailable = false} = {}) {
  const elements = new Map(), requests = [], saved = new Map();
  if (optedIn) saved.set('arcdrake.analytics.v1', 'yes');
  const doc = {focused: null, addEventListener() {},
    getElementById: id => elements.get(id),
    createTreeWalker() {
      const nodes = [...new Set([...elements.values(),header].flatMap(descendants))].map(el => el.textNode).filter(Boolean);
      let index = 0;
      return {currentNode:null, nextNode() { this.currentNode = nodes[index++]; return !!this.currentNode; }};
    },
    querySelector: selector => selector === 'header' ? header : null,
    querySelectorAll(selector) {
      if (selector === '.workspace input,.workspace select,.workspace button') return workspace;
      if (selector === 'input') return workspace.filter(el => el.tagName === 'INPUT');
      if (selector === '#measurement-feedback a') return descendants(elements.get('measurement-feedback')).filter(el => el.tagName === 'A');
      return [];
    },
    createElement(tag) {
      const el = new Element(tag, doc);
      if (tag === 'canvas') {
        el.getContext = () => ({fillStyle: '', fillRect() {}, drawImage() {}, beginPath() {}, arc() {}, fill() {},
          createLinearGradient: () => ({addColorStop() {}})});
        el.toBlob = (callback, format) => {
          if (state.encodeFailure) { callback(null); return; }
          const bytes = new Uint8Array(1000);
          // Enough header for inspectImage; decoding and encoding are simulated.
          bytes.set([137,80,78,71,13,10,26,10]);
          const view = new DataView(bytes.buffer); view.setUint32(8,13);
          bytes.set(Buffer.from('IHDR'),12); view.setUint32(16,1600); view.setUint32(20,1000);
          bytes.set(Buffer.from('IEND'),37);
          const finish = () => callback(new Blob([bytes], {type: format}));
          if (state.holdEncode) state.finishEncode = finish; else finish();
        };
      }
      return el;
    },
  };
  doc.documentElement = new Element('html', doc); doc.body = new Element('body', doc);
  const header = new Element('header', doc), workspace = [];
  const html = await readFile(new URL('../../dist/index.html', import.meta.url), 'utf8');
  for (const [, tag, id] of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"/g)) {
    const el = new Element(tag, doc); elements.set(id, el);
    if (['input','select','button'].includes(tag)) workspace.push(el);
  }
  for (const [id, value] of Object.entries({target:'100000',format:'image/jpeg',edge:'1920','custom-size':'250',unit:'1000'})) elements.get(id).value = value;
  // i18n creates its own native selector, as in the actual app.
  const originalAppend = Element.prototype.append;
  header.append = child => { originalAppend.call(header, child); for (const node of descendants(child)) if (node.id) elements.set(node.id, node); };
  const state = {encodeFailure: false};
  const listeners = {};
  const window = {addEventListener(name, fn) { (listeners[name] ??= []).push(fn); },
    dispatchEvent(event) { for (const fn of listeners[event.type] ?? []) fn(event); }};
  const location = new URL('https://preview.invalid/shrink/?keep=1#result');
  let objectId = 0;
  class LocalURL extends URL { static createObjectURL() { return `blob:synthetic-${++objectId}`; } static revokeObjectURL() {} }
  const context = createContext({document: doc, window, location, URL: LocalURL, URLSearchParams,
    history: {state: {draft: true}, replaceState(_state, _title, next) { location.href = next.href; }},
    localStorage: {getItem: key => { if (storageUnavailable) throw Error('synthetic storage failure'); return saved.get(key); }, setItem: (key, value) => { if (storageUnavailable) throw Error('synthetic storage failure'); saved.set(key,value); }, removeItem: key => saved.delete(key)},
    navigator: {language: 'en', ...privacy}, NodeFilter: {SHOW_TEXT: 4},
    MutationObserver: class {observe() {}},
    CustomEvent: class {constructor(type, options) { this.type = type; this.detail = options.detail; }},
    Blob, File, Buffer, AbortController, setTimeout, clearTimeout,
    createImageBitmap: async () => ({width:1600,height:1000,close() {}}),
    fetch: async (path, options) => {
      requests.push({path,options,body:JSON.parse(options.body)});
      if (fetchImpl) return fetchImpl(path, options);
      return unavailable ? Response.json({ok:false,error:'unavailable'}, {status:503}) :
        Response.json(path === '/api/feedback' ? {ok:true,id:'0d4d0a14-6468-4947-a670-28bbddbcc33c'} : {ok:true}, {status:202});
    },
  });
  const modules = new Map();
  async function load(url) {
    if (modules.has(url.href)) return modules.get(url.href);
    const module = new SourceTextModule(await readFile(fileURLToPath(url), 'utf8'), {context, identifier:url.href});
    modules.set(url.href, module);
    await module.link((specifier, referencing) => load(new URL(specifier, referencing.identifier)));
    return module;
  }
  const app = await load(new URL('../../dist/app.js', import.meta.url)); await app.evaluate();
  const flush = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
  await flush();
  const events = () => requests.filter(call => call.path === '/api/events').map(call => call.body.event);
  return {doc,elements,requests,state,window,saved,events,flush,
    notices: modules.get(new URL('../../dist/shared/measurement-feedback-client.mjs', import.meta.url).href).namespace.NOTICES,
    language: modules.get(new URL('../../dist/i18n.js', import.meta.url).href).namespace,
    async sample() { await elements.get('sample').listeners.click(); await flush(); },
    async shrink() { elements.get('settings').listeners.submit({preventDefault() {}}); await flush(); },
  };
}
