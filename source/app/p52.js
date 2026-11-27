/* =====================================================================
   V51 · SEQ (short essay question) SECTION. Any paper can have an SEQ
   part: number of questions and the marks for each. SEQ marks are
   entered by hand (or from an Excel sheet) per candidate; the final
   result is (MCQ obtained + SEQ obtained) / (MCQ total + SEQ total).
   The MCQ part keeps coming from the OMR scan, Evalbee or a typed
   percentage exactly as before; once a candidate's SEQ marks are all
   in, their mark everywhere (results, pass/fail, analysis, profile,
   result sheet) becomes the combined percentage.
   Storage: x.seqd[paper] = {n, max:[..], mcqT, m:{pid:[..]}, mcq:{pid:%}, comb:{pid:%}}
   ===================================================================== */
const seqCfg=(x,k)=>{const D=x&&x.seqd&&x.seqd[k];return D&&D.n>0?D:null};
const seqTotal=D=>(D.max||[]).reduce((a,b)=>a+(+b||0),0);
/* the MCQ total of a paper (questions less dropped ones), before any SEQ is added */
const seqMcqBase=paperTotal;
function seqMcqTotal(x,k){const D=seqCfg(x,k);return(D&&+D.mcqT)||seqMcqBase(x,k)||null}
{const _t=paperTotal;paperTotal=function(x,k){const D=seqCfg(x,k);if(!D)return _t(x,k);const m=seqMcqTotal(x,k);return m!=null?m+seqTotal(D):null}}
const seqR=v=>Math.round(v*100)/100;
/* one candidate's MCQ, SEQ and combined figures */
function seqInfo(x,k,pid){const D=seqCfg(x,k);if(!D)return null;const M=exPM(x,k),cur=M.marks[pid];
 const mcqPct=D.mcq&&D.mcq[pid]!=null?D.mcq[pid]:(D.comb&&D.comb[pid]!=null?null:cur??null);
 const raw=M.raw&&M.raw[pid];let mcqT=seqMcqTotal(x,k),mcqO=null;
 if(mcqPct!=null){if(raw&&raw.t&&Math.abs(raw.o/raw.t*100-mcqPct)<.06){mcqO=raw.o;mcqT=raw.t}else if(mcqT)mcqO=seqR(mcqPct*mcqT/100)}
 const v=(D.m&&D.m[pid])||[],vals=Array.from({length:D.n},(_,i)=>v[i]==null||v[i]===""?null:+v[i]),seqT=seqTotal(D);
 const done=vals.filter(a=>a!=null).length,complete=done===D.n,seqO=seqR(vals.reduce((a,b)=>a+(b||0),0));
 const ok=complete&&mcqO!=null&&mcqT;const o=ok?seqR(mcqO+seqO):null,t=ok?mcqT+seqT:null,pct=ok&&t?Math.round(o/t*1000)/10:null;
 return{mcqPct,mcqO,mcqT,vals,done,complete,seqO,seqT,o,t,pct,absent:!!M.absent[pid]}}
/* keep each candidate's mark in step: a new MCQ mark from anywhere is kept as the MCQ part, and the
   combined figure replaces it once the SEQ marks are complete */
function seqSyncExam(x){if(!x||!x.seqd)return false;let ch=false;
 Object.keys(x.seqd).forEach(k=>{const D=seqCfg(x,k);if(!D)return;D.m=D.m||{};D.mcq=D.mcq||{};D.comb=D.comb||{};const M=exPM(x,k),com=exIsCommon(x,k);
  exCands(x).filter(p=>exInPaper(x,p,k)).forEach(p=>{const pid=p.id,cur=M.marks[pid];
   if(cur==null){if(D.mcq[pid]!=null||D.comb[pid]!=null){delete D.mcq[pid];delete D.comb[pid];ch=true}return}
   if(!(D.comb[pid]!=null&&Math.abs(cur-D.comb[pid])<1e-6)){if(D.mcq[pid]!==cur){D.mcq[pid]=cur;ch=true}if(D.comb[pid]!=null){delete D.comb[pid];ch=true}}
   const I=seqInfo(x,k,pid);
   if(I.pct!=null){if(M.marks[pid]!==I.pct||D.comb[pid]!==I.pct){M.marks[pid]=I.pct;D.comb[pid]=I.pct;ch=true}if(!com&&x.res&&x.res[pid]){delete x.res[pid];ch=true}}
   else if(D.comb[pid]!=null){M.marks[pid]=D.mcq[pid];delete D.comb[pid];ch=true}})});
 return ch}
