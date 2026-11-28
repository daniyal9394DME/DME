
/* =====================================================================
   V14 · WHATSAPP MESSAGES
   Pick trainees, faculty or workshop registrants, write one message with
   {placeholders}, then send through WhatsApp one tap per person, or copy
   the numbers / download contacts for a broadcast list or group.
   ===================================================================== */
const waNum=m=>{let x=String(m||"").replace(/\D/g,"");if(x.startsWith("0092"))x=x.slice(2);if(x.startsWith("0"))x="92"+x.slice(1);if(x.length===10&&x.startsWith("3"))x="92"+x;return/^923\d{9}$/.test(x)?x:""};
function recPgt(p){const c=CUR.get(p.id)||{};return{key:"p:"+p.id,kind:"Trainee",name:"Dr. "+p.name,mobile:p.mobile||p.mobile2||"",href:"pgt-"+p.id,sub:`${p.code||"no ID"} · ${p.spec}`,vars:{name:"Dr. "+p.name,first:"Dr. "+p.name.split(" ")[0],pgtid:p.code||"",roll:rollOf(p)||"",specialty:p.spec,programme:p.program,supervisor:c.sup?facName(c.sup):"",year:ricLabel(p)}}}
function recFac(f){return{key:"f:"+f.id,kind:"Faculty",name:facName(f),mobile:f.mobile||"",href:"cred-"+f.id,sub:`${f.desig||""} · ${f.spec||""}`,vars:{name:facName(f),first:facName(f),pgtid:"",roll:"",specialty:f.spec||"",programme:"",supervisor:"",year:""}}}
function recReg(w,r){const n=stripOther(r.a.name);return{key:"r:"+w.id+":"+r.id,kind:"Registrant",name:n,mobile:r.a.mobile||"",href:"ws-"+w.id,sub:`${w.title} · ${r.status}`,vars:{name:n,first:n,pgtid:"",roll:"",specialty:stripOther(r.a.dept||r.a.spec||""),programme:"",supervisor:"",year:"",workshop:w.title,date:w.date?fd(w.date):""}}}
const MSG_TPL=[
 ["","Blank message",""],
 ["exam","Exam reminder","Dear {name},\nThe six-monthly internal examination is on [date] at [time], [venue]. Your roll number is {roll}. Please bring your CNIC and arrive 30 minutes early.\nDME Office, RIC"],
 ["orient","Orientation invitation","Dear {name},\nYou are invited to the PGT orientation on [date] at [time] in [venue]. Attendance is compulsory.\nDME Office, RIC"],
 ["ws","Workshop reminder","Dear {name},\nThis is a reminder for the workshop {workshop} on {date}. Registration opens at [time] in [venue].\nDME Office, RIC"],
 ["docs","Missing documents","Dear {name} ({pgtid}),\nPlease send the following to the DME&T office by [date]: [documents].\nDME Office, RIC"],
 ["cred","Credential renewal","Dear {name},\nOur records show your [certificate] needs renewal. Kindly share the updated certificate with the DME&T office.\nDME Office, RIC"]];
