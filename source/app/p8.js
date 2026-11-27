const SAMPLE_RESULTS=__SAMPLE__;
/* =====================================================================
   PHASE 8: roll numbers from PGT ID, Evalbee result import, exam dashboard
   ===================================================================== */
const rollOf=p=>{const m=(p.code||"").match(/^PGT\/(\d{2})\/(\d{1,2})\/(\d+)$/);return m?m[1]+m[2]+m[3]:""};
function genRolls(x){const C=exCands(x);x.roll={};C.forEach(p=>x.roll[p.id]=rollOf(p));const miss=C.filter(p=>!x.roll[p.id]).length;
 xlog(x,`${C.length} roll numbers set from PGT IDs${miss?`; ${miss} PGTs have no PGT ID`:""}`);persist();render()}
EXPORTS.idchanges=()=>({file:`PGT ID changes ${iso(TODAY)}`,sheets:[sheetFrom("PGT IDs",verified().filter(p=>p.oldCode!==undefined).map(p=>({"Name":"Dr. "+p.name,"Specialty":p.spec,"Inducted":sessOf(p.start)||"","Registered on":p.regAt?new Date(p.regAt).toLocaleString("en-GB"):"","Previous PGT ID":p.oldCode||"(none)","PGT ID now":p.code,"Roll no.":rollOf(p),"Changed":p.oldCode===p.code?"":"Yes"})).sort((a,b)=>a["PGT ID now"]<b["PGT ID now"]?-1:1))]});

/* ---------- Evalbee result file ---------- */
const nameKey=s=>String(s||"").toLowerCase().replace(/^\s*(dr|prof)\.?\s*/,"").replace(/[^a-z]/g,"");
function parseEvalbee(aoa){const h=(aoa[0]||[]).map(v=>String(v??"").trim());const ix=k=>h.indexOf(k);
 const need=["Roll No","Name","Total Marks"];const miss=need.filter(k=>ix(k)<0);if(miss.length)throw new Error("This is not an Evalbee result file. Missing columns: "+miss.join(", "));
 const qn=[];h.forEach((c,i)=>{const m=c.match(/^Q (\d+) Options$/);if(m)qn.push({n:+m[1],o:i,k:h.indexOf(`Q ${m[1]} Key`),m:h.indexOf(`Q ${m[1]} Marks`)})});
 const num=v=>v===null||v===undefined||v===""?null:+v;
 return aoa.slice(1).filter(r=>r&&r[ix("Name")]).map(r=>({exam:r[ix("Exam")]||"",cls:r[ix("Class")]||"",roll:String(r[ix("Roll No")]??"").trim(),name:String(r[ix("Name")]).trim(),total:num(r[ix("Total Marks")]),grade:r[ix("Grade")]||"",
  correct:num(r[ix("Correct Answers")]),incorrect:num(r[ix("Incorrect Answers")]),na:num(r[ix("Not attempted")]),ans:qn.map(q=>r[q.o]??null),key:qn.map(q=>r[q.k]??null),qm:qn.map(q=>num(r[q.m]))}))}
function matchRow(x,row,pool){const r=row.roll.replace(/^0+/,"");let p=pool.find(p=>(x.roll?.[p.id]&&x.roll[p.id].replace(/^0+/,"")===r)||rollOf(p)===row.roll);
 if(p)return[p,"Roll number"];const nk=nameKey(row.name);p=pool.find(p=>nameKey(p.name)===nk);if(p)return[p,"Name"];
 const c=pool.filter(p=>nameKey(p.name).startsWith(nk)||nk.startsWith(nameKey(p.name)));return c.length===1?[c[0],"Similar name"]:[null,""]}
