
/* =====================================================================
   V10 · REVIEW FIXES AND SMOOTHER DAILY USE
   ===================================================================== */

/* ---------- exam roll numbers: always from the PGT ID, edits kept ---------- */
function ensureRolls(x){if(!x)return;x.roll=x.roll||{};exCands(x).forEach(p=>{if(!x.roll[p.id]){const r=rollOf(p);if(r)x.roll[p.id]=r}})}

/* ---------- key dates: workshops ---------- */
const addD=(d,n)=>{const x=P(d);x.setDate(x.getDate()+n);return iso(x)};
function wsAnchor(w){return w.date||(w.month?w.month+"-15":null)}
function wsTimelineRows(w){const d=wsAnchor(w);if(!d)return[];const wk=DB.settings.proposal_weeks||8,C=w.cert?.issued||[],s=w.stage;
 return[
  ["Proposal from focal person",addD(d,-wk*7),s>=2,"Send the proposal link"],
  ["Proposal approved by DME",addD(d,-42),s>=3,"Review and affirm the proposal"],
  ["Registration open, publicity sent",addD(d,-28),s>=4||!!w.regOpen,"Open registration and send publicity"],
  ["Registration closes",addD(d,-2),s>=5||(s>=4&&!w.regOpen),"Close the form; check payments"],
  [w.date?"Workshop day":"Workshop (date not set)",d,s>=5,"Mark as conducted and tick attendance"],
  ["Feedback closes",addD(d,3),s>=5&&!w.fbOpen&&(w.fbResp||[]).length>0,"Close the feedback form"],
  ["Certificates issued",addD(d,7),C.some(z=>z.group==="participant")||(w.reg.attended>0&&w.certs>=w.reg.attended),"Make certificates"],
  ["Accounts and report closed",addD(d,30),s>=6,"Enter expenses, finalise the report"]]}
function keyDates(rows,title){if(!rows.length)return"";const t=iso(TODAY);let nextShown=false;
 return`<div class="panel flush"><div class="head" style="padding:14px 16px 0"><h3 style="margin:0">${title}</h3><span class="subt">suggested from the ${title.includes("exam")?"exam":"workshop"} date</span></div><ol class="kdates">${rows.map(([l,d,done,todo])=>{const late=!done&&d<t,next=!done&&!late&&!nextShown;if(next)nextShown=true;
  return`<li class="${done?"done":late?"late":next?"next":""}"><span class="kd-d">${fd(d)}</span><span class="kd-l">${esc(l)}${!done&&(late||next)?`<span class="subt"> · ${esc(todo)}</span>`:""}</span><span class="kd-s">${done?"Done":late?`${days(TODAY,P(d))} d late`:d===t?"Today":`in ${days(P(d),TODAY)} d`}</span></li>`}).join("")}</ol></div>`}
const wsTimeline=w=>w.stage>=6?"":keyDates(wsTimelineRows(w),"Key dates");

/* ---------- key dates: exams ---------- */
function exTimelineRows(x){const d=x.date||(x.month?x.month+"-20":null);if(!d)return[];const s=x.stage,specs=exSpecs(x);
 return[["Papers requested from departments",addD(d,-42),s>=1,"Request papers"],
  ["All papers received and final",addD(d,-14),s>=2,"Chase departments still pending"],
  ["Candidate lists and Evalbee files ready",addD(d,-7),s>=3,"Download the Evalbee lists"],
  [x.date?"Exam day":"Exam (date not set)",d,s>=3,"Mark the exam as held"],
  ["Results uploaded from Evalbee",addD(d,10),s>=4,"Upload each specialty's result file"],
  ["Results published, merit certificates",addD(d,14),s>=5,"Publish results; make merit certificates"]]}
const exTimeline=x=>x.stage>=5?"":keyDates(exTimelineRows(x),"Key dates for this exam");

