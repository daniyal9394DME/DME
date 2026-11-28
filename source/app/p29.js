
/* =====================================================================
   V27 · TRAINING STATUS FORM: one QR code shown at the internal exam.
   Each PGT confirms who they are (PGT ID / roll number + mobile or CNIC)
   and reports: registration certificate (RTMC), ACLS and BLS, research
   stage. Answers land on the PGT's profile and in "Training status".
   ===================================================================== */
const SUR_REASONS=["Applied, certificate awaited","Registration in process with CPSP / UHS","Not applied yet","Certificate misplaced","Other"];
const SUR_LS=[["valid","Yes, certificate valid"],["expired","Yes, but it has expired"],["no","Not done"]];
const RES_KIND=[["diss","Dissertation (CPSP)"],["thesis","Thesis (UHS)"],["art","One research article (CPSP option)"]];
const RES_STEPS={
 diss:[["topic","Topic selected"],["syn","Synopsis written"],["erbSub","Synopsis submitted to the ERB"],["erbOk","ERB approval received"],["authSub","Synopsis submitted to CPSP (RTMC)"],["authOk","Synopsis approved by CPSP"],["data","Data collection started"],["dataDone","Data collection completed"],["write","Dissertation written"],["final","Dissertation submitted to CPSP"]],
 art:[["topic","Topic selected"],["erbSub","Submitted to the ERB"],["erbOk","ERB approval received"],["data","Data collection started"],["dataDone","Data collection completed"],["write","Manuscript written"],["final","Submitted to a journal"],["pub","Accepted / published"]]};
RES_STEPS.thesis=RES_STEPS.diss.map(([k,l])=>[k,l.replace("CPSP (RTMC)","UHS (ASRB)").replace(/CPSP/,"UHS").replace("Dissertation","Thesis")]);
const surUHS=p=>/UHS/i.test(p&&p.program||"");
const surRegLabel=()=>"CPSP RTMC registration certificate";
const surNoReg=p=>surUHS(p);/* UHS has no registration certificate */
const surSteps=s=>RES_STEPS[(s&&s.res&&s.res.kind)||"diss"]||RES_STEPS.diss;
function surStage(s){if(!s||!s.res)return null;const S=surSteps(s),st=s.res.steps||{};let last=-1;S.forEach(([k],i)=>{if(st[k])last=i});return last<0?{i:-1,l:"Not started",n:S.length}:{i:last,l:S[last][1],n:S.length}}
const surLS=x=>!x||!x.st?"—":x.st==="no"?"Not done":`${x.by==="AHA"?"AHA certified":x.by==="Local"?"Local (non-AHA)":"?"}${x.st==="expired"?", expired":""}${x.avail==="no"?", certificate not with them":""}`;
const surReg=s=>!s||!s.reg?"—":s.reg.have==="yes"?"Uploaded":(s.reg.reason||"Not available")+(s.reg.note?": "+s.reg.note:"");

/* ---------- the form (public page on the live app; #surform in the prototype) ---------- */
let SURPUB={who:null,code:"",key:"",cfg:null,inApp:false,list:null,sel:null,q:"",byId:false};
async function surPublicPage(){document.body.classList.add("public");surLoadList();
 try{const{data}=await SYNC.sb.rpc("dme_public_lists");SURPUB.cfg={...FORM_DEF.sur,...((data&&data.forms&&data.forms.sur)||{})}}catch(e){SURPUB.cfg={...FORM_DEF.sur}}
 surRender()}
