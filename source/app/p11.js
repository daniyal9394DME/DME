
/* =====================================================================
   V9 · CERTIFICATES (workshops and exam merit), from the RIC Certificate Generator
   ===================================================================== */
const CERT_TPL={
 participant:{title:"CERTIFICATE",sub:"OF PARTICIPATION",pres:"This certificate is proudly presented to",desc:"for active participation in the workshop on {{Workshop}}, organised by the Department of {{Department}} with the Department of Medical Education and held on {{Date}} at the Rawalpindi Institute of Cardiology."},
 faculty:{title:"CERTIFICATE",sub:"OF APPRECIATION",pres:"This certificate is gratefully presented to",desc:"in recognition of valuable services as {{Role}} in the workshop on {{Workshop}}, held on {{Date}} at the Rawalpindi Institute of Cardiology."},
 organiser:{title:"CERTIFICATE",sub:"OF APPRECIATION",pres:"This certificate is gratefully presented to",desc:"in recognition of outstanding efforts as {{Role}} of the workshop on {{Workshop}}, organised by the Department of {{Department}} and held on {{Date}} at the Rawalpindi Institute of Cardiology."},
 merit:{title:"CERTIFICATE",sub:"OF MERIT",pres:"This certificate is proudly presented to",desc:"for securing {{Position}} Position in {{Specialty}} ({{Year}}) in the {{Exam}}, {{Session}}, held on {{Date}} at the Rawalpindi Institute of Cardiology, with {{Marks}} marks."}};
