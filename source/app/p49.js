/* =====================================================================
   V48 · PART OF A PAPER FOR ONE CANDIDATE. A candidate who was to
   attempt only some of the questions (e.g. Q1–50 of a 100-question
   paper) is marked on those questions only: score and total come from
   that range, re-marking keeps it, the result sheet notes it, and the
   item analysis leaves that sheet out.
   ===================================================================== */
{const _s=omrScore;omrScore=function(x,s){if(!s||!s.only)return _s(x,s);const sp=omrSpec(x,s.spec),A=omrFinal(x,s);if(!sp||!A)return null;
 const[f,t]=s.only,key=omrKeyArr(sp),drop=new Set(sp.drop||[]),alt=sp.alt||{},secs={},secOf=q=>(sp.sections||[]).find(z=>q>=z.from&&q<=z.to);let o=0,n=0;
 for(let i=0;i<sp.n;i++){const q=i+1;if(q<f||q>t||drop.has(q)||!key[i])continue;n++;const ok=A[i]&&(A[i]===key[i]||alt[q]===A[i]);if(ok)o++;const z=secOf(q);if(z){secs[z.name]=secs[z.name]||[0,0];secs[z.name][1]++;if(ok)secs[z.name][0]++}}
 return{o,t:n,pct:n?Math.round(o/n*1000)/10:0,secs}}}
function sheetOmrPart(x,s){const sp=omrSpec(x,s.spec),p=DB.pgts.find(q=>q.id===s.pid);if(!sp)return;const n=sp.n,[f,t]=s.only||[1,Math.min(n,50)];
 openSheet("Mark part of the paper",`<p style="margin:0"><b>${p?`Dr. ${esc(p.name)}`:"This sheet"}</b> · ${esc(s.spec)} · ${n} questions</p>
 <p class="subt" style="margin:0">Only the questions in this range are marked for this candidate; the total becomes the number of questions in it (less any dropped). Everyone else is marked on the whole paper.</p>
 <div class="grid2"><label class="f">From question<input type="number" name="f" min="1" max="${n}" value="${f}"></label><label class="f">To question<input type="number" name="t" min="1" max="${n}" value="${t}"></label></div>
 <label class="f">Reason <span class="h">optional, kept in the exam history</span><input name="why" value="${esc(s.onlyWhy||"")}" placeholder="e.g. attempted the first 50 as agreed"></label>
 ${s.only?`<div class="actions" style="justify-content:flex-start"><button type="button" class="btn" data-act="omr-partclr" data-id="${s.id}">Mark the whole paper again</button></div>`:""}`,()=>{
  const F=+fv("f"),T=+fv("t");if(!(F>=1&&T<=n&&F<=T))return fail(`Enter a range between 1 and ${n}.`);if(F===1&&T===n){delete s.only;delete s.onlyWhy}else{s.only=[F,T];s.onlyWhy=fv("why").trim()}
  xlog(x,`OMR: ${p?`Dr. ${p.name}`:"sheet "+s.file} marked on questions ${F}–${T} only (${s.spec})${s.onlyWhy?`: ${s.onlyWhy}`:""}`);omrPartRemark(x,s)},"Save")}
function omrPartRemark(x,s){if(!s.pid||!s.spec)return;const M=exPM(x,s.spec);if(M.marks[s.pid]==null||omrNeeds(x,s))return;const sc=omrScore(x,s);if(!sc)return;
 M.marks[s.pid]=sc.pct;M.raw[s.pid]={o:sc.o,t:sc.t};M.secs[s.pid]=sc.secs;toast(`Re-marked: ${sc.o} of ${sc.t} (${sc.pct}%)`)}
document.addEventListener("click",e=>{const b=e.target.closest("[data-omrpart],[data-act=\"omr-partclr\"]");if(!b||!DB||!DB.exams)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;
 const s=omrScans(x).find(z=>z.id===(b.dataset.omrpart||b.dataset.id));if(!s)return;
 if(b.dataset.omrpart){sheetOmrPart(x,s);return}
 delete s.only;delete s.onlyWhy;const p=DB.pgts.find(q=>q.id===s.pid);xlog(x,`OMR: ${p?`Dr. ${p.name}`:"sheet "+s.file} marked on the whole paper again (${s.spec})`);omrPartRemark(x,s);persist();closeSheet();render()});
/* the result sheet says who was marked on part of the paper */
{const _d=rsData;rsData=function(x,k,spec,o){const d=_d(x,k,spec,o);const S=omrScans(x).filter(s=>s.use&&s.spec===k&&s.only);if(!S.length)return d;
 d.R.forEach(r=>{const s=S.find(z=>z.pid===r.p.id);if(s&&r.m!=null)r.part=s.only});
 d.R.filter(r=>r.part).forEach(r=>d.notes.push(`* Dr. ${r.p.name} was marked on questions ${r.part[0]}–${r.part[1]} only${r.tt?` (out of ${r.tt})`:""}.`));return d}}
{const _c=rsCols;rsCols=function(d,o){const C=_c(d,o),m=C.find(c=>c.h==="Marks");if(m){const v=m.v;m.v=(r,i)=>v(r,i)+(r.part?" *":"")}return C}}