function applyImport(x,rows,file,map){x.detail=x.detail||{};x.items=x.items||{};x.uploads=x.uploads||[];x.added=x.added||[];let saved=0,abs=0;const paper=rows[0]?.exam||file;
 const keyRow=rows.find(r=>r.total!=null)||rows[0];const max=keyRow?keyRow.key.filter(k=>k).length:0;
 rows.forEach((row,i)=>{const pid=map[i];if(!pid)return;const p=DB.pgts.find(q=>q.id===pid);
  if(x.cands&&!x.cands.includes(pid))x.cands.push(pid);else if(!x.cands&&!exCands(x).includes(p))x.added.push(pid);
  if(row.total==null){x.absent[pid]=true;delete x.marks[pid];abs++}else{delete x.absent[pid];x.marks[pid]=max?Math.round(row.total/max*1000)/10:row.total;saved++}
  x.detail[pid]={paper,total:row.total,max,correct:row.correct,incorrect:row.incorrect,na:row.na,grade:row.grade,roll:row.roll,file};
  if(!x.roll)x.roll={};if(!x.roll[pid])x.roll[pid]=row.roll});
 const sat=rows.filter(r=>r.total!=null);if(keyRow&&sat.length){const k=keyRow.key;x.items[paper]={spec:specOfCls(rows[0].cls),file,n:sat.length,key:k,correct:k.map((_,q)=>sat.filter(r=>r.qm[q]>0).length),blank:k.map((_,q)=>sat.filter(r=>r.ans[q]==null).length),multi:k.map((_,q)=>sat.filter(r=>String(r.ans[q]||"").includes(",")).length)}}
 x.uploads.push({file,paper,at:new Date().toISOString(),by:ME,rows:rows.length,saved,abs,skipped:rows.length-saved-abs});
 xlog(x,`Evalbee results uploaded (${paper}): ${saved} marks, ${abs} absent${rows.length-saved-abs?`, ${rows.length-saved-abs} not matched`:""}`);if(x.stage<3)x.stage=3}
function specOfCls(c){const k=nameKey(c);return(DB.specs.find(s=>nameKey(s.name)===k)||DB.specs.find(s=>k.includes(nameKey(s.name))||nameKey(s.name).includes(k))||{}).name||c}
UI.imp=null;
async function readImport(file){try{if(!window.XLSX)throw new Error("The Excel library did not load. Check the connection and reload.");const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:"array"});
 const aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:null});const rows=parseEvalbee(aoa);if(!rows.length)throw new Error("No candidate rows found in the file.");
 const x=DB.exams.find(e=>e.id===route.id),spec=specOfCls(rows[0].cls),pool=verified().slice().sort((a,b)=>(b.spec===spec)-(a.spec===spec));
 const map={},how={};rows.forEach((r,i)=>{const[p,h]=matchRow(x,r,pool);map[i]=p?.id||"";how[i]=h});UI.imp={file:file.name,rows,map,how,spec};render()}catch(e){toast(e.message||"Could not read the file")}}
function importPanel(x){if(x.stage<3)return`<div class="panel"><h3>Upload Evalbee results</h3><p class="subt" style="margin:0">Mark the exam as held first; then upload each Evalbee result file here.</p></div>`;
 const I=UI.imp;
 if(!I)return`<div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Upload Evalbee results</h3><label class="btn small primary" for="ev-file">Choose result file</label><input type="file" id="ev-file" accept=".xlsx,.xls,.csv" class="sr"></div>
  <p class="subt" style="margin:0">Upload the result file downloaded from Evalbee, one specialty or year paper at a time. Rows are matched by roll number, then by name; you can fix any match before saving. Blank marks are recorded as absent.</p>
  ${(x.uploads||[]).length?`<div class="tblwrap"><table><thead><tr><th>File</th><th>Paper</th><th>Uploaded</th><th class="num">Marks</th><th class="num">Absent</th><th class="num">Not matched</th></tr></thead><tbody>${x.uploads.map(u=>`<tr><td class="code">${esc(u.file)}</td><td>${esc(u.paper)}</td><td>${fdt(u.at)} · ${esc(u.by)}</td><td class="num">${u.saved}</td><td class="num">${u.abs}</td><td class="num">${u.skipped}</td></tr>`).join("")}</tbody></table></div>`:""}</div>`;
 const pool=verified().slice().sort((a,b)=>(b.spec===I.spec)-(a.spec===I.spec)||a.name.localeCompare(b.name));const used=Object.values(I.map).filter(Boolean);const max=(I.rows.find(r=>r.total!=null)||I.rows[0]).key.filter(k=>k).length;
 return`<div class="panel" style="display:grid;gap:10px"><div class="head"><div><h3 style="margin:0">Check before saving · ${esc(I.file)}</h3><p class="subt" style="margin:4px 0 0">${I.rows.length} rows · paper ${esc(I.rows[0].exam)} · ${esc(I.spec)} · ${max} questions</p></div><div class="actions"><button class="btn" data-act="ev-cancel">Cancel</button><button class="btn primary" data-act="ev-save">Save ${used.length} results</button></div></div>
 <div class="tblwrap"><table><thead><tr><th>Evalbee name</th><th>Roll no.</th><th class="num">Marks</th><th class="num">%</th><th>Evalbee grade</th><th>Matched PGT</th><th>Matched by</th></tr></thead><tbody>
 ${I.rows.map((r,i)=>`<tr class="${I.map[i]?"":"changed"}"><td>${esc(r.name)}</td><td class="code">${esc(r.roll)}</td><td class="num">${r.total??"—"}</td><td class="num">${r.total==null?"Absent":max?(r.total/max*100).toFixed(1):"—"}</td><td>${esc(r.grade||"")}</td>
  <td><select data-evmap="${i}" aria-label="Match for ${esc(r.name)}"><option value="">Not matched, skip</option>${pool.map(p=>`<option value="${p.id}" ${I.map[i]===p.id?"selected":""} ${used.includes(p.id)&&I.map[i]!==p.id?"disabled":""}>Dr. ${esc(p.name)} · ${esc(p.code)} · ${esc(p.spec)}</option>`).join("")}</select></td><td>${I.map[i]?esc(I.how[i]||"Chosen by hand"):'<span class="d-red">Choose or skip</span>'}</td></tr>`).join("")}
 </tbody></table></div></div>`}
