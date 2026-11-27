
/* =====================================================================
   V28 · OMR ANSWER SHEETS (phase 1): per-specialty sheet setup
   (questions, options, sections), answer keys, and printing of
   personalised and blank sheets. Scanning comes in phase 2.
   ===================================================================== */
const OMR_OPTS=[[4,"4 options (A-D)"],[5,"5 options (A-E)"]];
function omrOf(x){x.omr=x.omr||{specs:{},n:0};x.omr.specs=x.omr.specs||{};return x.omr}
function omrSpec(x,spec,create){const O=omrOf(x);let s=O.specs[spec];
 if(!s&&create){O.n=(O.n||0)+1;s=O.specs[spec]={sid:"S"+O.n,n:/^General Cardiology/.test(spec)?100:50,opts:5,sections:[],key:"",drop:[],alt:{}}}return s}
const omrKeyArr=s=>{const a=(s.key||"").split("");a.length=s.n;return Array.from(a,v=>v&&v!=="-"?v:"")};
const omrKeyDone=s=>omrKeyArr(s).filter(Boolean).length;
const omrRoll=(x,p)=>(x.roll&&x.roll[p.id])||rollOf(p)||"";
const omrSecText=s=>s.sections&&s.sections.length?s.sections.map(t=>`${t.name} ${t.from}-${t.to}`).join(" · "):"None";

function omrPanel(x){if(isViewer())return"";ensureRolls(x);const specs=exAllPapers(x),O=omrOf(x);
 const rows=specs.map(sp=>{const s=omrSpec(x,sp),n=exCands(x).filter(p=>exInPaper(x,p,sp)).length,k=s?omrKeyDone(s):0;
  return`<tr><td><b>${esc(sp)}</b></td><td class="num">${n}</td><td class="num">${s?s.n:"—"}</td><td>${s?s.opts===4?"A-D":"A-E":"—"}</td><td class="wrapcell subt">${s?esc(omrSecText(s)):"—"}</td>
   <td>${!s?'<span class="subt">Not set up</span>':k===s.n?'<span class="pill p-ric">Complete</span>':`<span class="pill p-pause">${k} / ${s.n}</span>`}</td>
   <td>${s&&s.printed?`<span class="subt">${fd(s.printed.at.slice(0,10))}</span>`:""}</td>
   <td style="white-space:nowrap"><button class="btn small ${s?"":"primary"}" data-act="omr-setup" data-sp="${esc(sp)}">${s?"Setup":"Set up"}</button>${s?`<button class="btn small" data-act="omr-key" data-sp="${esc(sp)}">Answer key</button><button class="btn small" data-act="omr-print" data-sp="${esc(sp)}">Print</button>`:""}</td></tr>`}).join("");
 const ready=specs.filter(sp=>omrSpec(x,sp)).length;
 return`<div class="panel flush" id="omr"><div class="head" style="padding:14px 16px 0"><h3 style="margin:0">OMR answer sheets</h3>${ready?`<button class="btn small" data-act="omr-printall">Print all personalised sheets</button>`:""}</div>
 <p class="subt" style="margin:6px 16px 0">Set the number of questions, options and sections for each specialty paper, enter the answer key, then print sheets. Personalised sheets carry the candidate's name, PGT ID and pre-filled roll number; blank sheets are for anyone not on the list. The answer key can be entered any time before scanning.</p>
 <div class="tblwrap" style="margin-top:8px"><table><thead><tr><th>Specialty</th><th class="num">Candidates</th><th class="num">Questions</th><th>Options</th><th>Sections</th><th>Answer key</th><th>Printed</th><th></th></tr></thead><tbody>${rows||`<tr><td colspan="8" class="empty">No candidates yet.</td></tr>`}</tbody></table></div></div>`}
var IMPORT_ORIG=importPanel;{const _i=importPanel;importPanel=function(x){return omrPanel(x)+_i(x)}}

