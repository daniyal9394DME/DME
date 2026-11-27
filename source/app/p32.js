
/* =====================================================================
   V30 · ITEM ANALYSIS for OMR papers: paper statistics (mean, spread,
   KR-20 reliability), section and year averages, and per question
   difficulty, discrimination, point-biserial and distractor analysis,
   with plain-language flags for the paper setter.
   ===================================================================== */
UI.iaSp=UI.iaSp||"";UI.iaFlag=false;
function iaData(x,sp){const s=omrSpec(x,sp);if(!s)return null;const key=omrKeyArr(s),L="ABCDE".slice(0,s.opts).split(""),drop=new Set(s.drop||[]),alt=s.alt||{};
 const rows=omrScans(x).filter(z=>z.use&&z.pid&&z.spec===sp&&z.ans&&!omrNeeds(x,z)&&!z.only).map(z=>({p:DB.pgts.find(q=>q.id===z.pid),A:omrFinal(x,z),sc:omrScore(x,z)})).filter(r=>r.p&&r.sc);
 if(!rows.length)return{s,rows,items:[]};
 const ok=(r,i)=>!!r.A[i]&&(r.A[i]===key[i]||alt[i+1]===r.A[i]);const tot=rows.map(r=>r.sc.o),n=rows.length;
 const mean=tot.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(tot.reduce((a,b)=>a+(b-mean)**2,0)/n);
 const sorted=rows.slice().sort((a,b)=>b.sc.o-a.sc.o),g=Math.max(1,Math.round(n*.27)),U=sorted.slice(0,g),Lo=sorted.slice(-g);
 const items=[];let spq=0,k=0;
 for(let i=0;i<s.n;i++){const q=i+1;if(!key[i]||drop.has(q)){items.push({q,dropped:drop.has(q),nokey:!key[i]});continue}k++;
  const c=rows.map(r=>ok(r,i)?1:0),P=c.reduce((a,b)=>a+b,0)/n;spq+=P*(1-P);
  const D=(U.filter(r=>ok(r,i)).length-Lo.filter(r=>ok(r,i)).length)/g;
  /* point-biserial against the rest of the paper (the item itself left out) */
  const rest=rows.map((r,j)=>r.sc.o-c[j]),mr=rest.reduce((a,b)=>a+b,0)/n,sr=Math.sqrt(rest.reduce((a,b)=>a+(b-mr)**2,0)/n),mc=P,sc=Math.sqrt(P*(1-P));
  const rpb=sr&&sc?rows.reduce((a,_,j)=>a+(c[j]-mc)*(rest[j]-mr),0)/n/(sr*sc):0;
  const opt={};L.forEach(l=>opt[l]={all:rows.filter(r=>r.A[i]===l).length,u:U.filter(r=>r.A[i]===l).length,lo:Lo.filter(r=>r.A[i]===l).length});const blank=rows.filter(r=>!r.A[i]).length;
  const dis=L.filter(l=>l!==key[i]&&l!==alt[q]),nfd=dis.filter(l=>opt[l].all/n<.05);
  const flags=[];if(n>=5){
   const wk=dis.find(l=>opt[l].u>opt[key[i]].u&&opt[l].u>=2);if(wk)flags.push(["key",`Possible wrong key: more of the strongest candidates chose ${wk}`]);
   if(D<0)flags.push(["neg","Negative discrimination: weaker candidates did better"]);else if(D<.2)flags.push(["weak","Poor discrimination"]);
   if(P>.9)flags.push(["easy","Very easy (over 90% correct)"]);else if(P<.2)flags.push(["hard","Very hard (under 20% correct)"]);
   if(nfd.length>=2)flags.push(["nfd",`${nfd.length} distractors hardly chosen (${nfd.join(", ")})`])}
  items.push({q,key:key[i]+(alt[q]?"/"+alt[q]:""),P,D,rpb,opt,blank,nfd,flags,sec:(s.sections||[]).find(z=>q>=z.from&&q<=z.to)?.name||""})}
 const kr20=k>1&&sd>0?k/(k-1)*(1-spq/(sd*sd)):null;
 return{s,rows,items,n,k,mean,sd,kr20,sem:kr20!=null?sd*Math.sqrt(Math.max(0,1-kr20)):null,g,med:tot.slice().sort((a,b)=>a-b)[n>>1],min:Math.min(...tot),max:Math.max(...tot)}}