UI.msg={recs:[],text:"",sent:{},src:""};
function msgSet(recs,src){UI.msg={recs,text:UI.msg.text||"",sent:{},src};go("messages")}
const msgFill=(t,r)=>t.replace(/\{(\w+)\}/g,(m,k)=>r.vars[k]!=null&&r.vars[k]!==""?r.vars[k]:m);
UI.mpick="pgts";UI.mq="";
function vMessages(){const M=UI.msg,R=M.recs,ok=R.filter(r=>waNum(r.mobile)),no=R.filter(r=>!waNum(r.mobile));const next=ok.find(r=>!M.sent[r.key]);
 const pool=UI.mpick==="pgts"?verified().filter(p=>CUR.get(p.id).active).map(recPgt):UI.mpick==="fac"?DB.faculty.map(recFac):DB.workshops.flatMap(w=>regsOf(w).filter(r=>r.status!=="Cancelled").map(r=>recReg(w,r)));
 const q=UI.mq.toLowerCase(),shown=q.length>=2?pool.filter(r=>(r.name+" "+r.sub).toLowerCase().includes(q)).slice(0,12):[];
 return`<div class="head"><div><h2>WhatsApp messages</h2><p>Choose who gets the message, write it once, then send it through WhatsApp. Each person gets their own copy with their name filled in.</p></div></div>
 <div class="cols certcols">
 <div style="display:grid;gap:14px;align-content:start;min-width:0">
  <div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Message</h3><select id="msg-tpl" aria-label="Start from a template">${MSG_TPL.map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div>
   <textarea id="msg-text" rows="7" placeholder="Dear {name}, …">${esc(M.text)}</textarea>
   <p class="subt" style="margin:0">Filled in for each person: <code>{name}</code> <code>{pgtid}</code> <code>{roll}</code> <code>{specialty}</code> <code>{supervisor}</code> <code>{year}</code> <code>{workshop}</code> <code>{date}</code>. Replace anything in [brackets] yourself.</p>
   ${R.length&&M.text?`<div class="msgprev"><span class="subt">Preview for ${esc(R[0].name)}</span><div>${esc(msgFill(M.text,R[0])).replace(/\n/g,"<br>")}</div></div>`:""}</div>
  <div class="panel" style="display:grid;gap:10px"><h3 style="margin:0">Send · ${ok.length} with a WhatsApp number</h3>
   ${!R.length?`<p class="subt" style="margin:0">Add people on the right first.</p>`:!M.text.trim()?`<p class="subt" style="margin:0">Write the message first.</p>`:`
   <p class="subt" style="margin:0"><b>One by one:</b> each button opens WhatsApp with this person's message ready; press send there, come back, and tap the next. ${Object.keys(M.sent).length} of ${ok.length} opened.</p>
   ${next?`<a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/${waNum(next.mobile)}?text=${encodeURIComponent(msgFill(M.text,next))}" data-wasent="${esc(next.key)}">Open WhatsApp for ${esc(next.name)} →</a>`:`<div class="flag ok">All ${ok.length} opened.</div>`}
   <div class="actions"><button class="btn small" data-act="msg-copy">Copy all numbers</button><button class="btn small" data-act="msg-vcf">Download contacts (.vcf)</button><button class="btn small" data-act="msg-copytext">Copy message</button></div>
   <p class="subt" style="margin:0"><b>For a broadcast or group:</b> download the contacts to your phone, then make a WhatsApp broadcast list or group from them and send the message once (it will not have names filled in).</p>`}</div>
 </div>
 <div style="display:grid;gap:14px;align-content:start;min-width:0">
  <div class="panel" style="display:grid;gap:10px"><h3 style="margin:0">Add people</h3>
   <div class="chips">${[["pgts","Trainees"],["fac","Faculty"],["regs","Workshop registrants"]].map(([k,l])=>`<button class="chip" data-mpick="${k}" aria-pressed="${UI.mpick===k}">${l}</button>`).join("")}</div>
   <input type="search" id="mq" value="${esc(UI.mq)}" placeholder="Type a name to add one person" autocomplete="off" aria-label="Find a person">
   ${shown.length?`<div class="slist">${shown.map(r=>`<button class="srow" data-madd="${esc(r.key)}" style="text-align:left;border:0;background:none;font:inherit;cursor:pointer"><b>${esc(r.name)}</b><span class="subt">${esc(r.sub)}${waNum(r.mobile)?"":" · no number"}</span></button>`).join("")}</div>`:""}
   ${UI.mpick==="pgts"?`<div class="toolbar"><select id="mg-spec" aria-label="Specialty"><option value="">All specialties</option>${specNames(1).map(s=>`<option>${esc(s)}</option>`).join("")}</select><select id="mg-where" aria-label="Where">${opt([["","At RIC and on rotation"],["ric","At RIC now"],["rot","On rotation"]])}</select><button class="btn small" data-act="msg-addgroup">Add this group</button></div>`:UI.mpick==="fac"?`<div class="toolbar"><select id="mg-dept" aria-label="Department"><option value="">All departments</option>${specNames().map(s=>`<option>${esc(s)}</option>`).join("")}</select><select id="mg-ftype" aria-label="Type">${opt([["","All faculty"],["sup","Approved supervisors"]])}</select><button class="btn small" data-act="msg-addgroup">Add this group</button></div>`:`<div class="toolbar"><select id="mg-ws" aria-label="Workshop">${DB.workshops.filter(w=>regsOf(w).length).map(w=>`<option value="${w.id}">${esc(w.title)} · ${mLabel(w.month)}</option>`).join("")||'<option value="">No registrations yet</option>'}</select><select id="mg-rst" aria-label="Status">${opt([["Confirmed","Confirmed"],["Waiting list","Waiting list"],["","Everyone registered"]])}</select><button class="btn small" data-act="msg-addgroup">Add this group</button></div>`}
   <p class="subt" style="margin:0">You can also start from the Trainee register, Faculty directory, an exam's specialty list or a workshop's registrations with their <b>WhatsApp</b> button.</p></div>
  <div class="panel flush"><div class="head" style="padding:14px 16px 0"><h3 style="margin:0">Recipients · ${R.length}</h3>${R.length?`<button class="btn link" data-act="msg-clear">Clear all</button>`:""}</div>
   ${no.length?`<p class="subt" style="padding:6px 16px 0;margin:0">${no.length} without a usable mobile number. Add it from their profile or Data checks.</p>`:""}
   <div class="tblwrap" style="max-height:520px;overflow:auto"><table><tbody>${R.map(r=>`<tr><td><a href="#${r.href}">${esc(r.name)}</a><div class="subt">${esc(r.sub)}</div></td><td class="code">${waNum(r.mobile)?esc(r.mobile):'<span class="pill p-bad">no number</span>'}</td><td>${M.sent[r.key]?'<span class="pill p-ric">Opened</span>':waNum(r.mobile)&&M.text.trim()?`<a class="btn link" target="_blank" rel="noopener" href="https://wa.me/${waNum(r.mobile)}?text=${encodeURIComponent(msgFill(M.text,r))}" data-wasent="${esc(r.key)}">Send</a>`:""}</td><td><button class="btn link" data-mrm="${esc(r.key)}" aria-label="Remove">✕</button></td></tr>`).join("")||`<tr><td class="empty">Nobody yet.</td></tr>`}</tbody></table></div></div>
 </div></div>`}
