/* =====================================================================
   PHASE 4: cycles, PGT filters, Excel export, proposal + feedback form
   editors, exams, orientation
   ===================================================================== */
const LAST={};
/* downloads: the claude.ai capability when running as an artifact, a normal browser download when hosted elsewhere */
const BROWSER_DL={save:async({filename,data})=>{const blob=data instanceof Blob?data:new Blob([data]);const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}};
let DL=window.claude&&typeof window.claude.use==="function"?null:BROWSER_DL;
try{window.claude?.use?.("downloads")?.then(d=>{DL=d||BROWSER_DL;if(typeof DB!=="undefined"&&DB)render()}).catch(()=>{DL=BROWSER_DL})}catch(e){DL=BROWSER_DL}
const xbtn=(k,l)=>DL?`<button class="btn small" data-export="${k}">${l||"Download Excel"}</button>`:"";

/* ---------- cycles ---------- */
const sessOf=d=>d?(P(d).getMonth()<6?"Jan ":"Jul ")+String(P(d).getFullYear()).slice(2):null;
const sessKey=s=>s?(2000+ +s.slice(4))+(s.startsWith("Jul")?.5:0):0;
const sessLong=s=>s?(s.startsWith("Jan")?"January ":"July ")+(2000+ +s.slice(4)):"—";
const sessNext=(s,n)=>{let k=sessKey(s)+n/2;return(k%1?"Jul ":"Jan ")+String(Math.floor(k)).slice(2)};
const curSess=()=>sessOf(iso(TODAY));
const orientMonth=s=>`${2000+ +s.slice(4)}-${s.startsWith("Jan")?"02":"08"}`;
function arrival(p){if(!p.start)return{date:null,sess:null,route:"Start date missing",kind:"x"};
 const sp=specOf(p.spec);
 if(!sp?.rotational)return{date:p.start,sess:sessOf(p.start),route:"Whole training at RIC",kind:"all"};
 if(p.program==="FCPS"){const r=DB.rots.filter(x=>x.pid===p.id&&x.ret).sort((a,b)=>a.start<b.start?-1:1)[0];
  const d=r?.ret||iso(addM(p.start,Math.round((sp.rule[0]||2)*12)));return{date:d,sess:sessOf(d),route:`FCPS · joins RIC after ${sp.rule[0]} years out`,kind:"fcps"}}
 return{date:p.start,sess:sessOf(p.start),route:`UHS · first ${Math.round(sp.rule[2]*12)} months at RIC`,kind:"uhs"}}
function allSessions(){const s=new Set();verified().forEach(p=>{if(p.start)s.add(sessOf(p.start));const a=arrival(p).sess;if(a)s.add(a)});s.add(curSess());s.add(sessNext(curSess(),1));return[...s].sort((a,b)=>sessKey(b)-sessKey(a))}
function arrivalsIn(s,inclDeparted){return verified().filter(p=>arrival(p).sess===s&&(inclDeparted||!isExit(CUR.get(p.id).status)))}

/* ---------- PGT list with cycle filters ---------- */
UI.cyMode="induct";UI.cy="";
function cycleMatch(p){if(!UI.cy)return true;const s=UI.cyMode==="induct"?sessOf(p.start):UI.cyMode==="complete"?sessOf(CUR.get(p.id).comp):arrival(p).sess;if(!s)return false;
 if(UI.cy.startsWith("Y:"))return String(2000+ +s.slice(4))===UI.cy.slice(2);return s===UI.cy}