function importAction(a){const x=DB.exams.find(e=>e.id===route.id);if(a==="ev-cancel"){UI.imp=null;render();return}
 if(a==="ev-save"){applyImport(x,UI.imp.rows,UI.imp.file,UI.imp.map);UI.imp=null;persist();toast("Results saved");render()}}

/* ---------- statistics ---------- */
const BANDS=[[0,40,"Under 40"],[40,50,"40–49"],[50,60,"50–59"],[60,70,"60–69"],[70,80,"70–79"],[80,101,"80+"]];
function statsOf(vals,pass){const v=vals.slice().sort((a,b)=>a-b),n=v.length;if(!n)return{n:0};const mean=v.reduce((a,b)=>a+b,0)/n,med=n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2;
 const np=vals.ok?vals.ok.filter(Boolean).length:v.filter(x=>x>=pass).length;return{n,mean,med,min:v[0],max:v[n-1],pass:np,rate:Math.round(np/n*100),bands:BANDS.map(([a,b])=>v.filter(x=>x>=a&&x<b).length)}}
const exVals=(x,f)=>{const C=exCands(x).filter(p=>!x.absent[p.id]&&x.marks[p.id]!=null&&(!f||f(p))),v=C.map(p=>+x.marks[p.id]);v.ok=C.map(p=>exPass(x,p,+x.marks[p.id]));return v};
const bandBar=(b,pass)=>{const t=b.reduce((a,c)=>a+c,0)||1;const C=["var(--bad)","#C8794B","var(--gold)","#7FA37A","var(--ok)","#1F5233"];return`<span class="dist" title="${BANDS.map(([,,l],i)=>`${l}: ${b[i]}`).join(", ")}">${b.map((n,i)=>n?`<i style="width:${n/t*100}%;background:${C[i]}"></i>`:"").join("")}</span>`};
const bandLegend=()=>`<div class="legend">${BANDS.map(([,,l],i)=>`<span><i style="background:${["var(--bad)","#C8794B","var(--gold)","#7FA37A","var(--ok)","#1F5233"][i]}"></i>${l}%</span>`).join("")}</div>`;
function examResultsPanel(x){const all=exVals(x);if(!all.length)return"";const S=statsOf(all,x.passMark),specs=exSpecs(x).filter(s=>exVals(x,p=>p.spec===s).length);
 const rows=[];specs.forEach(s=>{rows.push([s,null,statsOf(exVals(x,p=>p.spec===s),x.passMark),exCands(x).filter(p=>p.spec===s&&x.absent[p.id]).length]);
  const ys=[...new Set(exCands(x).filter(p=>p.spec===s).map(p=>examYear(x,p)))].sort();if(ys.length>1)ys.forEach(y=>rows.push([s,y,statsOf(exVals(x,p=>p.spec===s&&examYear(x,p)===y),x.passMark),exCands(x).filter(p=>p.spec===s&&examYear(x,p)===y&&x.absent[p.id]).length]))});
 const items=Object.entries(x.items||{});
 return`<div class="panel" style="display:grid;gap:12px"><div class="head"><h3 style="margin:0">Results dashboard</h3><span class="subt">Pass mark ${x.passMark}%</span></div>
 <div class="kpis"><div class="kpi"><span class="n">${S.n}</span><span class="l">Sat the exam</span><span class="sub">${exCands(x).filter(p=>x.absent[p.id]).length} absent</span></div><div class="kpi"><span class="n">${S.rate}%</span><span class="l">Pass rate</span><span class="sub">${S.pass} of ${S.n} passed</span></div><div class="kpi"><span class="n">${S.mean.toFixed(1)}</span><span class="l">Mean %</span><span class="sub">median ${S.med.toFixed(1)}</span></div><div class="kpi"><span class="n">${S.max}</span><span class="l">Highest %</span><span class="sub">lowest ${S.min}</span></div></div>
 <div class="tblwrap"><table><thead><tr><th>Specialty</th><th>Year at RIC</th><th class="num">Sat</th><th class="num">Absent</th><th class="num">Mean</th><th class="num">Median</th><th class="num">Range</th><th class="num">Pass rate</th><th style="min-width:160px">Score bands</th></tr></thead><tbody>
 ${rows.map(([s,y,t,ab])=>`<tr class="${y==null?"":"subrow"}"><td>${y==null?`<b>${esc(s)}</b>`:""}</td><td>${y==null?"All":y?"Year "+y:"Other"}</td><td class="num">${t.n}</td><td class="num">${ab}</td><td class="num">${t.n?t.mean.toFixed(1):"—"}</td><td class="num">${t.n?t.med.toFixed(1):"—"}</td><td class="num">${t.n?`${t.min}–${t.max}`:"—"}</td><td class="num"><b class="${t.rate<50?"d-red":""}">${t.n?t.rate+"%":"—"}</b></td><td>${t.n?bandBar(t.bands):""}</td></tr>`).join("")}
 </tbody></table></div>${bandLegend()}
 ${items.map(([paper,it])=>{const q=it.key.map((k,i)=>({i,k,c:it.correct[i],pct:it.n?Math.round(it.correct[i]/it.n*100):0,blank:it.blank[i],multi:it.multi[i]})).filter(q=>q.k);const hard=q.slice().sort((a,b)=>a.pct-b.pct).slice(0,8),low=q.filter(q=>q.pct<30).length,easy=q.filter(q=>q.pct>=90).length;
  return`<div style="display:grid;gap:8px"><h3 style="margin:0">Question analysis · ${esc(paper)} <span class="subt">${it.n} candidates, ${q.length} questions</span></h3>
  <p class="subt" style="margin:0">${low} questions answered correctly by under 30% (check the key or the question) · ${easy} answered correctly by 90% or more · ${q.reduce((a,b)=>a+b.multi,0)} answers had more than one option marked.</p>
  <div class="qgrid">${q.map(q=>`<span class="qcell ${q.pct<30?"q-low":q.pct<50?"q-mid":q.pct>=90?"q-easy":""}" title="Q${q.i+1}: key ${esc(q.k)}, ${q.pct}% correct${q.blank?`, ${q.blank} blank`:""}">${q.i+1}</span>`).join("")}</div>
  <div class="legend"><span><i style="background:var(--bad)"></i>Under 30% correct</span><span><i style="background:var(--gold)"></i>30–49%</span><span><i style="background:var(--mute-soft)"></i>50–89%</span><span><i style="background:var(--ok)"></i>90% or more</span></div>
  <div class="tblwrap"><table><thead><tr><th>Hardest questions</th><th>Key</th><th class="num">Correct</th><th class="num">Blank</th></tr></thead><tbody>${hard.map(q=>`<tr><td>Q${q.i+1}</td><td>${esc(q.k)}</td><td class="num"><b class="${q.pct<30?"d-red":""}">${q.pct}%</b> <span class="subt">(${q.c}/${it.n})</span></td><td class="num">${q.blank}</td></tr>`).join("")}</tbody></table></div></div>`}).join("")}</div>`}