const CERT_GRP={participant:"Participants",faculty:"Faculty and facilitators",organiser:"Organisers",merit:"Top scorers"};
const CERT_TOK={participant:["Workshop","Date","Department","Venue","Role"],faculty:["Workshop","Date","Department","Venue","Role"],organiser:["Workshop","Date","Department","Venue","Role"],merit:["Position","Specialty","Year","Marks","Exam","Session","Date"]};
const POS_WORD=["First","Second","Third","Fourth","Fifth"];
function defCertCfg(){return{sigs:[{n:"Name",t:"Executive Director",on:true},{n:"Dr. Daniyal Ahmad Kamal",t:"Director Medical Education",on:true},{n:"Name",t:"HOD Research Cell",on:true}],nameStyle:"script",nameCase:"asis",quality:"high"}}
function certOf(o,kind){if(!o.cert){const yr=(o.date||o.month||iso(TODAY)).slice(0,4);o.cert={prefix:`RIC/DME/${yr}/${o.id}-`,tpl:{},sigs:null,issued:[],extra:[],off:[],issueDate:o.date&&o.date>iso(TODAY)?o.date:iso(TODAY),top:1,by:"specyear",passOnly:true}}return o.cert}
const certTpl=(C,g)=>({...CERT_TPL[g],...(C.tpl[g]||{})});
const certSigs=C=>C.sigs||DB.certCfg.sigs;
const certName=s=>{s=stripOther(String(s||"")).replace(/\s+/g," ").trim();if(DB.certCfg.nameCase==="title")s=s.toLowerCase().replace(/(^|[\s\-'.(])([a-z])/g,(m,a,b)=>a+b.toUpperCase());if(DB.certCfg.nameCase==="upper")s=s.toUpperCase();return s};
const certKey=(g,n)=>g+"|"+String(n).toLowerCase().replace(/^dr\.?\s*/,"").replace(/[^a-z0-9]+/g," ").trim();

/* ---------- who gets a certificate ---------- */
function wsCertPeople(w){const C=certOf(w),L=[];const add=(name,group,role,src)=>{name=stripOther(String(name||"")).replace(/\s+/g," ").trim();if(name.length<2)return;const key=certKey(group,name);if(L.some(x=>x.key===key))return;L.push({key,name,group,role,src})};
 const R=regsOf(w).filter(r=>r.status==="Confirmed"),att=R.some(r=>r.present);R.filter(r=>!att||r.present).forEach(r=>add(r.a.name,"participant","Participant",att?"Marked present":"Confirmed registration"));
 const PB_CR={"Course director":"Course Director","Lecturer / speaker":"Speaker","Station facilitator":"Facilitator","Demonstrator":"Demonstrator","Moderator":"Moderator","Panelist":"Panelist","Assessor":"Assessor"};
 (w.proposal?.final?.faculty||[]).forEach(l=>{if(l&&typeof l==="object"){if(l.role==="Course director")add(l.name,"organiser","Course Director","From the proposal");else add(l.name,"faculty",PB_CR[l.role]||"Facilitator","From the proposal")}else add(String(l).split(",")[0],"faculty","Facilitator","From the proposal")});
 (Array.isArray(w.proposal?.final?.schedule)?w.proposal.final.schedule:[]).forEach(r=>{if(r&&typeof r==="object"&&r.by)add(r.by,"faculty",["lecture","panel"].includes(r.type)?"Speaker":"Facilitator","From the schedule")});
 if(w.director||w.focal)add(w.director||w.focal,"organiser","Course Director","Workshop details");
 if(w.focal&&w.focal!==(w.director||w.focal))add(w.focal,"organiser","Academic Focal Person","Workshop details");
 C.extra.forEach(x=>add(x.name,x.group,x.role,"Added by hand"));
 C.issued.forEach(x=>{if(!L.some(y=>y.key===x.key))L.push({key:x.key,name:x.name,group:x.group,role:x.role,src:"Issued earlier"})});
 return L.map(p=>({...p,iss:C.issued.find(x=>x.key===p.key)}))}
function examMerit(x){const C=certOf(x),top=+C.top||1;const by=C.by;const pool=exCands(x).filter(p=>x.marks[p.id]!=null&&(!C.passOnly||exPass(x,p,+x.marks[p.id])));
 const grp=p=>by==="spec"?p.spec:p.spec+"|"+examYear(x,p);const G={};pool.forEach(p=>{(G[grp(p)]=G[grp(p)]||[]).push(p)});const L=[];
 Object.keys(G).sort((a,b)=>{const[sa,ya]=a.split("|"),[sb,yb]=b.split("|");return specIdx(sa)-specIdx(sb)||(+ya||0)-(+yb||0)}).forEach(k=>{const A=G[k].sort((a,b)=>x.marks[b.id]-x.marks[a.id]);
  A.forEach((p,i)=>{const pos=A.findIndex(q=>x.marks[q.id]===x.marks[p.id])+1;if(pos>top)return;const y=examYear(x,p);
   const key=certKey("merit",p.id);L.push({key,name:"Dr. "+p.name,group:"merit",role:POS_WORD[pos-1]+" position",pid:p.id,pos,spec:p.spec,year:y,marks:x.marks[p.id],gk:k,tie:A.filter(q=>x.marks[q.id]===x.marks[p.id]).length>1,iss:C.issued.find(z=>z.key===key)})})});
 C.issued.forEach(z=>{if(!L.some(y=>y.key===z.key))L.push({...z,src:"Issued earlier",iss:z})});return L}
function certVals(kind,o,p){if(kind==="ws")return{Workshop:o.title,Date:o.date?fdl(o.date):"(date not set)",Department:stripOther(o.dept||""),Venue:o.venue||"RIC",Role:p.role||""};
 return{Position:POS_WORD[(p.pos||1)-1],Specialty:p.spec,Year:p.year?"RIC Year "+p.year:"Year not set",Marks:p.marks!=null?p.marks+"%":"",Exam:o.title,Session:o.session,Date:o.date?fdl(o.date):"(date not set)"}}
const fdl=d=>{const x=P(d);return x.getDate()+" "+["January","February","March","April","May","June","July","August","September","October","November","December"][x.getMonth()]+" "+x.getFullYear()};
const certDesc=(t,vals)=>esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\{\{\s*(\w+)\s*\}\}/g,(m,k)=>vals[k]!=null?`<span class="em">${esc(vals[k])}</span>`:m);

/* ---------- certificate artwork ---------- */
const CORNER=`<svg viewBox="0 0 64 64" width="64" height="64"><path d="M6 6h28M6 6v28" stroke="#c9a23a" stroke-width="3" fill="none"/><path d="M14 14h14M14 14v14" stroke="#c9a23a" stroke-width="1.5" fill="none"/><circle cx="14" cy="14" r="4" fill="#c9a23a"/></svg>`;
function certArt(o){const sg=o.sigs.filter(s=>s.on);
 return`<div class="cert ${o.nameStyle==="serif"?"serif-name":""}"><div class="wm"></div><div class="b1"></div><div class="b2"></div><div class="b3"></div>
 ${[1,2,3,4].map(i=>`<div class="corner c${i}">${CORNER}</div>`).join("")}
 <div class="serial"><span class="lbl">Serial No.</span><br><span class="serial-val">${esc(o.serial)}</span></div>
 <div class="inner"><img class="logo" src="__CERTLOGO__" alt=""><div class="inst">RAWALPINDI INSTITUTE OF CARDIOLOGY</div><div class="dept">DEPARTMENT OF MEDICAL EDUCATION</div>
 <div class="titlewrap"><span class="rule"></span><div class="title">${esc(o.t.title)}</div><span class="rule r"></span></div><div class="csub">${esc(o.t.sub)}</div>
 <div class="pres">${esc(o.t.pres)}</div><div class="name">${esc(o.name)}</div><div class="desc">${certDesc(o.t.desc,o.vals)}</div>
 <div class="sigs">${sg.map(s=>`<div class="sig"><div class="line"></div><div class="nm">${esc(s.n)}</div><div class="ttl">${esc(s.t)}</div></div>`).join("")}</div></div></div>`}
function certFit(c){const n=c.querySelector(".name");n.style.fontSize="";let z=parseFloat(getComputedStyle(n).fontSize),g=0;while(n.scrollWidth>n.clientWidth+1&&z>24&&g++<40){z-=2;n.style.fontSize=z+"px"}
 const inner=c.querySelector(".inner"),d=c.querySelector(".desc");d.style.fontSize="";let s=19.5;g=0;while(inner.scrollHeight>inner.clientHeight+1&&s>13&&g++<20){s-=.5;d.style.fontSize=s+"px"}}
function certFitPreview(){const st=document.getElementById("cstage");if(!st)return;const c=st.querySelector(".cert");if(!c)return;c.style.setProperty("--s",st.clientWidth/1123);certFit(c)}
window.addEventListener("resize",()=>{if(route.v==="cert"||route.v==="certx")certFitPreview()});
function certData(kind,o,p,serial){const C=certOf(o);return{name:certName(p.name),serial:serial||p.iss?.serial||nextSerial(C,0),t:certTpl(C,p.group),vals:certVals(kind,o,p),sigs:certSigs(C),nameStyle:DB.certCfg.nameStyle}}
function nextSerial(C,k){const used=C.issued.map(x=>+String(x.serial).slice(C.prefix.length)||0);const n=(used.length?Math.max(...used):0)+1+k;return C.prefix+String(n).padStart(3,"0")}

/* ---------- page ---------- */
UI.cg="all";UI.ccur=null;
function vCertWs(){const w=DB.workshops.find(x=>x.id===route.id);if(!w)return`<div class="panel">Not found.</div>`;return certPage("ws",w,wsCertPeople(w))}
function vCertEx(){const x=DB.exams.find(e=>e.id===route.id);if(!x)return`<div class="panel">Not found.</div>`;return certPage("ex",x,examMerit(x))}
function certPage(kind,o,L){const C=certOf(o);const off=new Set(C.off);const groups=kind==="ws"?["participant","faculty","organiser"]:["merit"];
 if(UI.cg!=="all"&&!groups.includes(UI.cg))UI.cg="all";const shown=L.filter(p=>UI.cg==="all"||p.group===UI.cg);
 let cur=L.find(p=>p.key===UI.ccur)||shown[0]||L[0];UI.ccur=cur?.key||null;const sel=L.filter(p=>!off.has(p.key));const newN=sel.filter(p=>!p.iss).length;
 const g=cur?.group||groups[0],t=certTpl(C,g),sigs=certSigs(C);
 setTimeout(certFitPreview,0);
 const back=kind==="ws"?`<a href="#ws-${o.id}" class="btn link" style="padding-left:0">← ${esc(o.title)}</a>`:`<a href="#exam-${o.id}" class="btn link" style="padding-left:0">← ${esc(o.title)} · ${esc(o.session)}</a>`;
 const ci=cur?shown.indexOf(cur):-1;
 return`<div>${back}</div>
 <div class="head"><div><h2>${kind==="ws"?"Certificates":"Merit certificates"}</h2><p>${kind==="ws"?`Participants come from the confirmed registrations${regsOf(o).some(r=>r.present)?" marked present":""}, faculty from the proposal and organisers from the workshop details. Add anyone else below.`:`Top ${C.top>1?C.top+" candidates":"candidate"} in each ${C.by==="spec"?"specialty":"specialty and year at RIC"}${C.passOnly?", among those who passed":""}. Candidates with equal marks share a position.`} Serial numbers are fixed once a certificate is made.</p></div>
  <div class="actions">${xbtn(`certreg:${kind}:${o.id}`,"Serial register")}${xbtn("certall","All certificates issued")}</div></div>
 ${kind==="ex"?`<div class="panel"><div class="toolbar"><label class="f inline">Top<select id="cx-top">${opt(["1","2","3"],String(C.top))}</select></label><label class="f inline">in each<select id="cx-by">${opt([["specyear","Specialty and year at RIC"],["spec","Specialty"]],C.by)}</select></label><label class="check2"><input type="checkbox" id="cx-pass" ${C.passOnly?"checked":""}> Only candidates who passed (${o.passMark}%)</label></div>${Object.keys(o.marks).length?"":`<p class="subt" style="margin:8px 0 0">No marks entered yet.</p>`}</div>`:""}
 <div class="cols certcols">
  <div style="display:grid;gap:14px;min-width:0;align-content:start">
   <div class="panel" style="display:grid;gap:10px">
    <div class="pv-nav"><div class="subt">${cur?`Previewing <b>${esc(certName(cur.name))}</b> · ${esc(CERT_GRP[cur.group])}${shown.length>1?` · ${ci+1} of ${shown.length}`:""}`:"Nobody to preview yet"}</div><div class="actions"><button class="btn small" data-act="cf-prev" ${ci>0?"":"disabled"}>‹ Prev</button><button class="btn small" data-act="cf-next" ${ci>=0&&ci<shown.length-1?"":"disabled"}>Next ›</button></div></div>
    <div class="cstage" id="cstage">${cur?certArt(certData(kind,o,cur)):certArt({name:"Dr. Candidate Name",serial:nextSerial(C,0),t,vals:{},sigs,nameStyle:DB.certCfg.nameStyle})}</div>
   </div>
   <div class="panel" style="display:grid;gap:12px"><div class="head"><h3 style="margin:0">Wording · ${esc(CERT_GRP[g])}</h3>${C.tpl[g]?`<button class="btn small" data-act="cf-reset" data-g="${g}">Use standard wording</button>`:'<span class="subt">Standard wording</span>'}</div>
    <div class="grid2"><label class="f">Title<input data-cft="title" data-g="${g}" value="${esc(t.title)}"></label><label class="f">Second line<input data-cft="sub" data-g="${g}" value="${esc(t.sub)}"></label></div>
    <label class="f">Line above the name<input data-cft="pres" data-g="${g}" value="${esc(t.pres)}"></label>
    <label class="f">Text below the name <span class="h">Values filled for each person: ${CERT_TOK[g].map(k=>`<code>{{${k}}}</code>`).join(" ")} · **bold**</span><textarea data-cft="desc" data-g="${g}" rows="4">${esc(t.desc)}</textarea></label>
    <p class="subt" style="margin:0">Wording is saved for this ${kind==="ws"?"workshop":"exam"}. ${kind==="ws"?"Each group (participants, faculty, organisers) has its own wording; preview someone from a group to edit it.":""}</p>
   </div>
   <div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Signatories</h3>${C.sigs?`<button class="btn small" data-act="cf-sigreset">Use the standard signatories</button>`:'<span class="subt">Standard signatories</span>'}</div>
    ${sigs.map((s,i)=>`<div class="sigrow"><label class="check2"><input type="checkbox" data-cfs="on" data-i="${i}" ${s.on?"checked":""}> Show</label><input data-cfs="n" data-i="${i}" value="${esc(s.n)}" aria-label="Signatory ${i+1} name"><input data-cfs="t" data-i="${i}" value="${esc(s.t)}" aria-label="Signatory ${i+1} title"></div>`).join("")}
    <div class="toolbar"><label class="f inline">Name style<select id="cf-ns">${opt([["script","Script"],["serif","Serif"]],DB.certCfg.nameStyle)}</select></label><label class="f inline">Names<select id="cf-nc">${opt([["asis","As entered"],["title","Title Case"],["upper","UPPERCASE"]],DB.certCfg.nameCase)}</select></label></div>
    <p class="subt" style="margin:0">Changing the signatories here applies to this ${kind==="ws"?"workshop":"exam"} only. Name style applies to all certificates.</p></div>
  </div>
  <div style="display:grid;gap:14px;min-width:0;align-content:start">
   <div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">${kind==="ws"?"People":"Top scorers"} · ${sel.length} of ${L.length} selected</h3></div>
    ${groups.length>1?`<div class="chips"><button class="chip" data-cg="all" aria-pressed="${UI.cg==="all"}">All<span class="c">${L.length}</span></button>${groups.map(k=>`<button class="chip" data-cg="${k}" aria-pressed="${UI.cg===k}">${CERT_GRP[k]}<span class="c">${L.filter(p=>p.group===k).length}</span></button>`).join("")}</div>`:""}
    <div class="tblwrap" style="max-height:420px"><table><thead><tr><th style="width:30px"><input type="checkbox" data-cfall="1" ${shown.length&&shown.every(p=>!off.has(p.key))?"checked":""} aria-label="Select all shown"></th><th>Name</th><th>${kind==="ws"?"Role":"Position"}</th><th>Serial</th></tr></thead><tbody>
    ${shown.map(p=>`<tr class="click ${p.key===UI.ccur?"selrow":""}" data-cfpv="${esc(p.key)}"><td><input type="checkbox" data-cfk="${esc(p.key)}" ${off.has(p.key)?"":"checked"} aria-label="Include ${esc(p.name)}"></td><td>${esc(certName(p.name))}<div class="subt">${kind==="ws"?esc(p.src||""):esc(p.spec||"")+(p.year?" · RIC year "+p.year:"")}</div></td>
     <td>${kind==="ws"?esc(p.role):`${esc(p.role||"")}${p.marks!=null?` · ${p.marks}%`:""}${p.tie?' <span class="subt">tie</span>':""}`}${C.extra.some(x=>certKey(x.group,x.name)===p.key)?` <button class="btn link" data-act="cf-rm" data-k="${esc(p.key)}">Remove</button>`:""}</td><td class="code">${p.iss?`${esc(p.iss.serial)}<div class="subt">${fd(p.iss.at.slice(0,10))}</div>`:'<span class="subt">new</span>'}</td></tr>`).join("")||`<tr><td colspan="4" class="empty">${kind==="ws"?"Nobody yet. Confirmed registrations, the proposal's faculty and the course director appear here; add others below.":"No candidates with marks yet."}</td></tr>`}
    </tbody></table></div></div>
   ${kind==="ws"?`<div class="panel" style="display:grid;gap:10px"><h3 style="margin:0">Add people</h3>
    <div class="grid2"><label class="f">Group<select id="cf-ag">${opt(groups.map(k=>[k,CERT_GRP[k]]),UI.cg!=="all"?UI.cg:"participant")}</select></label><label class="f">Role on the certificate<input id="cf-ar" placeholder="e.g. Facilitator, Course Director, Organiser"></label></div>
    <label class="f">Names, one per line<textarea id="cf-an" rows="3" placeholder="Dr. Ayesha Khan&#10;Dr. Bilal Ahmed"></textarea></label>
    <label class="f">Or an Excel file <span class="h">first sheet; a column called Name, and optionally Role</span><input type="file" id="cf-xl" accept=".xlsx,.xls,.csv"></label>
    <div class="actions"><button class="btn" data-act="cf-add">Add</button></div></div>`:""}
   <div class="panel" style="display:grid;gap:10px"><h3 style="margin:0">Make certificates</h3>
    <div class="grid2"><label class="f">Date of issue<input type="date" id="cf-date" value="${C.issueDate}"></label><label class="f">PDF quality<select id="cf-q">${opt([["std","Standard · 150 dpi"],["high","High · 300 dpi"]],DB.certCfg.quality)}</select></label></div>
    <label class="f">Serial number prefix<input id="cf-prefix" value="${esc(C.prefix)}" ${C.issued.length?"disabled":""}></label>
    <p class="subt" style="margin:0">${C.issued.length?`${C.issued.length} issued so far. The prefix is fixed after the first certificate. `:""}${newN?`${newN} selected ${newN>1?"people get":"person gets"} new serial numbers from ${esc(nextSerial(C,0))}.`:sel.length?"Everyone selected already has a serial number; making them again reprints the same numbers.":""}</p>
    <div class="actions"><button class="btn primary" data-act="cf-gen" data-mode="one" ${sel.length?"":"disabled"}>All selected · one PDF</button><button class="btn" data-act="cf-gen" data-mode="zip" ${sel.length?"":"disabled"}>Separate PDFs · ZIP</button><button class="btn" data-act="cf-gen" data-mode="cur" ${cur?"":"disabled"}>This certificate only</button></div>
    <p class="status" id="cf-status" role="status"></p></div>
  </div>
 </div>
 <div id="certhost" aria-hidden="true"></div>`}

/* ---------- generation ---------- */
const CERT_LIBS=["https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js","https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"];
let certLibP=null;
function certLibs(){if(!certLibP)certLibP=Promise.all(CERT_LIBS.map(src=>new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>no(new Error(src));document.head.append(s)}))).catch(e=>{certLibP=null;throw e});return certLibP}
let certCancel=false;
function certProgress(t,k,n){let ov=document.getElementById("certov");if(!ov){ov=document.createElement("div");ov.id="certov";ov.className="certov";ov.innerHTML=`<div class="card" role="dialog" aria-modal="true" aria-label="Making certificates"><h3>Making certificates</h3><div class="bar"><i></i></div><p class="subt"></p><button class="btn small" data-act="cf-cancel">Cancel</button></div>`;document.body.append(ov)}
 ov.querySelector("i").style.width=Math.round(k/Math.max(n,1)*100)+"%";ov.querySelector("p").textContent=t}
const certProgressEnd=()=>document.getElementById("certov")?.remove();
async function certGenerate(mode){const kind=route.v==="cert"?"ws":"ex",o=kind==="ws"?DB.workshops.find(x=>x.id===route.id):DB.exams.find(x=>x.id===route.id);const C=certOf(o);
 const L=kind==="ws"?wsCertPeople(o):examMerit(o);const off=new Set(C.off);let list=mode==="cur"?L.filter(p=>p.key===UI.ccur):L.filter(p=>!off.has(p.key));if(!list.length)return;
 const st=document.getElementById("cf-status");const say=(m,k)=>{if(st){st.textContent=m;st.className="status"+(k?" "+k:"")}};
 if(!DL){say("Downloads are not available in this view.","warn");return}
 certCancel=false;certProgress("Loading the PDF tools…",0,1);
 try{await certLibs()}catch(e){certProgressEnd();say("The PDF tools did not load. Check the internet connection and try again.","warn");return}
 try{await Promise.all(["700 26px Cinzel","italic 500 21px 'Cormorant Garamond'","700 19px 'Cormorant Garamond'","58px 'Great Vibes'","600 12px Montserrat"].map(f=>document.fonts.load(f)))}catch(e){}
 /* serials: keep issued ones, give the next numbers to new people in list order */
 let k=0;const plan=list.map(p=>({p,serial:p.iss?p.iss.serial:nextSerial(C,k++)}));
 const scale=(DB.certCfg.quality==="std"?150:300)/96,host=document.getElementById("certhost");const{jsPDF}=window.jspdf;
 const newPdf=()=>new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});
 const pageOf=async(it)=>{host.innerHTML=certArt(certData(kind,o,it.p,it.serial));const c=host.querySelector(".cert");c.style.transform="none";certFit(c);
  const cv=await html2canvas(c,{scale,backgroundColor:"#fffaf0",logging:false,x:0,y:0,scrollX:0,scrollY:0,windowWidth:1200,windowHeight:900,width:1123,height:794});host.innerHTML="";return cv.toDataURL("image/jpeg",DB.certCfg.quality==="std"?.92:.95)};
 let blob,fname;const base=(kind==="ws"?o.title:`${o.title} ${o.session} merit`).replace(/[\\\/:*?"<>|]+/g,"-");const safe=s=>s.replace(/[\\\/:*?"<>|]+/g,"-").slice(0,120);
 try{
  if(mode==="zip"){const zip=new JSZip();for(let i=0;i<plan.length;i++){if(certCancel)throw"cancel";certProgress(`${i+1} of ${plan.length} · ${certName(plan[i].p.name)}`,i,plan.length);const pdf=newPdf();pdf.addImage(await pageOf(plan[i]),"JPEG",0,0,297,210,undefined,"NONE");zip.file(safe(plan[i].serial+" - "+certName(plan[i].p.name))+".pdf",pdf.output("arraybuffer"))}
   certProgress("Compressing…",1,1);blob=await zip.generateAsync({type:"blob"});fname=`Certificates ${base}.zip`}
  else{const pdf=newPdf();for(let i=0;i<plan.length;i++){if(certCancel)throw"cancel";certProgress(`${i+1} of ${plan.length} · ${certName(plan[i].p.name)}`,i,plan.length);if(i)pdf.addPage("a4","landscape");pdf.addImage(await pageOf(plan[i]),"JPEG",0,0,297,210,undefined,"NONE")}
   certProgress("Building the PDF…",1,1);blob=pdf.output("blob");fname=mode==="cur"?safe(plan[0].serial+" - "+certName(plan[0].p.name))+".pdf":`Certificates ${base}.pdf`}
 }catch(e){certProgressEnd();host.innerHTML="";say(e==="cancel"?"Cancelled. Nothing was saved and no serial numbers were used.":"Something went wrong while drawing the certificates: "+(e.message||e),"warn");return}
 certProgressEnd();
 try{await DL.save({filename:fname,data:blob})}catch(e){say(e?.code==="declined"?"Download cancelled. No serial numbers were used.":e?.code==="too_large"?"The file is too large to save here. Choose Standard quality or Separate PDFs.":"The file could not be saved in this view.","warn");return}
 const at=new Date().toISOString(),fresh=plan.filter(it=>!it.p.iss);
 fresh.forEach(it=>C.issued.push({key:it.p.key,serial:it.serial,name:certName(it.p.name),group:it.p.group,role:it.p.role||"",at,by:ME,date:C.issueDate,...(kind==="ex"?{pid:it.p.pid,marks:it.p.marks,spec:it.p.spec,year:it.p.year}:{})}));
 if(kind==="ws"){o.certs=C.issued.filter(x=>x.group==="participant").length;wlog(o,`Certificates made: ${plan.length}${fresh.length?`, ${fresh.length} new serial numbers (${fresh[0].serial}${fresh.length>1?" to "+fresh[fresh.length-1].serial:""})`:" (reprint)"}`)}
 else xlog(o,`Merit certificates made: ${plan.length}${fresh.length?`, ${fresh.length} new serial numbers`:" (reprint)"}`);
 log(`${plan.length} certificate${plan.length>1?"s":""} made for ${kind==="ws"?o.title:o.title+" "+o.session}`,(kind==="ws"?"ws-":"exam-")+o.id);
 persist();render();const s2=document.getElementById("cf-status");if(s2){s2.textContent=`${plan.length} certificate${plan.length>1?"s":""} saved${fresh.length?`; ${fresh.length} new serial number${fresh.length>1?"s":""} recorded in the register`:""}.`;s2.className="status ok"}}

