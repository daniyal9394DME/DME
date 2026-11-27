
/* =====================================================================
   V9 · LEFT TRAINING (exits), CONDITIONAL FORM QUESTIONS, MIGRATION
   ===================================================================== */
const DEF_EXITS=["Resigned","Terminated","Migrated to another institute"];
const exitNames=()=>(typeof DB!=="undefined"&&DB&&DB.exitTypes?DB.exitTypes.map(t=>t.name):DEF_EXITS);
function isExit(s){return s==="Resigned"||s==="Terminated"||exitNames().includes(s)}
function statusList(){return["Active","Frozen","Maternity Leave","Completed",...exitNames().filter(n=>{const t=(DB.exitTypes||[]).find(x=>x.name===n);return!t||t.active})]}
/* exit entries with what happened afterwards */
function exitRows(){return DB.status.filter(s=>isExit(s.status)).map(s=>{const p=DB.pgts.find(x=>x.id===s.pid);if(!p)return null;
 const later=DB.status.filter(x=>x.pid===s.pid&&x!==s&&(x.date||"")>(s.date||"")).sort((a,b)=>a.date<b.date?-1:1)[0];
 return{s,p,back:later&&!isExit(later.status)?later:null}}).filter(Boolean)}
UI.exf="";UI.exq="";UI.exyr="";
function vExits(){const all=exitRows(),act=verified().filter(p=>CUR.get(p.id).active).sort((a,b)=>a.name.localeCompare(b.name));
 const yrs=[...new Set(all.map(r=>(r.s.date||"").slice(0,4)).filter(Boolean))].sort().reverse();
 const rows=all.filter(r=>(!UI.exf||r.s.status===UI.exf)&&(!UI.exyr||(r.s.date||"").startsWith(UI.exyr))&&(!UI.exq||(r.p.name+" "+r.p.code+" "+r.p.spec).toLowerCase().includes(UI.exq.toLowerCase()))).sort((a,b)=>(b.s.date||"")<(a.s.date||"")?-1:1);
 LAST.exits=rows;const types=exitNames();
 return`<div class="head"><div><h2>Left training</h2><p>PGTs who resigned, were terminated or left for another reason. Recording an exit takes the PGT off active lists, supervisor counts and exam lists. The record stays in their timeline.</p></div><div class="actions">${xbtn("exits")}</div></div>
 <div class="panel" style="display:grid;gap:14px"><h3 style="margin:0">Record an exit</h3>
  <div class="formgrid">
   <label class="f" style="grid-column:1/-1">PGT<input id="xt-pgt" list="xt-pgts" placeholder="Start typing a name or PGT ID" autocomplete="off"><datalist id="xt-pgts">${act.map(p=>`<option value="${esc(pgtLabel(p))}">`).join("")}</datalist></label>
   <label class="f">Reason<select id="xt-type">${opt(DB.exitTypes.filter(t=>t.active).map(t=>t.name))}</select></label>
   <label class="f">Effective date <span class="h">last day in training</span><input type="date" id="xt-date" value="${iso(TODAY)}"></label>
   <label class="f">Office order / reference no. <span class="h">optional</span><input id="xt-ref" placeholder="e.g. RIC/ME&amp;T/2026/112"></label>
   <label class="f">Supporting document <span class="h">optional</span><input type="file" id="xt-doc" accept="image/*,application/pdf"></label>
   <label class="f" style="grid-column:1/-1">Remarks <span class="h">optional</span><input id="xt-notes"></label>
  </div>
  <div class="err" id="xt-err" role="alert"></div>
  <div class="actions"><button class="btn primary" data-act="xt-add">Record exit</button><a class="btn link" href="#settings">Change the list of reasons</a></div>
 </div>
 <div class="panel" style="display:grid;gap:10px">
  <div class="toolbar"><input type="search" id="exq" placeholder="Search PGT" value="${esc(UI.exq)}" aria-label="Search exits">
   <select id="exyr" aria-label="Year">${opt([["","All years"],...yrs],UI.exyr)}</select></div>
  <div class="chips"><button class="chip" data-exf="" aria-pressed="${!UI.exf}">All<span class="c">${all.length}</span></button>${types.map(t=>`<button class="chip" data-exf="${esc(t)}" aria-pressed="${UI.exf===t}">${esc(t)}<span class="c">${all.filter(r=>r.s.status===t).length}</span></button>`).join("")}</div>
 </div>
 <div class="panel flush"><div class="tblwrap"><table><thead><tr><th>PGT</th><th>Prog.</th><th>Reason</th><th>Effective</th><th>Year at RIC then</th><th>Reference · remarks</th><th>Entered by</th><th></th></tr></thead><tbody>
 ${rows.map(({s,p,back})=>`<tr><td><a href="#pgt-${p.id}">${pgtName(p)}</a><div class="code">${esc(p.code)||"—"} · ${esc(p.spec)}</div></td><td>${esc(p.program)}</td>
  <td><span class="pill ${s.status==="Terminated"?"p-bad":"p-done"}">${esc(s.status)}</span>${back?`<div class="subt">reinstated ${fd(back.date)}</div>`:""}</td><td>${fd(s.date)}</td>
  <td>${esc(ricLabelAt(p,s.date))}</td><td class="wrapcell">${s.ref?`<span class="code">${esc(s.ref)}</span>`:""}${s.ref&&s.notes?"<br>":""}${esc(s.notes||"")}${!s.ref&&!s.notes?"—":""}</td><td>${esc(s.by||"")}</td>
  <td style="white-space:nowrap"><button class="btn link" data-act="xt-edit" data-id="${s.id||""}" data-pid="${p.id}" data-d="${s.date}">Edit</button>${back?"":`<button class="btn link" data-act="xt-back" data-pid="${p.id}">Reinstate</button>`}</td></tr>`).join("")||`<tr><td colspan="8" class="empty">No exits recorded${UI.exf||UI.exq||UI.exyr?" for this filter":""}.</td></tr>`}
 </tbody></table></div></div>`}
