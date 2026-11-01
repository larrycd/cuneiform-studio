const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');
const cases=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));
(async()=>{const srv=spawn('python3',['-m','http.server','8831'],{cwd:path.join(__dirname,'..'),stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
 const b=await chromium.launch();const p=await b.newPage();await p.goto('http://localhost:8831/test/img.html');console.log('templates',await p.evaluate(()=>init()));
 let ex=0,sg=0,flagged=0,silent=0;for(const c of cases){const r=await p.evaluate(c=>run(...c),c);ex+=r.exact;sg+=r.signsOk;if(!r.exact){if(!r.got||r.unc>0)flagged++;else silent++;}
  console.log((r.exact?'OK  ':r.signsOk?'SIGN':'FAIL'),JSON.stringify(c.slice(1)),r.w+'x'+r.h,'conf',r.conf,'unc',r.unc,r.ms+'ms');if(!r.exact)console.log('   want',r.want,'\n   got ',r.got||r.reason);}
 console.log('TOTAL exact',ex,'signs-correct',sg,'of',cases.length,'| misses flagged',flagged,'silent',silent);await b.close();srv.kill();})();