function seqSyncAll(){let ch=false;(DB.exams||[]).forEach(x=>{if(x.seqd&&seqSyncExam(x))ch=true});if(ch)persist();return ch}
{const _r=render;render=function(...a){if(DB&&DB.exams)try{seqSyncAll()}catch(e){console.warn(e)}return _r.apply(this,a)}}

/* ---------- setting up the SEQ part of a paper ---------- */
function sheetSeqCfg(x,k){const D=x.seqd&&x.seqd[k]||null,n0=D?D.n:4,max0=D?D.max:Array(4).fill(10),base=seqMcqBase(x,k);
 const rows=(n,max)=>Array.from({length:n},(_,i)=>`<label class="f" style="min-width:90px">SEQ ${i+1}<input type="number" min="0" step="0.5" data-seqmax="${i}" value="${max[i]??""}"></label>`).join("");
 openSheet(`SEQ section · ${k}`,`<label class="check2"><input type="checkbox" name="on" ${D?"checked":""}> This paper has a short essay question (SEQ) section</label>
 <div class="grid2"><label class="f">Number of SEQs<input type="number" name="n" min="1" max="30" value="${n0}"></label><label class="f">Total SEQ marks<input type="number" name="tot" min="1" step="0.5" value="${seqTotal({max:max0})}"></label></div>
 <div style="display:grid;gap:6px"><span class="subt">Marks for each SEQ (filled in equally from the total; change any of them)</span><div id="seq-maxes" style="display:flex;flex-wrap:wrap;gap:8px">${rows(n0,max0)}</div></div>
 <label class="f">MCQ marks for this paper ${base?`<span class="h">from the answer sheet: ${base}</span>`:`<span class="h">needed when MCQ marks were typed as percentages</span>`}<input type="number" name="mcqT" min="1" value="${D&&D.mcqT||base||""}"></label>
 <div class="flag info">Final mark = (MCQ marks obtained + SEQ marks obtained) ÷ (MCQ total + SEQ total). Until a candidate's SEQ marks are all entered, the result shows as awaited on the result sheet.</div>`,()=>{
  const on=document.querySelector('#sheetform [name="on"]').checked;x.seqd=x.seqd||{};
  if(!on){if(x.seqd[k]){const M=exPM(x,k),E=x.seqd[k];Object.keys(E.comb||{}).forEach(pid=>{if(E.mcq&&E.mcq[pid]!=null)M.marks[pid]=E.mcq[pid]});delete x.seqd[k];xlog(x,`SEQ section removed from ${k}; marks are MCQ only again`)}return true}
  const n=+fv("n");if(!(n>=1&&n<=30))return fail("Enter the number of SEQs (1 to 30).");
  const max=[...document.querySelectorAll("#seq-maxes [data-seqmax]")].slice(0,n).map(i=>+i.value);if(max.length<n||max.some(v=>!(v>0)))return fail("Enter the marks for every SEQ.");
  const mcqT=+fv("mcqT")||null;if(!mcqT&&!base)return fail("Enter the MCQ marks for this paper.");
  const old=x.seqd[k]||{m:{},mcq:{},comb:{}};x.seqd[k]={...old,n,max,mcqT:mcqT&&mcqT!==base?mcqT:null};
  Object.values(x.seqd[k].m||{}).forEach(a=>{if(a.length>n)a.length=n});
  xlog(x,`SEQ section for ${k}: ${n} questions, ${seqTotal(x.seqd[k])} marks (${max.join(" + ")}); MCQ ${mcqT||base} marks`);seqSyncExam(x);return true},"Save")}
document.addEventListener("input",e=>{const f=e.target.closest&&e.target.closest("#sheetform");if(!f||!document.getElementById("seq-maxes"))return;const nm=e.target.name;if(nm!=="n"&&nm!=="tot")return;
 const n=Math.max(1,Math.min(30,+f.querySelector('[name="n"]').value||1)),tot=+f.querySelector('[name="tot"]').value||0,each=tot?Math.round(tot/n*2)/2:"";
 const box=document.getElementById("seq-maxes");box.innerHTML=Array.from({length:n},(_,i)=>`<label class="f" style="min-width:90px">SEQ ${i+1}<input type="number" min="0" step="0.5" data-seqmax="${i}" value="${each}"></label>`).join("")});

