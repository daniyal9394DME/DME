/* ---------- shared helpers for new modules ---------- */
const WS_EXTRA=["Research Cell","Infection Prevention & Control","Nursing","Perfusion","Critical Care","Medical Education"];
const wsDepts=()=>[...specNames(),...WS_EXTRA];
const VENUES=["Auditorium","Skills lab","Operating theatre","Cath lab","Seminar room","Other"];
const FORMATS=["Hands-on","Lectures + hands-on","Case-based","Hybrid (onsite + online)"];
const STAGES=["Planned","Proposal requested","Proposal received","Approved","Registration open","Conducted","Closed"];
const STAGE_PILL=["p-done","p-rot","p-rot","p-leave","p-leave","p-pend","p-ric"];
const NEXT=["Send proposal link","Waiting for proposal","Review proposal","Prepare and open registration","Record attendance","Issue certificates and close",""];
const money=n=>"PKR "+Math.round(n||0).toLocaleString("en-PK");
const pick=id=>{const el=document.getElementById(id);return el?el.value.trim():""};
function copyText(t,btn){const done=()=>{if(btn){const o=btn.textContent;btn.textContent="Copied";setTimeout(()=>btn.textContent=o,1500)}};
 try{navigator.clipboard.writeText(t).then(done,()=>selectFallback())}catch(e){selectFallback()}
 function selectFallback(){const el=document.getElementById("copysrc");if(el){el.focus();el.select()}toast("Select the link and copy it")}}

/* =====================================================================
   LEAVE TAB
   ===================================================================== */
UI.lvf="current";UI.lvtype="";UI.lvq="";
const pgtLabel=p=>`Dr. ${p.name} · ${p.code||"no ID"} · ${p.spec}`;
function leaveState(l){if(P(l.start)>TODAY)return"Upcoming";if(P(l.end)<TODAY)return"Ended";return"Current"}
function vLeaves(){
 const act=verified().filter(p=>CUR.get(p.id).active).sort((a,b)=>a.name.localeCompare(b.name));
 const all=DB.leaves.map(l=>({l,p:DB.pgts.find(x=>x.id===l.pid),s:leaveState(l)})).filter(x=>x.p);
 const cnt=k=>all.filter(x=>k==="all"||x.s.toLowerCase()===k).length;
 const rows=all.filter(x=>(UI.lvf==="all"||x.s.toLowerCase()===UI.lvf)&&(!UI.lvtype||x.l.type===UI.lvtype)&&(!UI.lvq||(x.p.name+" "+x.p.code).toLowerCase().includes(UI.lvq.toLowerCase())))
  .sort((a,b)=>UI.lvf==="ended"?(a.l.end<b.l.end?1:-1):(a.l.start<b.l.start?-1:1));
 const yr=String(TODAY.getFullYear());
 const byType=DB.leaveTypes.map(t=>[t.name,all.filter(x=>x.l.type===t.name&&x.l.start.startsWith(yr)).reduce((s,x)=>s+days(P(x.l.end),P(x.l.start))+1,0)]).filter(x=>x[1]);
 LAST.leaves=rows;return`<div class="head"><div><h2>Leave</h2><p>Add leave for any active PGT. Leave never changes a completion date.</p></div><div class="actions">${xbtn("leaves")}</div></div>
 <div class="panel" style="display:grid;gap:14px"><h3 style="margin:0">Add leave</h3>
  <div class="formgrid">
   <label class="f" style="grid-column:1/-1">PGT<input id="lv-pgt" list="lv-pgts" placeholder="Start typing a name or PGT ID" autocomplete="off"><datalist id="lv-pgts">${act.map(p=>`<option value="${esc(pgtLabel(p))}">`).join("")}</datalist></label>
   <label class="f">Leave type<select id="lv-type">${opt(DB.leaveTypes.filter(t=>t.active).map(t=>t.name),"Casual")}</select></label>
   <label class="f">From<input type="date" id="lv-start" value="${iso(TODAY)}"></label>
   <label class="f">To<input type="date" id="lv-end"></label>
   <div class="f" style="align-self:end"><span class="lbl" style="font-weight:600">Days</span><span id="lv-days" class="days" style="font-size:22px;line-height:38px">—</span></div>
   <label class="f" style="grid-column:1/-1">Reason <span class="h">optional</span><input id="lv-reason"></label>
   <label class="f" style="grid-column:1/-1">Supporting document <span class="h">optional, e.g. approved application</span><input type="file" id="lv-doc" accept="image/*,application/pdf"></label>
  </div>
  <div class="err" id="lv-err" role="alert"></div>
  <div class="actions"><button class="btn primary" data-act="lv-add">Add leave</button></div>
 </div>
 <div class="panel" style="display:grid;gap:10px">
  <div class="toolbar"><input type="search" id="lvq" placeholder="Search PGT" value="${esc(UI.lvq)}" aria-label="Search leave">
   <select id="lvtype" aria-label="Leave type"><option value="">All leave types</option>${DB.leaveTypes.map(t=>`<option ${UI.lvtype===t.name?"selected":""}>${esc(t.name)}</option>`).join("")}</select></div>
  <div class="chips">${[["current","On leave now"],["upcoming","Upcoming"],["ended","Ended"],["all","All"]].map(([k,l])=>`<button class="chip" data-lvf="${k}" aria-pressed="${UI.lvf===k}">${l}<span class="c">${cnt(k)}</span></button>`).join("")}</div>
  ${byType.length?`<div class="legend">Days taken in ${yr}: ${byType.map(([t,n])=>`<span><b>${esc(t)}</b> ${n}</span>`).join("")}</div>`:""}
 </div>
 <div class="panel flush"><div class="tblwrap"><table><thead><tr><th>PGT</th><th>Type</th><th>From</th><th>To</th><th class="num">Days</th><th>State</th><th>Reason</th><th>Entered by</th><th></th></tr></thead><tbody>
 ${rows.map(({l,p,s})=>`<tr class="click" data-href="pgt-${p.id}"><td>${pgtName(p)}<div class="code">${esc(p.code)} · ${esc(p.spec)}</div></td><td><span class="pill p-leave">${esc(l.type)}</span></td><td>${fd(l.start)}</td><td>${fd(l.end)}</td><td class="num">${days(P(l.end),P(l.start))+1}</td>
  <td><span class="pill ${s==="Current"?"p-pause":s==="Upcoming"?"p-rot":"p-done"}">${s}${s==="Current"?" · "+days(P(l.end),TODAY)+" d left":""}</span></td><td class="wrapcell">${esc(l.reason)||"—"}</td><td>${esc(l.by)}</td>
  <td><button class="btn link" data-act="lv-edit" data-id="${l.id}">Edit</button><button class="btn link" data-del="leave" data-id="${l.id}">Delete</button></td></tr>`).join("")||`<tr><td colspan="9" class="empty">${UI.lvf==="current"?"No PGT is on leave today.":"No leave matches these filters."}</td></tr>`}
 </tbody></table></div></div>`}
