/* =====================================================================
   PHASE 6: exam candidates, exam history on PGT profile, conduct records
   ===================================================================== */
const canConduct=()=>isAdmin()||!!meObj().conduct;
const EXCL=["On leave on exam day","On rotation outside RIC","Exempted by DME","Not yet eligible","Training completed","Other"];
function exBase(x){return verified().filter(p=>{const c=CUR.get(p.id);return c.active&&c.pk!=="pause"&&(x.scope==="all"||c.pk==="ric"||(c.pk==="bad"&&c.phase==="Past expected completion"))})}
function exCands(x){if(x.cands)return x.cands.map(id=>DB.pgts.find(p=>p.id===id)).filter(Boolean);
 const rm=x.removed||{},add=x.added||[];const ids=[...new Set([...exBase(x).map(p=>p.id),...add])].filter(id=>!rm[id]);
 return ids.map(id=>DB.pgts.find(p=>p.id===id)).filter(Boolean).sort((a,b)=>specIdx(a.spec)-specIdx(b.spec)||a.name.localeCompare(b.name))}
function exExcluded(x){const rm=x.removed||{};return Object.keys(rm).map(id=>[DB.pgts.find(p=>p.id===id),rm[id]]).filter(r=>r[0])}
function exCandPanel(x){if(x.stage>=3)return"";const C=exCands(x),ex=exExcluded(x),others=verified().filter(p=>CUR.get(p.id).active&&!C.includes(p));
 const k=s=>C.filter(p=>{const c=CUR.get(p.id);return s==="ric"?c.pk==="ric":s==="leave"?!!c.leave:s==="add"?(x.added||[]).includes(p.id):false}).length;
 return`<div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Candidate list · ${C.length}</h3>${xbtn("examcands:"+x.id,"Download candidate list")}</div>
 <p class="subt" style="margin:0">Generated from ${x.scope==="ric"?"active PGTs currently at RIC":"all active PGTs, including those on rotation"}${(x.added||[]).length?`, plus ${(x.added||[]).length} added by hand`:""}${ex.length?`, minus ${ex.length} excluded`:""}. ${k("leave")?`<b>${k("leave")} on leave today</b>; check before the exam. `:""}It updates as PGTs join, leave or rotate, and is fixed when the exam is marked as held.</p>
 <div class="toolbar"><input id="ex-add" list="ex-pgts" placeholder="Add a PGT by name or ID" style="flex:1 1 240px" aria-label="Add PGT"><datalist id="ex-pgts">${others.map(p=>`<option value="${esc(pgtLabel(p))}">`).join("")}</datalist><button class="btn small" data-act="ex-addc">Add to exam</button>
  <select id="ex-scope" aria-label="Who is eligible">${opt([["ric","Eligible: active PGTs at RIC"],["all","Eligible: all active PGTs"]],x.scope)}</select></div>
 ${ex.length?`<details><summary class="subt" style="cursor:pointer">${ex.length} excluded</summary><div class="tblwrap"><table><tbody>${ex.map(([p,r])=>`<tr><td>${pgtName(p)}<div class="subt">${esc(p.spec)}</div></td><td>${esc(r)}</td><td><button class="btn link" data-act="ex-incl" data-id="${p.id}">Include again</button></td></tr>`).join("")}</tbody></table></div></details>`:""}</div>`}

/* exam history for a PGT */
function pgtExams(p){return DB.exams.filter(x=>(x.cands?x.cands.includes(p.id):false)&&(x.marks[p.id]!=null||x.absent[p.id])).sort((a,b)=>a.month<b.month?-1:1).map(x=>{
 const peers=exCands(x).filter(q=>q.spec===p.spec&&!x.absent[q.id]&&x.marks[q.id]!=null),m=x.marks[p.id],ab=!!x.absent[p.id];
 const sorted=peers.map(q=>+x.marks[q.id]).sort((a,b)=>b-a);const mean=sorted.length?sorted.reduce((a,b)=>a+b,0)/sorted.length:null;
 return{x,m:ab?null:+m,ab,pass:!ab&&exPass(x,p,+m),rank:ab?null:sorted.indexOf(+m)+1,of:sorted.length,mean,year:examYear(x,p)||null,pub:x.stage>=5}})}