/* ---------- setup: questions, options, sections ---------- */
function sheetOmrSetup(x,sp){const s0=omrSpec(x,sp),s=s0||{n:/^General Cardiology/.test(sp)?100:50,opts:5,sections:[]};const S=[...(s.sections||[])];while(S.length<6)S.push({name:"",from:"",to:""});
 openSheet(`OMR sheet · ${sp}`,`<div class="grid2"><label class="f">Number of questions<input type="number" name="n" min="5" max="200" value="${s.n}"></label><label class="f">Options per question<select name="opts">${opt(OMR_OPTS.map(([v,l])=>[String(v),l]),String(s.opts||5))}</select></label></div>
 <div class="f"><span>Sections <span class="h">optional: leave empty for none. Sections must follow each other, e.g. 1-40 then 41-100.</span></span>
  <div style="display:grid;gap:6px">${S.map((t,i)=>`<div style="display:grid;grid-template-columns:1fr 70px 70px;gap:6px"><input name="sn${i}" value="${esc(t.name)}" placeholder="${i===0?"e.g. Basic sciences":i===1?"e.g. Clinical":""}" aria-label="Section ${i+1} name"><input name="sf${i}" type="number" min="1" value="${t.from}" placeholder="from" aria-label="Section ${i+1} first question"><input name="st${i}" type="number" min="1" value="${t.to}" placeholder="to" aria-label="Section ${i+1} last question"></div>`).join("")}</div></div>
 ${s0&&omrKeyDone(s0)?`<p class="subt" style="margin:0">Changing the number of questions keeps the answer key for the questions that remain.</p>`:""}`,()=>{
  const n=+fv("n"),opts=+fv("opts");if(!(n>=5&&n<=200))return fail("Questions must be between 5 and 200.");
  const L=[];for(let i=0;i<6;i++){const nm=fv("sn"+i),f=+fv("sf"+i),t=+fv("st"+i);if(!nm&&!f&&!t)continue;if(!nm||!f||!t)return fail(`Section ${i+1}: enter the name, first and last question.`);L.push({name:nm,from:f,to:t})}
  L.sort((a,b)=>a.from-b.from);if(L.length){if(L[0].from!==1)return fail("The first section must start at question 1.");for(let i=0;i<L.length;i++){if(L[i].to<L[i].from)return fail(`${L[i].name}: the last question is before the first.`);if(i&&L[i].from!==L[i-1].to+1)return fail(`${L[i].name} must start at question ${L[i-1].to+1}.`)}if(L[L.length-1].to!==n)return fail(`The last section must end at question ${n}.`)}
  if(L.some(t=>t.name.length>28))return fail("Keep section names under 28 characters so they fit on the sheet.");
  const s=omrSpec(x,sp,true),was=s.n;Object.assign(s,{n,opts,sections:L});if(s.key)s.key=s.key.slice(0,n);
  if(opts===4&&/E/.test(s.key||""))s.key=s.key.replace(/E/g,"-");
  xlog(x,`OMR sheet set up for ${sp}: ${n} questions, ${opts} options${L.length?`, sections ${omrSecText(s)}`:""}${was&&was!==n?` (was ${was} questions)`:""}`);toast("Saved");return true})}

/* ---------- answer key ---------- */
UI.omrK=null;
function sheetOmrKey(x,sp){const s=omrSpec(x,sp);if(!s)return;UI.omrK={x,sp,a:omrKeyArr(s)};const L="ABCDE".slice(0,s.opts).split("");
 openSheet(`Answer key · ${sp}`,`<div class="omrk-xl"><div><b>Upload from Excel</b><span class="subt">Columns: Question, Answer, and optionally Also accept and Drop. Download the template to see the layout.</span></div><span class="actions"><button type="button" class="btn small" data-export="omrkey:${x.id}:${encodeURIComponent(sp)}">Download template</button><label class="btn small primary" for="omrk-xl">Upload Excel</label><input type="file" id="omrk-xl" accept=".xlsx,.xls,.csv" class="sr"></span></div>
  <label class="f">Or type or paste the key <span class="h">letters in order, e.g. ABDCE BDACE ... (spaces and numbers are ignored)</span><textarea id="omrk-paste" rows="3" style="font-family:var(--f-mono);letter-spacing:.06em" placeholder="ABDCEBDACE..."></textarea></label>
  <div id="omrk-cnt" class="subt"></div><div id="omrk-grid" class="omrk">${omrKeyGrid(s,L)}</div>
  <div class="grid2"><label class="f">Questions to drop <span class="h">after the exam, e.g. 12, 45 · nobody loses marks</span><input name="drop" value="${esc((s.drop||[]).join(", "))}"></label>
  <label class="f">Also accept <span class="h">a second correct answer, e.g. 12B, 30D</span><input name="alt" value="${esc(Object.entries(s.alt||{}).map(([q,v])=>q+v).join(", "))}"></label></div>`,()=>{
  const a=UI.omrK.a,drop=[...new Set(fv("drop").split(/[^0-9]+/).filter(Boolean).map(Number))].filter(q=>q>=1&&q<=s.n).sort((p,q)=>p-q);
  const alt={};for(const m of fv("alt").toUpperCase().matchAll(/(\d+)\s*([A-E])/g)){const q=+m[1];if(q>=1&&q<=s.n&&L.includes(m[2]))alt[q]=m[2]}
  const before=s.key,miss=a.filter(v=>!v).length;s.key=a.map(v=>v||"-").join("");s.drop=drop;s.alt=alt;
  if(before!==s.key||drop.length||Object.keys(alt).length)xlog(x,`Answer key for ${sp}: ${s.n-miss} of ${s.n} entered${drop.length?`, dropped ${drop.join(", ")}`:""}${Object.keys(alt).length?`, also accepting ${Object.entries(alt).map(([q,v])=>q+v).join(", ")}`:""}`);
  UI.omrK=null;toast(miss?`Saved. ${miss} questions still have no answer.`:"Answer key saved");return true});omrKCount()}