function leaveDays(){const s=pick("lv-start"),e=pick("lv-end"),el=document.getElementById("lv-days");if(!el)return;el.textContent=s&&e&&e>=s?days(P(e),P(s))+1:"—"}
function addLeaveInline(){
 const err=m=>{document.getElementById("lv-err").textContent=m};
 const lab=pick("lv-pgt");const p=verified().find(x=>pgtLabel(x)===lab)||verified().filter(x=>("dr. "+x.name).toLowerCase()===lab.toLowerCase()||x.name.toLowerCase()===lab.toLowerCase())[0];
 if(!p)return err("Choose a PGT from the list.");
 const s=pick("lv-start"),e=pick("lv-end");if(!s||!e)return err("Enter both dates.");if(e<s)return err("The end date is before the start date.");
 const o=overlap(p.id,s,e);if(o)return err(`Dr. ${p.name} already has ${o.type} leave ${fd(o.start)} – ${fd(o.end)}.`);
 const l={id:uid("L"),pid:p.id,type:pick("lv-type"),start:s,end:e,reason:pick("lv-reason"),notes:"",by:ME};DB.leaves.push(l);
 log(`Added ${l.type} leave for Dr. ${p.name}: ${fd(s)} – ${fd(e)}`,"pgt-"+p.id);toast(`Leave added for Dr. ${p.name}`);
 UI.lvf=leaveState(l).toLowerCase();render()}

/* =====================================================================
   FACULTY UPDATES TAB
   ===================================================================== */
UI.credFac="";
const facLabel=f=>`${facName(f)} · ${f.spec}`;
function credIssues(f,c){const i=[];
 if(c.pmdc==="Expired")i.push(["bad","PMDC registration expired"]);else if(c.pmdc==="Expiring Soon")i.push(["warn","PMDC registration expiring "+fd(c.cr[CRED[0]].expiry)]);else if(c.pmdc==="Not Registered")i.push(["mute","No PMDC faculty registration on file"]);
 if(f.cpsp){if(c.cpsp==="Not Certified")i.push(["warn","CPSP supervisor, no certificate on file"]);else if(c.cpsp==="Expired")i.push(["bad","CPSP certificate expired"]);else if(c.cpsp==="Expiring Soon")i.push(["warn","CPSP certificate expiring "+fd(c.cr[CRED[1]].expiry)])}
 if(f.uhs){if(c.uhs==="Not Certified")i.push(["warn","UHS supervisor, no certificate on file"]);else if(c.uhs==="Expired")i.push(["bad","UHS certificate expired"]);else if(c.uhs==="Expiring Soon")i.push(["warn","UHS certificate expiring "+fd(c.cr[CRED[2]].expiry)])}
 return i}