const iaD=v=>v==null?"—":(v>=0?"":"−")+Math.abs(v).toFixed(2);
function iaPanel(x){if(isViewer()&&!canSee("exams"))return"";const specs=Object.keys(omrOf(x).specs||{}).filter(sp=>omrScans(x).some(z=>z.use&&z.spec===sp&&z.pid));if(!specs.length)return"";
 if(!specs.includes(UI.iaSp))UI.iaSp=specs[0];const sp=UI.iaSp,R=iaData(x,sp);
 const chips=`<div class="seg2">${specs.map(s=>`<button class="chip" data-iasp="${esc(s)}" aria-pressed="${s===sp}">${esc(s)}</button>`).join("")}</div>`;
 if(!R||!R.rows.length)return`<div class="panel" style="display:grid;gap:10px"><h3 style="margin:0">Item analysis</h3>${chips}<p class="subt" style="margin:0">Results appear here once the sheets for this paper have been reviewed.</p></div>`;
 const pm=exPassFor(x,sp),pass=R.rows.filter(r=>r.sc.pct>=pm).length;
 const bins=Array(10).fill(0);R.rows.forEach(r=>bins[Math.min(9,Math.floor(r.sc.pct/10))]++);const bmax=Math.max(1,...bins);
 const secs={};R.rows.forEach(r=>Object.entries(r.sc.secs||{}).forEach(([k,[o,t]])=>{secs[k]=secs[k]||[0,0];secs[k][0]+=o;secs[k][1]+=t}));
 const yrs={};R.rows.forEach(r=>{const y=examYear(x,r.p)||"?";yrs[y]=yrs[y]||[];yrs[y].push(r.sc.pct)});
 const rel=R.kr20==null?"—":R.kr20>=.8?"good":R.kr20>=.7?"acceptable":R.kr20>=.5?"low":"poor";
 const flagged=R.items.filter(i=>i.flags&&i.flags.length),L="ABCDE".slice(0,R.s.opts).split("");
 const show=R.items.filter(i=>!UI.iaFlag||(i.flags&&i.flags.length)||i.dropped);
 const tile=(b,l,s)=>`<div><b>${b}</b><span>${l}</span>${s?`<small class="subt">${s}</small>`:""}</div>`;
 return`<div class="panel" id="ia" style="display:grid;gap:12px"><div class="head"><h3 style="margin:0">Item analysis</h3>${xbtn(`omritem:${x.id}:${sp}`)}</div>${chips}
 ${R.n<10?`<div class="flag info">Only ${R.n} candidate${R.n>1?"s":""} on this paper: treat the question statistics as a rough guide.</div>`:""}
 <div class="surstat">${tile(R.n,"candidates")}${tile(`${(R.mean/R.k*100).toFixed(1)}%`,"average",`median ${(R.med/R.k*100).toFixed(0)}% · range ${(R.min/R.k*100).toFixed(0)}-${(R.max/R.k*100).toFixed(0)}%`)}${tile(`${pass} / ${R.n}`,"passed",`pass mark ${pm}%`)}${tile(R.kr20==null?"—":R.kr20.toFixed(2),"reliability (KR-20)",rel+(R.sem!=null?` · error of measurement ±${(R.sem/R.k*100).toFixed(1)}%`:""))}${tile(flagged.length,"questions to look at",`of ${R.k} marked`)}</div>
 <div class="cols two"><div><div class="subt" style="margin-bottom:6px">Score distribution</div><div class="iahist">${bins.map((v,i)=>`<div title="${i*10}-${i*10+9}%: ${v}"><i style="height:${v/bmax*100}%;background:${i*10+9<pm?"var(--bad)":"var(--ok)"}"></i><span>${i*10}</span></div>`).join("")}</div></div>
  <div style="display:grid;gap:8px;align-content:start">${Object.keys(secs).length?`<div><div class="subt">Average by section</div>${Object.entries(secs).map(([k,[o,t]])=>`<div class="iarow"><span>${esc(k)}</span><b>${(o/t*100).toFixed(1)}%</b></div>`).join("")}</div>`:""}
   <div><div class="subt">Average by training year</div>${Object.keys(yrs).sort().map(y=>`<div class="iarow"><span>Year ${y} <span class="subt">(${yrs[y].length})</span></span><b>${(yrs[y].reduce((a,b)=>a+b,0)/yrs[y].length).toFixed(1)}%</b></div>`).join("")}</div></div></div>
 <label class="subt" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="ia-flag" ${UI.iaFlag?"checked":""}> Show only questions to look at (${flagged.length})</label>
 <div class="tblwrap"><table class="iatbl"><thead><tr><th class="num">Q</th><th>Key</th><th class="num" title="Percentage who answered correctly">Correct</th><th class="num" title="Top 27% minus bottom 27%">Discrim.</th><th class="num" title="Point-biserial correlation">r<sub>pb</sub></th>${L.map(l=>`<th class="num">${l}</th>`).join("")}<th class="num">Blank</th><th>To look at</th></tr></thead><tbody>
 ${show.map(i=>i.dropped?`<tr><td class="num">${i.q}</td><td colspan="${6+L.length}" class="subt">Dropped: nobody loses marks</td></tr>`:i.nokey?`<tr><td class="num">${i.q}</td><td colspan="${6+L.length}" class="subt">No key entered</td></tr>`:`<tr class="${i.flags.some(f=>f[0]==="key")?"changed":""}"><td class="num"><b>${i.q}</b></td><td><b>${i.key}</b></td><td class="num">${Math.round(i.P*100)}%</td><td class="num ${i.D<0?"d-red":i.D<.2?"d-amb":""}">${iaD(i.D)}</td><td class="num">${iaD(i.rpb)}</td>
  ${L.map(l=>`<td class="num ${i.key.includes(l)?"iakey":i.nfd.includes(l)?"subt":""}">${Math.round(i.opt[l].all/R.n*100)}%</td>`).join("")}<td class="num subt">${i.blank?Math.round(i.blank/R.n*100)+"%":""}</td><td class="wrapcell">${i.flags.map(f=>`<div class="${f[0]==="key"||f[0]==="neg"?"d-red":""}">${esc(f[1])}</div>`).join("")}</td></tr>`).join("")}
 </tbody></table></div>
 <p class="subt" style="margin:0">Correct: 30-80% is the useful range. Discrimination (top 27% minus bottom 27% of candidates): 0.30 or more is good, under 0.20 is poor, negative needs checking. Distractors chosen by under 5% are greyed. A possible wrong key usually means the key or the question needs checking; fix it in Answer key and everyone is re-marked.</p></div>`}