/* ---------- search everything ---------- */
UI.gq="";
function vSearch(){const q=UI.gq.trim().toLowerCase(),dig=q.replace(/\D/g,"");const hit=s=>String(s||"").toLowerCase().includes(q);
 const grp=(t,rows)=>rows.length?`<div class="panel flush"><h3 style="padding:14px 16px 0;margin:0">${t} · ${rows.length}</h3><div class="slist">${rows.slice(0,25).join("")}</div>${rows.length>25?`<p class="subt" style="padding:0 16px 12px">Showing 25; type more to narrow.</p>`:""}</div>`:"";
 const row=(href,a,b)=>`<a class="srow" href="#${href}"><b>${a}</b><span class="subt">${b}</span></a>`;
 let body="";if(q.length>=2){
  const P1=DB.pgts.filter(p=>hit(p.name)||hit(p.code)||(dig.length>=4&&(rollOf(p)===dig||String(p.cnic||"").replace(/\D/g,"").includes(dig)||String(p.mobile||"").replace(/\D/g,"").includes(dig))));
  const F=DB.faculty.filter(f=>hit(f.name)||hit(f.pmdc)),W=DB.workshops.filter(w=>hit(w.title)||hit(w.dept)||hit(w.focal)||hit(w.director)),X=DB.exams.filter(x=>hit(x.title)||hit(x.session));
  const T=canSee("tasks")?visibleTasks().filter(t=>hit(t.title)||hit(t.details)):[];
  const R=[];DB.workshops.forEach(w=>regsOf(w).forEach(r=>{if(hit(stripOther(r.a.name))||(dig.length>=4&&String(r.a.mobile||"").replace(/\D/g,"").includes(dig))||hit(r.a.email))R.push([w,r])}));
  body=(canSee("pgts")?grp("PGTs",P1.map(p=>{const c=CUR.get(p.id);return row("pgt-"+p.id,"Dr. "+esc(p.name),`${esc(p.code||"no ID")} · ${esc(p.spec)} · ${esc(p.reg!=="Verified"?p.reg:c?.status||"")}`)})):"")
   +(canSee("faculty")?grp("Faculty",F.map(f=>row("fac-"+f.id,esc(facName(f)),`${esc(f.desig||"")} · ${esc(f.spec||"")}`))):"")
   +(canSee("workshops")?grp("Workshops",W.map(w=>row("ws-"+w.id,esc(w.title),`${mLabel(w.month)} · ${esc(STAGES[w.stage])}`)))+grp("Workshop registrations",R.map(([w,r])=>row("ws-"+w.id,esc(stripOther(r.a.name)),`${esc(w.title)} · ${esc(r.status)} · ${esc(r.a.mobile||"")}`))):"")
   +(canSee("exams")?grp("Exams",X.map(x=>row("exam-"+x.id,esc(x.title),`${esc(x.session)} · ${esc(EX_STAGES[x.stage])}`))):"")
   +grp("Tasks",T.map(t=>row("task-"+t.id,esc(t.title),`${esc(t.assignee)} · ${esc(t.status)}`)));
  if(!body)body=`<div class="panel empty">Nothing found for “${esc(UI.gq)}”.</div>`}
 return`<div class="head"><div><h2>Search</h2><p>PGTs by name, PGT ID, roll number, CNIC or mobile; faculty; workshops and registrants; exams; tasks. Press / anywhere to come here.</p></div></div>
 <div class="panel pgq"><input type="search" id="gq" value="${esc(UI.gq)}" placeholder="Type at least 2 letters or 4 digits" aria-label="Search everything" autocomplete="off" style="width:100%;font-size:16px"></div>${body}`}
document.addEventListener("input",e=>{if(e.target.id==="gq"){UI.gq=e.target.value;const pos=e.target.selectionStart;render();const n=document.getElementById("gq");if(n){n.focus();n.setSelectionRange(pos,pos)}}});
document.addEventListener("keydown",e=>{if(e.key==="/"&&!e.ctrlKey&&!e.metaKey&&!e.target.closest("input,textarea,select,[contenteditable]")&&DB&&DB.pgts&&!document.body.classList.contains("solo")){e.preventDefault();if(route.v!=="search")go("search");setTimeout(()=>document.getElementById("gq")?.focus(),30)}});
window.addEventListener("hashchange",()=>{if(route.v==="search")setTimeout(()=>document.getElementById("gq")?.focus(),30)});

/* ---------- live sync: merge instead of overwrite ---------- */
const jeq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function merge3(base,mine,theirs){if(jeq(mine,base))return theirs;if(jeq(theirs,base)||jeq(mine,theirs))return mine;
 if(Array.isArray(mine)&&Array.isArray(theirs)){const key=x=>x&&typeof x==="object"?(x.id!=null?"i:"+x.id:x.at?"a:"+x.at+"|"+(x.what||x.by||""):null):"v:"+JSON.stringify(x);
  if([...mine,...theirs].every(x=>key(x)!=null)){const B=new Map((Array.isArray(base)?base:[]).map(x=>[key(x),x])),M=new Map(mine.map(x=>[key(x),x])),T=new Map(theirs.map(x=>[key(x),x])),out=[],seen=new Set();
   for(const x of [...theirs,...mine]){const k=key(x);if(seen.has(k))continue;seen.add(k);const b=B.get(k),m=M.get(k),t=T.get(k);
    if(m!==undefined&&t!==undefined)out.push(merge3(b,m,t));else if(m!==undefined){if(b===undefined||!jeq(b,m))out.push(m)}else if(b===undefined||!jeq(b,t))out.push(t)}
   return out}
  return mine}
 if(mine&&theirs&&typeof mine==="object"&&typeof theirs==="object"&&!Array.isArray(mine)&&!Array.isArray(theirs)){const o={};new Set([...Object.keys(mine),...Object.keys(theirs)]).forEach(k=>{const v=merge3(base&&typeof base==="object"?base[k]:undefined,mine[k],theirs[k]);if(v!==undefined)o[k]=v});return o}
 return mine}
