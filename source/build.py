"""Build the RIC DME Office app.
    python3 source/build.py            -> source/dist/ (live page and prototype)
    python3 source/build.py --deploy   -> also copies the live page and everything in source/hosting/ to the site root
The prototype uses source/private/ (real names, kept only on the Director's computer, never on GitHub)
when it is there, and the made-up demo data in source/sample/ otherwise."""
import os,sys,shutil
B=os.path.dirname(os.path.abspath(__file__))+'/'
OUT=B+'dist/'
os.makedirs(OUT,exist_ok=True)
PRIV=os.path.exists(B+'private/data.json')
DATA=B+('private/data.json' if PRIV else 'sample/demo-data.json')
RESULTS=B+('private/sample_results.json' if PRIV else 'sample/demo-results.json')
import re,base64
s=open(B+'app/src.html').read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(a[:70],s.count(a)); s=s.replace(a,b)
s=re.sub(r'const ROT_SPECS=.*?\n',"",s,count=1)
s=re.sub(r'const DUR=.*?\n',"",s,count=1)
s=re.sub(r'const SPEC_ORDER=.*?\n',lambda m:open(B+'build/specs.js').read(),s,count=1)
rep('const KEY="ric-dme-proto-v1";','const KEY="ric-dme-proto-v7";')
rep('leave_recent:7,cert_warn:90};','leave_recent:7,cert_warn:90,proposal_weeks:8};')
s,n=re.subn(r' d\.rules=\{[^\n]*\};\n',lambda m:''' d.specs=JSON.parse(JSON.stringify(DEF_SPECS));
 d.units=["Unit 1","Unit 2","Unit 3","Unit 4"];
 d.staff=[{name:"Dr. Daniyal Ahmad Kamal",email:"daniyal9394@gmail.com",role:"Admin",desig:"Director of Medical Education",seeAll:true,sections:[],me:true},{name:"Executive Director",desig:"Executive Director",email:"",role:"Viewer",seeAll:true,conduct:false,sections:["tasks","pgts","leaves","verify","faculty","supervisors","credentials","workshops","exams","orientation","audit"]},{name:"Training Officer",desig:"Training Officer",email:"",role:"Editor",seeAll:true,conduct:true,sections:["tasks","pgts","leaves","verify","faculty","supervisors","credentials","workshops","exams","orientation","audit"]},{name:"Data Entry Operator",desig:"Data Entry Operator",email:"",role:"Editor",seeAll:false,sections:["tasks","pgts","leaves","verify","faculty","supervisors","credentials"]},{name:"Library Assistant",desig:"Library Assistant",email:"",role:"Editor",seeAll:false,sections:["tasks","workshops"]}];
 d.workshops=seedWorkshops();
 d.tasks=seedTasks();
 d.exams=seedExams();
 d.orients=seedOrients();
 d.conduct=[];
''',s,count=1); assert n==1
rep('const rotational=!!ROT_SPECS[p.spec],rule=DB.rules[p.spec]||[2,3,.5,1.5,3];','const sp=specOf(p.spec),rotational=!!sp?.rotational,rule=sp?.rule||[2,3,.5,1.5,3];')
rep('const bySpec=SPEC_ORDER.filter(','const bySpec=DB.specs.map(s=>s.name).filter(')
rep('${SPEC_ORDER.slice(0,9).map(s=>`<option ${UI.spec===s','${specNames(1).map(s=>`<option ${UI.spec===s')
rep('.sort((a,b)=>SPEC_ORDER.indexOf(a[0].spec)-SPEC_ORDER.indexOf(b[0].spec)','.sort((a,b)=>specIdx(a[0].spec)-specIdx(b[0].spec)')
rep('${SPEC_ORDER.map(s=>`<option ${UI.fspec===s','${specNames().map(s=>`<option ${UI.fspec===s')
rep('opt(SPEC_ORDER.slice(0,9),p.spec)','opt(specNames(1),p.spec)')
rep('opt(SPEC_ORDER,f.spec)','opt(specNames(),f.spec)')
rep('opt([["","None"],"Unit 1","Unit 2","Unit 3","Unit 4"],f.unit)','opt([["","None"],...DB.units],f.unit)')
rep('opt(DB.sites.map(s=>[s.short,s.name]),r?.site||"HFH")','opt(DB.sites.filter(s=>s.active||s.short===r?.site).map(s=>[s.short,s.name]),r?.site||"HFH")')
rep('const NAV=[["overview","Overview"],["pgts","PGTs"],["verify","Verification"],["faculty","Faculty"],["settings","Settings"],["audit","Audit log"]];',
    'const NAV=[["overview","Overview"],["tasks","Tasks"],["pgts","PGTs"],["leaves","Leave"],["verify","Verification"],["faculty","Faculty"],["supervisors","Supervisors"],["credentials","Faculty updates"],["workshops","Workshops"],["exams","Exams"],["orientation","Orientation"],["settings","Settings"],["audit","Audit log"]];')
