// node gencases.js N seed '[scales]'
const L=require('../src/app/data/lexicon.json');let seed=+(process.argv[3]||7);const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};const pick=a=>a[Math.floor(rnd()*a.length)];
const akk=L.filter(e=>e[0]==='akk'&&!/\s/.test(e[1])).map(e=>e[1]),sux=L.filter(e=>e[0]==='sux'&&!/\s/.test(e[1])).map(e=>e[1]);const names=['Larry','Dalton','Sydney','Jessica','Melbourne','Andrew'];
const scales=process.argv[4]?JSON.parse(process.argv[4]):[0.8,1,1.5];const out=[];
for(let i=0;i<(+process.argv[2]||40);i++){const n=1+Math.floor(rnd()*4),spec=[];for(let k=0;k<n;k++){const r=rnd();spec.push(r<0.15?['sound',pick(names)]:r<0.55?['akk',pick(akk)]:['sux',pick(sux)]);}
 out.push([spec,rnd()<0.75?'lines':'ancient',pick(['clay','stone','night','gold']),pick(scales),pick(['png','jpeg']),0.75]);}
console.log(JSON.stringify(out));
