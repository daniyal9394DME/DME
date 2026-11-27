
/* =====================================================================
   V43 · Pass mark per paper: as a percentage or as marks out of the
   paper's total (questions minus any dropped). Papers left blank use
   the exam's pass mark. Pass / fail updates everywhere straight away.
   ===================================================================== */
function paperTotal(x,k){const s=typeof omrSpec==="function"?omrSpec(x,k):null;if(s&&s.n)return s.n-((s.drop||[]).length);const pp=(x.papers||{})[k];return pp&&+pp.mcqs?+pp.mcqs:null}
function passPct(x,k){const r=(x.passPaper||{})[k];if(!r)return null;if(r.mode==="marks"){const t=paperTotal(x,k)||+r.of;return t?r.marks/t*100:null}return r.pct!=null?+r.pct:null}
{const _f=exPassFor;exPassFor=function(x,k){const v=passPct(x,k);return v!=null?v:_f(x,k)}}
{const _p=exPass;exPass=function(x,p,m){if(x&&x.res&&p&&x.res[p.id])return _p(x,p,m);if(x&&p&&typeof exPaperOf==="function"){const v=passPct(x,exPaperOf(x,p));if(v!=null)return +m>=v-1e-9}return _p(x,p,m)}}
const passLabel=(x,k)=>{const r=(x.passPaper||{})[k],t=paperTotal(x,k);if(!r)return`${x.passMark}% (exam default)`;const v=passPct(x,k);return r.mode==="marks"?`${r.marks} of ${t||r.of} marks (${(+v).toFixed(1)}%)`:`${+(+r.pct).toFixed(2)}%${t?` · ${Math.ceil(r.pct*t/100-1e-9)} of ${t} marks`:""}`};

function sheetPassMarks(x,focus){const K=exAllPapers(x);
 openSheet("Pass marks by paper",`<p style="margin:0">Leave a paper blank to use the exam's pass mark (${x.passMark}%, set in Edit details). Enter either a percentage or the marks needed: the other one fills in.</p>
 <p class="subt" style="margin:0">Total = questions on the answer sheet minus any dropped questions. A pass in marks follows the total if you drop questions later.</p>
 <div class="tblwrap"><table class="passtbl"><thead><tr><th>Paper</th><th class="num">Total</th><th>Pass %</th><th>Pass marks</th><th></th></tr></thead><tbody>
 ${K.map((k,i)=>{const r=(x.passPaper||{})[k],t=paperTotal(x,k);const pct=r?(r.mode==="marks"?(t||r.of?(r.marks/(t||r.of)*100).toFixed(1):""):r.pct):"";const mk=r?(r.mode==="marks"?r.marks:(t?Math.ceil(r.pct*t/100-1e-9):"")):"";
  return`<tr data-pk="${esc(k)}" class="${k===focus?"focusrow":""}"><td><b>${esc(k)}</b>${exIsCommon(x,k)?' <span class="subt">common paper</span>':""}</td>
  <td class="num">${t?t:`<input type="number" min="1" data-pof="${i}" value="${r&&r.of||""}" placeholder="total" style="width:64px" aria-label="Total marks for ${esc(k)}">`}</td>
  <td><input type="number" min="0" max="100" step="0.5" data-ppct="${i}" value="${pct}" placeholder="${x.passMark}" style="width:68px" aria-label="Pass percentage for ${esc(k)}"></td>
  <td><input type="number" min="0" data-pmk="${i}" value="${mk}" placeholder="${t?Math.ceil(x.passMark*t/100-1e-9):"—"}" style="width:64px" aria-label="Pass marks for ${esc(k)}"></td>
  <td><button type="button" class="btn link" data-pclr="${i}">Default</button></td></tr>`}).join("")}</tbody></table></div>`,()=>{
  const PP={};let bad="";K.forEach((k,i)=>{const row=document.querySelector(`#sheetform tr[data-pk="${CSS.escape(k)}"]`);if(!row)return;const pc=row.querySelector("[data-ppct]").value.trim(),mk=row.querySelector("[data-pmk]").value.trim(),of=row.querySelector("[data-pof]"),t=paperTotal(x,k)||(of&&+of.value)||null;
   const mode=row.dataset.mode;
   if(mode==="marks"&&mk!==""){if(!t){bad=`Enter the total for ${k}, or give a percentage instead.`;return}if(+mk>t){bad=`${k}: pass marks are more than the total (${t}).`;return}PP[k]={mode:"marks",marks:+mk,of:t}}
   else if(pc!==""){if(+pc<0||+pc>100){bad=`${k}: the percentage must be between 0 and 100.`;return}PP[k]={mode:"pct",pct:+pc}}
   else if(mk!==""&&t){PP[k]={mode:"marks",marks:+mk,of:t}}});
  if(bad)return fail(bad);
  const before=JSON.stringify(x.passPaper||{});x.passPaper=PP;
  if(before!==JSON.stringify(PP))xlog(x,`Pass marks by paper: ${Object.keys(PP).length?Object.keys(PP).map(k=>`${k} ${passLabel(x,k)}`).join("; "):"all papers use the exam pass mark"}`);
  toast("Pass marks saved; pass and fail updated");return true},"Save pass marks");
 const f=document.querySelector("#sheetform tr.focusrow [data-ppct]");if(f){f.focus();f.select()}}
/* typing a percentage fills the marks, and the other way round */
document.addEventListener("input",e=>{const t=e.target,row=t.closest&&t.closest("#sheetform tr[data-pk]");if(!row)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;
 const k=row.dataset.pk,of=row.querySelector("[data-pof]"),T=paperTotal(x,k)||(of&&+of.value)||null,pc=row.querySelector("[data-ppct]"),mk=row.querySelector("[data-pmk]");
 if(t.dataset.ppct!=null){row.dataset.mode="pct";mk.value=t.value!==""&&T?Math.ceil(+t.value*T/100-1e-9):""}
 if(t.dataset.pmk!=null){row.dataset.mode="marks";pc.value=t.value!==""&&T?(+t.value/T*100).toFixed(1):""}
 if(t.dataset.pof!=null){if(row.dataset.mode==="marks"&&mk.value!==""&&T)pc.value=(+mk.value/T*100).toFixed(1);else if(pc.value!==""&&T)mk.value=Math.ceil(+pc.value*T/100-1e-9)}});
document.addEventListener("click",e=>{const c=e.target.closest("[data-pclr]");if(c){const row=c.closest("tr");row.querySelectorAll("input").forEach(i=>{if(!i.dataset.pof)i.value=""});delete row.dataset.mode;return}
 const b=e.target.closest('[data-act="ex-passm"]');if(!b)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;const d=document.createElement("textarea");d.innerHTML=b.dataset.sp||"";sheetPassMarks(x,d.value)});
/* Papers tab: a pass-mark button on each paper and one for all papers */
{const _p=exPapersTab;exPapersTab=function(x){let h=_p(x);if(isViewer())return h;
 h=h.replace('<div class="actions" style="justify-content:flex-start">','<div class="actions" style="justify-content:flex-start"><button class="btn small" data-act="ex-passm">Pass marks by paper</button>');
 return h.replace(/<button class="btn small" data-act="ex-att" data-sp="([^"]*)">Attendance sheet<\/button>/g,(m,k)=>{const d=document.createElement("textarea");d.innerHTML=k;const key=d.value;const set=!!(x.passPaper||{})[key];
  return`<button class="btn small ${set?"":"ghostish"}" data-act="ex-passm" data-sp="${k}" title="Pass mark for this paper">Pass: ${esc(passLabel(x,key).replace(" (exam default)",""))}</button>`+m})}}
