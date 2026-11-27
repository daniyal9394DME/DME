
/* =====================================================================
   V35 · CHANGE THE PAPERS OF AN EXAM AT ANY STAGE: a specialty can be
   taken out of one exam session (its PGTs leave the candidate list,
   papers, sheets and attendance) and put back later; nothing is deleted.
   ===================================================================== */
const exNoSpec=x=>(x.noSpec=x.noSpec||[]);
{const _c=exCands;exCands=function(x){const L=_c(x),N=x&&x.noSpec;return N&&N.length?L.filter(p=>!N.includes(p.spec)):L}}
{const _p=exPapersTab;exPapersTab=function(x){let h=_p(x);
 h=h.replace(/(<select data-exsplit="([^"]*)"[^>]*>[\s\S]*?<\/select>)/g,(m,sel,sp)=>`<span class="actions" style="flex-wrap:nowrap">${sel}<button class="btn small" data-act="ex-nospec" data-sp="${sp}" title="Take this specialty out of this exam session">Remove from exam</button></span>`);
 const N=exNoSpec(x);
 if(N.length)h=h.replace('<div class="actions" style="justify-content:flex-start">',`<div class="flag" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span>Not in this exam:</span>${N.map(s=>`<button class="btn small" data-act="ex-yesspec" data-sp="${esc(s)}">${esc(s)} · put back</button>`).join("")}</div><div class="actions" style="justify-content:flex-start">`);
 return h}}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="ex-nospec"],[data-act="ex-yesspec"]');if(!b)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;
 const t=document.createElement("textarea");t.innerHTML=b.dataset.sp;const sp=t.value,N=exNoSpec(x);
 if(b.dataset.act==="ex-yesspec"){x.noSpec=N.filter(s=>s!==sp);const ids=(x.noSpecIds||{})[sp]||[];if(x.cands)ids.forEach(id=>{if(!x.cands.includes(id))x.cands.push(id)});if(x.noSpecIds)delete x.noSpecIds[sp];xlog(x,`${sp} put back into this exam`);persist();render();return}
 const n=exCands(x).filter(p=>p.spec===sp).length,marked=exCands(x).filter(p=>p.spec===sp&&(x.marks[p.id]!=null)).length;
 if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent=`${n} PGTs leave this exam${marked?`, ${marked} with marks (kept, hidden)`:""} · tap again`;return}
 x.noSpecIds=x.noSpecIds||{};x.noSpecIds[sp]=exCands(x).filter(p=>p.spec===sp).map(p=>p.id);N.push(sp);xlog(x,`${sp} taken out of this exam (${n} candidates)`);persist();render();toast(`${sp} removed from this exam. Put it back any time from the Papers tab.`)});
