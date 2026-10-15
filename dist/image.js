export const MAX_BYTES = 40_000_000;
export const MAX_PIXELS = 40_000_000;
export const FORMATS = ['image/jpeg', 'image/webp', 'image/png'];

export function validateDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error('This image has invalid dimensions.');
  if (width > 16384 || height > 16384 || width * height > MAX_PIXELS) throw new Error('This image is too large to process safely. Use an image under 40 million pixels and 16,384 pixels per side.');
  return { width, height };
}

// Inspect headers before asking the browser to allocate decoded pixels.
export function inspectImage(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const text = (start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
  const invalid = () => { throw new Error('This file is damaged or is not a supported JPG, PNG or WebP image.'); };
  let width, height, type;
  if (bytes.length >= 33 && text(1, 3) === 'PNG' && bytes[0] === 137 && text(12, 4) === 'IHDR') {
    type = 'image/png'; width = view.getUint32(16); height = view.getUint32(20);
    for (let at = 8; at + 12 <= bytes.length;) {
      const length = view.getUint32(at), chunk = text(at + 4, 4);
      if (at + 12 + length > bytes.length) invalid();
      if (chunk === 'acTL') throw new Error('Animated PNG is not supported. Choose a still image.');
      at += 12 + length;
      if (chunk === 'IEND') break;
    }
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    type = 'image/jpeg';
    for (let at = 2; at < bytes.length;) {
      if (bytes[at++] !== 255) invalid();
      while (bytes[at] === 255) at++;
      const marker = bytes[at++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (at + 2 > bytes.length) invalid();
      const length = view.getUint16(at);
      if (length < 2 || at + length > bytes.length) invalid();
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        if (length < 8) invalid();
        height = view.getUint16(at + 3); width = view.getUint16(at + 5); break;
      }
      at += length;
    }
  } else if (bytes.length >= 30 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
    type = 'image/webp';
    const end = view.getUint32(4, true) + 8;
    if (end > bytes.length) invalid();
    for (let at = 12; at + 8 <= end;) {
      const chunk = text(at, 4), length = view.getUint32(at + 4, true), p = at + 8;
      if (p + length > end) invalid();
      if (chunk === 'ANIM' || chunk === 'ANMF') throw new Error('Animated WebP is not supported. Choose a still image.');
      if (chunk === 'VP8X') {
        if (length < 10) invalid();
        if (bytes[p] & 2) throw new Error('Animated WebP is not supported. Choose a still image.');
        width = 1 + bytes[p+4] + (bytes[p+5] << 8) + (bytes[p+6] << 16);
        height = 1 + bytes[p+7] + (bytes[p+8] << 8) + (bytes[p+9] << 16);
      } else if (chunk === 'VP8 ' && width === undefined) {
        if (length < 10 || text(p+3, 3) !== '\x9d\x01\x2a') invalid();
        width = view.getUint16(p+6, true) & 16383; height = view.getUint16(p+8, true) & 16383;
      } else if (chunk === 'VP8L' && width === undefined) {
        if (length < 5 || bytes[p] !== 47) invalid();
        const bits = view.getUint32(p+1, true);
        width = (bits & 16383) + 1; height = ((bits >>> 14) & 16383) + 1;
      }
      at = p + length + (length % 2);
    }
  } else invalid();
  return { ...validateDimensions(width, height), type };
}

export function validateSettings({ target, format, edge }) {
  if (!Number.isFinite(target) || target < 50_000 || target > 20_000_000) throw new Error('Choose a limit from 50 KB to 20 MB.');
  if (!FORMATS.includes(format)) throw new Error('Choose JPG, WebP or PNG.');
  if (![800,1280,1920,4096].includes(edge)) throw new Error('Choose a supported longest-side limit.');
  return { target: Math.floor(target), format, edge };
}

export function fitDimensions(width, height, edge) {
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}

export function downloadName(name, format) {
  const stem = name.replace(/\.[^.]*$/, '').replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 80).replace(/^-+|-+$/g, '') || 'image';
  return `${stem}-small.${{ 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' }[format]}`;
}

export function formatBytes(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
}

export async function loadImage(file) {
  if (!file || file.size === 0) throw new Error('Choose a non-empty JPG, PNG or WebP image.');
  if (file.size > MAX_BYTES) throw new Error('This file is over 40 MB. Choose a smaller image.');
  let buffer;
  try { buffer = await file.arrayBuffer(); }
  catch { throw new Error('Your browser could not read this local file. Try choosing it again or use another browser.'); }
  const header = inspectImage(buffer);
  let bitmap;
  try { bitmap = await createImageBitmap(new Blob([file], { type: header.type }), { imageOrientation: 'from-image' }); }
  catch { throw new Error('Your browser could not read this image. Try another JPG, PNG or WebP file.'); }
  try { validateDimensions(bitmap.width, bitmap.height); }
  catch (error) { bitmap.close(); throw error; }
  return bitmap;
}

function encode(canvas, format, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob || blob.size === 0) reject(new Error('Your browser could not create this image. Try a smaller image.'));
    else if (blob.type !== format) reject(new Error('Your browser cannot export that format. Choose JPG or PNG.'));
    else resolve(blob);
  }, format, quality));
}

// The file-size contract is checked on real encoded bytes, never an estimate.
export async function compressImage(bitmap, options, onProgress = () => {}) {
  const { target, format, edge } = validateSettings(options);
  const budget = Math.floor(target * .98);
  let { width, height } = fitDimensions(bitmap.width, bitmap.height, edge);
  const canvas = document.createElement('canvas');
  try {
    for (let round = 0; round < 24; round++) {
      onProgress(`Finding a good fit… ${width.toLocaleString()} × ${height.toLocaleString()} px`);
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image processing is unavailable in this browser.');
      if (format === 'image/jpeg') { context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); }
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, width, height);
      let best = await encode(canvas, format, .92), quality = format === 'image/png' ? null : .92;
      if (best.size <= budget) return { blob: best, width, height, quality };
      if (format !== 'image/png') {
        const lowBlob = await encode(canvas, format, .55);
        if (lowBlob.size <= budget) {
          let low = .55, high = .92;
          best = lowBlob; quality = low;
          for (let attempt = 0; attempt < 7; attempt++) {
            const middle = (low + high) / 2, candidate = await encode(canvas, format, middle);
            if (candidate.size <= budget) { best = candidate; quality = middle; low = middle; }
            else high = middle;
          }
          return { blob: best, width, height, quality };
        }
        best = lowBlob;
      }
      if (width === 1 && height === 1) break;
      const scale = Math.max(.5, Math.min(.85, Math.sqrt(budget / best.size) * .92));
      // Always derive from original aspect ratio, avoiding rounding drift.
      const nextEdge = Math.max(1, Math.floor(Math.max(width, height) * scale));
      ({ width, height } = fitDimensions(bitmap.width, bitmap.height, nextEdge));
    }
    throw new Error('Could not fit this image. Try a larger limit or another format.');
  } finally { canvas.width = 1; canvas.height = 1; }
}