/* Papers tab: an SEQ button beside each paper's sheet buttons */
{const _p=exPapersTab;exPapersTab=function(x){const h=_p(x);return h.replace(/<button class="btn small\s*(primary)?\s*" data-act="omr-setup" data-sp="([^"]*)">/g,(m,pr,ke)=>{const t=document.createElement("textarea");t.innerHTML=ke;const D=seqCfg(x,t.value);
 return`<button class="btn small" data-seqcfg="${ke}">${D?`SEQ: ${D.n} × · ${seqTotal(D)} marks`:"Add SEQ section"}</button>${m}`})}}

/* ---------- entering SEQ marks: the paper's table on the Results tab ---------- */
function seqPaperBlock(x,k){const D=seqCfg(x,k),com=exIsCommon(x,k),M=exPM(x,k),canMark=x.stage>=3&&x.stage<5&&!isViewer();
 const P=exCands(x).filter(p=>exInPaper(x,p,k)).sort((a,b)=>(com?specIdx(a.spec)-specIdx(b.spec):0)||(x.roll?.[a.id]||"").localeCompare(x.roll?.[b.id]||"")||a.name.localeCompare(b.name));
 const I=P.map(p=>[p,seqInfo(x,k,p.id)]),done=I.filter(([p,i])=>i.absent||i.pct!=null).length,seqDone=I.filter(([p,i])=>i.complete).length;
 const mk=p=>com?`data-excm="${esc(k)}|${p.id}"`:`data-exmark="${p.id}"`,ab=p=>com?`data-excab="${esc(k)}|${p.id}"`:`data-exabs="${p.id}"`;
 return`<details class="exres" ${UI.exOpen===k?"open":""} data-exopen="${esc(k)}"><summary><b>${esc(k)}</b>${com?' <span class="pill p-rot">common</span>':""} <span class="pill p-pend">MCQ + SEQ</span> <span class="subt">${done} of ${P.length} final · SEQ entered for ${seqDone}</span></summary>
 <div class="actions" style="justify-content:flex-start;margin:8px 0"><button class="btn small" data-seqcfg="${esc(k)}">SEQ settings</button><button class="btn small" data-seqxl="${esc(k)}">Download SEQ marks sheet</button>${canMark?`<label class="btn small" for="seq-up-${esc(k).replace(/[^a-z0-9]/gi,"_")}">Upload SEQ marks (Excel)</label><input type="file" id="seq-up-${esc(k).replace(/[^a-z0-9]/gi,"_")}" class="sr" accept=".xlsx,.xls,.csv" data-sequp="${esc(k)}">`:""}
  <span class="subt">MCQ ${seqMcqTotal(x,k)??"?"} + SEQ ${seqTotal(D)} = ${(seqMcqTotal(x,k)||0)+seqTotal(D)} marks · Enter moves down a column</span></div>
 <div class="tblwrap"><table class="seqtbl"><thead><tr><th>Roll</th><th>PGT</th>${com?"<th>Specialty</th>":""}<th>MCQ %</th><th class="num">MCQ</th>${D.max.map((m,i)=>`<th class="num">SEQ ${i+1}<div class="subt">/ ${m}</div></th>`).join("")}<th class="num">SEQ</th><th class="num">Total</th><th class="num">%</th><th>Absent</th><th>Result</th></tr></thead><tbody>
 ${I.map(([p,i])=>`<tr data-seqrow="${esc(k)}|${p.id}"><td class="code">${esc(x.roll?.[p.id]||"")}</td><td>${pgtName(p)}</td>${com?`<td class="subt">${esc(p.spec)}</td>`:""}
  <td><input type="number" min="0" max="100" step="0.1" style="width:76px" ${mk(p)} value="${i.mcqPct??""}" ${canMark&&!i.absent?"":"disabled"} aria-label="MCQ % for Dr. ${esc(p.name)}"></td>
  <td class="num subt">${i.mcqO!=null?`${i.mcqO}/${i.mcqT}`:"—"}</td>
  ${i.vals.map((v,j)=>`<td><input type="number" min="0" max="${D.max[j]}" step="0.5" style="width:62px" data-seqm="${esc(k)}|${p.id}|${j}" value="${v??""}" ${canMark&&!i.absent?"":"disabled"} aria-label="SEQ ${j+1} for Dr. ${esc(p.name)}"></td>`).join("")}
  ${seqCells(x,k,p,i)}<td><input type="checkbox" ${ab(p)} ${i.absent?"checked":""} ${canMark?"":"disabled"} aria-label="Absent, ${esc(k)}"></td><td data-seqc="res">${seqRes(x,k,p,i)}</td></tr>`).join("")}
 </tbody></table></div></details>`}
