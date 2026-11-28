
/* =====================================================================
   V36 · Nov 2026 review fixes
   1 leave and exit documents are uploaded and can be viewed
   2 full backup download + weekly reminder
   3 workshops whose month has passed: held / postponed / cancelled
   4 proposal link sent to the focal person on WhatsApp
   5 trainee register: select several PGTs and act on them together
   6 side menu: foldable groups, choose which pages show
   7 small fixes: stepper labels on phones, dd/mm/yyyy date boxes, recent records on Search
   ===================================================================== */

/* ---------- 1. supporting documents ---------- */
async function docUpload(folder,file){const ext=(file.name.split(".").pop()||"pdf").toLowerCase().replace(/[^a-z0-9]/g,"")||"pdf";
 const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2,7)}.${ext}`;
 const{error}=await SYNC.sb.storage.from("dme-uploads").upload(path,file,{contentType:file.type||undefined});if(error)throw error;return path}
/* attach a picked file to a record: uploads in the live app, keeps only the name in the prototype */
async function docAttach(rec,file,folder,what){if(!rec||!file)return;
 if(file.size>5*1024*1024){toast("The document is larger than 5 MB and was not attached");return}
 if(!LIVE||!SYNC||!SYNC.sb){rec.doc={name:file.name};persist();render();return}
 toast("Uploading the document…");
 try{const path=await docUpload(folder,file);rec.doc={path,name:file.name,at:new Date().toISOString(),by:ME};persist();render();toast(`Document attached to ${what}`)}
 catch(e){rec.doc={name:file.name,failed:true};persist();render();toast("The document could not be uploaded. Open the record and attach it again.")}}
const docName=d=>typeof d==="string"?d:(d&&d.name)||"";
const docBtn=(d,label="View")=>!d?"":typeof d==="object"&&d.path?`<button class="btn link" data-act="doc-open" data-path="${esc(d.path)}">${label}</button>`
 :`<span class="subt" title="${esc(docName(d))}">${LIVE?"not uploaded":"file"}</span>`;

/* leave added on the Leave page */
{const _a=addLeaveInline;addLeaveInline=function(){const inp=document.getElementById("lv-doc"),f=inp&&inp.files[0],n=DB.leaves.length;_a();
 if(f&&DB.leaves.length>n){const l=DB.leaves[DB.leaves.length-1];docAttach(l,f,`leave/${l.pid}`,"the leave")}}}

/* leave sheet (PGT profile and Edit on the Leave page): same form, with the document */
{const _s=sheetLeave;sheetLeave=function(p,l){_s(p,l);const lab=[...document.querySelectorAll("#sheetform label.f")].find(x=>x.querySelector('input[name="doc"]'));
 if(lab&&l&&l.doc)lab.insertAdjacentHTML("beforebegin",`<div class="f"><span class="lbl" style="font-weight:600">Document on file</span><span>${esc(docName(l.doc))} ${docBtn(l.doc)}</span></div>`);
 if(lab&&l&&l.doc)lab.firstChild.textContent="Replace the document ";
 const S=SHEET;if(!S)return;const save=S.onSave;S.onSave=function(){const inp=document.querySelector('#sheetform input[name="doc"]'),f=inp&&inp.files[0],n=DB.leaves.length;const r=save();
  if(r!==false&&f){const rec=l||DB.leaves[DB.leaves.length-1];if(rec&&(l||DB.leaves.length>n))setTimeout(()=>docAttach(rec,f,`leave/${p.id}`,"the leave"),0)}return r}}}

/* Leave page table: Document column */
{const _v=vLeaves;vLeaves=function(){let h=_v();
 h=h.replace("<th>Reason</th><th>Entered by</th>","<th>Reason</th><th>Document</th><th>Entered by</th>");
 h=h.replace(/(<td>[^<]*<\/td>)(\s*<td><button class="btn link" data-act="lv-edit" data-id="([^"]+)")/g,(m,a,b,id)=>{const l=DB.leaves.find(x=>x.id===id);return`<td>${l&&l.doc?docBtn(l.doc):"—"}</td>`+a+b});
 return h.replace('colspan="9" class="empty"','colspan="10" class="empty"')}}

/* exits (Left training): upload the document and show it */
{const _x=exitAction;exitAction=function(a,b){let f=null,n=DB.status.length;if(a==="xt-add"){const inp=document.getElementById("xt-doc");f=inp&&inp.files[0]}
 const r=_x(a,b);if(a==="xt-add"&&f&&DB.status.length>n){const s=DB.status[DB.status.length-1];s.doc="";docAttach(s,f,`exit/${s.pid}`,"the exit record")}return r}}
{const _v=vExits;vExits=function(){return _v().replace(/<button class="btn link" data-act="xt-edit" data-id="([^"]*)" data-pid="([^"]*)" data-d="([^"]*)">/g,(m,id,pid,d)=>{
 const s=DB.status.find(x=>(id&&x.id===id)||(!id&&x.pid===pid&&x.date===d&&isExit(x.status)));return(s&&s.doc&&typeof s.doc==="object"&&s.doc.path?docBtn(s.doc,"Document"):"")+m})}}

/* ---------- 2. full backup ---------- */
const bkAge=()=>{const b=DB.settings&&DB.settings.lastBackup;return b&&b.at?Math.floor((TODAY-P(String(b.at).slice(0,10)))/864e5):null};
async function bkDownload(btn){if(btn)btn.disabled=true;
 try{let rows;if(LIVE&&SYNC&&SYNC.sb){toast("Collecting every record…");rows=await pullAll()}else rows=dbRows();
  const now=new Date(),stamp=iso(now)+"-"+String(now.getHours()).padStart(2,"0")+String(now.getMinutes()).padStart(2,"0");
  const out={app:"RIC DME&T Office",kind:"full backup",at:now.toISOString(),by:ME,records:rows.length,collections:[...new Set(rows.map(r=>r.coll))],rows};
  await (DL||BROWSER_DL).save({filename:`DME&T backup ${stamp}.json`,data:new Blob([JSON.stringify(out)],{type:"application/json"})});
  DB.settings.lastBackup={at:now.toISOString(),by:ME,records:rows.length};log(`Full backup downloaded (${rows.length} records)`);persist();render();toast("Backup downloaded. Keep it somewhere safe, e.g. Google Drive.")}
 catch(e){toast("The backup could not be made: "+(e.message||e))}finally{if(btn)btn.disabled=false}}
function bkPanel(){const b=DB.settings.lastBackup,a=bkAge();
 return`<div class="panel" id="set-backup" style="display:grid;gap:10px"><h3 style="margin:0">Backup</h3>
 <p style="margin:0">Downloads every record in the app (trainees, faculty, workshops, exams, tasks, settings and the audit log) as one file. Uploaded documents stay in Supabase storage and are not in the file.</p>
 <p class="subt" style="margin:0">${b?`Last backup: ${fdt(b.at)} by ${esc(b.by)}${b.records?` · ${b.records} records`:""}${a!=null?` (${a===0?"today":a+" day"+(a===1?"":"s")+" ago"})`:""}`:"No backup has been downloaded yet."} Do this once a week and keep the files in Google Drive or on a USB drive. If you ever need to restore one, send the file to Claude.</p>
 <div class="actions" style="justify-content:flex-start"><button class="btn primary" data-act="bk-dl">Download full backup</button></div></div>`}
{const _v=vSettings;vSettings=function(){return _v().replace('<div class="chips"><button class="chip" data-jump="set-thr">','<div class="chips"><button class="chip" data-jump="set-backup">Backup</button><button class="chip" data-jump="set-thr">')
 .replace('<div class="panel" id="set-thr">',bkPanel()+'<div class="panel" id="set-thr">')}}
function bkBanner(){if(!isAdmin())return"";const a=bkAge();if(a!=null&&a<7)return"";
 return`<div class="flag" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b>Weekly backup due.</b> ${a==null?"No full backup has been downloaded yet.":`The last full backup was ${a} days ago.`}</span><button class="btn small primary" data-act="bk-dl">Download backup now</button></div>`}
{const _o=vOverview;vOverview=function(){const h=_o(),b=bkBanner()+wsPastBanner();if(!b)return h;const i=h.indexOf('<div class="actions">',h.indexOf("<h2>Dashboard</h2>"));const j=i<0?-1:h.indexOf("</div></div>",i);
 return j<0?b+h:h.slice(0,j+12)+b+h.slice(j+12)}}

/* ---------- 3. workshops whose month has passed ---------- */
const wsPast=w=>{if(w.stage>=5)return false;const end=wsMonthStart(w);end.setMonth(end.getMonth()+1);return end<=TODAY&&(!w.date||P(w.date)<TODAY)};
function wsPastBanner(){if(!canSee("workshops"))return"";const L=DB.workshops.filter(wsPast);if(!L.length)return"";
 return`<div class="flag" style="display:grid;gap:6px"><b>Did ${L.length===1?"this workshop":"these workshops"} take place?</b>${L.slice(0,4).map(w=>`<span>${esc(w.title)} · ${mLabel(w.month)} <a class="btn link" href="#ws-${w.id}">Answer</a></span>`).join("")}${L.length>4?`<span class="subt">and ${L.length-4} more on the Workshops page</span>`:""}</div>`}
function wsPastPanel(w){if(!wsPast(w))return"";
 return`<div class="panel" style="display:grid;gap:10px;border-left:4px solid var(--warn)"><h3 style="margin:0">${mLabel(w.month)} has passed. Did this workshop take place?</h3>
 <p class="subt" style="margin:0">It is still at "${esc(STAGES[w.stage])}". Your answer keeps the dashboard and the annual calendar accurate.</p>
 <div class="actions" style="justify-content:flex-start"><button class="btn primary" data-act="ws-held">Yes, it was held</button><button class="btn" data-act="wsp-post">Postponed</button><button class="btn danger" data-act="wsp-cancel">Cancelled</button></div></div>`}
{const _w=vWs;vWs=function(){const h=_w(),w=DB.workshops.find(x=>x.id===route.id);if(!w)return h;const p=wsPastPanel(w);if(!p)return h;
 const i=h.indexOf('<div class="stepper">');const j=i<0?-1:h.indexOf("</div></div>",i);return j<0?p+h:h.slice(0,j+12)+p+h.slice(j+12)}}
{const _l=vWorkshops;vWorkshops=function(){const h=_l(),L=DB.workshops.filter(wsPast);if(!L.length)return h;
 const p=`<div class="panel" style="display:grid;gap:8px;border-left:4px solid var(--warn)"><h3 style="margin:0">Month passed · did these take place? ${L.length}</h3>${L.map(w=>`<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><a href="#ws-${w.id}"><b>${esc(w.title)}</b></a><span class="subt">${mLabel(w.month)} · ${esc(STAGES[w.stage])}</span><a class="btn small" href="#ws-${w.id}">Answer</a></div>`).join("")}</div>`;
 const i=h.indexOf('<div class="kpis');return i<0?p+h:h.slice(0,i)+p+h.slice(i)}}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="wsp-post"],[data-act="wsp-cancel"]');if(!b)return;const w=DB.workshops.find(x=>x.id===route.id);if(!w)return;
 if(b.dataset.act==="wsp-post"){const nx=mAdd(iso(TODAY).slice(0,7),1);return openSheet(`Postponed · ${w.title}`,`<label class="f">New month<input type="month" name="m" value="${nx}" min="${iso(TODAY).slice(0,7)}"></label>
  <label class="f">Date <span class="h">optional, if already fixed</span><input type="date" name="d"></label><label class="f">Reason <span class="h">optional</span><input name="r"></label>
  <p class="subt" style="margin:0">The workshop keeps its stage, proposal and registrations. It moves to the new month in the calendar.</p>`,()=>{const m=fv("m"),d=fv("d");if(!/^\d{4}-\d{2}$/.test(m))return fail("Choose the new month.");if(d&&!d.startsWith(m))return fail("The date must be in the new month.");
  const old=w.month;w.month=m;w.date=d||"";(w.history=w.history||[]).push({at:new Date().toISOString(),by:ME,what:`Postponed from ${mLabel(old)} to ${mLabel(m)}${fv("r")?": "+fv("r"):""}`});
  log(`Workshop postponed: ${w.title}, ${mLabel(old)} → ${mLabel(m)}${fv("r")?" ("+fv("r")+")":""}`,"ws-"+w.id);toast("Moved to "+mLabel(m));return true},"Move workshop")}
 if(b.dataset.act==="wsp-cancel")return openSheet(`Cancelled · ${w.title}`,`<p style="margin:0">The workshop is taken off the calendar and the dashboard. The audit log keeps a record of it and the reason.</p>
  <label class="f">Reason<input name="r" placeholder="e.g. focal person on leave, low registrations"></label>`,()=>{if(!fv("r"))return fail("Give a short reason for the record.");
  DB.workshops=DB.workshops.filter(x=>x!==w);log(`Workshop cancelled: ${w.title} (${mLabel(w.month)}, ${w.dept||""}). Reason: ${fv("r")}`);toast("Workshop cancelled");setTimeout(()=>go("workshops"),0);return true},"Cancel workshop")});

/* ---------- 4. proposal link on WhatsApp ---------- */
const focalOne=nm=>{const n=String(nm||"").replace(/^(prof\.?\s*)?(dr\.?\s*)?/i,"").trim().toLowerCase();return n?DB.faculty.find(f=>facName(f).toLowerCase()===String(nm).trim().toLowerCase()||String(f.name||"").toLowerCase()===n):null};
const focalFac=w=>{const L=String(w.focal||"").split(/\s*(?:,|&|\band\b)\s*/i).map(focalOne).filter(Boolean);return L.find(f=>waNum(f.mobile||f.mobile2))||L[0]||null};
function propMsg(w){return`Assalam o Alaikum ${w.focal||""},\n\nThe DME&T office requests the proposal for the workshop "${w.title}" planned for ${mLabel(w.month)}${w.dept?" ("+w.dept+")":""}.\n\nPlease fill in the proposal form here:\n${pubLink("prop",w)}\n\nRegards,\nDME Office, Rawalpindi Institute of Cardiology`}
function propSend(w,num){const url=`https://wa.me/${num}?text=${encodeURIComponent(propMsg(w))}`;window.open(url,"_blank","noopener");
 if(w.stage===0){const t=document.createElement("button");t.dataset.act="ws-sent";t.hidden=true;document.getElementById("main").append(t);t.click();t.remove()}
 else{log(`Proposal link sent again on WhatsApp to ${w.focal||"focal person"}: ${w.title}`,"ws-"+w.id);persist()}}
{const _w=vWs;vWs=function(){let h=_w();const w=DB.workshops.find(x=>x.id===route.id);if(!w||w.stage>1)return h;const f=focalFac(w),n=waNum(f&&(f.mobile||f.mobile2));
 const btn=`<button class="btn small wabtn" data-act="wsp-wa">${w.stage===0?"Send on WhatsApp":"WhatsApp again"}${n?"":" …"}</button>`;
 return h.replace(/(<button class="btn small" data-act="ws-copy">Copy link(?: again)?<\/button>)/,"$1"+btn)}}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="wsp-wa"]');if(!b)return;const w=DB.workshops.find(x=>x.id===route.id);if(!w)return;
 if(!w.focal){toast("Assign a focal person first (Edit details)");return}const f=focalFac(w),n=waNum(f&&(f.mobile||f.mobile2));if(n)return propSend(w,n);
 openSheet(`WhatsApp ${w.focal}`,`<p style="margin:0">${f?"No mobile number is on file for "+esc(w.focal)+".":esc(w.focal)+" is not in the faculty directory."} Enter the number to send the proposal link.</p>
  <label class="f">Mobile number<input name="n" inputmode="tel" placeholder="03xx-xxxxxxx"></label>${f?`<label class="check2"><input type="checkbox" name="keep" checked> Save this number in ${esc(facName(f))}'s faculty record</label>`:""}
  <div class="msgprev" style="white-space:pre-wrap;font-size:13px;padding:10px;border-radius:8px;background:var(--sunk)">${esc(propMsg(w))}</div>`,()=>{const raw=fv("n"),num=waNum(raw);if(!num)return fail("Enter a Pakistani mobile number, e.g. 0300-1234567.");
  const keep=document.querySelector('#sheetform [name="keep"]');if(f&&keep&&keep.checked){f.mobile=raw.replace(/\D/g,"").replace(/^92/,"0");log(`Mobile number added for ${facName(f)}`,"fac-"+f.id)}
  propSend(w,num);return true},"Open WhatsApp")});

/* ---------- 5. trainee register: select several ---------- */
UI.psel=UI.psel||new Set();
{const _v=vPgts;vPgts=function(){let h=_v();const S=UI.psel,shown=LAST.pgts||[];[...S].forEach(id=>{if(!DB.pgts.some(p=>p.id===id))S.delete(id)});
 const all=shown.length&&shown.every(p=>S.has(p.id));
 h=h.replace(/<thead><tr>(?=<th[^>]*><button data-sort="code">)/,`<thead><tr><th class="selcell"><input type="checkbox" data-psel="all" ${all?"checked":""} aria-label="Select all shown"></th>`);
 h=h.replace(/<tr class="click" data-href="pgt-([^"]+)"><td class="code">/g,(m,id)=>`<tr class="click${S.has(id)?" sel":""}" data-href="pgt-${id}"><td class="selcell"><input type="checkbox" data-psel="${id}" ${S.has(id)?"checked":""} aria-label="Select"></td><td class="code">`);
 h=h.replace('colspan="12" class="empty"','colspan="13" class="empty"');
 if(S.size)h+=`<div class="selbar" role="region" aria-label="Selected PGTs"><b>${S.size} selected</b>${S.size>shown.filter(p=>S.has(p.id)).length?`<span class="subt">${S.size-shown.filter(p=>S.has(p.id)).length} not in this view</span>`:""}
  <button class="btn small wabtn" data-act="ps-wa">WhatsApp</button>${canSee("exams")?`<button class="btn small" data-act="ps-exam">Add to exam</button>`:""}<button class="btn small" data-act="ps-sup">Change supervisor</button><button class="btn small link" data-act="ps-clear">Clear</button></div>`;
 return h}}
window.addEventListener("click",e=>{if(e.target.closest(".selcell"))e.stopPropagation()},true);
document.addEventListener("change",e=>{const c=e.target.closest("[data-psel]");if(!c)return;const S=UI.psel;
 if(c.dataset.psel==="all")(LAST.pgts||[]).forEach(p=>c.checked?S.add(p.id):S.delete(p.id));else c.checked?S.add(c.dataset.psel):S.delete(c.dataset.psel);render()});
const psList=()=>DB.pgts.filter(p=>UI.psel.has(p.id));
document.addEventListener("click",e=>{const b=e.target.closest('[data-act^="ps-"]');if(!b)return;const a=b.dataset.act,L=psList();
 if(a==="ps-clear"){UI.psel.clear();render();return}if(!L.length)return;
 if(a==="ps-wa"){UI.msg={recs:[],text:UI.msg&&UI.msg.text||"",sent:{},src:"pgts"};msgAdd(L.map(recPgt));toast(`${L.length} added to WhatsApp message`);go("messages");return}
 if(a==="ps-exam"){const X=DB.exams.filter(x=>!x.practice&&x.stage<3).sort((p,q)=>(p.date||p.session||"").localeCompare(q.date||q.session||""));
  if(!X.length){toast("No exam is open for candidates. Create one on the Examinations page.");return}
  return openSheet(`Add ${L.length} PGT${L.length>1?"s":""} to an exam`,`<label class="f">Exam<select name="x">${opt(X.map(x=>[x.id,`${x.title} · ${x.session}`]))}</select></label>
   <p class="subt" style="margin:0">PGTs already on the candidate list are left as they are. Anyone removed from the exam earlier is put back.</p>`,()=>{const x=DB.exams.find(z=>z.id===fv("x"));if(!x)return fail("Choose an exam.");
   x.removed=x.removed||{};x.added=x.added||[];let n=0;L.forEach(p=>{const was=exCands(x).includes(p);delete x.removed[p.id];if(x.noSpecIds&&x.noSpec&&x.noSpec.includes(p.spec)){}
    if(!exCands(x).includes(p)){if(!x.added.includes(p.id))x.added.push(p.id);if(Array.isArray(x.cands)&&!x.cands.includes(p.id))x.cands.push(p.id)}if(!was&&exCands(x).includes(p))n++});
   const skip=L.filter(p=>!exCands(x).includes(p));xlog(x,`Added ${n} PGT${n===1?"":"s"} from the trainee register`);UI.psel.clear();
   toast(`${n} added to ${x.session}${skip.length?` · ${skip.length} not added (specialty removed from this exam)`:""}${L.length-n-skip.length?` · ${L.length-n-skip.length} already on the list`:""}`);return true},"Add to exam")}
 if(a==="ps-sup"){const specs=[...new Set(L.map(p=>p.spec))],act=DB.faculty.filter(f=>f.active!==false);
  const pool=act.filter(f=>L.every(p=>canSup(f,p.spec,p.program))),rest=act.filter(f=>!pool.includes(f));
  return openSheet(`Change supervisor · ${L.length} PGT${L.length>1?"s":""}`,`<p style="margin:0">${L.slice(0,6).map(p=>"Dr. "+esc(p.name)).join(", ")}${L.length>6?` and ${L.length-6} more`:""} <span class="subt">(${specs.map(esc).join(", ")})</span></p>
   <label class="f">New supervisor<select name="fid">${pool.length?`<optgroup label="Approved for all selected">${opt(pool.map(f=>[f.id,facName(f)]))}</optgroup>`:""}<optgroup label="Other faculty">${opt(rest.map(f=>[f.id,facName(f)+" · "+f.spec]))}</optgroup></select></label>
   <label class="f">From<input type="date" name="from" value="${iso(TODAY)}"></label>${pool.length?"":`<div class="flag">No faculty member is approved for every selected PGT's specialty and programme. Check before saving.</div>`}`,()=>{
   const fid=fv("fid"),d=fv("from"),f=facById(fid);if(!f)return fail("Choose a supervisor.");if(!d)return fail("Enter the date.");let n=0,same=0,warn=0;
   L.forEach(p=>{const c=CUR.get(p.id);if(c.sup&&c.sup.id===fid){same++;return}if(!canSup(f,p.spec,p.program))warn++;
    const old=DB.sups.find(s=>s.pid===p.id&&!s.to);if(old)old.to=iso(new Date(P(d)-864e5));DB.sups.push({id:uid("V"),pid:p.id,fid,from:d,to:null,by:ME});
    log(`Supervisor of Dr. ${p.name} changed to ${facName(f)} from ${fd(d)}`,"pgt-"+p.id);n++});
   UI.psel.clear();toast(`Supervisor changed for ${n}${same?` · ${same} already had ${facName(f)}`:""}${warn?` · ${warn} not approved for their specialty: check Data checks`:""}`);return true},"Change supervisor")}});

/* ---------- 6. side menu ---------- */
const NAV_FOLD_K="ric-dme-navfold",navLocalK=()=>"ric-dme-menu:"+ME;
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const navHidden=()=>{const loc=lsGet(navLocalK(),null);return Array.isArray(loc)?loc:(meObj().menuHide||[])};
function navTidy(cur){const nav=document.getElementById("nav");if(!nav)return;const hide=navHidden(),fold=lsGet(NAV_FOLD_K,[]);
 const kids=[...nav.children];let grp="",groups={};kids.forEach(el=>{if(el.classList.contains("ng")){grp=el.textContent;groups[grp]={hd:el,items:[]};return}
  if(el.tagName==="A"){const k=el.getAttribute("href").slice(1);if(hide.includes(k)&&k!==cur&&k!=="overview"){el.remove();return}if(grp)groups[grp].items.push(el)}});
 Object.entries(groups).forEach(([g,o])=>{if(!o.items.length){o.hd.remove();return}const hasCur=o.items.some(a=>a.getAttribute("aria-current"));const shut=fold.includes(g)&&!hasCur;
  const n=o.items.reduce((s,a)=>s+(+(a.querySelector(".cnt")||{}).textContent||0),0);
  const b=document.createElement("button");b.type="button";b.className="ng ngb";b.dataset.ng=g;b.setAttribute("aria-expanded",String(!shut));
  b.innerHTML=`<span>${esc(g)}</span>${shut&&n?`<span class="cnt">${n}</span>`:""}<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;o.hd.replaceWith(b);
  o.items.forEach(a=>a.classList.toggle("nvh",shut))});
 const ed=document.createElement("button");ed.type="button";ed.className="btn link navedit";ed.dataset.act="nav-edit";ed.textContent="Choose menu pages";nav.append(ed)}
{const _rc=renderChrome;renderChrome=function(cur){_rc(cur);try{navTidy(cur)}catch(e){}}}
document.addEventListener("click",e=>{const b=e.target.closest(".ngb");if(!b)return;e.preventDefault();const g=b.dataset.ng,f=lsGet(NAV_FOLD_K,[]);lsSet(NAV_FOLD_K,f.includes(g)?f.filter(x=>x!==g):[...f,g]);
 const cur=document.querySelector('#nav a[aria-current]');renderChrome(cur?cur.getAttribute("href").slice(1):route.v)});
