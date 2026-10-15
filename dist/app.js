import {translate} from './i18n.js';
import { loadImage, compressImage, validateSettings, formatBytes, downloadName } from './image.js';
const $ = id => document.getElementById(id);
let source = null, bitmap = null, originalUrl = null, resultUrl = null, busy = false, generation = 0;
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function clearResult() {
  $('result').hidden = true; $('download').removeAttribute('href'); $('result-preview').removeAttribute('src');
  if (resultUrl) URL.revokeObjectURL(resultUrl); resultUrl = null;
}
function setBusy(value) {
  busy = value; document.body.classList.toggle('busy', value);
  for (const element of document.querySelectorAll('input,select:not(#language),button')) element.disabled = value;
  $('shrink').disabled = value || !bitmap;
  $('shrink').textContent = value ? 'Working on your device…' : 'Shrink image';
  $('settings').setAttribute('aria-busy', String(value));
}
function clear() {
  if (busy) return;
  generation++; clearResult(); bitmap?.close(); bitmap = null; source = null;
  if (originalUrl) URL.revokeObjectURL(originalUrl); originalUrl = null;
  $('original-preview').removeAttribute('src'); $('file').value = ''; $('replace').value = '';
  $('empty-state').hidden = false; $('loaded-state').hidden = true; $('clear').hidden = true;
  setBusy(false); status('Choose an image to start.');
}
async function choose(files) {
  if (busy) return;
  if (files.length !== 1) { status('Choose one image at a time.', true); return; }
  clear(); const token = ++generation;
  setBusy(true); status('Reading your image…');
  try {
    const next = await loadImage(files[0]);
    if (token !== generation) { next.close(); return; }
    source = files[0]; bitmap = next;
    originalUrl = URL.createObjectURL(source); $('original-preview').src = originalUrl;
    $('filename').textContent = source.name;
    $('original-info').textContent = `${formatBytes(source.size)} · ${bitmap.width.toLocaleString()} × ${bitmap.height.toLocaleString()} px`;
    $('empty-state').hidden = true; $('loaded-state').hidden = false; $('clear').hidden = false;
    status('Image ready. Choose your limit, then shrink.');
  } catch (error) { status(error.message, true); }
  finally { setBusy(false); $('file').value = ''; $('replace').value = ''; }
}
function settings() {
  const target = $('target').value === 'custom' ? Number($('custom-size').value) * Number($('unit').value) : Number($('target').value);
  return validateSettings({ target, format: $('format').value, edge: Number($('edge').value) });
}
function settingsChanged() {
  clearResult(); $('custom-row').hidden = $('target').value !== 'custom';
  $('custom-size').min = $('unit').value === '1000' ? '50' : '0.05';
  $('custom-size').max = $('unit').value === '1000' ? '20000' : '20';
  $('custom-size').step = 'any';
  $('format-note').textContent = $('format').value === 'image/jpeg' ? 'Transparent areas become white in JPG.' : $('format').value === 'image/png' ? 'Keeps transparency. Small limits may need much smaller dimensions.' : 'Keeps transparency. Some upload forms do not accept WebP.';
  status(bitmap ? 'Settings changed. Shrink again for a new download.' : 'Choose an image to start.');
}
async function shrink() {
  if (busy) throw new Error('An image is already being processed.');
  if (!bitmap) throw new Error('Choose an image first.');
  clearResult(); const options = settings(); setBusy(true);
  try {
    const result = await compressImage(bitmap, options, message => status(message));
    resultUrl = URL.createObjectURL(result.blob);
    $('result-preview').src = resultUrl; $('download').href = resultUrl;
    $('download').download = downloadName(source.name, result.blob.type);
    $('result-size').textContent = formatBytes(result.blob.size);
    const saved = 100 * (1 - result.blob.size / source.size);
    $('saving').textContent = saved >= 1 ? `${Math.floor(saved)}% smaller` : 'Fits your limit';
    $('result-info').textContent = `${result.width.toLocaleString()} × ${result.height.toLocaleString()} px · ${result.blob.type.split('/')[1].toUpperCase()} · under ${formatBytes(options.target)}`;
    $('result').hidden = false;
    status(result.blob.size >= source.size ? 'Your original was already small. This new copy fits the limit, but is not smaller.' : 'Done. Preview your image and download when ready.');
    return { bytes: result.blob.size, width: result.width, height: result.height, format: result.blob.type, filename: $('download').download };
  } finally { setBusy(false); }
}
$('settings').addEventListener('submit', event => { event.preventDefault(); shrink().catch(error => status(error.message, true)); });
$('settings').addEventListener('input', settingsChanged);
$('clear').addEventListener('click', clear);
for (const id of ['file', 'replace']) $(id).addEventListener('change', event => { const files = [...event.target.files]; if (files.length) choose(files); });
// Prevent an accidental drop outside the target from navigating away with the file.
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
$('dropzone').addEventListener('dragover', event => { event.preventDefault(); if (!busy) $('dropzone').classList.add('dragover'); });
$('dropzone').addEventListener('dragleave', () => $('dropzone').classList.remove('dragover'));
$('dropzone').addEventListener('drop', event => { event.preventDefault(); $('dropzone').classList.remove('dragover'); choose([...event.dataTransfer.files]); });

// Optional agent access to the same visible action; no file access or silent download.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'compress_selected_image', title: translate('Compress selected image'),
      description: translate('Compress the image the user has already selected, using the visible settings. Shows a preview and download link; does not save a file.'),
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async input => {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
        try { return await shrink(); } catch (error) { status(error.message, true); throw error; }
      }
    }, { signal: lifecycle.signal })).catch(() => {});
  } catch { /* Unsupported optional API does not affect the image tool. */ }
}
