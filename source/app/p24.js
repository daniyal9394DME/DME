
/* =====================================================================
   V22 · (1) registration-form settings, links and QR codes for the PGT
   and rotating-trainee forms; (2) faculty who supervise in more than
   one specialty, with supervisory certificates per specialty
   ===================================================================== */

/* ---------- 1. form settings + QR ---------- */
const FORM_DEF={sur:{open:true,msg:"",close:"",contact:""},pgt:{open:true,msg:"",close:"",contact:""},rot:{open:true,msg:"",close:"",contact:"",units:ROT_UNITS.slice()}};
const formCfg=k=>{const s=DB.settings.forms=DB.settings.forms||{};return{...FORM_DEF[k],...(s[k]||{})}};
const formName=k=>k==="sur"?"Training status":k==="pgt"?"PGT registration":"Rotation registration";
const formUrl=k=>k==="sur"?(LIVE?pubBase()+"?sur=1":"https://dme.ric.example/status"):k==="pgt"?(LIVE?pubBase().replace(/[^/]*$/,"")+"register.html":"https://dme.ric.example/register"):rotLink();
const formIsOpen=c=>c.open!==false&&!(c.close&&c.close<iso(TODAY));
function regLinkPanel(k){if(isViewer())return"";const c=formCfg(k),open=formIsOpen(c),n=k==="rot"?rotOnly().filter(rotNew).length:0;
 return`<div class="panel" style="display:grid;gap:10px"><div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
  <button class="qrthumb" data-act="form-qr" data-k="${k}" title="Show QR code">${qrSvg(formUrl(k),2)}</button>
  <div style="flex:1;min-width:240px;display:grid;gap:6px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>${formName(k)} form</b><span class="pill ${open?"p-ric":"p-bad"}">${open?"Open":"Closed"}</span>${c.close&&open?`<span class="subt">closes ${fd(c.close)}</span>`:""}</div>
   <div class="toolbar"><input id="flink-${k}" readonly class="linkbox" value="${esc(formUrl(k))}" style="flex:1;min-width:200px;font-family:var(--f-mono);font-size:13px"><button class="btn small" data-act="form-copy" data-k="${k}">Copy link</button><button class="btn small" data-act="form-qr" data-k="${k}">QR code</button><a class="btn small" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent((k==="sur"?"Training status form, Rawalpindi Institute of Cardiology (DME&T). Please report your registration certificate, ACLS / BLS and research progress:\n":k==="pgt"?"PGT registration, Rawalpindi Institute of Cardiology. Please fill in your details and upload your documents:\n":"Rotation registration, Rawalpindi Institute of Cardiology (Department of Medical Education and Training). Please register before your first day and upload your movement order:\n")+formUrl(k))}">Share on WhatsApp</a><button class="btn small" data-act="form-edit" data-k="${k}">Form settings</button></div>
   ${c.msg?`<p class="subt" style="margin:0">Message on the form: ${esc(c.msg.slice(0,140))}${c.msg.length>140?"…":""}</p>`:""}</div></div>
  ${n?`<div class="flag info">${n} new online registration${n>1?"s":""}: check the movement order, then press <b>Documents checked</b> on the profile.</div>`:""}</div>`}