function navEditSheet(who){const me=meObj(),adm=isAdmin(),tgt=who?DB.staff.find(s=>s.name===who)||me:me,self=tgt===me;
 const asT=k=>{if(self)return canSee(k);if(tgt.role==="Admin")return true;const kk=k==="exits"?"leaves":["rotating","kiosk","status","datacheck"].includes(k)?"pgts":k;return["messages","calendar","overview","search"].includes(kk)||(tgt.sections||[]).includes(kk)};
 const hid=self?navHidden():(tgt.menuHide||[]),items=NAVG.filter(n=>asT(n[1])&&n[1]!=="overview");let g=null,rows="";
 items.forEach(([grp,k,l])=>{if(grp!==g){rows+=`<div class="lbl" style="font-weight:700;margin-top:8px">${esc(grp||"General")}</div>`;g=grp}rows+=`<label class="check2"><input type="checkbox" data-mh="${k}" ${hid.includes(k)?"":"checked"}> ${esc(l)}</label>`});
 openSheet(self?"Pages in my menu":`Menu for ${tgt.name}`,`${adm?`<label class="f">Menu for<select id="mh-who">${opt(DB.staff.map(s=>[s.name,s.name+(s.desig?" · "+s.desig:"")]),tgt.name)}</select></label>`:""}
  <p class="subt" style="margin:0">Untick the pages ${self?"you don't use":tgt.name+" doesn't use"}. ${self?"They leave the menu but still open from links and Search.":"This is their starting menu; they can change it for themselves."} Access rights are set in Settings → DME&T team.</p>
  <div style="display:grid;gap:4px">${rows}</div>`,()=>{const off=[...document.querySelectorAll("#sheetform [data-mh]")].filter(c=>!c.checked).map(c=>c.dataset.mh);
  if(self){lsSet(navLocalK(),off);if(adm){me.menuHide=off}}else{tgt.menuHide=off;log(`Menu pages set for ${tgt.name}`)}toast("Menu updated");return true},"Save menu")}
