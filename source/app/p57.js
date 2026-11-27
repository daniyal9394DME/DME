
/* =====================================================================
   P57 · ACCREDITATION OF TRAINING PROGRAMMES
   Every training specialty runs FCPS (awarded by CPSP) and, where UHS
   offers it, MS or MD (awarded by UHS). Each programme needs
     1. recognition by its awarding body (CPSP or UHS), then
     2. accreditation by the PMDC.
   One record per specialty and programme, in DB.accr (its own
   collection, so two people editing different rows never clash).
   Programmes come from the specialty's durations in Settings; more can
   be added here. Old records and specialties are untouched.
   ===================================================================== */
if(typeof ARR_COLLS!=="undefined"&&!ARR_COLLS.includes("accr"))ARR_COLLS.push("accr");
const AC_PROGS=["FCPS","UHS (MS)","UHS (MD)"];
const acBody=k=>/^UHS/.test(k)?"UHS":"CPSP";
const acProgL=k=>k==="UHS (MS)"?"MS":k==="UHS (MD)"?"MD":k;
const AC_ST=["Not applied","Applied","Inspection done","Approved","Refused","Not needed"];
const AC_SOON=180;
const acSoon=()=>typeof stN==="function"?stN("ac_soon"):AC_SOON;
const acSoonTxt=()=>{const d=acSoon();return d%30===0&&d>=60?`${d/30} months`:`${d} days`};
const acList=()=>{if(!DB.accr)DB.accr=[];return DB.accr};
const acFind=(spec,prog)=>acList().find(a=>a.spec===spec&&a.prog===prog);
const acEmpty=()=>({st:"Not applied",ref:"",on:"",to:"",seats:"",notes:""});
/* every specialty-programme pair to show: from the specialty durations, plus any record already saved */
function acRows(){const out=[],seen=new Set();
 DB.specs.forEach(s=>{const progs=AC_PROGS.filter(k=>s.active&&s.teaching&&s.dur&&s.dur[k]);acList().filter(a=>a.spec===s.name).forEach(a=>{if(!progs.includes(a.prog))progs.push(a.prog)});
  progs.sort((a,b)=>AC_PROGS.indexOf(a)-AC_PROGS.indexOf(b)).forEach(k=>{seen.add(s.name+"|"+k);out.push({spec:s.name,prog:k,a:acFind(s.name,k)})})});
 acList().forEach(a=>{if(!seen.has(a.spec+"|"+a.prog))out.push({spec:a.spec,prog:a.prog,a})});return out}
/* one approval's state, with dates applied: Approved past its end is Expired; within 6 months it is Renew soon */
function acState(x){x=x||acEmpty();const st=x.st||"Not applied";if(st!=="Approved")return st;if(!x.to)return"Approved";const t=iso(TODAY);
 if(x.to<t)return"Expired";if(days(P(x.to),TODAY)<=acSoon())return"Renew soon";return"Approved"}
const acOk=s=>s==="Approved"||s==="Renew soon"||s==="Not needed";
const AC_PILL={"Not applied":"p-bad","Refused":"p-bad","Expired":"p-bad","Applied":"p-pend","Inspection done":"p-pend","Renew soon":"p-pause","Approved":"p-ric","Not needed":"p-done"};
function acPill(x){const s=acState(x);return`<span class="pill ${AC_PILL[s]||"p-done"}">${esc(s)}</span>`}
/* overall group for the filter chips */
function acGroup(r){const a=r.a||{},b=acState(a.body),m=acState(a.pmdc);
 if(b==="Expired"||m==="Expired"||b==="Renew soon"||m==="Renew soon")return"Renew";
 if(acOk(b)&&acOk(m))return"Complete";
 if(b==="Not applied"&&m==="Not applied")return"Missing";
 if(b==="Refused"||m==="Refused")return"Missing";
 return"In progress"}