function msgPoolFor(){if(UI.mpick==="pgts"){const s=pick("mg-spec"),w=pick("mg-where");return verified().filter(p=>{const c=CUR.get(p.id);return c.active&&(!s||p.spec===s)&&(!w||(w==="ric"?c.pk==="ric":c.pk==="rot"))}).map(recPgt)}
 if(UI.mpick==="fac"){const d=pick("mg-dept"),t=pick("mg-ftype");return DB.faculty.filter(f=>(!d||f.spec===d)&&(!t||f.cpsp||f.uhs)).map(recFac)}
 const w=DB.workshops.find(x=>x.id===pick("mg-ws"));if(!w)return[];const st=pick("mg-rst");return regsOf(w).filter(r=>r.status!=="Cancelled"&&(!st||r.status===st)).map(r=>recReg(w,r))}
function msgAdd(list){const have=new Set(UI.msg.recs.map(r=>r.key));let n=0;list.forEach(r=>{if(!have.has(r.key)){UI.msg.recs.push(r);have.add(r.key);n++}});return n}
document.addEventListener("click",async e=>{const a=e.target.closest("[data-wasent]");if(a&&route.v==="messages"){UI.msg.sent[a.dataset.wasent]=1;if(!UI.msg.logged){UI.msg.logged=1;log(`WhatsApp message started to ${UI.msg.recs.length} people: "${UI.msg.text.slice(0,60)}${UI.msg.text.length>60?"…":""}"`)}setTimeout(render,300);return}
 const b=e.target.closest("button");if(!b||route.v!=="messages")return;const d=b.dataset;
 if(d.mpick){UI.mpick=d.mpick;UI.mq="";render();return}
 if(d.madd){const pool=UI.mpick==="pgts"?verified().map(recPgt):UI.mpick==="fac"?DB.faculty.map(recFac):DB.workshops.flatMap(w=>regsOf(w).map(r=>recReg(w,r)));const r=pool.find(x=>x.key===d.madd);if(r)msgAdd([r]);UI.mq="";render();return}
 if(d.mrm){UI.msg.recs=UI.msg.recs.filter(r=>r.key!==d.mrm);render();return}
 if(d.act==="msg-addgroup"){const n=msgAdd(msgPoolFor());toast(n?`${n} added`:"Already in the list");render();return}
 if(d.act==="msg-clear"){UI.msg={recs:[],text:UI.msg.text,sent:{},src:""};render();return}
 if(d.act==="msg-copy"){const t=UI.msg.recs.map(r=>waNum(r.mobile)).filter(Boolean).map(x=>"+"+x).join(", ");try{await navigator.clipboard.writeText(t);toast("Numbers copied")}catch(x){toast("Could not copy")}return}
 if(d.act==="msg-copytext"){try{await navigator.clipboard.writeText(UI.msg.text);toast("Message copied")}catch(x){toast("Could not copy")}return}
 if(d.act==="msg-vcf"){const v=UI.msg.recs.filter(r=>waNum(r.mobile)).map(r=>`BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${r.name.replace(/[,;]/g," ")} (RIC)\r\nORG:RIC ${r.kind}\r\nTEL;TYPE=CELL:+${waNum(r.mobile)}\r\nEND:VCARD`).join("\r\n");
  if(!DL){toast("Downloads are not available in this view");return}try{await DL.save({filename:`RIC contacts ${iso(TODAY)}.vcf`,data:new Blob([v],{type:"text/vcard"})});toast("Contacts saved")}catch(x){if(x?.code!=="declined")toast("Could not save the file")}return}});
