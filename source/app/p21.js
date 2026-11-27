
/* =====================================================================
   V18 · REMOVE RECORDS (with a restore bin), FACULTY WHO LEAVE RIC,
   and exam candidate lists with several specialties and years at once
   ===================================================================== */
const binList=()=>(DB.bin=DB.bin||[]);
const takeOut=(coll,pred)=>{const arr=DB[coll]||[],out=arr.filter(pred);if(out.length)DB[coll]=arr.filter(x=>!pred(x));return out};
const REM_WHY=["Dummy or test entry","Duplicate entry","Entered by mistake","Other"];
const facActive=f=>f&&f.active!==false;

/* ---------- trainee: remove from the register ---------- */
function sheetRemovePgt(p){const n=k=>(DB[k]||[]).filter(x=>x.pid===p.id).length;
 openSheet(`Remove from the register · Dr. ${p.name}`,`<div class="flag info">Use this only for dummy, duplicate or wrong entries. If the trainee resigned, was terminated or completed training, use <b>Change status</b> instead, so the record and its history stay in the register.</div>
 <p style="margin:0">This removes <b>Dr. ${esc(p.name)}</b> (${esc(p.code||"no PGT ID")}, ${esc(p.spec)}) with ${n("status")} status, ${n("leaves")} leave, ${n("rots")} rotation and ${n("sups")} supervisor records. It goes to <b>Settings › Removed records</b>, where you can restore it.</p>
 <label class="f">Reason<select name="why">${opt(REM_WHY,REM_WHY[0])}</select></label><label class="f">Details <span class="h">optional</span><input name="det" placeholder="e.g. duplicate of PGT/25/7/03"></label>`,()=>{
  const why=fv("why")+(fv("det")?": "+fv("det"):"");
  const rel={};["status","rots","sups","leaves","conduct"].forEach(k=>rel[k]=takeOut(k,x=>x.pid===p.id));
  DB.pgts=DB.pgts.filter(x=>x!==p);binList().unshift({id:uid("B"),kind:"pgt",at:new Date().toISOString(),by:ME,why,label:`Dr. ${p.name} · ${p.code||"no PGT ID"} · ${p.spec}`,rec:p,rel});
  log(`Removed Dr. ${p.name} (${p.code||"no PGT ID"}) from the trainee register: ${why}`);toast("Removed from the register");go(p.reg==="Verified"?"pgts":"verify");return true},"Remove")}

/* ---------- faculty: left RIC, restore, or remove a wrong entry ---------- */
function facPgts(f){return verified().filter(p=>{const c=CUR.get(p.id);return c&&c.active&&c.sup&&c.sup.id===f.id})}
function sheetFacLeft(f){const ps=facPgts(f);
 openSheet(`Left RIC · ${facName(f)}`,`<p style="margin:0">${esc(facName(f))} stays in the records (credentials, workshops, past supervision) but no longer appears in supervisor lists or the registration form.</p>
 <div class="grid2"><label class="f">Left on<input type="date" name="on" value="${iso(TODAY)}"></label><label class="f">Reason<select name="why">${opt(["Transferred","Resigned","Retired","Contract ended","Other"],"Transferred")}</select></label></div>
 ${ps.length?`<div class="flag">${ps.length} active trainee${ps.length>1?"s have":" has"} ${esc(facName(f))} as supervisor: ${ps.map(p=>"Dr. "+esc(p.name)).join(", ")}. They will be listed in <b>Data checks</b> so you can assign a new supervisor.</div>`:""}`,()=>{
  f.active=false;f.left={on:fv("on")||iso(TODAY),why:fv("why")};log(`${facName(f)} marked as left RIC on ${fd(f.left.on)} (${f.left.why})`);toast("Marked as left RIC");return true},"Mark as left")}
