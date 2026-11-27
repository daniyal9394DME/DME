const path=require('path');const N=path.join(__dirname,'node_modules')+'/';const U='file://'+path.join(__dirname,'..','dist','ric-dme-office.html');const FIX=path.join(__dirname,'fixtures')+'/';const OUT=path.join(__dirname,'out')+'/';require('fs').mkdirSync(OUT,{recursive:true});
/* Accreditation: one row per specialty and programme (FCPS → CPSP, MS/MD → UHS), each with the awarding body and the PMDC.
   Update a row, attach a letter, renew soon / expired on the dashboard, add and remove an extra programme, rename a specialty. */
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:900},acceptDownloads:true});
const R={'qrcode-generator@1.4.4/qrcode.js':'qrcode-generator/qrcode.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js'};
for(const[k,v] of Object.entries(R))await ctx.route('**/'+k,r=>r.fulfill({path:N+v,contentType:'application/javascript'}));
await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
const d=await ctx.newPage();d.on('pageerror',e=>console.log('ERR',e.message,(e.stack||'').slice(0,300)));
const expect=(ok,what)=>{if(!ok)console.log('ERR expected:',what);else console.log('ok:',what)};
const row=(s,p)=>`main tr[data-acrow="${s}|${p}"]`;
await d.goto(U);await d.waitForTimeout(800);
expect(await d.$('#side a[href="#accr"], nav a[href="#accr"], a[href="#accr"]')!==null,'Accreditation is in the menu');
await d.goto(U+'#accr');await d.waitForTimeout(400);
expect(/Accreditation/.test(await d.$eval('main h2',e=>e.textContent)),'page opens');
const rows=await d.$$eval('main tr[data-acrow]',a=>a.map(x=>x.dataset.acrow));
expect(rows.includes('Cardiac Surgery|FCPS')&&rows.includes('Cardiac Surgery|UHS (MS)')&&rows.includes('General Cardiology|UHS (MD)')&&rows.includes('Radiology|FCPS'),'programmes come from the specialty settings: '+rows.length+' rows');
expect(!rows.some(r=>/^Nephrology/.test(r)),'non-training specialties are not listed');
expect(/Apply to CPSP/.test(await d.textContent(row('Cardiac Surgery','FCPS')))&&/Apply to UHS/.test(await d.textContent(row('Cardiac Surgery','UHS (MS)'))),'nothing saved yet: next step is to apply to the awarding body');
expect(await d.evaluate(()=>acRows().every(r=>acGroup(r)==='Missing')),'all missing at the start');
// update Cardiac Surgery MS: UHS approved, PMDC applied, with a letter
await d.click(`${row('Cardiac Surgery','UHS (MS)')} [data-act="ac-edit"]`);await d.waitForTimeout(300);
expect(/UHS recognition/.test(await d.textContent('#sheetform')),'form names UHS for MS');
await d.selectOption('#sheetform [name="body-st"]','Approved');await d.fill('#sheetform [name="body-ref"]','UHS/PG/123');await d.fill('#sheetform [name="body-seats"]','4');
await d.fill('#sheetform [name="body-on"]','2026-01-10');await d.fill('#sheetform [name="body-to"]','2025-01-01');
await d.click('[data-act="save"]');await d.waitForTimeout(200);expect(/before the date/.test(await d.$eval('#sheeterr',e=>e.textContent)),'valid-until before the date is refused');
await d.fill('#sheetform [name="body-to"]','2031-01-09');await d.setInputFiles('#sheetform [name="body-doc"]',FIX+'blank.jpg');
await d.selectOption('#sheetform [name="pmdc-st"]','Applied');await d.fill('#sheetform [name="pmdc-on"]','2026-06-01');
await d.click('[data-act="save"]');await d.waitForTimeout(500);
let a=await d.evaluate(()=>{const x=acFind('Cardiac Surgery','UHS (MS)');return{b:x.body.st,ref:x.body.ref,seats:x.body.seats,doc:x.body.doc&&x.body.doc.name,m:x.pmdc.st,h:x.hist.length,g:acGroup({a:x,prog:x.prog})}});
expect(a.b==='Approved'&&a.ref==='UHS/PG/123'&&a.seats==='4'&&a.doc==='blank.jpg'&&a.m==='Applied'&&a.h===1&&a.g==='In progress','saved: '+JSON.stringify(a));
expect(/Waiting for the PMDC inspection/.test(await d.textContent(row('Cardiac Surgery','UHS (MS)'))),'next step: PMDC');
expect(await d.evaluate(()=>DB.audit[0].what.startsWith('Accreditation, Cardiac Surgery MS')),'audit log entry');
// complete it; and an FCPS row that ends within 6 months; and one expired
await d.evaluate(()=>{const t=iso(TODAY),add=n=>{const x=new Date(TODAY);x.setDate(x.getDate()+n);return iso(x)};
 acFind('Cardiac Surgery','UHS (MS)').pmdc={st:'Approved',ref:'PMDC/1',on:t,to:add(1500),seats:'4',notes:''};
 acList().push({id:'ACt1',spec:'Radiology',prog:'FCPS',body:{st:'Approved',to:add(60)},pmdc:{st:'Approved',to:add(900)},hist:[]});
 acList().push({id:'ACt2',spec:'Anaesthesiology',prog:'FCPS',body:{st:'Approved',to:add(900)},pmdc:{st:'Approved',to:add(-5)},hist:[]});persist();render()});
