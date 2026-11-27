/* =====================================================================
   V52 · EXAM CANDIDATES AT ANY STAGE, AND PEOPLE WHO ARE NOT PGTs.
   - Add any PGT (at RIC or not) and remove anyone, before or after the
     exam is held. Removing takes their marks, SEQ marks and scanned
     sheets out of this exam; including them again puts them back.
   - Guests: people who are not PGTs (medical officers, residents from
     other hospitals, nurses for a common paper…). They sit a specialty
     paper or the common paper(s) only, get a roll number, OMR sheets,
     marks, SEQ marks and a place on the result sheet, but nothing is
     written to any PGT profile. Guests live on the exam (x.guests).
   ===================================================================== */
const candName=p=>!p?"":p.guest?`${p.title?p.title+" ":""}${p.name}`:`Dr. ${p.name}`;
const candId=p=>!p?"":p.guest?"External":(p.code||"");
const exGuestsAll=()=>(DB&&DB.exams||[]).flatMap(x=>x.guests||[]);
/* a guest's id resolves wherever the exam looks a candidate up, without being a PGT anywhere else */
function exGuestAware(){if(!DB||!Array.isArray(DB.pgts)||DB.pgts.__g)return;const A=DB.pgts;
 Object.defineProperty(A,"find",{value:function(f,t){const r=Array.prototype.find.call(this,f,t);if(r!==undefined)return r;const G=exGuestsAll();return G.length?Array.prototype.find.call(G,f,t):undefined},enumerable:false,configurable:true,writable:true});
 Object.defineProperty(A,"__g",{value:1,enumerable:false,configurable:true})}
{const _r=recompute;recompute=function(){exGuestAware();_r();exGuestsAll().forEach(g=>{if(!CUR.has(g.id))CUR.set(g.id,{active:true,pk:"guest",phase:"Guest candidate",status:"Guest",leave:null})})}}
{const _y=examYear;examYear=function(x,p){if(p&&p.guest)return +p.year||0;return _y(x,p)}}
/* roll numbers: guests get 9xxxx, never used by a PGT */
function exGuestRoll(x){x.roll=x.roll||{};const used=new Set(Object.values(x.roll));let n=90001;while(used.has(String(n)))n++;return String(n)}
function exGuestRolls(x){if(!x||!x.roll)return;(x.guests||[]).forEach(g=>{if(!x.roll[g.id]&&exCands(x).some(p=>p.id===g.id))x.roll[g.id]=exGuestRoll(x)})}
{const _g=genRolls;genRolls=function(x){const r=_g(x);exGuestRolls(x);return r}}
{const _e=ensureRolls;ensureRolls=function(x){_e(x);exGuestRolls(x)}}

/* ---------- taking someone out, and putting them back ---------- */
function exCandOut(x,pid){const S={papers:{},seq:{},applied:{}};
 exAllPapers(x).forEach(k=>{const M=exPM(x,k),o={};["marks","absent","raw","secs"].forEach(f=>{if(M[f]&&M[f][pid]!=null){o[f]=M[f][pid];delete M[f][pid]}});if(Object.keys(o).length)S.papers[k]=o});
 if(x.res&&x.res[pid]!=null){S.res=x.res[pid];delete x.res[pid]}
 Object.keys(x.seqd||{}).forEach(k=>{const D=x.seqd[k];if(D.m&&D.m[pid]){S.seq[k]=D.m[pid];delete D.m[pid]}if(D.mcq)delete D.mcq[pid];if(D.comb)delete D.comb[pid]});
 if(x.omr){omrScans(x).forEach(s=>{if(s.pid===pid&&s.use){s.use=false;s.rmCand=1}});const A=omrOf(x).applied||{};Object.keys(A).forEach(k=>{if(k.endsWith("|"+pid)){S.applied[k]=A[k];delete A[k]}})}
 return S}
