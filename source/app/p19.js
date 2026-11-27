
/* =====================================================================
   V16 · BIO DATA (form RIC-RWP-HRM-F-04): shown on the trainee profile,
   editable by the office, printable as the filled form
   ===================================================================== */
VIEW_ACTS.add("bio-pdf");
const BIO_KV=[["dob","Date of birth"],["marital","Marital status"],["religion","Religion"],["sect","Sect"],["passport","Passport no."],["otherNat","Other nationality"],["resNo","Residence / guardian no."],["curAddr","Current address"],["permAddr","Permanent address (CNIC)"],["bank","Salary bank"],["account","Account no. / IBAN"]];
const bioHas=b=>b&&(BIO_KV.some(([k])=>b[k])||(b.family||[]).length);
function bioPanel(p){if(!LIVE&&!p.bio)return"";const b=p.bio||{};
 const kv=BIO_KV.filter(([k])=>b[k]).map(([k,l])=>`<dt>${l}</dt><dd>${esc(k==="dob"?fd(b[k]):b[k])}</dd>`).join("");
 const fam=(b.family||[]).filter(f=>f.name);
 return`<div class="panel"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h3 style="margin:0">Bio data</h3>
  <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn small" data-act="bio-pdf" data-id="${p.id}">Bio data form (PDF)</button><button class="btn small" data-act="bio-edit" data-id="${p.id}">${bioHas(b)?"Edit":"Enter from paper form"}</button></div></div>
  ${bioHas(b)?`<dl class="kv" style="margin-top:10px">${kv}</dl>
  ${fam.length?`<div class="tblwrap" style="margin-top:8px"><table><thead><tr><th>Family member</th><th>Relation</th><th>CNIC</th><th>Age</th></tr></thead><tbody>${fam.map(f=>`<tr><td>${esc(f.name)}${f.passport?`<div class="subt">Passport ${esc(f.passport)}</div>`:""}${f.nat?`<div class="subt">${esc(f.nat)}</div>`:""}</td><td>${esc(f.rel)}</td><td class="code">${esc(f.cnic||"—")}</td><td>${esc(f.age??"")}</td></tr>`).join("")}</tbody></table></div>`:""}`
  :`<p class="subt" style="margin:8px 0 0">Not on file yet. Trainees who register through the PGT link fill this in themselves. For earlier trainees, enter it from their paper bio data form, or print a blank form with their known details filled in.</p>`}</div>`}
function sheetBio(p){const b=p.bio||{},fam=[...(b.family||[])];while(fam.length<7)fam.push({});const n=(k)=>`name="bio-${k}"`;
 openSheet(`Bio data · Dr. ${p.name}`,`<p class="subt" style="margin:0">Name, father's name, CNIC, domicile, mobile and email come from the trainee's record (Edit details).</p>
 <div class="grid2"><label class="f">Date of birth<input type="date" ${n("dob")} value="${esc(b.dob||"")}"></label><label class="f">Marital status<select ${n("marital")}>${opt(["",...BIO_MARITAL],b.marital||"")}</select></label></div>
 <div class="grid2"><label class="f">Religion<input ${n("religion")} value="${esc(b.religion||"")}"></label><label class="f">Sect<input ${n("sect")} value="${esc(b.sect||"")}"></label></div>
 <div class="grid2"><label class="f">Passport no.<input ${n("passport")} value="${esc(b.passport||p.passport||"")}"></label><label class="f">Other nationality<input ${n("otherNat")} value="${esc(b.otherNat||"")}"></label></div>
 <label class="f">Residence / guardian no.<input ${n("resNo")} value="${esc(b.resNo||"")}"></label>
 <label class="f">Current address<textarea ${n("curAddr")} rows="2">${esc(b.curAddr||"")}</textarea></label>
 <label class="f">Permanent address (as on CNIC)<textarea ${n("permAddr")} rows="2">${esc(b.permAddr||"")}</textarea></label>
 <div class="grid2"><label class="f">Salary bank<input ${n("bank")} value="${esc(b.bank||"")}"></label><label class="f">Account no. / IBAN<input ${n("account")} value="${esc(b.account||"")}"></label></div>
 <h3 style="margin:6px 0 0">Family</h3><div class="tblwrap"><table class="bioft"><thead><tr><th>Name</th><th>Relation</th><th>CNIC</th><th>Passport</th><th>Age</th><th>Other nationality</th></tr></thead><tbody>
 ${fam.map((f,i)=>`<tr><td><input name="bf-${i}-name" value="${esc(f.name||"")}" aria-label="Name ${i+1}"></td><td><select name="bf-${i}-rel" aria-label="Relation ${i+1}">${opt(["",...BIO_REL],f.rel||"")}</select></td><td><input name="bf-${i}-cnic" value="${esc(f.cnic||"")}" aria-label="CNIC ${i+1}" style="width:130px"></td><td><input name="bf-${i}-passport" value="${esc(f.passport||"")}" aria-label="Passport ${i+1}" style="width:100px"></td><td><input name="bf-${i}-age" value="${esc(f.age??"")}" inputmode="numeric" aria-label="Age ${i+1}" style="width:56px"></td><td><input name="bf-${i}-nat" value="${esc(f.nat||"")}" aria-label="Nationality ${i+1}" style="width:110px"></td></tr>`).join("")}
 </tbody></table></div>`,()=>{
  const nb={};BIO_KV.forEach(([k])=>{const v=fv("bio-"+k);if(v)nb[k]=k==="passport"?v.replace(/\s/g,"").toUpperCase():v});
  const fl=[];for(let i=0;i<fam.length;i++){const g=k=>fv(`bf-${i}-${k}`);if(!g("name"))continue;const c=g("cnic").replace(/\D/g,"");
   if(c&&c.length!==13)return fail(`Family member ${i+1}: a CNIC has 13 digits.`);if(!g("rel"))return fail(`Family member ${i+1}: choose the relation.`);
   fl.push({name:g("name"),rel:g("rel"),cnic:c?c.replace(/^(\d{5})(\d{7})(\d)$/,"$1-$2-$3"):"",passport:g("passport").toUpperCase(),age:g("age")===""?"":+g("age").replace(/\D/g,""),nat:g("nat")})}
  if(fl.length)nb.family=fl;const before=JSON.stringify(p.bio||{});if(JSON.stringify(nb)===before){toast("No changes");return true}
  p.bio=nb;if(nb.passport&&!p.passport)p.passport=nb.passport;log(`Bio data of Dr. ${p.name} ${before==="{}"?"entered":"edited"}`,"pgt-"+p.id);toast("Bio data saved");return true})}
async function bioPdfFor(p,btn){const t=btn&&btn.textContent;if(btn){btn.disabled=true;btn.textContent="Preparing…"}
 try{let ph=null;if(LIVE&&p.docs&&p.docs.photo){try{const{data}=await SYNC.sb.storage.from("dme-uploads").download(p.docs.photo);ph=await bioPhotoData(data)}catch(e){}}
  const doc=await bioPdf(p,ph,{ref:p.code||"",at:p.submitted?fd(p.submitted):""});doc.save(bioFileName(p))}catch(e){toast(e.message||"Could not make the PDF")}
 if(btn){btn.disabled=false;btn.textContent=t}}
document.addEventListener("click",e=>{const a=e.target.closest('[data-act="bio-edit"],[data-act="bio-pdf"]');if(!a)return;const p=DB.pgts.find(x=>x.id===a.dataset.id);if(!p)return;
 if(a.dataset.act==="bio-edit")sheetBio(p);else bioPdfFor(p,a)});