function sheetRemoveFac(f){const cr=DB.creds.filter(c=>c.fid===f.id).length,sp=DB.sups.filter(s=>s.fid===f.id).length,ps=facPgts(f).length;
 openSheet(`Remove · ${facName(f)}`,`<div class="flag info">Use this only for dummy, duplicate or wrong entries. For someone who has left RIC, use <b>Mark as left RIC</b> so their history is kept.</div>
 <p style="margin:0">This removes the record with ${cr} certificate${cr===1?"":"s"} and ${sp} supervision link${sp===1?"":"s"}${ps?` (${ps} active trainee${ps>1?"s":""} will need a new supervisor)`:""}. It goes to <b>Settings › Removed records</b>, where you can restore it.</p>
 <label class="f">Reason<select name="why">${opt(REM_WHY,REM_WHY[0])}</select></label><label class="f">Details <span class="h">optional</span><input name="det"></label>`,()=>{
  const why=fv("why")+(fv("det")?": "+fv("det"):"");const rel={creds:takeOut("creds",c=>c.fid===f.id),sups:takeOut("sups",s=>s.fid===f.id)};
  DB.faculty=DB.faculty.filter(x=>x!==f);binList().unshift({id:uid("B"),kind:"fac",at:new Date().toISOString(),by:ME,why,label:`${facName(f)} · ${f.desig||""} · ${f.spec||""}`,rec:f,rel});
  log(`Removed ${facName(f)} from the faculty directory: ${why}`);toast("Removed");go("faculty");return true},"Remove")}

