/* =====================================================================
   PHASE 7: year at RIC, exam lists per specialty (Evalbee), supervisors tab
   ===================================================================== */
function ricInfo(p){if(!p.start)return{y:null,label:"—",k:"x"};const sp=specOf(p.spec),rot=!!sp?.rotational;let join;
 if(!rot)join=p.start;
 else if(p.program==="FCPS")join=arrival(p).date;
 else{const r=DB.rots.filter(x=>x.pid===p.id&&x.ret).sort((a,b)=>a.start<b.start?-1:1)[0];join=r?.ret||iso(addM(p.start,Math.round(((sp.rule[2]??.5)+(sp.rule[3]??1.5))*12)))}
 const max=Math.max(1,Math.ceil(rot?(p.program==="FCPS"?(sp.rule[1]||3):(sp.rule[4]||3)):(p.dur||3)));
 if(TODAY<P(join)){if(rot&&p.program!=="FCPS"){const six=addM(p.start,Math.round((sp.rule[2]??.5)*12));if(TODAY>=P(p.start)&&TODAY<six)return{y:0,label:"Initial 6 months",k:"init",join,max}}
  return{y:null,label:TODAY<P(p.start)?"Not started":"Not yet at RIC",k:"pre",join,max}}
 const y=Math.min(Math.floor(days(TODAY,P(join))/365.25)+1,max);return{y,label:"Year "+y,k:"y"+y,join,max}}
const ricLabel=p=>{const r=ricInfo(p);return r.y?`RIC year ${r.y}`:r.label};

/* ---------- exam: one candidate list per specialty ---------- */
UI.exYear="";
function genRolls(x){const C=exCands(x);x.roll={};exSpecs(x).forEach(s=>{const sn=specIdx(s)+1;const byY={};C.filter(p=>p.spec===s).forEach(p=>{const y=ricInfo(p).y||0;(byY[y]=byY[y]||[]).push(p)});
 Object.keys(byY).sort().forEach(y=>byY[y].sort((a,b)=>a.name.localeCompare(b.name)).forEach((p,i)=>x.roll[p.id]=`${sn}${y}${String(i+1).padStart(3,"0")}`))});
 xlog(x,`${C.length} roll numbers generated`);persist();render()}