function acNext(r){const a=r.a||{},b=acState(a.body),m=acState(a.pmdc),B=acBody(r.prog);
 if(b==="Expired")return`Renew ${B} recognition`;if(m==="Expired")return"Renew PMDC accreditation";
 if(b==="Refused")return`${B} refused: reapply`;if(m==="Refused")return"PMDC refused: reapply";
 if(b==="Not applied")return`Apply to ${B}`;if(b==="Applied")return`Waiting for the ${B} inspection`;if(b==="Inspection done")return`Waiting for the ${B} decision`;
 if(m==="Not applied")return"Apply to the PMDC";if(m==="Applied")return"Waiting for the PMDC inspection";if(m==="Inspection done")return"Waiting for the PMDC decision";
 if(b==="Renew soon")return`${B} recognition ends ${fd(a.body.to)}: apply to renew`;if(m==="Renew soon")return`PMDC accreditation ends ${fd(a.pmdc.to)}: apply to renew`;
 return"Done"}
function acCell(x){x=x||null;if(!x)return acPill(null);const bits=[x.ref?esc(x.ref):"",x.seats?`${esc(x.seats)} seat${+x.seats===1?"":"s"}`:"",x.to?`valid to ${fd(x.to)}`:x.on?`from ${fd(x.on)}`:""].filter(Boolean);
 return`${acPill(x)}${bits.length?`<div class="subt">${bits.join(" · ")}</div>`:""}${x.doc?`<div>${docBtn(x.doc,"Letter")}</div>`:""}`}
const AC_TABS=["All","Missing","In progress","Renew","Complete"];
const AC_TABL={All:"All",Missing:"Missing",["In progress"]:"In progress",Renew:"Renew soon or expired",Complete:"Complete"};
/* one card per specialty; its programmes (FCPS · CPSP, MS/MD · UHS) side by side, stacked on a phone. No table, no sideways scrolling. */
function acLine(label,x){return`<div class="ac-line"><span class="ac-lab">${label}</span><span>${acCell(x)}</span></div>`}
function acProgBox(r,can){const B=acBody(r.prog),a=r.a||{},nx=acNext(r);
 return`<div class="ac-prog" data-acrow="${esc(r.spec)}|${esc(r.prog)}"><div class="ac-ph"><span><b>${esc(acProgL(r.prog))}</b> <span class="subt">· ${esc(B)}</span></span>${can?`<button class="btn small" data-act="ac-edit" data-spec="${esc(r.spec)}" data-prog="${esc(r.prog)}">Update</button>`:""}</div>
  ${acLine(`1. ${B} recognition`,a.body)}${acLine("2. PMDC accreditation",a.pmdc)}
  <div class="ac-next">${nx==="Done"?'<span class="d-ok">Complete</span>':`<b>Next:</b> ${esc(nx)}`}${a.upd?`<div class="subt">updated ${fd(dDay(a.upd.at))}${a.upd.by?" by "+esc(a.upd.by):""}</div>`:""}</div></div>`}
function vAccr(){const R=acRows(),can=!isViewer(),tab=AC_TABS.includes(UI.acTab)?UI.acTab:"All",G={};AC_TABS.forEach(k=>G[k]=k==="All"?R:R.filter(r=>acGroup(r)===k));
 const q=(UI.acQ||"").toLowerCase(),specs=[...new Set(G[tab].map(r=>r.spec))];
 const noProg=DB.specs.filter(s=>s.active&&s.teaching&&!R.some(r=>r.spec===s.name));
 return`<div class="head"><div><h2>Accreditation</h2><p>Each training programme needs recognition by its awarding body (CPSP for FCPS, UHS for MS and MD), then accreditation by the PMDC.</p></div>
  <div class="actions">${xbtn("accr")}${can?`<button class="btn primary" data-act="ac-add">Add programme</button>`:""}</div></div>
 <div class="panel ac-bar"><div class="chips">${AC_TABS.map(k=>`<button class="chip" data-actab="${k}" aria-pressed="${tab===k}">${AC_TABL[k]} · ${G[k].length}</button>`).join("")}</div>
  <input type="search" id="ac-q" placeholder="Search specialty" value="${esc(UI.acQ||"")}" autocomplete="off"></div>
 <div class="ac-list">${specs.length?specs.map(sn=>{const sp=specOf(sn),P=G[tab].filter(r=>r.spec===sn);
  return`<section class="panel ac-card" data-acspec="${esc(sn.toLowerCase())}" ${q&&!sn.toLowerCase().includes(q)?"hidden":""}><div class="ac-h"><h3>${esc(sn)}</h3>${sp&&sp.title?`<span class="subt">${esc(sp.title)}</span>`:""}</div>
   <div class="ac-progs">${P.map(r=>acProgBox(r,can)).join("")}</div></section>`}).join(""):`<p class="empty panel">Nothing here.</p>`}
  <p class="empty panel" id="ac-none" ${specs.some(sn=>!q||sn.toLowerCase().includes(q))?"hidden":""}>No specialty matches the search.</p></div>
 ${noProg.length?`<p class="subt">No programme set for ${noProg.map(s=>esc(s.name)).join(", ")}. Add the programme durations in Settings → Specialties, or use "Add programme".</p>`:""}`}
