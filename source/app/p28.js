
/* =====================================================================
   V26 · FACULTY CONTACT DETAILS: CNIC, father's name, mobiles and email
   on each faculty member (live app only; never in the prototype)
   ===================================================================== */
const FCE_F=[["father","Father's name"],["cnic","CNIC","xxxxx-xxxxxxx-x"],["mobile","Mobile","03xx-xxxxxxx"],["mobile2","Second mobile","optional"],["email","Email"],["emailAlt","Alternate email","optional"]];
function facContactDl(f){if(!LIVE&&!f.cnic&&!f.mobile&&!f.email)return"";const tel=v=>v?`<a href="tel:${esc(v.replace(/-/g,""))}">${esc(v)}</a>`:"—";
 return`<dt>CNIC</dt><dd class="code">${esc(f.cnic)||"—"}</dd><dt>Father's name</dt><dd>${esc(f.father)||"—"}</dd><dt>Mobile</dt><dd class="code">${tel(f.mobile)}${f.mobile2?" · "+tel(f.mobile2):""}</dd><dt>Email</dt><dd>${f.email?`<a href="mailto:${esc(f.email)}">${esc(f.email)}</a>`:"—"}${f.emailAlt?`<div>${esc(f.emailAlt)}</div>`:""}</dd>`}
{const _s=sheetFac;sheetFac=function(f){_s(f);const nt=document.querySelector('#sheetform textarea[name="notes"]');if(!nt)return;
  const h=contactEditHtml(f||{},FCE_F);if(!h)return;nt.closest("label").insertAdjacentHTML("beforebegin",`<div class="subt" style="margin-top:4px">Contact details</div>`+h);
  const o=SHEET.onSave;SHEET.onSave=(...a)=>{const _l=log;let err;try{log=()=>{};err=contactEditRead({...(f||{})},FCE_F)}finally{log=_l}if(err)return fail(err);
   const n=DB.faculty.length,r=o(...a);if(r===false)return r;const t=f||(DB.faculty.length>n?DB.faculty[DB.faculty.length-1]:null);if(t)contactEditRead(t,FCE_F,"fac-"+t.id);return r}}}
