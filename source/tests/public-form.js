const path=require('path'),fs=require('fs'),{execFileSync}=require('child_process');const N=path.join(__dirname,'node_modules')+'/';const FIX=path.join(__dirname,'fixtures')+'/';const OUT=path.join(__dirname,'out')+'/';fs.mkdirSync(OUT,{recursive:true});
/* The public observership form (?obs=1) on the live page, with Supabase replaced by a stand-in that runs the real
   database function in a local Postgres (PGURL, e.g. postgresql://postgres@/pilot?host=/tmp&port=5433, loaded with
   source/sql/02_pilot_setup.sql). Skipped when PGURL is not set. */
const PG=process.env.PGURL;if(!PG){console.log('skipped: set PGURL to a test database loaded with 02_pilot_setup.sql');process.exit(0)}
const sql=(q,p)=>execFileSync('psql',[PG,'-q','-t','-A','-v','ON_ERROR_STOP=1','-v','p='+(p||''),'-f','-'],{encoding:'utf8',input:q+';'}).trim();
const {chromium}=require('playwright');
(async()=>{const site=path.join(OUT,'site');fs.mkdirSync(site,{recursive:true});fs.copyFileSync(path.join(__dirname,'..','..','index.html'),path.join(site,'index.html'));
 fs.writeFileSync(path.join(site,'config.js'),'window.DME_SUPABASE={url:"https://test.supabase.co",anonKey:"test-anon"};');
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:420,height:900},acceptDownloads:true});
 const R={'supabase-js@2.117.3/dist/umd/supabase.js':'@supabase/supabase-js/dist/umd/supabase.js','qrcode-generator@1.4.4/qrcode.js':'qrcode-generator/qrcode.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','xlsx/0.18.5/xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js'};
 for(const[k,v] of Object.entries(R))await ctx.route('**/'+k,r=>r.fulfill({path:N+v,contentType:'application/javascript'}));
 await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
 const uploads=[];let sent=null;
 await ctx.route('https://test.supabase.co/**',async r=>{const u=new URL(r.request().url()),m=r.request().method();
  if(m==='OPTIONS')return r.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
  const H={'content-type':'application/json','access-control-allow-origin':'*'};
  if(u.pathname==='/rest/v1/rpc/dme_public_lists')return r.fulfill({status:200,headers:H,body:sql('select dme_public_lists()')||'{}'});
  if(u.pathname==='/rest/v1/rpc/dme_submit_obs'){sent=JSON.parse(r.request().postData()).p;return r.fulfill({status:200,headers:H,body:sql("select dme_submit_obs(:'p'::jsonb)",JSON.stringify(sent))})}
  if(u.pathname.startsWith('/storage/v1/object/dme-uploads/')){const k=decodeURIComponent(u.pathname.slice('/storage/v1/object/dme-uploads/'.length));uploads.push(k);return r.fulfill({status:200,headers:H,body:JSON.stringify({Key:'dme-uploads/'+k,Id:'x'})})}
  return r.fulfill({status:200,headers:H,body:'{}'})});
 const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 const expect=(ok,what)=>console.log(ok?'ok:':'ERR expected:',what);
 sql("delete from dme_records where coll='visitors' and data->>'cnic' in ('37405-1234599-9','37405-1234598-8')");
 await p.goto('file://'+site+'/index.html?obs=1');await p.waitForTimeout(2500);
 expect(await p.$('#obsform')!==null,'form opens');
 const fill=async(o)=>{await p.selectOption('#obsform [name=title]','Mr.');await p.fill('#obsform [name=name]',o.n);await p.fill('#obsform [name=father]','Tariq Mahmood');await p.selectOption('#obsform [name=gender]','Male');await p.fill('#obsform [name=cnic]',o.c);await p.fill('#obsform [name=mobile]','03001112233');await p.fill('#obsform [name=email]','u@example.com');
  await p.selectOption('#obsform [name=cat]',{index:3});await p.fill('#obsform [name=degree]','BS Cardiology Technology');await p.fill('#obsform [name=inst]','Pak Austria Institute');await p.fill('#obsform [name=yearStudy]','3rd year');await p.fill('#obsform [name=status2]','6th semester');await p.selectOption('#obsform [name=unit]',{index:2});await p.selectOption('#obsform [name=blocks]','2');await p.fill('#obsform [name=reason]','Hands-on observation of cath lab procedures.');
  await p.setInputFiles('#obsform [name=photoDoc]',FIX+'blank.jpg');await p.setInputFiles('#obsform [name=cnicDoc]',FIX+'blank.jpg');await p.check('#op-decl')};
 await fill({n:'Usman Khalid',c:'3740512345999'});
 await p.click('[data-act="op-submit"]');await p.waitForTimeout(200);expect(/studying or working/.test(await p.$eval('#operr',e=>e.textContent)),'asks whether attached to an institute');
 await p.selectOption('#obsform [name=attached]','1');expect(await p.isVisible('#obsform [name=letterDoc]')&&!(await p.isVisible('#obsform [name=degreeDoc]')),'attached: ID card and letter boxes');
 await p.setInputFiles('#obsform [name=idcardDoc]',FIX+'blank.jpg');await p.click('[data-act="op-submit"]');await p.waitForTimeout(200);expect(/letter from your institute/.test(await p.$eval('#operr',e=>e.textContent)),'letter required when attached');
 await p.setInputFiles('#obsform [name=letterDoc]',FIX+'blank.jpg');await p.emulateMedia({colorScheme:'dark'});await (await p.$('#op-decl')).scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'public-form-docs.png'});await p.emulateMedia({colorScheme:'light'});
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('[data-act="op-submit"]')]);
 expect(/^Observership application - /.test(dl.suggestedFilename()),'applicant gets the application form only: '+dl.suggestedFilename());await p.waitForTimeout(600);
 const done=await p.evaluate(()=>document.querySelector('main').innerText);expect(/You will be given the fee challan|you will be given the fee challan/i.test(done)&&!/challan \(PDF\)/i.test(done)&&!(await p.$('[data-act="op-challan"]')),'done page: no challan download, explains the office hands it over');
 await p.screenshot({path:OUT+'public-done.png',fullPage:true});
 expect(uploads.some(k=>/\/photo\./.test(k))&&uploads.some(k=>/\/idcard\./.test(k))&&uploads.some(k=>/\/letter\./.test(k))&&uploads.some(k=>/\/cnic\./.test(k)),'uploads: '+uploads.map(k=>k.split('/').pop()).join(', '));
 const row=JSON.parse(sql("select data from dme_records where coll='visitors' and data->>'cnic'='37405-1234599-9'")||'null');
 expect(row&&row.attached===true&&row.docs.photo&&row.docs.letter&&row.docs.idcard&&!row.docs.degree&&row.fees[0].status==='unpaid'&&!row.fees[0].issued,'saved in the database: '+JSON.stringify(row&&{docs:Object.keys(row.docs),attached:row.attached,fee:row.fees[0]}));
 // not attached: degree instead
 await p.goto('file://'+site+'/index.html?obs=1');await p.waitForTimeout(2000);await fill({n:'Sara Malik',c:'3740512345988'});await p.selectOption('#obsform [name=attached]','0');
 await p.click('[data-act="op-submit"]');await p.waitForTimeout(200);expect(/Attach your degree/.test(await p.$eval('#operr',e=>e.textContent)),'degree required when not attached');
 await p.setInputFiles('#obsform [name=degreeDoc]',FIX+'blank.jpg');await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click('[data-act="op-submit"]')]);await p.waitForTimeout(500);
 const row2=JSON.parse(sql("select data from dme_records where coll='visitors' and data->>'cnic'='37405-1234598-8'")||'null');expect(row2&&row2.attached===false&&row2.docs.degree&&!row2.docs.letter,'not attached: degree saved');
 await b.close()})();