if(!document.getElementById("ac-css"))document.head.insertAdjacentHTML("beforeend",`<style id="ac-css">
.ac-bar{display:grid;gap:10px;padding:12px}.ac-bar .chips{display:flex;flex-wrap:wrap;gap:6px}.ac-bar input{width:100%;min-width:0;box-sizing:border-box}
.ac-list{display:grid;gap:12px;margin-top:12px}.ac-card{display:grid;gap:10px;padding:14px;min-width:0}.ac-card[hidden],#ac-none[hidden]{display:none}
.ac-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}.ac-h h3{margin:0}
.ac-progs{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
.ac-prog{border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:grid;gap:8px;background:var(--sunk);min-width:0}
.ac-ph{display:flex;justify-content:space-between;align-items:center;gap:8px}
.ac-line{display:grid;grid-template-columns:minmax(0,9.5em) minmax(0,1fr);gap:8px;align-items:start}.ac-lab{color:var(--muted);font-size:13px;padding-top:2px}
.ac-line .subt{overflow-wrap:anywhere}.ac-next{border-top:1px dashed var(--line2);padding-top:6px;font-size:14px}.d-ok{color:var(--ok);font-weight:600}
@media (max-width:420px){.ac-line{grid-template-columns:1fr;gap:2px}}
</style>`);
/* the update form: both approvals of one programme */
function acSec(k,title,x){x=x||acEmpty();const d=v=>v?esc(v):"";
 return`<fieldset class="pfsec"><legend>${title}</legend>
  <label class="f">Status<select name="${k}-st">${opt(AC_ST,x.st||"Not applied")}</select></label>
  <div class="grid2"><label class="f">Letter or reference no. <span class="h">optional</span><input name="${k}-ref" value="${d(x.ref)}"></label><label class="f">Seats approved <span class="h">optional</span><input name="${k}-seats" type="number" min="0" max="99" value="${d(x.seats)}"></label></div>
  <div class="grid2"><label class="f">Date (applied or approved) <span class="h">optional</span><input name="${k}-on" type="date" value="${d(x.on)}"></label><label class="f">Valid until <span class="h">optional</span><input name="${k}-to" type="date" value="${d(x.to)}"></label></div>
  <label class="f">Notes <span class="h">optional</span><textarea name="${k}-notes" placeholder="e.g. inspection due, documents asked for">${d(x.notes)}</textarea></label>
  ${x.doc?`<div class="f"><span style="font-weight:600">Letter on file</span><span>${esc(docName(x.doc))} ${docBtn(x.doc)}</span></div>`:""}
  <label class="f">${x.doc?"Replace the letter":"Approval letter"} <span class="h">optional · PDF or photo, up to 5 MB</span><input type="file" name="${k}-doc" accept="application/pdf,image/jpeg,image/png,image/webp"></label></fieldset>`}
function acRead(k,old){const x={...(old||{}),st:fv(k+"-st")||"Not applied",ref:fv(k+"-ref"),on:fv(k+"-on"),to:fv(k+"-to"),seats:fv(k+"-seats"),notes:fv(k+"-notes")};
 if(x.on&&x.to&&x.to<x.on)return"“Valid until” is before the date.";if(x.seats&&(+x.seats<0||+x.seats>99))return"Seats must be 0 to 99.";return x}