function examChart(rows){const R=rows.filter(r=>r.m!=null);if(R.length<1)return"";const W=Math.max(260,R.length*86),H=150,pad=28,bw=34;const y=v=>H-pad-(v/100)*(H-pad-12);
 const pm=R[R.length-1].x.passMark;
 return`<div class="tblwrap"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Internal exam marks over time">
 ${[0,50,100].map(v=>`<line x1="24" x2="${W-6}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="20" y="${y(v)+4}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`).join("")}
 <line x1="24" x2="${W-6}" y1="${y(pm)}" y2="${y(pm)}" stroke="var(--bad)" stroke-dasharray="4 3" stroke-width="1"/><text x="${W-8}" y="${y(pm)-4}" text-anchor="end" font-size="10" fill="var(--bad)">pass ${pm}%</text>
 ${R.map((r,i)=>{const cx=40+i*86+bw/2;return`${r.mean!=null?`<line x1="${cx-bw/2-4}" x2="${cx+bw/2+4}" y1="${y(r.mean)}" y2="${y(r.mean)}" stroke="var(--gold)" stroke-width="2"/>`:""}<rect x="${cx-bw/2}" y="${y(r.m)}" width="${bw}" height="${H-pad-y(r.m)}" rx="3" fill="${r.pass?"var(--ok)":"var(--bad)"}"/><text x="${cx}" y="${y(r.m)-4}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${r.m}</text><text x="${cx}" y="${H-10}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(r.x.session.replace(/^.*?(\w{3}) (\d{4})$/,"$1 $2"))}</text>`}).join("")}
 </svg></div><div class="legend"><span><i style="background:var(--ok)"></i>Pass</span><span><i style="background:var(--bad)"></i>Below pass mark</span><span><i style="background:var(--gold)"></i>Specialty average</span></div>`}
function pgtExamPanel(p){if(p.reg!=="Verified"||!canSee("exams")&&!canSee("pgts"))return"";const R=pgtExams(p);
 return`<div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Internal examinations · ${R.length}</h3>${R.length?`<span class="subt">${R.filter(r=>r.pass).length} passed · ${R.filter(r=>r.m!=null&&!r.pass).length} below pass mark · ${R.filter(r=>r.ab).length} absent</span>`:""}</div>
 ${R.length?`${examChart(R)}<div class="tblwrap"><table><thead><tr><th>Exam</th><th>Date</th><th class="num">Year at RIC then</th><th class="num">Marks %</th><th>Result</th><th class="num">Position in specialty</th><th class="num">Specialty average</th></tr></thead><tbody>
  ${R.slice().reverse().map(r=>`<tr class="click" data-href="exam-${r.x.id}"><td>${esc(r.x.session)}${r.pub?"":' <span class="pill p-pause">Provisional</span>'}</td><td>${fd(r.x.date)}</td><td class="num">${r.year??"—"}</td><td class="num">${r.ab?"—":r.m}</td><td>${r.ab?'<span class="pill p-done">Absent</span>':r.pass?'<span class="pill p-ric">Pass</span>':'<span class="pill p-bad">Fail</span>'}</td><td class="num">${r.rank?`${r.rank} of ${r.of}`:"—"}</td><td class="num">${r.mean==null?"—":r.mean.toFixed(1)}</td></tr>`).join("")}
 </tbody></table></div>`:`<p class="oempty">No internal exam results yet. Results appear here once marks are entered for an exam this PGT sat.</p>`}</div>`}

