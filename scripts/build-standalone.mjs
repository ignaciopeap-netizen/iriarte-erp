import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const v2=path.join(root,'v2');
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