function sheetAccr(spec,prog){const a=acFind(spec,prog),B=acBody(prog),sp=specOf(spec),fixed=sp&&sp.dur&&sp.dur[prog];
 openSheet(`${spec} · ${acProgL(prog)}`,`<p class="subt" style="margin:0">${esc(acProgL(prog))} ${esc(spec)}: first recognised by ${B}, then accredited by the PMDC.</p>
  ${acSec("body",`1. ${B} recognition`,a&&a.body)}${acSec("pmdc","2. PMDC accreditation",a&&a.pmdc)}
  ${a&&(a.hist||[]).length?`<details><summary>History · ${a.hist.length}</summary><ul class="subt" style="margin:6px 0 0;padding-left:18px">${a.hist.slice(0,30).map(h=>`<li>${fd(dDay(h.at))} · ${esc(h.by||"")} · ${esc(h.what)}</li>`).join("")}</ul></details>`:""}
  ${a&&!fixed?`<button type="button" class="btn small" data-act="ac-del" data-spec="${esc(spec)}" data-prog="${esc(prog)}">Remove this programme</button>`:""}`,()=>{
  const b=acRead("body",a&&a.body);if(typeof b==="string")return fail(`${B}: ${b}`);const m=acRead("pmdc",a&&a.pmdc);if(typeof m==="string")return fail(`PMDC: ${m}`);
  const fB=document.querySelector('#sheetform [name="body-doc"]').files[0],fM=document.querySelector('#sheetform [name="pmdc-doc"]').files[0];
  for(const f of[fB,fM])if(f&&f.size>5*1024*1024)return fail("A letter is larger than 5 MB.");
  const rec=a||{id:uid("AC"),spec,prog,hist:[]};const ch=[];
  const say=(l,o,n)=>{o=o||acEmpty();if((o.st||"Not applied")!==n.st)ch.push(`${l}: ${n.st}`);else if(["ref","on","to","seats","notes"].some(f=>(o[f]||"")!==(n[f]||"")))ch.push(`${l}: details updated`)};
  say(B,rec.body,b);say("PMDC",rec.pmdc,m);if(fB)ch.push(`${B} letter attached`);if(fM)ch.push("PMDC letter attached");
  rec.body=b;rec.pmdc=m;if(!a)acList().push(rec);
  if(ch.length){const at=new Date().toISOString();rec.hist=[{at,by:ME,what:ch.join("; ")},...(rec.hist||[])].slice(0,100);rec.upd={at,by:ME};log(`Accreditation, ${spec} ${acProgL(prog)}: ${ch.join("; ")}`,"accr")}
  if(fB)setTimeout(()=>docAttach(rec.body,fB,`accr/${rec.id}`,`the ${B} record`),0);if(fM)setTimeout(()=>docAttach(rec.pmdc,fM,`accr/${rec.id}`,"the PMDC record"),0);
  toast("Saved");return true})}
function sheetAccrAdd(){const S=DB.specs.filter(s=>s.active);
 openSheet("Add programme",`<p class="subt" style="margin:0">For a programme not yet in the specialty's settings, e.g. a new MS or MD.</p>
  <label class="f">Specialty<select name="spec">${opt(["",...S.map(s=>s.name)],"")}</select></label>
  <label class="f">Programme<select name="prog">${opt([["",""],...AC_PROGS.map(k=>[k,`${acProgL(k)} (${acBody(k)})`])],"")}</select></label>`,()=>{
  const spec=fv("spec"),prog=fv("prog");if(!spec)return fail("Choose the specialty.");if(!prog)return fail("Choose the programme.");
  if(acRows().some(r=>r.spec===spec&&r.prog===prog))return fail(`${acProgL(prog)} ${spec} is already in the list.`);
  acList().push({id:uid("AC"),spec,prog,body:acEmpty(),pmdc:acEmpty(),hist:[{at:new Date().toISOString(),by:ME,what:"Programme added"}],upd:{at:new Date().toISOString(),by:ME}});
  log(`Accreditation: added ${acProgL(prog)} ${spec}`,"accr");toast("Programme added");return true},"Add")}