/* year at RIC on a given date (uses examYear's logic) */
function ricLabelAt(p,d){try{const y=examYear({date:d},p);return y?`RIC year ${y}`:ricInfo(p).label||"—"}catch(e){return"—"}}
function exitFind(b){return DB.status.find(s=>(b.dataset.id&&s.id===b.dataset.id)||(!b.dataset.id&&s.pid===b.dataset.pid&&s.date===b.dataset.d&&isExit(s.status)))}
function exitAction(a,b){
 if(a==="xt-add"){const err=m=>{document.getElementById("xt-err").textContent=m};const lab=pick("xt-pgt");
  const p=verified().find(x=>pgtLabel(x)===lab)||verified().find(x=>x.name.toLowerCase()===lab.replace(/^dr\.?\s*/i,"").toLowerCase());if(!p)return err("Choose a PGT from the list.");
  if(!CUR.get(p.id).active)return err(`Dr. ${p.name} is not active (${CUR.get(p.id).status}).`);const d=pick("xt-date");if(!d)return err("Enter the effective date.");
  const t=pick("xt-type"),f=document.getElementById("xt-doc").files[0];
  DB.status.push({id:uid("S"),pid:p.id,status:t,date:d,ref:pick("xt-ref"),notes:pick("xt-notes"),doc:f?f.name:"",by:ME});
  log(`Dr. ${p.name} left training: ${t} from ${fd(d)}${pick("xt-ref")?" ("+pick("xt-ref")+")":""}`,"pgt-"+p.id);toast(`Exit recorded for Dr. ${p.name}`);UI.exf="";render();return}
 if(a==="xt-edit"){const s=exitFind(b),p=DB.pgts.find(x=>x.id===s.pid);return openSheet(`Edit exit · Dr. ${p.name}`,`<label class="f">Reason<select name="t">${opt(exitNames(),s.status)}</select></label>
  <label class="f">Effective date<input type="date" name="d" value="${s.date||""}"></label><label class="f">Office order / reference no.<input name="r" value="${esc(s.ref||"")}"></label><label class="f">Remarks<textarea name="n">${esc(s.notes||"")}</textarea></label>
  <div class="flag info">To undo an exit recorded by mistake, use Delete. To bring a PGT back after a real exit, use Reinstate so the history is kept.</div><button type="button" class="btn link" data-act="xt-del" data-pid="${p.id}" data-id="${s.id||""}" data-d="${s.date}" style="justify-self:start;color:var(--bad)">Delete this exit record</button>`,()=>{
  if(!fv("d"))return fail("Enter the date.");Object.assign(s,{status:fv("t"),date:fv("d"),ref:fv("r"),notes:fv("n")});log(`Edited exit record for Dr. ${p.name}: ${s.status} from ${fd(s.date)}`,"pgt-"+p.id);toast("Saved");return true})}
 if(a==="xt-del"){if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to delete";return}const s=exitFind(b),p=DB.pgts.find(x=>x.id===s.pid);DB.status=DB.status.filter(x=>x!==s);log(`Deleted exit record (${s.status}) for Dr. ${p.name}`,"pgt-"+p.id);closeSheet();toast("Exit record deleted");render();return}
 if(a==="xt-back"){const p=DB.pgts.find(x=>x.id===b.dataset.pid);return openSheet(`Reinstate · Dr. ${p.name}`,`<label class="f">Back in training from<input type="date" name="d" value="${iso(TODAY)}"></label><label class="f">Notes <span class="h">e.g. office order number</span><textarea name="n"></textarea></label>`,()=>{
  if(!fv("d"))return fail("Enter the date.");DB.status.push({id:uid("S"),pid:p.id,status:"Active",date:fv("d"),notes:fv("n")||"Reinstated",by:ME});log(`Dr. ${p.name} reinstated from ${fd(fv("d"))}`,"pgt-"+p.id);toast("Reinstated");return true},"Reinstate")}}
EXPORTS.exits=()=>({file:`RIC PGTs left training ${iso(TODAY)}`,sheets:[sheetFrom("Left training",LAST.exits.map(({s,p,back})=>({"PGT ID":p.code,"Name":"Dr. "+p.name,"Programme":p.program,"Specialty":p.spec,"Reason":s.status,"Effective date":s.date,"Year at RIC then":ricLabelAt(p,s.date),"Reference":s.ref||"","Remarks":s.notes||"","Reinstated":back?back.date:"","Entered by":s.by||""})))]});

/* settings: reasons for leaving training */
function exitTypesPanel(){return`<div class="panel flush" id="set-exit"><div class="head" style="padding:14px 16px 0"><h3 style="margin:0">Reasons for leaving training</h3><button class="btn primary small" data-act="xr-add">Add reason</button></div>
 <div class="tblwrap" style="margin-top:10px"><table><thead><tr><th>Reason</th><th class="num">PGTs</th><th>Status</th><th></th></tr></thead><tbody>
 ${DB.exitTypes.map((t,i)=>`<tr><td>${esc(t.name)}</td><td class="num">${exitRows().filter(r=>r.s.status===t.name).length}</td><td><span class="pill ${t.active?"p-ric":"p-done"}">${t.active?"In use":"Retired"}</span></td><td><button class="btn link" data-act="xr-edit" data-i="${i}">Rename</button><button class="btn link" data-act="xr-toggle" data-i="${i}">${t.active?"Retire":"Restore"}</button></td></tr>`).join("")}
 </tbody></table></div><p class="code" style="padding:0 16px 14px;margin:8px 0 0">Shown in Left training and in Change status on each PGT's page.</p></div>`}
function exitTypeAction(a,b){const i=+b.dataset.i;
 if(a==="xr-toggle"){const t=DB.exitTypes[i];t.active=!t.active;log(`${t.active?"Restored":"Retired"} exit reason ${t.name}`);render();return}
 const t=a==="xr-edit"?DB.exitTypes[i]:null;openSheet(t?`Rename · ${t.name}`:"Add reason for leaving training",`<label class="f">Reason<input name="name" value="${esc(t?.name||"")}" placeholder="e.g. Transferred to another programme"></label>`,()=>{
  const nm=fv("name");if(nm.length<3)return fail("Enter a reason.");if([...DB.exitTypes.filter(x=>x!==t).map(x=>x.name),"Active","Frozen","Maternity Leave","Completed"].some(x=>x.toLowerCase()===nm.toLowerCase()))return fail("This name is already used.");
  if(t){const old=t.name;t.name=nm;DB.status.forEach(s=>{if(s.status===old)s.status=nm});log(`Renamed exit reason ${old} to ${nm}`)}else{DB.exitTypes.push({name:nm,active:true});log(`Added exit reason ${nm}`)}toast("Saved");return true})}

document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
 if(d.exf!=null&&route.v==="exits"){UI.exf=d.exf;render();return}
 const a=d.act;if(!a)return;if(a.startsWith("xt-"))return exitAction(a,b);if(a.startsWith("xr-")){exitTypeAction(a,b);persist();return}});