function vSurForm(){SURPUB.inApp=true;surLoadList();SURPUB.cfg=formCfg("sur");setTimeout(()=>surRender(),0);return`<div id="surhost"></div>`}
const surShell=h=>{if(SURPUB.inApp){const x=document.getElementById("surhost");if(x)x.innerHTML=`<div class="flag info">Prototype preview of the form PGTs open from the QR code. Any 11-digit number works here; on the live app the mobile number or CNIC must match the PGT's record.</div>`+h;return}pubShell(h)};
async function surApi(fn,args){
 if(LIVE){const r=await SYNC.sb.rpc(fn,args);if(r.error)throw r.error;return r.data}
 const dg=s=>String(s||"").replace(/\D/g,""),p=DB.pgts.find(x=>x.reg==="Verified"&&dg(x.code)&&dg(x.code)===dg(args.p_code));
 if(!formIsOpen(formCfg("sur")))return{error:"closed"};if(!p||dg(args.p_key).length<10)return{error:"not_found"};
 if(fn==="dme_sur_who")return{ok:true,name:p.name,spec:p.spec,program:p.program,code:p.code,survey:p.survey||null};
 const s={...args.p};delete s.files;s.at=new Date().toISOString();if(p.survey)p.surveyHist=[p.survey,...(p.surveyHist||[])].slice(0,5);p.survey=s;log(`Training status form submitted by Dr. ${p.name}`,"pgt-"+p.id);return{ok:true,name:p.name}}