/* ---------- registers ---------- */
EXPORTS.certreg=(kind,id)=>{const o=kind==="ws"?DB.workshops.find(x=>x.id===id):DB.exams.find(x=>x.id===id);const C=certOf(o);
 return{file:`Certificate register ${kind==="ws"?o.title:o.title+" "+o.session}`,sheets:[sheetFrom("Register",C.issued.map((z,i)=>({"S. No":i+1,"Serial No":z.serial,"Name":z.name,"Certificate":CERT_GRP[z.group],"Role / position":z.role,...(kind==="ex"?{"Specialty":z.spec||"","Year at RIC":z.year?"RIC year "+z.year:"","Marks %":z.marks??""}:{}),"Date of issue":z.date||"","Made on":z.at.slice(0,10),"Made by":z.by})))]}};
EXPORTS.certall=()=>{const rows=[];DB.workshops.forEach(w=>(w.cert?.issued||[]).forEach(z=>rows.push({"Serial No":z.serial,"Name":z.name,"Certificate":CERT_GRP[z.group],"Role / position":z.role,"Programme":w.title,"Held on":w.date||"","Date of issue":z.date||"","Made by":z.by})));
 DB.exams.forEach(x=>(x.cert?.issued||[]).forEach(z=>rows.push({"Serial No":z.serial,"Name":z.name,"Certificate":"Merit","Role / position":z.role+(z.spec?` · ${z.spec}${z.year?" · RIC year "+z.year:""}`:""),"Programme":`${x.title} ${x.session}`,"Held on":x.date||"","Date of issue":z.date||"","Made by":z.by})));
 rows.sort((a,b)=>a["Serial No"]<b["Serial No"]?-1:1);return{file:`RIC DME certificate register ${iso(TODAY)}`,sheets:[sheetFrom("All certificates",rows)]}};

