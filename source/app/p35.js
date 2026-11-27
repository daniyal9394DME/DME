
/* =====================================================================
   V33 · COMMON PAPERS: a named paper sat by candidates of all (or some)
   specialties on top of their own paper, e.g. Infection Prevention and
   Control. Each has its own checklist, OMR sheet, key, marks, analysis.
   Marks live in x.cm[name] = {marks, absent, raw, secs}.
   ===================================================================== */
const exCommon=x=>(x.common=x.common||[]);
const exComm=(x,k)=>exCommon(x).find(c=>c.name===k);
const exIsCommon=(x,k)=>!!exComm(x,k);
function exAllPapers(x){return[...exPaperKeys(x),...exCommon(x).map(c=>c.name)]}
function exInPaper(x,p,k){const c=exComm(x,k);if(c)return!c.specs||!c.specs.length||c.specs.includes(p.spec);return exPaperOf(x,p)===k}
function exPM(x,k){if(exIsCommon(x,k)){x.cm=x.cm||{};const M=x.cm[k]=x.cm[k]||{};M.marks=M.marks||{};M.absent=M.absent||{};M.raw=M.raw||{};M.secs=M.secs||{};return M}
 x.marks=x.marks||{};x.absent=x.absent||{};x.raw=x.raw||{};x.secs=x.secs||{};return{marks:x.marks,absent:x.absent,raw:x.raw,secs:x.secs}}
function exPassFor(x,k){const c=exComm(x,k);if(c)return c.pass!=null?+c.pass:x.passMark;const s=exPaperSpec(k);return x.passSpec&&x.passSpec[s]!=null?x.passSpec[s]:x.passMark}
const exCommPass=(x,k,m)=>+m>=exPassFor(x,k);
function omrMissing(x){const used=omrScans(x).filter(z=>z.use&&z.pid),out=[];
 exAllPapers(x).filter(k=>omrSpec(x,k)).forEach(k=>{const M=exPM(x,k);exCands(x).filter(p=>exInPaper(x,p,k)).forEach(p=>{if(!used.some(z=>z.pid===p.id&&z.spec===k)&&!M.absent[p.id])out.push({p,k})})});return out}

/* ---------- add / edit a common paper ---------- */
function sheetCommon(x,c){const n=!c,specs=exSpecs(x);c=c||{name:"",specs:[],pass:x.passMark};
 openSheet(n?"Add a common paper":`Edit · ${c.name}`,`<p class="subt" style="margin:0">A paper sat by candidates of several specialties, besides their own paper, e.g. Infection Prevention and Control.</p>
 <label class="f">Name of the paper<input name="nm" value="${esc(c.name)}" placeholder="e.g. Infection Prevention and Control"></label>
 <div class="f"><span>Who sits it</span><label class="check2"><input type="radio" name="who" value="all" ${!c.specs.length?"checked":""}> All candidates of this exam</label><label class="check2"><input type="radio" name="who" value="some" ${c.specs.length?"checked":""}> Only these specialties:</label>
  <div class="chips" id="cm-specs">${specs.map(s=>`<label class="chip"><input type="checkbox" name="cs" value="${esc(s)}" ${c.specs.includes(s)?"checked":""}> ${esc(s)}</label>`).join("")}</div></div>
 <label class="f">Pass mark (%)<input type="number" name="pm" min="0" max="100" value="${c.pass??x.passMark}"></label>`,()=>{
  const nm=fv("nm").replace(/\s+/g," ").trim();if(nm.length<3)return fail("Enter the name of the paper.");if(nm.length>40)return fail("Keep the name under 40 characters (it is printed on the sheet).");
  if(nm.includes(" · ")||exPaperKeys(x).some(k=>k.toLowerCase()===nm.toLowerCase())||exCommon(x).some(o=>o!==c&&o.name.toLowerCase()===nm.toLowerCase()))return fail("Use a name that is not a specialty or another paper.");
  const some=document.querySelector('#sheetform [name="who"]:checked')?.value==="some",cs=[...document.querySelectorAll('#sheetform [name="cs"]:checked')].map(i=>i.value);if(some&&!cs.length)return fail("Tick at least one specialty, or choose all candidates.");
  const rec={name:nm,specs:some?cs:[],pass:+fv("pm")||x.passMark};
  if(n){exCommon(x).push(rec);xlog(x,`Common paper added: ${nm}`)}
  else{const old=c.name;if(old!==nm){const O=omrOf(x);if(O.specs[old]){O.specs[nm]=O.specs[old];delete O.specs[old]}if(x.papers&&x.papers[old]){x.papers[nm]=x.papers[old];delete x.papers[old]}if(x.cm&&x.cm[old]){x.cm[nm]=x.cm[old];delete x.cm[old]}omrScans(x).forEach(z=>{if(z.spec===old)z.spec=nm})}Object.assign(c,rec);xlog(x,`Common paper edited: ${nm}`)}
  toast("Saved");return true})}