function vCreds(){
 const f=facById(UI.credFac);const c=f&&facCur(f);
 const reg=DB.faculty.filter(x=>x.active!==false).map(x=>{const k=facCur(x);return[x,credIssues(x,k)]}).filter(x=>x[1].some(i=>UI.credMute||i[0]!=="mute")).sort((a,b)=>specIdx(a[0].spec)-specIdx(b[0].spec));
 const hist=f?DB.creds.filter(x=>x.fid===f.id).sort((a,b)=>(a.issue||"")<(b.issue||"")?1:-1):[];
 return`<div class="head"><div><h2>Faculty updates</h2><p>Record supervisor approval, upload certificates and update PMDC and registration details.</p></div></div>
 <div class="panel" style="display:grid;gap:8px"><label class="f">Faculty member<input id="cr-fac" list="cr-facs" placeholder="Start typing a name" autocomplete="off" value="${f?esc(facLabel(f)):""}"><datalist id="cr-facs">${DB.faculty.map(x=>`<option value="${esc(facLabel(x))}">`).join("")}</datalist></label>
  ${f?"":`<p class="code" style="margin:0">Choose a faculty member, or tap "Update" in the register below.</p>`}</div>
 ${f?`<div class="panel"><div class="prof"><div class="avatar" aria-hidden="true">${esc(f.name.split(" ").map(w=>w[0]).slice(0,2).join(""))}</div>
  <div class="who"><h2>${esc(facName(f))}</h2><div class="meta"><span>${esc(f.desig)}</span><span>${esc(f.spec)}${f.unit?" · "+esc(f.unit):""}</span><span>${c.n} active PGTs</span></div>
  <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${c.sp.filter(s=>s.cpsp||s.uhs).map(s=>`<span class="pill p-ric">${esc(s.spec)}: ${[s.cpsp?"CPSP":"",s.uhs?"UHS":""].filter(Boolean).join(" & ")}</span>`).join("")||'<span class="pill p-done">Not an approved supervisor</span>'}${credPill(c.pmdc).replace(">",">PMDC: ")}</div></div>
  <div class="actions"><a class="btn" href="#fac-${f.id}">Open profile</a></div></div></div>
 ${credIssues(f,c).length?`<div class="flag">${credIssues(f,c).map(i=>esc(i[1])).join("<br>")}</div>`:`<div class="flag ok">All credentials are current.</div>`}
 <div class="cols two">
  <div class="panel" style="display:grid;gap:12px"><h3 style="margin:0">1 · Supervisor approval</h3>
   <p class="subt" style="margin:0">Tick CPSP and/or UHS for each specialty this person is approved to supervise in.</p>
   ${crSupRows(f)}
   <label class="f">Approval date <span class="h">from the CPSP / UHS letter</span><input type="date" id="cr-appdate"></label>
   <label class="f">Reference / note <span class="h">optional</span><input id="cr-appnote" placeholder="e.g. CPSP letter no."></label>
   <div class="actions"><button class="btn primary" data-act="cr-sup">Save approval</button></div>
   <p class="code" style="margin:0">After approving, upload the supervisory certificate in section 2.</p></div>
  <div class="panel" id="cr-upload" style="display:grid;gap:12px"><h3 style="margin:0">2 · Upload certificate</h3>
   <label class="f">Certificate<select id="cr-type">${opt(CRED,UI.credType||(!f.cpsp&&!f.uhs?CRED[0]:f.cpsp&&c.cpsp!=="Certified"?CRED[1]:f.uhs&&c.uhs!=="Certified"?CRED[2]:CRED[0]))}</select></label>
   ${(()=>{const t0=UI.credType||(!f.cpsp&&!f.uhs?CRED[0]:f.cpsp&&c.cpsp!=="Certified"?CRED[1]:f.uhs&&c.uhs!=="Certified"?CRED[2]:CRED[0]);const mine=c.sp.map(s=>s.spec),rest=specNames().filter(s=>!mine.includes(s));
    const def=UI.credSpec&&[...mine,...rest].includes(UI.credSpec)?UI.credSpec:(c.sp.find(s=>(t0===CRED[1]&&s.cpsp&&s.cpsp!=="Certified")||(t0===CRED[2]&&s.uhs&&s.uhs!=="Certified"))||c.sp[0]).spec;
    return`<label class="f" id="cr-specwrap" ${t0===CRED[0]?"hidden":""}>Specialty this certificate is for<select id="cr-cspec"><optgroup label="Approved in">${opt(mine,def)}</optgroup>${rest.length?`<optgroup label="Other specialties">${opt(rest,def)}</optgroup>`:""}</select></label>`})()}
   <div class="grid2"><label class="f">Issued<input type="date" id="cr-issue"></label><label class="f">Expires<input type="date" id="cr-expiry"></label></div>
   <label class="f">File <span class="h">PDF or image, up to 5 MB</span><input type="file" id="cr-file" accept="image/*,application/pdf"></label>
   <div class="actions"><button class="btn primary" data-act="cr-cert">Upload certificate</button></div>
   <p class="code" style="margin:0">Older certificates are kept in the history. The newest one sets the status.</p></div>
 </div>
 <div class="panel" style="display:grid;gap:12px"><h3 style="margin:0">3 · Registration and contact details</h3>
  <div class="formgrid3">
   <label class="f">PMDC number<input id="cr-pmdc" value="${esc(f.pmdc)}"></label>
   <label class="f">Faculty registration no.<input id="cr-regno" value="${esc(f.regno)}"></label>
   <label class="f">Designation<select id="cr-desig">${opt(DESIG,f.desig)}</select></label>
   <label class="f">Department<select id="cr-spec">${opt(specNames(),f.spec)}</select></label>
   <label class="f">Unit<select id="cr-unit">${opt([["","None"],...DB.units],f.unit)}</select></label>
   <label class="f">Title<select id="cr-title">${opt(["Dr.","Prof. Dr."],f.title)}</select></label>
   <label class="f">Mobile<input id="cr-mobile" value="${esc(f.mobile||"")}" inputmode="numeric" placeholder="03xx-xxxxxxx"></label>
   <label class="f">Email<input id="cr-email" type="email" value="${esc(f.email||"")}"></label>
  </div>
  <div class="err" id="cr-err" role="alert"></div>
  <div class="actions"><button class="btn primary" data-act="cr-reg">Save details</button></div></div>
 <div class="panel flush"><h3>Certificate history · ${esc(facName(f))}</h3><div class="tblwrap"><table><thead><tr><th>Certificate</th><th>Issued</th><th>Expires</th><th>Status</th><th></th></tr></thead><tbody>
  ${hist.map(x=>`<tr><td>${esc(x.type)}${x.type!==CRED[0]?`<div class="subt">${esc(x.spec||f.spec)}</div>`:""}</td><td>${fd(x.issue)}</td><td>${fd(x.expiry)}</td><td>${x.expiry&&P(x.expiry)<TODAY?credPill("Expired"):x.expiry&&days(P(x.expiry),TODAY)<=DB.settings.cert_warn?credPill("Expiring Soon"):credPill("Certified")}</td><td>${certViewBtn(x)}<button class="btn link" data-del="cred" data-id="${x.id}">Delete</button></td></tr>`).join("")||`<tr><td colspan="5" class="empty">No certificates on file yet.</td></tr>`}</tbody></table></div></div>`:""}
 <div class="panel flush"><h3>Credential register · ${reg.length} need attention</h3><div class="tblwrap"><table><thead><tr><th>Faculty member</th><th>Department</th><th>Issue</th><th></th></tr></thead><tbody>
  ${reg.map(([x,is])=>`<tr><td>${esc(facName(x))}</td><td>${esc(x.spec)}</td><td class="wrapcell">${is.filter(i=>UI.credMute||i[0]!=="mute").map(i=>`<button class="pill pillbtn ${i[0]==="bad"?"p-bad":i[0]==="mute"?"p-done":"p-pause"}" style="margin:2px 4px 2px 0" data-act="cr-goto" data-id="${x.id}" data-type="${esc(credTypeOf(i[1]))}" data-spec="${esc(credSpecOf(i[1]))}" title="Open the upload form for this">${esc(i[1])} →</button>`).join("")}</td><td><button class="btn small" data-act="cr-goto" data-id="${x.id}" data-type="${esc(credTypeOf((is.find(i=>UI.credMute||i[0]!=="mute")||[0,""])[1]))}">Update</button></td></tr>`).join("")||`<tr><td colspan="4" class="empty">No expired or missing supervisor certificates.</td></tr>`}
 </tbody></table></div><p class="code" style="padding:0 16px 14px;margin:8px 0 0">${DB.faculty.filter(x=>facCur(x).pmdc==="Not Registered").length} faculty members have no PMDC faculty registration on file. <button class="btn link" data-act="cr-mute">${UI.credMute?"Hide them":"Show them in this list"}</button></p></div>`}