/* conduct records */
const CD_TYPES=["Verbal warning","Written warning","Explanation called","Show-cause notice","Misconduct report","Suspension","Other"];
const CD_CATS=["Absence from duty","Late or incomplete duty","Unprofessional behaviour","Patient care or safety concern","Academic dishonesty","Breach of hospital rules","Leave without approval","Other"];
const CD_ACTS=["None yet","Counselled","Warning letter issued","Referred to disciplinary committee","Reported to CPSP / UHS","Other"];
const conductOf=p=>(DB.conduct||[]).filter(c=>c.pid===p.id).sort((a,b)=>a.date<b.date?1:-1);
const conductBadge=p=>{if(!canConduct())return"";const n=conductOf(p).length,o=conductOf(p).filter(c=>c.status==="Open").length;return n?` <span class="pill ${o?"p-bad":"p-done"}" title="Conduct records">${n} conduct${o?`, ${o} open`:""}</span>`:""};
function pgtConductPanel(p){if(!canConduct()||p.reg!=="Verified")return"";const R=conductOf(p);
 return`<div class="panel" style="display:grid;gap:10px"><div class="head"><div><h3 style="margin:0">Conduct and disciplinary record · ${R.length}</h3><p class="subt" style="margin:4px 0 0">Visible only to the Director and people you allow in Settings.</p></div><button class="btn small" data-act="cd-add" data-id="${p.id}">Add record</button></div>
 ${R.length?`<div class="tblwrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Details</th><th>Action taken</th><th>Issued by</th><th>Status</th><th></th></tr></thead><tbody>
 ${R.map(c=>`<tr><td>${fd(c.date)}</td><td><span class="pill ${["Suspension","Misconduct report","Show-cause notice"].includes(c.type)?"p-bad":"p-pause"}">${esc(c.type)}</span></td><td>${esc(c.cat)}</td><td class="wrapcell">${esc(c.desc)}${c.ref?`<div class="subt">Ref: ${esc(c.ref)}</div>`:""}${c.doc?'<div class="subt">Document attached</div>':""}</td><td>${esc(c.action)}</td><td>${esc(c.by)}</td><td><span class="pill ${c.status==="Open"?"p-bad":"p-ric"}">${c.status}</span>${c.resolution?`<div class="subt">${esc(c.resolution)}</div>`:""}</td><td><button class="btn link" data-act="cd-edit" data-id="${c.id}">Edit</button>${isAdmin()?`<button class="btn link" data-act="cd-del" data-id="${c.id}">Delete</button>`:""}</td></tr>`).join("")}
 </tbody></table></div>`:`<p class="oempty">No conduct records.</p>`}</div>`}
function sheetConduct(p,c){const n=!c;c=c||{date:iso(TODAY),type:"Verbal warning",cat:"Absence from duty",desc:"",action:"None yet",by:ME,ref:"",status:"Open",resolution:""};
 openSheet(n?`Conduct record · Dr. ${p.name}`:"Edit conduct record",`
 <div class="grid2"><label class="f">Date of incident or notice<input type="date" name="d" value="${c.date}"></label><label class="f">Type<select name="t">${opt(CD_TYPES,c.type)}</select></label></div>
 <label class="f">Category<select name="c">${opt(CD_CATS,c.cat)}</select></label>
 <label class="f">What happened <span class="h">brief and factual</span><textarea name="ds">${esc(c.desc)}</textarea></label>
 <div class="grid2"><label class="f">Action taken<select name="a">${opt(CD_ACTS,c.action)}</select></label><label class="f">Issued or reported by<input name="b" list="cd-fac" value="${esc(c.by)}"><datalist id="cd-fac">${[...DB.staff.map(s=>s.name),...DB.faculty.map(facName)].map(x=>`<option value="${esc(x)}">`).join("")}</datalist></label></div>
 <label class="f">Letter or reference number <span class="h">optional</span><input name="r" value="${esc(c.ref)}" placeholder="e.g. RIC/ME&amp;T/2026/112"></label>
 <label class="f">Letter or document <span class="h">optional</span><input type="file" name="doc" accept="image/*,application/pdf"></label>
 <div class="grid2"><label class="f">Status<select name="s">${opt(["Open","Resolved"],c.status)}</select></label><label class="f">Resolution <span class="h">if resolved</span><input name="rs" value="${esc(c.resolution)}" placeholder="e.g. Reply accepted, no further action"></label></div>`,()=>{
 if(!fv("d"))return fail("Enter the date.");if(fv("ds").length<5)return fail("Describe what happened.");
 const rec={date:fv("d"),type:fv("t"),cat:fv("c"),desc:fv("ds"),action:fv("a"),by:fv("b"),ref:fv("r"),status:fv("s"),resolution:fv("rs")};
 const fl=document.querySelector('#sheetform [name="doc"]').files[0];if(fl)rec.doc=true;
 if(n){DB.conduct=DB.conduct||[];DB.conduct.push({id:uid("CD"),pid:p.id,...rec,enteredBy:ME,at:new Date().toISOString()});log(`Conduct record added for Dr. ${p.name}: ${rec.type} (${rec.cat})`,"pgt-"+p.id)}
 else{Object.assign(c,rec);log(`Conduct record edited for Dr. ${p.name}: ${rec.type}, ${rec.status}`,"pgt-"+p.id)}toast("Saved");return true})}