rep('const m=h.match(/^(pgt|fac)-(\\w+)$/)','const m=h.match(/^(pgt|fac|ws|fb|task|fbedit|pfedit|pfill|prop|exam|orient|reg|rgedit)-(\\w+)$/)')
rep('const cur=route.v==="pgt"?"pgts":route.v==="fac"?"faculty":route.v;','const cur=route.v==="pgt"?"pgts":route.v==="fac"?"faculty":["ws","fb","fbedit","pfedit","pfill","prop","reg","rgedit","attend"].includes(route.v)?"workshops":route.v==="task"?"tasks":route.v==="exam"?"exams":route.v==="orient"?"orientation":route.v;')
rep('settings:vSettings,audit:vAudit}','settings:vSettings,audit:vAudit,leaves:vLeaves,credentials:vCreds,workshops:vWorkshops,ws:vWs,tasks:vTasks,task:vTask,fb:vFb,fbedit:vFbEdit,pfedit:vPfEdit,pfill:vPfill,prop:vProp,exams:vExams,exam:vExam,orientation:vOrients,orient:vOrient,supervisors:vSupervisors,reg:vReg,rgedit:vRgEdit}')
s,n=re.subn(r'function vSettings\(\)\{.*?\n(?=function vAudit\(\))','',s,flags=re.S); assert n==1
s,n=re.subn(r' if\(d\.lt!=null\)\{[^\n]*\n','',s); assert n==1
s,n=re.subn(r' if\(a==="addlt"\)\{[^\n]*\n','',s); assert n==1
rep(' if(t.dataset.rule&&t.value!==""){DB.rules[t.dataset.rule][+t.dataset.i]=+t.value;persist()}});',' });')
rep('if(t.dataset.rule){log(`Changed rotation rule for ${t.dataset.rule}`)}','')
rep('<div class="actions"><button class="btn" data-act="addcred" data-id="${f.id}">Add certificate</button>','<div class="actions"><button class="btn primary" data-act="cr-pick" data-id="${f.id}">Update credentials</button><button class="btn" data-act="addcred" data-id="${f.id}">Add certificate</button>')
s,n=re.subn(r'function vOverview\(\)\{.*?\n(?=/\* ---------- PGT LIST)','',s,flags=re.S); assert n==1
rep('/* ---------- events ---------- */',open(B+'app/new_modules.js').read().replace('/*__WS2__*/',open(B+'app/ws2.js').read())+open(B+'app/tasks.js').read()+open(B+'app/phase4.js').read()+open(B+'app/p5.js').read()+open(B+'app/p6.js').read()+open(B+'app/p7.js').read()+open(B+'app/p8.js').read()+open(B+'app/p9.js').read()+open(B+'app/p10.js').read()+open(B+'app/p11.js').read()+open(B+'app/p12.js').read()+open(B+'app/p13.js').read()+open(B+'app/p14.js').read()+open(B+'app/p15.js').read()+open(B+'app/p16.js').read()+open(B+'app/p17.js').read()+open(B+'app/p18.js').read()+open(B+'build/biodata.js').read()+open(B+'app/p19.js').read()+open(B+'app/p20.js').read()+open(B+'app/p21.js').read()+open(B+'app/p22.js').read()+open(B+'app/p23.js').read()+open(B+'app/p24.js').read()+open(B+'app/p25.js').read()+open(B+'app/p26.js').read()+open(B+'app/p27.js').read()+open(B+'app/p28.js').read()+open(B+'app/p29.js').read()+open(B+'omr/omrsheet.js').read()+open(B+'omr/omrread.js').read()+open(B+'app/p30.js').read()+open(B+'app/p31.js').read()+open(B+'app/p32.js').read()+open(B+'app/p33.js').read()+open(B+'app/p34.js').read()+open(B+'app/p35.js').read()+open(B+'app/p36.js').read()+open(B+'app/p37.js').read()+open(B+'app/p38.js').read()+open(B+'app/p39.js').read()+open(B+'app/p40.js').read()+open(B+'app/p41.js').read()+open(B+'app/p42.js').read()+open(B+'app/p43.js').read()+open(B+'app/p44.js').read()+open(B+'app/p45.js').read()+open(B+'app/p46.js').read()+open(B+'app/p47.js').read()+open(B+'app/p48.js').read()+open(B+'app/p49.js').read()+open(B+'app/p50.js').read()+open(B+'app/p51.js').read()+open(B+'app/p52.js').read()+open(B+'app/p53.js').read()+open(B+'app/p54.js').read()+open(B+'app/p55.js').read()+open(B+'app/p56.js').read()+open(B+'app/p57.js').read()+open(B+'app/p58.js').read()+'\n/* ---------- events ---------- */')
rep('route=parse();render();\n</script>',open(B+'build/listeners.js').read()+'route=parse();render();\n</script>')
rep('@media (prefers-reduced-motion:no-preference){.sheet',open(B+'build/extra.css').read()+open(B+'build/extra9.css').read()+open(B+'build/extra10.css').read()+'@media (prefers-reduced-motion:no-preference){.sheet')

