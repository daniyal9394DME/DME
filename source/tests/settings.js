const path=require('path');const N=path.join(__dirname,'node_modules')+'/';const U='file://'+path.join(__dirname,'..','dist','ric-dme-office.html');const OUT=path.join(__dirname,'out')+'/';require('fs').mkdirSync(OUT,{recursive:true});
/* Settings: groups with a side menu, "Find a setting", every old section still there, the new adjustable numbers,
   restore defaults, forms / weekly off days / preferences reachable from Settings, phone layout. */
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:900},acceptDownloads:true});
const R={'qrcode-generator@1.4.4/qrcode.js':'qrcode-generator/qrcode.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js'};
for(const[k,v] of Object.entries(R))await ctx.route('**/'+k,r=>r.fulfill({path:N+v,contentType:'application/javascript'}));
await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
const d=await ctx.newPage();d.on('pageerror',e=>console.log('ERR',e.message,(e.stack||'').slice(0,300)));
const expect=(ok,what)=>{if(!ok)console.log('ERR expected:',what);else console.log('ok:',what)};
const vis=async()=>d.$$eval('main .st-grp:not([hidden]) > .panel:not([hidden])',a=>a.map(x=>x.id));
await d.goto(U);await d.waitForTimeout(800);await d.evaluate(()=>{try{localStorage.removeItem('dme-set-tab')}catch(e){}});
await d.goto(U+'#settings');await d.waitForTimeout(500);
const tabs=await d.$$eval('main .st-tab',a=>a.map(x=>x.textContent));
expect(tabs.slice(0,7).join('|')==='Alerts and reminders|Specialties and programmes|Trainees|Forms and links|Team and logins|Data and backup|My device','groups: '+tabs.join('|'));
const all=await d.$$eval('main .st-grp .panel[id]',a=>a.map(x=>x.id));
for(const id of ['set-backup','set-thr','set-more','set-spec','set-sites','set-rotoff','set-lt','set-exit','set-import','set-upd','set-bin','set-units','set-staff','set-forms','set-device'])expect(all.includes(id),'section kept: '+id);
expect((await vis()).join()==='set-thr,set-more','first group shows only the alerts');
await d.click('main .st-tab[data-sttab="trainees"]');await d.waitForTimeout(150);
expect((await vis()).join()==='set-sites,set-rotoff,set-lt,set-exit,set-units','Trainees group: '+(await vis()).join());
await d.reload();await d.waitForTimeout(600);expect(await d.$eval('main .st-tab[aria-pressed="true"]',e=>e.dataset.sttab)==='trainees','remembers the last group');
// search across groups
await d.fill('#st-q','backup');await d.waitForTimeout(150);const f=await vis();
expect(f.includes('set-backup')&&f.includes('set-more')&&!f.includes('set-sites'),'search finds backup in two groups: '+f.join());
await d.fill('#st-q','zzqq');await d.waitForTimeout(100);expect(await d.isVisible('#st-none'),'no match message');
await d.fill('#st-q','');await d.waitForTimeout(100);expect((await vis()).join()==='set-sites,set-rotoff,set-lt,set-exit,set-units','clearing the search returns to the group');
// new numbers work and are saved
await d.click('main .st-tab[data-sttab="alerts"]');await d.waitForTimeout(100);
expect(await d.$eval('[data-setting="ac_soon"]',e=>e.value)==='180'&&await d.$eval('[data-setting="obs_wait"]',e=>e.value)==='14','defaults shown');
await d.fill('[data-setting="ac_soon"]','30');await d.dispatchEvent('[data-setting="ac_soon"]','change');await d.fill('[data-setting="task_soon"]','5');await d.dispatchEvent('[data-setting="task_soon"]','change');await d.waitForTimeout(200);
let r=await d.evaluate(()=>{const add=n=>{const x=new Date(TODAY);x.setDate(x.getDate()+n);return iso(x)};const a={st:'Approved',to:add(60)};return[DB.settings.ac_soon,acState(a),stN('task_soon'),tSoon({due:add(5),status:'Open'})]});
expect(r[0]===30&&r[1]==='Approved'&&r[2]===5,'accreditation window 30 days: 60 days left is still Approved; tasks due soon 5 days: '+JSON.stringify(r));
expect(await d.evaluate(()=>{OBS_WAIT=0;DB.settings.obs_wait=21;render();return OBS_WAIT})===21,'observership follow-up days applied');
expect(await d.evaluate(()=>DB.audit[0].what.startsWith('Changed setting')),'change in the audit log');
await d.click('[data-act="st-defaults"]');await d.click('[data-act="st-defaults"]');await d.waitForTimeout(200);
expect(await d.evaluate(()=>[stN('ac_soon'),stN('task_soon'),stN('obs_wait'),stN('return_red')].join())==='180,3,14,14','restore defaults');
// settings kept elsewhere open from here
await d.click('main .st-tab[data-sttab="forms"]');await d.waitForTimeout(100);
expect(/PGT registration/.test(await d.textContent('#set-forms'))&&/Observership application/.test(await d.textContent('#set-forms')),'online forms listed');
await d.click('#set-forms [data-act="form-edit"][data-k="pgt"]');await d.waitForTimeout(200);expect(await d.isVisible('#sheetform'),'form settings open');await d.click('.sheet header [data-act="close"]');
await d.click('#set-forms [data-act="st-obscfg"]');await d.waitForTimeout(200);expect(await d.$('#sheetform [name=attFrom]')!==null,'observership fees and times open');await d.click('.sheet header [data-act="close"]');
await d.click('main .st-tab[data-sttab="trainees"]');await d.click('#set-rotoff [data-act="st-rotoff"]');await d.waitForTimeout(200);expect(/Weekly off days/.test(await d.textContent('.sheet header')),'weekly off days open');await d.click('.sheet header [data-act="close"]');
await d.click('main .st-tab[data-sttab="device"]');await d.click('#set-device [data-act="prefs"]');await d.waitForTimeout(200);expect(await d.isVisible('.sheet'),'my preferences open');await d.click('.sheet header [data-act="close"]');
await d.click('main .st-tab[data-sttab="specs"]');await d.waitForTimeout(100);
expect(await d.evaluate(()=>{const w=document.querySelector('#set-spec .tblwrap');return w.scrollWidth<=w.clientWidth+1}),'Specialties table fits without sideways scrolling');
await d.screenshot({path:OUT+'settings.png'});
// phone: groups wrap, no sideways scroll
await d.setViewportSize({width:390,height:844});await d.waitForTimeout(300);
expect(await d.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll on a phone');
expect(await d.evaluate(()=>[...document.querySelectorAll('main .st-tab')].every(b=>b.getBoundingClientRect().right<=innerWidth)),'all group buttons on screen on a phone');
await d.click('main .st-tab[data-sttab="specs"]');await d.waitForTimeout(300);expect(await d.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Specialties on a phone: no sideways scroll');
await d.evaluate(()=>document.getElementById('set-spec').scrollIntoView());await d.screenshot({path:OUT+'settings-phone.png'});
await b.close()})();
