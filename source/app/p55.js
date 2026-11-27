/* =====================================================================
   V55 · RESULTS TO SUPERVISORS. Once an exam's results are published,
   each supervisor gets one WhatsApp message listing their trainees in
   the exam: name, PGT ID, year, each paper's marks and percentage, and
   pass or fail. The messages go out through the WhatsApp messages page,
   one tap per supervisor. Guests (not PGTs) are left out.
   ===================================================================== */
/* the trainee's supervisor now; if none, the one on the exam date */
function srSupOf(x,p){const c=CUR.get(p.id);if(c&&c.sup)return c.sup;const d=x.date||iso(TODAY);
 const s=(DB.sups||[]).filter(s=>s.pid===p.id&&s.from<=d&&(!s.to||s.to>=d)).sort((a,b)=>a.from<b.from?1:-1)[0];return s?facById(s.fid)||null:null}
const srPassTxt=(x,k)=>{const r=(x.passPaper||{})[k];return r&&r.mode==="marks"?`${r.marks} marks`:`${+(+exPassFor(x,k)).toFixed(2)}%`};
function srData(x,spec){const cache={},row=(k,p)=>{if(!cache[k])cache[k]=rsData(x,k,null,{});return cache[k].R.find(r=>r.p.id===p.id)};
 const G=new Map(),none=[];
 exCands(x).filter(p=>!p.guest&&(!spec||p.spec===spec)).forEach(p=>{const papers=exAllPapers(x).filter(k=>exInPaper(x,p,k)).map(k=>({k,r:row(k,p)})).filter(z=>z.r);if(!papers.length)return;
  const f=srSupOf(x,p);if(!f){none.push(p);return}if(!G.has(f.id))G.set(f.id,{f,list:[]});G.get(f.id).list.push({p,papers})});
 const sups=[...G.values()].sort((a,b)=>a.f.name.localeCompare(b.f.name));sups.forEach(s=>s.list.sort((a,b)=>a.p.name.localeCompare(b.p.name)));
 return{sups,none:none.sort((a,b)=>a.name.localeCompare(b.name))}}
const srPct=v=>`${Math.round(v*10)/10}%`;
/* a paper's name as a supervisor reads it: the specialty paper without its year group */
const srPaper=(x,k)=>exIsCommon(x,k)?k:exPaperSpec(k);
function srLine(x,z){const r=z.r,n=srPaper(x,z.k);if(r.ab)return`• ${n}: Absent`;if(r.m==null)return`• ${n}: Result awaited`;
 return`• ${n}: ${r.ob!=null?`${r.ob}/${r.tt} (${srPct(r.m)})`:srPct(r.m)} – *${r.res==="Pass"?"PASS":"FAIL"}*`}
/* the {results} part of one supervisor's message. WhatsApp turns lines that start with "1. " or "- " into
   indented lists, so names are bold, lines start flush left, and a blank line separates trainees */
function srText(x,s){const ks=[...new Set(s.list.flatMap(t=>t.papers.map(z=>z.k)))],pm=new Map();ks.forEach(k=>pm.set(srPaper(x,k),srPassTxt(x,k)));
 const body=s.list.map(({p,papers},i)=>{const y=examYear(x,p),id=candId(p),sub=[id,y?`Year ${y}`:""].filter(Boolean).join(" · ");
  return[`*${i+1}. ${candName(p)}*`,...(sub?[sub]:[]),...papers.map(z=>srLine(x,z))].join("\n")}).join("\n\n");
 const vals=[...new Set(pm.values())];
 return body+"\n\n"+(vals.length===1?`Pass mark: ${vals[0]}`:`*Pass marks*\n${[...pm].map(([n,v])=>`${n}: ${v}`).join("\n")}`)}
const srExam=x=>{const t=String(x.title||"").trim(),se=String(x.session||"").trim();return!se||t.includes(se)||/\b(19|20)\d{2}\b/.test(t)?t:`${t} (${se})`};
const srTpl=x=>`Dear {name},\n\nThe results of the *{exam}*${x.date?", held on {date},":""} have been published. Please find your trainees' results below.\n\n{results}\n\nRegards,\nDepartment of Medical Education & Training\nRawalpindi Institute of Cardiology`;
const srRec=(x,s)=>{const r=recFac(s.f);return{...r,key:"sr:"+s.f.id,sub:`${s.list.length} trainee${s.list.length>1?"s":""} in this exam`,vars:{...r.vars,exam:srExam(x),date:x.date?fd(x.date):"",results:srText(x,s)}}};