document.addEventListener("click",e=>{const c=e.target.closest("[data-iasp]");if(!c)return;UI.iaSp=c.dataset.iasp;const y=window.scrollY;render();window.scrollTo(0,y)});
document.addEventListener("change",e=>{if(e.target.id==="ia-flag"){UI.iaFlag=e.target.checked;const y=window.scrollY;render();window.scrollTo(0,y)}});
EXPORTS.omritem=(xid,sp)=>{const x=DB.exams.find(e=>e.id===xid),R=iaData(x,sp),L="ABCDE".slice(0,R.s.opts).split("");
 const cand=R.rows.slice().sort((a,b)=>b.sc.o-a.sc.o).map((r,i)=>({"Rank":i+1,"PGT ID":r.p.code||"","Name":"Dr. "+r.p.name,"Year":examYear(x,r.p)||"","Correct":r.sc.o,"Out of":r.sc.t,"%":r.sc.pct,...Object.fromEntries(Object.entries(r.sc.secs||{}).map(([k,[o,t]])=>[k+" (%)",Math.round(o/t*1000)/10])),"Answers":r.A.map(a=>a||"-").join("")}));
 const items=R.items.map(i=>i.dropped?{"Q":i.q,"Note":"Dropped"}:i.nokey?{"Q":i.q,"Note":"No key"}:{"Q":i.q,"Section":i.sec,"Key":i.key,"Correct %":Math.round(i.P*1000)/10,"Discrimination":+i.D.toFixed(2),"Point-biserial":+i.rpb.toFixed(2),...Object.fromEntries(L.map(l=>[l+" %",Math.round(i.opt[l].all/R.n*1000)/10])),"Blank %":Math.round(i.blank/R.n*1000)/10,"To look at":i.flags.map(f=>f[1]).join("; ")});
 const sum=[{"Paper":sp,"Exam":`${x.title} · ${x.session}`,"Candidates":R.n,"Questions marked":R.k,"Average %":+(R.mean/R.k*100).toFixed(1),"SD %":+(R.sd/R.k*100).toFixed(1),"KR-20":R.kr20==null?"":+R.kr20.toFixed(2),"Questions to look at":R.items.filter(i=>i.flags&&i.flags.length).length}];
 return{file:`Item analysis ${sp} ${x.session}`,sheets:[sheetFrom("Summary",sum),sheetFrom("Questions",items),sheetFrom("Candidates",cand)]}};