function credAction(a){const f=facById(UI.credFac);if(!f)return;
 if(a==="cr-sup"){const before=supSpecs(f),after=crReadSups(f),lab=L=>L.filter(s=>s.cpsp||s.uhs).map(s=>`${s.spec} (${[s.cpsp?"CPSP":"",s.uhs?"UHS":""].filter(Boolean).join(" & ")})`).join(", ")||"none";
  if(JSON.stringify(lab(before))===JSON.stringify(lab(after))){toast("No change to save");return}
  const ch=[`now approved in: ${lab(after)}`];f.sups=after;facSync(f);
  const dt=pick("cr-appdate"),nt=pick("cr-appnote");log(`Supervisor status of ${facName(f)}: ${ch.join(", ")}${dt?" from "+fd(dt):""}${nt?" ("+nt+")":""}`,"fac-"+f.id);toast("Supervisor approval saved");render();return}
 if(a==="cr-cert"){const i=pick("cr-issue"),e=pick("cr-expiry"),t=pick("cr-type"),cs=t===CRED[0]?"":pick("cr-cspec")||f.spec;if(!i){toast("Enter the issue date");return}if(e&&e<i){toast("Expiry is before the issue date");return}
  const fl=document.getElementById("cr-file").files[0];if(fl&&fl.size>5*1048576){toast("File is over 5 MB");return}
  if(fl&&LIVE&&!UI.credUp){const b=document.querySelector('[data-act="cr-cert"]');if(b){b.disabled=true;b.textContent="Uploading…"}UI.credUp=true;
   certUpload(f,fl).then(path=>{UI.credUp=path||"";credAction("cr-cert")}).catch(()=>{UI.credUp=false;toast("The file could not be uploaded. Try again.");render()});return}
  const path=typeof UI.credUp==="string"?UI.credUp:null;UI.credUp=false;
  DB.creds.push({id:uid("C"),fid:f.id,type:t,issue:i,expiry:e||null,file:!!fl,...(path?{path}:{}),...(cs?{spec:cs}:{})});
  if(cs){const L=supSpecs(f).map(s=>({...s}));let x=L.find(s=>s.spec===cs);if(!x){x={spec:cs,cpsp:false,uhs:false};L.push(x)}if(t===CRED[1])x.cpsp=true;if(t===CRED[2])x.uhs=true;f.sups=L;facSync(f)}
  log(`Uploaded ${t}${cs?" ("+cs+")":""} for ${facName(f)} (issued ${fd(i)}${e?", expires "+fd(e):""})`,"fac-"+f.id);toast("Certificate uploaded");render();return}
 if(a==="cr-reg"){const m=pick("cr-mobile");if(m&&!/^03\d{2}-?\d{7}$/.test(m)){document.getElementById("cr-err").textContent="Mobile must be 11 digits starting with 03.";return}
  const pm=pick("cr-pmdc");if(pm&&DB.faculty.some(x=>x!==f&&x.pmdc&&x.pmdc.toLowerCase()===pm.toLowerCase())){document.getElementById("cr-err").textContent="Another faculty member already has this PMDC number.";return}
  const before=JSON.stringify(f);Object.assign(f,{pmdc:pm,regno:pick("cr-regno"),desig:pick("cr-desig"),spec:pick("cr-spec"),unit:pick("cr-unit"),title:pick("cr-title"),mobile:m,email:pick("cr-email")});
  if(JSON.stringify(f)!==before){log(`Updated registration details of ${facName(f)}`,"fac-"+f.id);toast("Details saved")}else toast("No change to save");render()}}

