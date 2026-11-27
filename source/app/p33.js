
/* =====================================================================
   V31 · EXAM PAGE IN TABS + PAPERS PER YEAR + PRACTICE EXAMS
   Candidates · Papers · Results · Analysis · History, following the way
   an exam is actually run. A specialty can set one paper for all years,
   one per year, or papers for groups of years (e.g. Years 3-5).
   ===================================================================== */
/* ---------- papers ---------- */
const exYr=(x,p)=>examYear(x,p)||1;
function exSplitOf(x,spec){return(x.split||{})[spec]||"all"}
function exGroupsOf(x,spec){const m=exSplitOf(x,spec);if(m==="all")return null;
 if(m==="year"){const ys=[...new Set(exCands(x).filter(p=>p.spec===spec).map(p=>exYr(x,p)))].sort((a,b)=>a-b);return ys.map(y=>[y,y])}
 const g=String(m).split(",").map(t=>t.trim()).filter(Boolean).map(t=>{const[a,b]=t.split("-").map(v=>+v);return[a,b||a]}).filter(([a,b])=>a>0&&b>=a).sort((p,q)=>p[0]-q[0]);return g.length?g:null}
const exGrpLabel=([a,b])=>a===b?`Year ${a}`:`Years ${a}-${b}`;
function exPaperOf(x,p){const g=exGroupsOf(x,p.spec);if(!g)return p.spec;const y=exYr(x,p);const G=g.find(([a,b])=>y>=a&&y<=b)||(y<g[0][0]?g[0]:g[g.length-1]);return`${p.spec} · ${exGrpLabel(G)}`}
function exPaperKeys(x){const C=exCands(x),out=[];exSpecs(x).forEach(sp=>{const g=exGroupsOf(x,sp);if(!g)out.push(sp);else g.forEach(G=>{const k=`${sp} · ${exGrpLabel(G)}`;if(C.some(p=>exPaperOf(x,p)===k))out.push(k)})});return out}
const exPaperSpec=k=>String(k).split(" · ")[0];

/* old actions now work on papers instead of specialties */
{const _a=examAction;examAction=function(a,b){const x=DB.exams.find(e=>e.id===route.id);
 if(x&&a==="ex-req"){exPaperKeys(x).forEach(k=>{x.papers[k]={...(x.papers[k]||{}),req:true}});x.stage=Math.max(x.stage,1);xlog(x,"Papers requested");persist();render();return}
 if(x&&a==="ex-fin"){const nf=exPaperKeys(x).filter(k=>!(x.papers[k]||{}).final).length;if(nf&&b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent=`${nf} not final · tap again to continue`;return}x.stage=Math.max(x.stage,2);xlog(x,"Papers finalised");persist();render();return}
 return _a(a,b)}}