document.addEventListener("input",e=>{const t=e.target;if(t.id==="exq"){UI.exq=t.value;const pos=t.selectionStart;render();const n=document.getElementById("exq");n.focus();n.setSelectionRange(pos,pos)}});
document.addEventListener("change",e=>{const t=e.target;if(t.id==="exyr"){UI.exyr=t.value;render()}});

/* =====================================================================
   CONDITIONAL QUESTIONS (show a question only for certain answers)
   ===================================================================== */
OPT_TOKENS["@specs"]=["All specialties",()=>specNames()];
const condVal=(v,want)=>{const arr=Array.isArray(v)?v:[v];return arr.some(x=>!qEmpty(x)&&want.some(w=>w===x||(w==="Other"&&isOther(x))))};
function condMet(q,vals){return!(q.show||[]).length||(q.show||[]).every(c=>condVal(vals[c.k],c.v||[]))}
function formHtml(qs,vals,prefix,dis){let h="",sec=null,open=false;vals=vals||{};
 qs.forEach(q=>{if(q.section!==sec){if(open)h+="</fieldset>";h+=`<fieldset class="pfsec">${q.section?`<legend>${esc(q.section)}</legend>`:""}`;open=true;sec=q.section}
  const sh=(q.show||[]).length?` data-show="${esc(JSON.stringify(q.show.map(c=>({n:prefix+c.k,v:c.v}))))}"`:"";
  h+=`<div class="q"${sh} ${condMet(q,vals)?"":"hidden"}><div class="qt"><span class="${q.req?"req":""}">${esc(q.t)}</span></div>${q.d?`<p class="qd">${esc(q.d)}</p>`:""}${qCtrl(q,vals[q.k],prefix+q.k,dis)}</div>`});
 return h+(open?"</fieldset>":"")}