function rotLinkPanel(){return regLinkPanel("rot")}
function sheetFormCfg(k){const c=formCfg(k);
 openSheet(`${formName(k)} form`,`<p class="subt" style="margin:0">These settings show on the form the moment you save. The link and QR code stay the same, so printed QR codes keep working.</p>
 <label class="f">Status<select name="open">${opt([["1",k==="sur"?"Open: accepting responses":"Open: accepting registrations"],["0","Closed"]],c.open===false?"0":"1")}</select></label>
 <label class="f">Close automatically after <span class="h">optional</span><input type="date" name="close" value="${esc(c.close||"")}"></label>
 <label class="f">Message at the top of the form <span class="h">optional: instructions, deadline, what to bring</span><textarea name="msg" rows="4" placeholder="${k==="sur"?"e.g. Fill this in before you leave the exam hall. Keep a photo of your RTMC certificate and ACLS / BLS cards ready.":k==="pgt"?"e.g. All PGTs joining in the July 2026 induction must register by 15 August. Keep your CNIC, PMDC certificate and joining letter ready.":"e.g. Register before your first day. Bring your original movement order to the DME&T office (Ground floor, Admin block)."}">${esc(c.msg||"")}</textarea></label>
 <label class="f">Contact for questions <span class="h">shown on the form</span><input name="contact" value="${esc(c.contact||"")}" placeholder="e.g. DME&T office, 051-xxxxxxx (9 am to 3 pm)"></label>
 ${k==="rot"?`<label class="f">Rotation units offered <span class="h">one per line; "Other" is always added</span><textarea name="units" rows="7">${esc((c.units||[]).join("\n"))}</textarea></label>`:""}`,()=>{
  const n={open:fv("open")==="1",close:fv("close"),msg:fv("msg"),contact:fv("contact")};if(k==="rot"){n.units=fv("units").split("\n").map(s=>s.trim()).filter(Boolean);if(!n.units.length)return fail("List at least one unit.")}
  DB.settings.forms=DB.settings.forms||{};DB.settings.forms[k]=n;log(`${formName(k)} form settings changed: ${n.open?"open":"closed"}${n.close?", closes "+fd(n.close):""}`);toast("Saved. The form shows the change now.");return true})}
function qrPng(k){return new Promise((ok,no)=>{const url=formUrl(k);if(typeof qrcode!=="function")return no(new Error("QR code needs an internet connection"));
 const q=qrcode(0,"M");q.addData(url);q.make();const n=q.getModuleCount(),cell=Math.floor(900/n),qs=n*cell,W=1200,H=1650,cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
 g.fillStyle="#fff";g.fillRect(0,0,W,H);g.fillStyle="#6D1F2B";g.fillRect(0,0,W,22);
 const draw=()=>{g.fillStyle="#231A17";g.textAlign="center";g.font="600 44px Georgia,serif";g.fillText("RAWALPINDI INSTITUTE OF CARDIOLOGY",W/2,230);g.font="32px Arial,sans-serif";g.fillStyle="#6E625A";g.fillText("Department of Medical Education and Training",W/2,280);
  g.fillStyle="#6D1F2B";g.font="bold 64px Arial,sans-serif";g.fillText(k==="sur"?"Training Status Form":k==="pgt"?"PGT Registration":"Rotation Registration",W/2,390);g.fillStyle="#231A17";g.font="34px Arial,sans-serif";g.fillText(k==="sur"?"All PGTs: registration, ACLS / BLS and research progress":k==="pgt"?"Postgraduate trainees joining RIC":"Trainees from other institutes on rotation at RIC",W/2,445);
  const x0=(W-qs)/2,y0=500;g.fillStyle="#000";for(let r=0;r<n;r++)for(let c2=0;c2<n;c2++)if(q.isDark(r,c2))g.fillRect(x0+c2*cell,y0+r*cell,cell,cell);
  g.fillStyle="#6D1F2B";g.font="bold 46px Arial,sans-serif";g.fillText("Scan with your phone camera",W/2,y0+qs+90);g.fillStyle="#6E625A";g.font="26px monospace";g.fillText(url.length>70?url.slice(0,70)+"…":url,W/2,y0+qs+145);ok(cv.toDataURL("image/png"))};
 const lg=document.querySelector('img[alt="RIC logo"]');if(lg&&lg.complete){try{g.drawImage(lg,W/2-75,45,150,150)}catch(e){}}draw()})}
function qrBig(k){const url=formUrl(k);document.getElementById("overlay").innerHTML=`<div class="scrim" data-act="close"></div><div class="qrfull" role="dialog" aria-modal="true" aria-label="QR code"><div class="code">Scan to open the ${k==="sur"?"":"registration "}form</div><h2>${formName(k)}</h2><div class="qrbig">${qrSvg(url,10)}</div><div class="code" style="font-size:13px;word-break:break-all">${esc(url)}</div>
 <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn primary" data-act="form-qrpng" data-k="${k}">Download printable QR (PNG)</button><button class="btn" data-act="close">Close</button></div></div>`}
