import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../',import.meta.url));
const files = ['index.html','style.css','app.js','image.js','_headers'];
const entries = await Promise.all(files.map(async name=>({name,data:await readFile(resolve(root,'dist',name))})));
entries.push({name:'LICENSE',data:await readFile(resolve(root,'LICENSE'))});
const crc32 = bytes => {let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
// Dependency-free ZIP STORE: a small static release needs no compression library.
const local=[], central=[];let offset=0;
for(const {name,data} of entries){
  const filename=Buffer.from(name),crc=crc32(data),header=Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(33,12);
  header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
  local.push(header,filename,data);
  const directory=Buffer.alloc(46);directory.writeUInt32LE(0x02014b50);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt16LE(33,14);
  directory.writeUInt32LE(crc,16);directory.writeUInt32LE(data.length,20);directory.writeUInt32LE(data.length,24);directory.writeUInt16LE(filename.length,28);directory.writeUInt32LE(offset,42);
  central.push(directory,filename);offset+=header.length+filename.length+data.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...local,directory,end]);
await mkdir(resolve(root,'release'),{recursive:true});
await writeFile(resolve(root,'release','shrink-this-image-1.0.0.zip'),zip);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest={version:'1.0.0',archive:{name:'shrink-this-image-1.0.0.zip',bytes:zip.length,sha256:sha(zip)},files:entries.map(({name,data})=>({name,bytes:data.length,sha256:sha(data)}))};
await writeFile(resolve(root,'release','manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
