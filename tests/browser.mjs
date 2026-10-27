import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium, firefox, webkit } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const output = resolve('artifacts'); await mkdir(output,{recursive:true});
const engine = process.env.BROWSER || 'chromium';
const browser = await ({chromium,firefox,webkit}[engine]).launch({headless:true});
const context = await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1050}});
const page = await context.newPage();
const errors = [], requests = [], passed = [], limitations = [];
page.on('pageerror',e=>errors.push(e.message)); page.on('request',r=>requests.push(r.url()));
const check = (name, fn) => { fn(); passed.push(name); };
try {
  await page.addInitScript(() => { window.__blobs = new Map(); const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL); URL.createObjectURL = blob => { const url = create(blob); window.__blobs.set(url, blob); return url; }; URL.revokeObjectURL = url => { window.__blobs.delete(url); revoke(url); }; });
  await page.goto('http://127.0.0.1:4178');
  await page.getByRole('dialog').getByRole('button', {name:'Continue without usage counts'}).click();
  await page.screenshot({path:resolve(output,`${engine}-desktop-empty.png`),fullPage:true});
  assert.equal(await page.locator('#shrink').isDisabled(),true);passed.push('primary action starts disabled');
  // Deterministic photographic-like noise exercises real encoders, not mocked sizes.
  const fixtures = await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1600;
    const ctx=canvas.getContext('2d'),data=ctx.createImageData(canvas.width,canvas.height);
    let seed=123456789;
    for(let i=0;i<data.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed>>>24;data.data[i]=n;data.data[i+1]=(n+Math.floor(i/4/2400))%256;data.data[i+2]=Math.floor(i/4)%256;data.data[i+3]=255;}
    ctx.putImageData(data,0,0);ctx.fillStyle='#17253d';ctx.fillRect(100,120,1300,240);ctx.fillStyle='white';ctx.font='bold 100px sans-serif';ctx.fillText('A file that fits.',150,275);
    const encoded=canvas.toDataURL('image/png').split(',')[1];
    canvas.width=400;canvas.height=300;ctx.fillStyle='#e22c5b';ctx.fillRect(100,80,200,140);
    return {noise:encoded,transparent:canvas.toDataURL('image/png').split(',')[1],jpeg:canvas.toDataURL('image/jpeg',.9).split(',')[1]};
  });
  const upload = async(buffer,name='test-image.png',mimeType='image/png') => {
    const selector = await page.locator('#loaded-state').isVisible() ? '#replace' : '#file';
    await page.locator(selector).setInputFiles({name,mimeType,buffer});
    await page.waitForFunction(()=>!document.body.classList.contains('busy'));
  };
  const compress = async() => {
    await page.locator('#shrink').click();
    await page.locator('#result').waitFor({state:'visible',timeout:60000});
    assert.equal(await page.locator('#shrink').isDisabled(),false);
  };
  await upload(Buffer.from(fixtures.noise,'base64'));
  await page.locator('#target').selectOption('100000'); await compress();
  let result = await page.evaluate(async()=>{
    const blob=window.__blobs.get(document.querySelector('#download').href);
    const img=await createImageBitmap(blob);const value={bytes:blob.size,type:blob.type,width:img.width,height:img.height};img.close();return value;
  });
  check('100 KB target is met by real bytes with correct JPG encoding',()=>{assert(result.bytes<100000);assert.equal(result.type,'image/jpeg');assert(result.width<2400);assert(result.height<1600);});
  const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadPromise;
  await download.saveAs(resolve(output,`${engine}-download.jpg`));const saved=await readFile(resolve(output,`${engine}-download.jpg`));
  check('downloaded file matches advertised bytes and JPEG signature',()=>{assert.equal(saved.length,result.bytes);assert.equal(saved[0],255);assert.equal(saved[1],216);assert.equal(download.suggestedFilename(),'test-image-small.jpg');});
  await page.screenshot({path:resolve(output,`${engine}-desktop-result.png`),fullPage:true});
  await page.locator('#target').selectOption('custom');assert.equal(await page.locator('#result').isVisible(),false);
  await page.locator('#custom-size').fill('1');
  // HTML constraint checks first; programmatic submit reaches the independent validator.
  await page.locator('#settings').evaluate(form=>form.dispatchEvent(new Event('submit',{cancelable:true})));
  assert.match(await page.locator('#status').innerText(),/50 KB to 20 MB/); passed.push('invalid target blocks output and hides stale download');
  await page.locator('#custom-size').fill('50');await compress();
  assert(await page.evaluate(async()=>(window.__blobs.get(document.querySelector('#download').href)).size)<50000);passed.push('minimum custom target produces a fitting output');
  await page.locator('#clear').click();assert.equal(await page.locator('#result').isVisible(),false);assert.equal(await page.locator('#shrink').isDisabled(),true);passed.push('clear removes previews and output');
  await upload(Buffer.from(fixtures.transparent,'base64'),'transparent.png');
  await page.locator('#target').selectOption('1000000');await page.locator('#format').selectOption('image/png');await compress();
  const alpha = async()=>page.evaluate(async()=>{const blob=window.__blobs.get(document.querySelector('#download').href);const bitmap=await createImageBitmap(blob);const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);return [...ctx.getImageData(0,0,1,1).data];});
  assert.equal((await alpha())[3],0);passed.push('PNG transparency survives');
  await page.locator('#format').selectOption('image/jpeg');await compress();assert.deepEqual(await alpha(),[255,255,255,255]);passed.push('JPG transparencies flatten to white');
  await page.locator('#format').selectOption('image/webp');await page.locator('#shrink').click();
  await page.waitForFunction(()=>!document.body.classList.contains('busy'));
  if(await page.locator('#result').isVisible()){assert.equal((await alpha())[3],0);passed.push('WebP transparency survives');}
  else{assert.match(await page.locator('#status').innerText(),/cannot export that format/);passed.push('unsupported WebP encoder reports a usable alternative');}
  // EXIF orientation 6: 400x300 JPEG must decode as 300x400 and stay that way after export.
  const exif=Buffer.from([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]);
  const jpeg=Buffer.from(fixtures.jpeg,'base64');const oriented=Buffer.concat([jpeg.subarray(0,2),exif,jpeg.subarray(2)]);
  await upload(oriented,'rotated.jpg','image/jpeg');assert.match(await page.locator('#original-info').innerText(),/300 × 400/);
  await page.locator('#format').selectOption('image/jpeg');await compress();assert.match(await page.locator('#result-info').innerText(),/300 × 400/);
  const outputBase64=await page.evaluate(async()=>{const a=new Uint8Array(await window.__blobs.get(document.querySelector('#download').href).arrayBuffer());return btoa(String.fromCharCode(...a));});
  assert.equal(Buffer.from(outputBase64,'base64').includes(Buffer.from('Exif')),false);passed.push('EXIF orientation is applied and original EXIF is not copied');
  await upload(Buffer.from('not an image'),'bad.png');assert.match(await page.locator('#status').innerText(),/damaged/);assert.equal(await page.locator('#result').isVisible(),false);passed.push('damaged replacement cannot expose an old download');
  await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),'bad.svg','image/svg+xml');assert.equal(await page.locator('#shrink').isDisabled(),true);passed.push('unsupported formats are rejected');
  // Header-only oversized image must be rejected before decoding.
  const huge=Buffer.from(fixtures.transparent,'base64');huge.writeUInt32BE(10000,16);huge.writeUInt32BE(10000,20);
  await upload(huge,'huge.png');assert.match(await page.locator('#status').innerText(),/too large/);passed.push('oversized dimensions are rejected before browser decode');
  await upload(Buffer.from(fixtures.transparent,'base64'),'recover.png');await compress();passed.push('valid file works after failure');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(output,`${engine}-mobile-result.png`),fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));passed.push('390px mobile layout has no horizontal overflow');
  await page.setViewportSize({width:320,height:720});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));passed.push('320px narrow layout has no horizontal overflow');
  await page.evaluate(()=>document.documentElement.style.fontSize='32px');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));passed.push('200% text enlargement has no horizontal overflow');
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  await page.locator('#clear').click();await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement!==document.body));passed.push('keyboard focus remains operable');
  await context.setOffline(true);
  // Supply an in-page File so the check does not depend on driver file transport.
  await page.evaluate(base64=>{const bytes=Uint8Array.from(atob(base64),x=>x.charCodeAt(0));const transfer=new DataTransfer();transfer.items.add(new File([bytes],'offline.png',{type:'image/png'}));const input=document.querySelector('#file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));},fixtures.transparent);
  await page.waitForFunction(()=>!document.body.classList.contains('busy'));
  if(engine==='webkit' && await page.locator('#shrink').isDisabled()) {
    assert.match(await page.locator('#status').innerText(),/could not read this local file/);
    limitations.push('WebKit simulated offline mode rejects even standalone Blob.arrayBuffer/FileReader reads. See webkit-offline-probe.mjs. Offline file loading is unverified on Safari.');
    passed.push('WebKit offline read failure is recoverable and explained');
  } else {
    assert.equal(await page.locator('#shrink').isDisabled(),false,await page.locator('#status').innerText());
    await compress();passed.push('processing works with network offline after load');
  }
  check('no external requests or runtime errors',()=>{assert.deepEqual(errors,[]);assert(requests.every(url=>url.startsWith('http://127.0.0.1:4178/')||url.startsWith('blob:')));});
  const report={engine,version:browser.version(),passed,limitations,errors,requests};
  await writeFile(resolve(output,`${engine}-report.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} catch(error) {
  await writeFile(resolve(output,`${engine}-failure.json`),JSON.stringify({passed,errors,status:await page.locator('#status').innerText(),failure:error.message},null,2));
  throw error;
} finally {await browser.close();}
