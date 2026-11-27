
/* =====================================================================
   V39 · Examinations overview: clearer at-a-glance graphics
   (pass ring, change from last session, pass rate by specialty, score
   distribution, year at RIC, trainees to watch, overall trend) and the
   same section buttons as other long pages. Exam page: tabs stay at the top.
   ===================================================================== */
const exColor=r=>r>=75?"var(--ok)":r>=50?"var(--warn)":"var(--bad)";
function exRing(pct,label){const r=30,c=2*Math.PI*r,f=Math.max(0,Math.min(100,pct||0))/100*c;
 return`<svg viewBox="0 0 76 76" width="76" height="76" role="img" aria-label="${label}: ${pct}%"><circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--line)" stroke-width="9"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="${exColor(pct)}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${f} ${c}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle" font-size="17" font-weight="700" fill="var(--ink)">${pct}%</text></svg>`}
const exDelta=(v,unit,prevTxt)=>v==null?`<span class="subt">no earlier session</span>`:`<span class="${v<0?"d-red":"d-ok"}" style="font-weight:700">${v>=0?"▲":"▼"} ${Math.abs(v).toFixed(unit==="pp"?0:1)}${unit==="pp"?" points":""}</span> <span class="subt">${prevTxt}</span>`;
/* sat candidates of an exam with mark, pass, specialty and year */
function exRows(x){return exCands(x).filter(p=>!x.absent[p.id]&&x.marks[p.id]!=null).map(p=>{const m=+x.marks[p.id];return{p,m,ok:exPass(x,p,m),y:examYear(x,p)}})}
function exHist(R,pass,note){const bins=Array.from({length:10},(_,i)=>R.filter(r=>Math.min(9,Math.floor(r.m/10))===i));const mx=Math.max(1,...bins.map(b=>b.length));
 const W=600,H=212,L=28,B=26,T=36,bw=(W-L-8)/10;const y=n=>T+(H-T-B)*(1-n/mx);const px=L+(pass/100)*(W-L-8);
 return`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block" role="img" aria-label="Number of candidates in each 10% score band">
 ${[0,Math.ceil(mx/2),mx].map(n=>`<line x1="${L}" x2="${W-8}" y1="${y(n)}" y2="${y(n)}" stroke="var(--line)"/><text x="${L-6}" y="${y(n)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${n}</text>`).join("")}
 ${bins.map((b,i)=>{const n=b.length,x0=L+i*bw+3,h=(H-T-B)*(n/mx),below=(i+1)*10<=pass;return`<rect x="${x0}" y="${H-B-h}" width="${bw-6}" height="${h}" rx="3" fill="${below?"var(--bad)":"var(--ok)"}" opacity="${below?.75:.85}"><title>${i*10}–${i*10+9}%: ${n}</title></rect>${n?`<text x="${x0+(bw-6)/2}" y="${H-B-h-4}" text-anchor="middle" font-size="13" fill="var(--ink)">${n}</text>`:""}<text x="${x0+(bw-6)/2}" y="${H-8}" text-anchor="middle" font-size="12" fill="var(--muted)">${i*10}s</text>`}).join("")}
 <line x1="${px}" x2="${px}" y1="16" y2="${H-B}" stroke="var(--ink)" stroke-dasharray="4 3"/><text x="${px}" y="12" text-anchor="middle" font-size="11" fill="var(--ink)">${note||"pass mark"} ${pass}%</text></svg>`}
function exTrendSvg(D){if(D.length<1)return"";const W=600,H=210,L=56,R=56,T=22,B=30,xs=i=>D.length===1?(L+W-R)/2:L+i*(W-L-R)/(D.length-1),y=v=>T+(100-v)/100*(H-T-B);
 const S=D.map(x=>statsOf(exVals(x),x.passMark));const line=(k,c,lab)=>{const pts=S.map((s,i)=>s.n?[xs(i),y(k==="rate"?s.rate:s.mean),k==="rate"?s.rate:s.mean]:null).filter(Boolean);
  return`${pts.length>1?`<polyline fill="none" stroke="${c}" stroke-width="2.5" points="${pts.map(p=>p[0]+","+p[1]).join(" ")}"/>`:""}${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${c}"><title>${lab}: ${p[2].toFixed(k==="rate"?0:1)}</title></circle><text x="${p[0]}" y="${k==="rate"?p[1]+17:p[1]-9}" text-anchor="middle" font-size="11" fill="${c}" font-weight="600">${p[2].toFixed(0)}${k==="rate"?"%":""}</text>`).join("")}`};
 return`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block" role="img" aria-label="Pass rate and mean score by session">
 ${[0,50,100].map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`).join("")}
 ${D.map((x,i)=>`<text x="${xs(i)}" y="${H-10}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(x.session)}</text>`).join("")}${line("rate","var(--brand)","Pass rate")}${line("mean","var(--gold)","Mean %")}</svg>
 <div class="legend"><span><i style="background:var(--brand)"></i>Pass rate %</span><span><i style="background:var(--gold)"></i>Mean score %</span></div>`}
function exDash(){const X=DB.exams.filter(x=>!x.practice).slice().sort((a,b)=>a.month<b.month?-1:1),done=X.filter(x=>exVals(x).length);
 if(!done.length)return`<div class="flag info">No results yet. Open an exam, mark it as held, then scan the answer sheets or upload the result files.</div>`;
 const pick=done.find(x=>x.id===UI.exPick)||done[done.length-1],prev=done[done.indexOf(pick)-1];
 const picker=`<select id="ex-pick" aria-label="Exam session">${done.slice().reverse().map(x=>`<option value="${x.id}" ${pick===x?"selected":""}>${esc(x.session)}</option>`).join("")}</select>`;
 return exBlocks(pick,prev,{picker,done})}
function exPrevOf(x){const done=DB.exams.filter(z=>!z.practice&&exVals(z).length).sort((a,b)=>a.month<b.month?-1:1);return done[done.indexOf(x)-1]}
function exBlocks(pick,prev,o){o=o||{};const done=o.done,R=exRows(pick),S=statsOf(exVals(pick),pick.passMark),PS=prev?statsOf(exVals(prev),prev.passMark):null;
 const abs=exCands(pick).filter(p=>pick.absent[p.id]).length,below=R.filter(r=>!r.ok);
 const specs=exSpecs(pick).map(s=>({s,t:statsOf(exVals(pick,p=>p.spec===s),pick.passMark),pt:prev?statsOf(exVals(prev,p=>p.spec===s),prev.passMark):null})).filter(o=>o.t.n).sort((a,b)=>b.t.rate-a.t.rate||b.t.mean-a.t.mean);
 const years=[1,2,3,0].map(yv=>({yv,t:statsOf(exVals(pick,p=>examYear(pick,p)===yv),pick.passMark)})).filter(o=>o.t.n);
 const prevBelow=prev?new Set(exRows(prev).filter(r=>!r.ok).map(r=>r.p.id)):new Set(),twice=below.filter(r=>prevBelow.has(r.p.id));
 const top=R.slice().sort((a,b)=>b.m-a.m).slice(0,5);
 const nm=r=>`<a href="#pgt-${r.p.id}">Dr. ${esc(r.p.name)}</a>`;
 const picker=o.picker||"";if(!R.length)return"";
 return`<div class="panel exov" style="display:grid;gap:14px"><div class="head"><h3 style="margin:0">Overview · ${esc(pick.session)}</h3>${picker}</div>
 <div class="exkpis">
  <div class="exk ring">${exRing(S.rate,"Pass rate")}<div><b>Pass rate</b><span>${S.pass} of ${S.n} passed at ${pick.passMark}%</span><span>${PS?exDelta(S.rate-PS.rate,"pp",`vs ${esc(prev.session)} (${PS.rate}%)`):'<span class="subt">first session with results</span>'}</span></div></div>
  <div class="exk"><span class="n">${S.mean.toFixed(1)}<small>%</small></span><b>Mean score</b><span>median ${S.med.toFixed(1)} · range ${S.min}–${S.max}</span><span>${PS?exDelta(S.mean-PS.mean,"",`vs ${PS.mean.toFixed(1)}`):""}</span></div>
  <div class="exk"><span class="n">${S.n}<small> / ${exCands(pick).length}</small></span><b>Sat the exam</b><span>${abs} absent${R.length<exCands(pick).length-abs?` · ${exCands(pick).length-abs-R.length} not marked yet`:""}</span></div>
  <div class="exk ${below.length?"warnk":""}"><span class="n">${below.length}</span><b>Below the pass mark</b><span>${twice.length?`<span class="d-red">${twice.length} also below last session</span>`:prev?"none below twice in a row":""}</span></div>
 </div></div>

 <div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Pass rate by specialty</h3><span class="subt">sorted best to lowest · bar = pass rate · dot = mean score</span></div>
 <div class="exbars">${specs.map(({s,t,pt})=>`<div class="exbar"><div class="lab"><b>${esc(s)}</b><span class="subt">${t.pass}/${t.n} passed · mean ${t.mean.toFixed(0)}%${pt&&pt.n?` · <span class="${t.rate<pt.rate?"d-red":""}">${t.rate>=pt.rate?"▲":"▼"}${Math.abs(t.rate-pt.rate)}</span>`:""}</span></div>
  <div class="track" title="Pass rate ${t.rate}%, mean ${t.mean.toFixed(1)}%"><i style="width:${Math.max(t.rate,2)}%;background:${exColor(t.rate)}"></i><em style="left:${t.mean}%"></em><u style="left:${exPassFor(pick,s)}%" title="pass mark ${+(+exPassFor(pick,s)).toFixed(1)}%"></u></div><span class="pct" style="color:${exColor(t.rate)}">${t.rate}%</span></div>`).join("")}</div>
 <div class="legend"><span><i style="background:var(--ok)"></i>75% or more passed</span><span><i style="background:var(--warn)"></i>50–74%</span><span><i style="background:var(--bad)"></i>under 50%</span><span><i style="background:var(--ink);border-radius:50%"></i>mean score</span><span><i style="background:none;border-left:2px dashed var(--muted);border-radius:0"></i>pass mark</span></div></div>

 <div class="cols exduo"><div class="panel" style="display:grid;gap:8px"><h3 style="margin:0">Score distribution</h3><p class="subt" style="margin:0">How many candidates scored in each 10% band. Red bands are below the pass mark.</p>${exHist(R,pick.passMark,pick.passPaper&&Object.keys(pick.passPaper).length?"exam pass mark":"")}</div>
 <div class="panel" style="display:grid;gap:10px"><h3 style="margin:0">By year at RIC</h3>${years.length?`<div class="exbars">${years.map(({yv,t})=>`<div class="exbar"><div class="lab"><b>${yv?"Year "+yv:"Not at RIC yet / other"}</b><span class="subt">${t.pass}/${t.n} passed · mean ${t.mean.toFixed(0)}%</span></div><div class="track"><i style="width:${Math.max(t.rate,2)}%;background:${exColor(t.rate)}"></i><em style="left:${t.mean}%"></em><u style="left:${pick.passMark}%"></u></div><span class="pct" style="color:${exColor(t.rate)}">${t.rate}%</span></div>`).join("")}</div>`:'<p class="subt">No year data.</p>'}</div></div>

 <div class="cols exduo"><div class="panel" style="display:grid;gap:8px"><h3 style="margin:0">Trainees to watch · ${below.length}</h3>${below.length?`<div class="tblwrap"><table class="compact"><tbody>${below.sort((a,b)=>(prevBelow.has(b.p.id)-prevBelow.has(a.p.id))||a.m-b.m).slice(0,10).map(r=>`<tr class="click" data-href="pgt-${r.p.id}"><td>${nm(r)} ${prevBelow.has(r.p.id)?'<span class="pill p-bad">twice</span>':""}<div class="subt">${esc(r.p.spec)}${r.y?" · year "+r.y:""}</div></td><td class="num"><b class="d-red">${r.m}%</b></td></tr>`).join("")}</tbody></table></div>${below.length>10?`<p class="subt" style="margin:0">and ${below.length-10} more: open the exam's Results.</p>`:""}`:'<p class="subt" style="margin:0">Everyone who sat passed.</p>'}</div>
 <div class="panel" style="display:grid;gap:8px"><h3 style="margin:0">Top scores</h3><div class="tblwrap"><table class="compact"><tbody>${top.map((r,i)=>`<tr class="click" data-href="pgt-${r.p.id}"><td>${i+1}. ${nm(r)}<div class="subt">${esc(r.p.spec)}${r.y?" · year "+r.y:""}</div></td><td class="num"><b class="d-ok">${r.m}%</b></td></tr>`).join("")}</tbody></table></div></div></div></div>${done?`

 <div class="panel" style="display:grid;gap:10px"><h3 style="margin:0">Trend across sessions</h3>${done.length<2?`<p class="subt" style="margin:0">The trend line appears once a second session has results.</p>`:""}${exTrendSvg(done)}
 <details><summary class="subt" style="cursor:pointer">Mean and pass rate by specialty, each session</summary><div class="tblwrap"><table><thead><tr><th>Specialty</th>${done.map(x=>`<th class="num">${esc(x.session)}</th>`).join("")}</tr></thead><tbody>${[...new Set(done.flatMap(x=>exSpecs(x).filter(s=>exVals(x,p=>p.spec===s).length)))].sort((a,b)=>specIdx(a)-specIdx(b)).map(s=>`<tr><td>${esc(s)}</td>${done.map(x=>{const t=statsOf(exVals(x,p=>p.spec===s),x.passMark);return`<td class="num">${t.n?`${t.mean.toFixed(1)} <span class="subt">· ${t.rate}%</span>`:"—"}</td>`}).join("")}</tr>`).join("")}</tbody></table></div></details></div>`:""}`}
{const _v=vExams;vExams=function(){const h=_v();const a=h.indexOf('<div class="kpis">'),b=h.indexOf('<div class="panel flush"><h3>All examinations</h3>');if(a<0||b<0)return h;
 /* the list of examinations first, so any exam is one tap away; the pictures follow */
 return h.slice(0,a)+h.slice(b).replace('<div class="panel flush"><h3>All examinations</h3>','<div class="panel flush"><h3 style="padding:14px 16px 0;margin:0">All examinations</h3>')+exDash()}}
SEC_PAGES.push("exams");

/* the exam's own Analysis tab: the same pictures for this exam, then the detailed table and question analysis */
{const _a=exAnalysisTab;exAnalysisTab=function(x){const v=exBlocks(x,exPrevOf(x),{});const h=_a(x);if(!v)return h;
 return v+h.replace(/<div class="kpis">[\s\S]*?<\/div><\/div>\s*(?=<div class="tblwrap">)/,"")}}
