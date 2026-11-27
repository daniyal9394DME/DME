const path=require('path');const N=path.join(__dirname,'node_modules')+'/';const U='file://'+path.join(__dirname,'..','dist','ric-dme-office.html');const FIX=path.join(__dirname,'fixtures')+'/';const OUT=path.join(__dirname,'out')+'/';require('fs').mkdirSync(OUT,{recursive:true});
/* Observership, staff side: apply on paper → HOD signed, challan issued → fee paid → sent to the MS → office order, start
   → attendance time on the kiosk → extend; quick actions from the list; extension before the start; cash handover. */
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:900},acceptDownloads:true});
const R={'qrcode-generator@1.4.4/qrcode.js':'qrcode-generator/qrcode.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js'};
for(const[k,v] of Object.entries(R))await ctx.route('**/'+k,r=>r.fulfill({path:N+v,contentType:'application/javascript'}));
await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
const d=await ctx.newPage();d.on('pageerror',e=>console.log('ERR',e.message,(e.stack||'').slice(0,300)));
const expect=(ok,what)=>{if(!ok)console.log('ERR expected:',what);else console.log('ok:',what)};
const dl=async(fn,name)=>{const [x]=await Promise.all([d.waitForEvent('download',{timeout:30000}),fn()]);await x.saveAs(OUT+name);return x.suggestedFilename()};
const row=id=>`main tr:has(a[href="#obs-${id}"])`;
await d.goto(U);await d.waitForTimeout(800);
await d.goto(U+'#observers');await d.waitForTimeout(500);
const tabs=await d.$$eval('[data-obstab].chip',a=>a.map(x=>x.dataset.obstab));expect(tabs.join()==='Applied,Challan issued,To forward,With the MS,Upcoming,Current,Completed,Closed','tabs in pipeline order');
// settings: usual attendance time
await d.click('[data-act="obs-cfg"]');await d.waitForTimeout(300);expect(await d.$eval('#sheetform [name=attFrom]',e=>e.value)==='08:00','usual attendance time from 08:00');await d.click('.sheet header [data-act="close"]');await d.waitForTimeout(200);
// add an applicant on paper
await d.click('[data-act="obs-add"]');await d.waitForTimeout(300);
await d.selectOption('#sheetform [name=title]','Ms.');await d.fill('#sheetform [name=name]','Hina Shah');await d.fill('#sheetform [name=father]','Abdul Shah');await d.selectOption('#sheetform [name=gender]','Female');await d.fill('#sheetform [name=cnic]','3740512345678');await d.fill('#sheetform [name=mobile]','0300-1234567');
await d.selectOption('#sheetform [name=cat]',{index:5});await d.fill('#sheetform [name=degree]','BS Nursing');await d.fill('#sheetform [name=inst]','Shifa College of Nursing, Islamabad');await d.fill('#sheetform [name=yearStudy]','4th year');await d.fill('#sheetform [name=status2]','7th semester');await d.fill('#sheetform [name=unit]','CCU');await d.fill('#sheetform [name=reason]','Clinical exposure to coronary care nursing.');
expect(await d.isVisible('#sheetform [name=idcardDoc]')&&!(await d.isVisible('#sheetform [name=degreeDoc]')),'attached: ID card and letter shown, degree hidden');
await d.selectOption('#sheetform [name=attached]','0');expect(await d.isVisible('#sheetform [name=degreeDoc]')&&!(await d.isVisible('#sheetform [name=idcardDoc]')),'not attached: degree shown');await d.selectOption('#sheetform [name=attached]','1');
for(const n of ['photoDoc','cnicDoc','idcardDoc','letterDoc'])await d.setInputFiles(`#sheetform [name=${n}]`,FIX+'blank.jpg');
const f1=await dl(()=>d.click('[data-act="save"]'),'obs-app.pdf');expect(/^Observership application - /.test(f1),'adding gives the application form only: '+f1);
await d.waitForTimeout(400);
const id=await d.evaluate(()=>obsList().find(v=>v.name==='Hina Shah').id);
let st=await d.evaluate(id=>{const v=obsList().find(x=>x.id===id);return{stage:obsStage(v),docs:Object.keys(v.docs),attached:v.attached,issued:!!obsFirst(v).issued}},id);
expect(st.stage==='Applied'&&st.docs.join()==='photo,cnic,idcard,letter'&&st.attached===true&&!st.issued,'applied, documents saved, challan not issued: '+JSON.stringify(st));
expect(!(await d.$$('[data-act="obs-challan"]')).length,'no challan download before it is issued');
// everything from the list from now on
await d.goto(U+'#observers');await d.waitForTimeout(300);await d.click('[data-obstab="Applied"].chip');await d.waitForTimeout(200);
await d.click(`${row(id)} details.rowmenu summary`);await d.click(`${row(id)} [data-act="obs-dur"]`);await d.waitForTimeout(200);
await d.selectOption('#sheetform [name=blocks]','2');await d.click('[data-act="save"]');await d.waitForTimeout(300);
expect(await d.evaluate(id=>obsFirst(obsList().find(x=>x.id===id)).amt,id)===8000,'change duration before the fee: 4 weeks, PKR 8,000');
await d.click(`${row(id)} [data-act="obs-issue"]`);await d.waitForTimeout(300);
await d.click('[data-act="save"]');await d.waitForTimeout(200);expect(/Head of Department must sign/.test(await d.$eval('#sheeterr',e=>e.textContent)),'issue needs the HOD tick');
await d.check('#sheetform [name=hod]');await d.setInputFiles('#sheetform [name=app]',FIX+'blank.jpg');
const f2=await dl(()=>d.click('[data-act="save"]'),'obs-challan.pdf');expect(/^Challan OBS-/.test(f2),'challan printed on issue: '+f2);await d.waitForTimeout(400);
expect(await d.evaluate(id=>obsStage(obsList().find(x=>x.id===id)),id)==='Challan issued','stage: challan issued');
await d.click('[data-obstab="Challan issued"].chip');await d.waitForTimeout(200);
await d.click(`${row(id)} details.rowmenu summary`);await d.waitForTimeout(100);expect((await d.$$eval(`${row(id)} .rowmenu-list .btn`,a=>a.map(x=>x.textContent))).some(t=>/Print the challan again/.test(t)),'menu: print the challan again');
await d.click(`${row(id)} .obsacts > [data-act="obs-paid"]`);await d.waitForTimeout(300);await d.fill('#sheetform [name=ref]','R-778899');await d.uncheck('#sheetform [name=fwd]');await d.click('[data-act="save"]');await d.waitForTimeout(400);
expect(await d.evaluate(id=>obsStage(obsList().find(x=>x.id===id)),id)==='To forward','fee paid: to forward');
await d.click('[data-obstab="To forward"].chip');await d.waitForTimeout(200);await d.click(`${row(id)} [data-act="obs-fwd"]`);await d.waitForTimeout(200);
const ago=await d.evaluate(n=>{const x=new Date(TODAY);x.setDate(x.getDate()-n);return iso(x)},16);await d.fill('#sheetform [name=on]',ago);await d.click('[data-act="save"]');await d.waitForTimeout(300);
expect(await d.evaluate(id=>{const v=obsList().find(x=>x.id===id);return obsStage(v)==='With the MS'&&obsLate(v)},id),'with the MS, over 2 weeks flagged');
await d.click('[data-obstab="With the MS"].chip');await d.waitForTimeout(200);await d.click(`${row(id)} [data-act="obs-start"]`);await d.waitForTimeout(300);
const st0=await d.evaluate(n=>{const x=new Date(TODAY);x.setDate(x.getDate()-n);return iso(x)},26);await d.fill('#sheetform [name=start]',st0);await d.dispatchEvent('#sheetform [name=start]','change');
expect(await d.$eval('#sheetform [name=end]',e=>e.value)===await d.evaluate(s=>obsEndOf(s,28),st0),'end date follows the 4 weeks paid for');
await d.fill('#sheetform [name=wfrom]','00:00');await d.fill('#sheetform [name=wto]','00:01');await d.setInputFiles('#sheetform [name=doc]',FIX+'blank.jpg');await d.click('[data-act="save"]');await d.waitForTimeout(400);
st=await d.evaluate(id=>{const v=obsList().find(x=>x.id===id);return{stage:obsStage(v),win:obsWinTxt(obsWin(v)),ending:obsEnding(v),pin:v.pin}},id);expect(st.stage==='Current'&&st.win==='00:00–00:01'&&st.ending,'started, own attendance time, ending soon: '+JSON.stringify(st));
// kiosk: closed outside the time
await d.goto(U+'#kiosk');await d.waitForTimeout(400);expect(/closed now/.test(await d.$eval(`[data-kio-sel="${id}"]`,e=>e.innerText)),'kiosk shows the time and "closed now"');
await d.click(`[data-kio-sel="${id}"]`);await d.waitForTimeout(200);expect(/Attendance time/.test(await d.evaluate(()=>document.querySelector('.kio-done')?.innerText||'')),'kiosk refuses outside the time');
await d.waitForTimeout(3800);await d.evaluate(id=>{obsList().find(x=>x.id===id).attWin={from:'00:00',to:'23:59'};persist();render()},id);await d.waitForTimeout(300);
await d.click(`[data-kio-sel="${id}"]`);await d.waitForTimeout(200);for(const k of String(st.pin))await d.click(`[data-kio="${k}"]`);await d.waitForTimeout(300);
expect(await d.evaluate(id=>obsList().find(x=>x.id===id).att[iso(TODAY)]?.s,id)==='P','kiosk marks attendance inside the time');
await d.evaluate(()=>{sessionStorage.removeItem('dme-kiosk');document.body.classList.remove('kiosk')});
// attendance time from the list menu
await d.goto(U+'#observers');await d.waitForTimeout(300);await d.click('[data-obstab="Current"].chip');await d.waitForTimeout(200);
await d.click(`${row(id)} details.rowmenu summary`);await d.click(`${row(id)} [data-act="obs-win"]`);await d.waitForTimeout(200);await d.fill('#sheetform [name=wfrom]','09:00');await d.fill('#sheetform [name=wto]','11:30');await d.click('[data-act="save"]');await d.waitForTimeout(300);
expect(await d.evaluate(id=>obsWinTxt(obsWin(obsList().find(x=>x.id===id))),id)==='09:00–11:30','attendance time changed from the list');
await d.screenshot({path:OUT+'obs-list.png',fullPage:false});
// extend from the list
const f3=await (async()=>{await d.click(`${row(id)} .obsacts > [data-act="obs-ext"]`);await d.waitForTimeout(300);await d.selectOption('#sheetform [name=b]','1');return dl(()=>d.click('[data-act="save"]'),'obs-ext.pdf')})();
st=await d.evaluate(id=>{const v=obsList().find(x=>x.id===id);return{fees:v.fees.map(f=>f.kind+':'+f.amt+':'+f.status),len:obsLen(v),ending:obsEnding(v)}},id);expect(st.fees.length===2&&st.len===42&&!st.ending,'extended from the list: '+f3+' '+JSON.stringify(st));
// extension before the start
const id2=await d.evaluate(()=>{const ago=n=>{const x=new Date(TODAY);x.setDate(x.getDate()-n);return iso(x)};const v={id:uid('V'),kind:'obs',name:'Bilal Ahmed',title:'Dr.',inst:'HFH',unit:'Cath Lab',blocks:1,att:{},pin:'1234',attached:false,fees:[{id:'F1',kind:'first',blocks:1,amt:5000,challan:'OBS-26-0090',status:'verified',paidOn:ago(3),issued:{at:new Date().toISOString()}}],recv:{at:new Date().toISOString()},fwd:{on:ago(2)},src:'hand',regAt:new Date().toISOString()};visList().push(v);persist();render();return v.id});
await d.click('[data-obstab="With the MS"].chip');await d.waitForTimeout(200);await d.click(`${row(id2)} details.rowmenu summary`);await d.click(`${row(id2)} [data-act="obs-ext"]`);await d.waitForTimeout(300);
await dl(()=>d.click('[data-act="save"]'),'obs-ext2.pdf');await d.waitForTimeout(300);
await d.click(`${row(id2)} [data-act="obs-start"]`);await d.waitForTimeout(300);expect(await d.$eval('#sheetform [name=end]',e=>e.value)===await d.evaluate(()=>obsEndOf(iso(TODAY),28)),'extension before the start: office order sheet offers 4 weeks');
await d.click('[data-act="save"]');await d.waitForTimeout(300);
expect(await d.evaluate(id=>{const v=obsList().find(x=>x.id===id);return v.fees[1].from===v.start&&v.fees[1].to===v.end},id2),'the early extension gets the dates on start');
// profile
await d.goto(U+'#obs-'+id);await d.waitForTimeout(400);
const docs=await d.$$eval('.docs .doc b',a=>a.map(x=>x.textContent));expect(['Photograph','CNIC (front)','Institute ID card','Letter from the institute','HOD-signed application','Office order'].every(x=>docs.includes(x)),'profile lists the documents: '+docs.join(', '));
expect((await d.$$eval('.stepper li.p-ric',a=>a.length))>=6,'profile stepper');
await d.screenshot({path:OUT+'obs-profile.png',fullPage:true});
// application and challan PDFs from the profile
const f4=await dl(()=>d.click('main table [data-act="obs-challan"]'),'obs-challan2.pdf');expect(/^Challan /.test(f4),'challan from the profile');
// cash handover still works
await d.goto(U+'#observers');await d.waitForTimeout(300);await d.click('[data-act="obs-acc"]');await d.waitForTimeout(300);await d.fill('#sheetform [name=to]','Mr. Accountant');
await dl(()=>d.click('[data-act="save"]'),'obs-acc.pdf');await d.waitForTimeout(300);expect(await d.evaluate(()=>obsCashHeld().length)===0,'cash handed over');
// an old record from before (HOD signed and paid together) still reads as "to forward"
expect(await d.evaluate(()=>obsStage({kind:'obs',fees:[{kind:'first',status:'verified'}],recv:{at:'2026-11-20T05:00:00Z'}}))==='To forward','older records keep their stage');
await b.close()})();
