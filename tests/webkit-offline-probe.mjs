// Reproduce offline Blob reads independently of application code.
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
const { webkit }=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await webkit.launch();
try {
  const context=await browser.newContext(),page=await context.newPage();await page.goto('http://127.0.0.1:4178');
  const results=[];
  for(const offline of [false,true]){
    await context.setOffline(offline);
    results.push({offline,...await page.evaluate(async()=>{
      const result={},blob=new Blob(['local bytes']);
      try{result.arrayBuffer=(await blob.arrayBuffer()).byteLength;}catch(e){result.arrayBuffer=e.name+': '+e.message;}
      result.fileReader=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.byteLength);r.onerror=()=>resolve(r.error.name+': '+r.error.message);r.readAsArrayBuffer(blob);});
      return result;
    })});
  }
  await writeFile('artifacts/webkit-offline-probe.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