document.addEventListener("click",e=>{const r=e.target.closest("[data-actab],[data-act^='ac-']");if(!r||!DB)return;
 if(r.dataset.actab){UI.acTab=r.dataset.actab;render();return}
 const a=r.dataset.act;if(isViewer())return;
 if(a==="ac-add")return sheetAccrAdd();
 if(a==="ac-edit")return sheetAccr(r.dataset.spec,r.dataset.prog);
 if(a==="ac-del"){if(r.dataset.armed!=="1"){r.dataset.armed="1";r.textContent="Tap again to remove";return}
  const x=acFind(r.dataset.spec,r.dataset.prog);if(x){DB.accr=acList().filter(y=>y!==x);log(`Accreditation: removed ${acProgL(x.prog)} ${x.spec}`,"accr");persist()}closeSheet();toast("Removed");render()}});
/* search: hide cards in place (no redraw, so the phone keyboard stays open) */
document.addEventListener("input",e=>{if(e.target.id!=="ac-q")return;UI.acQ=e.target.value;const q=UI.acQ.trim().toLowerCase();let n=0;
 document.querySelectorAll("main .ac-card").forEach(c=>{const ok=!q||c.dataset.acspec.includes(q);c.hidden=!ok;if(ok)n++});const none=document.getElementById("ac-none");if(none)none.hidden=n>0});

/* a specialty renamed in Settings keeps its accreditation records */
{const _s=sheetSpec;sheetSpec=function(s){_s(s);const S=SHEET;if(!S||!s)return;const old=s.name,save=S.onSave;S.onSave=function(){const r=save.apply(this,arguments);if(r!==false&&s.name!==old)acList().forEach(a=>{if(a.spec===old)a.spec=s.name});return r}}}

/* menu, dashboard, download */
{const i=NAVG.findIndex(n=>n[1]==="status");if(i>=0&&!NAVG.some(n=>n[1]==="accr"))NAVG.splice(i+1,0,[NAVG[i][0],"accr","Accreditation"])}
if(typeof NAV_ICON==="object"&&NAV_ICON)NAV_ICON.accr=NAV_ICON.credentials||NAV_ICON.status||"";
{const _e=extraAttn;extraAttn=function(){const o=_e();const R=acRows(),nm=a=>a.slice(0,3).map(r=>`${r.spec} ${acProgL(r.prog)}`).join(", ")+(a.length>3?` and ${a.length-3} more`:"");
 const ex=R.filter(r=>r.a&&(acState(r.a.body)==="Expired"||acState(r.a.pmdc)==="Expired")),soon=R.filter(r=>r.a&&!ex.includes(r)&&(acState(r.a.body)==="Renew soon"||acState(r.a.pmdc)==="Renew soon"));
 if(ex.length)o.push([ex.length,"pause",`programme accreditation${ex.length>1?"s":""} expired`,nm(ex),"accr","Renew"]);
 if(soon.length)o.push([soon.length,"pend",`programme accreditation${soon.length>1?"s":""} ending within ${acSoonTxt()}`,nm(soon),"accr","Renew"]);
 return o}}
document.addEventListener("click",e=>{const a=e.target.closest("a[data-go-filter]");if(!a)return;const[v,f]=a.dataset.goFilter.split(":");if(v==="accr"&&f)UI.acTab=f},true);
EXPORTS.accr=()=>({file:"Accreditation",sheets:[sheetFrom("Accreditation",acRows().map(r=>{const a=r.a||{},b=a.body||{},m=a.pmdc||{};return{"Specialty":r.spec,"Programme":acProgL(r.prog),"Awarding body":acBody(r.prog),
 "Awarding body status":acState(a.body),"Awarding body letter no.":b.ref||"","Awarding body date":b.on||"","Awarding body valid until":b.to||"","Awarding body seats":b.seats||"","Awarding body notes":b.notes||"",
 "PMDC status":acState(a.pmdc),"PMDC letter no.":m.ref||"","PMDC date":m.on||"","PMDC valid until":m.to||"","PMDC seats":m.seats||"","PMDC notes":m.notes||"","Next step":acNext(r)}}))]});
