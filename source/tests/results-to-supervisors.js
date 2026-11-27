const path=require('path');const N=path.join(__dirname,'node_modules')+'/';const U='file://'+path.join(__dirname,'..','dist','ric-dme-office.html');const FIX=path.join(__dirname,'fixtures')+'/';const OUT=path.join(__dirname,'out')+'/';require('fs').mkdirSync(OUT,{recursive:true});
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:900}});
const R={'qrcode-generator@1.4.4/qrcode.js':'qrcode-generator/qrcode.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js'};
for(const[k,v] of Object.entries(R))await ctx.route('**/'+k,r=>r.fulfill({path:N+v,contentType:'application/javascript'}));
const d=await ctx.newPage();d.on('pageerror',e=>console.log('ERR',e.message,(e.stack||'').slice(0,200)));
await d.goto(U);await d.waitForTimeout(800);
console.log('exams:',await d.evaluate(()=>DB.exams.map(x=>x.id+':'+x.stage+':'+(x.practice?'P':'')+':'+exCands(x).length+':'+Object.keys(x.marks||{}).length)));
await d.goto(U+'#exam-EX1');await d.waitForTimeout(500);
console.log('button before publish:',await d.$$eval('[data-act="ex-supres"]',a=>a.length));
await d.evaluate(()=>{const x=DB.exams.find(z=>z.id==='EX1');x.stage=5;x.passSpec={...(x.passSpec||{}),'Paediatric Cardiology':65};exCands(x).forEach((p,i)=>{if(i%9===4)x.absent[p.id]=true;else x.marks[p.id]=40+((i*37)%55)});DB.faculty.slice(0,40).forEach((f,i)=>f.mobile='0300-'+String(1000000+i));persist();render()});await d.waitForTimeout(300);
console.log('bar:',await d.evaluate(()=>document.querySelector('.exnext')?.innerText.replace(/\s+/g,' ')));
await d.click('[data-act="ex-supres"]');await d.waitForTimeout(400);
console.log('kpis:',await d.$$eval('.sheet .kpi',a=>a.map(x=>x.innerText.replace(/\s+/g,' '))));
console.log('flags:',await d.$$eval('.sheet .flag',a=>a.map(x=>x.innerText.replace(/\s+/g,' ').slice(0,200))));
const first=await d.$('.sheet details.srprev');if(first){await first.click();await d.waitForTimeout(200);console.log('preview:\n'+await d.$eval('.sheet details.srprev .msgprev',e=>e.innerText))}
await d.screenshot({path:OUT+'supres-sheet.png'});
// one specialty
await d.selectOption('.sheet [name=spec]',{index:1});await d.waitForTimeout(300);console.log('after spec filter:',await d.$$eval('.sheet .kpi',a=>a.map(x=>x.innerText.replace(/\s+/g,' '))));
await d.selectOption('.sheet [name=spec]','');await d.waitForTimeout(300);
await d.click('.sheet [data-act="save"]');await d.waitForTimeout(600);
console.log('route:',await d.evaluate(()=>location.hash),'recs:',await d.evaluate(()=>UI.msg.recs.length),'help has results:',await d.evaluate(()=>document.querySelector('main').innerHTML.includes('<code>{results}</code>')));
const href=await d.$eval('main a.btn.primary[href^="https://wa.me/"]',a=>a.href).catch(()=>null);console.log('first wa link text:\n'+(href?decodeURIComponent(href.split('text=')[1]):'none'));
await d.screenshot({path:OUT+'supres-msg.png'});
await d.goto(U+'#exam-EX1');await d.waitForTimeout(400);console.log('bar after:',await d.evaluate(()=>document.querySelector('.exnext')?.innerText.replace(/\s+/g,' ')));
await b.close()})();