/* ---------- Papers tab: common papers after the specialties ---------- */
function exCommonBlocks(x){const C=exCands(x),lk=x.stage>=3;
 const rows=exCommon(x).map(c=>{const k=c.name,pp=(x.papers||{})[k]||{},s=omrSpec(x,k),cn=C.filter(p=>exInPaper(x,p,k)).length,kd=s?omrKeyDone(s):0,used=omrScans(x).some(z=>z.spec===k)||Object.keys(exPM(x,k).marks).length;
  const cb=(f,l)=>`<label class="exck ${pp[f]?"on":""}"><input type="checkbox" data-expc="${esc(k)}|${f}" ${pp[f]?"checked":""} ${lk?"disabled":""}> ${l}</label>`;
  return`<div class="exp"><div class="exp-h" style="justify-content:space-between;flex-wrap:wrap"><span><b>${esc(k)}</b> <span class="subt">${cn} candidate${cn===1?"":"s"} · ${c.specs.length?esc(c.specs.join(", ")):"all specialties"} · pass ${exPassFor(x,k)}%</span></span><span class="actions"><button class="btn small" data-act="cm-edit" data-k="${esc(k)}">Edit</button><button class="btn small" data-act="cm-del" data-k="${esc(k)}" data-used="${used?1:0}">Remove</button></span></div>
   <div class="exp-g"><div><div class="subt">Question paper</div><div class="exck-row">${cb("req","Requested")}${cb("recv","Received")}${cb("key","Key received")}${cb("mod","Moderated")}${cb("final","Final")}</div>
    <div class="toolbar" style="margin-top:6px"><input data-expc="${esc(k)}|focal" value="${esc(pp.focal||"")}" list="ex-fac" placeholder="Focal person" aria-label="Focal person, ${esc(k)}" style="flex:1 1 180px" ${lk?"disabled":""}><input type="number" min="0" data-expc="${esc(k)}|mcqs" value="${pp.mcqs??""}" placeholder="No. of MCQs" style="width:120px" aria-label="Number of MCQs, ${esc(k)}" ${lk?"disabled":""}></div></div>
    <div><div class="subt">OMR answer sheet</div>${s?`<div style="margin:4px 0">${s.n} questions · ${s.opts===4?"A-D":"A-E"}${s.sections.length?` · ${s.sections.length} sections`:""} · key ${kd===s.n?'<span class="pill p-ric">complete</span>':`<span class="pill p-pause">${kd}/${s.n}</span>`}${s.printed?` · <span class="subt">printed ${fd(s.printed.at.slice(0,10))}</span>`:""}</div>`:`<div class="subt" style="margin:4px 0">Not set up yet</div>`}
     <div class="actions" style="justify-content:flex-start"><button class="btn small ${s?"":"primary"}" data-act="omr-setup" data-sp="${esc(k)}">${s?"Sheet setup":"Set up sheet"}</button>${s?`<button class="btn small" data-act="omr-key" data-sp="${esc(k)}">Answer key</button><button class="btn small" data-act="omr-print" data-sp="${esc(k)}">Print sheets</button>`:""}</div></div></div></div>`}).join("");
 return`<div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Common papers <span class="subt" style="text-transform:none;letter-spacing:0">· sat as well as the specialty paper</span></h3><button class="btn small primary" data-act="cm-add">Add a common paper</button></div>
  ${rows||`<p class="subt" style="margin:0">None. Add one for a paper everybody sits on the same day, for example Infection Prevention and Control. It gets its own OMR sheet, answer key and marks, and the result shows on each PGT's profile next to the specialty paper.</p>`}</div>`}
{const _p=exPapersTab;exPapersTab=function(x){return _p(x)+exCommonBlocks(x)}}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="cm-add"],[data-act="cm-edit"],[data-act="cm-del"]');if(!b)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;
 if(b.dataset.act==="cm-add")return sheetCommon(x);const c=exComm(x,b.dataset.k);if(!c)return;
 if(b.dataset.act==="cm-edit")return sheetCommon(x,c);
 if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent=b.dataset.used==="1"?"Its marks and scans will be deleted · tap again":"Tap again to remove";return}
 x.common=exCommon(x).filter(o=>o!==c);delete omrOf(x).specs[c.name];if(x.papers)delete x.papers[c.name];if(x.cm)delete x.cm[c.name];omrScans(x).forEach(z=>{if(z.spec===c.name)z.use=false});xlog(x,`Common paper removed: ${c.name}`);persist();render()});