function surRender(done,err){const C=SURPUB.cfg||FORM_DEF.sur,head=formHead(null,"Training status","Postgraduate trainees · Department of Medical Education and Training");
 if(done)return surShell(`<div class="panel fbform">${head}<div class="flag ok" style="display:grid;gap:6px;text-align:center;padding:22px"><b style="font-size:21px">Thank you, Dr. ${esc(done.name)}</b><span>Your training status is recorded with the DME&T office. You can open the form again to update it at any time.</span></div></div>`);
 if(!formIsOpen(C))return surShell(`<div class="panel fbform">${head}<p>This form is closed at the moment.</p>${C.msg?`<p style="white-space:pre-line">${esc(C.msg)}</p>`:""}${C.contact?`<p class="subt">Contact: ${esc(C.contact)}</p>`:""}</div>`);
 const W=SURPUB.who;
 if(!W)return surShell(`<form class="panel fbform" id="surid" novalidate>${head}${C.msg?`<div class="flag info" style="white-space:pre-line">${esc(C.msg)}</div>`:""}
  ${surPickHtml()}
  <label class="f"><span class="req">Your mobile number or CNIC</span><input name="key" inputmode="numeric" placeholder="03xx-xxxxxxx or 37405-xxxxxxx-x" value="${esc(SURPUB.key)}" style="font-size:18px"></label>
  <p class="qd" style="margin:0">The mobile number or CNIC the DME&T office has on record.</p>
  <div class="err" id="surerr" role="alert">${err?esc(err):""}</div><button class="btn primary" type="button" data-act="sur-who" style="justify-self:start;font-size:17px;padding:11px 22px">Continue</button>${C.contact?`<p class="subt" style="margin:0">Questions? ${esc(C.contact)}</p>`:""}</form>`);
 const s=W.survey||{},R=s.reg||{},res=s.res||{kind:surUHS(W)?"thesis":"diss",steps:{}},rad=(n,o,v)=>`<div class="chips srad">${o.map(([k,l])=>`<label class="chip"><input type="radio" name="${n}" value="${k}" ${v===k?"checked":""}> ${l}</label>`).join("")}</div>`;
 const N0=surNoReg(W)?0:1;
 const ls=(k,l,no)=>{const x=s[k]||{};return`<fieldset class="pfsec"><legend>${no} · ${l}</legend><div class="f"><span class="req">Have you done ${l}?</span>${rad(k+"_st",SUR_LS,x.st)}</div>
  <div data-if="${k}_st=valid|expired" style="display:grid;gap:10px"><div class="f"><span class="req">Is your ${l} AHA certified?</span>${rad(k+"_by",[["AHA","Yes, AHA certified"],["Local","No, local / non-AHA"]],x.by)}</div>
   <div class="f"><span class="req">Is the certificate available with you?</span>${rad(k+"_av",[["yes","Yes"],["no","No"]],x.avail)}</div>
   <label class="f"><span>Month of the course <span class="h">optional</span></span><input type="month" name="${k}_date" value="${esc(x.date||"")}"></label>
   <label class="f" data-if="${k}_av=yes"><span>Upload the certificate / card <span class="h">optional: photo or PDF</span></span><input type="file" name="${k}_file" accept="image/jpeg,image/png,image/webp,application/pdf"></label></div></fieldset>`};
 surShell(`<form class="panel fbform" id="surform" novalidate>${head}
  <div class="flag" style="display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap"><span><b>Dr. ${esc(W.name)}</b><br><span class="subt">${esc(W.code||"")} · ${esc(W.spec||"")} · ${esc(W.program||"")}</span></span><button type="button" class="btn small" data-act="sur-notme">Not you?</button></div>
  ${s.at?`<p class="subt" style="margin:0">You sent this form on ${fdt(s.at)}. Your answers are filled in; change anything that has moved on.</p>`:""}
  ${surNoReg(W)?"":`<fieldset class="pfsec"><legend>1 · RTMC registration certificate</legend><div class="f"><span class="req">Do you have your ${surRegLabel(W)}?</span>${rad("reg_have",[["yes","Yes"],["no","No, not available"]],R.have)}</div>
   <label class="f" data-if="reg_have=yes"><span class="${R.have==="yes"&&R.file?"":"req"}">Upload it${R.have==="yes"&&R.file?' <span class="h">already uploaded; upload again only to replace it</span>':""}</span><input type="file" name="reg_file" accept="image/jpeg,image/png,image/webp,application/pdf"></label>
   <div data-if="reg_have=no" style="display:grid;gap:10px"><label class="f"><span class="req">Why is it not available?</span><select name="reg_reason">${opt(["",...SUR_REASONS],R.reason||"")}</select></label>
    <label class="f"><span>Details <span class="h">required for "Other"; e.g. date you applied</span></span><input name="reg_note" value="${esc(R.note||"")}"></label></div></fieldset>`}
  ${ls("acls","ACLS",N0+1)}${ls("bls","BLS",N0+2)}
  <fieldset class="pfsec"><legend>${N0+3} · Research</legend><label class="f"><span class="req">Research requirement</span><select name="res_kind" id="sur-kind">${opt(RES_KIND.filter(([k])=>surUHS(W)?k==="thesis":k!=="thesis"),res.kind)}</select></label>
   <label class="f"><span>Topic <span class="h">if selected</span></span><input name="res_topic" value="${esc(res.topic||"")}" placeholder="Title of your synopsis / research"></label>
   <div class="f"><span class="req">Tick every step you have completed</span><div id="sur-steps">${surStepsHtml(res.kind,res.steps||{})}</div></div>
   <label class="f"><span>Anything holding up your research? <span class="h">optional</span></span><textarea name="res_note" rows="2">${esc(res.note||"")}</textarea></label></fieldset>
  <p class="qd" style="margin:0">Photos or PDFs, up to 5 MB each.</p>
  <div class="err" id="surerr" role="alert">${err?esc(err):""}</div><button class="btn primary" type="button" data-act="sur-go" style="justify-self:start;font-size:17px;padding:11px 22px">Submit</button></form>`);
 surIf()}
