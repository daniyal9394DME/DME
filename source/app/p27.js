
/* =====================================================================
   V25 · OFFICIAL RESULT SHEETS: results that came as signed mark sheets
   (PDF / Excel) instead of Evalbee files. Imported from a prepared
   "dme-exam-results" file in Settings, matched to trainees, and shown on
   each PGT's profile. The pass / fail written on the signed sheet is kept
   as the official result; otherwise each department's pass mark applies.
   ===================================================================== */
function exPass(x,p,m){const r=x&&x.res&&p&&x.res[p.id];if(r)return r==="Pass";
 const pm=x&&x.passSpec&&p&&x.passSpec[p.spec]!=null?+x.passSpec[p.spec]:+(x?x.passMark:50);return +m>=pm}
UI.exr=null;
const exrNorm=s=>String(s||"").toLowerCase().replace(/^dr\.?\s+/,"").replace(/[^a-z]/g,"");
function exrGuess(b){const k=v=>String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"");return(DB.exams.find(x=>x.month===b.month)||DB.exams.find(x=>k(x.session)===k(b.session))||{}).id||"new"}
function exrInit(j){const sel=(j.blocks||[]).map(b=>({exam:exrGuess(b),map:b.rows.map(r=>{const p=r.pid&&DB.pgts.find(q=>q.id===r.pid)||(r.pmdc&&DB.pgts.find(q=>String(q.pmdc||"").replace(/\D/g,"").startsWith(String(r.pmdc).replace(/\D/g,""))&&String(r.pmdc).length>=4))||DB.pgts.find(q=>exrNorm(q.name)===exrNorm(r.name));return p?p.id:""})}));
 UI.exr={j,sel};UI.upd=null}