/*__WS2__*/
/* =====================================================================
   SETTINGS (expanded)
   ===================================================================== */
const durText=s=>Object.entries(s.dur).filter(([,v])=>v).map(([k,v])=>`${k.replace("UHS ","")} ${v}`).join(" · ")||"—";
const ruleText=s=>s.rotational?`FCPS ${s.rule[0]} out → ${s.rule[1]} RIC · UHS ${s.rule[2]} RIC → ${s.rule[3]} out → ${s.rule[4]} RIC`:"Entire training at RIC";
function vSettings(){const S=DB.settings;const num=(k,l)=>`<label class="f">${l}<input type="number" min="0" data-setting="${k}" value="${S[k]??""}"></label>`;
 const A=verified().filter(p=>CUR.get(p.id).active);
 const secs=[["set-thr","Thresholds"],["set-spec","Specialties"],["set-sites","Rotation sites"],["set-lt","Leave types"],["set-exit","Reasons for leaving"],["set-units","Units"],["set-staff","DME team"]];
 return`<div class="head"><div><h2>Settings</h2><p>Replaces the Settings tab. Changes apply across the app immediately.</p></div></div>
 <div class="chips">${secs.map(([id,l])=>`<button class="chip" data-jump="${id}">${l}</button>`).join("")}</div>
 <div class="panel" id="set-thr"><h3>Alert thresholds</h3><div class="formgrid3">${num("return_red","Returning soon: red at ≤ days")}${num("return_yellow","Returning soon: amber at ≤ days")}${num("complete_red","Completing soon: red at ≤ days")}${num("complete_yellow","Completing soon: amber at ≤ days")}${num("leave_soon","Leave ending soon: ≤ days")}${num("leave_recent","Show ended leave for days")}${num("cert_warn","Certificate warning: ≤ days")}${num("overload","Supervisor overload: ≥ PGTs")}${num("proposal_weeks","Workshop proposal lead time: weeks")}${num("director_share","Workshop net income: course director share %")}</div><p class="code" style="margin:8px 0 0">The rest of a workshop's net income (now ${100-(S.director_share??60)}%) goes to the DME fund.</p></div>

 <div class="panel flush" id="set-spec"><div class="head" style="padding:14px 16px 0"><div><h3 style="margin:0">Specialties</h3><p class="code" style="margin:4px 0 0">Durations prefill the registration form. Rotation rules set expected rotation and return dates.</p></div><button class="btn primary small" data-act="spec-add">Add specialty</button></div>
  <div class="tblwrap" style="margin-top:10px"><table><thead><tr><th>Specialty</th><th>Programmes (years)</th><th>Rotation</th><th>Level · councils</th><th class="num">PGTs</th><th class="num">Faculty</th><th>Status</th><th></th></tr></thead><tbody>
  ${DB.specs.map((s,i)=>`<tr><td><b>${esc(s.name)}</b>${s.title?`<div class="code" style="white-space:normal">${esc(s.title)}</div>`:""}</td><td>${s.teaching?durText(s):'<span class="code">Faculty only</span>'}</td><td class="wrapcell">${s.teaching?ruleText(s):"—"}</td><td>${esc([s.level,s.councils].filter(Boolean).join(" · "))||"—"}</td>
   <td class="num">${A.filter(p=>p.spec===s.name).length}</td><td class="num">${DB.faculty.filter(f=>f.spec===s.name).length}</td><td><span class="pill ${s.active?"p-ric":"p-done"}">${s.active?"In use":"Retired"}</span></td><td><button class="btn small" data-act="spec-edit" data-i="${i}">Edit</button></td></tr>`).join("")}
  </tbody></table></div></div>

 <div class="cols two">
  <div class="panel flush" id="set-sites"><div class="head" style="padding:14px 16px 0"><h3 style="margin:0">Rotation sites</h3><button class="btn primary small" data-act="site-add">Add site</button></div>
   <div class="tblwrap" style="margin-top:10px"><table><thead><tr><th>Hospital</th><th>Code</th><th class="num">PGTs there now</th><th>Status</th><th></th></tr></thead><tbody>
   ${DB.sites.map((s,i)=>`<tr><td>${esc(s.name)}</td><td class="code">${esc(s.short)}</td><td class="num">${A.filter(p=>CUR.get(p.id).rotSite===s.short).length}</td><td><span class="pill ${s.active?"p-ric":"p-done"}">${s.active?"In use":"Retired"}</span></td><td><button class="btn link" data-act="site-edit" data-i="${i}">Edit</button><button class="btn link" data-act="site-toggle" data-i="${i}">${s.active?"Retire":"Restore"}</button></td></tr>`).join("")}
   </tbody></table></div></div>
  <div class="panel flush" id="set-lt"><div class="head" style="padding:14px 16px 0"><h3 style="margin:0">Leave types</h3><button class="btn primary small" data-act="lt-add">Add leave type</button></div>
   <div class="tblwrap" style="margin-top:10px"><table><thead><tr><th>Leave type</th><th class="num">Times used</th><th>Status</th><th></th></tr></thead><tbody>
   ${DB.leaveTypes.map((t,i)=>`<tr><td>${esc(t.name)}</td><td class="num">${DB.leaves.filter(l=>l.type===t.name).length}</td><td><span class="pill ${t.active?"p-ric":"p-done"}">${t.active?"In use":"Retired"}</span></td><td><button class="btn link" data-act="lt-edit" data-i="${i}">Rename</button><button class="btn link" data-act="lt-toggle" data-i="${i}">${t.active?"Retire":"Restore"}</button></td></tr>`).join("")}
   </tbody></table></div><p class="code" style="padding:0 16px 14px;margin:8px 0 0">Retired items stay on old records but are not offered for new entries.</p></div>
 </div>
 ${exitTypesPanel()}${contactImportPanel()}${updPanel()}${exrPanel()}${binPanel()}
 <div class="cols two">
  <div class="panel" id="set-units" style="display:grid;gap:10px"><h3 style="margin:0">Units</h3><div class="chips">${DB.units.map(u=>{const n=DB.faculty.filter(f=>f.unit===u).length;return`<span class="chip">${esc(u)}<span class="c">${n} faculty</span><button class="btn link" style="padding:0" data-act="unit-rm" data-v="${esc(u)}" aria-label="Remove ${esc(u)}">✕</button></span>`}).join("")}</div>
   <div class="toolbar"><input id="newunit" placeholder="e.g. Unit 5" aria-label="New unit"><button class="btn small" data-act="unit-add">Add unit</button></div></div>
  ${teamPanel()}
 </div>`}