document.addEventListener("click",e=>{if(e.target.closest('[data-act="nav-edit"]')){e.preventDefault();navEditSheet()}});
document.addEventListener("change",e=>{if(e.target.id==="mh-who")navEditSheet(e.target.value)});

/* ---------- 7a. recently opened, on the Search page ---------- */
const RECENT_K="ric-dme-recent";
window.addEventListener("hashchange",()=>{const m=location.hash.slice(1).match(/^(pgt|fac|ws|exam|task|orient|obs|rot)-(\w+)$/);if(!m)return;const L=lsGet(RECENT_K,[]).filter(x=>x!==m[0]);L.unshift(m[0]);lsSet(RECENT_K,L.slice(0,12))});
function recentRow(h){const[k,id]=[h.split("-")[0],h.slice(h.indexOf("-")+1)];const row=(a,b)=>`<a class="srow" href="#${h}"><b>${a}</b><span class="subt">${b}</span></a>`;
 if(k==="pgt"){const p=DB.pgts.find(x=>x.id===id);return p&&canSee("pgts")?row("Dr. "+esc(p.name),`Trainee · ${esc(p.code||"no ID")} · ${esc(p.spec)}`):""}
 if(k==="fac"){const f=facById(id);return f&&canSee("faculty")?row(esc(facName(f)),`Faculty · ${esc(f.desig||"")} · ${esc(f.spec||"")}`):""}
 if(k==="ws"){const w=DB.workshops.find(x=>x.id===id);return w&&canSee("workshops")?row(esc(w.title),`Workshop · ${mLabel(w.month)}`):""}
 if(k==="exam"){const x=DB.exams.find(z=>z.id===id);return x&&canSee("exams")?row(esc(x.title),`Exam · ${esc(x.session)}`):""}
 if(k==="task"){const t=DB.tasks.find(z=>z.id===id);return t?row(esc(t.title),`Task · ${esc(t.assignee||"")}`):""}
 if(k==="obs"||k==="rot"){const v=typeof visList==="function"&&visList().find(z=>z.id===id);return v&&canSee("pgts")?row(esc(visName(v)),`${v.kind==="obs"?"Observer":"Rotating trainee"} · ${esc(v.inst||"")}${v.unit?" · "+esc(v.unit):""}`):""}
 if(k==="orient"){const o=DB.orients.find(z=>z.id===id);return o&&canSee("orientation")?row("Orientation",esc(o.cycle||"")):""}return""}
{const _s=vSearch;vSearch=function(){const h=_s();if(String(UI.gq||"").trim().length>=2)return h;const R=lsGet(RECENT_K,[]).map(recentRow).filter(Boolean);
 const quick=[["pgts","Trainee register"],["faculty","Faculty directory"],["workshops","Workshops"],["exams","Examinations"],["tasks","Tasks"]].filter(([k])=>canSee(k));
 return h+(R.length?`<div class="panel flush"><h3 style="padding:14px 16px 0;margin:0">Recently opened</h3><div class="slist">${R.join("")}</div></div>`:"")
  +`<div class="panel"><h3 style="margin:0 0 8px">Go to</h3><div class="chips">${quick.map(([k,l])=>`<a class="chip" href="#${k}">${l}</a>`).join("")}</div></div>`}}