rep('if(!DB||!DB.pgts)DB=seed();\n','')
rep('route=parse();render();\n</script>','if(!DB||!DB.pgts)DB=seed();\nroute=parse();render();\n</script>')
rep('${k==="verify"&&pend?`<span class="cnt">${pend}</span>`:""}','${k==="verify"&&pend?`<span class="cnt">${pend}</span>`:""}${k==="tasks"&&DB.tasks.filter(tOverdue).length?`<span class="cnt late">${DB.tasks.filter(tOverdue).length}</span>`:""}')
rep('<script>\nconst SEED','<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n<script>\nconst SEED')
s,n=re.subn(r'function vPgts\(\)\{.*?\n(?=/\* ---------- PGT PROFILE)','',s,flags=re.S); assert n==1
rep('<button class="btn primary" data-act="addfac">Add faculty member</button></div>','<div class="actions">${xbtn("faculty")}<button class="btn primary" data-act="addfac">Add faculty member</button></div></div>')
rep(' return`<div class="head"><div><h2>Faculty</h2>',' LAST.faculty=rows;return`<div class="head"><div><h2>Faculty</h2>')
rep('In the live app this cannot be edited or deleted.</p></div></div>','In the live app this cannot be edited or deleted.</p></div><div class="actions">${xbtn("audit")}</div></div>')