/* ---------- Results tab: every paper, specialty and common ---------- */
exResultsTab=function(x){const keys=exAllPapers(x),C=exCands(x),canMark=x.stage>=3&&x.stage<5;const scan=omrScanPanel(x);
 const tables=keys.map(k=>{const com=exIsCommon(x,k),M=exPM(x,k),P=C.filter(p=>exInPaper(x,p,k)).sort((a,b)=>(com?specIdx(a.spec)-specIdx(b.spec):0)||(x.roll?.[a.id]||"").localeCompare(x.roll?.[b.id]||"")||a.name.localeCompare(b.name));const done=P.filter(p=>M.marks[p.id]!=null||M.absent[p.id]).length;
  const mk=p=>com?`data-excm="${esc(k)}|${p.id}"`:`data-exmark="${p.id}"`,ab=p=>com?`data-excab="${esc(k)}|${p.id}"`:`data-exabs="${p.id}"`,pass=(p,m)=>com?exCommPass(x,k,m):exPass(x,p,m);
  return`<details class="exres" ${UI.exOpen===k?"open":""} data-exopen="${esc(k)}"><summary><b>${esc(k)}</b>${com?' <span class="pill p-rot">common</span>':""} <span class="subt">${done} of ${P.length} done</span></summary><div class="tblwrap"><table><thead><tr><th>Roll</th><th>PGT</th>${com?"<th>Specialty</th>":""}<th>Year</th><th>Marks %</th><th>Absent</th><th>Result</th><th class="num">Correct</th></tr></thead><tbody>
  ${P.map(p=>{const m=M.marks[p.id],a=M.absent[p.id],r=M.raw[p.id];return`<tr><td class="code">${esc(x.roll?.[p.id]||"")}</td><td>${pgtName(p)}</td>${com?`<td class="subt">${esc(p.spec)}</td>`:""}<td>${exYr(x,p)}</td><td><input type="number" min="0" max="100" step="0.1" style="width:86px" ${mk(p)} value="${m??""}" ${canMark&&!a?"":"disabled"} aria-label="Marks for Dr. ${esc(p.name)}, ${esc(k)}"></td><td><input type="checkbox" ${ab(p)} ${a?"checked":""} ${canMark?"":"disabled"} aria-label="Absent, ${esc(k)}"></td>
   <td>${a?'<span class="pill p-done">Absent</span>':m==null?"—":pass(p,m)?'<span class="pill p-ric">Pass</span>':'<span class="pill p-bad">Fail</span>'}</td><td class="num subt">${r?`${r.o}/${r.t}`:""}</td></tr>`}).join("")}</tbody></table></div></details>`}).join("");
 return`${x.stage<3?`<div class="flag info">Marks can be entered once the exam is marked as held. You can still try the OMR scanner here, for example on a practice exam.</div>`:""}
 ${scan||`<div class="panel"><h3 style="margin:0">Scan answer sheets</h3><p class="subt" style="margin:6px 0 0">Set up the OMR sheet for at least one paper (Papers tab) first.</p></div>`}
 <div class="panel" style="display:grid;gap:8px"><h3 style="margin:0">Marks by paper</h3><p class="subt" style="margin:0">Scanned results land here. You can also type a mark or tick absent by hand.</p>${tables||'<p class="subt">No papers.</p>'}</div>
 <details class="panel"><summary style="cursor:pointer"><b>Using Evalbee instead</b> <span class="subt">upload Evalbee result files</span></summary><div style="margin-top:10px">${exImportOrig(x)}</div></details>`};