function formRead(root,qs,prefix){const vals={},missing=[];qs.forEach(q=>{if(!condMet(q,vals)){vals[q.k]="";return}const v=qRead(root,q,prefix+q.k);vals[q.k]=v;if(q.req&&qEmpty(v))missing.push(q);else if(PB_KINDS.has(q.type)&&!qEmpty(v))pbCheck(q,v,vals).forEach(t=>missing.push({t}))});
 if(missing.length>5){const n=missing.length-4;missing.splice(4,n,{t:`and ${n} more`})}return{vals,missing}}
/* live show/hide while someone fills the form */
function domVal(root,n){const els=[...root.querySelectorAll(`[name="${CSS.escape(n)}"]`)];if(!els.length)return"";const q=els[0].closest(".q");if(q&&q.hidden)return"";
 if(els[0].type==="radio"||els[0].type==="checkbox"){const v=els.filter(e=>e.checked).map(e=>e.value==="__other"?"Other":e.value);return els[0].type==="radio"?(v[0]||""):v}
 return els[0].value==="__other"?"Other":els[0].value}
function applyShow(root){root.querySelectorAll(".q[data-show]").forEach(q=>{let c=[];try{c=JSON.parse(q.dataset.show)}catch(e){}q.hidden=!c.every(x=>condVal(domVal(root,x.n),x.v||[]))})}
document.addEventListener("change",e=>{const f=e.target.closest&&e.target.closest("form");if(f&&f.querySelector(".q[data-show]"))applyShow(f)});