const seqCells=(x,k,p,i)=>`<td class="num" data-seqc="seq">${i.done?`${i.seqO}/${i.seqT}${i.complete?"":` <span class="subt">(${i.done} of ${i.vals.length})</span>`}`:"—"}</td><td class="num" data-seqc="tot">${i.o!=null?`${i.o}/${i.t}`:"—"}</td><td class="num" data-seqc="pct"><b>${i.pct!=null?i.pct:"—"}</b></td>`;
function seqRes(x,k,p,i){if(i.absent)return'<span class="pill p-done">Absent</span>';if(i.pct==null)return`<span class="subt">${i.mcqPct==null?"MCQ awaited":"SEQ awaited"}</span>`;
 const pass=exIsCommon(x,k)?exCommPass(x,k,i.pct):exPass(x,p,i.pct);return pass?'<span class="pill p-ric">Pass</span>':'<span class="pill p-bad">Fail</span>'}
{const _r=exResultsTab;exResultsTab=function(x){let h=_r(x);if(!x.seqd)return h;
 Object.keys(x.seqd).forEach(k=>{if(!seqCfg(x,k))return;const ek=esc(k).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),re=new RegExp(`<details class="exres"\\s+(?:open\\s+)?data-exopen="${ek}">[\\s\\S]*?</details>`);
  h=h.replace(re,()=>seqPaperBlock(x,k))});return h}}
/* typing a SEQ mark: saved straight away; the row's totals update in place so Tab and Enter keep working */
document.addEventListener("change",e=>{const t=e.target;if(!t.dataset||t.dataset.seqm==null)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;
 const[k,pid,j]=t.dataset.seqm.split("|"),D=seqCfg(x,k);if(!D)return;const raw=t.value.trim(),v=raw===""?null:+raw,mx=+D.max[+j];
 if(v!=null&&(isNaN(v)||v<0||v>mx)){toast(`SEQ ${+j+1} is out of ${mx}`);t.value=((D.m[pid]||[])[+j])??"";return}
 D.m=D.m||{};const a=D.m[pid]=D.m[pid]||Array(D.n).fill(null);a[+j]=v;seqSyncExam(x);persist();
 const p=DB.pgts.find(q=>q.id===pid),i=seqInfo(x,k,pid),row=t.closest("tr");if(!row)return;
 const tmp=document.createElement("tbody");tmp.innerHTML=`<tr>${seqCells(x,k,p,i)}</tr>`;["seq","tot","pct"].forEach((c,n)=>{const td=row.querySelector(`[data-seqc="${c}"]`);if(td)td.innerHTML=tmp.querySelectorAll("td")[n].innerHTML});
 const rs=row.querySelector('[data-seqc="res"]');if(rs)rs.innerHTML=seqRes(x,k,p,i)});
document.addEventListener("keydown",e=>{const t=e.target;if(e.key!=="Enter"||!t.dataset||t.dataset.seqm==null)return;e.preventDefault();const[k,,j]=t.dataset.seqm.split("|");
 const all=[...document.querySelectorAll(`[data-seqm$="|${j}"]`)].filter(z=>z.dataset.seqm.startsWith(k+"|")),i=all.indexOf(t);t.blur();const nx=all[i+1];if(nx)setTimeout(()=>nx.focus(),0)});