rep('const ME="Dr. Daniyal Ahmad Kamal";','let ME="Dr. Daniyal Ahmad Kamal";try{ME=localStorage.getItem("ric-dme-me")||ME}catch(e){}')
rep('if(!DB||!DB.pgts)DB=seed();\nroute=parse();render();','if(!DB||!DB.pgts)DB=seed();\nif(!DB.staff.some(s=>s.name===ME))ME=DB.staff[0].name;\nroute=parse();render();')
s,n=re.subn(r'document\.getElementById\("nav"\)\.innerHTML=NAV\.map\(.*?\.join\(""\);',lambda _:'renderChrome(cur);if(!canSee(cur)){document.getElementById("main").innerHTML=`<div class="panel empty">You do not have access to this section. Ask the Director of Medical Education to change your access.</div>`;return}',s,count=1); assert n==1
rep('''<div class="appbar"><div class="wrap">
  <img src="__RIC__" alt="RIC logo">
  <div class="t"><h1>DME Office</h1><div class="s">Rawalpindi Institute of Cardiology · Medical Education &amp; Training</div></div>
  <div class="user">Signed in as<br><b>Dr. Daniyal Ahmad Kamal</b> · Admin</div>
</div></div>
<nav class="tabs" aria-label="Sections"><div class="wrap" id="nav"></div></nav>''','''<div class="appbar"><div class="abwrap">
  <button class="navbtn" data-act="navtoggle" aria-label="Menu"><span></span><span></span><span></span></button>
  <img src="__RIC__" alt="RIC logo">
  <div class="t"><h1>DME Office</h1><div class="s"><span class="hide-sm">Rawalpindi Institute of Cardiology · </span><span id="crumb"></span></div></div>
  <div id="userbox"></div>
</div></div>''')
rep('<main class="wrap" id="main"></main>','<div class="shell"><aside class="sidenav" aria-label="Sections"><nav id="nav"></nav><div id="installbox" class="installbox"></div></aside><div class="navscrim" data-act="navclose"></div><main class="wrap" id="main"></main></div>')

rep(' ev.sort((a,b)=>(b.d||"9999")<(a.d||"9999")?-1',' ev.push(...extraTimeline(p));\n ev.sort((a,b)=>(b.d||"9999")<(a.d||"9999")?-1')
rep(""" ${f.length?`<div class="flag">${f.map(esc).join("<br>")}</div>`:""}
 <div class="cols side">
  <div class="panel"><h3>Timeline</h3>${timeline(p)}</div>""",""" ${f.length?`<div class="flag">${f.map(esc).join("<br>")}</div>`:""}
 ${pgtExamPanel(p)}${pgtConductPanel(p)}
 <div class="cols side">
  <div class="panel"><h3>Timeline</h3>${timeline(p)}</div>""")
rep('<button class="btn" data-act="editpgt" data-id="${p.id}">Edit details</button></div>','${canConduct()&&p.reg==="Verified"?`<button class="btn" data-act="cd-add" data-id="${p.id}">Add conduct record</button>`:""}<button class="btn" data-act="editpgt" data-id="${p.id}">Edit details</button></div>')
rep('<button class="btn" data-act="editpgt" data-id="${p.id}">Edit details</button></div>','<button class="btn" data-act="editpgt" data-id="${p.id}">Edit details</button>${isAdmin()?`<button class="btn danger" data-act="pgt-remove" data-id="${p.id}">Remove from register</button>`:""}</div>')
rep('.k-status{--k:var(--brand)}','.k-exam{--k:var(--ok)}.k-conduct{--k:var(--bad)}.k-status{--k:var(--brand)}')

rep('<span>${c.year?"Year "+c.year:""}</span>','<span>${esc(ricLabel(p))}</span>')

rep(' return d}\nlet DB',' d.pgts.filter(p=>p.example).forEach(p=>{const s=sessOf(p.start),pre=`PGT/${s.slice(4)}/${s.startsWith("Jan")?1:7}/`;p.code=pre+String(Math.max(0,...d.pgts.filter(x=>x!==p&&(x.code||"").startsWith(pre)).map(x=>+x.code.split("/")[3]||0))+1).padStart(2,"0")});\n d.exams.unshift(seedPastExam(d));\n return d}\nlet DB')
rep('if(a==="verify"){p.code=nextCode(p);','if(a==="verify"){if(!p.code||p.code==="—"||DB.pgts.some(x=>x!==p&&x.code===p.code))p.code=nextCode(p);')
rep('<dt>PGT ID on verification</dt><dd class="code">${nextCode(p)}</dd></dl>','<dt>PGT ID</dt><dd class="code">${p.code||nextCode(p)} <span class="subt">reserved in order of registration · roll no. ${rollOf(p)||"—"}</span></dd></dl>')
rep('<div class="who"><div class="code">${esc(p.code)||"No PGT ID yet"}</div><h2>${pgtName(p)}</h2>','<div class="who"><div class="code">${esc(p.code)||"No PGT ID yet"}${rollOf(p)?` · roll no. ${rollOf(p)}`:""}</div><h2>${pgtName(p)}</h2>')