function examSpecPanel(x,specs,cands,sp,canMark){
 const yOf=p=>examYear(x,p);const all=cands.filter(p=>p.spec===sp),yrs=[...new Set(all.map(yOf))].sort();if(UI.exYear!==""&&!yrs.includes(+UI.exYear))UI.exYear="";
 const C=all.filter(p=>UI.exYear===""||yOf(p)===+UI.exYear).sort((a,b)=>yOf(a)-yOf(b)||(x.roll?.[a.id]||"").localeCompare(x.roll?.[b.id]||"")||a.name.localeCompare(b.name));
 const yl=y=>y?"RIC year "+y:"UHS initial 6 months or not yet at RIC";
 return`<div class="panel flush"><div style="padding:14px 16px 0;display:grid;gap:10px"><div class="head"><h3 style="margin:0">Candidate lists by specialty${canMark?" and marks":""}</h3>
  <div class="actions">${waBtn(`exam:${x.id}:${sp}`,"WhatsApp "+esc(sp))}${x.roll?xbtn(`evalbee:${x.id}:${sp}:${UI.exYear}`,`Download Evalbee list · ${esc(sp)}${UI.exYear!==""?" · "+yl(+UI.exYear):""}`):""}${xbtn(`evalbeeall:${x.id}`,"All specialties (one file each sheet)")}</div></div>
  <div class="chips">${specs.map(s=>`<button class="chip" data-exspec="${esc(s)}" aria-pressed="${s===sp}">${esc(s)}<span class="c">${cands.filter(p=>p.spec===s).length}</span></button>`).join("")}</div>
  <div class="chips">${[["","All years"],...yrs.map(y=>[String(y),yl(y)])].map(([k,l])=>`<button class="chip" data-exyear="${k}" aria-pressed="${UI.exYear===k}">${l}<span class="c">${k===""?all.length:all.filter(p=>yOf(p)===+k).length}</span></button>`).join("")}</div>
  <p class="subt" style="margin:0">${x.roll?"Edit any roll number before downloading. ":"Generate roll numbers first (above). "}The Evalbee file follows your template: ROLLNO, NAME, PHONENO, EMAILID${x.stage<3?". Exclude anyone not sitting, or add a PGT in the candidate list panel":""}. Phone and email fill from the PGT record in the live app; they are hidden in this prototype.</p>
  ${x.stage<3?`<p class="subt" style="margin:0">Marks open once the exam is marked as held.</p>`:""}</div>
  <div class="tblwrap" style="margin-top:8px"><table><thead><tr><th>Roll no.</th><th>PGT</th><th>Prog.</th><th>Year at RIC (at exam)</th><th>Marks %</th><th>Absent</th><th>Result</th><th></th></tr></thead><tbody>
  ${C.map(p=>{const m=x.marks[p.id],ab=x.absent[p.id];return`<tr><td>${x.roll?`<input data-exroll="${p.id}" value="${esc(x.roll[p.id]||"")}" style="width:96px;font-family:var(--f-mono)" ${x.stage>=5?"disabled":""} aria-label="Roll number for Dr. ${esc(p.name)}">`:'<span class="subt">—</span>'}</td><td>${pgtName(p)}<div class="code">${esc(p.code)}</div></td><td>${esc(p.program)}</td><td>${yOf(p)?"RIC year "+yOf(p):"Not in a RIC year"}</td>
   <td><input type="number" min="0" max="100" step="0.5" style="width:90px" data-exmark="${p.id}" value="${m??""}" ${canMark&&!ab?"":"disabled"} aria-label="Marks for Dr. ${esc(p.name)}"></td><td><input type="checkbox" data-exabs="${p.id}" ${ab?"checked":""} ${canMark?"":"disabled"} aria-label="Absent"></td>
   <td>${ab?'<span class="pill p-done">Absent</span>':m==null?"—":exPass(x,p,m)?'<span class="pill p-ric">Pass</span>':'<span class="pill p-bad">Fail</span>'}</td><td>${x.stage<3?`<button class="btn link" data-act="ex-excl" data-id="${p.id}">Exclude</button>`:`<a class="btn link" href="#pgt-${p.id}">Profile</a>`}</td></tr>`}).join("")||`<tr><td colspan="8" class="empty">No candidates in this list.</td></tr>`}
 </tbody></table></div></div>`}
const evalbeeRows=(x,list)=>[["ROLLNO","NAME","PHONENO","EMAILID"],...list.sort((a,b)=>(x.roll?.[a.id]||"").localeCompare(x.roll?.[b.id]||"")).map(p=>[x.roll?.[p.id]||"","Dr. "+p.name,p.mobile||"",p.email||""])];
EXPORTS.evalbee=(id,sp,yr)=>{const x=DB.exams.find(e=>e.id===id);const list=exCands(x).filter(p=>(!sp||p.spec===sp)&&(yr===undefined||yr===""||examYear(x,p)===+yr));
 return{file:`Evalbee ${sp||"all"}${yr!==undefined&&yr!==""?` year ${yr}`:""} ${x.session}`,sheets:[{name:"Template",rows:evalbeeRows(x,list)}]}};
EXPORTS.evalbeeall=id=>{const x=DB.exams.find(e=>e.id===id);return{file:`Evalbee lists ${x.session}`,sheets:exSpecs(x).map(s=>({name:(SPEC_CODE[s]||s).slice(0,28),rows:evalbeeRows(x,exCands(x).filter(p=>p.spec===s))}))}};

