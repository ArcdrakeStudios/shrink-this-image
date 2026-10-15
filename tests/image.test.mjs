import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectImage, validateSettings, validateDimensions, fitDimensions, downloadName, formatBytes } from '../dist/image.js';

function png(width, height, animated = false) {
  const buffer = new ArrayBuffer(animated ? 65 : 45), v = new DataView(buffer), b = new Uint8Array(buffer);
  b.set([137,80,78,71,13,10,26,10]); v.setUint32(8,13); b.set(Buffer.from('IHDR'),12);
  v.setUint32(16,width); v.setUint32(20,height);
  if (animated) { v.setUint32(33,8); b.set(Buffer.from('acTL'),37); b.set(Buffer.from('IEND'),57); }
  else b.set(Buffer.from('IEND'),37);
  return buffer;
}
test('PNG dimensions are inspected before decoding; animation is rejected', () => {
  assert.deepEqual(inspectImage(png(600,400)),{width:600,height:400,type:'image/png'});
  assert.throws(()=>inspectImage(png(600,400,true)),/Animated PNG/);
});
test('oversized and invalid dimensions cannot enter the decoder', () => {
  for (const [w,h] of [[0,1],[1,-1],[16385,1],[9000,9000],[1.5,2]]) assert.throws(()=>validateDimensions(w,h));
  assert.throws(()=>inspectImage(png(12000,12000)),/too large/);
  assert.deepEqual(validateDimensions(8000,5000),{width:8000,height:5000});
});
test('JPEG marker lengths and dimensions', () => {
  const b = Uint8Array.from([255,216,255,224,0,4,0,0,255,192,0,8,8,1,144,2,88,3]);
  assert.deepEqual(inspectImage(b.buffer),{width:600,height:400,type:'image/jpeg'});
  b[5]=255; assert.throws(()=>inspectImage(b.buffer),/damaged/);
});
test('WebP extended header and animation flag', () => {
  const b = new Uint8Array(30), v = new DataView(b.buffer);
  b.set(Buffer.from('RIFF')); v.setUint32(4,22,true); b.set(Buffer.from('WEBPVP8X'),8); v.setUint32(16,10,true);
  b[24]=99; b[27]=79;
  assert.deepEqual(inspectImage(b.buffer),{width:100,height:80,type:'image/webp'});
  b[20]=2; assert.throws(()=>inspectImage(b.buffer),/Animated WebP/);
});
test('malformed or foreign input gives a recoverable error', () => {
  for(const input of [new ArrayBuffer(0),Uint8Array.from(Buffer.from('<svg/>')).buffer,new Uint8Array([1,2,3,4]).buffer]) assert.throws(()=>inspectImage(input));
});
test('target ranges and supported encoders are enforced', () => {
  const good = {target:100000,format:'image/jpeg',edge:1920};
  assert.deepEqual(validateSettings(good),good);
  for(const target of [NaN,Infinity,0,-1,49999,20000001]) assert.throws(()=>validateSettings({...good,target}));
  assert.throws(()=>validateSettings({...good,format:'image/gif'}));
  assert.throws(()=>validateSettings({...good,edge:0}));
});
test('resize never upscales, respects ratio and handles narrow images', () => {
  assert.deepEqual(fitDimensions(600,400,1920),{width:600,height:400});
  assert.deepEqual(fitDimensions(6000,4000,1920),{width:1920,height:1280});
  assert.deepEqual(fitDimensions(1,1000,800),{width:1,height:800});
});
test('safe downloads have correct extension and friendly units', () => {
  assert.equal(downloadName('../../my photo.PNG','image/jpeg'),'my-photo-small.jpg');
  assert.equal(downloadName('Grüße.webp','image/webp'),'Grüße-small.webp');
  assert.equal(downloadName('.png','image/png'),'image-small.png');
  assert.equal(formatBytes(1000000),'1.00 MB'); assert.equal(formatBytes(50000),'50.0 KB');
});
