const path=require('path');const N=path.join(__dirname,'node_modules')+'/';const U='file://'+path.join(__dirname,'..','dist','ric-dme-office.html');const FIX=path.join(__dirname,'fixtures')+'/';const OUT=path.join(__dirname,'out')+'/';require('fs').mkdirSync(OUT,{recursive:true});
const {chromium}=require('playwright');
const VW=+process.argv[2]||1366;
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:VW,height:900},acceptDownloads:true});
const map={'qrcode-generator@1.4.4/qrcode.js':'qrcode-generator/qrcode.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js','html2canvas/1.4.1/html2canvas.min.js':'html2canvas/dist/html2canvas.min.js','jspdf/2.5.1/jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','jszip/3.10.1/jszip.min.js':'jszip/dist/jszip.min.js'};
for(const [k,v] of Object.entries(map))await ctx.route('**/'+k,r=>r.fulfill({path:N+v,contentType:'application/javascript'}));
await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
let p=await ctx.newPage();let cur='';const errs=[];
p.on('download',d=>{});

await p.goto(U);await p.evaluate(()=>localStorage.clear());await p.goto(U);await p.waitForTimeout(400);
const ids=await p.evaluate(()=>({pgt:verified()[0].id,pend:DB.pgts.find(x=>x.reg==="Pending").id,fac:DB.faculty[0].id,task:DB.tasks[0].id}));
const routes=['overview','calendar','rotating','tasks','pgts','verify','faculty','supervisors','credentials','leaves','exits','workshops','exams','orientation','settings','audit','pgt-'+ids.pgt,'pgt-'+ids.pend,'fac-'+ids.fac,'task-'+ids.task,'ws-W01','ws-WX1','ws-W02','fb-WX1','fbedit-WX1','pfedit-W01','pfill-W01','prop-WX1','reg-W01','rgedit-W01','cert-WX1','exam-EX0','exam-EX1','certx-EX0','orient-OR1','search','attend-WX1','datacheck','cred-F001','messages'];
const SKIP=new Set(['resetdb','navtoggle','navclose','lg-out']);let clicks=0;
const hook=pg=>{pg.on('pageerror',e=>errs.push(cur+' :: '+e.message));pg.on('crash',()=>errs.push(cur+' :: PAGE CRASH'));pg.on('dialog',d=>{errs.push(cur+' :: DIALOG '+d.message());d.dismiss()})};
for(const r of routes){try{await p.close()}catch(e){}p=await ctx.newPage();hook(p);cur=r;await p.goto(U+'#'+r);await p.waitForTimeout(200);
 const n=await p.$$eval('main button, main [data-act], main .chip',a=>a.length);
 for(let i=0;i<n;i++){
  if(p.isClosed()){errs.push(cur+' :: page closed');break}
  if(await p.evaluate(()=>location.hash)!=='#'+r){await p.goto(U+'#'+r);await p.waitForTimeout(150)}
  const els=await p.$$('main button, main [data-act], main .chip');if(i>=els.length)break;const el=els[i];
  const info=await el.evaluate(e=>({a:e.dataset.act||'',t:(e.innerText||'').trim().slice(0,30),vis:!!(e.offsetWidth||e.offsetHeight),dis:e.disabled,tag:e.tagName,href:e.getAttribute('href')}));
  if(!info.vis||info.dis||SKIP.has(info.a)||info.a==='cf-gen'||(info.tag==='A'&&info.href&&!info.href.startsWith('#')))continue;
  if(info.a==='ws-del'||info.a==='t-del')continue;
  cur=r+' > '+(info.a||info.t);clicks++;require('fs').appendFileSync(OUT+'fuzz.trace',cur+'\n');
  try{await el.click({timeout:1500})}catch(e){continue}
  await p.waitForTimeout(120);
  if(await p.$('#sheetform')){cur+=' > save-empty';await p.click('[data-act="save"]').catch(()=>{});await p.waitForTimeout(100);
   if(await p.$('#sheetform')){ // try filling every empty required-ish input then save
    await p.$$eval('#sheetform input:not([type=file]):not([type=checkbox]):not([type=radio]), #sheetform textarea',a=>a.forEach(x=>{if(!x.value){x.value=x.type==='date'?'2026-11-20':x.type==='number'?'5':x.type==='email'?'a@b.com':'Test value'}}));
    cur=cur.replace('save-empty','save-filled');await p.click('[data-act="save"]').catch(()=>{});await p.waitForTimeout(120);
    if(await p.$('#sheetform'))await p.keyboard.press('Escape')}}
  if(await p.$('.qrfull'))await p.keyboard.press('Escape');
  if(await p.$('#certov'))await p.evaluate(()=>document.getElementById('certov')?.remove());
 }
 // exercise selects
 cur=r+' > selects';const sel=await p.$$('main select');for(const s of sel.slice(0,8)){try{const o=await s.$$eval('option',a=>a.map(x=>x.value));if(o.length>1&&await s.isVisible())await s.selectOption(o[o.length-1],{timeout:800})}catch(e){}await p.waitForTimeout(80)}
}
try{await p.close()}catch(e){}p=await ctx.newPage();hook(p);await p.goto(U+'#pgts');await p.waitForTimeout(300);for(const h of ['leaves','faculty','workshops','exits']){await p.goto(U+'#'+h);await p.waitForTimeout(150)}
// all exports
cur='exports';const ex=await p.evaluate(()=>{const out=[];const tries={pgts:[],leaves:[],faculty:[],workshops:[],audit:[],idchanges:[],exits:[],examcands:["EX1"],evalbee:["EX1","Cardiac Surgery",""],evalbeeall:["EX1"],exam:["EX0"],ws:["WX1"],regs:["W01"],sups:[],certreg:["ws","WX1"],certall:[],tasks:[]};
 Object.keys(EXPORTS).forEach(k=>{try{if(k==='pgts'||k==='leaves'||k==='faculty'||k==='workshops'||k==='exits'){if(!LAST[k])return out.push(k+': LAST missing (page not visited)')}const s=EXPORTS[k](...(tries[k]||[]));if(!s||!s.sheets||!s.sheets.length)out.push(k+': no sheets');const wb=XLSX.utils.book_new();s.sheets.forEach((sh,i)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sh.rows),(sh.name||'S'+i).slice(0,31).replace(/[\\\/?*\[\]:]/g,'-')+(i?'':'')));XLSX.write(wb,{type:'array',bookType:'xlsx'})}catch(e){out.push(k+': '+e.message)}});return out});
console.log('clicks',clicks,'export issues',ex);
const uniq=[...new Set(errs)];console.log('errors',uniq.length);uniq.slice(0,60).forEach(e=>console.log(' -',e.slice(0,220)));
await b.close()})();