/* default registration form: at RIC / another institution first */
const REG_INST=["Holy Family Hospital","Benazir Bhutto Hospital","DHQ Hospital Rawalpindi","Combined Military Hospital","Rawalpindi Medical University","Pakistan Institute of Medical Sciences","Armed Forces Institute of Cardiology"];
const PGT_CATS=["Newly inducted PGT","Other PGT / Resident"];
function defRgQ(){return[
 Q("atric","Where do you work?","mc",{opts:["At RIC","Another institution"],req:true,section:"Your details",d:"The next questions depend on this answer."}),
 Q("name","Full name","short",{req:true,d:"As it should appear on your certificate",section:"Your details"}),
 Q("cat","Category","mc",{opts:["Newly inducted PGT","Other PGT / Resident","Consultant / Faculty","Medical Officer / Registrar","Nurse / Allied Health Professional"],other:true,req:true,section:"Your details"}),
 Q("dept","RIC department","dd",{opts:["@depts"],other:true,req:true,section:"Your details",show:[{k:"atric",v:["At RIC"]}]}),
 Q("sup","Name of supervisor","dd",{opts:["@faculty"],other:true,req:true,section:"Your details",show:[{k:"atric",v:["At RIC"]},{k:"cat",v:PGT_CATS.slice()}]}),
 Q("inst","Institution","dd",{opts:REG_INST.slice(),other:true,req:true,section:"Your details",show:[{k:"atric",v:["Another institution"]}]}),
 Q("spec","Specialty","dd",{opts:["@specs"],other:true,req:true,section:"Your details",show:[{k:"atric",v:["Another institution"]}]}),
 Q("mobile","Mobile number","short",{req:true,d:"03xx-xxxxxxx. We will contact you on this number",section:"Contact"}),
 Q("email","Email address","short",{req:true,section:"Contact"}),
 Q("decl","Declaration","cb",{opts:["I confirm that I will attend the full workshop"],req:true,section:"Declaration"})]}
const regWhere=r=>{const a=r.a||{};if(a.atric==="At RIC")return"RIC · "+(stripOther(a.dept)||"department not given");if(a.atric==="Another institution")return[stripOther(a.inst),stripOther(a.spec)].filter(Boolean).join(" · ");return stripOther(a.inst)||""};

/* form editor: conditions on each question card */
function condHtml(q,i){const qs=UI.fd.qs,prev=qs.slice(0,i).filter(x=>CHOICE.has(x.type)&&!(x.opts||[]).some(o=>OPT_TOKENS[o])),C=q.show||[];
 return`<div class="qconds"><span class="subt">${C.length?"Show only when":"Always shown"}</span>${C.map((c,j)=>{const src=qs.find(x=>x.k===c.k);return`<div class="qcond" data-ci="${j}"><select data-qf="ck" aria-label="Depends on question">${prev.map(x=>`<option value="${esc(x.k)}" ${x.k===c.k?"selected":""}>${esc((x.t||"Untitled").slice(0,60))}</option>`).join("")}${src&&!prev.includes(src)?`<option value="${esc(src.k)}" selected>${esc(src.t)} (move it above)</option>`:""}</select><span class="subt">is</span>
  <span class="chips">${src?[...qOpts(src),...(src.other?["Other"]:[])].map(o=>`<label class="chip"><input type="checkbox" class="sr" data-qf="cv" value="${esc(o)}" ${(c.v||[]).includes(o)?"checked":""}> ${esc(o)}</label>`).join(""):""}</span>
  <button class="btn link" data-act="fe-cdel" data-i="${i}" data-ci="${j}">Remove</button></div>`}).join("")}
  ${prev.length?`<button class="btn link" data-act="fe-cadd" data-i="${i}">${C.length?"And also when…":"Show only when…"}</button>`:""}</div>`}