/* ---------- supervisors by department ---------- */
UI.sq="";UI.sdept="";UI.stype="";UI.sload="";UI.sprog="";
function supData(){const A=verified().filter(p=>CUR.get(p.id).active);
 const sups=DB.faculty.filter(f=>(f.active!==false&&(f.cpsp||f.uhs))||A.some(p=>CUR.get(p.id).sup?.id===f.id)).map(f=>{const ps=A.filter(p=>CUR.get(p.id).sup?.id===f.id&&(!UI.sprog||(UI.sprog==="CPSP"?p.program==="FCPS":p.program!=="FCPS")));
  return{f,type:f.cpsp&&f.uhs?"CPSP & UHS":f.cpsp?"CPSP":f.uhs?"UHS":"Not approved",cpsp:ps.filter(p=>p.program==="FCPS").sort((a,b)=>a.name.localeCompare(b.name)),uhs:ps.filter(p=>p.program!=="FCPS").sort((a,b)=>a.name.localeCompare(b.name))}});
 const none=A.filter(p=>!CUR.get(p.id).sup);
 return{A,sups,none}}
function supFilter(s){const q=UI.sq.toLowerCase(),n=s.cpsp.length+s.uhs.length;
 if(UI.sdept&&!(s.f.spec===UI.sdept||supsIn(s.f,UI.sdept)))return false;if(UI.stype&&s.type!==UI.stype)return false;if(UI.sload==="has"&&!n)return false;if(UI.sload==="none"&&n)return false;if(UI.sload==="over"&&n<DB.settings.overload)return false;
 if(q&&!((facName(s.f)+" "+s.f.spec+" "+s.f.desig).toLowerCase().includes(q)||[...s.cpsp,...s.uhs].some(p=>(p.name+" "+p.code).toLowerCase().includes(q))))return false;return true}