rep('<th>PGT</th><th>Prog.</th><th class="num">Year</th><th>Status</th><th>Completion</th>','<th>PGT</th><th>Prog.</th><th>Year at RIC</th><th>Status</th><th>Completion</th>')
rep('<td>${esc(p.program)}</td><td class="num">${k.year}</td><td>${phasePill(k)}</td>','<td>${esc(p.program)}</td><td>${esc(ricLabel(p))}</td><td>${phasePill(k)}</td>')

# ---------- v9 ----------
rep('const NAV=[["overview","Overview"],','const NAV=[["overview","Overview"],["exits","Left training"],')
rep('|orient|reg|rgedit)-(\\w+)$/)','|orient|reg|rgedit|cert|certx|attend)-(\\w+)$/)')
rep('route.v==="orient"?"orientation":route.v;','route.v==="orient"?"orientation":route.v==="cert"?"workshops":route.v==="certx"?"exams":route.v;')
rep('reg:vReg,rgedit:vRgEdit}','reg:vReg,rgedit:vRgEdit,exits:vExits,cert:vCertWs,certx:vCertEx}')
rep('opt(STATUSES,','opt(statusList(),',2)
rep('departed=["Completed","Resigned","Terminated"].includes(status);','departed=status==="Completed"||isExit(status);')
rep('if(k==="bad")return["Resigned","Terminated"].includes(c.status);','if(k==="bad")return isExit(c.status);')
rep('["bad","Departed"]','["bad","Left training"]')
rep('if(!DB||!DB.pgts)DB=seed();\nif(!DB.staff.some(s=>s.name===ME))ME=DB.staff[0].name;\nroute=parse();render();\n</script>','bootApp();\n</script>')
rep('const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}};','const persist=()=>{if(typeof isViewer==="function"&&isViewer())return;if(SYNC&&SYNC.on){SYNC.dirty();return}if(LIVE)return;try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}};')
rep('DB.audit.unshift({at:new Date().toISOString(),by:ME,what,ref:ref||""})','DB.audit.unshift({id:uid("A"),at:new Date().toISOString(),by:ME,what,ref:ref||""})')
rep('<dt>Father\'s name</dt><dd class="masked">hidden in prototype</dd><dt>CNIC</dt><dd class="masked">hidden in prototype</dd><dt>PMDC</dt><dd class="masked">hidden in prototype</dd><dt>Mobile · email</dt><dd class="masked">hidden in prototype</dd>','${personalHtml(p)}')
rep('<div class="docs">${["Photo","CNIC copy","PMDC copy","Joining letter"].map(d=>`<div class="doc"><b>${d}</b>${p.example?"Uploaded":"Not on file for imported records"}</div>`).join("")}</div>','<div class="docs">${docsHtml(p)}</div>')
rep('<div class="docs">${["Photo","CNIC copy","PMDC copy","Joining letter"].map(d=>`<div class="doc"><b>${d}</b>Tap to view (live app)</div>`).join("")}</div>','<div class="docs">${docsHtml(p)}</div>')
rep('<div class="panel"><h3>Documents</h3><div class="docs">${docsHtml(p)}</div>','${bioPanel(p)}<div class="panel"><h3>Documents</h3><div class="docs">${docsHtml(p)}</div>')
rep('<a class="btn" href="#pgt-${p.id}">Open</a></div></div>','${p.bio?`<button class="btn" data-act="bio-pdf" data-id="${p.id}">Bio data PDF</button>`:""}<a class="btn" href="#pgt-${p.id}">Open</a></div></div>')
rep('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4','<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&family=Great+Vibes&family=Montserrat:wght@600&display=swap">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4')
rep('<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>','<!-- LIVE CONFIG -->\n<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>')
rep('<h2>Verification</h2><p>Registrations submitted through the PGT link. Check details against the documents, then verify.</p></div></div>','<h2>Verification</h2><p>Registrations submitted through the PGT link. Check details against the documents, then verify.</p></div></div>${regLinkPanel("pgt")}')
rep('function render(){\n recompute();','function render(){\n TODAY.setTime(new Date(new Date().toDateString()).getTime());\n recompute();')
rep('const NAV=[["overview","Overview"],','const NAV=[["search","Search"],["overview","Overview"],')
rep('reg:vReg,rgedit:vRgEdit,exits:vExits,','reg:vReg,rgedit:vRgEdit,attend:vAttend,search:vSearch,exits:vExits,')
rep(' <div class="flag info">Leave does not change the completion date. Use "Edit details" to set a new completion date if needed.</div>`,()=>{',' <div class="flag info">Leave does not change the completion date. Use "Edit details" to set a new completion date if needed.</div>${l?`<button type="button" class="btn link" style="justify-self:start;color:var(--bad)" data-act="rec-del" data-k="leaves" data-id="${l.id}">Delete this leave</button>`:""}`,()=>{')
rep(' <div class="flag info">The latest rotation entry replaces the dates calculated from the rotation rules.</div>`,()=>{',' <div class="flag info">The latest rotation entry replaces the dates calculated from the rotation rules.</div>${r?`<button type="button" class="btn link" style="justify-self:start;color:var(--bad)" data-act="rec-del" data-k="rots" data-id="${r.id}">Delete this rotation</button>`:""}`,()=>{')
rep('<label class="f">Notes<textarea name="notes">${esc(s.notes)}</textarea></label>`,()=>{Object.assign(s,{status:','<label class="f">Notes<textarea name="notes">${esc(s.notes)}</textarea></label>${DB.status.filter(x=>x.pid===p.id).length>1?`<button type="button" class="btn link" style="justify-self:start;color:var(--bad)" data-act="rec-del" data-k="status" data-id="${s.id}">Delete this status entry</button>`:""}`,()=>{Object.assign(s,{status:')
rep('const pgtName=p=>`Dr. ${esc(p.name)}`;','const pgtName=p=>p&&p.guest?`<span>${esc(candName(p))}</span> <span class="pill p-rot">not a PGT</span>`:`<span class="pn" data-pid="${p.id}" tabindex="0">Dr. ${esc(p.name)}</span>`;')
rep('<dt>Supervisor</dt><dd>${esc(facName(c.sup))}</dd>','<dt>Supervisor</dt><dd>${facLink(c.sup)}</dd>')
rep('<td>${c.sup?esc(facName(c.sup)):','<td>${c.sup?facLink(c.sup):')
rep('<div id="userbox"></div>','<input id="topq" class="topq" type="search" placeholder="Search trainees, observers, faculty, exams…  ( / )" aria-label="Search" autocomplete="off"><a class="topsearch" href="#search" aria-label="Search"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></a><div id="userbox"></div>')
for a_,b_ in [('<h2>Overview</h2>','<h2>Dashboard</h2>'),('<h2>PGTs</h2>','<h2>Trainee register</h2>'),('<h2>Verification</h2>','<h2>New registrations</h2>'),('<h2>Faculty updates</h2>','<h2>Credentials</h2>'),('<h2>Faculty</h2>','<h2>Faculty directory</h2>')]:
    rep(a_,b_)
