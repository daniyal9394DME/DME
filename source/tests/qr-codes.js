const path=require('path');const N=path.join(__dirname,'node_modules')+'/';const U='file://'+path.join(__dirname,'..','dist','ric-dme-office.html');const OUT=path.join(__dirname,'out')+'/';require('fs').mkdirSync(OUT,{recursive:true});
/* Every QR code can be copied, downloaded (QR alone or a poster) or shared: online forms, observership,
   workshop registration (small QR on the page), feedback and check-in. */
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:900},acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
const R={'qrcode-generator@1.4.4/qrcode.js':'qrcode-generator/qrcode.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js'};
for(const[k,v] of Object.entries(R))await ctx.route('**/'+k,r=>r.fulfill({path:N+v,contentType:'application/javascript'}));
await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
const d=await ctx.newPage();d.on('pageerror',e=>console.log('ERR',e.message,(e.stack||'').slice(0,300)));
const expect=(ok,what)=>{if(!ok)console.log('ERR expected:',what);else console.log('ok:',what)};
const dl=async(sel,name)=>{const [x]=await Promise.all([d.waitForEvent('download',{timeout:30000}),d.click(sel)]);await x.saveAs(OUT+name);return x.suggestedFilename()};
const tools=async()=>d.$$eval('#overlay .qrtools button',a=>a.map(x=>x.dataset.act));
await d.goto(U);await d.waitForTimeout(800);
// 1. online form (PGT registration) from Settings
await d.goto(U+'#settings');await d.waitForTimeout(400);await d.click('main .st-tab[data-sttab="forms"]');await d.click('#set-forms [data-act="form-qr"][data-k="pgt"]');await d.waitForTimeout(300);
let t=await tools();expect(t.includes('qr-copy')&&t.includes('qr-dl')&&!t.includes('qr-poster'),'online form: copy and download (its own poster button kept): '+t.join());
expect(/^QR .*RIC\.png$/.test(await dl('#overlay [data-act="qr-dl"]','qr-form.png')),'online form: QR downloaded');
await d.click('#overlay [data-act="qr-copy"]');await d.waitForTimeout(600);
expect(await d.evaluate(async()=>{const it=await navigator.clipboard.read();return it[0].types.includes('image/png')}),'QR picture is on the clipboard');
expect(await d.evaluate(async()=>{const it=await navigator.clipboard.read(),bl=await it[0].getType('image/png'),im=await createImageBitmap(bl);return im.width>=800}),'copied QR is large enough to print');
await d.keyboard.press('Escape');await d.waitForTimeout(150);
// 2. observership application
await d.goto(U+'#observers');await d.waitForTimeout(400);await d.click('[data-act="obs-qr"]');await d.waitForTimeout(300);
t=await tools();expect(t.includes('qr-copy')&&t.includes('qr-dl')&&t.includes('qr-poster'),'observership: copy, download, poster');
expect(/^Poster Observership application - RIC\.png$/.test(await dl('#overlay [data-act="qr-poster"]','qr-obs-poster.png')),'observership poster downloaded');
await d.keyboard.press('Escape');await d.waitForTimeout(150);
// 3. workshop registration: the small QR on the page opens the same view
const wid=await d.evaluate(()=>{const w=DB.workshops.find(w=>w.stage>=3&&w.stage<5)||DB.workshops[0];w.stage=Math.max(w.stage,4);w.regOpen=true;persist();return w.id});
await d.goto(U+'#ws-'+wid);await d.waitForTimeout(500);
const tabs=await d.$$('main [data-sec], main [data-tab]');for(const x of tabs){const tx=(await x.textContent()).trim();if(/^Registration/i.test(tx)){await x.click();await d.waitForTimeout(300);break}}
const hint=await d.$('main .qrhint');expect(!!hint,'workshop page: small QR has a "copy or download" button');
if(hint){await hint.click();await d.waitForTimeout(300);t=await tools();expect(t.includes('qr-copy')&&t.includes('qr-poster'),'workshop registration QR: copy and poster');
 expect(/^QR /.test(await dl('#overlay [data-act="qr-dl"]','qr-ws.png')),'workshop QR downloaded');await d.keyboard.press('Escape');await d.waitForTimeout(150)}
await d.screenshot({path:OUT+'qr-tools.png'});
// 4. workshop check-in QR (redrawn every 15 seconds; the buttons come back each time)
await d.click('main [data-act="ws-attqr"]');await d.waitForTimeout(300);t=await tools();expect(t.includes('qr-copy')&&t.includes('qr-poster'),'check-in QR: copy and poster');
await d.evaluate(()=>{const w=DB.workshops.find(x=>x.id===document.querySelector('#overlay [data-act="ws-atttoggle"]').dataset.id);attOverlay(w)});await d.waitForTimeout(200);
expect((await tools()).includes('qr-copy'),'check-in QR: buttons kept after the view refreshes');await d.keyboard.press('Escape');
// 5. any QR picture carries its link
expect(await d.evaluate(()=>/data-qr="https?:/.test(qrSvg('https://example.org/x',2))),'every QR picture carries its link');
await b.close()})();