document.addEventListener("click",async e=>{const a=e.target.closest('[data-act="form-qr"],[data-act="form-copy"],[data-act="form-edit"],[data-act="form-qrpng"]');if(!a)return;const k=a.dataset.k;
 if(a.dataset.act==="form-copy")return copyText(formUrl(k),a);if(a.dataset.act==="form-edit")return sheetFormCfg(k);if(a.dataset.act==="form-qr")return qrBig(k);
 try{const png=await qrPng(k);const l=document.createElement("a");l.href=png;l.download=`QR ${formName(k)} - RIC.png`;document.body.append(l);l.click();l.remove()}catch(x){toast(x.message||"Could not make the QR image")}});
VIEW_ACTS.add("form-qr");VIEW_ACTS.add("form-copy");VIEW_ACTS.add("form-qrpng");

/* ---------- 2. supervisors in more than one specialty ---------- */
const supSpecs=f=>Array.isArray(f.sups)&&f.sups.length?f.sups:[{spec:f.spec,cpsp:!!f.cpsp,uhs:!!f.uhs}];
const primSup=f=>supSpecs(f).find(s=>s.spec===f.spec)||{spec:f.spec,cpsp:false,uhs:false};
const canSup=(f,spec,prog)=>supSpecs(f).some(s=>s.spec===spec&&(prog==="FCPS"?s.cpsp:s.uhs));
const supsIn=(f,spec)=>supSpecs(f).some(s=>s.spec===spec&&(s.cpsp||s.uhs));
/* keep the "approved anywhere" flags in step with the per-specialty list */
function facSync(f){const L=supSpecs(f);f.cpsp=L.some(s=>s.cpsp);f.uhs=L.some(s=>s.uhs);if(L.length===1&&L[0].spec===f.spec)delete f.sups;else f.sups=L}
const CSTAT_RANK={"Expired":0,"Not Certified":1,"Expiring Soon":2,"Certified":3};
function facCur(f){
 const ps=verified().filter(p=>CUR.get(p.id).active&&CUR.get(p.id).sup?.id===f.id);
 const mine=DB.creds.filter(c=>c.fid===f.id),latest=(t,sp)=>mine.filter(c=>c.type===t&&(sp==null||(c.spec||f.spec)===sp)).sort((a,b)=>(a.issue||"")<(b.issue||"")?1:-1)[0]||null;
 const cr={};CRED.forEach(t=>cr[t]=latest(t));
 const st=(c,reg)=>{if(!c)return reg?"Not Registered":"Not Certified";if(c.expiry&&P(c.expiry)<TODAY)return"Expired";if(c.expiry&&days(P(c.expiry),TODAY)<=DB.settings.cert_warn)return"Expiring Soon";return reg?"Registered":"Certified"};
 const sp=supSpecs(f).map(s=>({spec:s.spec,cpsp:s.cpsp?st(latest(CRED[1],s.spec)):null,uhs:s.uhs?st(latest(CRED[2],s.spec)):null,cc:latest(CRED[1],s.spec),uc:latest(CRED[2],s.spec)}));
 const worst=k=>{const L=sp.map(x=>x[k]).filter(Boolean);return L.length?L.sort((a,b)=>CSTAT_RANK[a]-CSTAT_RANK[b])[0]:st(cr[k==="cpsp"?CRED[1]:CRED[2]])};
 return{pgts:ps,n:ps.length,ncpsp:ps.filter(p=>p.program==="FCPS").length,nuhs:ps.filter(p=>p.program!=="FCPS").length,cr,sp,
  pmdc:st(cr[CRED[0]],1),cpsp:worst("cpsp"),uhs:worst("uhs"),type:f.cpsp&&f.uhs?"CPSP & UHS":f.cpsp?"CPSP":f.uhs?"UHS":"—"}}