document.addEventListener("input",e=>{const t=e.target;if(route.v!=="messages")return;
 if(t.id==="msg-text"){UI.msg.text=t.value;clearTimeout(UI.msgT);UI.msgT=setTimeout(()=>{const pos=t.selectionStart;render();const n=document.getElementById("msg-text");if(n){n.focus();n.setSelectionRange(pos,pos)}},600)}
 if(t.id==="mq"){UI.mq=t.value;const pos=t.selectionStart;render();const n=document.getElementById("mq");n.focus();n.setSelectionRange(pos,pos)}});
document.addEventListener("change",e=>{if(e.target.id==="msg-tpl"&&route.v==="messages"){const t=MSG_TPL.find(x=>x[0]===e.target.value);if(t&&t[2])UI.msg.text=t[2];render()}});
/* WhatsApp buttons on lists */
document.addEventListener("click",e=>{const b=e.target.closest("[data-wa]");if(!b)return;e.preventDefault();e.stopPropagation();const[k,a1,a2]=b.dataset.wa.split(":");let L=[];
 if(k==="pgts")L=(LAST.pgts||[]).map(recPgt);if(k==="faculty")L=(LAST.faculty||[]).map(x=>recFac(Array.isArray(x)?x[0]:x));
 if(k==="regs"){const w=DB.workshops.find(x=>x.id===a1);L=regsOf(w).filter(r=>r.status===(a2||"Confirmed")).map(r=>recReg(w,r))}
 if(k==="examsel"){const x=DB.exams.find(z=>z.id===a1);L=exSelList(x).map(p=>({...recPgt(p),vars:{...recPgt(p).vars,roll:x.roll?.[p.id]||rollOf(p),date:x.date?fd(x.date):""}}))}
 if(k==="exam"){const x=DB.exams.find(z=>z.id===a1);L=exCands(x).filter(p=>!a2||p.spec===a2).map(p=>({...recPgt(p),vars:{...recPgt(p).vars,roll:x.roll?.[p.id]||rollOf(p),date:x.date?fd(x.date):""}}))}
 UI.msg={recs:[],text:UI.msg.text||"",sent:{},src:k};msgAdd(L);toast(`${L.length} added to WhatsApp message`);go("messages")},true);
const waBtn=(k,l)=>`<button class="btn small wabtn" data-wa="${k}">${l||"WhatsApp"}</button>`;