function sheetSpec(s){const n=!s;s=s||{name:"",rotational:false,rule:[2,3,.5,1.5,3],dur:{},title:"",level:"",councils:"",teaching:true,active:true};
 const yr=k=>`<label class="f">${k}<input type="number" step="0.5" min="0" max="7" name="dur-${k}" value="${s.dur[k]??""}" placeholder="Not offered"></label>`;
 const rl=(i,l)=>`<label class="f">${l}<input type="number" step="0.5" min="0" name="rule-${i}" value="${s.rule[i]}"></label>`;
 openSheet(n?"Add specialty":`Edit · ${s.name}`,`
 <label class="f">Name <span class="h">as used in dropdowns</span><input name="name" value="${esc(s.name)}"></label>
 <label class="f">Official programme title <span class="h">optional</span><input name="title" value="${esc(s.title)}"></label>
 <div class="grid2"><label class="f">Level<select name="level">${opt([["","—"],"Level 3","Level 4"],s.level)}</select></label><label class="f">Councils<input name="councils" value="${esc(s.councils)}" placeholder="CPSP, UHS"></label></div>
 <label class="f">Trains PGTs?<select name="teaching">${opt([["1","Yes, appears in PGT registration"],["0","No, faculty only"]],s.teaching?"1":"0")}</select></label>
 <h3 style="margin:6px 0 0">Programme durations (years)</h3><p class="code" style="margin:-6px 0 0">Leave blank if the programme is not offered at RIC.</p>
 <div class="formgrid3">${yr("FCPS")}${yr("UHS (MS)")}${yr("UHS (MD)")}</div>
 <h3 style="margin:6px 0 0">Rotation</h3>
 <label class="f">Training pattern<select name="rotational">${opt([["0","Entire training at RIC"],["1","Rotational (part of training outside RIC)"]],s.rotational?"1":"0")}</select></label>
 <div class="grid2">${rl(0,"FCPS: years out first")}${rl(1,"FCPS: final years at RIC")}</div>
 <div class="formgrid3">${rl(2,"UHS: first years at RIC")}${rl(3,"UHS: years out")}${rl(4,"UHS: final years at RIC")}</div>
 <p class="code" style="margin:0">Rotation years are used only when the pattern is Rotational.</p>
 ${n?"":`<label class="f">Status<select name="active">${opt([["1","In use"],["0","Retired"]],s.active?"1":"0")}</select></label>`}`,()=>{
 const name=fv("name");if(name.length<3)return fail("Enter the specialty name.");if(DB.specs.some(x=>x!==s&&x.name.toLowerCase()===name.toLowerCase()))return fail("This specialty already exists.");
 const dur={};for(const k of ["FCPS","UHS (MS)","UHS (MD)"]){const v=fv("dur-"+k);if(v){if(+v<1||+v>7)return fail(`${k} duration must be 1 to 7 years.`);dur[k]=+v}}
 const teaching=fv("teaching")==="1";if(teaching&&!Object.keys(dur).length)return fail("Give at least one programme duration, or mark it faculty only.");
 const rule=[0,1,2,3,4].map(i=>+fv("rule-"+i)||0);
 const old=s.name;Object.assign(s,{name,title:fv("title"),level:fv("level"),councils:fv("councils"),teaching,dur,rotational:fv("rotational")==="1",rule,active:n?true:fv("active")==="1"});
 if(n){DB.specs.push(s);log(`Added specialty ${name}`)}else{if(old!==name){DB.pgts.forEach(p=>{if(p.spec===old)p.spec=name});DB.faculty.forEach(f=>{if(f.spec===old)f.spec=name});DB.workshops.forEach(w=>{if(w.dept===old)w.dept=name});log(`Renamed specialty ${old} to ${name}; records updated`)}else log(`Edited specialty ${name}`)}
 toast("Specialty saved");return true})}