/* ---------- 7b. date boxes show dd/mm/yyyy on computers ---------- */
const DMY_OK=(()=>{try{if((JSON.parse(localStorage.getItem("ric-dme-prefs")||"{}")).dates==="device")return false}catch(e){}return!!(window.matchMedia&&matchMedia("(pointer:fine)").matches)})();
const dmyFmt=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||"")?`${v.slice(8)}/${v.slice(5,7)}/${v.slice(0,4)}`:"";
function dmyParse(s){s=String(s||"").trim();if(!s)return"";let m=s.match(/^(\d{1,2})[\/.\- ](\d{1,2})[\/.\- ](\d{2}|\d{4})$/);
 if(!m){const M=s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})$/);if(M){const mi=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(M[2].slice(0,3).toLowerCase());if(mi>=0)m=[0,M[1],String(mi+1),M[3]]}}
 if(!m&&/^\d{8}$/.test(s))m=[0,s.slice(0,2),s.slice(2,4),s.slice(4)];if(!m)return null;
 let d=+m[1],mo=+m[2],y=+m[3];if(y<100)y+=2000;const t=new Date(y,mo-1,d);if(t.getFullYear()!==y||t.getMonth()!==mo-1||t.getDate()!==d)return null;
 return`${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
const VDESC=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");
function dmyEnhance(inp){if(inp.dataset.dmy||inp.type!=="date"||inp.closest(".nodmy"))return;inp.dataset.dmy="1";
 const wrap=document.createElement("span");wrap.className="dmy";const t=document.createElement("input");t.type="text";t.inputMode="numeric";t.autocomplete="off";t.placeholder="dd/mm/yyyy";t.className="dmyt";
 t.value=dmyFmt(VDESC.get.call(inp));t.disabled=inp.disabled;if(inp.getAttribute("aria-label"))t.setAttribute("aria-label",inp.getAttribute("aria-label"));if(inp.style.cssText)t.style.cssText=inp.style.cssText;
 const btn=document.createElement("button");btn.type="button";btn.className="dmyb";btn.tabIndex=-1;btn.setAttribute("aria-label","Open calendar");btn.disabled=inp.disabled;
 btn.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
 inp.parentNode.insertBefore(wrap,inp);wrap.append(t,btn,inp);inp.tabIndex=-1;inp.setAttribute("aria-hidden","true");
 Object.defineProperty(inp,"value",{configurable:true,get(){return VDESC.get.call(inp)},set(v){VDESC.set.call(inp,v);t.value=dmyFmt(VDESC.get.call(inp));t.removeAttribute("aria-invalid")}});
 const fire=(ev)=>inp.dispatchEvent(new Event(ev,{bubbles:true}));
 t.addEventListener("input",()=>{const v=dmyParse(t.value);if(v&&v!==VDESC.get.call(inp)){VDESC.set.call(inp,v);fire("input")}});
 const commit=()=>{const v=dmyParse(t.value);if(v===null){t.setAttribute("aria-invalid","true");return}t.removeAttribute("aria-invalid");const was=inp.dataset.last??VDESC.get.call(inp);
  VDESC.set.call(inp,v);t.value=dmyFmt(v);if(inp.dataset.lastFired!==v){inp.dataset.lastFired=v;fire("input");fire("change")}};
 inp.dataset.lastFired=VDESC.get.call(inp);
 t.addEventListener("blur",commit);t.addEventListener("keydown",e=>{if(e.key==="Enter"){commit()}if(e.key==="ArrowDown"&&e.altKey){e.preventDefault();try{inp.showPicker()}catch(x){}}});
 btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();try{inp.showPicker()}catch(x){inp.focus()}});
 inp.addEventListener("change",()=>{t.value=dmyFmt(VDESC.get.call(inp));inp.dataset.lastFired=VDESC.get.call(inp);t.removeAttribute("aria-invalid")})}
if(DMY_OK){const scan=root=>root.querySelectorAll&&root.querySelectorAll('input[type="date"]:not([data-dmy])').forEach(dmyEnhance);
 new MutationObserver(ms=>{for(const m of ms)m.addedNodes.forEach(n=>{if(n.nodeType===1){if(n.matches&&n.matches('input[type="date"]'))dmyEnhance(n);else scan(n)}})}).observe(document.body,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",()=>scan(document));setTimeout(()=>scan(document),0)}

/* clicks on the new buttons */
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="bk-dl"]');if(b){e.preventDefault();bkDownload(b)}});