function vPgts(){
 const V=verified();
 const base=V.filter(p=>(!UI.spec||p.spec===UI.spec)&&(!UI.prog||(UI.prog==="UHS"?p.program!=="FCPS":p.program===UI.prog))&&cycleMatch(p)&&ryMatch(p)&&(!UI.q||(p.name+" "+p.code+" "+(CUR.get(p.id).sup?.name||"")).toLowerCase().includes(UI.q.toLowerCase())));
 const rows=base.filter(p=>phaseMatch(CUR.get(p.id),UI.phase));
 const key={name:p=>p.name,code:p=>p.code,spec:p=>p.spec,year:p=>CUR.get(p.id).year||0,comp:p=>CUR.get(p.id).comp||"",sup:p=>CUR.get(p.id).sup?.name||"~",ind:p=>p.start||"",ry:p=>{const r=ricInfo(p);return r.y??(r.k==="init"?0:-1)},arr:p=>arrival(p).date||""}[UI.sort]||(p=>p.name);
 rows.sort((a,b)=>{const x=key(a),y=key(b);return(x<y?-1:x>y?1:0)*UI.dir});
 LAST.pgts=rows;
 const th=(k,l,cls="")=>`<th class="${cls}" aria-sort="${UI.sort===k?(UI.dir>0?"ascending":"descending"):"none"}"><button data-sort="${k}">${l}${UI.sort===k?(UI.dir>0?" ▲":" ▼"):""}</button></th>`;
 const S=[...new Set([...allSessions(),...verified().map(p=>sessOf(CUR.get(p.id).comp)).filter(Boolean)])].sort((a,b)=>sessKey(b)-sessKey(a)),years=[...new Set(S.map(s=>2000+ +s.slice(4)))];
 let summary="";
 if(UI.cyMode==="arrive"&&UI.cy&&!UI.cy.startsWith("Y:")){const A=base;const k=t=>A.filter(p=>arrival(p).kind===t);
  const specs=[...new Set(A.map(p=>p.spec))].sort((a,b)=>specIdx(a)-specIdx(b));const o=DB.orients.find(x=>x.cycle===UI.cy);
  summary=`<div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Joining RIC in the ${sessLong(UI.cy)} cycle · ${A.length}</h3>${o?`<a class="btn small" href="#orient-${o.id}">Open orientation</a>`:`<button class="btn small primary" data-act="or-new" data-cycle="${UI.cy}">Plan orientation for this cycle</button>`}</div>
   <div class="kpis small"><div class="kpi"><span class="n">${k("uhs").length}</span><span class="l">UHS, new inductees starting their first 6 months</span></div><div class="kpi"><span class="n">${k("fcps").length}</span><span class="l">FCPS, back after 2 years at a rotational institute</span></div><div class="kpi"><span class="n">${k("all").length}</span><span class="l">Whole training at RIC, new inductees</span></div></div>
   <div class="legend">${specs.map(s=>`<span><b>${esc(s)}</b> ${A.filter(p=>p.spec===s).length}</span>`).join("")}</div>
   <p class="subt" style="margin:0">UHS PGTs returning after their 1.5 years outside are not counted here, because they already started at RIC. ${sessKey(UI.cy)>sessKey(curSess())?"New UHS inductees for a future cycle appear once they register.":""}</p></div>`}
 return`<div class="head"><div><h2>PGTs</h2><p>${rows.length} shown · new PGTs join through the registration link</p></div><div class="actions">${waBtn("pgts","WhatsApp these")}${xbtn("pgts")}</div></div>
 <div class="panel" style="display:grid;gap:10px">
  <div class="toolbar"><input type="search" id="q" placeholder="Search name, PGT ID or supervisor" value="${esc(UI.q)}" aria-label="Search">
   <select id="fspec" aria-label="Specialty"><option value="">All specialties</option>${specNames(1).map(s=>`<option ${UI.spec===s?"selected":""}>${s}</option>`).join("")}</select>
   <select id="fprog" aria-label="Programme"><option value="">FCPS and UHS</option>${["FCPS","UHS","UHS (MS)","UHS (MD)"].map(s=>`<option ${UI.prog===s?"selected":""}>${s}</option>`).join("")}</select>
   <select id="fry" aria-label="Year at RIC">${opt([["","Any year at RIC"],["1","RIC year 1"],["2","RIC year 2"],["3","RIC year 3"],["init","UHS initial 6 months"],["pre","Not yet at RIC (on rotation)"]],UI.ry)}</select></div>
  <div class="toolbar"><span class="seg" role="group" aria-label="Cycle type"><button class="chip" data-cymode="induct" aria-pressed="${UI.cyMode==="induct"}">Inducted in</button><button class="chip" data-cymode="arrive" aria-pressed="${UI.cyMode==="arrive"}">Joining RIC in</button><button class="chip" data-cymode="complete" aria-pressed="${UI.cyMode==="complete"}">Completing in</button></span>
   <select id="fcy" aria-label="Cycle"><option value="">Any cycle</option><optgroup label="Cycle">${S.map(s=>`<option value="${s}" ${UI.cy===s?"selected":""}>${sessLong(s)}</option>`).join("")}</optgroup><optgroup label="Whole year">${years.map(y=>`<option value="Y:${y}" ${UI.cy==="Y:"+y?"selected":""}>All of ${y}</option>`).join("")}</optgroup></select>
   ${UI.cy||UI.spec||UI.prog||UI.q||UI.ry?`<button class="btn link" data-act="pg-clear">Clear filters</button>`:""}</div>
  <p class="subt" style="margin:0">${UI.cyMode==="complete"?"Completing in: the cycle in which the expected completion date falls (January cycle = January to June, July cycle = July to December).":UI.cyMode==="induct"?"Inducted in: the cycle in which training started (CPSP/UHS induction), wherever the PGT was posted.":"Joining RIC in: UHS PGTs in the cycle they are inducted (first 6 months at RIC); FCPS PGTs in rotational specialties when they arrive after 2 years outside; other specialties at induction."}</p>
  <div class="chips">${PHASES.map(([k,l])=>`<button class="chip" data-phase="${k}" aria-pressed="${UI.phase===k}">${l}<span class="c">${base.filter(p=>phaseMatch(CUR.get(p.id),k)).length}</span></button>`).join("")}</div>
 </div>
 ${summary}
 <div class="panel flush"><div class="tblwrap"><table><thead><tr>${th("code","PGT ID")}${th("name","Name")}${th("spec","Specialty")}<th>Prog.</th>${th("ry","Year at RIC")}${th("ind","Inducted")}${th("arr","Joins RIC")}${th("comp","Completes")}<th>Status</th>${th("sup","Supervisor")}<th>Expected completion</th></tr></thead><tbody>
 ${rows.map(p=>{const c=CUR.get(p.id),a=arrival(p);return`<tr class="click" data-href="pgt-${p.id}"><td class="code">${esc(p.code)||"—"}</td><td>${pgtName(p)}${conductBadge(p)}</td><td>${esc(p.spec)}</td><td>${esc(p.program)}</td><td>${(()=>{const r=ricInfo(p);return r.y?`<span class="pill p-ric">Year ${r.y}</span>`:`<span class="subt">${r.label}</span>`})()}</td><td>${sessOf(p.start)||"—"}</td><td title="${esc(a.route)}">${a.sess||"—"}${a.kind==="fcps"?' <span class="subt">after 2 yrs</span>':""}</td><td>${sessOf(c.comp)||"—"}</td><td>${phasePill(c)}</td><td>${c.sup?esc(facName(c.sup)):'<span class="pill p-bad">None</span>'}</td><td>${fd(c.comp)}</td></tr>`}).join("")||`<tr><td colspan="12" class="empty">No PGTs match these filters.</td></tr>`}
 </tbody></table></div></div>`}

