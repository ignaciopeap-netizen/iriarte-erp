import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=process.cwd();
const v2=path.join(root,'v2');
// Serve the Excel reader from this app; contact files never go to a third-party parser.
const excelPath=path.join(v2,'vendor','xlsx.full.min.js');
const excelHash='cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41';
let excelBytes=fs.existsSync(excelPath)?fs.readFileSync(excelPath):null;
if(!excelBytes||createHash('sha256').update(excelBytes).digest('hex')!==excelHash){
  const response=await fetch('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('Excel reader download failed: '+response.status);
  excelBytes=Buffer.from(await response.arrayBuffer());
  if(createHash('sha256').update(excelBytes).digest('hex')!==excelHash)throw new Error('Excel reader integrity check failed');
  fs.mkdirSync(path.dirname(excelPath),{recursive:true});fs.writeFileSync(excelPath,excelBytes);
}
let html=fs.readFileSync(path.join(v2,'index.html'),'utf8');

html=html.replace(/<link rel="stylesheet" href="\.\/([^"?]+)">/g,(_,file)=>{
  const css=fs.readFileSync(path.join(v2,file),'utf8').replace(/<\/style/gi,'<\\/style');
  return `<style data-inline-source="${file}">\n${css}\n</style>`;
});

html=html.replace(/<script src="\.\/([^"?]+)"><\/script>/g,(_,file)=>{
  const js=fs.readFileSync(path.join(v2,file),'utf8').replace(/<\/script/gi,'<\\/script');
  return `<script data-inline-source="${file}">\n${js}\n</script>`;
});

html=html.replace('<title>Iriarte ERP V2</title>','<title>Iriarte ERP V2 · Preview</title>');
fs.writeFileSync(path.join(v2,'standalone.html'),html);
console.log('Generated v2/standalone.html with local CSS and JS inlined.');
