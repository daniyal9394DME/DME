const path=require('path'),{execFileSync}=require('child_process');const N=path.join(__dirname,'node_modules')+'/';const U='file://'+path.join(__dirname,'..','dist','ric-dme-office.html');const OUT=path.join(__dirname,'out')+'/';require('fs').mkdirSync(OUT,{recursive:true});
/* Workshop registration: closing date, the form closes when all seats are filled (or keeps a waiting list if chosen),
   and the form shows "12 of 30 seats filled". Part 1 runs the real database function (needs PGURL, as public-form.js);
   part 2 checks the screens in the prototype. */
const expect=(ok,what)=>{if(!ok)console.log('ERR expected:',what);else console.log('ok:',what)};
const PG=process.env.PGURL;
if(PG){const sql=q=>execFileSync('psql',[PG,'-q','-t','-A','-v','ON_ERROR_STOP=1','-f','-'],{encoding:'utf8',input:q+';'}).trim();
 const ws=(id,extra)=>sql(`delete from dme_records where coll='workshops' and id='${id}';insert into dme_records(coll,id,ord,data) values('workshops','${id}',0,'${JSON.stringify({id,title:'Test workshop',month:'2099-01',date:'2099-01-20',seats:2,fee:0,payMode:'free',regOpen:true,regs:[],...extra})}'::jsonb)`);
 const reg=(id,m)=>JSON.parse(sql(`select public.dme_submit_reg('${id}','{"name":"Test ${m}","mobile":"0300-00000${m}"}'::jsonb)`));
 ws('WT1',{});expect(reg('WT1','01').status==='Confirmed'&&reg('WT1','02').status==='Confirmed','db: two seats filled');
 expect(reg('WT1','03').error==='full','db: third person refused, form closed when full (default)');
 ws('WT2',{whenFull:'wait'});reg('WT2','01');reg('WT2','02');expect(reg('WT2','03').status==='Waiting list','db: waiting list when chosen');
 ws('WT3',{regClose:'2000-01-01T10:00'});expect(reg('WT3','01').error==='closed','db: refused after the closing date and time');
 ws('WT4',{regClose:'2099-01-10T23:59'});expect(reg('WT4','01').status==='Confirmed','db: open before the closing date');
 const f=JSON.parse(sql(`select public.dme_public_form('reg','WT4')`));expect(f.w.regClose==='2099-01-10T23:59'&&f.w.held===1&&f.w.seats===2,'db: the public form gets the closing time and seats filled');
 sql(`delete from dme_records where coll='workshops' and id like 'WT%'`)}else console.log('database part skipped: set PGURL (see public-form.js)');

const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:900}});
const R={'qrcode-generator@1.4.4/qrcode.js':'qrcode-generator/qrcode.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js'};
for(const[k,v] of Object.entries(R))await ctx.route('**/'+k,r=>r.fulfill({path:N+v,contentType:'application/javascript'}));
await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
const d=await ctx.newPage();d.on('pageerror',e=>console.log('ERR',e.message,(e.stack||'').slice(0,300)));
await d.goto(U);await d.waitForTimeout(800);
const wid=await d.evaluate(()=>{const w=DB.workshops.find(w=>w.stage>=3&&w.stage<5)||DB.workshops[0];w.stage=4;w.regOpen=true;w.seats=3;w.fee=0;w.payMode='free';w.regs=[];
 const x=new Date(TODAY);x.setDate(x.getDate()+30);w.date=iso(x);delete w.regClose;delete w.whenFull;persist();return w.id});
await d.goto(U+'#ws-'+wid);await d.waitForTimeout(500);
// settings: closing date and time, when full
await d.evaluate(()=>sheetRegSettings(DB.workshops.find(w=>w.id===route.id)));await d.waitForTimeout(200);
expect(await d.$('#sheetform [name=rcd]')!==null&&await d.$eval('#sheetform [name=wf]',e=>e.value)==='close','settings: closing date and "close the form" by default');
const cd=await d.evaluate(()=>{const x=new Date(TODAY);x.setDate(x.getDate()+5);return iso(x)});
await d.fill('#sheetform [name=s]','3');await d.fill('#sheetform [name=rcd]',cd);await d.fill('#sheetform [name=rct]','17:00');await d.click('[data-act="save"]');await d.waitForTimeout(300);
expect(await d.evaluate(()=>DB.workshops.find(w=>w.id===route.id).regClose)===cd+'T17:00','closing date and time saved');
expect(/closes .*5:00 pm/.test(await d.textContent('main')),'workshop page shows the closing time');
// the form: seats filled out of total
await d.goto(U+'#reg-'+wid);await d.waitForTimeout(400);
expect(/0 of 3 seats filled/.test(await d.textContent('main .seatbox'))&&/3 seats left/.test(await d.textContent('main .seatbox')),'form shows 0 of 3 seats filled, 3 left');
expect(/Registration closes on/.test(await d.textContent('main .seatbox')),'form shows the closing date');
await d.evaluate(()=>{const w=DB.workshops.find(w=>w.id===route.id);for(let i=0;i<2;i++)w.regs.push({id:'RGx'+i,at:new Date().toISOString(),a:{name:'Test '+i},status:'Confirmed'});persist();render()});await d.waitForTimeout(200);
expect(/2 of 3 seats filled/.test(await d.textContent('main .seatbox'))&&/1 seat left/.test(await d.textContent('main .seatbox')),'2 of 3 seats filled, 1 seat left');
await d.screenshot({path:OUT+'ws-reg-form.png'});
// full: the form closes
await d.evaluate(()=>{const w=DB.workshops.find(w=>w.id===route.id);w.regs.push({id:'RGx3',at:new Date().toISOString(),a:{name:'Test 3'},status:'Confirmed'});persist();render()});await d.waitForTimeout(200);
expect(/All 3 seats are filled\. Registration is closed\./.test(await d.textContent('main'))&&!(await d.$('#rgform')),'full: form closed');
await d.goto(U+'#ws-'+wid);await d.waitForTimeout(300);expect(/Closed: all seats filled/.test(await d.textContent('main')),'workshop page: closed, all seats filled');
// waiting list when chosen
await d.evaluate(()=>{DB.workshops.find(w=>w.id===route.id).whenFull='wait';persist()});await d.goto(U+'#reg-'+wid);await d.waitForTimeout(300);
expect(!!(await d.$('#rgform'))&&/waiting list/i.test(await d.textContent('main .seatbox')),'waiting list chosen: form stays open when full');
// closing date passed
await d.evaluate(()=>{const w=DB.workshops.find(w=>w.id===route.id);w.regs=[];w.regClose='2000-01-01T09:00';persist();render()});await d.waitForTimeout(200);
expect(/Registration closed on/.test(await d.textContent('main'))&&!(await d.$('#rgform')),'closing date passed: form closed by itself');
await d.goto(U+'#ws-'+wid);await d.waitForTimeout(300);expect(/Closed: closing date passed/.test(await d.textContent('main')),'workshop page: closed, date passed');
// phone
await d.evaluate(()=>{const w=DB.workshops.find(w=>w.id===route.id);delete w.regClose;persist()});await d.setViewportSize({width:390,height:844});await d.goto(U+'#reg-'+wid);await d.waitForTimeout(300);
expect(await d.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'form fits a phone');
await b.close()})();