function exCandBack(x,pid,S){if(!S)return;Object.entries(S.papers||{}).forEach(([k,o])=>{const M=exPM(x,k);Object.entries(o).forEach(([f,v])=>{M[f]=M[f]||{};M[f][pid]=v})});
 if(S.res!=null){x.res=x.res||{};x.res[pid]=S.res}
 Object.entries(S.seq||{}).forEach(([k,v])=>{const D=x.seqd&&x.seqd[k];if(D){D.m=D.m||{};D.m[pid]=v}});
 if(x.omr){omrScans(x).forEach(s=>{if(s.pid===pid&&s.rmCand){s.use=true;delete s.rmCand}});const O=omrOf(x);O.applied=O.applied||{};Object.assign(O.applied,S.applied||{});omrDupes(x)}}
function exHasData(x,pid){return exAllPapers(x).some(k=>{const M=exPM(x,k);return M.marks[pid]!=null||M.absent[pid]})||omrScans(x).some(s=>s.pid===pid&&s.use)}
function exRemove(x,p,reason){const pid=p.id;x.removed=x.removed||{};x.added=(x.added||[]).filter(i=>i!==pid);if(x.cands)x.cands=x.cands.filter(i=>i!==pid);
 if(p.guest){exCandOut(x,pid);x.guests=(x.guests||[]).filter(g=>g.id!==pid);if(x.roll)delete x.roll[pid];xlog(x,`${candName(p)} (not a PGT) deleted from the exam`);return}
 x.rmData=x.rmData||{};x.rmData[pid]=exCandOut(x,pid);x.removed[pid]=reason;xlog(x,`Removed Dr. ${p.name} from the exam (${reason})${x.stage>=3?"; their marks in this exam were set aside":""}`)}
function exInclude(x,p,how){const pid=p.id;x.removed=x.removed||{};delete x.removed[pid];if(!exBase(x).includes(p)&&!(x.added||[]).includes(pid))(x.added=x.added||[]).push(pid);
 if(x.cands&&!x.cands.includes(pid))x.cands.push(pid);if(x.rmData&&x.rmData[pid]){exCandBack(x,pid,x.rmData[pid]);delete x.rmData[pid]}
 if(x.roll&&!x.roll[pid]){const r=p.guest?exGuestRoll(x):rollOf(p);if(r)x.roll[pid]=r}
 xlog(x,`${how||"Added"} ${candName(p)}${p.guest?" (not a PGT)":""} ${how?"":"to the candidate list"}`.trim())}

/* ---------- the guest form ---------- */
function exGuestPapers(x){const out=[];const S=[...new Set([...exSpecs(x),...(DB.specs||[]).map(s=>s.name||s)])].filter(Boolean);
 S.forEach(s=>{const g=exGroupsOf(x,s);if(g)g.forEach(G=>out.push([`${s}|${G[0]}`,`${s} · ${exGrpLabel(G)}`]));else out.push([`${s}|`,s])});return[["|","Common paper(s) only"],...out]}