s=s.replace('<h2>PGT examinations</h2>','<h2>Examinations</h2>')
rep('const NAV=[["search","Search"],','const NAV=[["datacheck","Data checks"],["search","Search"],')
rep('|cert|certx|attend)-(\\w+)$/)','|cert|certx|attend|cred|rot|obs)-(\\w+)$/)')
rep('route.v==="cert"?"workshops":route.v==="certx"?"exams":route.v;','route.v==="cert"?"workshops":route.v==="certx"?"exams":route.v==="cred"?"credentials":route.v==="rot"||route.v==="kiosk"?"rotating":route.v==="surform"?"status":route.v;')
rep('attend:vAttend,search:vSearch,','attend:vAttend,search:vSearch,datacheck:vDataCheck,cred:()=>{if(UI.credFac!==route.id){UI.credFac=route.id;UI.credType=null}return vCreds()},')
rep('<div class="actions">${xbtn("faculty")}','<div class="actions">${waBtn("faculty","WhatsApp these")}${xbtn("faculty")}')
rep('const NAV=[["datacheck","Data checks"],','const NAV=[["observers","Observership"],["rotating","Rotating trainees"],["status","Training status"],["surform","Training status form"],["kiosk","Attendance kiosk"],["calendar","Academic calendar"],["messages","WhatsApp"],["datacheck","Data checks"],')
rep('search:vSearch,datacheck:vDataCheck,','search:vSearch,datacheck:vDataCheck,messages:vMessages,calendar:vCalendar,rotating:vRotating,observers:vObservers,obs:vObs,status:vStatus,surform:vSurForm,rot:vRot,kiosk:vKiosk,')
rep('observers:vObservers,obs:vObs,','observers:vObservers,obs:vObs,accr:vAccr,')
rep('const NAV=[["observers","Observership"],','const NAV=[["accr","Accreditation"],["observers","Observership"],')
rep('if(k==="datacheck")k="pgts";','if(k==="datacheck"||k==="accr")k="pgts";')
for bad in ['SPEC_ORDER','DB.rules','ROT_SPECS','DUR[']: assert bad not in s,bad