/* ---------- events ---------- */
function certObj(){return route.v==="cert"?DB.workshops.find(x=>x.id===route.id):route.v==="certx"?DB.exams.find(x=>x.id===route.id):null}
function certList(){const o=certObj();return route.v==="cert"?wsCertPeople(o):examMerit(o)}
document.addEventListener("click",e=>{if(route.v!=="cert"&&route.v!=="certx")return;
 const tr=e.target.closest("tr[data-cfpv]");if(tr&&!e.target.closest("input,button")){UI.ccur=tr.dataset.cfpv;render();return}
 const b=e.target.closest("button");if(!b)return;const d=b.dataset;
 if(d.cg){UI.cg=d.cg;UI.ccur=null;render();return}
 const a=d.act;if(!a||!a.startsWith("cf-"))return;const o=certObj(),C=certOf(o);
 if(a==="cf-prev"||a==="cf-next"){const L=certList().filter(p=>UI.cg==="all"||p.group===UI.cg),i=L.findIndex(p=>p.key===UI.ccur);const n=L[i+(a==="cf-next"?1:-1)];if(n){UI.ccur=n.key;render()}return}
 if(a==="cf-reset"){delete C.tpl[d.g];persist();render();return}
 if(a==="cf-sigreset"){C.sigs=null;persist();render();return}
 if(a==="cf-rm"){C.extra=C.extra.filter(x=>certKey(x.group,x.name)!==d.k);persist();render();return}
 if(a==="cf-add"){const g=pick("cf-ag"),r=pick("cf-ar")||{participant:"Participant",faculty:"Facilitator",organiser:"Organiser"}[g];const names=(document.getElementById("cf-an").value||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(!names.length){toast("Type at least one name, or choose an Excel file");return}names.forEach(n=>{if(!C.extra.some(x=>certKey(x.group,x.name)===certKey(g,n)))C.extra.push({name:n,group:g,role:r})});
  (route.v==="cert"?wlog:xlog)(o,`${names.length} added to certificates (${CERT_GRP[g]})`);persist();UI.cg=g;render();toast(`${names.length} added`);return}
 if(a==="cf-gen"){C.issueDate=pick("cf-date")||C.issueDate;certGenerate(d.mode);return}
 if(a==="cf-cancel"){certCancel=true;return}});
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="cf-cancel"]');if(b)certCancel=true});
document.addEventListener("change",e=>{if(route.v!=="cert"&&route.v!=="certx")return;const t=e.target,d=t.dataset,o=certObj();if(!o)return;const C=certOf(o);
 if(d.cfk){const s=new Set(C.off);if(t.checked)s.delete(d.cfk);else s.add(d.cfk);C.off=[...s];persist();render();return}
 if(d.cfall){const L=certList().filter(p=>UI.cg==="all"||p.group===UI.cg),s=new Set(C.off);L.forEach(p=>t.checked?s.delete(p.key):s.add(p.key));C.off=[...s];persist();render();return}
 if(d.cft){const g=d.g;C.tpl[g]={...certTpl(C,g),[d.cft]:t.value};persist();render();return}
 if(d.cfs){if(!C.sigs)C.sigs=JSON.parse(JSON.stringify(DB.certCfg.sigs));const s=C.sigs[+d.i];if(d.cfs==="on")s.on=t.checked;else s[d.cfs]=t.value.trim();persist();render();return}
 if(t.id==="cf-ns"){DB.certCfg.nameStyle=t.value;persist();render();return}
 if(t.id==="cf-nc"){DB.certCfg.nameCase=t.value;persist();render();return}
 if(t.id==="cf-q"){DB.certCfg.quality=t.value;persist();return}
 if(t.id==="cf-date"){C.issueDate=t.value||C.issueDate;persist();return}
 if(t.id==="cf-prefix"){const v=t.value.trim();if(v){C.prefix=v;persist();render()}return}
 if(t.id==="cx-top"){C.top=+t.value;persist();render();return}
 if(t.id==="cx-by"){C.by=t.value;persist();render();return}
 if(t.id==="cx-pass"){C.passOnly=t.checked;persist();render();return}
 if(t.id==="cf-xl"&&t.files[0]){const f=t.files[0];t.value="";const fr=new FileReader();fr.onload=()=>{try{const wb=XLSX.read(new Uint8Array(fr.result),{type:"array"});const aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:"",raw:false,blankrows:false});
  const h=(aoa[0]||[]).map(x=>String(x).trim().toLowerCase());let ni=h.findIndex(x=>/name/.test(x)),ri=h.findIndex(x=>/role|designation/.test(x));const body=ni<0?aoa:aoa.slice(1);if(ni<0)ni=0;
  const g=pick("cf-ag"),r0=pick("cf-ar")||{participant:"Participant",faculty:"Facilitator",organiser:"Organiser"}[g];let n=0;
  body.forEach(row=>{const nm=String(row[ni]||"").trim();if(nm.length<2)return;const r=ri>=0&&String(row[ri]||"").trim()||r0;if(!C.extra.some(x=>certKey(x.group,x.name)===certKey(g,nm))){C.extra.push({name:nm,group:g,role:r});n++}});
  (route.v==="cert"?wlog:xlog)(o,`${n} added to certificates from ${f.name}`);persist();UI.cg=g;render();toast(`${n} names added from ${f.name}`)}catch(err){toast("Could not read this file. Save it as .xlsx or .csv and try again.")}};fr.readAsArrayBuffer(f)}});
window.addEventListener("hashchange",()=>{if(route.v!=="cert"&&route.v!=="certx"){UI.ccur=null;UI.cg="all"}});