/* searchable list of names, so a PGT finds themselves in two taps */
async function surLoadList(){if(SURPUB.list)return;try{const r=LIVE?(await SYNC.sb.rpc("dme_sur_list")).data:{list:surPop().filter(p=>p.code).map(p=>({n:p.name,s:p.spec,c:p.code}))};if(r&&r.list){SURPUB.list=r.list;if(document.getElementById("surid")&&!SURPUB.who)surRender()}}catch(e){}}
const surNorm=t=>String(t||"").toLowerCase().replace(/^dr\.?\s*/,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
function surHits(q){const w=surNorm(q).split(" ").filter(Boolean);if(!w.length||!SURPUB.list)return[];
 return SURPUB.list.filter(x=>{const h=surNorm(x.n+" "+x.s+" "+x.c);const W=h.split(" ");return w.every(t=>W.some(z=>z.startsWith(t)))}).slice(0,8)}
function surHitsHtml(q){const H=surHits(q);if(!surNorm(q))return`<p class="qd" style="margin:4px 0 0">Type the first few letters of your name.</p>`;
 return H.length?H.map(x=>`<button type="button" class="surhit" data-surpick="${esc(x.c)}"><b>Dr. ${esc(x.n)}</b><span>${esc(x.s)} · ${esc(x.c)}</span></button>`).join(""):`<p class="qd" style="margin:4px 0 0">No match. Try another spelling, or <button type="button" class="btn link" data-act="sur-byid" style="padding:0">use your PGT ID</button>.</p>`}
function surPickHtml(){const S=SURPUB.sel;
 if(S)return`<div class="f"><span class="req">Your name</span><div class="flag" style="display:flex;gap:10px;justify-content:space-between;align-items:center"><span><b>Dr. ${esc(S.n)}</b><br><span class="subt">${esc(S.s)} · ${esc(S.c)}</span></span><button type="button" class="btn small" data-act="sur-unpick">Change</button></div></div>`;
 if(SURPUB.byId||!SURPUB.list)return`<label class="f"><span class="req">PGT ID or exam roll number</span><input name="code" inputmode="numeric" placeholder="e.g. PGT/24/1/06 or 24106" value="${esc(SURPUB.code)}" style="font-size:18px"></label>${SURPUB.list?`<button type="button" class="btn link" data-act="sur-byname" style="justify-self:start;padding:0">Search by name instead</button>`:""}`;
 return`<div class="f"><span class="req">Your name</span><input id="sur-q" type="search" autocomplete="off" placeholder="Search your name…" value="${esc(SURPUB.q||"")}" style="font-size:18px" aria-controls="sur-hits"><div id="sur-hits" class="surhits" role="listbox">${surHitsHtml(SURPUB.q||"")}</div></div>`}
document.addEventListener("input",e=>{if(e.target.id!=="sur-q")return;SURPUB.q=e.target.value;const h=document.getElementById("sur-hits");if(h)h.innerHTML=surHitsHtml(SURPUB.q)});
document.addEventListener("click",e=>{const p=e.target.closest("[data-surpick]");const a=e.target.closest('[data-act="sur-unpick"],[data-act="sur-byid"],[data-act="sur-byname"]');if(!p&&!a)return;
 const keep=document.querySelector('#surid [name="key"]');if(keep)SURPUB.key=keep.value;
 if(p){SURPUB.sel=(SURPUB.list||[]).find(x=>x.c===p.dataset.surpick)||null;surRender();setTimeout(()=>document.querySelector('#surid [name="key"]')?.focus(),50);return}
 const k=a.dataset.act;if(k==="sur-unpick"){SURPUB.sel=null;SURPUB.q=""}if(k==="sur-byid"){SURPUB.byId=true;SURPUB.sel=null}if(k==="sur-byname")SURPUB.byId=false;surRender();if(k!=="sur-byid")setTimeout(()=>document.getElementById("sur-q")?.focus(),50)});
function surStepsHtml(kind,st){return`<div class="surst">${(RES_STEPS[kind]||RES_STEPS.diss).map(([k,l],i)=>`<label class="check2"><input type="checkbox" name="st_${k}" ${st[k]?"checked":""}> <span><span class="subt">${i+1}.</span> ${l}</span><input type="month" name="sd_${k}" value="${esc(typeof st[k]==="string"?st[k]:"")}" aria-label="Month: ${l}" title="Month (optional)" ${st[k]?"":"hidden"}></label>`).join("")}</div>`}
function surIf(){const fm=document.getElementById("surform");if(!fm)return;const val=n=>{const r=fm.querySelector(`[name="${n}"]:checked`);return r?r.value:""};
 fm.querySelectorAll("[data-if]").forEach(el=>{const[n,v]=el.dataset.if.split("=");el.hidden=!v.split("|").includes(val(n))});
 fm.querySelectorAll('#sur-steps input[type=checkbox]').forEach(c=>{const m=c.parentElement.querySelector('input[type=month]');if(m)m.hidden=!c.checked})}
document.addEventListener("change",e=>{if(!e.target.closest("#surform"))return;if(e.target.id==="sur-kind"){const fm=document.getElementById("surform"),st={};fm.querySelectorAll('#sur-steps input[type=checkbox]').forEach(c=>{if(c.checked)st[c.name.slice(3)]=true});document.getElementById("sur-steps").innerHTML=surStepsHtml(e.target.value,st)}surIf()});
document.addEventListener("click",async e=>{const b=e.target.closest('[data-act="sur-who"],[data-act="sur-go"],[data-act="sur-notme"]');if(!b||!document.getElementById(b.dataset.act==="sur-who"?"surid":"surform"))return;
 if(b.dataset.act==="sur-notme"){SURPUB.who=null;SURPUB.key="";SURPUB.sel=null;SURPUB.q="";return surRender()}
 const er=t=>{document.getElementById("surerr").textContent=t};
 if(b.dataset.act==="sur-who"){const fm=document.getElementById("surid"),code=SURPUB.sel?SURPUB.sel.c:(fm.code?fm.code.value.trim():""),key=fm.key.value.trim();
  if(code.replace(/\D/g,"").length<4)return er(SURPUB.byId||!SURPUB.list?"Enter your PGT ID (e.g. PGT/24/1/06) or exam roll number.":"Search for your name and tap it.");if(key.replace(/\D/g,"").length<10)return er("Enter your 11-digit mobile number or 13-digit CNIC.");
  b.disabled=true;b.textContent="Checking…";let r=null;try{r=await surApi("dme_sur_who",{p_code:code,p_key:key})}catch(x){}
  SURPUB.code=code;SURPUB.key=key;if(r&&r.ok){SURPUB.who=r;return surRender()}
  return surRender(null,!r?"Could not connect. Check the internet and try again.":r.error==="closed"?"The form has just closed.":(SURPUB.sel?"This mobile number or CNIC does not match our record for Dr. "+SURPUB.sel.n+". Use the mobile number":"We could not match these details. Check your PGT ID and use the mobile number")+" you gave the DME&T office, or try your CNIC. If it still does not work, see the DME&T desk.")}
 const fm=document.getElementById("surform"),g=n=>(fm.querySelector(`[name="${n}"]`)?.value||"").trim(),rv=n=>fm.querySelector(`[name="${n}"]:checked`)?.value||"",fl=n=>fm.querySelector(`[name="${n}"]`)?.files?.[0]||null;
 const prev=SURPUB.who.survey||{},files={};
 let reg=null;if(!surNoReg(SURPUB.who)){reg={have:rv("reg_have")};if(!reg.have)return er("Answer question 1: do you have your RTMC registration certificate?");
 if(reg.have==="yes"){if(fl("reg_file"))files.rtmc=fl("reg_file");else if(!(prev.reg&&prev.reg.have==="yes"&&prev.reg.file))return er("Upload your registration certificate, or choose “No, not available”.");else reg.file=prev.reg.file}
 else{reg.reason=g("reg_reason");reg.note=g("reg_note");if(!reg.reason)return er("Tell us why the registration certificate is not available.");if(reg.reason==="Other"&&reg.note.length<3)return er("Write the reason in “Details”.")}}
 const L={};for(const[k,l]of[["acls","ACLS"],["bls","BLS"]]){const x={st:rv(k+"_st")};if(!x.st)return er(`Answer the ${l} question.`);
  if(x.st!=="no"){x.by=rv(k+"_by");x.avail=rv(k+"_av");x.date=g(k+"_date");if(!x.by)return er(`Is your ${l} AHA certified?`);if(!x.avail)return er(`Is your ${l} certificate available with you?`);
   if(x.avail==="yes"&&fl(k+"_file"))files[k]=fl(k+"_file");else if(prev[k]&&prev[k].file&&x.avail==="yes")x.file=prev[k].file}L[k]=x}
 const kind=g("res_kind"),steps={};(RES_STEPS[kind]||[]).forEach(([k])=>{if(fm.querySelector(`[name="st_${k}"]`)?.checked)steps[k]=g("sd_"+k)||true});
 const res={kind,topic:g("res_topic"),steps,note:g("res_note")};if((steps.syn||steps.erbSub||steps.data)&&!res.topic)return er("Enter your research topic.");
 for(const f of Object.values(files))if(f.size>5*1024*1024)return er(`“${f.name}” is larger than 5 MB. Take a smaller photo.`);
 b.disabled=true;b.textContent="Sending…";
 try{const paths={};if(LIVE){const base=`pgt/sur-${Date.now()}-${Math.random().toString(36).slice(2,7)}/`;
   for(const[k,f]of Object.entries(files)){const p=base+k+"."+((f.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg");const{error}=await SYNC.sb.storage.from("dme-uploads").upload(p,f,{contentType:f.type||undefined});if(error)throw new Error("upload");paths[k]=p}}
  else Object.keys(files).forEach(k=>paths[k]="(prototype) "+files[k].name);
  if(paths.rtmc&&reg)reg.file=paths.rtmc;if(paths.acls)L.acls.file=paths.acls;if(paths.bls)L.bls.file=paths.bls;
  const r=await surApi("dme_submit_sur",{p_code:SURPUB.code,p_key:SURPUB.key,p:{reg,acls:L.acls,bls:L.bls,res,files:LIVE?paths:{}}});
  if(r&&r.ok){SURPUB.who=null;SURPUB.key="";SURPUB.sel=null;SURPUB.q="";if(!LIVE)persist();return surRender(r)}
  b.disabled=false;b.textContent="Submit";er(r&&r.error==="closed"?"The form has just closed.":"Could not save. Try again.")}
 catch(x){b.disabled=false;b.textContent="Submit";er(x.message==="upload"?"A file could not be uploaded. Try again, or submit without it.":"Could not send. Check the connection and try again.")}});

/* ---------- office view: who has answered, and what ---------- */
UI.surSp="";UI.surMiss=false;
const surPop=()=>verified().filter(p=>CUR.get(p.id).active).sort((a,b)=>specIdx(a.spec)-specIdx(b.spec)||a.name.localeCompare(b.name));
function vStatus(){const A=surPop(),done=A.filter(p=>p.survey),sp=UI.surSp;let L=A.filter(p=>(!sp||p.spec===sp)&&(!UI.surMiss||!p.survey));
 const cnt=(f)=>done.filter(f).length,pc=n=>done.length?Math.round(n/done.length*100)+"%":"—";
 const tile=(n,l,s)=>`<div><b>${n}</b><span>${l}</span>${s?`<small class="subt">${s}</small>`:""}</div>`;
 const stages={};done.forEach(p=>{const st=surStage(p.survey);const k=st?st.l:"—";stages[k]=(stages[k]||0)+1});
 const yr=p=>CUR.get(p.id).year;
 return`<div class="head"><div><h2>Training status</h2><p>Registration certificate, ACLS / BLS and research stage, as reported by each PGT through the training status form. Show the QR code at the internal exam so everyone fills it in at once.</p></div><div class="actions">${xbtn("status")}${!LIVE?`<a class="btn" href="#surform">Try the form</a>`:""}</div></div>
 ${regLinkPanel("sur")}
 <div class="panel"><div class="surstat">
  ${tile(`${done.length} / ${A.length}`,"PGTs have answered",A.length?Math.round(done.length/A.length*100)+"% of active PGTs":"")}
  ${tile(cnt(p=>p.survey.reg&&p.survey.reg.have==="yes"),"RTMC certificate uploaded",cnt(p=>p.survey.reg&&p.survey.reg.have==="no")+" CPSP trainees without")}
  ${tile(cnt(p=>p.survey.acls&&p.survey.acls.st==="valid"),"ACLS valid",`${cnt(p=>p.survey.acls&&p.survey.acls.st==="valid"&&p.survey.acls.by==="AHA")} AHA certified · ${cnt(p=>p.survey.acls&&p.survey.acls.st==="no")} not done`)}
  ${tile(cnt(p=>p.survey.bls&&p.survey.bls.st==="valid"),"BLS valid",`${cnt(p=>p.survey.bls&&p.survey.bls.st==="valid"&&p.survey.bls.by==="AHA")} AHA certified · ${cnt(p=>p.survey.bls&&p.survey.bls.st==="no")} not done`)}
  ${tile(cnt(p=>(surStage(p.survey)||{}).i>=surSteps(p.survey).findIndex(x=>x[0]==="data")),"Research: data collection started or beyond",pc(cnt(p=>(surStage(p.survey)||{}).i>=surSteps(p.survey).findIndex(x=>x[0]==="data"))))}
 </div>${done.length?`<div class="chips" style="margin-top:12px">${Object.entries(stages).map(([k,v])=>`<span class="chip" aria-pressed="false">${esc(k)}<span class="c">${v}</span></span>`).join("")}</div><p class="subt" style="margin:6px 0 0">Research stage: the furthest step each PGT has ticked.</p>`:""}</div>
 <div class="panel flush"><div class="toolbar" style="padding:12px 16px"><select id="sur-sp" aria-label="Specialty">${opt([["","All specialties"],...[...new Set(A.map(p=>p.spec))].map(s=>[s,s])],sp)}</select><label class="subt" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="sur-miss" ${UI.surMiss?"checked":""}> Not answered yet only</label><span class="subt">${L.length} PGTs</span></div>
 <div class="tblwrap"><table><thead><tr><th>PGT</th><th>Specialty</th><th class="num">Year</th><th>Answered</th><th>RTMC certificate</th><th>ACLS</th><th>BLS</th><th>Research stage</th></tr></thead><tbody>
 ${L.map(p=>{const s=p.survey,st=surStage(s);return`<tr class="click" data-href="pgt-${p.id}"><td>${pgtName(p)}<div class="code">${esc(p.code||"")}</div></td><td>${esc(p.spec)}<div class="subt">${esc(p.program)}</div></td><td class="num">${yr(p)??"—"}</td>
  <td>${s?fd(s.at.slice(0,10)):'<span class="pill p-pause">Not yet</span>'}</td><td class="wrapcell">${surNoReg(p)?'<span class="subt">Not applicable (UHS)</span>':s?(s.reg&&s.reg.have==="yes"?'<span class="pill p-ric">Uploaded</span>':`<span class="pill p-bad">No</span> <span class="subt">${esc(surReg(s))}</span>`):"—"}</td>
  <td>${s?esc(surLS(s.acls)):"—"}</td><td>${s?esc(surLS(s.bls)):"—"}</td><td class="wrapcell">${st?`${st.i+1>0?`<b>${st.i+1}/${st.n}</b> `:""}${esc(st.l)}${s.res.topic?`<div class="subt">${esc(s.res.topic.slice(0,80))}</div>`:""}`:"—"}</td></tr>`}).join("")||`<tr><td colspan="8" class="empty">No PGTs.</td></tr>`}
 </tbody></table></div></div>`}
document.addEventListener("change",e=>{if(e.target.id==="sur-sp"){UI.surSp=e.target.value;render()}if(e.target.id==="sur-miss"){UI.surMiss=e.target.checked;render()}});
EXPORTS.status=()=>({file:"RIC PGT training status",sheets:[sheetFrom("Training status",surPop().map(p=>{const s=p.survey||{},st=surStage(p.survey),R=s.res||{};const row={"PGT ID":p.code||"","Name":"Dr. "+p.name,"Specialty":p.spec,"Programme":p.program,"Year":CUR.get(p.id).year??"","Answered on":s.at?s.at.slice(0,10):"",
  "RTMC certificate":surNoReg(p)?"Not applicable (UHS)":s.reg?(s.reg.have==="yes"?"Uploaded":"Not available"):"","Reason not available":s.reg&&s.reg.have==="no"?[s.reg.reason,s.reg.note].filter(Boolean).join(": "):"",
  "ACLS":s.acls?SUR_LS.find(x=>x[0]===s.acls.st)?.[1]||"":"","ACLS AHA certified":s.acls&&s.acls.by?(s.acls.by==="AHA"?"Yes":"No (local)"):"","ACLS certificate with them":s.acls&&s.acls.avail||"","ACLS month":s.acls&&s.acls.date||"",
  "BLS":s.bls?SUR_LS.find(x=>x[0]===s.bls.st)?.[1]||"":"","BLS AHA certified":s.bls&&s.bls.by?(s.bls.by==="AHA"?"Yes":"No (local)"):"","BLS certificate with them":s.bls&&s.bls.avail||"","BLS month":s.bls&&s.bls.date||"",
  "Research":R.kind?RES_KIND.find(x=>x[0]===R.kind)?.[1]||"":"","Topic":R.topic||"","Research stage":st?st.l:""};
  (RES_STEPS.diss.concat(RES_STEPS.art.filter(x=>!RES_STEPS.diss.some(y=>y[0]===x[0])))).forEach(([k,l])=>{const v=R.steps&&R.steps[k];row[l.replace(/ \(.*\)/,"").replace(/CPSP|UHS/,"college")]=v?(v===true?"Yes":v):""});row["Research notes"]=R.note||"";return row}))]});

/* ---------- on the PGT's profile ---------- */
function surDoc(p,k){const path=p.docs&&p.docs[k];return path&&/^pgt\//.test(path)?` <button class="btn link" data-act="doc-open" data-path="${esc(path)}" style="padding:0 4px">View</button>`:""}
function surProfile(p){const s=p.survey;if(!s||!canSee("pgts"))return"";const st=surStage(s),R=s.res||{},S=surSteps(s);
 return`<div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Training status</h3><span class="subt">From the training status form, ${fdt(s.at)}</span></div>
 <div class="cols two"><dl class="kv">${surNoReg(p)?"":`<dt>RTMC certificate</dt><dd>${s.reg&&s.reg.have==="yes"?`<span class="pill p-ric">Uploaded</span>${surDoc(p,"rtmc")}`:`<span class="pill p-bad">Not available</span><div class="subt">${esc(surReg(s))}</div>`}</dd>`}
  <dt>ACLS</dt><dd>${esc(surLS(s.acls))}${surDoc(p,"acls")}${s.acls&&s.acls.date?` <span class="subt">· ${mLabel(s.acls.date)}</span>`:""}</dd><dt>BLS</dt><dd>${esc(surLS(s.bls))}${surDoc(p,"bls")}${s.bls&&s.bls.date?` <span class="subt">· ${mLabel(s.bls.date)}</span>`:""}</dd>
  <dt>Research</dt><dd>${esc(RES_KIND.find(x=>x[0]===R.kind)?.[1]||"—")}${R.topic?`<div><i>${esc(R.topic)}</i></div>`:""}</dd>${R.note?`<dt>Holding it up</dt><dd>${esc(R.note)}</dd>`:""}</dl>
  <ol class="surtrack">${S.map(([k,l],i)=>{const v=R.steps&&R.steps[k];return`<li class="${v?"done":i===st.i+1?"next":""}">${l}${typeof v==="string"?` <span class="subt">${mLabel(v)}</span>`:""}</li>`}).join("")}</ol></div></div>`}
{const _x=pgtExamPanel;pgtExamPanel=function(p){return surProfile(p)+_x(p)}}
DOC_L.push(["rtmc","RTMC certificate"],["acls","ACLS certificate"],["bls","BLS certificate"]);
if(typeof NAV_ICON==="object"&&typeof _ic==="function")NAV_ICON.status=_ic('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5h6v3H9z"/><path d="m8.5 13 2.2 2.2 4.8-4.8"/>');