open(B+'app/src2.html','w').write(s)
s=s.replace('__RIC__','data:image/jpeg;base64,'+base64.b64encode(open(B+'img/logo-000-s.jpg','rb').read()).decode()).replace('__PUNJAB__','data:image/jpeg;base64,'+base64.b64encode(open(B+'img/logo-001-s.jpg','rb').read()).decode()).replace('__DATA__',open(DATA).read()).replace('__SAMPLE__',open(RESULTS).read())
s=s.replace('__CERTLOGO__','data:image/png;base64,'+base64.b64encode(open(B+'build/cert/logo480.png','rb').read()).decode()).replace('__CERTWM__','data:image/png;base64,'+base64.b64encode(open(B+'build/cert/wm.png','rb').read()).decode())
assert '__CERT' not in s
open(OUT+'ric-dme-office.html','w').write(s)
cfg='''<!-- Supabase settings live in config.js, next to this file -->
<script src="config.js"></script>'''
# the install links must be in the page head (browsers ignore a manifest link in the body)
pwa='''<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#FFFFFF">
<link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="icon" href="icon-192.png">
<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="DME Office"><meta name="apple-mobile-web-app-status-bar-style" content="default">\n'''
h=open(B+'app/src2.html').read().replace('__RIC__','data:image/jpeg;base64,'+base64.b64encode(open(B+'img/logo-000-s.jpg','rb').read()).decode()).replace('__PUNJAB__','data:image/jpeg;base64,'+base64.b64encode(open(B+'img/logo-001-s.jpg','rb').read()).decode()).replace('__DATA__','{"pgts":[],"faculty":[],"creds":[],"status":[],"rots":[],"sups":[],"leaves":[]}').replace('__SAMPLE__','[]')
h=h.replace('__CERTLOGO__','data:image/png;base64,'+base64.b64encode(open(B+'build/cert/logo480.png','rb').read()).decode()).replace('__CERTWM__','data:image/png;base64,'+base64.b64encode(open(B+'build/cert/wm.png','rb').read()).decode())
assert '"declYear"' not in h, 'prototype data must never be in the live page'
import json as _j
if PRIV:open(OUT+'dme-initial-data.json','w').write(_j.dumps({'seed':_j.load(open(DATA)),'sample':_j.load(open(RESULTS))}))
_o='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'+pwa+h.replace('<!-- LIVE CONFIG -->',cfg)
import hashlib as _h
_o=_o.replace('__BUILD__',_h.sha1(_o.encode()).hexdigest()[:12])
open(OUT+'index.html','w').write(_o)
if '--deploy' in sys.argv:
    ROOT=os.path.dirname(B.rstrip('/'))+'/'
    assert os.path.exists(ROOT+'config.js'), 'deploy: the site root (with config.js) is not the folder above source/'
    shutil.copyfile(OUT+'index.html',ROOT+'index.html')
    for f in sorted(os.listdir(B+'hosting')):
        if f!='config.js':shutil.copyfile(B+'hosting/'+f,ROOT+f)
    print('deployed index.html and the files in source/hosting/ to',ROOT)
print("built", "(prototype with private data)" if PRIV else "(prototype with demo data)")