await d.waitForTimeout(200);
expect(await d.evaluate(()=>[acGroup({a:acFind('Cardiac Surgery','UHS (MS)'),prog:'UHS (MS)'}),acState(acFind('Radiology','FCPS').body),acState(acFind('Anaesthesiology','FCPS').pmdc)].join())==='Complete,Renew soon,Expired','complete, renew soon, expired');
await d.click('main .chip[data-actab="Renew"]');await d.waitForTimeout(200);
const rn=await d.$$eval('main tr[data-acrow]',a=>a.map(x=>x.dataset.acrow));expect(rn.length===2&&rn.includes('Radiology|FCPS')&&rn.includes('Anaesthesiology|FCPS'),'Renew filter: '+rn.join(', '));
expect(/Renew PMDC accreditation/.test(await d.textContent(row('Anaesthesiology','FCPS'))),'expired PMDC: renew');
await d.screenshot({path:OUT+'accreditation.png',fullPage:true});
// dashboard
await d.goto(U+'#overview');await d.waitForTimeout(400);const dash=await d.textContent('main');
expect(/programme accreditation expired/i.test(dash)&&/accreditation ending within 6 months/i.test(dash),'dashboard lists expired and ending accreditations');
// add an extra programme, then remove it
await d.goto(U+'#accr');await d.waitForTimeout(300);await d.click('main .chip[data-actab="All"]');await d.waitForTimeout(100);
await d.click('[data-act="ac-add"]');await d.waitForTimeout(200);await d.selectOption('#sheetform [name=spec]','Radiology');await d.selectOption('#sheetform [name=prog]','FCPS');
await d.click('[data-act="save"]');await d.waitForTimeout(200);expect(/already in the list/.test(await d.$eval('#sheeterr',e=>e.textContent)),'no duplicate programme');
await d.selectOption('#sheetform [name=prog]','UHS (MD)');await d.click('[data-act="save"]');await d.waitForTimeout(300);
expect(await d.$(row('Radiology','UHS (MD)'))!==null,'extra programme listed');
await d.click(`${row('Radiology','UHS (MD)')} [data-act="ac-edit"]`);await d.waitForTimeout(200);
await d.click('#sheetform [data-act="ac-del"]');await d.click('#sheetform [data-act="ac-del"]');await d.waitForTimeout(300);
expect(await d.$(row('Radiology','UHS (MD)'))===null,'extra programme removed');
await d.click(`${row('Cardiac Surgery','UHS (MS)')} [data-act="ac-edit"]`);await d.waitForTimeout(200);
expect(!(await d.$('#sheetform [data-act="ac-del"]')),'programmes from the specialty settings cannot be removed here');await d.click('.sheet header [data-act="close"]');await d.waitForTimeout(200);
// a renamed specialty keeps its records
await d.evaluate(()=>{sheetSpec(specOf('Radiology'));document.querySelector('#sheetform [name=name]').value='Diagnostic Radiology';document.querySelector('.sheet [data-act="save"]').click()});await d.waitForTimeout(300);
expect(await d.evaluate(()=>!!acFind('Diagnostic Radiology','FCPS')&&!acFind('Radiology','FCPS')),'rename in Settings carries the records');
// Excel and phone width
await d.goto(U+'#accr');await d.waitForTimeout(300);
const [x]=await Promise.all([d.waitForEvent('download',{timeout:30000}),d.click('[data-export="accr"]')]);expect(/Accreditation/.test(x.suggestedFilename()),'Excel download: '+x.suggestedFilename());
await d.setViewportSize({width:390,height:844});await d.waitForTimeout(300);
expect(await d.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'no sideways scroll on a phone');
await d.screenshot({path:OUT+'accreditation-phone.png',fullPage:false});
await b.close()})();