/* ---------- Settings › Removed records ---------- */
function binPanel(){if(!isAdmin())return"";const B=binList();
 return`<div class="panel flush" id="set-bin"><div style="padding:14px 16px 0"><h3 style="margin:0">Removed records · ${B.length}</h3><p class="subt" style="margin:4px 0 0">Trainees and faculty removed as dummy, duplicate or wrong entries. Restore puts the record back exactly as it was.</p></div>
 ${B.length?`<div class="tblwrap" style="margin-top:8px"><table><thead><tr><th>Record</th><th>Reason</th><th>Removed</th><th></th></tr></thead><tbody>${B.map(b=>`<tr><td>${esc(b.label)}<div class="subt">${b.kind==="pgt"?"Trainee":"Faculty"}</div></td><td class="wrapcell">${esc(b.why)}</td><td>${fdt(b.at)}<div class="subt">${esc(b.by)}</div></td><td><button class="btn small" data-act="bin-restore" data-id="${b.id}">Restore</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="subt" style="padding:8px 16px 14px;margin:0">Nothing removed.</p>`}</div>`}
function binRestore(id){const B=binList(),b=B.find(x=>x.id===id);if(!b)return;const coll=b.kind==="pgt"?"pgts":"faculty";
 if(DB[coll].some(x=>x.id===b.rec.id)){toast("A record with the same ID already exists");return}
 DB[coll].push(b.rec);Object.entries(b.rel||{}).forEach(([k,list])=>{DB[k]=DB[k]||[];list.forEach(r=>{if(!r.id||!DB[k].some(x=>x.id===r.id))DB[k].push(r)})});
 DB.bin=B.filter(x=>x!==b);log(`Restored ${b.label}`);toast("Restored");render()}

document.addEventListener("click",e=>{const a=e.target.closest('[data-act="pgt-remove"],[data-act="fac-left"],[data-act="fac-back"],[data-act="fac-remove"],[data-act="bin-restore"],[data-act="fac-former"]');if(!a)return;
 const act=a.dataset.act;
 if(act==="fac-former"){UI.fformer=!UI.fformer;render();return}
 if(act==="bin-restore"){if(a.dataset.armed!=="1"){a.dataset.armed="1";a.textContent="Tap again to restore";return}return binRestore(a.dataset.id)}
 if(act==="pgt-remove"){const p=DB.pgts.find(x=>x.id===a.dataset.id);if(p)sheetRemovePgt(p);return}
 const f=facById(a.dataset.id);if(!f)return;
 if(act==="fac-left")sheetFacLeft(f);if(act==="fac-remove")sheetRemoveFac(f);
 if(act==="fac-back"){f.active=true;const was=f.left;delete f.left;log(`${facName(f)} restored to active faculty${was?` (had left on ${fd(was.on)})`:""}`);toast("Back in the active faculty list");render()}});
function facStatusHtml(f){return f.active===false?`<div class="flag">Left RIC${f.left?` on ${fd(f.left.on)} · ${esc(f.left.why)}`:""}. Not shown in supervisor lists or the registration form.</div>`:""}

/* ---------- exam candidate lists: several specialties, years and programmes ---------- */
UI.exSel={sp:[],g:[],prog:""};
function exGrp(x,p){const y=examYear(x,p);if(y)return"y"+y;const s=specOf(p.spec),at=P(x.date||x.month+"-15");
 if(s&&s.rotational&&p.program!=="FCPS"&&p.start){const six=addM(p.start,Math.round(((s.rule&&s.rule[2])??.5)*12));if(at>=P(p.start)&&at<six)return"init"}return"pre"}
const EXG_L=g=>g==="init"?"UHS initial 6 months":g==="pre"?"Not yet at RIC":"RIC year "+g.slice(1);
const exgOrd=g=>g==="init"?0:g==="pre"?-1:+g.slice(1);
function exSelList(x){const S=UI.exSel;return exCands(x).filter(p=>(!S.sp.length||S.sp.includes(p.spec))&&(!S.g.length||S.g.includes(exGrp(x,p)))&&(!S.prog||(S.prog==="FCPS"?p.program==="FCPS":p.program!=="FCPS")))
 .sort((a,b)=>specIdx(a.spec)-specIdx(b.spec)||exgOrd(exGrp(x,a))-exgOrd(exGrp(x,b))||(x.roll?.[a.id]||"").localeCompare(x.roll?.[b.id]||"")||a.name.localeCompare(b.name))}
function exSelLabel(){const S=UI.exSel;return[S.sp.length?S.sp.join(", "):"All specialties",S.g.length?S.g.map(EXG_L).join(", "):"all years",S.prog==="FCPS"?"FCPS only":S.prog==="UHS"?"UHS only":""].filter(Boolean).join(" · ")}
function examSpecPanel(x,specs,cands,sp,canMark){const S=UI.exSel;S.sp=S.sp.filter(s=>specs.includes(s));
 const inSp=cands.filter(p=>!S.sp.length||S.sp.includes(p.spec)),grps=[...new Set(inSp.map(p=>exGrp(x,p)))].sort((a,b)=>exgOrd(a)-exgOrd(b));S.g=S.g.filter(g=>grps.includes(g));
 const C=exSelList(x),multi=S.sp.length!==1;
 const chip=(attr,val,on,label,n)=>`<button class="chip" data-${attr}="${esc(val)}" aria-pressed="${on}">${label}${n!=null?`<span class="c">${n}</span>`:""}</button>`;
 return`<div class="panel flush"><div style="padding:14px 16px 0;display:grid;gap:10px"><div class="head"><h3 style="margin:0">Candidate lists${canMark?" and marks":""} · ${C.length}</h3>
  <div class="actions">${waBtn(`examsel:${x.id}`,"WhatsApp this list")}${x.roll?xbtn(`evalbeesel:${x.id}`,"Download Evalbee list (this selection)"):""}${xbtn(`evalbeeall:${x.id}`,"All specialties (one sheet each)")}</div></div>
  <div><div class="subt" style="margin-bottom:4px">Specialties · tap several to combine</div><div class="chips">${chip("exsp2","",!S.sp.length,"All specialties",cands.length)}${specs.map(s=>chip("exsp2",s,S.sp.includes(s),esc(s),cands.filter(p=>p.spec===s).length)).join("")}</div></div>
  <div><div class="subt" style="margin-bottom:4px">Year at the time of the exam · tap several to combine</div><div class="chips">${chip("exg","",!S.g.length,"All years",inSp.length)}${grps.map(g=>chip("exg",g,S.g.includes(g),EXG_L(g),inSp.filter(p=>exGrp(x,p)===g).length)).join("")}</div></div>
  <div class="chips">${chip("exprog","",!S.prog,"FCPS and UHS")}${chip("exprog","FCPS",S.prog==="FCPS","FCPS only")}${chip("exprog","UHS",S.prog==="UHS","UHS only")}</div>
  <p class="subt" style="margin:0">Showing: <b>${esc(exSelLabel())}</b>. ${x.roll?"Edit any roll number before downloading. ":"Generate roll numbers first (above). "}The Evalbee file follows your template: ROLLNO, NAME, PHONENO, EMAILID${x.stage<3?". Exclude anyone not sitting, or add a PGT in the candidate list panel":""}.</p>
  ${x.stage<3?`<p class="subt" style="margin:0">Marks open once the exam is marked as held.</p>`:""}</div>
  <div class="tblwrap" style="margin-top:8px"><table><thead><tr><th>Roll no.</th><th>PGT</th>${multi?"<th>Specialty</th>":""}<th>Prog.</th><th>Year (at exam)</th><th>Marks %</th><th>Absent</th><th>Result</th><th></th></tr></thead><tbody>
  ${C.map(p=>{const m=x.marks[p.id],ab=x.absent[p.id];return`<tr><td>${x.roll?`<input data-exroll="${p.id}" value="${esc(x.roll[p.id]||"")}" style="width:96px;font-family:var(--f-mono)" ${x.stage>=5?"disabled":""} aria-label="Roll number for Dr. ${esc(p.name)}">`:'<span class="subt">—</span>'}</td><td>${pgtName(p)}<div class="code">${esc(p.code)}</div></td>${multi?`<td>${esc(p.spec)}</td>`:""}<td>${esc(p.program)}</td><td>${EXG_L(exGrp(x,p))}</td>
   <td><input type="number" min="0" max="100" step="0.5" style="width:90px" data-exmark="${p.id}" value="${m??""}" ${canMark&&!ab?"":"disabled"} aria-label="Marks for Dr. ${esc(p.name)}"></td><td><input type="checkbox" data-exabs="${p.id}" ${ab?"checked":""} ${canMark?"":"disabled"} aria-label="Absent"></td>
   <td>${ab?'<span class="pill p-done">Absent</span>':m==null?"—":exPass(x,p,m)?'<span class="pill p-ric">Pass</span>':'<span class="pill p-bad">Fail</span>'}</td><td>${x.stage<3?`<button class="btn link" data-act="ex-excl" data-id="${p.id}">Exclude</button>`:`<a class="btn link" href="#pgt-${p.id}">Profile</a>`}</td></tr>`}).join("")||`<tr><td colspan="9" class="empty">No candidates match this selection.</td></tr>`}
 </tbody></table></div></div>`}
EXPORTS.evalbeesel=id=>{const x=DB.exams.find(e=>e.id===id);return{file:`Evalbee ${exSelLabel().replace(/[^A-Za-z0-9 ,.-]+/g," ").slice(0,90)} ${x.session}`,sheets:[{name:"Template",rows:evalbeeRows(x,exSelList(x))}]}};
document.addEventListener("click",e=>{const b=e.target.closest("[data-exsp2],[data-exg],[data-exprog]");if(!b)return;const S=UI.exSel;
 const tog=(arr,v)=>v===""?[]:arr.includes(v)?arr.filter(z=>z!==v):[...arr,v];
 if(b.dataset.exsp2!=null)S.sp=tog(S.sp,b.dataset.exsp2);if(b.dataset.exg!=null)S.g=tog(S.g,b.dataset.exg);if(b.dataset.exprog!=null)S.prog=b.dataset.exprog;
 const y=window.scrollY;render();window.scrollTo(0,y)});