function sheetGuest(x,g){const papers=exGuestPapers(x),cur=g?`${g.spec||""}|${g.spec&&exGroupsOf(x,g.spec)?(g.year||""):""}`:"";
 openSheet(g?"Edit candidate (not a PGT)":"Add someone who is not a PGT",`<p class="subt" style="margin:0">For medical officers, residents from other hospitals, nurses and anyone else sitting this exam. They get a roll number, answer sheets, marks and a line on the result sheet; nothing goes to any PGT profile.</p>
 <div class="grid2"><label class="f">Title<select name="t">${opt([["Dr.","Dr."],["Mr.","Mr."],["Ms.","Ms."],["Mrs.","Mrs."],["","(none)"]],g?g.title??"Dr.":"Dr.")}</select></label><label class="f">Full name<input name="n" value="${esc(g?g.name:"")}" placeholder="Name without the title"></label></div>
 <div class="grid2"><label class="f">Designation<input name="d" value="${esc(g?g.desig||"":"")}" placeholder="e.g. Medical Officer, Resident, Charge Nurse"></label><label class="f">Institution<input name="i" value="${esc(g?g.inst||"":"")}" placeholder="e.g. Holy Family Hospital"></label></div>
 <label class="f">Paper they sit<select name="pp">${opt(papers,cur||(papers[1]?papers[1][0]:"|"))}</select></label>
 <p class="subt" style="margin:0">With a specialty paper they also sit the common paper(s) set for that specialty. "Common paper(s) only" is for people taking only a paper such as Infection Prevention and Control.</p>
 <div class="grid2"><label class="f">Mobile <span class="h">optional</span><input name="m" value="${esc(g?g.mobile||"":"")}" placeholder="03xx-xxxxxxx"></label><label class="f">Email <span class="h">optional</span><input name="e" value="${esc(g?g.email||"":"")}"></label></div>`,()=>{
  const n=fv("n").replace(/^(dr|mr|ms|mrs)\.?\s+/i,"");if(n.length<3)return fail("Enter the full name.");const[sp,yr]=fv("pp").split("|");
  const rec={title:fv("t"),name:n,desig:fv("d"),inst:fv("i"),spec:sp||"",year:yr?+yr:(sp?1:0),program:fv("d")||"External",mobile:fv("m"),email:fv("e")};
  if(g){Object.assign(g,rec);xlog(x,`Candidate ${candName(g)} (not a PGT) edited`);return true}
  const ng={id:uid("GX"),guest:true,code:"",reg:"Guest",at:new Date().toISOString(),by:ME,...rec};x.guests=[...(x.guests||[]),ng];exGuestAware();recompute();exInclude(x,ng);toast(`${candName(ng)} added`);return true},g?"Save":"Add to exam")}

/* ---------- buttons ---------- */
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="ex-rm"],[data-act="ex-back"],[data-act="ex-addp"],[data-act="ex-guest"],[data-act="ex-gedit"]');if(!b||!DB||!DB.exams)return;
 const x=DB.exams.find(v=>v.id===route.id);if(!x)return;e.preventDefault();e.stopPropagation();const a=b.dataset.act,p=b.dataset.id&&DB.pgts.find(q=>q.id===b.dataset.id);
 if(a==="ex-guest")return sheetGuest(x);
 if(a==="ex-gedit"&&p)return sheetGuest(x,p);
 if(a==="ex-addp"){const v=(document.getElementById("ex-add")||{}).value||"",q=verified().find(z=>pgtLabel(z)===v.trim())||verified().find(z=>(z.code||"")===v.trim());
  if(!q){toast("Choose a PGT from the list");return}if(exCands(x).includes(q)){toast(`Dr. ${q.name} is already on the list`);return}exInclude(x,q);persist();render();toast(`Dr. ${q.name} added`);return}
 if(a==="ex-back"&&p){exInclude(x,p,"Included again");persist();render();toast(`${candName(p)} included again`);return}
 if(a==="ex-rm"&&p){const has=exHasData(x,p.id);
  if(p.guest)return openSheet(`Delete ${candName(p)}`,`<p style="margin:0">${esc(candName(p))} is not a PGT, so they are deleted from this exam completely${has?", with their marks and scanned sheets":""}.</p>`,()=>{exRemove(x,p);toast("Deleted");return true},"Delete");
  return openSheet(`Remove Dr. ${p.name}`,`<label class="f">Reason<select name="r">${opt(EXCL)}</select></label><label class="f">Note <span class="h">optional</span><input name="n"></label>
   ${has?`<div class="flag">Dr. ${esc(p.name)} has marks or scanned sheets in this exam. They are set aside, not lost: <b>Include again</b> puts them back.</div>`:""}`,()=>{exRemove(x,p,fv("r")+(fv("n")?": "+fv("n"):""));toast("Removed");return true},"Remove")}},true);
/* keep the lookup working whenever the records are replaced (sign-in, sync) */
{const _r=render;render=function(...a){if(DB&&DB.pgts)exGuestAware();return _r.apply(this,a)}}