function vSupervisors(){const{A,sups,none}=supData();const rows=sups.filter(supFilter);LAST.sups=rows;
 const depts=[...new Set(sups.flatMap(s=>[s.f.spec,...supSpecs(s.f).filter(x=>x.cpsp||x.uhs).map(x=>x.spec)]))].sort((a,b)=>specIdx(a)-specIdx(b));
 const dsum=depts.map(d=>{const S=sups.filter(s=>s.f.spec===d||supsIn(s.f,d)),P=A.filter(p=>p.spec===d);return{d,ns:S.filter(s=>s.type!=="Not approved").length,nc:S.filter(s=>s.f.cpsp).length,nu:S.filter(s=>s.f.uhs).length,pc:P.filter(p=>p.program==="FCPS").length,pu:P.filter(p=>p.program!=="FCPS").length,un:none.filter(p=>p.spec===d).length}}).filter(x=>x.ns||x.pc||x.pu);
 const chip=p=>`<a class="pchip" href="#pgt-${p.id}" title="${esc(p.code)} · ${esc(ricLabel(p))}">Dr. ${esc(p.name)}<span>${(r=>r.y?"Y"+r.y:r.k==="init"?"6 mo":"Out")(ricInfo(p))}</span></a>`;
 const legend=`<div class="legend"><span>Badge on each name: Y1 to Y3 = year at RIC · 6 mo = UHS initial 6 months · Out = on rotation, not yet at RIC</span></div>`;
 const typePill=t=>`<span class="pill ${t==="CPSP & UHS"?"p-pend":t==="CPSP"?"p-rot":t==="UHS"?"p-leave":"p-bad"}">${t}</span>`;
 const shown=[...new Set(rows.flatMap(s=>[s.f.spec,...supSpecs(s.f).filter(x=>x.cpsp||x.uhs).map(x=>x.spec)]))].filter(d=>!UI.sdept||d===UI.sdept).sort((a,b)=>specIdx(a)-specIdx(b));
 return`<div class="head"><div><h2>Supervisors by department</h2><p>Approved supervisors and the active PGTs attached to each, with CPSP (FCPS) and UHS trainees counted separately.</p></div><div class="actions">${xbtn("sups")}</div></div>
 <div class="dgrid">${dsum.map(x=>`<button class="dcard ${UI.sdept===x.d?"on":""}" data-sdept="${esc(x.d)}"><b>${esc(x.d)}</b><span class="dn"><span><em>${x.ns}</em> supervisor${x.ns===1?"":"s"}</span><span><em>${x.pc+x.pu}</em> PGT${x.pc+x.pu===1?"":"s"}</span></span><span class="subt">CPSP ${x.nc} sup · ${x.pc} PGTs · UHS ${x.nu} sup · ${x.pu} PGTs${x.un?` · <span class="d-red">${x.un} without supervisor</span>`:""}</span></button>`).join("")}</div>
 <div class="panel" style="display:grid;gap:10px"><div class="toolbar"><input type="search" id="sq" placeholder="Search supervisor, department or PGT" value="${esc(UI.sq)}" aria-label="Search">
  <select id="sdept" aria-label="Department"><option value="">All departments</option>${depts.map(d=>`<option ${UI.sdept===d?"selected":""}>${esc(d)}</option>`).join("")}</select>
  <select id="sprog" aria-label="Trainee track"><option value="">CPSP and UHS trainees</option><option value="CPSP" ${UI.sprog==="CPSP"?"selected":""}>CPSP (FCPS) trainees only</option><option value="UHS" ${UI.sprog==="UHS"?"selected":""}>UHS trainees only</option></select></div>
  <div class="chips">${[["","All types"],["CPSP","CPSP"],["UHS","UHS"],["CPSP & UHS","CPSP & UHS"],["Not approved","Not approved but has PGTs"]].map(([k,l])=>`<button class="chip" data-stype="${k}" aria-pressed="${UI.stype===k}">${l}<span class="c">${sups.filter(s=>!k||s.type===k).length}</span></button>`).join("")}
   ${[["","Any load"],["has","Has PGTs"],["none","No PGTs"],["over",`${DB.settings.overload}+ PGTs`]].map(([k,l])=>`<button class="chip" data-sload="${k}" aria-pressed="${UI.sload===k}">${l}</button>`).join("")}</div></div>
 ${legend}<div class="panel flush"><div class="tblwrap"><table class="suptable"><thead><tr><th>Supervisor</th><th>Designation</th><th>Type</th><th class="num">CPSP</th><th>CPSP (FCPS) trainees</th><th class="num">UHS</th><th>UHS trainees</th><th class="num">Total</th></tr></thead><tbody>
 ${shown.map(d=>{const L=rows.filter(s=>s.f.spec===d||supsIn(s.f,d)).sort((a,b)=>(b.cpsp.length+b.uhs.length)-(a.cpsp.length+a.uhs.length)||a.f.name.localeCompare(b.f.name));const tc=L.reduce((s,x)=>s+x.cpsp.length,0),tu=L.reduce((s,x)=>s+x.uhs.length,0),un=none.filter(p=>p.spec===d&&(!UI.sprog||(UI.sprog==="CPSP"?p.program==="FCPS":p.program!=="FCPS")));
  return`<tr class="deptrow"><td colspan="3">${esc(d)} <span class="subt">${L.length} supervisor${L.length===1?"":"s"}</span></td><td class="num">${tc}</td><td></td><td class="num">${tu}</td><td></td><td class="num">${tc+tu}</td></tr>
  ${L.map(s=>{const n=s.cpsp.length+s.uhs.length;return`<tr><td><a href="#fac-${s.f.id}">${esc(facName(s.f))}</a>${s.f.unit?`<div class="subt">${esc(s.f.unit)}</div>`:""}</td><td>${esc(s.f.desig)}</td><td>${typePill(s.type)}</td><td class="num"><b>${s.cpsp.length}</b></td><td class="wrapcell">${s.cpsp.length?`<div class="pchips">${s.cpsp.map(chip).join("")}</div>`:'<span class="subt">—</span>'}</td><td class="num"><b>${s.uhs.length}</b></td><td class="wrapcell">${s.uhs.length?`<div class="pchips">${s.uhs.map(chip).join("")}</div>`:'<span class="subt">—</span>'}</td><td class="num"><span class="days ${n>=DB.settings.overload?"d-red":""}">${n}</span></td></tr>`}).join("")}
  ${un.length&&!UI.stype&&UI.sload!=="none"&&!UI.sq?`<tr><td colspan="3"><span class="pill p-bad">No supervisor recorded</span></td><td class="num">${un.filter(p=>p.program==="FCPS").length}</td><td class="wrapcell"><div class="pchips">${un.filter(p=>p.program==="FCPS").map(chip).join("")}</div></td><td class="num">${un.filter(p=>p.program!=="FCPS").length}</td><td class="wrapcell"><div class="pchips">${un.filter(p=>p.program!=="FCPS").map(chip).join("")}</div></td><td class="num">${un.length}</td></tr>`:""}`}).join("")||`<tr><td colspan="8" class="empty">No supervisors match these filters.</td></tr>`}
 </tbody></table></div></div>`}