/* ---------- Excel export ---------- */
const xrow=o=>Object.values(o),xhead=o=>Object.keys(o);
function sheetFrom(name,objs){if(!objs.length)return{name,rows:[["No rows"]]};return{name,rows:[xhead(objs[0]),...objs.map(xrow)]}}
const EXPORTS={
 pgts:()=>({file:`RIC PGTs ${iso(TODAY)}`,sheets:[sheetFrom("PGTs",LAST.pgts.map(p=>{const c=CUR.get(p.id),a=arrival(p);return{"PGT ID":p.code,"Roll no.":rollOf(p),"Name":"Dr. "+p.name,"Programme":p.program,"Specialty":p.spec,"Year at RIC":ricLabel(p),"Joined RIC permanently":ricInfo(p).join||"","Training start":p.start,"Inducted (cycle)":sessOf(p.start),"Joins RIC (cycle)":a.sess,"Completes (cycle)":sessOf(c.comp),"Route":a.route,"Status":c.leave?"On leave":c.phase,"Rotation site":c.rotSite||"","Return to RIC":c.ret||"","Supervisor":c.sup?facName(c.sup):"","Expected completion":c.comp,"Domicile":p.domicile,"Last internal exam %":(()=>{const r=pgtExams(p).filter(r=>r.m!=null).pop();return r?r.m:""})(),...(canConduct()?{"Conduct records":conductOf(p).length,"Open conduct records":conductOf(p).filter(c=>c.status==="Open").length}:{})}}))]}),
 leaves:()=>({file:`RIC PGT leave ${iso(TODAY)}`,sheets:[sheetFrom("Leave",LAST.leaves.map(({l,p,s})=>({"PGT ID":p.code,"Name":"Dr. "+p.name,"Specialty":p.spec,"Leave type":l.type,"From":l.start,"To":l.end,"Days":days(P(l.end),P(l.start))+1,"State":s,"Reason":l.reason,"Entered by":l.by})))]}),
 faculty:()=>({file:`RIC faculty ${iso(TODAY)}`,sheets:[sheetFrom("Faculty",LAST.faculty.map(([f,c])=>({"Name":facName(f),"Designation":f.desig,"Department":f.spec,"Unit":f.unit,"PMDC no.":f.pmdc,"Faculty reg. no.":f.regno,"Supervisor":c.type,"Active PGTs":c.n,"CPSP PGTs":c.ncpsp,"UHS PGTs":c.nuhs,"PMDC status":c.pmdc,"PMDC expiry":c.cr[CRED[0]]?.expiry||"","CPSP cert.":f.cpsp?c.cpsp:"","CPSP expiry":c.cr[CRED[1]]?.expiry||"","UHS cert.":f.uhs?c.uhs:"","UHS expiry":c.cr[CRED[2]]?.expiry||""})))]}),
 workshops:()=>({file:`RIC workshops ${iso(TODAY)}`,sheets:[sheetFrom("Workshops",LAST.workshops.map(w=>{const F=fin(w),S=fbSummary(w);return{"Month":mLabel(w.month),"Date":w.date||"","Workshop":w.title,"Department":w.dept,"Focal person":w.focal,"Course director":w.director||w.focal,"Stage":STAGES[w.stage],"Seats":w.seats??"","Fee":w.fee??"","Registered":w.reg.registered,"Paid":w.reg.paid,"Attended":w.reg.attended,"Feedback responses":S?S.n:0,"Overall rating":S&&S.overall!=null?+S.overall.toFixed(2):"","Total income":F.totalIn,"Total expenses":F.totalOut,"Net income":F.net,"Course director share":F.dir,"DME fund":F.dme}}))]}),
 tasks:()=>({file:`DME tasks ${iso(TODAY)}`,sheets:[sheetFrom("Tasks",LAST.tasks.map(t=>({"Task":t.title,"Assigned to":t.assignee,"Due":t.due,"Priority":t.priority,"Status":t.status,"Progress %":tProg(t),"Overdue":tOverdue(t)?"Yes":"","Linked to":linkLabel(t.link),"Created":t.created,"Done on":t.doneAt||""})))]}),
 audit:()=>({file:`DME audit log ${iso(TODAY)}`,sheets:[sheetFrom("Audit log",DB.audit.map(a=>({"When":new Date(a.at).toLocaleString("en-GB"),"Who":a.by,"Change":a.what})))]}),
 ws:id=>{const w=DB.workshops.find(x=>x.id===id),F=fin(w),fb=w.fb||defFb();const resp=(w.fbResp||[]).map(r=>{const o={"Submitted":new Date(r.at).toLocaleString("en-GB"),"Role":r.role,"Institution":r.inst||""};fb.items.forEach(i=>o[i.l]=r.r?.[i.k]??"");if(fb.conf){o["Confidence before"]=r.pre??"";o["Confidence after"]=r.post??""}if(fb.rec)o["Would recommend"]=r.rec||"";fb.open.forEach(q=>o[q.l]=r[q.k]||"");return o});
  const finRows=[["Item","Category","Amount (PKR)"],["Registration fees","Income",F.fees],...(w.incomes||[]).map(x=>[x.source+(x.note?" · "+x.note:""),"Income",x.amount]),["Total income","",F.totalIn],...w.expenses.map(e=>[e.item||e.cat,e.cat,-e.amount]),["Total expenses","",-F.totalOut],["Net income","",F.net],[`Course director (${F.share}%)`,"",F.dir],[`DME fund (${100-F.share}%)`,"",F.dme]];
  return{file:`${w.title} ${w.date||w.month}`,sheets:[{name:"Report",rows:reportText(w,F,fbSummary(w)).split("\n").map(l=>[l])},{name:"Finance",rows:finRows},sheetFrom("Feedback responses",resp)]}},
 exam:id=>{const x=DB.exams.find(e=>e.id===id);return{file:`${x.title} ${x.session}`,sheets:[sheetFrom("Results",exCands(x).map(p=>{const m=x.marks[p.id],ab=x.absent[p.id];return{"Roll no.":x.roll?.[p.id]||"","PGT ID":p.code,"Name":"Dr. "+p.name,"Programme":p.program,"Specialty":p.spec,"Year at RIC (at exam)":examYear(x,p)?"Year "+examYear(x,p):ricLabel(p),"Marks %":ab?"":m??"","Result":ab?"Absent":m==null?"":m>=x.passMark?"Pass":"Fail"}})),sheetFrom("By specialty",exSpecs(x).map(s=>{const st=exStats(x,s);return{"Specialty":s,"Candidates":st.n,"Sat":st.sat,"Absent":st.abs,"Mean %":st.mean==null?"":+st.mean.toFixed(1),"Highest %":st.max??"","Pass rate %":st.rate??"","Focal person":x.papers[s]?.focal||"","Questions received":x.papers[s]?.recv?"Yes":"No","No. of MCQs":x.papers[s]?.mcqs??"","Answer key":x.papers[s]?.key?"Yes":"No","Moderated":x.papers[s]?.mod?"Yes":"No","Final":x.papers[s]?.final?"Yes":"No"}}))]}},
 evalbee:id=>{const x=DB.exams.find(e=>e.id===id);return{file:`Evalbee ${x.title} ${x.session}`,sheets:[{name:"Students",rows:[["Roll No","Name","Class","Section"],...exCands(x).map(p=>[x.roll?.[p.id]||"","Dr. "+p.name,p.spec,p.program])]}]}},
 orient:id=>{const o=DB.orients.find(e=>e.id===id);return{file:`PGT orientation ${sessLong(o.cycle)}`,sheets:[sheetFrom("Participants",orCands(o).map(p=>{const a=arrival(p);return{"PGT ID":p.code,"Name":"Dr. "+p.name,"Programme":p.program,"Specialty":p.spec,"Route":a.route,"Joins RIC":a.date,"Attendance":o.att[p.id]||""}})),{name:"Agenda",rows:[["Agenda item"],...o.agenda.map(a=>[a])]}]}}
};
async function doExport(k,b){const[n,...args]=k.split(":");const spec=EXPORTS[n](...args);
 if(!window.XLSX){toast("The Excel library did not load. Check the connection and reload the page.");return}
 const wb=XLSX.utils.book_new();spec.sheets.forEach(s=>{const ws=XLSX.utils.aoa_to_sheet(s.rows);ws["!cols"]=(s.rows[0]||[]).map((_,i)=>({wch:Math.min(48,Math.max(8,...s.rows.slice(0,300).map(r=>String(r[i]??"").length+2)))}));XLSX.utils.book_append_sheet(wb,ws,s.name.replace(/[\\\/?*\[\]:]/g,"").slice(0,31))});
 const buf=XLSX.write(wb,{bookType:"xlsx",type:"array"});
 if(!DL){toast("Downloads are not available in this view");return}
 b.disabled=true;try{await DL.save({filename:spec.file.replace(/[\\\/:*?"<>|]/g,"-")+".xlsx",data:buf});toast("Excel file saved")}catch(e){if(e?.code==="rate_limited")toast("A save is already waiting for your answer");else if(e?.code!=="declined")toast("The file could not be saved in this view")}finally{if(b.isConnected)b.disabled=false}}

/* ---------- registration fee edit ---------- */
function sheetFee(w){openSheet("Registration fees",`<div class="grid2"><label class="f">Fee per participant (PKR)<input type="number" min="0" step="100" name="fee" value="${w.fee??0}"></label><label class="f">Participants who paid<input type="number" min="0" name="paid" value="${w.reg.paid}"></label></div>
 <label class="f">Amount actually collected (PKR) <span class="h">optional; use when there were discounts, waivers or refunds</span><input type="number" min="0" step="50" name="coll" value="${w.feeCollected??""}" placeholder="${(+(w.fee||0))*(+w.reg.paid||0)}"></label>`,()=>{
 const fee=+fv("fee")||0,paid=+fv("paid")||0;if(w.reg.registered&&paid>w.reg.registered)return fail(`Only ${w.reg.registered} registered.`);
 w.fee=fee;w.reg.paid=paid;w.feeCollected=fv("coll")===""?null:+fv("coll");wlog(w,`Registration fees: ${paid} × ${money(fee)}${w.feeCollected!=null?`, collected ${money(w.feeCollected)}`:""}`);toast("Registration fees updated");return true})}

/* =====================================================================
   EXAMS
   ===================================================================== */
const EX_STAGES=["Planned","Collecting papers","Papers finalised","Exam held","Results entered","Results published"];
const PAPER=["Not requested","Requested","Received","Moderated","Final"];
UI.exSpec="";
function seedExams(){return[{id:"EX1",title:"Internal PGT Examination",session:"Nov/Dec 2026",month:"2026-12",date:null,venue:"",passMark:60,scope:"ric",stage:0,papers:{},marks:{},absent:{},cands:null,log:[]}]}
const exSpecs=x=>[...new Set(exCands(x).map(p=>p.spec).filter(Boolean))].sort((a,b)=>specIdx(a)-specIdx(b));
function exStats(x,s){const C=exCands(x).filter(p=>!s||p.spec===s),sat=C.filter(p=>!x.absent[p.id]&&x.marks[p.id]!=null),m=sat.map(p=>+x.marks[p.id]);
 return{n:C.length,sat:sat.length,abs:C.filter(p=>x.absent[p.id]).length,mean:m.length?m.reduce((a,b)=>a+b,0)/m.length:null,max:m.length?Math.max(...m):null,pass:m.filter(v=>v>=x.passMark).length,rate:m.length?Math.round(m.filter(v=>v>=x.passMark).length/m.length*100):null,pending:C.filter(p=>!x.absent[p.id]&&x.marks[p.id]==null).length}}
function exFlags(x){const f=[],to=days(P(x.month+"-01"),TODAY);if(x.stage===0&&to<=45)f.push(`Papers not requested; exam month starts in ${Math.max(to,0)} days`);if(x.stage===1){const s=exSpecs(x).filter(s=>!(x.papers[s]||{}).final);if(s.length&&to<=21)f.push(`${s.length} specialty papers not final`)}if(!x.date&&x.stage<3&&to<=30)f.push("Exam date not set");if(x.stage===3)f.push("Results not entered");return f}
function vExams(){const X=DB.exams.slice().sort((a,b)=>a.month<b.month?1:-1);
 return`<div class="head"><div><h2>PGT examinations</h2><p>Six-monthly internal examination for all specialties (Nov/Dec and Jun/Jul).</p></div><button class="btn primary" data-act="ex-new">New examination</button></div>
 <div class="panel flush"><div class="tblwrap"><table><thead><tr><th>Session</th><th>Examination</th><th>Date</th><th>Progress</th><th class="num">Candidates</th><th class="num">Mean %</th><th class="num">Pass rate</th><th>Attention</th></tr></thead><tbody>
 ${X.map(x=>{const st=exStats(x);return`<tr class="click" data-href="exam-${x.id}"><td>${esc(x.session)}</td><td>${esc(x.title)}</td><td>${x.date?fd(x.date):mLabel(x.month)}</td><td><span class="pill ${["p-done","p-rot","p-rot","p-leave","p-pend","p-ric"][x.stage]}">${EX_STAGES[x.stage]}</span></td><td class="num">${st.n}</td><td class="num">${st.mean==null?"—":st.mean.toFixed(1)}</td><td class="num">${st.rate==null?"—":st.rate+"%"}</td><td class="wrapcell">${exFlags(x).map(f=>`<span class="d-red" style="font-size:13px;display:block">${esc(f)}</span>`).join("")||"—"}</td></tr>`}).join("")||`<tr><td colspan="8" class="empty">No examinations yet.</td></tr>`}
 </tbody></table></div></div>`}
function vExam(){const x=DB.exams.find(e=>e.id===route.id);if(!x)return`<div class="panel">Not found. <a href="#exams">Back</a></div>`;ensureRolls(x);
 const specs=exSpecs(x),cands=exCands(x),st=exStats(x),fl=exFlags(x);if(UI.exSpec&&!specs.includes(UI.exSpec))UI.exSpec="";const sp=UI.exSpec||specs[0]||"";
 const nf=specs.filter(s=>!(x.papers[s]||{}).final).length,nr=specs.filter(s=>!(x.papers[s]||{}).recv).length;
 let next="";
 if(x.stage===0)next=`<p style="margin:0">${specs.length} specialties, ${cands.length} candidates${x.scope==="ric"?" currently at RIC":""}. Ask each department for its paper.</p><div class="actions"><button class="btn primary" data-act="ex-req">Request papers from all specialties</button><button class="btn" data-act="t-new" data-link="exam-${x.id}" data-title="${esc(x.title)}: ">Make a task</button></div>`;
 if(x.stage===1)next=`<p style="margin:0">${specs.length-nf} of ${specs.length} papers final. Update each specialty below as papers arrive.</p><div class="actions"><button class="btn primary" data-act="ex-fin">Papers finalised${nf?` (${nf} not final)`:""}</button></div>`;
 if(x.stage===2)next=`<p style="margin:0">Candidate list is still live. Marking the exam as held fixes it.</p><div class="actions"><button class="btn primary" data-act="ex-held">Mark exam as held</button></div>`;
 if(x.stage===3)next=`<p style="margin:0">${st.pending} candidates still need marks. Enter them below, or tick absent.</p><div class="actions"><button class="btn primary" data-act="ex-done">Results entered${st.pending?` (${st.pending} missing)`:""}</button></div>`;
 if(x.stage===4)next=`<p style="margin:0">Results are complete and not yet shared.</p><div class="actions"><button class="btn primary" data-act="ex-pub">Mark results published</button></div>`;
 const C=cands.filter(p=>p.spec===sp),canMark=x.stage>=3&&x.stage<5;
 return`<div><a href="#exams" class="btn link" style="padding-left:0">← All examinations</a></div>
 <div class="panel" style="display:grid;gap:14px"><div class="prof"><div class="who"><div class="code">${esc(x.session)}</div><h2>${esc(x.title)}</h2><div class="meta"><span>${x.date?fd(x.date):"Date not set"}</span><span>${esc(x.venue)||"Venue not set"}</span><span>Pass mark ${x.passMark}%</span><span>${x.scope==="ric"?"PGTs at RIC":"All active PGTs"}</span></div></div>
  <div class="actions">${x.stage>=4?`<a class="btn" href="#certx-${x.id}">Merit certificates</a>`:""}<button class="btn" data-act="ex-edit">Edit details</button>${x.stage>0?`<button class="btn" data-act="ex-back">Move back a step</button>`:""}${xbtn("exam:"+x.id)}</div></div>
  <div class="stepper ex">${EX_STAGES.map((s,i)=>`<div class="${i<x.stage?"done":i===x.stage?"now":""}">${s}</div>`).join("")}</div></div>
 ${fl.length?`<div class="flag">${fl.map(esc).join("<br>")}</div>`:""}
 ${x.stage<5?`<div class="panel" style="display:grid;gap:12px"><h3 style="margin:0">Next step</h3>${next}</div>`:""}${exTimeline(x)}
 ${exCandPanel(x)}
 ${importPanel(x)}${examResultsPanel(x)}
 <div class="panel flush"><div class="head" style="padding:14px 16px 0"><h3 style="margin:0">Question submission checklist · ${specs.length-nf} of ${specs.length} final</h3><span class="subt">${specs.length-nr} received</span></div>
  <div class="tblwrap" style="margin-top:8px"><table><thead><tr><th>Specialty</th><th class="num">Candidates</th><th>Focal person</th><th>Requested</th><th>Questions received</th><th class="num">No. of MCQs</th><th>Answer key</th><th>Moderated</th><th>Final</th></tr></thead><tbody>
 ${specs.map(s=>{const t=exStats(x,s),pp=x.papers[s]||{},lk=x.stage>=3?"disabled":"",cb=f=>`<input type="checkbox" data-expc="${esc(s)}|${f}" ${pp[f]?"checked":""} ${lk} aria-label="${f}, ${esc(s)}">`;return`<tr class="${pp.final?"":pp.recv?"":"changed"}"><td>${esc(s)}</td><td class="num">${t.n}</td><td><input data-expc="${esc(s)}|focal" value="${esc(pp.focal||"")}" list="ex-fac" placeholder="Faculty member" aria-label="Focal person, ${esc(s)}" ${lk}></td><td>${cb("req")}</td><td>${cb("recv")}</td><td><input type="number" min="0" style="width:80px" data-expc="${esc(s)}|mcqs" value="${pp.mcqs??""}" ${lk} aria-label="Number of MCQs, ${esc(s)}"></td><td>${cb("key")}</td><td>${cb("mod")}</td><td>${cb("final")}</td></tr>`}).join("")}
 </tbody></table></div><datalist id="ex-fac">${DB.faculty.map(f=>`<option value="${esc(facName(f))}">`).join("")}</datalist></div>
 ${x.stage>=1?`<div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Roll numbers</h3><button class="btn small ${x.roll?"":"primary"}" data-act="ex-roll">${x.roll?"Regenerate roll numbers":"Generate roll numbers"}</button></div>
  <p class="subt" style="margin:0">${x.roll?`${Object.keys(x.roll).length} roll numbers issued. `:""}The roll number is the PGT ID without slashes: PGT/25/7/01 becomes 25701, so it stays the same for the whole training and fits the 5 roll-number boxes on the OMR sheet. Roll numbers can be edited in each list below; regenerating replaces any edits.</p></div>`:""}

 ${examSpecPanel(x,specs,cands,sp,canMark)}
 <div class="panel flush"><h3>History</h3><div class="tblwrap"><table><tbody>${x.log.slice().reverse().map(l=>`<tr><td class="code">${fdt(l.at)}</td><td class="wrapcell">${esc(l.what)}</td><td>${esc(l.by)}</td></tr>`).join("")||`<tr><td class="empty">No activity yet.</td></tr>`}</tbody></table></div></div>`}
const xlog=(x,what)=>{x.log.push({at:new Date().toISOString(),by:ME,what});log(`${x.title} (${x.session}): ${what}`,"exam-"+x.id)};
function sheetExam(x){const n=!x;const m=TODAY.getMonth()<6?`${TODAY.getFullYear()}-06`:`${TODAY.getFullYear()}-12`;x=x||{title:"Internal PGT Examination",session:m.endsWith("06")?`Jun/Jul ${TODAY.getFullYear()}`:`Nov/Dec ${TODAY.getFullYear()}`,month:m,date:"",venue:"",passMark:50,scope:"ric"};
 openSheet(n?"New examination":"Edit examination",`<label class="f">Title<input name="t" value="${esc(x.title)}"></label><div class="grid2"><label class="f">Session<input name="s" value="${esc(x.session)}"></label><label class="f">Month<input type="month" name="m" value="${x.month}"></label></div>
 <div class="grid2"><label class="f">Date<input type="date" name="d" value="${x.date||""}"></label><label class="f">Venue<input name="v" value="${esc(x.venue)}"></label></div>
 <div class="grid2"><label class="f">Pass mark (%)<input type="number" min="0" max="100" name="p" value="${x.passMark}"></label><label class="f">Candidates<select name="sc">${opt([["ric","Active PGTs at RIC"],["all","All active PGTs, including on rotation"]],x.scope)}</select></label></div>`,()=>{
 if(fv("t").length<3)return fail("Enter a title.");if(!fv("m"))return fail("Choose the month.");const rec={title:fv("t"),session:fv("s"),month:fv("m"),date:fv("d")||null,venue:fv("v"),passMark:+fv("p")||50,scope:fv("sc")};
 if(n){const nx={id:uid("EX"),...rec,stage:0,papers:{},marks:{},absent:{},cands:null,log:[]};DB.exams.push(nx);xlog(nx,"Examination created");go("exam-"+nx.id)}else{Object.assign(x,rec);xlog(x,"Details edited")}toast("Saved");return true})}
function examAction(a,b){if(a==="ex-new")return sheetExam();const x=DB.exams.find(e=>e.id===route.id);if(!x)return;const step=(s,w)=>{x.stage=s;xlog(x,w);persist();render()};
 if(a==="ex-edit")return sheetExam(x);
 if(a==="ex-back"){if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to confirm";return}if(x.stage===3)x.cands=null;return step(x.stage-1,`Moved back to "${EX_STAGES[x.stage-1]}"`)}
 if(a==="ex-req"){exSpecs(x).forEach(s=>{x.papers[s]={...(x.papers[s]||{}),req:true}});return step(1,"Papers requested from all specialties")}
 if(a==="ex-fin"){const nf=exSpecs(x).filter(s=>!(x.papers[s]||{}).final).length;if(nf&&b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent=`${nf} not final · tap again to continue`;return}return step(2,"Papers finalised")}
 if(a==="ex-held")return openSheet("Mark exam as held",`<label class="f">Held on<input type="date" name="d" value="${x.date||iso(TODAY)}"></label><div class="flag info">The candidate list (${exCands(x).length}) is fixed at this point. Later changes to PGT status will not change it.</div>`,()=>{if(fv("d")>iso(TODAY))return fail("The date held is in the future. Mark the exam as held on or after the day.");x.date=fv("d")||x.date;x.cands=exCands(x).map(p=>p.id);x.stage=3;xlog(x,`Exam held on ${fd(x.date)} · ${x.cands.length} candidates`);toast("Marked as held");return true});
 if(a==="ex-done"){const s=exStats(x);if(s.pending&&b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent=`${s.pending} missing · tap again to continue`;return}return step(4,`Results entered · mean ${s.mean==null?"—":s.mean.toFixed(1)}%, pass rate ${s.rate??"—"}%`)}
 if(a==="ex-pub")return step(5,"Results published");
 if(a==="ex-roll"){if(x.roll&&b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again: edits will be replaced";return}return genRolls(x)}
 if(a==="ex-roll-old"){const C=exCands(x),code=s=>(SPEC_CODE[s]||s.split(/\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,3)),pre=`RIC-${x.month.slice(2,4)}${x.month.slice(5,7)}-`;x.roll={};exSpecs(x).forEach(s=>C.filter(p=>p.spec===s).forEach((p,i)=>x.roll[p.id]=`${pre}${code(s)}-${String(i+1).padStart(3,"0")}`));xlog(x,`${C.length} roll numbers generated`);persist();render()}}
const SPEC_CODE={"General Cardiology":"GC","Cardiac Surgery":"CS","Anaesthesiology":"AN","Cardiothoracic Anaesthesia":"CTA","Radiology":"RAD","Interventional Cardiology":"IC","Paediatric Cardiology":"PC","Paediatric Cardiac Surgery":"PCS","Electrophysiology":"EP"};

/* =====================================================================
   ORIENTATION
   ===================================================================== */
const OR_STAGES=["Planned","Invitations sent","Held","Closed"];
const OR_AGENDA=["Welcome and introduction to RIC · Director of Medical Education","Hospital rules, duty hours and leave policy · DME office","Infection prevention and patient safety · IPC team","Introduction to departments and supervisors · Heads of Department","Documents, ID cards and registration checks · DME office"];
const OR_CHECK=["Date and venue confirmed","Invitations sent to PGTs and supervisors","Speakers confirmed","Orientation pack ready","Attendance sheet ready"];
function seedOrients(){return[{id:"OR1",cycle:"Jan 27",month:"2027-02",date:null,venue:"",stage:0,agenda:OR_AGENDA.slice(),check:OR_CHECK.map(t=>({t,done:false})),att:{},added:[],removed:[],log:[]}]}
function orCands(o){const base=arrivalsIn(o.cycle).map(p=>p.id);const ids=[...new Set([...base,...o.added])].filter(id=>!o.removed.includes(id));return ids.map(id=>DB.pgts.find(p=>p.id===id)).filter(Boolean).sort((a,b)=>specIdx(a.spec)-specIdx(b.spec)||a.name.localeCompare(b.name))}
function orFlags(o){const f=[],to=days(P(o.month+"-01"),TODAY);if(o.stage===0&&to<=30&&to>-31)f.push(`Orientation month starts in ${Math.max(to,0)} days; invitations not sent`);if(!o.date&&o.stage<2&&to<=30)f.push("Date not set");if(o.stage===2&&orCands(o).some(p=>!o.att[p.id]))f.push("Attendance incomplete");return f}
function vOrients(){const cur=curSess(),list=[];let s0=sessKey(sessNext(cur,1))<sessKey("Jan 27")?"Jan 27":sessNext(cur,1);for(let i=0;i<3;i++)list.push(sessNext(s0,i));
 return`<div class="head"><div><h2>PGT orientation</h2><p>Six-monthly orientation for PGTs joining RIC in each cycle: UHS PGTs starting their first 6 months, and FCPS PGTs arriving after 2 years at a rotational institute.</p></div></div>
 <div class="flag info">Agenda and checklist are general placeholders until the orientation SOP is added.</div>
 <div class="panel flush"><h3>Cycles</h3><div class="tblwrap"><table><thead><tr><th>Cycle</th><th>Orientation</th><th class="num">UHS new</th><th class="num">FCPS back after 2 yrs</th><th class="num">Whole training at RIC</th><th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody>
 ${list.map(s=>{const A=arrivalsIn(s),k=t=>A.filter(p=>arrival(p).kind===t).length,o=DB.orients.find(x=>x.cycle===s);return`<tr ${s===cur?'class="changed"':""}><td><b>${sessLong(s)}</b>${s===cur?' <span class="subt">current</span>':""}</td><td>${o&&o.date?fd(o.date):mLabel(orientMonth(s))+" (first week)"}</td><td class="num">${k("uhs")}</td><td class="num">${k("fcps")}</td><td class="num">${k("all")}</td><td class="num"><b>${A.length}</b></td>
  <td>${o?`<span class="pill ${["p-done","p-rot","p-pend","p-ric"][o.stage]}">${OR_STAGES[o.stage]}</span>${orFlags(o).length?`<div class="d-red" style="font-size:13px">${esc(orFlags(o)[0])}</div>`:""}`:'<span class="subt">Not planned</span>'}</td>
  <td>${o?`<a class="btn small" href="#orient-${o.id}">Open</a>`:`<button class="btn small" data-act="or-new" data-cycle="${s}">Plan</button>`} <button class="btn link" data-act="or-pgts" data-cycle="${s}">See PGTs</button></td></tr>`}).join("")}
 </tbody></table></div><p class="subt" style="padding:0 16px 14px;margin:8px 0 0">UHS inductees for a future cycle appear once they register. Resigned and terminated PGTs are not counted.</p></div>`}
function vOrient(){const o=DB.orients.find(e=>e.id===route.id);if(!o)return`<div class="panel">Not found. <a href="#orientation">Back</a></div>`;
 const C=orCands(o),fl=orFlags(o),cnt=k=>C.filter(p=>o.att[p.id]===k).length,others=verified().filter(p=>CUR.get(p.id).active&&!C.includes(p));
 return`<div><a href="#orientation" class="btn link" style="padding-left:0">← All cycles</a></div>
 <div class="panel" style="display:grid;gap:14px"><div class="prof"><div class="who"><div class="code">${sessLong(o.cycle)} cycle</div><h2>PGT orientation</h2><div class="meta"><span>${o.date?fd(o.date):mLabel(o.month)+", date not set"}</span><span>${esc(o.venue)||"Venue not set"}</span><span>${C.length} PGTs</span></div></div>
  <div class="actions"><button class="btn" data-act="or-edit">Edit date and venue</button>${o.stage===0?`<button class="btn primary" data-act="or-inv">Mark invitations sent</button>`:o.stage===1?`<button class="btn primary" data-act="or-held">Mark as held</button>`:o.stage===2?`<button class="btn primary" data-act="or-close">Close</button>`:""}${xbtn("orient:"+o.id)}</div></div>
  <div class="stepper or">${OR_STAGES.map((s,i)=>`<div class="${i<o.stage?"done":i===o.stage?"now":""}">${s}</div>`).join("")}</div></div>
 ${fl.length?`<div class="flag">${fl.map(esc).join("<br>")}</div>`:""}
 <div class="panel flush" style="min-width:0"><div class="head" style="padding:14px 16px 0"><h3 style="margin:0">Participants · ${C.length}</h3>${o.stage>=2?`<span class="subt">Present ${cnt("Present")} · Absent ${cnt("Absent")} · Excused ${cnt("Excused")}</span>`:""}</div>
  <div class="tblwrap" style="margin-top:8px"><table><thead><tr><th>PGT</th><th>Specialty</th><th>Route</th><th>Attendance</th><th></th></tr></thead><tbody>
  ${C.map(p=>{const a=arrival(p);return`<tr><td><a href="#pgt-${p.id}">${pgtName(p)}</a><div class="code">${esc(p.code)}</div></td><td>${esc(p.spec)}<div class="subt">${esc(p.program)}</div></td><td class="wrapcell">${o.added.includes(p.id)?"Added manually":esc(a.route)}</td><td><select data-oratt="${p.id}" ${o.stage>=2?"":"disabled"} aria-label="Attendance">${opt([["","—"],"Present","Absent","Excused"],o.att[p.id]||"")}</select></td><td><button class="btn link" data-act="or-rm" data-id="${p.id}">Remove</button></td></tr>`}).join("")||`<tr><td colspan="5" class="empty">No PGTs joining RIC in this cycle yet.</td></tr>`}
  </tbody></table></div>
  <div class="toolbar" style="padding:12px 16px"><input id="or-add" list="or-pgts" placeholder="Add another PGT" style="flex:1 1 220px" aria-label="Add PGT"><datalist id="or-pgts">${others.map(p=>`<option value="${esc(pgtLabel(p))}">`).join("")}</datalist><button class="btn small" data-act="or-add">Add</button>${o.removed.length?`<button class="btn link" data-act="or-restore">Restore ${o.removed.length} removed</button>`:""}</div></div>
 <div class="cols two">
  <div class="panel" style="display:grid;gap:10px"><h3 style="margin:0">Checklist</h3><ul class="checklist">${o.check.map((c,i)=>`<li><label class="check2"><input type="checkbox" data-orck="${i}" ${c.done?"checked":""}> <span class="${c.done?"struck":""}">${esc(c.t)}</span></label><button class="btn link" data-act="or-ckrm" data-i="${i}">Remove</button></li>`).join("")}</ul>
   <div class="toolbar"><input id="or-ck" placeholder="Add a checklist item" style="flex:1 1 160px" aria-label="New item"><button class="btn small" data-act="or-ckadd">Add</button></div></div>
  <div class="panel" style="display:grid;gap:10px"><h3 style="margin:0">Agenda</h3><textarea id="or-agenda" rows="7" aria-label="Agenda, one item per line">${esc(o.agenda.join("\n"))}</textarea><div class="actions"><button class="btn small" data-act="or-agsave">Save agenda</button></div></div>
 </div>
 <div class="panel flush"><h3>History</h3><div class="tblwrap"><table><tbody>${o.log.slice().reverse().map(l=>`<tr><td class="code">${fdt(l.at)}</td><td class="wrapcell">${esc(l.what)}</td></tr>`).join("")||`<tr><td class="empty">No activity yet.</td></tr>`}</tbody></table></div></div>`}
const olog=(o,what)=>{o.log.push({at:new Date().toISOString(),by:ME,what});log(`Orientation ${sessLong(o.cycle)}: ${what}`,"orient-"+o.id)};
function orientAction(a,b){
 if(a==="or-new"){const s=b.dataset.cycle;let o=DB.orients.find(x=>x.cycle===s);if(!o){o={id:uid("OR"),cycle:s,month:orientMonth(s),date:null,venue:"",stage:0,agenda:OR_AGENDA.slice(),check:OR_CHECK.map(t=>({t,done:false})),att:{},added:[],removed:[],log:[]};DB.orients.push(o);olog(o,"Orientation planned")}persist();go("orient-"+o.id);return}
 if(a==="or-pgts"){UI.cyMode="arrive";UI.cy=b.dataset.cycle;UI.phase="all";UI.spec="";UI.prog="";UI.q="";go("pgts");return}
 const o=DB.orients.find(x=>x.id===route.id);if(!o)return;
 if(a==="or-edit")return openSheet("Orientation date and venue",`<label class="f">Date<input type="date" name="d" value="${o.date||o.month+"-01"}"></label><label class="f">Venue<input name="v" value="${esc(o.venue)}" placeholder="e.g. Auditorium"></label>`,()=>{o.date=fv("d")||null;if(o.date)o.month=o.date.slice(0,7);o.venue=fv("v");olog(o,`Set for ${fd(o.date)}${o.venue?" at "+o.venue:""}`);toast("Saved");return true});
 if(a==="or-inv"){o.stage=1;olog(o,`Invitations sent to ${orCands(o).length} PGTs`)}
 if(a==="or-held"){o.stage=2;orCands(o).forEach(p=>{if(!o.att[p.id])o.att[p.id]="Present"});olog(o,"Marked as held; attendance set to Present, adjust absentees")}
 if(a==="or-close"){o.stage=3;olog(o,"Closed")}
 if(a==="or-rm"){o.removed.push(b.dataset.id);o.added=o.added.filter(x=>x!==b.dataset.id);const p=DB.pgts.find(x=>x.id===b.dataset.id);olog(o,`Removed Dr. ${p.name}`)}
 if(a==="or-restore"){o.removed=[];olog(o,"Restored removed PGTs")}
 if(a==="or-add"){const v=pick("or-add"),p=verified().find(x=>pgtLabel(x)===v);if(!p){toast("Choose a PGT from the list");return}o.removed=o.removed.filter(x=>x!==p.id);if(!o.added.includes(p.id))o.added.push(p.id);olog(o,`Added Dr. ${p.name}`)}
 if(a==="or-ckadd"){const v=pick("or-ck");if(!v)return;o.check.push({t:v,done:false})}
 if(a==="or-ckrm")o.check.splice(+b.dataset.i,1);
 if(a==="or-agsave"){o.agenda=document.getElementById("or-agenda").value.split("\n").map(s=>s.trim()).filter(Boolean);olog(o,"Agenda updated");toast("Agenda saved")}
 persist();render()}

/* extra attention items for Overview */
function extraAttn(){const out=[];
 const ex=DB.exams.filter(x=>exFlags(x).length);if(ex.length)out.push([ex.length,"pause",`examination${ex.length>1?"s":""} need${ex.length>1?"":"s"} attention`,ex.map(x=>`${x.session}: ${exFlags(x)[0]}`).join(" · "),"exams"]);
 const or=DB.orients.filter(o=>orFlags(o).length);if(or.length)out.push([or.length,"pause",`orientation${or.length>1?"s":""} need${or.length>1?"":"s"} attention`,or.map(o=>`${sessLong(o.cycle)}: ${orFlags(o)[0]}`).join(" · "),"orientation"]);
 const nx=sessNext(curSess(),1);if(!DB.orients.some(o=>o.cycle===nx)){const n=arrivalsIn(nx).length;if(days(P(orientMonth(nx)+"-01"),TODAY)<=60)out.push([n,"rot",`PGTs joining RIC in the ${sessLong(nx)} cycle; orientation not planned`,"","orientation"])}
 return out}
