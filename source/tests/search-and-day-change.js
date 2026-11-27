const path=require('path');const N=path.join(__dirname,'node_modules')+'/';const U='file://'+path.join(__dirname,'..','dist','ric-dme-office.html');const FIX=path.join(__dirname,'fixtures')+'/';const OUT=path.join(__dirname,'out')+'/';require('fs').mkdirSync(OUT,{recursive:true});
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:900}});
const R={'qrcode-generator@1.4.4/qrcode.js':'qrcode-generator/qrcode.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js'};
for(const[k,v] of Object.entries(R))await ctx.route('**/'+k,r=>r.fulfill({path:N+v,contentType:'application/javascript'}));
const d=await ctx.newPage();d.on('pageerror',e=>console.log('ERR',e.message,(e.stack||'').slice(0,200)));
await d.goto(U);await d.waitForTimeout(800);
// day rollover
console.log('rollover:',await d.evaluate(()=>{const y=new Date(TODAY);y.setDate(y.getDate()-1);TODAY.setTime(y.getTime());const before=iso(TODAY);dayCheck();return before+' -> '+iso(TODAY)}));
// observers for search
await d.evaluate(()=>{visList().push({id:'VS1',kind:'obs',name:'Zainab Qureshi',cat:'Nurse',inst:'Shifa College',unit:'CCU',cnic:'37405-1111111-1',mobile:'0300-7654321',blocks:1,pin:'1111',att:{},fees:[{id:'F1',kind:'first',blocks:1,amt:5000,challan:'OBS-26-0042',status:'unpaid'}],src:'form',regAt:new Date().toISOString()});persist()});
// open a few records to fill "recent"
for(const h of ['#obs-VS1','#exam-EX1']){await d.goto(U+h);await d.waitForTimeout(300)}
const pid=await d.evaluate(()=>DB.pgts[0].id);await d.goto(U+'#pgt-'+pid);await d.waitForTimeout(300);
await d.goto(U+'#overview');await d.waitForTimeout(300);
await d.keyboard.press('Control+k');await d.waitForTimeout(400);console.log('ctrl+k focused:',await d.evaluate(()=>document.activeElement?.id));await d.goto(U+'#search');await d.waitForTimeout(400);
console.log('recent:',await d.$$eval('main .panel h3',a=>a.map(x=>x.textContent)),await d.$$eval('main .srow b',a=>a.map(x=>x.textContent)));
await d.fill('#topq','OBS-26-0042');await d.waitForTimeout(300);console.log('challan search:',await d.$$eval('main .srow',a=>a.map(x=>x.innerText.replace(/\s+/g,' '))));
await d.fill('#topq','7654321');await d.waitForTimeout(300);console.log('mobile search:',await d.$$eval('main .srow',a=>a.map(x=>x.innerText.replace(/\s+/g,' '))));
await d.fill('#topq','zainab');await d.waitForTimeout(300);console.log('name search:',await d.$$eval('main .panel h3',a=>a.map(x=>x.textContent)));
// results to trainees
await d.evaluate(()=>{const x=DB.exams.find(z=>z.id==='EX1');x.stage=5;exCands(x).forEach((p,i)=>{x.marks[p.id]=40+((i*37)%55)});persist()});
await d.goto(U+'#exam-EX1');await d.waitForTimeout(400);console.log('bar:',await d.evaluate(()=>document.querySelector('.exnext')?.innerText.replace(/\s+/g,' ')));
await d.click('[data-act="ex-pgtres"]');await d.waitForTimeout(300);console.log('kpis:',await d.$$eval('.sheet .kpi',a=>a.map(x=>x.innerText.replace(/\s+/g,' '))));
console.log('example:\n'+await d.$eval('.sheet .msgprev',e=>e.innerText));
await d.click('.sheet [data-act="save"]');await d.waitForTimeout(500);console.log('messages recs:',await d.evaluate(()=>UI.msg.recs.length+' '+location.hash));
await b.close()})();
