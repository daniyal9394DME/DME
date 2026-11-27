const path=require('path');const N=path.join(__dirname,'node_modules')+'/';const U='file://'+path.join(__dirname,'..','dist','ric-dme-office.html');const FIX=path.join(__dirname,'fixtures')+'/';const OUT=path.join(__dirname,'out')+'/';require('fs').mkdirSync(OUT,{recursive:true});
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();
for(const [mode,vp,scheme] of [['d',{width:1440,height:900},'light'],['k',{width:1440,height:900},'dark'],['m',{width:390,height:844},'light']]){
const ctx=await b.newContext({viewport:vp,colorScheme:scheme,deviceScaleFactor:1});
await ctx.route('**/qrcode-generator@1.4.4/qrcode.js',r=>r.fulfill({path:N+'qrcode-generator/qrcode.js',contentType:'application/javascript'}));
await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
const d=await ctx.newPage();const errs=[];d.on('pageerror',e=>errs.push(e.message));d.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,150))});
await d.goto(U);await d.waitForTimeout(1200);
const ids=await d.evaluate(()=>({p:DB.pgts[0]?.id,f:DB.faculty[0]?.id,w:(DB.workshops||[])[0]?.id,x:(DB.exams||[]).find(x=>x.session==='Nov/Dec 2026')?.id||DB.exams[0]?.id,t:(DB.tasks||[])[0]?.id}));
let routes=['overview','pgts','pgt-'+ids.p,'faculty','fac-'+ids.f,'rotating','status','surform','calendar','messages','datacheck','search','exits','tasks','leaves','verify','supervisors','credentials','workshops','exams','exam-'+ids.x,'orientation','settings','audit','kiosk'];
if(mode!=='d')routes=['overview','pgts','pgt-'+ids.p,'exam-'+ids.x,'calendar','workshops'];
for(const r of routes){await d.goto(U+'#'+r);await d.waitForTimeout(500);await d.screenshot({path:OUT+`${mode}-${r.replace(/-.*/,'1').replace(/[^a-z0-9]/g,'')}.png`,fullPage:mode==='m'?false:false});
 const sw=await d.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);if(sw)errs.push('hscroll on '+r)}
console.log(mode,JSON.stringify(ids),[...new Set(errs)].slice(0,15).join(' | '));await ctx.close()}
await b.close()})();