function examYear(x,p){if(!p.start)return 0;const s=specOf(p.spec),at=P(x.date||x.month+"-15");const r=ricInfo(p);if(!r.join)return 0;if(at<P(r.join))return 0;return Math.min(Math.floor(days(at,P(r.join))/365.25)+1,r.max||3)}

/* ---------- Exams overview with trends ---------- */
UI.exPick="";
function trendChart(X){const specs=[...new Set(X.flatMap(x=>exSpecs(x).filter(s=>exVals(x,p=>p.spec===s).length)))].sort((a,b)=>specIdx(a)-specIdx(b));if(!specs.length)return"";
 const W=Math.max(420,X.length*140+120),H=210,L=40,R=110,T=14,B=30,xs=i=>X.length===1?L+(W-L-R)/2:L+i*(W-L-R)/(X.length-1),y=v=>T+(100-v)/100*(H-T-B);
 const pal=["#6D1F2B","#B08D57","#2F5D7A","#2F6B45","#8A5A00","#7A4E8C","#A1262F","#4F7A7A","#5B6B2F"];
 return`<div class="tblwrap"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Mean score by specialty across exams">
 ${[0,25,50,75,100].map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`).join("")}
 ${X.map((x,i)=>`<text x="${xs(i)}" y="${H-10}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(x.session)}</text>`).join("")}
 ${specs.map((s,si)=>{const pts=X.map((x,i)=>{const v=exVals(x,p=>p.spec===s);return v.length?[xs(i),y(v.reduce((a,b)=>a+b,0)/v.length),v.reduce((a,b)=>a+b,0)/v.length]:null}).filter(Boolean);const c=pal[si%pal.length];const last=pts[pts.length-1];
  return`${pts.length>1?`<polyline fill="none" stroke="${c}" stroke-width="2" points="${pts.map(p=>p[0]+","+p[1]).join(" ")}"/>`:""}${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${c}"><title>${esc(s)}: ${p[2].toFixed(1)}</title></circle>`).join("")}${last?`<text x="${last[0]+8}" y="${last[1]+4}" font-size="11" fill="${c}">${esc(SPEC_CODE[s]||s)} ${last[2].toFixed(0)}</text>`:""}`}).join("")}
 </svg></div>`}