function qCard(q,i,n){const ch=CHOICE.has(q.type);
 return`<div class="qcard" data-qi="${i}"><div class="qc-top"><span class="code">${i+1}</span><input data-qf="t" value="${esc(q.t)}" placeholder="Question" aria-label="Question ${i+1}"><select data-qf="type" ${q.map?"disabled":""} aria-label="Question type">${opt(QTYPES,q.type)}</select></div>
 <input data-qf="d" value="${esc(q.d)}" placeholder="Description or help text (optional)" aria-label="Description">
 ${ch?`<label class="f"><span class="h">Options, one per line. ${Object.entries(OPT_TOKENS).map(([k,v])=>`<code>${k}</code> = ${v[0].toLowerCase()}`).join(", ")}.</span><textarea data-qf="opts" rows="${Math.min(8,Math.max(3,(q.opts||[]).length+1))}">${esc((q.opts||[]).join("\n"))}</textarea></label>
  <label class="check2"><input type="checkbox" data-qf="other" ${q.other?"checked":""}> Add an “Other” option with a text box</label>`:""}
 ${q.type==="scale"?`<div class="formgrid4"><label class="f">From<select data-qf="min">${opt(["0","1"],String(q.min))}</select></label><label class="f">To<select data-qf="max">${opt(["3","4","5","6","7","8","9","10"],String(q.max))}</select></label><label class="f">Label for lowest<input data-qf="minL" value="${esc(q.minL)}" placeholder="e.g. Poor"></label><label class="f">Label for highest<input data-qf="maxL" value="${esc(q.maxL)}" placeholder="e.g. Excellent"></label></div>`:""}
 ${q.type==="short"||q.type==="list"?`<label class="check2"><input type="checkbox" data-qf="sugg" ${(q.opts||[]).includes("@faculty")?"checked":""}> Suggest faculty names while typing</label>`:""}
 ${q.map?"":condHtml(q,i)}
 <div class="qc-foot"><label class="f inline">Section<input data-qf="section" value="${esc(q.section)}" list="fe-secs" placeholder="Section"></label>
  <label class="check2"><input type="checkbox" data-qf="req" ${q.req?"checked":""}> Required${(q.show||[]).length?" when shown":""}</label>${q.map?'<span class="pill p-rot">Used by the app</span>':""}
  <span class="qc-btns"><button class="btn link" data-act="fe-up" data-i="${i}" ${i?"":"disabled"} aria-label="Move up">↑</button><button class="btn link" data-act="fe-down" data-i="${i}" ${i<n-1?"":"disabled"} aria-label="Move down">↓</button><button class="btn link" data-act="fe-dup" data-i="${i}">Duplicate</button>${q.map?"":`<button class="btn link" data-act="fe-del" data-i="${i}">Delete</button>`}</span></div></div>`}
function readFormDraft(){if(!UI.fd)return;document.querySelectorAll(".qcard[data-qi]").forEach(c=>{const q=UI.fd.qs[+c.dataset.qi];if(!q)return;const g=f=>c.querySelector(`[data-qf="${f}"]`);
 q.t=g("t").value;q.d=g("d").value;if(!q.map)q.type=g("type").value;q.req=g("req").checked;q.section=g("section").value.trim();
 if(g("opts"))q.opts=g("opts").value.split("\n").map(s=>s.trim()).filter(Boolean);if(g("other"))q.other=g("other").checked;
 if(g("min")){q.min=+g("min").value;q.max=+g("max").value;q.minL=g("minL").value;q.maxL=g("maxL").value}
 if(g("sugg"))q.opts=g("sugg").checked?["@faculty"]:[];
 const cs=[...c.querySelectorAll(".qcond")];if(cs.length||q.show)q.show=cs.map((el,j)=>{const k=el.querySelector('[data-qf="ck"]').value,old=(q.show||[])[j];const v=[...el.querySelectorAll('[data-qf="cv"]:checked')].map(x=>x.value);return{k,v:old&&old.k!==k?[]:v}})})}