function conductAction(a,b){if(!canConduct())return;
 if(a==="cd-add")return sheetConduct(DB.pgts.find(p=>p.id===b.dataset.id));
 const c=(DB.conduct||[]).find(x=>x.id===b.dataset.id);if(!c)return;const p=DB.pgts.find(x=>x.id===c.pid);
 if(a==="cd-edit")return sheetConduct(p,c);
 if(a==="cd-del"&&isAdmin()){if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Confirm delete";return}DB.conduct=DB.conduct.filter(x=>x!==c);log(`Conduct record deleted for Dr. ${p.name}: ${c.type} of ${fd(c.date)}`,"pgt-"+p.id);persist();render()}}

/* timeline additions */
function extraTimeline(p){const ev=[];
 pgtExams(p).forEach(r=>ev.push({d:r.x.date||r.x.month+"-01",k:"exam",e:`${r.x.title} ${r.x.session}: ${r.ab?"absent":r.m+"% · "+(r.pass?"pass":"below pass mark")}${r.rank?` · ${r.rank} of ${r.of} in specialty`:""}`,n:r.pub?"":"Provisional until results are published",by:""}));
 if(canConduct())conductOf(p).forEach(c=>ev.push({d:c.date,k:"conduct",e:`Conduct: ${c.type} · ${c.cat}`,n:`${c.action}${c.status==="Resolved"?" · resolved":" · open"}`,by:c.enteredBy||""}));
 return ev}

/* exports */
EXPORTS.examcands=id=>{const x=DB.exams.find(e=>e.id===id);return{file:`Candidates ${x.title} ${x.session}`,sheets:[sheetFrom("Candidates",exCands(x).map(p=>{const c=CUR.get(p.id);return{"Roll no.":x.roll?.[p.id]||"","PGT ID":p.code,"Name":"Dr. "+p.name,"Programme":p.program,"Specialty":p.spec,"Year at RIC":ricLabel(p),"Status":c.leave?"On leave":c.phase,"Added by hand":(x.added||[]).includes(p.id)?"Yes":""}})),sheetFrom("Excluded",exExcluded(x).map(([p,r])=>({"PGT ID":p.code,"Name":"Dr. "+p.name,"Specialty":p.spec,"Reason":r})))]}};
function examCandAction(a,b){const x=DB.exams.find(e=>e.id===route.id);if(!x)return;x.added=x.added||[];x.removed=x.removed||{};
 if(a==="ex-addc"){const v=pick("ex-add"),p=verified().find(q=>pgtLabel(q)===v);if(!p){toast("Choose a PGT from the list");return}delete x.removed[p.id];if(!exCands(x).includes(p))x.added.push(p.id);xlog(x,`Added Dr. ${p.name} to the candidate list`);persist();render();return}
 if(a==="ex-excl"){const p=DB.pgts.find(q=>q.id===b.dataset.id);return openSheet(`Exclude Dr. ${p.name}`,`<label class="f">Reason<select name="r">${opt(EXCL)}</select></label><label class="f">Note <span class="h">optional</span><input name="n"></label>`,()=>{const r=fv("r")+(fv("n")?": "+fv("n"):"");x.removed[p.id]=r;x.added=x.added.filter(i=>i!==p.id);xlog(x,`Excluded Dr. ${p.name} (${r})`);toast("Excluded");return true},"Exclude")}
 if(a==="ex-incl"){const p=DB.pgts.find(q=>q.id===b.dataset.id);delete x.removed[p.id];if(!exBase(x).includes(p))x.added.push(p.id);xlog(x,`Included Dr. ${p.name} again`);persist();render()}}