function omrKeyGrid(s,L){const a=UI.omrK.a,sec=q=>(s.sections||[]).find(t=>t.from===q);
 return Array.from({length:s.n},(_,i)=>{const q=i+1,h=sec(q);return`${h?`<div class="omrk-h">${esc(h.name)} (${h.from}-${h.to})</div>`:""}<div class="omrk-r ${a[i]?"":"miss"}"><b>${q}</b>${L.map(l=>`<button type="button" class="${a[i]===l?"on":""}" data-omrk="${i}|${l}" aria-label="Question ${q}: ${l}" aria-pressed="${a[i]===l}">${l}</button>`).join("")}</div>`}).join("")}
function omrKCount(){const K=UI.omrK;if(!K)return;const a=K.a,c={};a.forEach(v=>{if(v)c[v]=(c[v]||0)+1});const el=document.getElementById("omrk-cnt");if(!el)return;const n=a.filter(Boolean).length;
 el.innerHTML=`<b>${n} of ${a.length}</b> entered${n?` · ${Object.keys(c).sort().map(k=>`${k}: ${c[k]}`).join(" · ")}`:""}${n&&n<a.length?` · first missing: Q${a.findIndex(v=>!v)+1}`:""}`}
document.addEventListener("click",e=>{const b=e.target.closest("[data-omrk]");if(!b||!UI.omrK)return;const[i,l]=b.dataset.omrk.split("|");const a=UI.omrK.a;a[+i]=a[+i]===l?"":l;
 const row=b.parentElement;row.querySelectorAll("button").forEach(x=>{const on=x.dataset.omrk===`${i}|${a[+i]}`;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on)});row.classList.toggle("miss",!a[+i]);omrKCount()});
document.addEventListener("input",e=>{if(e.target.id!=="omrk-paste"||!UI.omrK)return;const K=UI.omrK,s=omrSpec(K.x,K.sp),L="ABCDE".slice(0,s.opts);
 const letters=e.target.value.toUpperCase().replace(/[^A-E]/g,"").split("").filter(c=>L.includes(c)).slice(0,s.n);if(!letters.length)return;
 letters.forEach((v,i)=>K.a[i]=v);document.getElementById("omrk-grid").innerHTML=omrKeyGrid(s,L.split(""));omrKCount()});