EXPORTS.sups=()=>{const{A,sups,none}=supData();const rows=LAST.sups||sups;const depts=[...new Set(sups.flatMap(s=>[s.f.spec,...supSpecs(s.f).filter(x=>x.cpsp||x.uhs).map(x=>x.spec)]))].sort((a,b)=>specIdx(a)-specIdx(b));
 const sum=depts.map(d=>{const S=sups.filter(s=>s.f.spec===d||supsIn(s.f,d)),P=A.filter(p=>p.spec===d);return{"Department":d,"Approved supervisors":S.filter(s=>s.type!=="Not approved").length,"CPSP supervisors":S.filter(s=>s.f.cpsp).length,"UHS supervisors":S.filter(s=>s.f.uhs).length,"CPSP (FCPS) PGTs":P.filter(p=>p.program==="FCPS").length,"UHS PGTs":P.filter(p=>p.program!=="FCPS").length,"Total PGTs":P.length,"PGTs without supervisor":none.filter(p=>p.spec===d).length}});
 const ordered=rows.slice().sort((a,b)=>specIdx(a.f.spec)-specIdx(b.f.spec)||(b.cpsp.length+b.uhs.length)-(a.cpsp.length+a.uhs.length));
 const bySup=ordered.map(s=>({"Department":s.f.spec,"Supervisor":facName(s.f),"Designation":s.f.desig,"Unit":s.f.unit,"Type":s.type,"CPSP PGTs":s.cpsp.length,"CPSP trainee names":s.cpsp.map(p=>"Dr. "+p.name).join(", "),"UHS PGTs":s.uhs.length,"UHS trainee names":s.uhs.map(p=>"Dr. "+p.name).join(", "),"Total PGTs":s.cpsp.length+s.uhs.length}));
 const pairs=[];ordered.forEach(s=>{const L=[...s.cpsp,...s.uhs];if(!L.length)pairs.push({"Department":s.f.spec,"Supervisor":facName(s.f),"Designation":s.f.desig,"Type":s.type,"Track":"","PGT ID":"","Trainee":"","Programme":"","Year at RIC":"","Induction":""});
  L.forEach(p=>pairs.push({"Department":s.f.spec,"Supervisor":facName(s.f),"Designation":s.f.desig,"Type":s.type,"Track":p.program==="FCPS"?"CPSP":"UHS","PGT ID":p.code,"Trainee":"Dr. "+p.name,"Programme":p.program,"Year at RIC":ricLabel(p),"Induction":sessOf(p.start)}))});
 none.forEach(p=>pairs.push({"Department":p.spec,"Supervisor":"(none recorded)","Designation":"","Type":"","Track":p.program==="FCPS"?"CPSP":"UHS","PGT ID":p.code,"Trainee":"Dr. "+p.name,"Programme":p.program,"Year at RIC":ricLabel(p),"Induction":sessOf(p.start)}));
 return{file:`RIC supervisors by department ${iso(TODAY)}`,sheets:[sheetFrom("Summary by department",sum),sheetFrom("By supervisor",bySup),sheetFrom("Supervisor and trainee",pairs)]}};

/* ---------- PGT list: year at RIC filter ---------- */
UI.ry="";
const ryMatch=p=>{if(!UI.ry)return true;const r=ricInfo(p);return UI.ry==="init"?r.k==="init":UI.ry==="pre"?r.k==="pre":r.y===+UI.ry};
