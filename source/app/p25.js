
/* =====================================================================
   V23 · (1) faculty certificate files stored and viewable,
   (2) bio-data links for PGTs already in the register,
   (3) workshop check-in by QR code
   ===================================================================== */

/* ---------- 1. certificate files ---------- */
async function certUpload(f,file){const ext=(file.name.split(".").pop()||"pdf").toLowerCase().replace(/[^a-z0-9]/g,"")||"pdf";
 const path=`faculty/${f.id}/${Date.now()}-${Math.random().toString(36).slice(2,7)}.${ext}`;
 const{error}=await SYNC.sb.storage.from("dme-uploads").upload(path,file,{contentType:file.type||undefined});if(error)throw error;return path}
const certViewBtn=x=>x.path?`<button class="btn link" data-act="doc-open" data-path="${esc(x.path)}">View</button> `:"";

/* ---------- 2. bio-data links ---------- */
const newToken=()=>{const a=new Uint8Array(18);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(36).padStart(2,"0")).join("").slice(0,24)};
const bioLink=p=>(LIVE?pubBase():"https://dme.ric.example/")+"?bio="+p.bioToken;
function ensureBioToken(p){if(!p.bioToken){p.bioToken=newToken();p.bioSent=iso(TODAY)}return p.bioToken}
const BIO_MSG="Dear {name},\nThe DME office, Rawalpindi Institute of Cardiology, needs your bio data for our records. Please fill in the form at this link (about 5 minutes; keep your CNIC and bank details ready):\n{biolink}\nAt the end you can download your filled bio data form as a PDF. Please print it, sign it and hand it to the DME office.\nThis link is personal to you; please do not share it.\nDME Office, RIC";
{const _rp=recPgt;recPgt=function(p){const r=_rp(p);if(p.bioToken)r.vars.biolink=bioLink(p);return r}}
const bioStat=()=>{const A=verified().filter(p=>CUR.get(p.id)?.active);return{A,have:A.filter(p=>bioHas(p.bio)),sent:A.filter(p=>!bioHas(p.bio)&&p.bioToken),none:A.filter(p=>!bioHas(p.bio)&&!p.bioToken)}};
function bioCampaignPanel(){if(isViewer())return"";const s=bioStat();if(!s.A.length)return"";
 return`<div class="panel" style="display:grid;gap:8px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><div><h3 style="margin:0">Bio data</h3><p class="subt" style="margin:4px 0 0">${s.have.length} of ${s.A.length} active trainees have bio data on file · ${s.sent.length} link${s.sent.length===1?"":"s"} sent, not yet filled · ${s.none.length} not sent</p></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">${s.none.length+s.sent.length?`<button class="btn primary small" data-act="bio-bulk">WhatsApp the link to ${s.none.length+s.sent.length} trainee${s.none.length+s.sent.length>1?"s":""}</button>`:""}${xbtn("biolinks","Download links (Excel)")}</div></div>
  ${s.sent.length?`<p class="subt" style="margin:0">Not filled yet: ${s.sent.slice(0,8).map(p=>`<a href="#pgt-${p.id}">Dr. ${esc(p.name)}</a>`).join(", ")}${s.sent.length>8?` and ${s.sent.length-8} more`:""}</p>`:""}</div>`}
{const _vdc=vDataCheck;vDataCheck=function(){const h=_vdc(),i=h.indexOf("</div></div>")+12;return h.slice(0,i)+bioCampaignPanel()+h.slice(i)}}
EXPORTS.biolinks=()=>{const s=bioStat();[...s.none,...s.sent].forEach(ensureBioToken);persist();return{file:"Bio data links",sheets:[sheetFrom("Links",[...s.none,...s.sent].map(p=>({"PGT ID":p.code,"Name":"Dr. "+p.name,"Specialty":p.spec,"Mobile":p.mobile||"","Link":bioLink(p)})))]}};
/* the Bio data panel on each trainee's profile gets a "send link" button */
{const _bp=bioPanel;bioPanel=function(p){const h=_bp(p);if(!h||isViewer())return h;return h.replace('<div style="display:flex;gap:6px;flex-wrap:wrap">',`<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn small" data-act="bio-link" data-id="${p.id}">${p.bioToken?"Send the link again":bioHas(p.bio)?"Send link to update":"Send link to fill in"}</button>`)+(p.bioToken?`<p class="subt" style="margin:8px 0 0">Link sent ${p.bioSent?fd(p.bioSent):""}; not filled in yet.</p>`:p.bioAt?`<p class="subt" style="margin:8px 0 0">Filled in by the trainee on ${fd(p.bioAt.slice(0,10))}.</p>`:"")}}
document.addEventListener("click",e=>{const a=e.target.closest('[data-act="bio-link"],[data-act="bio-bulk"]');if(!a)return;
 if(a.dataset.act==="bio-link"){const p=DB.pgts.find(x=>x.id===a.dataset.id);if(!p)return;ensureBioToken(p);log(`Bio data link sent to Dr. ${p.name}`,"pgt-"+p.id);persist();
  const r=recPgt(p),n=waNum(p.mobile||p.mobile2);if(!n){copyText(bioLink(p),a);toast("No mobile number on file. The link is copied; send it another way.");render();return}
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(msgFill(BIO_MSG,r))}`,"_blank","noopener");render();return}
 const s=bioStat(),L=[...s.none,...s.sent];L.forEach(ensureBioToken);log(`Bio data links prepared for ${L.length} trainees`);persist();
 UI.msg={recs:[],text:BIO_MSG,sent:{},src:"bio"};msgAdd(L.map(recPgt));toast(`${L.length} added. Send them one by one from here.`);go("messages")});

/* the public bio-data page (?bio=token) */
let BIOPUB=null;
async function bioPublicPage(t){document.body.classList.add("public");let d;try{const r=await SYNC.sb.rpc("dme_public_bio",{p_t:t});d=r.data}catch(e){}
 if(!d||d.error)return pubShell(`<div class="panel fbform">${formHead(null,"Bio data","Department of Medical Education")}<p>This link is not valid any more. It may already have been used. Ask the DME office for a new link.</p></div>`);
 BIOPUB={t,d,fam:(d.bio&&d.bio.family&&d.bio.family.length?d.bio.family:[{rel:"Father"},{rel:"Mother"}]).map(f=>({...f}))};bioPubRender()}
function bioPubRender(done){const{d}=BIOPUB,b=d.bio||{};
 if(done)return pubShell(`<div class="panel fbform">${formHead(null,"Bio data received","Department of Medical Education")}<p>Thank you, Dr. ${esc(d.name)}. Your bio data is now with the DME office.</p>
  <div class="flag ok" style="display:grid;gap:8px"><b>Download your bio data form</b><span>Print it, sign it and hand it to the DME office.</span><button class="btn primary" data-act="biopub-pdf" style="justify-self:start">Download bio data form (PDF)</button><span class="subt" id="biopub-err"></span></div></div>`);
 const f=(n,l,o={})=>`<label class="f"><span class="${o.opt?"":"req"}">${l}${o.h?` <span class="h">${o.h}</span>`:o.opt?` <span class="h">optional</span>`:""}</span>${o.area?`<textarea name="${n}" rows="2">${esc(o.v||"")}</textarea>`:`<input name="${n}" ${o.type?`type="${o.type}"`:""} value="${esc(o.v||"")}" ${o.ph?`placeholder="${o.ph}"`:""}>`}</label>`;
 const fam=BIOPUB.fam.map((m,i)=>`<fieldset class="pfsec famrow"><legend>Family member ${i+1}${i>0?` <button type="button" class="btn link" data-bpfdel="${i}">Remove</button>`:""}</legend>
  <div class="grid2"><label class="f"><span class="${i===0?"req":""}">Name</span><input data-bpf="${i}.name" value="${esc(m.name||"")}"></label><label class="f"><span>Relation</span><select data-bpf="${i}.rel">${opt(["",...BIO_REL],m.rel||"")}</select></label></div>
  <div class="grid2"><label class="f"><span>CNIC</span><input data-bpf="${i}.cnic" value="${esc(m.cnic||"")}" placeholder="xxxxx-xxxxxxx-x"></label><label class="f"><span>Age</span><input data-bpf="${i}.age" inputmode="numeric" value="${esc(m.age??"")}"></label></div>
  <div class="grid2"><label class="f"><span>Passport no.</span><input data-bpf="${i}.passport" value="${esc(m.passport||"")}"></label><label class="f"><span>Other nationality</span><input data-bpf="${i}.nat" value="${esc(m.nat||"")}"></label></div></fieldset>`).join("");
 pubShell(`<form class="panel fbform" id="bioform" novalidate>${formHead(null,"Bio data form","Form RIC-RWP-HRM-F-04 · Department of Medical Education")}
  <div class="flag info"><b>Dr. ${esc(d.name)}</b> · ${esc(d.code||"")} · ${esc(d.spec||"")}<br>Father's name: ${esc(d.father||"not on file")} · CNIC: ${esc(d.cnic||"not on file")} · Domicile: ${esc(d.domicile||"not on file")}<br><span class="subt">If any of these is wrong, tell the DME office.</span></div>
  <fieldset class="pfsec"><legend>Personal</legend><div class="grid2">${f("dob","Date of birth",{type:"date",v:b.dob})}<label class="f"><span class="req">Marital status</span><select name="marital">${opt(["",...BIO_MARITAL],b.marital||"")}</select></label></div>
   <div class="grid2">${f("religion","Religion",{v:b.religion,ph:"e.g. Islam"})}${f("sect","Sect",{opt:1,v:b.sect})}</div>
   <div class="grid2">${f("passport","Passport number",{opt:1,v:b.passport})}${f("otherNat","Other nationality",{opt:1,h:"if any",v:b.otherNat})}</div></fieldset>
  <fieldset class="pfsec"><legend>Contact and address</legend><p class="qd" style="margin:0">Mobile on file: <b>${esc(d.mobile||"none")}</b></p>
   <div class="grid2">${f("mobile2","Second mobile",{opt:1,v:d.mobile2,ph:"03xx-xxxxxxx"})}${f("resNo","Residence or guardian's number",{v:b.resNo})}</div>
   ${f("curAddr","Current address",{area:1,v:b.curAddr})}<label class="check2"><input type="checkbox" id="bp-same" ${b.permAddr&&b.permAddr===b.curAddr?"checked":""}> Permanent address is the same</label>
   <div id="bp-perm" ${b.permAddr&&b.permAddr===b.curAddr?"hidden":""}>${f("permAddr","Permanent address",{area:1,h:"exactly as on your CNIC",v:b.permAddr})}</div>
   <div class="grid2">${f("bank","Bank name",{h:"salary account",v:b.bank})}${f("account","Account number or IBAN",{v:b.account})}</div></fieldset>
  <fieldset class="pfsec"><legend>Family</legend><p class="qd" style="margin:0">Parents, spouse and children.</p>${fam}<button type="button" class="btn small" data-act="bpf-add" style="justify-self:start">Add family member</button></fieldset>
  <fieldset class="pfsec"><legend>Photo</legend><label class="f"><span>Passport-size photo <span class="h">optional; blue background, no side pose. It goes on your bio data form.</span></span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label></fieldset>
  <label class="check2"><input type="checkbox" id="bp-decl"> I hereby undertake that I have read the above information (provided by me) and I will be responsible if it is declared false or fake at any stage.</label>
  <div class="err" id="bperr" role="alert"></div><button class="btn primary" type="button" data-act="bp-submit" style="justify-self:start">Submit bio data</button></form>`)}
function bioPubSync(){document.querySelectorAll("[data-bpf]").forEach(el=>{const[i,k]=el.dataset.bpf.split(".");BIOPUB.fam[+i][k]=el.value})}
document.addEventListener("change",e=>{if(e.target.id==="bp-same"){document.getElementById("bp-perm").hidden=e.target.checked}});
document.addEventListener("click",async e=>{if(!BIOPUB)return;const t=e.target;
 if(t.closest('[data-act="bpf-add"]')){bioPubSync();if(BIOPUB.fam.length<10)BIOPUB.fam.push({});keepForm();return}
 const del=t.closest("[data-bpfdel]");if(del){bioPubSync();BIOPUB.fam.splice(+del.dataset.bpfdel,1);keepForm();return}
 if(t.closest('[data-act="biopub-pdf"]')){const b=t.closest("button"),er=document.getElementById("biopub-err");b.disabled=true;try{const ph=BIOPUB.photo?await bioPhotoData(BIOPUB.photo):null;const doc=await bioPdf({...BIOPUB.d,bio:BIOPUB.bio,mobile2:BIOPUB.mobile2||BIOPUB.d.mobile2},ph,{ref:BIOPUB.d.code,at:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})});doc.save(bioFileName(BIOPUB.d))}catch(x){er.textContent=x.message||"Could not make the PDF."}b.disabled=false;return}
 if(!t.closest('[data-act="bp-submit"]'))return;bioPubSync();const fm=document.getElementById("bioform"),er=document.getElementById("bperr"),g=n=>(fm[n]?.value||"").trim(),bad=m=>{er.textContent=m};
 if(!g("dob"))return bad("Enter your date of birth.");if(!g("marital"))return bad("Choose your marital status.");if(!g("religion"))return bad("Enter your religion.");
 const m2=g("mobile2").replace(/\D/g,"");if(m2&&!/^0?3\d{9}$/.test(m2))return bad("Second mobile must be 03xx-xxxxxxx.");
 if(g("resNo").replace(/\D/g,"").length<7)return bad("Enter a residence or guardian's phone number.");if(g("curAddr").length<10)return bad("Enter your full current address.");
 const same=document.getElementById("bp-same").checked;if(!same&&g("permAddr").length<10)return bad("Enter your permanent address as on your CNIC.");
 if(g("bank").length<3)return bad("Enter the name of your salary bank.");if(g("account").replace(/[\s-]/g,"").length<8)return bad("Enter your account number or IBAN.");
 const fam=BIOPUB.fam.filter(x=>(x.name||"").trim()).map(x=>({name:x.name.trim(),rel:x.rel||"",cnic:(x.cnic||"").trim(),passport:(x.passport||"").trim().toUpperCase(),age:x.age===""||x.age==null?"":+String(x.age).replace(/\D/g,""),nat:(x.nat||"").trim()}));
 if(!fam.length)return bad("Enter at least one family member.");if(fam.some(x=>!x.rel))return bad("Choose the relation for each family member.");
 if(fam.some(x=>x.cnic&&x.cnic.replace(/\D/g,"").length!==13))return bad("A family member's CNIC should have 13 digits.");
 if(!document.getElementById("bp-decl").checked)return bad("Tick the undertaking to submit.");
 const ph=fm.photo.files[0];if(ph&&(ph.size>5*1048576||!/^image\//.test(ph.type)))return bad("The photo should be a JPG or PNG under 5 MB.");
 const bio={dob:g("dob"),marital:g("marital"),religion:g("religion"),sect:g("sect"),passport:g("passport").replace(/\s/g,"").toUpperCase(),otherNat:g("otherNat"),resNo:g("resNo"),curAddr:g("curAddr"),permAddr:same?g("curAddr"):g("permAddr"),bank:g("bank"),account:g("account"),family:fam};
 const b=t.closest("button");b.disabled=true;b.textContent="Sending…";
 try{let path=null;if(ph){path=`pgt/bio-${Date.now()}-${Math.random().toString(36).slice(2,7)}/photo.${(ph.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")}`;const{error}=await SYNC.sb.storage.from("dme-uploads").upload(path,ph,{contentType:ph.type});if(error)throw new Error("upload")}
  const mob2=m2?(m2.length===10?"0"+m2:m2).replace(/^(\d{4})(\d{7})$/,"$1-$2"):null;
  const{data,error}=await SYNC.sb.rpc("dme_submit_bio",{p_t:BIOPUB.t,p_bio:bio,p_mobile2:mob2,p_photo:path});if(error||!data)throw new Error("send");
  if(data.error){b.disabled=false;b.textContent="Submit bio data";return bad(data.error==="not_found"?"This link has already been used. Ask the DME office for a new one.":"Some details are not valid. Check the form.")}
  BIOPUB.bio=bio;BIOPUB.photo=ph||null;BIOPUB.mobile2=mob2;bioPubRender(true);window.scrollTo(0,0)}
 catch(x){b.disabled=false;b.textContent="Submit bio data";bad(x.message==="upload"?"The photo could not be uploaded. Try again, or submit without it.":"Could not send. Check the connection and try again.")}});
/* re-draw the form without losing what was typed */
function keepForm(){const fm=document.getElementById("bioform"),vals={};[...fm.elements].forEach(el=>{if(el.name&&el.type!=="file")vals[el.name]=el.type==="checkbox"?el.checked:el.value});const same=document.getElementById("bp-same").checked,decl=document.getElementById("bp-decl").checked;
 const y=window.scrollY;bioPubRender();const f2=document.getElementById("bioform");Object.entries(vals).forEach(([k,v])=>{const el=f2[k];if(el&&el.type!=="checkbox")el.value=v});document.getElementById("bp-same").checked=same;document.getElementById("bp-perm").hidden=same;document.getElementById("bp-decl").checked=decl;window.scrollTo(0,y)}

/* ---------- 3. workshop check-in by QR (?att=workshop id) ---------- */
const attLink=w=>(LIVE?pubBase():"https://dme.ric.example/")+"?att="+encodeURIComponent(w.id);
function attOverlay(w){const R=regsOf(w).filter(r=>r.status==="Confirmed"),n=R.filter(r=>r.present).length;
 document.getElementById("overlay").innerHTML=`<div class="scrim" data-act="close"></div><div class="qrfull" role="dialog" aria-modal="true" aria-label="Check-in QR"><div class="code">Scan to mark your attendance</div><h2>${esc(w.title)}</h2>
  <div class="qrbig">${qrSvg(attLink(w),10)}</div><div class="code" style="font-size:13px;word-break:break-all">${esc(attLink(w))}</div>
  <p style="margin:0"><span class="pill ${w.attOpen?"p-ric":"p-bad"}">${w.attOpen?"Check-in open":"Check-in closed"}</span> · <b>${n}</b> of ${R.length} confirmed participants checked in</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${isViewer()?"":`<button class="btn ${w.attOpen?"":"primary"}" data-act="ws-atttoggle" data-id="${w.id}">${w.attOpen?"Close check-in":"Open check-in"}</button>`}<button class="btn" data-act="close">Close</button></div>
  <p class="subt" style="margin:0;max-width:440px;text-align:center">Show this on the projector or print it at the door. Participants enter the mobile number they registered with. Open check-in only during the workshop.</p></div>`}
{const _rp=regPanel;if(typeof _rp==="function")regPanel=function(w){return _rp(w).replace('<a class="btn small" href="#attend-',`<button class="btn small" data-act="ws-attqr" data-id="${w.id}">Check-in QR${w.attOpen?" · open":""}</button><a class="btn small" href="#attend-`)}}
document.addEventListener("click",e=>{const a=e.target.closest('[data-act="ws-attqr"],[data-act="ws-atttoggle"]');if(!a)return;e.stopPropagation();const w=DB.workshops.find(x=>x.id===a.dataset.id);if(!w)return;
 if(a.dataset.act==="ws-atttoggle"){w.attOpen=!w.attOpen;wlog(w,w.attOpen?"QR check-in opened":"QR check-in closed");persist()}attOverlay(w)},true);
setInterval(()=>{const o=document.querySelector("#overlay .qrfull [data-act='ws-atttoggle']");if(o){const w=DB.workshops.find(x=>x.id===o.dataset.id);if(w)attOverlay(w)}},15000);
VIEW_ACTS.add("ws-attqr");
let ATTPUB=null;
async function attPublicPage(id){document.body.classList.add("public");let d=null;try{const r=await SYNC.sb.rpc("dme_att_info",{p_id:id});d=r.data}catch(e){}ATTPUB={id,d};attPubRender()}
function attPubRender(res){const d=ATTPUB.d;if(!d||d.error)return pubShell(`<div class="panel fbform">${formHead(null,"Workshop check-in","Department of Medical Education")}<p>This check-in link is not valid.</p></div>`);
 const head=formHead(null,d.title||"Workshop",`${d.date?fd(d.date):""}${d.venue?" · "+esc(d.venue):""} · Attendance`);
 if(res&&res.ok)return pubShell(`<div class="panel fbform">${head}<div class="flag ok" style="display:grid;gap:6px;text-align:center;padding:24px"><b style="font-size:22px">${res.already?"Already checked in":"Welcome"}, ${esc(res.name||"")}</b><span>${res.already?"Your attendance was recorded earlier.":"Your attendance is recorded. Enjoy the workshop."}</span></div></div>`);
 if(!d.open)return pubShell(`<div class="panel fbform">${head}<p>Check-in is not open at the moment. It opens at the start of the workshop.</p><button class="btn" data-act="att-retry">Try again</button></div>`);
 let saved="";try{saved=localStorage.getItem("dme-att-mobile")||""}catch(e){}
 pubShell(`<form class="panel fbform" id="attform" novalidate>${head}<label class="f"><span class="req">Your mobile number</span><input name="m" type="tel" inputmode="numeric" placeholder="03xx-xxxxxxx" value="${esc(saved)}" style="font-size:20px"></label><p class="qd" style="margin:0">The number you registered with.</p>
  <div class="err" id="atterr" role="alert">${res&&res.error?esc(res.error):""}</div><button class="btn primary" type="button" data-act="att-go" style="justify-self:start;font-size:17px;padding:12px 22px">Mark me present</button></form>`)}
document.addEventListener("click",async e=>{if(!ATTPUB)return;if(e.target.closest('[data-act="att-retry"]')){return attPublicPage(ATTPUB.id)}
 const b=e.target.closest('[data-act="att-go"]');if(!b)return;const m=document.querySelector('#attform [name="m"]').value.replace(/\D/g,"");if(m.length<10){document.getElementById("atterr").textContent="Enter your 11-digit mobile number.";return}
 b.disabled=true;b.textContent="Checking…";let r=null;try{const x=await SYNC.sb.rpc("dme_checkin",{p_id:ATTPUB.id,p_mobile:m});r=x.data}catch(err){}
 if(r&&r.ok){try{localStorage.setItem("dme-att-mobile",m)}catch(x){}return attPubRender(r)}
 attPubRender({error:!r?"Could not connect. Try again.":r.error==="not_registered"?"This number is not among the confirmed registrations. Please see the registration desk.":r.error==="closed"?"Check-in has just closed. Please see the registration desk.":"Check the number and try again."})});
