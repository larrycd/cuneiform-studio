const [C]=require('./load.js')();const L=require('../src/app/data/lexicon.json');
const toks=[];for(const e of L){ if(e[0]==='akk') toks.push(['akk',e[1]]); else toks.push(['sux',e[1]]); }
let n=0,ok=0,words=0,bad=[];
for(let i=0;i<toks.length;i+=8){const chunk=toks.slice(i,i+8);const ws=[];
 for(const [lang,w] of chunk){const r=C.process(w.replace(/\s+/g,'_'),lang);ws.push(...r.words);}
 const want=ws.map(w=>w.signs.map(s=>s.u).join('')).filter(Boolean).join(' ');if(!want)continue;words+=ws.length;
 for(const style of ['lines','ancient']){const r=C.readSVG(C.render(ws,{style}));n++;if(r.ok&&r.unicode===want)ok++;else if(bad.length<4)bad.push([style,want,r.unicode]);}}
console.log(JSON.stringify({entries:toks.length,words,svgs:n,exact:ok}));bad.forEach(b=>console.log(b.join(' | ')));