function omrKeyParse(aoa,n,L){const cell=v=>v==null?"":String(v).trim(),R=aoa.map(r=>(r||[]).map(cell)),out={key:{},alt:{},drop:[],bad:[]};
 const letOf=v=>{v=v.toUpperCase();if(/^[A-E]$/.test(v))return v;if(/^[1-5]$/.test(v))return"ABCDE"[+v-1];const m=v.match(/^\(?([A-E])\)?[.)]?$/);return m?m[1]:""};
 let hr=-1,qc=-1,ac=-1,xc=-1,dc=-1;
 for(let r=0;r<Math.min(R.length,15)&&hr<0;r++){const row=R[r].map(v=>v.toLowerCase());let q=-1,a=-1,x=-1,d=-1;
  row.forEach((v,i)=>{if(!v)return;if(/also|altern|second|other/.test(v)){if(x<0)x=i}else if(/drop|cancel|delete|remove|void/.test(v)){if(d<0)d=i}else if(/answer|key|correct|option|ans/.test(v)){if(a<0)a=i}else if(/^(q|qn|qs|q\.? ?no\.?|ques\w*( ?no\.?| ?number)?|sr\.? ?no\.?|s\.? ?no\.?|no\.?|#|item)$/.test(v)){if(q<0)q=i}});
  if(a>=0){hr=r;qc=q;ac=a;xc=x;dc=d}}
 const put=(q,raw,row)=>{if(!(q>=1&&q<=n)){if(raw)out.bad.push(`row ${row}: question ${q||"?"} is outside 1-${n}`);return}
  if(/^(drop|dropped|cancel(led)?)$/i.test(raw.trim())){out.drop.push(q);return}
  const parts=raw.toUpperCase().split(/[\s,\/;&+]+|(?<=[A-E])(?=[A-E])/).map(letOf).filter(Boolean);
  if(!parts.length){if(raw)out.bad.push(`Q${q}: "${raw}" is not a letter`);return}
  if(!L.includes(parts[0])){out.bad.push(`Q${q}: ${parts[0]} is not an option on this sheet`);return}
  out.key[q]=parts[0];if(parts[1]&&L.includes(parts[1])&&parts[1]!==parts[0])out.alt[q]=parts[1]};
 if(hr>=0){let seq=0;for(let r=hr+1;r<R.length;r++){const row=R[r];if(!row.some(Boolean))continue;seq++;const q=qc>=0?parseInt(row[qc],10):seq;if(qc>=0&&!row[qc])continue;
   put(q,row[ac]||"",r+1);if(!(q>=1&&q<=n))continue;
   if(xc>=0&&row[xc]){const v=letOf(row[xc]);if(v&&L.includes(v))out.alt[q]=v;else out.bad.push(`Q${q}: also-accept "${row[xc]}" is not a valid letter`)}
   if(dc>=0&&/^(y|yes|x|1|true|drop|dropped|✓|✔)$/i.test(row[dc]))out.drop.push(q)}
  return out}
 // no headings: rows of number + letter, else letters in reading order
 let pairs=0;R.forEach((row,ri)=>{const qi=row.findIndex(v=>/^\d+\.?$/.test(v));if(qi<0)return;const ai=row.findIndex((v,i)=>i>qi&&letOf(v)&&!/^\d+$/.test(v));if(ai<0)return;pairs++;put(parseInt(row[qi],10),row[ai],ri+1)});
 if(pairs)return out;
 const seq=[];R.forEach(row=>row.forEach(v=>{const u=v.toUpperCase().replace(/[^A-E]/g,"");if(u&&u.length===v.replace(/[\s\d.,)\-]/g,"").length)seq.push(...u)}));
 seq.slice(0,n).forEach((v,i)=>put(i+1,v,i+1));if(seq.length>n)out.bad.push(`${seq.length-n} extra letters after Q${n} were ignored`);return out}
async function omrKeyImport(f){const K=UI.omrK;if(!K)return;try{if(!window.XLSX)throw new Error("The Excel library did not load. Check the connection and reload.");
 const wb=XLSX.read(await f.arrayBuffer(),{type:"array"}),aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:null});
 const s=omrSpec(K.x,K.sp),L="ABCDE".slice(0,s.opts).split(""),r=omrKeyParse(aoa,s.n,L),got=Object.keys(r.key).length;
 if(!got)throw new Error("No answers found. Use the template: a Question column and an Answer column.");
 Object.entries(r.key).forEach(([q,v])=>K.a[q-1]=v);
 const ai=document.querySelector('#overlay input[name="alt"]'),di=document.querySelector('#overlay input[name="drop"]');
 if(ai&&Object.keys(r.alt).length){const cur={};for(const m of ai.value.toUpperCase().matchAll(/(\d+)\s*([A-E])/g))cur[+m[1]]=m[2];Object.assign(cur,r.alt);ai.value=Object.entries(cur).sort((a,b)=>a[0]-b[0]).map(([q,v])=>q+v).join(", ")}
 if(di&&r.drop.length){const cur=new Set(di.value.split(/[^0-9]+/).filter(Boolean).map(Number));r.drop.forEach(q=>cur.add(q));di.value=[...cur].sort((a,b)=>a-b).join(", ")}
 document.getElementById("omrk-grid").innerHTML=omrKeyGrid(s,L);omrKCount();
 const miss=K.a.filter(v=>!v).length,err=document.getElementById("sheeterr");
 if(err)err.textContent=r.bad.length?`Check these in ${f.name}: ${r.bad.slice(0,6).join("; ")}${r.bad.length>6?` and ${r.bad.length-6} more`:""}.`:"";
 toast(`${got} answers read from ${f.name}${miss?` · ${miss} still missing`:""}. Check them, then Save.`)}catch(e){toast(e.message||"Could not read this file. Save it as .xlsx or .csv and try again.")}}

