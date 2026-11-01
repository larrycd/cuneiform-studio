const [C]=require('./load.js')();const fs=require('fs');const S='/tmp/claude-0/-home-claude/7c56d3d1-d0d8-5d3b-a1ae-2790b2641649/scratchpad/';
const cases=[['šarrum ilum bītum','akk'],['lugal dingir e2 an','sux'],['{d}AMAR.UTU LUGAL a-na be-li2-ia','signs'],['Larry Dalton','sound'],['The king sees the god.','english']];
let html='<body style=margin:0;background:#888>',ok=0,n=0;
for(const [t,m] of cases){const r=C.process(t,m,{det:'man',lang:'akk'});for(const style of ['lines','ancient']){const svg=C.render(r.words,{style,theme:style=='lines'?'clay':'night'});const d=C.readSVG(svg);n++;const good=d.ok&&d.unicode===r.unicode;ok+=good;if(!good)console.log('MISMATCH',style,r.unicode,'|',d.unicode);html+='<div style="display:inline-block;margin:6px;vertical-align:top">'+svg+'</div>';}
 if(m!=='english'){const d=C.readSVG(C.render(r.words,{}));console.log(m,'read:',d.transliteration,'|',d.words.map(w=>w.gloss||w.candidates&&w.candidates.slice(0,2)).join(' | '));}}
console.log('svg',ok,'/',n);fs.writeFileSync(S+'cu1.html',html);