/* fetch what others saved; merge it with anything you changed but have not saved yet */
async function reconcile(){const since=SYNC.last?new Date(new Date(SYNC.last).getTime()-15000).toISOString():"1970-01-01";
 const{data,error}=await SYNC.sb.from("dme_records").select("coll,id,ord,data,deleted,updated_at").gt("updated_at",since).order("updated_at").limit(1000);
 if(error)throw error;const local=new Map(dbRows().map(r=>[r.coll+"|"+r.id,r]));let changed=0,merged=0;
 data.forEach(r=>{if(r.updated_at>SYNC.last)SYNC.last=r.updated_at;const k=r.coll+"|"+r.id,j=r.deleted?null:sj([r.ord,r.data]);
  if(j===SYNC.snap[k]||(j===null&&!(k in SYNC.snap)))return;const L=local.get(k),lj=L?sj([L.ord,L.data]):null;
  if(lj===SYNC.snap[k]||(lj===null&&!(k in SYNC.snap))){applyRow(r);if(j===null)delete SYNC.snap[k];else SYNC.snap[k]=j;changed++;return}
  if(r.deleted){return} /* you edited something another person deleted: your version is kept and saved again */
  if(!L){applyRow(r);SYNC.snap[k]=j;changed++;return}
  const base=SYNC.snap[k]?JSON.parse(SYNC.snap[k])[1]:undefined,m=merge3(base,L.data,r.data);
  applyRow({...r,data:m});SYNC.snap[k]=j;changed++;merged++});
 if(changed)regAll();return{changed,merged}}
async function syncPull(){if(!SYNC.on||SYNC.busy||document.hidden)return;
 if(SYNC.err&&SYNC.err!=="view"&&SYNC.pending){return syncPush()}
 let res;try{res=await reconcile()}catch(e){SYNC.err=e.message||String(e);syncBadge();return}
 if(SYNC.err&&SYNC.err!=="view"&&!SYNC.pending){SYNC.err=null;syncBadge()}
 if(!res.changed)return;if(res.merged)SYNC.dirty();
 const busy=document.getElementById("overlay").innerHTML||(document.activeElement&&document.activeElement.closest&&document.activeElement.closest("main input,main textarea,main select"));
 if(busy){SYNC.stale=true;syncBadge()}else render()}
async function syncPush(all,prog){if(SYNC.busy){SYNC.again=true;return}SYNC.busy=true;clearTimeout(SYNC.t);
 try{if(!all){const r=await reconcile();if(r.changed&&!document.getElementById("overlay").innerHTML&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest("main input,main textarea,main select")))setTimeout(render,0)}
  const rows=dbRows(),seen=new Set(),up=[];rows.forEach(r=>{const k=r.coll+"|"+r.id;seen.add(k);const j=sj([r.ord,r.data]);if(all||SYNC.snap[k]!==j)up.push({...r,deleted:false,_j:j})});
  Object.keys(SYNC.snap).forEach(k=>{if(!seen.has(k)){const[coll,...id]=k.split("|");if(coll==="conduct"&&!canConduct())return;up.push({coll,id:id.join("|"),ord:0,data:null,deleted:true,_j:null})}});
  for(let i=0;i<up.length;i+=200){const part=up.slice(i,i+200);if(prog)prog(Math.min(i+200,up.length),up.length);
   const{error}=await SYNC.sb.from("dme_records").upsert(part.map(({_j,...r})=>r),{onConflict:"coll,id"});if(error)throw error;
   part.forEach(r=>{const k=r.coll+"|"+r.id;if(r.deleted)delete SYNC.snap[k];else SYNC.snap[k]=r._j})}
  SYNC.pending=false;SYNC.err=null}
 catch(e){SYNC.err=e.code==="42501"||/row-level security/i.test(e.message||"")?"view":(e.message||String(e));if(all)throw e}
 finally{SYNC.busy=false;syncBadge();if(SYNC.again){SYNC.again=false;syncPush()}}
 if(SYNC.err==="view"){toast(SYNC.role==="Viewer"?"You have view-only access. That change was not saved.":"You don't have permission for that change. It was not saved.");SYNC.pending=false;const rows=await pullAll();DB=rowsToDb(rows);regAll();render()}}