/* ---------- printing ---------- */
function sheetOmrPrint(x,sp){const s=omrSpec(x,sp),C=exCands(x).filter(p=>exInPaper(x,p,sp));
 openSheet(`Print sheets · ${sp}`,`<label class="f">What to print<select name="mode"><option value="p">Personalised sheets for the ${C.length} candidates</option><option value="b">Blank sheets</option><option value="pb">Both: personalised, then blank</option></select></label>
 <label class="f">Number of blank sheets<input type="number" name="nb" min="1" max="300" value="${Math.max(5,Math.ceil(C.length*.1))}"></label>
 <p class="subt" style="margin:0">${s.n} questions, ${s.opts} options${s.sections.length?`, sections ${esc(omrSecText(s))}`:""}. Print on A4 at 100% (not "fit to page"), one side only.</p>`,()=>{
  const m=fv("mode"),nb=+fv("nb")||0;if(m!=="p"&&!(nb>=1))return fail("Enter how many blank sheets.");if(m!=="b"&&!C.length)return fail("No candidates in this specialty.");
  omrMakePdf(x,[{sp,cand:m!=="b"?C:[],blank:m!=="p"?nb:0}],`OMR ${sp} ${x.session}`);return true},"Make PDF")}
async function omrMakePdf(x,jobs,file){try{await bioLoadPdf()}catch(e){toast(e.message);return}if(typeof qrcode!=="function"){toast("The QR tool did not load. Check the connection and try again.");return}
 const{jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"});const logo=document.querySelector('img[alt="RIC logo"]')?.src;let pages=0;
 const dt=x.date?P(x.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"";
 toast("Making the PDF…");await new Promise(r=>setTimeout(r,30));
 for(const j of jobs){const s=omrSpec(x,j.sp);if(!s)continue;const base={exam:x.title,session:x.session,date:dt,spec:j.sp,n:s.n,opts:s.opts,sections:s.sections,logo:logo&&logo.startsWith("data:")?logo:null};
  const C=j.cand.slice().sort((a,b)=>omrRoll(x,a).localeCompare(omrRoll(x,b))||a.name.localeCompare(b.name));
  for(const p of C){if(pages++)doc.addPage();const roll=omrRoll(x,p);omrSheet(doc,{...base,cand:{name:p.name,title:p.guest?(p.title||""):undefined,code:p.guest?"":(p.code||""),roll,year:examYear(x,p)||"",program:p.program||""},qr:`RICDME|${x.id}|${s.sid}|${p.id}|${s.n}`},qrcode)}
  for(let i=0;i<j.blank;i++){if(pages++)doc.addPage();omrSheet(doc,{...base,cand:null,qr:`RICDME|${x.id}|${s.sid}|B|${s.n}`},qrcode)}
  s.printed={at:new Date().toISOString(),p:C.length,b:j.blank,n:s.n};xlog(x,`OMR sheets printed for ${j.sp}: ${C.length} personalised${j.blank?`, ${j.blank} blank`:""}`)}
 if(!pages){toast("Nothing to print");return}doc.save(file.replace(/[\\/:*?"<>|]+/g," ")+".pdf");persist();render();toast(`PDF ready: ${pages} sheets`)}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act^="omr-"]');if(!b)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;const sp=b.dataset.sp;
 if(b.dataset.act==="omr-setup")return sheetOmrSetup(x,sp);if(b.dataset.act==="omr-key")return sheetOmrKey(x,sp);if(b.dataset.act==="omr-print")return sheetOmrPrint(x,sp);
 if(b.dataset.act==="omr-printall"){const specs=exAllPapers(x).filter(s=>omrSpec(x,s));omrMakePdf(x,specs.map(sp=>({sp,cand:exCands(x).filter(p=>exInPaper(x,p,sp)),blank:0})),`OMR all specialties ${x.session}`)}});
