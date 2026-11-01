// Usage: node mknames.js path/to/cmudict.dict  (writes app/data/names.tsv)
const fs=require('fs'),path=require('path');const C=require('../test/load.js')(false)[0];
const out=[];for(const ln of fs.readFileSync(process.argv[2],'utf8').split('\n')){const m=/^([^\s]+)\s+(.*)$/.exec(ln);if(!m)continue;let w=m[1];if(/\(\d+\)$/.test(w))continue;if(!/^[a-z][a-z'.-]*$/.test(w))continue;const c=C.fromArpabet(m[2].replace(/#.*/,''));if(c)out.push(w+'\t'+c);}
fs.writeFileSync(path.join(__dirname,'..','app','data','names.tsv'),out.join('\n')+'\n');console.log(out.length);
for(const w of ['larry','dalton','sydney','jessica','melbourne','hello','computer','andrew'])console.log(w,out.find(x=>x.startsWith(w+'\t')));
