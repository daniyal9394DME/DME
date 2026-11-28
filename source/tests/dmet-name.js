const path=require('path'),fs=require('fs');const N=path.join(__dirname,'node_modules')+'/';const U='file://'+path.join(__dirname,'..','dist','ric-dme-office.html');
/* New name: Department of Medical Education and Training (DME&T). Screens, app name, install name; saved values kept;
   the Director's title updated once and still gives full access. */
const expect=(ok,what)=>{if(!ok)console.log('ERR expected:',what);else console.log('ok:',what)};
const man=JSON.parse(fs.readFileSync(path.join(__dirname,'..','hosting','manifest.webmanifest'),'utf8'));
expect(man.name==='RIC DME&T Office'&&man.short_name==='DME&T Office'&&/Medical Education and Training/.test(man.description),'install name: DME&T Office');
const live=fs.readFileSync(path.join(__dirname,'..','dist','index.html'),'utf8');
expect(/<title>RIC DME&T Office<\/title>/.test(live)&&/apple-mobile-web-app-title" content="DME&T Office"/.test(live),'live page title and iPhone name');
expect(!/Medical Education Department|Department of Medical Education(?! and Training)(?! Fund)/.test(live),'no old department name left in the live page');
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:900}});
const R={'qrcode-generator@1.4.4/qrcode.js':'qrcode-generator/qrcode.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js'};
for(const[k,v] of Object.entries(R))await ctx.route('**/'+k,r=>r.fulfill({path:N+v,contentType:'application/javascript'}));
await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
const d=await ctx.newPage();d.on('pageerror',e=>console.log('ERR',e.message,(e.stack||'').slice(0,300)));
await d.goto(U);await d.waitForTimeout(800);
expect(await d.$eval('.appbar h1',e=>e.textContent)==='DME&T Office','app bar: DME&T Office');
let old=[];for(const pg of ['overview','observers','settings','workshops','exams','pgts']){await d.goto(U+'#'+pg);await d.waitForTimeout(300);const t=await d.textContent('body');if(/\bDME (office|Office|team|fund)\b/.test(t))old.push(pg)}
expect(!old.length,'no "DME office/team/fund" left on screen'+(old.length?': '+old.join():''));
// the Director's title
const t=await d.evaluate(()=>{DB.staff.forEach(s=>{if(s.me||s.role==='Admin')s.desig='Director of Medical Education'});render();return DB.staff.filter(s=>s.role==='Admin').map(s=>s.desig)});
expect(t.length&&t.every(x=>x==='Director of Medical Education and Training'),'Director title updated once: '+t.join());
expect(await d.evaluate(()=>DESIGS['Director of Medical Education and Training'].role==='Admin'&&DESIGS['Director of Medical Education'].role==='Admin'),'both titles give full access');
expect(/Exempted by DME"/.test(require('fs').readFileSync(require('path').join(__dirname,'..','app','p6.js'),'utf8')),'saved exam reason "Exempted by DME" kept, so old records still match');
await b.close()})();