/* ---------- page ---------- */
UI.exTab=UI.exTab||{};UI.exQ="";UI.exF="";
function exDefTab(x){return x.stage>=5?"analysis":x.stage>=3?"results":"cand"}
vExam=function(){const x=DB.exams.find(e=>e.id===route.id);if(!x)return`<div class="panel">Not found. <a href="#exams">Back</a></div>`;ensureRolls(x);x.papers=x.papers||{};
 const C=exCands(x),keys=exPaperKeys(x),tab=UI.exTab[x.id]||exDefTab(x),st=exStats(x),fl=exFlags(x).filter(f=>!/specialt/i.test(f));
 const nf=keys.filter(k=>!(x.papers[k]||{}).final).length,omrN=keys.filter(k=>omrSpec(x,k)).length;
 const nextTxt=[`<b>Ask each department for its paper.</b> ${keys.length} papers, ${C.length} candidates.`,`<b>Collect the papers.</b> ${keys.length-nf} of ${keys.length} final; tick them off in Papers.`,`<b>Get ready for the day.</b> Set up and print OMR sheets in Papers${omrN<keys.length?` (${omrN} of ${keys.length} set up)`:""}; check the candidate list.`,`<b>Mark the results.</b> ${st.pending?`${st.pending} candidates still need marks or absent.`:"All candidates have marks or are absent."} Scan the OMR sheets in Results.`,`<b>Check and publish.</b> Look over Analysis, then publish.`][x.stage]||"";
 const nextBtn=[["ex-req","Papers requested"],["ex-fin","Papers finalised"],["ex-held","Mark exam as held"],["ex-done","Results entered"],["ex-pub","Publish results"]][x.stage];
 const tabs=[["cand",`Candidates · ${C.length}`],["papers",`Papers · ${keys.length}`],["results","Results"],["analysis","Analysis"],["history","History"]];
 let body="";
 if(tab==="cand")body=exCandTab(x);if(tab==="papers")body=exPapersTab(x);if(tab==="results")body=exResultsTab(x);if(tab==="analysis")body=exAnalysisTab(x);
 if(tab==="history")body=`${exTimeline(x)}<div class="panel flush"><h3>History</h3><div class="tblwrap"><table><tbody>${x.log.slice().reverse().map(l=>`<tr><td class="code">${fdt(l.at)}</td><td class="wrapcell">${esc(l.what)}</td><td>${esc(l.by)}</td></tr>`).join("")||`<tr><td class="empty">No activity yet.</td></tr>`}</tbody></table></div></div>`;
 return`<div><a href="#exams" class="btn link" style="padding-left:0">← All examinations</a></div>
 <div class="panel" style="display:grid;gap:12px"><div class="prof"><div class="who"><div class="code">${esc(x.session)}${x.practice?' · <span class="pill p-pause">Practice: not counted</span>':""}</div><h2>${esc(x.title)}</h2><div class="meta"><span>${x.date?fd(x.date):"Date not set"}</span><span>${esc(x.venue)||"Venue not set"}</span><span>Pass mark ${x.passMark}%</span><span>${x.scope==="ric"?"PGTs at RIC":"All active PGTs"}</span></div></div>
  <div class="actions">${x.stage>=4&&!x.practice?`<a class="btn" href="#certx-${x.id}">Merit certificates</a>`:""}<button class="btn" data-act="ex-edit">Edit details</button>${xbtn("exam:"+x.id)}${x.practice?`<button class="btn danger" data-act="ex-delpr">Delete practice exam</button>`:""}</div></div>
  <div class="stepper ex">${EX_STAGES.map((s,i)=>`<div class="${i<x.stage?"done":i===x.stage?"now":""}">${s}</div>`).join("")}</div>
  ${x.stage<5?`<div class="exnext"><span>${nextTxt}</span><span class="actions">${x.stage>0?`<button class="btn small" data-act="ex-back">Back a step</button>`:""}${nextBtn?`<button class="btn small primary" data-act="${nextBtn[0]}">${nextBtn[1]}</button>`:""}</span></div>`:`<div class="exnext"><span><b>Results published.</b></span><span class="actions"><button class="btn small" data-act="ex-back">Back a step</button></span></div>`}
  ${fl.length?`<div class="flag">${fl.map(esc).join("<br>")}</div>`:""}</div>
 <div class="extabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" class="${k===tab?"on":""}" aria-selected="${k===tab}" data-extab="${k}">${l}</button>`).join("")}</div>
 ${body}<datalist id="ex-fac">${DB.faculty.filter(f=>f.active!==false).map(f=>`<option value="${esc(facName(f))}">`).join("")}</datalist>`};
document.addEventListener("click",e=>{const t=e.target.closest("[data-extab]");if(t){const x=DB.exams.find(v=>v.id===route.id);if(x){UI.exTab[x.id]=t.dataset.extab;render();window.scrollTo(0,0)}return}
 const f=e.target.closest("[data-exf]");if(f){UI.exF=f.dataset.exf;UI.exSel.sp=UI.exF?[UI.exF]:[];UI.exSel.g=[];const y=window.scrollY;render();window.scrollTo(0,y)}});

/* ---------- Candidates ---------- */
function exCandTab(x){const C=exCands(x),ex=exExcluded(x),lock=x.stage>=3,others=verified().filter(p=>!C.includes(p));
 const specs=exSpecs(x),F=specs.includes(UI.exF)?UI.exF:"",q=UI.exQ.trim().toLowerCase();
 const L=C.filter(p=>(!F||p.spec===F)&&(!q||(p.name+" "+(p.code||"")+" "+(x.roll?.[p.id]||"")).toLowerCase().includes(q)));
 const grp={};L.forEach(p=>{(grp[p.spec]=grp[p.spec]||[]).push(p)});
 const rows=Object.keys(grp).sort((a,b)=>specIdx(a)-specIdx(b)).map(sp=>{const P=grp[sp].sort((a,b)=>exYr(x,a)-exYr(x,b)||(x.roll?.[a.id]||"").localeCompare(x.roll?.[b.id]||"")||a.name.localeCompare(b.name));const split=exGroupsOf(x,sp);
  return`<tr class="exgh"><td colspan="6"><b>${esc(sp||"Common paper only")}</b> <span class="subt">${P.length} · ${split?`${exPaperKeys(x).filter(k=>exPaperSpec(k)===sp).length} papers`:"one paper"}</span></td></tr>`+P.map(p=>{const ab=x.absent[p.id];return`<tr><td>${x.roll&&!lock?`<input data-exroll="${p.id}" value="${esc(x.roll[p.id]||"")}" class="rollin" aria-label="Roll number for Dr. ${esc(p.name)}">`:`<span class="code">${esc(x.roll?.[p.id]||"—")}</span>`}</td>
   <td>${pgtName(p)}<div class="code">${esc(p.guest?[p.desig,p.inst].filter(Boolean).join(" · "):p.code||"")}</div></td><td>${p.guest?(p.year?"Year "+p.year:"—"):"Year "+exYr(x,p)}<div class="subt">${esc(p.guest?"not a PGT":p.program)}</div></td><td class="subt">${split?esc(exPaperOf(x,p).split(" · ")[1]):""}</td>
   <td>${ab?'<span class="pill p-done">Absent</span>':x.marks[p.id]!=null?`<span class="subt">${x.marks[p.id]}%</span>`:""}</td><td>${isViewer()?"":`${p.guest?`<button class="btn link" data-act="ex-gedit" data-id="${p.id}">Edit</button>`:""}<button class="btn link" data-act="ex-rm" data-id="${p.id}">Remove</button>`}</td></tr>`}).join("")}).join("");
 return`<div class="panel" style="display:grid;gap:10px"><p class="subt" style="margin:0">${lock?"<b>The exam has been held,</b> so the list no longer changes by itself. You can still add or remove candidates; removing someone takes their marks out of this exam (they come back if you include them again).":`Made from ${x.scope==="ric"?"active PGTs currently at RIC":"all active PGTs, including those on rotation"}${(x.added||[]).length?`, plus ${(x.added||[]).length} added by hand`:""}${ex.length?`, minus ${ex.length} excluded`:""}. It updates by itself as PGTs join, leave or rotate, until the exam is marked as held.`}</p>
  ${isViewer()?"":`<div class="toolbar"><input id="ex-add" list="ex-pgts" placeholder="Add a PGT by name or ID (any PGT, at RIC or not)" style="flex:1 1 240px" aria-label="Add PGT"><datalist id="ex-pgts">${others.map(p=>`<option value="${esc(pgtLabel(p))}">`).join("")}</datalist><button class="btn small" data-act="ex-addp">Add to exam</button><button class="btn small" data-act="ex-guest">Add someone who is not a PGT</button>${lock?"":`<select id="ex-scope" aria-label="Who is eligible">${opt([["ric","Eligible: active PGTs at RIC"],["all","Eligible: all active PGTs"]],x.scope)}</select>`}</div>`}
  <div class="toolbar"><input type="search" id="ex-q" value="${esc(UI.exQ)}" placeholder="Search name, PGT ID or roll number" style="flex:1 1 220px" aria-label="Search candidates"><span class="subt">${L.length} shown</span>
   <span class="actions">${x.roll?"":`<button class="btn small primary" data-act="ex-roll">Make roll numbers</button>`}${waBtn(`examsel:${x.id}`,"WhatsApp list")}${xbtn("examcands:"+x.id,"Download list")}</span></div>
  <div class="chips"><button class="chip" data-exf="" aria-pressed="${!F}">All<span class="c">${C.length}</span></button>${specs.map(s=>`<button class="chip" data-exf="${esc(s)}" aria-pressed="${F===s}">${esc(s)}<span class="c">${C.filter(p=>p.spec===s).length}</span></button>`).join("")}</div></div>
 <div class="panel flush"><div class="tblwrap"><table class="extbl"><thead><tr><th>Roll no.</th><th>PGT</th><th>Year</th><th>Paper</th><th></th><th></th></tr></thead><tbody>${rows||`<tr><td colspan="6" class="empty">No candidates match.</td></tr>`}</tbody></table></div>
 ${ex.length?`<details style="padding:10px 16px"><summary class="subt" style="cursor:pointer">${ex.length} excluded</summary><div class="tblwrap"><table><tbody>${ex.map(([p,r])=>`<tr><td>${pgtName(p)}<div class="subt">${esc(p.spec)}</div></td><td>${esc(r)}</td><td>${isViewer()?"":`<button class="btn link" data-act="ex-back" data-id="${p.id}">Include again</button>`}</td></tr>`).join("")}</tbody></table></div></details>`:""}</div>
 <p class="subt">Roll number = PGT ID without the slashes (PGT/25/7/01 → 25701); it stays the same for the whole training.${x.roll?` <button class="btn link" data-act="ex-roll">Remake roll numbers</button>`:""}</p>`}
document.addEventListener("input",e=>{if(e.target.id!=="ex-q")return;UI.exQ=e.target.value;const pos=e.target.selectionStart;render();const n=document.getElementById("ex-q");if(n){n.focus();n.setSelectionRange(pos,pos)}});

/* ---------- Papers ---------- */
const EX_SPLIT=[["all","One paper for all years"],["year","A separate paper for each year"],["custom","Papers for groups of years…"]];
function exPapersTab(x){const specs=exSpecs(x),C=exCands(x),lk=x.stage>=3;const O=omrOf(x);
 const blocks=specs.map(sp=>{const m=exSplitOf(x,sp),keys=exPaperKeys(x).filter(k=>exPaperSpec(k)===sp),n=C.filter(p=>p.spec===sp).length;
  const rows=keys.map(k=>{const pp=x.papers[k]||{},s=omrSpec(x,k),cn=C.filter(p=>exPaperOf(x,p)===k).length,kd=s?omrKeyDone(s):0;
   const cb=(f,l)=>`<label class="exck ${pp[f]?"on":""}"><input type="checkbox" data-expc="${esc(k)}|${f}" ${pp[f]?"checked":""} ${lk?"disabled":""}> ${l}</label>`;
   return`<div class="exp"><div class="exp-h"><b>${esc(k.includes(" · ")?k.split(" · ")[1]:"All years")}</b><span class="subt">${cn} candidate${cn===1?"":"s"}</span></div>
    <div class="exp-g"><div><div class="subt">Question paper</div><div class="exck-row">${cb("req","Requested")}${cb("recv","Received")}${cb("key","Key received")}${cb("mod","Moderated")}${cb("final","Final")}</div>
     <div class="toolbar" style="margin-top:6px"><input data-expc="${esc(k)}|focal" value="${esc(pp.focal||"")}" list="ex-fac" placeholder="Focal person" aria-label="Focal person, ${esc(k)}" style="flex:1 1 180px" ${lk?"disabled":""}><input type="number" min="0" data-expc="${esc(k)}|mcqs" value="${pp.mcqs??""}" placeholder="No. of MCQs" style="width:120px" aria-label="Number of MCQs, ${esc(k)}" ${lk?"disabled":""}></div></div>
     <div><div class="subt">OMR answer sheet</div>${s?`<div style="margin:4px 0">${s.n} questions · ${s.opts===4?"A-D":"A-E"}${s.sections.length?` · ${s.sections.length} sections`:""} · key ${kd===s.n?'<span class="pill p-ric">complete</span>':`<span class="pill p-pause">${kd}/${s.n}</span>`}${s.printed?` · <span class="subt">printed ${fd(s.printed.at.slice(0,10))}</span>`:""}</div>`:`<div class="subt" style="margin:4px 0">Not set up yet</div>`}
      <div class="actions" style="justify-content:flex-start"><button class="btn small ${s?"":"primary"}" data-act="omr-setup" data-sp="${esc(k)}">${s?"Sheet setup":"Set up sheet"}</button>${s?`<button class="btn small" data-act="omr-key" data-sp="${esc(k)}">Answer key</button><button class="btn small" data-act="omr-print" data-sp="${esc(k)}">Print sheets</button>`:""}</div></div></div></div>`}).join("");
  return`<div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">${esc(sp)} <span class="subt" style="text-transform:none;letter-spacing:0">· ${n} candidates</span></h3>
   <select data-exsplit="${esc(sp)}" aria-label="Papers for ${esc(sp)}" ${lk?"disabled":""}>${opt(EX_SPLIT,m==="all"||m==="year"?m:"custom")}</select></div>
   ${m!=="all"&&m!=="year"?`<div class="toolbar"><label class="subt" for="exg-${esc(sp)}">Year groups</label><input id="exg-${esc(sp)}" data-exsplitc="${esc(sp)}" value="${esc(m==="custom"?"":m)}" placeholder="e.g. 1-2, 3-5" style="width:160px" ${lk?"disabled":""}><span class="subt">Years separated by commas; a dash joins years into one paper.</span></div>`:""}
   ${rows}</div>`}).join("");
 return`<div class="panel" style="display:grid;gap:8px"><p class="subt" style="margin:0">One block per specialty. If a specialty sets different papers for different training years, choose that at the top right of its block; each paper then has its own checklist, OMR sheet and answer key.${Object.keys(O.specs||{}).length?"":" Start with <b>Set up sheet</b> for each paper."}</p>
  <div class="actions" style="justify-content:flex-start">${Object.keys(O.specs||{}).length?`<button class="btn small" data-act="omr-printall">Print all personalised sheets</button>`:""}${xbtn(`evalbeeall:${x.id}`,"Evalbee lists (if using Evalbee)")}</div></div>${blocks||`<div class="panel empty">No candidates yet.</div>`}`}
document.addEventListener("change",e=>{const s=e.target.closest("[data-exsplit],[data-exsplitc]");if(!s)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;x.split=x.split||{};
 const sp=s.dataset.exsplit||s.dataset.exsplitc;let v=s.value.trim();
 if(s.dataset.exsplit!=null){if(v==="custom"){x.split[sp]="custom";render();setTimeout(()=>document.querySelector(`[data-exsplitc="${CSS.escape(sp)}"]`)?.focus(),30);return}}
 else{if(!/^\d+(-\d+)?(\s*,\s*\d+(-\d+)?)*$/.test(v)){toast("Write year groups like 1-2, 3-5");return}}
 const was=exSplitOf(x,sp);if(v===was)return;
 if(omrScans(x).some(z=>z.use&&exPaperSpec(z.spec)===sp)){toast("Sheets for this specialty have already been scanned; the papers cannot be split differently now.");render();return}
 if(v==="all")delete x.split[sp];else x.split[sp]=v;
 /* settings made for the whole specialty carry over to each new paper (and back) */
 const O=omrOf(x),base=O.specs[sp]||Object.entries(O.specs).find(([k])=>exPaperSpec(k)===sp)?.[1];
 if(base)exPaperKeys(x).filter(k=>exPaperSpec(k)===sp&&!O.specs[k]).forEach(k=>{omrSpec(x,k,true);Object.assign(O.specs[k],{n:base.n,opts:base.opts,sections:JSON.parse(JSON.stringify(base.sections||[]))})});
 xlog(x,`${sp}: ${v==="all"?"one paper for all years":v==="year"?"a separate paper for each year":"papers for years "+v}`);persist();render()});

/* ---------- Results ---------- */
function exResultsTab(x){const keys=exPaperKeys(x),C=exCands(x),canMark=x.stage>=3&&x.stage<5;
 const scan=omrScanPanel(x);
 const tables=keys.map(k=>{const P=C.filter(p=>exPaperOf(x,p)===k).sort((a,b)=>(x.roll?.[a.id]||"").localeCompare(x.roll?.[b.id]||"")||a.name.localeCompare(b.name));const done=P.filter(p=>x.marks[p.id]!=null||x.absent[p.id]).length;
  return`<details class="exres" ${UI.exOpen===k?"open":""} data-exopen="${esc(k)}"><summary><b>${esc(k)}</b> <span class="subt">${done} of ${P.length} done</span></summary><div class="tblwrap"><table><thead><tr><th>Roll</th><th>PGT</th><th>Year</th><th>Marks %</th><th>Absent</th><th>Result</th><th class="num">Correct</th></tr></thead><tbody>
  ${P.map(p=>{const m=x.marks[p.id],ab=x.absent[p.id],r=x.raw&&x.raw[p.id];return`<tr><td class="code">${esc(x.roll?.[p.id]||"")}</td><td>${pgtName(p)}</td><td>${exYr(x,p)}</td><td><input type="number" min="0" max="100" step="0.1" style="width:86px" data-exmark="${p.id}" value="${m??""}" ${canMark&&!ab?"":"disabled"} aria-label="Marks for Dr. ${esc(p.name)}"></td><td><input type="checkbox" data-exabs="${p.id}" ${ab?"checked":""} ${canMark?"":"disabled"} aria-label="Absent"></td>
   <td>${ab?'<span class="pill p-done">Absent</span>':m==null?"—":exPass(x,p,m)?'<span class="pill p-ric">Pass</span>':'<span class="pill p-bad">Fail</span>'}</td><td class="num subt">${r?`${r.o}/${r.t}`:""}</td></tr>`}).join("")}</tbody></table></div></details>`}).join("");
 return`${x.stage<3?`<div class="flag info">Marks can be entered once the exam is marked as held. You can still try the OMR scanner here, for example on a practice exam.</div>`:""}
 ${scan||`<div class="panel"><h3 style="margin:0">Scan answer sheets</h3><p class="subt" style="margin:6px 0 0">Set up the OMR sheet for at least one paper (Papers tab) first.</p></div>`}
 <div class="panel" style="display:grid;gap:8px"><h3 style="margin:0">Marks by paper</h3><p class="subt" style="margin:0">Scanned results land here. You can also type a mark or tick absent by hand.</p>${tables||'<p class="subt">No papers.</p>'}</div>
 <details class="panel"><summary style="cursor:pointer"><b>Using Evalbee instead</b> <span class="subt">upload Evalbee result files</span></summary><div style="margin-top:10px">${exImportOrig(x)}</div></details>`}
document.addEventListener("toggle",e=>{const d=e.target;if(d.dataset&&d.dataset.exopen!=null&&d.open)UI.exOpen=d.dataset.exopen},true);

/* ---------- Analysis ---------- */
function exAnalysisTab(x){const a=examResultsPanel(x),b=iaPanel(x);return a||b?a+b:`<div class="panel empty">Analysis appears once results are in.</div>`}

/* the scanning panel no longer carries the item analysis (it has its own tab), and the old OMR table moved to Papers */
const exImportOrig=x=>IMPORT_ORIG(x);

/* ---------- practice exams: the full process with nothing counted ---------- */
{const _v=vExams;vExams=function(){const all=DB.exams,pr=all.filter(x=>x.practice);let h;DB.exams=all.filter(x=>!x.practice);try{h=_v()}finally{DB.exams=all}
 if(pr.length)h+=`<div class="panel flush"><h3 style="padding:14px 16px 0;margin:0">Practice exams <span class="subt" style="text-transform:none;letter-spacing:0">· not counted anywhere</span></h3><div class="tblwrap" style="margin-top:8px"><table><tbody>${pr.map(x=>`<tr class="click" data-href="exam-${x.id}"><td>${esc(x.session)}</td><td>${omrScans(x).length} sheets scanned</td><td class="subt">${fd(x.date)}</td></tr>`).join("")}</tbody></table></div></div>`;
 return h.replace(/(<button class="btn primary" data-act="ex-new">New examination<\/button>)/,'<span class="actions"><button class="btn" data-act="ex-practice" title="Try the whole process, including OMR scanning; nothing reaches PGT profiles">Practice exam</button>$1</span>')}}
{const _p=pgtExams;pgtExams=function(p){return _p(p).filter(r=>!r.x.practice)}}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="ex-practice"],[data-act="ex-delpr"]');if(!b)return;
 if(b.dataset.act==="ex-practice"){const m=iso(TODAY).slice(0,7);const nx={id:uid("EX"),title:"Practice exam",session:"Practice "+fd(iso(TODAY)),month:m,date:iso(TODAY),venue:"",passMark:60,scope:"ric",stage:2,papers:{},marks:{},absent:{},cands:null,log:[],practice:true};DB.exams.push(nx);xlog(nx,"Practice exam created (not counted anywhere)");UI.exTab[nx.id]="papers";go("exam-"+nx.id);return}
 const x=DB.exams.find(v=>v.id===route.id);if(!x||!x.practice)return;if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to delete";return}
 DB.exams=DB.exams.filter(v=>v!==x);log("Practice exam deleted","exams");persist();go("exams")});