function vExams(){const X=DB.exams.slice().sort((a,b)=>a.month<b.month?1:-1),done=X.filter(x=>exVals(x).length).reverse();
 const pick=DB.exams.find(x=>x.id===UI.exPick)||done[done.length-1];const all=X.flatMap(x=>exCands(x).filter(p=>x.marks[p.id]!=null).map(p=>p.id));
 return`<div class="head"><div><h2>PGT examinations</h2><p>Six-monthly internal examination for all specialties. Upload Evalbee result files inside each exam.</p></div><button class="btn primary" data-act="ex-new">New examination</button></div>
 <div class="kpis"><div class="kpi"><span class="n">${done.length}</span><span class="l">Exams with results</span><span class="sub">${X.length} on record</span></div><div class="kpi"><span class="n">${new Set(all).size}</span><span class="l">PGTs with results</span><span class="sub">${all.length} papers marked</span></div>
  ${pick?(()=>{const S=statsOf(exVals(pick),pick.passMark);return`<div class="kpi"><span class="n">${S.rate}%</span><span class="l">Pass rate · ${esc(pick.session)}</span><span class="sub">${S.pass} of ${S.n} at ${pick.passMark}%</span></div><div class="kpi"><span class="n">${S.mean.toFixed(1)}</span><span class="l">Mean % · ${esc(pick.session)}</span><span class="sub">median ${S.med.toFixed(1)}</span></div>`})():""}</div>
 ${done.length?`<div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Results by specialty</h3><select id="ex-pick" aria-label="Exam">${done.slice().reverse().map(x=>`<option value="${x.id}" ${pick===x?"selected":""}>${esc(x.title)} · ${esc(x.session)}</option>`).join("")}</select></div>
  <div class="tblwrap"><table><thead><tr><th>Specialty</th><th class="num">Sat</th><th class="num">Mean</th><th class="num">Median</th><th class="num">Range</th><th class="num">Pass rate</th><th style="min-width:160px">Score bands</th>${done.length>1?"<th>Change from previous</th>":""}</tr></thead><tbody>
  ${exSpecs(pick).map(s=>{const t=statsOf(exVals(pick,p=>p.spec===s),pick.passMark);if(!t.n)return"";const prev=done[done.indexOf(pick)-1];const pt=prev?statsOf(exVals(prev,p=>p.spec===s),prev.passMark):null;const dm=pt&&pt.n?t.mean-pt.mean:null;
   return`<tr><td>${esc(s)}</td><td class="num">${t.n}</td><td class="num">${t.mean.toFixed(1)}</td><td class="num">${t.med.toFixed(1)}</td><td class="num">${t.min}–${t.max}</td><td class="num"><b class="${t.rate<50?"d-red":""}">${t.rate}%</b></td><td>${bandBar(t.bands)}</td>${done.length>1?`<td>${dm==null?'<span class="subt">No earlier result</span>':`<span class="${dm<0?"d-red":""}">${dm>=0?"▲":"▼"} ${Math.abs(dm).toFixed(1)} points</span> <span class="subt">pass rate ${pt.rate}% → ${t.rate}%</span>`}</td>`:""}</tr>`}).join("")}
  </tbody></table></div>${bandLegend()}</div>
  <div class="panel" style="display:grid;gap:10px"><h3 style="margin:0">Trend · mean score by specialty</h3>${trendChart(done)}${done.length<2?`<p class="subt" style="margin:0">The trend fills in as more exams are uploaded.</p>`:""}
   <div class="tblwrap"><table><thead><tr><th>Specialty</th>${done.map(x=>`<th class="num">${esc(x.session)}</th>`).join("")}</tr></thead><tbody>${[...new Set(done.flatMap(x=>exSpecs(x).filter(s=>exVals(x,p=>p.spec===s).length)))].sort((a,b)=>specIdx(a)-specIdx(b)).map(s=>`<tr><td>${esc(s)}</td>${done.map(x=>{const t=statsOf(exVals(x,p=>p.spec===s),x.passMark);return`<td class="num">${t.n?`${t.mean.toFixed(1)} <span class="subt">· ${t.rate}% pass</span>`:"—"}</td>`}).join("")}</tr>`).join("")}</tbody></table></div></div>`:`<div class="flag info">No results yet. Open an exam, mark it as held, then upload the Evalbee result files.</div>`}
 <div class="panel flush"><h3>All examinations</h3><div class="tblwrap"><table><thead><tr><th>Session</th><th>Examination</th><th>Date</th><th>Progress</th><th class="num">Candidates</th><th class="num">Mean %</th><th class="num">Pass rate</th><th>Attention</th></tr></thead><tbody>
 ${X.map(x=>{const st=statsOf(exVals(x),x.passMark);return`<tr class="click" data-href="exam-${x.id}"><td>${esc(x.session)}</td><td>${esc(x.title)}</td><td>${x.date?fd(x.date):mLabel(x.month)}</td><td><span class="pill ${["p-done","p-rot","p-rot","p-leave","p-pend","p-ric"][x.stage]}">${EX_STAGES[x.stage]}</span></td><td class="num">${exCands(x).length}</td><td class="num">${st.n?st.mean.toFixed(1):"—"}</td><td class="num">${st.n?st.rate+"%":"—"}</td><td class="wrapcell">${exFlags(x).map(f=>`<span class="d-red" style="font-size:13px;display:block">${esc(f)}</span>`).join("")||"—"}</td></tr>`}).join("")}
 </tbody></table></div></div>`}

/* ---------- seed: June 2026 Cardiac Surgery Year 3 results (from the Evalbee file provided) ---------- */
function seedPastExam(d){const x={id:"EX0",title:"Internal PGT Examination",session:"Jun/Jul 2026",month:"2026-06",date:"2026-06-20",venue:"",passMark:60,scope:"all",stage:4,papers:{"Cardiac Surgery":{req:true,recv:true,key:true,mod:true,final:true}},marks:{},absent:{},cands:[],added:[],removed:{},roll:{},log:[{at:"2026-06-20T09:00:00Z",by:"Import",what:"Created from the Evalbee result file Cardiac_Surg_Yr3_2026-06-20_1.xlsx (Cardiac Surgery Year 3 only)"}],imported:true};
 const saveDB=DB;DB=d;try{const rows=parseEvalbee(SAMPLE_RESULTS);const pool=verified();const map={};rows.forEach((r,i)=>{const[p]=matchRow(x,r,pool);map[i]=p?.id||""});applyImport(x,rows,"Cardiac_Surg_Yr3_2026-06-20_1.xlsx",map);x.stage=4;x.log=x.log.filter(l=>l.by==="Import"||true)}finally{DB=saveDB}
 return x}