document.addEventListener("change",e=>{const t=e.target,d=t.dataset||{};if(d.excm==null&&d.excab==null)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;
 const[k,pid]=(d.excm||d.excab).split("|"),M=exPM(x,k),p=DB.pgts.find(q=>q.id===pid);
 if(d.excab!=null){if(t.checked){M.absent[pid]=true;delete M.marks[pid]}else delete M.absent[pid];xlog(x,`${k}: Dr. ${p?p.name:""} ${t.checked?"absent":"not absent"}`)}
 else{const v=t.value.trim();if(v!==""&&(+v<0||+v>100)){toast("Marks must be between 0 and 100");t.value=M.marks[pid]??"";return}if(v==="")delete M.marks[pid];else M.marks[pid]=+v}
 persist();const y=window.scrollY;render();window.scrollTo(0,y)});

/* ---------- on the PGT's profile, and in the exam download ---------- */
function pgtCommonRows(p){const out=[];DB.exams.filter(x=>!x.practice&&x.cm).forEach(x=>Object.entries(x.cm).forEach(([k,M])=>{if(M.marks&&M.marks[p.id]!=null||M.absent&&M.absent[p.id])out.push({x,k,m:M.marks[p.id],ab:!!(M.absent&&M.absent[p.id]),r:M.raw&&M.raw[p.id]})}));return out.sort((a,b)=>a.x.month<b.x.month?1:-1)}
{const _x=pgtExamPanel;pgtExamPanel=function(p){const R=pgtCommonRows(p),h=_x(p);if(!R.length)return h;
 return h+`<div class="panel flush"><h3 style="padding:14px 16px 0;margin:0">Other exam papers · ${R.length}</h3><div class="tblwrap" style="margin-top:8px"><table><thead><tr><th>Exam</th><th>Paper</th><th class="num">Marks %</th><th>Result</th></tr></thead><tbody>
 ${R.map(r=>`<tr class="click" data-href="exam-${r.x.id}"><td>${esc(r.x.session)}${r.x.stage>=5?"":' <span class="pill p-pause">Provisional</span>'}</td><td>${esc(r.k)}</td><td class="num">${r.ab?"—":r.m}${r.r?` <span class="subt">(${r.r.o}/${r.r.t})</span>`:""}</td><td>${r.ab?'<span class="pill p-done">Absent</span>':exCommPass(r.x,r.k,r.m)?'<span class="pill p-ric">Pass</span>':'<span class="pill p-bad">Fail</span>'}</td></tr>`).join("")}</tbody></table></div></div>`}}
{const _e=EXPORTS.exam;EXPORTS.exam=id=>{const r=_e(id),x=DB.exams.find(e=>e.id===id);exCommon(x).forEach(c=>{const M=exPM(x,c.name);r.sheets.push(sheetFrom(c.name.slice(0,31),exCands(x).filter(p=>exInPaper(x,p,c.name)).map(p=>{const m=M.marks[p.id],ab=M.absent[p.id];return{"Roll no.":x.roll?.[p.id]||"","PGT ID":p.code,"Name":"Dr. "+p.name,"Specialty":p.spec,"Marks %":ab?"":m??"","Result":ab?"Absent":m==null?"":exCommPass(x,c.name,m)?"Pass":"Fail"}})))});return r}}