function sheetSite(s){const n=!s;s=s||{name:"",short:"",active:true};openSheet(n?"Add rotation site":`Edit · ${s.name}`,`
 <label class="f">Hospital name<input name="name" value="${esc(s.name)}"></label><label class="f">Short code <span class="h">shown in lists, e.g. HFH</span><input name="short" value="${esc(s.short)}" maxlength="8"></label>`,()=>{
 const nm=fv("name"),sh=fv("short").toUpperCase();if(nm.length<3)return fail("Enter the hospital name.");if(!/^[A-Z0-9]{2,8}$/.test(sh))return fail("Code must be 2 to 8 letters or digits.");
 if(DB.sites.some(x=>x!==s&&x.short===sh))return fail("This code is already used.");const old=s.short;Object.assign(s,{name:nm,short:sh});if(n){DB.sites.push(s);log(`Added rotation site ${nm} (${sh})`)}else{if(old!==sh)DB.rots.forEach(r=>{if(r.site===old)r.site=sh});log(`Edited rotation site ${nm}`)}toast("Saved");return true})}
function sheetLt(t){const n=!t;openSheet(n?"Add leave type":`Rename · ${t.name}`,`<label class="f">Leave type<input name="name" value="${esc(t?.name||"")}" placeholder="e.g. Ex-Pakistan"></label>`,()=>{
 const nm=fv("name");if(nm.length<2)return fail("Enter a name.");if(DB.leaveTypes.some(x=>x!==t&&x.name.toLowerCase()===nm.toLowerCase()))return fail("This leave type exists.");
 if(n){DB.leaveTypes.push({name:nm,active:true});log(`Added leave type ${nm}`)}else{const old=t.name;t.name=nm;DB.leaves.forEach(l=>{if(l.type===old)l.type=nm});log(`Renamed leave type ${old} to ${nm}`)}toast("Saved");return true})}