function formEditAction(a,b){const w=DB.workshops.find(x=>x.id===route.id),key={fb:"fbq",pf:"pfq",rg:"rgq"}[UI.fd.kind];if(document.getElementById("fe-desc"))w.regDesc=document.getElementById("fe-desc").value;readFormDraft();const qs=UI.fd.qs,i=+b.dataset.i;
 if(a==="fe-add"){const last=qs[qs.length-1];qs.push(Q(uid("q"),"","mc",{opts:["Option 1","Option 2"],section:last?.section||""}));render();setTimeout(()=>{const c=document.querySelectorAll(".qcard");c[c.length-1]?.querySelector('[data-qf="t"]').focus()},0);return}
 if(a==="fe-cadd"){const prev=qs.slice(0,i).filter(x=>CHOICE.has(x.type)&&!(x.opts||[]).some(o=>OPT_TOKENS[o]));const q=qs[i];q.show=[...(q.show||[]),{k:prev[0].k,v:[]}]}
 if(a==="fe-cdel"){const q=qs[i];q.show.splice(+b.dataset.ci,1);if(!q.show.length)delete q.show}
 if(a==="fe-del"){const k=qs[i].k;qs.splice(i,1);qs.forEach(q=>{if(q.show){q.show=q.show.filter(c=>c.k!==k);if(!q.show.length)delete q.show}})}
 if(a==="fe-up"&&i>0)[qs[i-1],qs[i]]=[qs[i],qs[i-1]];
 if(a==="fe-down"&&i<qs.length-1)[qs[i+1],qs[i]]=[qs[i],qs[i+1]];
 if(a==="fe-dup"){const c={...JSON.parse(JSON.stringify(qs[i])),k:uid("q"),map:0};c.t+=" (copy)";qs.splice(i+1,0,c)}
 if(a==="fe-reset")UI.fd.qs=UI.fd.kind==="fb"?defFbQ():UI.fd.kind==="rg"?defRgQ():defPfQ();
 if(a==="fe-save"){const bad=qs.findIndex(q=>!q.t.trim());if(bad>=0){toast(`Question ${bad+1} has no text`);return}
  const fewOpts=qs.findIndex(q=>["mc","dd"].includes(q.type)&&qOpts(q).length<2&&!q.other);if(fewOpts>=0){toast(`Question ${fewOpts+1} needs at least two options`);return}
  const badC=qs.findIndex((q,j)=>(q.show||[]).some(c=>!c.v.length||qs.findIndex(x=>x.k===c.k)>=j));if(badC>=0){toast(`Question ${badC+1}: tick at least one answer in “Show only when”, and keep the question it depends on above it`);return}
  qs.forEach(q=>{if(!CHOICE.has(q.type)&&!["short","list"].includes(q.type))q.opts=[];if(q.type==="scale"&&+q.max<=+q.min)q.max=+q.min+1;if(q.show&&!q.show.length)delete q.show});
  w[key]=qs;wlog(w,`${{fb:"Feedback",pf:"Proposal",rg:"Registration"}[UI.fd.kind]} form edited: ${qs.length} questions`);UI.fd=null;persist();toast("Form saved");go("ws-"+w.id);return}
 render()}
document.addEventListener("change",e=>{const t=e.target;if(t.dataset&&t.dataset.qf==="ck"&&UI.fd){readFormDraft();render()}});

/* =====================================================================
   MIGRATION of data saved by earlier versions
   ===================================================================== */
function migrate9(d){let ch=false;
 if(!d.exitTypes){d.exitTypes=DEF_EXITS.map(n=>({name:n,active:true}));ch=true}
 (d.workshops||[]).forEach(w=>{if(pbUpgrade(w))ch=true});
 (d.workshops||[]).forEach(w=>{if(w.rgq&&!w.rgq.some(q=>q.k==="atric")&&!(w.regs||[]).length){w.rgq=defRgQ();ch=true}if(!w.cert){w.cert=null}});
 if(!d.certCfg){d.certCfg=defCertCfg();ch=true}
 d.status.forEach(s=>{if(!s.id){s.id=uid("S");ch=true}});
 return ch}