function credIssues(f,c){const i=[],many=c.sp.length>1;
 if(c.pmdc==="Expired")i.push(["bad","PMDC registration expired"]);else if(c.pmdc==="Expiring Soon")i.push(["warn","PMDC registration expiring "+fd(c.cr[CRED[0]].expiry)]);else if(c.pmdc==="Not Registered")i.push(["mute","No PMDC faculty registration on file"]);
 c.sp.forEach(s=>{const tag=many?` (${s.spec})`:"";
  [["CPSP","cpsp","cc"],["UHS","uhs","uc"]].forEach(([B,k,ck])=>{const v=s[k];if(!v)return;if(v==="Not Certified")i.push(["warn",`${B} supervisor${tag}, no certificate on file`]);else if(v==="Expired")i.push(["bad",`${B} certificate${tag} expired`]);else if(v==="Expiring Soon")i.push(["warn",`${B} certificate${tag} expiring ${fd(s[ck].expiry)}`])})});
 return i}
const credSpecOf=issue=>(String(issue).match(/\(([^)]+)\)/)||[])[1]||"";
function facSpecLines(f,c){if(!f.cpsp&&!f.uhs)return"";return`<dt>Supervises in</dt><dd>${c.sp.filter(s=>s.cpsp||s.uhs).map(s=>`<div style="margin-bottom:4px"><b>${esc(s.spec)}</b>${s.cpsp?` · CPSP ${credPill(s.cpsp)}`:""}${s.uhs?` · UHS ${credPill(s.uhs)}`:""}</div>`).join("")}</dd>`}
/* the supervisor-approval rows on the Credentials page */
function crSupRows(f){const L=supSpecs(f);return`<div id="cr-sups" style="display:grid;gap:8px">${L.map((s,i)=>crSupRow(s,s.spec===f.spec)).join("")}</div>
 <button type="button" class="btn small" data-act="cr-addspec" style="justify-self:start">Add another specialty</button>`}
function crSupRow(s,prim){return`<div class="supspec">${prim?`<b>${esc(s.spec)}</b><input type="hidden" class="cr-sp" value="${esc(s.spec)}"><span class="subt">main department</span>`:`<select class="cr-sp" aria-label="Specialty">${opt(specNames(),s.spec)}</select>`}
 <label class="check2"><input type="checkbox" class="cr-c" ${s.cpsp?"checked":""}> CPSP</label><label class="check2"><input type="checkbox" class="cr-u" ${s.uhs?"checked":""}> UHS</label>${prim?"":`<button type="button" class="btn link" data-act="cr-rmspec">Remove</button>`}</div>`}
document.addEventListener("click",e=>{const a=e.target.closest('[data-act="cr-addspec"],[data-act="cr-rmspec"]');if(!a)return;e.stopPropagation();
 if(a.dataset.act==="cr-rmspec"){a.closest(".supspec").remove();return}const f=facById(UI.credFac);if(!f)return;const used=[...document.querySelectorAll("#cr-sups .cr-sp")].map(x=>x.value);
 const next=specNames().find(s=>!used.includes(s))||specNames()[0];document.getElementById("cr-sups").insertAdjacentHTML("beforeend",crSupRow({spec:next,cpsp:true,uhs:false},false))},true);
function crReadSups(f){const rows=[...document.querySelectorAll("#cr-sups .supspec")].map(r=>({spec:r.querySelector(".cr-sp").value,cpsp:r.querySelector(".cr-c").checked,uhs:r.querySelector(".cr-u").checked}));
 const out=[];rows.forEach(r=>{const x=out.find(o=>o.spec===r.spec);if(x){x.cpsp=x.cpsp||r.cpsp;x.uhs=x.uhs||r.uhs}else out.push(r)});
 return out.filter(r=>r.spec===f.spec||r.cpsp||r.uhs)}
document.addEventListener("change",e=>{if(e.target.id==="cr-type"){const w=document.getElementById("cr-specwrap");if(w)w.hidden=e.target.value===CRED[0]}},true);

document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.querySelector("#overlay .qrfull"))document.getElementById("overlay").innerHTML=""});
window.addEventListener("hashchange",()=>{if(document.querySelector("#overlay .qrfull"))document.getElementById("overlay").innerHTML=""});