function settingsAction(a,b){const i=+b.dataset.i;
 if(a==="spec-add")return sheetSpec();if(a==="spec-edit")return sheetSpec(DB.specs[i]);
 if(a==="site-add")return sheetSite();if(a==="site-edit")return sheetSite(DB.sites[i]);
 if(a==="site-toggle"){const s=DB.sites[i];s.active=!s.active;log(`${s.active?"Restored":"Retired"} rotation site ${s.name}`);render();return}
 if(a==="lt-add")return sheetLt();if(a==="lt-edit")return sheetLt(DB.leaveTypes[i]);
 if(a==="lt-toggle"){const t=DB.leaveTypes[i];t.active=!t.active;log(`${t.active?"Restored":"Retired"} leave type ${t.name}`);render();return}
 if(a==="unit-add"){const v=pick("newunit");if(v&&!DB.units.includes(v)){DB.units.push(v);log(`Added unit ${v}`);render()}return}
 if(a==="unit-rm"){const v=b.dataset.v,n=DB.faculty.filter(f=>f.unit===v).length;if(n){toast(`${n} faculty are in ${v}. Move them first.`);return}DB.units=DB.units.filter(u=>u!==v);log(`Removed unit ${v}`);render();return}
 if(a==="staff-add"||a==="staff-edit"){const st=a==="staff-edit"?DB.staff[i]:null;return openSheet(st?"Edit team member":"Add team member",`<label class="f">Name<input name="n" value="${esc(st?.name||"")}"></label><label class="f">Designation<input name="d" value="${esc(st?.desig||"")}" placeholder="e.g. Training Officer"></label><label class="f">Email <span class="h">used to sign in</span><input type="email" name="e" value="${esc(st?.email||"")}"></label>${st?.me?"":`<label class="f">Role<select name="r">${opt(["Editor","Viewer","Admin"],st?.role)}</select></label>`}`,()=>{
  const nm=fv("n");if(nm.length<3)return fail("Enter the name.");if(fv("e")&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fv("e")))return fail("Enter a valid email.");if(DB.staff.some(x=>x!==st&&x.name.toLowerCase()===nm.toLowerCase()))return fail("This person is already on the team.");
  if(st){const old=st.name;Object.assign(st,{name:nm,desig:fv("d"),email:fv("e")});if(!st.me)st.role=fv("r");if(old!==nm)DB.tasks.forEach(t=>{if(t.assignee===old)t.assignee=nm});log(`Edited team member ${nm}`)}
  else{DB.staff.push({name:nm,desig:fv("d"),email:fv("e"),role:fv("r")});log(`Added team member ${nm} (${fv("r")})`)}toast("Saved");return true})}
 if(a==="staff-rm"){const s=DB.staff[i],n=DB.tasks.filter(t=>t.assignee===s.name&&t.status!=="Done").length;if(n){toast(`${s.name} has ${n} open tasks. Reassign them first.`);return}if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Confirm";return}DB.staff.splice(i,1);log(`Removed team member ${s.name}`);render()}}