function sheetSupRes(x,spec){spec=spec||"";const{sups,none}=srData(x,spec),noNum=sups.filter(s=>!waNum(s.f.mobile)),n=sups.reduce((a,s)=>a+s.list.length,0),wait=sups.reduce((a,s)=>a+s.list.filter(t=>t.papers.some(z=>!z.r.ab&&z.r.m==null)).length,0);
 const specs=exSpecs(x).filter(s=>exCands(x).some(p=>p.spec===s&&!p.guest));
 openSheet(`Results to supervisors · ${x.title}`,`<p class="subt" style="margin:0">Each supervisor gets one WhatsApp message with their trainees' marks and pass or fail. You check the message, then send it one supervisor at a time.</p>
 <label class="f">Specialty<select name="spec" data-srspec="${x.id}">${opt([["","All specialties"],...specs.map(s=>[s,s])],spec)}</select></label>
 <div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><span class="n">${sups.length}</span><span class="l">Supervisors</span></div><div class="kpi"><span class="n">${n}</span><span class="l">Trainees</span></div><div class="kpi"><span class="n">${sups.length-noNum.length}</span><span class="l">With a WhatsApp number</span></div></div>
 ${wait?`<div class="flag">${wait} trainee${wait>1?"s have":" has"} a result still awaited (marks not entered). Their message will say "result awaited".</div>`:""}
 ${noNum.length?`<div class="flag">No mobile number for ${noNum.map(s=>`<a href="#cred-${s.f.id}">${esc(facName(s.f))}</a>`).join(", ")}. Add it in the Faculty directory to send to them.</div>`:""}
 ${none.length?`<div class="flag">No supervisor recorded for ${none.length} trainee${none.length>1?"s":""}: ${none.slice(0,12).map(p=>`<a href="#pgt-${p.id}">${esc(candName(p))}</a>`).join(", ")}${none.length>12?` and ${none.length-12} more`:""}. Their results are not included.</div>`:""}
 <div style="display:grid;gap:6px">${sups.map(s=>`<details class="srprev"><summary><b>${esc(facName(s.f))}</b> <span class="subt">${s.list.length} trainee${s.list.length>1?"s":""}${waNum(s.f.mobile)?"":" · no number"}</span></summary><div class="msgprev" style="margin-top:6px"><div>${esc(msgFill(srTpl(x),srRec(x,s))).replace(/\*([^*\n]+)\*/g,"<b>$1</b>").replace(/\n/g,"<br>")}</div></div></details>`).join("")||`<p class="empty">No trainees with a supervisor in this exam.</p>`}</div>`,
 ()=>{if(!sups.length)return fail("Nobody to send to.");UI.msg={recs:[],text:srTpl(x),sent:{},src:"supres"};msgAdd(sups.map(s=>srRec(x,s)));
  x.supSent={at:new Date().toISOString(),by:ME,n:sups.length,spec};xlog(x,`Results prepared for ${sups.length} supervisor${sups.length>1?"s":""}${spec?` (${spec})`:""} on WhatsApp`);persist();closeSheet();go("messages");return false},"Open WhatsApp messages")}
document.addEventListener("change",e=>{const t=e.target;if(!t.dataset||!t.dataset.srspec)return;const x=DB.exams.find(z=>z.id===t.dataset.srspec);if(x)sheetSupRes(x,t.value)});
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="ex-supres"]');if(!b||!DB)return;const x=DB.exams.find(z=>z.id===route.id);if(x)sheetSupRes(x)});

/* the button, once results are published */
{const _v=vExam;vExam=function(){let h=_v();const x=DB.exams.find(e=>e.id===route.id);if(!x||x.practice||(x.stage||0)<5||isViewer())return h;
 return h.replace('<span><b>Results published.</b></span><span class="actions">',`<span><b>Results published.</b>${x.supSent?` <span class="subt">Messages for ${x.supSent.n} supervisor${x.supSent.n>1?"s":""} prepared on ${fd(dDay(x.supSent.at))}.</span>`:""}</span><span class="actions"><button class="btn small primary" data-act="ex-supres">Send results to supervisors</button>`)}}

/* the messages page: show the two extra placeholders when they are in use */
{const _m=vMessages;vMessages=function(){const h=_m();return UI.msg.src==="supres"?h.replace("<code>{date}</code>.","<code>{date}</code> <code>{exam}</code> <code>{results}</code>."):h}}
