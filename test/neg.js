const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');const fs=require('fs');
(async()=>{const srv=spawn('python3',['-m','http.server','8832'],{cwd:path.join(__dirname,'..'),stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
 const b=await chromium.launch();const p=await b.newPage();await p.goto('http://localhost:8832/test/img.html');await p.evaluate(()=>init());let ref=0,n=0;
 for(const f of fs.readdirSync(path.join(__dirname,'neg'))){const r=await p.evaluate(u=>decodeUrl(u),'neg/'+f);n++;if(!r.ok)ref++;console.log(f,r.ok?'READ '+r.u.slice(0,30)+' conf '+r.conf:'refused: '+r.reason.slice(0,90));}
 console.log('refused',ref,'of',n);await b.close();srv.kill();})();