const exrPgtOpts=cur=>`<option value="">Not in the register: keep on the exam only</option>`+DB.pgts.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<option value="${p.id}" ${p.id===cur?"selected":""}>${esc(pgtLabel(p))}${p.reg!=="Verified"?" ("+esc(p.reg||"")+")":""}</option>`).join("");
function exrPanel(){if(!isAdmin()||!UI.exr)return"";const{j,sel}=UI.exr;
 const blocks=j.blocks.map((b,bi)=>{const s=sel[bi],n=s.map.filter(Boolean).length;
  return`<div style="display:grid;gap:8px;border-top:1px solid var(--line);padding-top:10px"><div class="head"><h4 style="margin:0">${esc(b.label)}</h4><span class="subt">${b.rows.length} results · ${n} matched to trainees · ${b.rows.length-n} kept on the exam only</span></div>
  <p class="subt" style="margin:0">Source: ${esc(b.source||"")}. Pass marks on the sheet: ${Object.entries(b.passByDept||{}).map(([k,v])=>esc(k)+" "+v+"%").join(", ")}.</p>
  <label class="f">Put these results in<select data-exr="${bi}|exam">${DB.exams.map(x=>`<option value="${x.id}" ${x.id===s.exam?"selected":""}>${esc(x.title)} · ${esc(x.session)}</option>`).join("")}<option value="new" ${s.exam==="new"?"selected":""}>Create a new exam: ${esc(b.session)}</option></select></label>
  <div class="tblwrap" style="max-height:380px;overflow:auto"><table><thead><tr><th>Name on sheet</th><th>Department</th><th class="num">Marks</th><th class="num">%</th><th>Result</th><th>Trainee in the register</th></tr></thead><tbody>
  ${b.rows.map((r,ri)=>`<tr class="${s.map[ri]?"":"changed"}"><td>${esc(r.name)}<div class="subt">${esc(r.program||"")}${r.roll?" · roll "+esc(r.roll):""}</div></td><td>${esc(r.sheetSpec)}</td><td class="num">${r.obtained}/${r.total}</td><td class="num">${r.pct}</td><td>${r.result==="Pass"?'<span class="pill p-ric">Pass</span>':'<span class="pill p-bad">Fail</span>'}</td><td><select data-exr="${bi}|r|${ri}" aria-label="Trainee for ${esc(r.name)}" style="max-width:320px">${exrPgtOpts(s.map[ri])}</select></td></tr>`).join("")}
  </tbody></table></div></div>`}).join("");
 return`<div class="panel" id="set-exr" style="display:grid;gap:10px"><h3 style="margin:0">Import official results · ${esc(j.title||"")}</h3>
 <p class="subt" style="margin:0">Check the trainee for each name, then import. Rows marked yellow are not matched; they are kept on the exam page so the record stays complete. Importing again later updates the same results and never makes duplicates.</p>${blocks}
 <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="exr-go">Import results</button><button class="btn" data-act="exr-x">Cancel</button></div></div>`}
document.addEventListener("change",e=>{const t=e.target.closest("[data-exr]");if(!t||!UI.exr)return;const[bi,k,ri]=t.dataset.exr.split("|");const s=UI.exr.sel[+bi];
 if(k==="exam")s.exam=t.value;else{const v=t.value;if(v){const o=s.map.indexOf(v);if(o>=0&&o!==+ri&&!confirm(`That trainee is already matched to “${UI.exr.j.blocks[+bi].rows[o].name}”. Move the match here?`)){t.value=s.map[+ri];return}if(o>=0&&o!==+ri)s.map[o]=""}s.map[+ri]=v;const y=window.scrollY;render();window.scrollTo(0,y)}});
function exrApply(){const{j,sel}=UI.exr;let tot=0,ex=0;
 j.blocks.forEach((b,bi)=>{const s=sel[bi];let x=DB.exams.find(e=>e.id===s.exam);
  if(!x){x={id:uid("EX"),title:"Internal PGT Examination",session:b.session,month:b.month,date:b.date||null,venue:"",passMark:Math.min(...Object.values(b.passByDept||{60:60}))||60,scope:"all",stage:0,papers:{},marks:{},absent:{},cands:null,added:[],removed:{},log:[]};DB.exams.push(x);xlog(x,"Examination created for the official result sheet")}
  x.marks=x.marks||{};x.absent=x.absent||{};x.res=x.res||{};x.raw=x.raw||{};x.passSpec=x.passSpec||{};x.removed=x.removed||{};
  const hadMarks=Object.keys(x.marks).length>0,parts=[],specs=new Set();
  b.rows.forEach((r,ri)=>{const p=DB.pgts.find(q=>q.id===s.map[ri]);
   if(!p){x.extra=(x.extra||[]).filter(e=>exrNorm(e.name)!==exrNorm(r.name)||e.sheetSpec!==r.sheetSpec);x.extra.push({name:r.name,sheetSpec:r.sheetSpec,program:r.program||"",obtained:r.obtained,total:r.total,pct:r.pct,result:r.result});ex++;return}
   if(x.extra)x.extra=x.extra.filter(e=>exrNorm(e.name)!==exrNorm(r.name));
   x.marks[p.id]=r.pct;x.raw[p.id]={o:r.obtained,t:r.total};x.res[p.id]=r.result;delete x.absent[p.id];delete x.removed[p.id];
   const pm=(b.passByDept||{})[r.spec];if(pm!=null)x.passSpec[p.spec]=pm;parts.push(p.id);specs.add(p.spec);tot++});
  /* the frozen candidate list: keep everyone who already has a mark, drop listed candidates of these departments the sheet shows did not sit, add every trainee on the sheet */
  const base=(x.cands||(hadMarks?exCands(x).map(p=>p.id):[])).filter(id=>{const p=DB.pgts.find(q=>q.id===id);return p&&(x.marks[id]!=null||x.absent[id]||!specs.has(p.spec))});
  x.cands=[...new Set([...base,...parts])];
  if(!x.date&&b.date)x.date=b.date;x.stage=Math.max(x.stage||0,5);x.resultSource=b.source||"";
  xlog(x,`Official results imported from ${b.source||"the result sheet"}: ${parts.length} trainees${(x.extra||[]).length?`, ${(x.extra||[]).length} names not in the register kept on the exam`:""}`)});
 log(`Imported official exam results: ${tot} trainee results${ex?`, ${ex} kept as exam-only names`:""}`,"exams");
 UI.exr=null;persist();toast(`${tot} results added to trainee profiles`);render()}
document.addEventListener("click",e=>{const a=e.target.closest('[data-act="exr-go"],[data-act="exr-x"]');if(!a)return;if(a.dataset.act==="exr-x"){UI.exr=null;render();return}if(UI.exr)exrApply()});

/* exam page: where the results came from, and names not in the register */
{const _e=examResultsPanel;examResultsPanel=function(x){const E=x.extra||[];
 const src=x.resultSource?`<div class="panel" style="display:grid;gap:8px"><h3 style="margin:0">Official result sheet</h3><p class="subt" style="margin:0">Results imported from <b>${esc(x.resultSource)}</b>. Pass / fail is as written on the signed sheet${x.passSpec&&Object.keys(x.passSpec).length?`; department pass marks: ${Object.entries(x.passSpec).map(([k,v])=>esc(k)+" "+v+"%").join(", ")}`:""}.</p>
 ${E.length?`<p style="margin:4px 0 0"><b>${E.length} name${E.length>1?"s":""} on the sheet not in the trainee register</b> <span class="subt">(left RIC before the register, or other programmes)</span></p><div class="tblwrap"><table><thead><tr><th>Name on sheet</th><th>Department</th><th>Programme</th><th class="num">Marks</th><th class="num">%</th><th>Result</th></tr></thead><tbody>${E.map(r=>`<tr><td>Dr. ${esc(r.name)}</td><td>${esc(r.sheetSpec)}</td><td>${esc(r.program)}</td><td class="num">${r.obtained}/${r.total}</td><td class="num">${r.pct}</td><td>${r.result==="Pass"?'<span class="pill p-ric">Pass</span>':'<span class="pill p-bad">Fail</span>'}</td></tr>`).join("")}</tbody></table></div>`:""}</div>`:"";
 return src+_e(x)}}
VIEW_ACTS.add("exr-x");