document.addEventListener("click",e=>{const b=e.target.closest("[data-seqcfg],[data-seqxl]");if(!b||!DB||!DB.exams)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;e.preventDefault();
 const t=document.createElement("textarea");t.innerHTML=b.dataset.seqcfg||b.dataset.seqxl;const k=t.value;
 if(b.dataset.seqcfg!=null)return sheetSeqCfg(x,k);seqXlsx(x,k,b)});
/* Excel: a sheet to fill in, and reading it back */
async function seqXlsx(x,k,btn){if(!window.XLSX){toast("The Excel library did not load. Check the connection and reload the page.");return}const D=seqCfg(x,k);if(!D)return;
 const P=exCands(x).filter(p=>exInPaper(x,p,k)).sort((a,b)=>(x.roll?.[a.id]||"").localeCompare(x.roll?.[b.id]||"")||a.name.localeCompare(b.name));
 const rows=[[`SEQ marks · ${k} · ${x.title} ${x.session}`],["Fill in the SEQ columns only; leave a cell empty if not marked yet. Do not change the PGT ID column."],[],["PGT ID","Roll no.","Name","Specialty",...D.max.map((m,i)=>`SEQ ${i+1} (out of ${m})`)],
  ...P.map(p=>{const i=seqInfo(x,k,p.id);return[p.guest?p.id:(p.code||p.id),x.roll?.[p.id]||"",candName(p),p.spec||"",...i.vals.map(v=>v??"")]})];
 const ws=XLSX.utils.aoa_to_sheet(rows);ws["!cols"]=[16,10,30,24,...D.max.map(()=>14)].map(w=>({wch:w}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"SEQ marks");
 const buf=XLSX.write(wb,{bookType:"xlsx",type:"array"});try{await (DL||BROWSER_DL).save({filename:`SEQ marks ${k} ${x.session}`.replace(/[\\/:*?"<>|·]+/g," ").replace(/\s+/g," ")+".xlsx",data:buf});toast("SEQ marks sheet ready")}catch(e){if(e?.code!=="declined")toast("The file could not be saved in this view")}}
document.addEventListener("change",async e=>{const t=e.target;if(!t.dataset||t.dataset.sequp==null||!t.files||!t.files[0])return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;
 const tx=document.createElement("textarea");tx.innerHTML=t.dataset.sequp;const k=tx.value,D=seqCfg(x,k),f=t.files[0];t.value="";if(!D)return;
 if(!window.XLSX){toast("The Excel library did not load. Check the connection and reload the page.");return}
 let A;try{const wb=XLSX.read(await f.arrayBuffer(),{type:"array"});A=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:""})}catch(er){toast("The file could not be read");return}
 const hi=A.findIndex(r=>r.some(c=>/^pgt\s*id$/i.test(String(c).trim())));if(hi<0){toast("No “PGT ID” column found. Use the downloaded SEQ marks sheet.");return}
 const H=A[hi].map(c=>String(c).trim()),ci=H.findIndex(c=>/^pgt\s*id$/i.test(c)),ri=H.findIndex(c=>/^roll/i.test(c)),sc=H.map((c,i)=>[c,i]).filter(([c])=>/^seq\s*\d+/i.test(c)).map(([c,i])=>[+c.match(/\d+/)[0]-1,i]);
 const P=exCands(x).filter(p=>exInPaper(x,p,k));let up=0,bad=[],miss=0;D.m=D.m||{};
 A.slice(hi+1).forEach(r=>{const id=String(r[ci]||"").trim(),rl=ri>=0?String(r[ri]||"").trim():"";if(!id&&!rl)return;const p=P.find(q=>(q.code||q.id)===id||q.id===id)||(rl&&P.find(q=>(x.roll?.[q.id]||"")===rl));if(!p){miss++;return}
  const a=D.m[p.id]=D.m[p.id]||Array(D.n).fill(null);let any=false;sc.forEach(([j,c])=>{if(j<0||j>=D.n)return;const raw=String(r[c]).trim();if(raw==="")return;const v=+raw;if(isNaN(v)||v<0||v>D.max[j]){bad.push(`${p.name} SEQ ${j+1}`);return}if(a[j]!==v){a[j]=v;any=true}});if(any)up++});
 seqSyncExam(x);xlog(x,`SEQ marks uploaded for ${k} from ${f.name}: ${up} candidates updated`);persist();render();
 toast(`${up} candidate${up===1?"":"s"} updated${bad.length?` · ${bad.length} marks out of range skipped (${bad.slice(0,3).join(", ")}${bad.length>3?"…":""})`:""}${miss?` · ${miss} rows not matched`:""}`)});

/* ---------- result sheet: MCQ, SEQ and total columns ---------- */
{const _d=rsData;rsData=function(x,k,spec,o){const d=_d(x,k,spec,o),D=seqCfg(x,k);if(!D)return d;d.seq=D;d.mcqT=seqMcqTotal(x,k);d.seqT=seqTotal(D);
 d.R.forEach(r=>{const i=seqInfo(x,k,r.p.id);r.sq=i;if(!r.ab){if(i.pct!=null){r.m=i.pct;r.ob=i.o;r.tt=i.t}else{r.m=null;r.ob=null;r.res="Awaited"}}});
 /* figures again, now that awaited SEQ marks are not counted */
 const R=d.R,sat=R.filter(r=>r.m!=null).sort((a,b)=>b.m-a.m);sat.forEach((r,i)=>{r.pos=i&&sat[i-1].m===r.m?sat[i-1].pos:i+1});const ms=sat.map(r=>r.m),st=d.st;
 st.sat=sat.length;st.wait=R.filter(r=>r.res==="Awaited").length;st.pass=R.filter(r=>r.res==="Pass").length;st.fail=R.filter(r=>r.res==="Fail").length;
 st.rate=st.sat?st.pass/st.sat*100:null;st.hi=ms.length?Math.max(...ms):null;st.lo=ms.length?Math.min(...ms):null;st.avg=ms.length?ms.reduce((a,b)=>a+b,0)/ms.length:null;
 if(o.order==="merit")R.sort((a,b)=>(a.m==null)-(b.m==null)||(b.m??0)-(a.m??0));
 d.notes=d.notes.filter(n=>!/no marks entered yet/.test(n));d.notes.unshift(`Total marks: MCQ ${d.mcqT??"?"} + SEQ ${d.seqT} (${D.n} questions) = ${(d.mcqT||0)+d.seqT}. Percentage = marks obtained ÷ total marks.`);
 const w=R.filter(r=>r.res==="Awaited"&&!r.ab).length;if(w)d.notes.push(`${w} candidate${w>1?"s have":" has"} MCQ or SEQ marks still to be entered ("Awaited").`);return d}}
{const _c=rsCols;rsCols=function(d,o){const C=_c(d,o);if(!d.seq)return C;const i=C.findIndex(c=>c.h==="Marks");if(i<0)return C;
 const f=v=>v==null?"—":String(+(+v).toFixed(2));
 C.splice(i,1,{h:"MCQ",xh:`MCQ (out of ${d.mcqT??"?"})`,w:16,a:"center",v:r=>r.sq&&r.sq.mcqO!=null&&!r.ab?`${f(r.sq.mcqO)}/${r.sq.mcqT}`:"—",x:r=>r.sq&&r.sq.mcqO!=null&&!r.ab?r.sq.mcqO:""},
  {h:"SEQ",xh:`SEQ (out of ${d.seqT})`,w:15,a:"center",v:r=>r.sq&&r.sq.complete&&!r.ab?`${f(r.sq.seqO)}/${r.sq.seqT}`:r.sq&&r.sq.done&&!r.ab?"part":"—",x:r=>r.sq&&r.sq.complete&&!r.ab?r.sq.seqO:""},
  {h:"Total",xh:`Total (out of ${(d.mcqT||0)+d.seqT})`,w:18,a:"center",v:r=>r.ob!=null?`${f(r.ob)}/${r.tt}${r.part?" *":""}`:"—",x:r=>r.ob!=null?r.ob:""});return C}}

/* the exam list's Attention column */
{const _f=exFlags;exFlags=function(x){const f=_f(x);if(!x.seqd||x.stage<3)return f;Object.keys(x.seqd).forEach(k=>{const D=seqCfg(x,k);if(!D)return;
 const n=exCands(x).filter(p=>exInPaper(x,p,k)).filter(p=>{const i=seqInfo(x,k,p.id);return!i.absent&&!i.complete}).length;if(n)f.push(`${k}: SEQ marks missing for ${n}`)});return f}}