/* keep the same objects when others' changes arrive, so an open form still saves into the live record */
function applyRow(r){if(r.coll==="meta"){if(!r.deleted)DB[r.id]=r.data;return}const arr=DB[r.coll]=DB[r.coll]||[];const i=arr.findIndex(x=>String(x.id)===r.id);
 if(r.deleted){if(i>=0)arr.splice(i,1);return}
 if(i>=0){const o=arr[i];Object.keys(o).forEach(k=>{if(!(k in r.data))delete o[k]});Object.assign(o,r.data)}else if(r.coll==="audit")arr.unshift(r.data);else arr.push(r.data)}
/* delete a mistaken leave, rotation or status entry from its edit form */
document.addEventListener("click",e=>{const b=e.target.closest('button[data-act="rec-del"]');if(!b)return;
 if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to delete";return}
 const k=b.dataset.k,rec=(DB[k]||[]).find(x=>x.id===b.dataset.id);if(!rec)return;const p=DB.pgts.find(x=>x.id===rec.pid);
 DB[k]=DB[k].filter(x=>x!==rec);log(`Deleted ${({leaves:"leave",rots:"rotation",status:"status entry"})[k]} for Dr. ${p?.name||""}${rec.type?" ("+rec.type+" "+fd(rec.start)+" – "+fd(rec.end)+")":rec.status?" ("+rec.status+" "+fd(rec.date)+")":""}`,p?"pgt-"+p.id:"");
 closeSheet();toast("Deleted");render()});
function syncBadge(){const el=document.getElementById("syncst");if(!el)return;
 el.innerHTML=!navigator.onLine?`<span class="sy bad">Offline · changes save when the connection returns</span>`:SYNC.err&&SYNC.err!=="view"?`<span class="sy bad">Not saved · <button class="btn link" data-act="sy-retry">Try again</button></span>`:SYNC.pending||SYNC.busy?`<span class="sy">Saving…</span>`:SYNC.stale?`<span class="sy">Others made changes · <button class="btn link" data-act="sy-refresh">Show</button></span>`:`<span class="sy ok">All changes saved</span>`}
window.addEventListener("offline",()=>{if(SYNC.on)syncBadge()});
window.addEventListener("online",()=>{if(SYNC.on){syncBadge();SYNC.pending?syncPush():syncPull()}});
/* printable attendance sheet with a signature column */
function vAttend(){const w=DB.workshops.find(x=>x.id===route.id);if(!w)return`<div class="panel">Not found.</div>`;
 const L=regsOf(w).filter(r=>r.status==="Confirmed").sort((a,b)=>stripOther(a.a.name).localeCompare(stripOther(b.a.name)));
 return`<div class="noprint"><a href="#ws-${w.id}" class="btn link" style="padding-left:0">← ${esc(w.title)}</a></div>
 <div class="head noprint"><div><h2>Attendance sheet</h2><p>${L.length} confirmed participants, in alphabetical order. Print it for signatures on the day, then tick attendance in the registration list.</p></div><div class="actions"><button class="btn primary" data-act="att-print">Print</button></div></div>
 <div class="panel attsheet"><div class="fbhead"><img src="${document.querySelector(".appbar img")?.src||""}" alt=""><div><div class="subt">Rawalpindi Institute of Cardiology · Department of Medical Education</div><h2>${esc(w.title)}</h2><div class="subt">${w.date?fd(w.date):"Date not set"} · ${esc(w.venue||"RIC")} · Attendance</div></div></div>
 <table><thead><tr><th class="num">#</th><th>Name</th><th>Category · where they work</th><th>Mobile</th><th style="width:28%">Signature</th></tr></thead><tbody>
 ${L.map((r,i)=>`<tr><td class="num">${i+1}</td><td>${esc(stripOther(r.a.name))}</td><td>${esc(stripOther(r.a.cat||""))}<div class="subt">${esc(regWhere(r))}</div></td><td class="code">${esc(r.a.mobile||"")}</td><td></td></tr>`).join("")}
 ${[1,2,3,4,5].map(i=>`<tr><td class="num">${L.length+i}</td><td></td><td></td><td></td><td></td></tr>`).join("")}</tbody></table></div>`}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="att-print"]');if(b)window.print()});
