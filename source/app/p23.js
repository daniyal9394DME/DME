
/* =====================================================================
   V20 · ROTATING TRAINEES (PGTs from other institutes on short
   rotations at RIC): daily attendance, a self-service attendance kiosk
   for the DME&T office computer, and the experience certificate
   ===================================================================== */
const ROT_UNITS=["Cardiac Surgery","CT Angiography / Cardiac Imaging","Cardiology","Cath Lab","Echocardiography","CCU","Cardiac Anaesthesia","Paediatric Cardiology","Paediatric Cardiac Surgery","Electrophysiology"];
const ROT_PROGS=["FCPS","MS","MD","MCPS","Diploma","House job","Other"];
const AT_L={P:"Present",A:"Absent",L:"Leave",H:"Holiday / off"};
const visList=()=>(DB.visitors=DB.visitors||[]);
/* observers (V53) share the visitors list, the kiosk and attendance; they are not PGT rotations */
const visName=v=>v&&v.kind==="obs"?`${v.title?v.title+" ":""}${v.name}`:`Dr. ${v.name}`;
const rotOnly=()=>visList().filter(v=>v.kind!=="obs");
const rotOff=()=>DB.settings.rotOff||[0];
const dIso=d=>iso(d);
function rotState(v){const t=iso(TODAY),end=v.left||v.end;if(v.start>t)return"Upcoming";if(end<t)return v.left?"Left early":"Completed";return"Current"}
function rotStats(v){const t=iso(TODAY),end=(v.left||v.end)<t?(v.left||v.end):t,att=v.att||{},off=rotOff();let work=0,nP=0,nL=0,nH=0,nA=0;
 for(let d=P(v.start);iso(d)<=end;d.setDate(d.getDate()+1)){const ds=iso(d),m=att[ds]?.s,isOff=off.includes(d.getDay());
  if(m==="H"||(isOff&&m!=="P")){nH++;continue}work++;if(m==="P")nP++;else if(m==="L")nL++;else if(ds<t||m==="A")nA++}
 let total=0;for(let d=P(v.start);iso(d)<=(v.left||v.end);d.setDate(d.getDate()+1)){const m=att[iso(d)]?.s;if(m!=="H"&&!off.includes(d.getDay()))total++}
 return{work,P:nP,L:nL,A:nA,H:nH,total,pct:work?Math.round(nP/work*100):null}}
const rotDaysLeft=v=>days(P(v.left||v.end),TODAY);
const rotPin=()=>String(Math.floor(1000+Math.random()*9000));
const rotFac=v=>v.sup?(facById(v.sup)?facName(facById(v.sup)):v.sup):"";
function markAtt(v,ds,s,by){v.att=v.att||{};if(!s){delete v.att[ds];return}v.att[ds]={s,t:s==="P"?new Date().toTimeString().slice(0,5):"",by:by||ME}}

/* ---------- list ---------- */
UI.rotTab="Current";UI.rotQ="";
function vRotating(){const L=rotOnly(),t=iso(TODAY),can=!isViewer();const by=s=>L.filter(v=>rotState(v)===s||(s==="Completed"&&rotState(v)==="Left early"));
 const tabs=["Current","Upcoming","Completed"],q=UI.rotQ.toLowerCase();
 const rows=by(UI.rotTab).filter(v=>!q||(v.name+" "+v.inst+" "+v.unit).toLowerCase().includes(q)).sort((a,b)=>UI.rotTab==="Completed"?(a.end<b.end?1:-1):(a.start<b.start?-1:1));
 const cur=by("Current"),markedToday=cur.filter(v=>v.att?.[t]).length,isOffToday=rotOff().includes(TODAY.getDay());
 const todayCell=v=>{const m=v.att?.[t];return`<div class="attbtns">${["P","A","L"].map(s=>`<button class="ab ${m?.s===s?"on a-"+s:""}" data-att="${v.id}|${t}|${s}" ${can?"":"disabled"} title="${AT_L[s]}">${s}</button>`).join("")}${m?.t?`<span class="subt">${m.t}</span>`:""}</div>`};
 return`<div class="head"><div><h2>Rotating trainees</h2><p>PGTs from other institutes on short rotations at RIC. They mark attendance daily; the experience certificate shows their attendance.</p></div>
  <div class="actions">${xbtn("rotating")}${can?`<a class="btn" href="#kiosk">Open attendance kiosk</a><button class="btn primary" data-act="rot-add">Add rotating trainee</button>`:""}</div></div>
 ${rotLinkPanel()}
 <div class="kpis">${[["Current",cur.length,`${markedToday} of ${cur.length} marked today`],["Upcoming",by("Upcoming").length,"starting later"],["Completed",by("Completed").length,`${by("Completed").filter(v=>!v.cert).length} certificates to issue`]].map(([k,n,s])=>`<button class="kpi" data-rottab="${k}" aria-pressed="${UI.rotTab===k}"><span class="n">${n}</span><span class="l">${k}</span><span class="sub">${s}</span></button>`).join("")}</div>
 <div class="panel flush"><div style="padding:12px 16px 0;display:grid;gap:8px"><div class="toolbar"><div class="chips">${tabs.map(k=>`<button class="chip" data-rottab="${k}" aria-pressed="${UI.rotTab===k}">${k}<span class="c">${by(k).length}</span></button>`).join("")}</div><input type="search" id="rotq" placeholder="Search name, institute or unit" value="${esc(UI.rotQ)}" aria-label="Search"></div>
  ${UI.rotTab==="Current"&&isOffToday?`<p class="subt" style="margin:0">Today is a weekly off day; attendance is optional.</p>`:""}</div>
  <div class="tblwrap" style="margin-top:8px"><table><thead><tr><th>Trainee</th><th>Rotation at RIC</th><th>Dates</th>${UI.rotTab==="Current"?"<th>Today</th>":""}<th class="num">Attendance</th>${UI.rotTab==="Completed"?"<th>Certificate</th>":""}</tr></thead><tbody>
  ${rows.map(v=>{const s=rotStats(v),dl=rotDaysLeft(v);return`<tr><td><a href="#rot-${v.id}"><b>Dr. ${esc(v.name)}</b></a>${rotNew(v)?' <span class="pill p-pend">New · check documents</span>':""}<div class="subt">${esc(v.program||"")} ${esc(v.spec||"")}${v.year?" · Year "+esc(v.year):""} · ${esc(v.inst||"")}</div></td>
   <td>${esc(v.unit||"")}<div class="subt">${esc(rotFac(v))}</div></td><td>${fd(v.start)} – ${fd(v.left||v.end)}<div class="subt">${UI.rotTab==="Current"?`${dl} day${dl===1?"":"s"} left`:UI.rotTab==="Upcoming"?`starts in ${days(P(v.start),TODAY)} days`:rotState(v)}</div></td>
   ${UI.rotTab==="Current"?`<td>${todayCell(v)}</td>`:""}<td class="num">${s.pct==null?"—":`<b class="${s.pct<75?"d-red":""}">${s.pct}%</b><div class="subt">${s.P} of ${s.work} days</div>`}</td>
   ${UI.rotTab==="Completed"?`<td>${v.cert?`<span class="pill p-ric">Issued</span><div class="subt">${esc(v.cert.no)}</div>`:`<a class="btn small" href="#rot-${v.id}">Issue</a>`}</td>`:""}</tr>`}).join("")||`<tr><td colspan="6" class="empty">${UI.rotTab==="Current"?"No rotating trainees at RIC right now.":UI.rotTab==="Upcoming"?"None scheduled.":"None yet."}</td></tr>`}
 </tbody></table></div></div>
 <p class="subt">Weekly off: ${rotOff().map(d=>["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d]).join(", ")||"none"}. Off days and holidays are not counted as working days. Unmarked past working days count as absent.${can?` <button class="btn link" data-act="rot-off">Change</button>`:""}</p>`}

/* ---------- profile ---------- */
function vRot(){const v=visList().find(x=>x.id===route.id);if(!v)return`<div class="panel">Not found. <a href="#rotating">Back</a></div>`;const s=rotStats(v),st=rotState(v),can=!isViewer(),t=iso(TODAY);
 const months=[];for(let m=v.start.slice(0,7);m<=(v.left||v.end).slice(0,7);m=mAdd(m,1))months.push(m);
 const cal=m=>{const f=P(m+"-01"),st0=new Date(f);st0.setDate(1-((f.getDay()+6)%7));const cells=[];for(let k=0;k<42;k++){const d=new Date(st0);d.setDate(st0.getDate()+k);cells.push(d)}
  const last=cells.findLastIndex(d=>iso(d).slice(0,7)===m);const rowsN=Math.ceil((last+1)/7);
  return`<div class="attcal"><h4>${f.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</h4><div class="acg">${["M","T","W","T","F","S","S"].map(x=>`<span class="acgh">${x}</span>`).join("")}${cells.slice(0,rowsN*7).map(d=>{const ds=iso(d),inR=ds>=v.start&&ds<=(v.left||v.end)&&ds.slice(0,7)===m,mk=v.att?.[ds],off=rotOff().includes(d.getDay());
   if(!inR)return`<span class="acd out">${ds.slice(0,7)===m?d.getDate():""}</span>`;const cls=mk?"a-"+mk.s:off?"a-off":ds<t?"a-miss":"";
   return`<button class="acd ${cls} ${ds===t?"today":""}" data-attcyc="${v.id}|${ds}" ${can&&ds<=t?"":"disabled"} title="${fd(ds)}: ${mk?AT_L[mk.s]+(mk.t?" at "+mk.t:"")+(mk.by?" · "+mk.by:""):off?"Weekly off":ds<t?"Not marked (absent)":""}">${d.getDate()}</button>`}).join("")}</div></div>`};
 return`<div><a href="#rotating" class="btn link" style="padding-left:0">← Rotating trainees</a></div>
 <div class="panel"><div class="prof"><div class="avatar" aria-hidden="true">${esc(v.name.split(" ").map(w=>w[0]).slice(0,2).join(""))}</div>
  <div class="who"><div class="code">Rotating trainee · ${st}</div><h2>Dr. ${esc(v.name)}</h2><div class="meta"><span>${esc(v.program||"")} ${esc(v.spec||"")}${v.year?" · Year "+esc(v.year):""}</span><span>${esc(v.inst||"")}</span><span>${esc(v.unit||"")} at RIC</span></div></div>
  <div class="actions">${can?`<button class="btn" data-act="rot-edit" data-id="${v.id}">Edit details</button>`:""}${st!=="Upcoming"?`<button class="btn ${st==="Current"?"":"primary"}" data-act="rot-cert" data-id="${v.id}">${v.cert?"Experience certificate (PDF)":"Issue experience certificate"}</button>`:""}${can?`<button class="btn danger" data-act="rot-del" data-id="${v.id}">Remove</button>`:""}</div></div></div>
 <div class="kpis">${[[s.pct==null?"—":s.pct+"%","Attendance",`${s.P} present of ${s.work} working days so far`],[s.A,"Absent","unmarked past days count as absent"],[s.L,"Leave",""],[`${s.total}`,"Working days in rotation",`${fd(v.start)} – ${fd(v.left||v.end)}`]].map(([n,l,sub])=>`<div class="kpi"><span class="n">${n}</span><span class="l">${l}</span>${sub?`<span class="sub">${sub}</span>`:""}</div>`).join("")}</div>
 <div class="cols side"><div class="panel"><h3>Attendance</h3><p class="subt" style="margin:0 0 8px">${can?"Tap a day to change it: Present › Absent › Leave › Holiday › clear.":""} <span class="lg a-P">P</span> present <span class="lg a-A">A</span> absent <span class="lg a-L">L</span> leave <span class="lg a-H">H</span> holiday / off</p><div class="attcals">${months.map(cal).join("")}</div></div>
  <div style="display:grid;gap:18px;align-content:start"><div class="panel"><h3>Details</h3><dl class="kv"><dt>Parent institute</dt><dd>${esc(v.inst||"—")}</dd><dt>Programme</dt><dd>${esc(v.program||"—")} ${esc(v.spec||"")}${v.year?", year "+esc(v.year):""}</dd><dt>Rotation unit</dt><dd>${esc(v.unit||"—")}</dd><dt>Supervisor at RIC</dt><dd>${esc(rotFac(v)||v.supName||"—")}</dd>${v.father?`<dt>Father's name</dt><dd>${esc(v.father)}</dd>`:""}
   <dt>Rotation</dt><dd>${fd(v.start)} – ${fd(v.end)}${v.left?`<div class="d-red">Left on ${fd(v.left)}</div>`:""}</dd>${v.cnic?`<dt>CNIC</dt><dd>${esc(v.cnic)}</dd>`:""}${v.pmdc?`<dt>PMDC</dt><dd>${esc(v.pmdc)}</dd>`:""}<dt>Mobile</dt><dd>${esc(v.mobile||"—")}</dd>${v.email?`<dt>Email</dt><dd>${esc(v.email)}</dd>`:""}${v.letter?`<dt>Rotation letter</dt><dd>${esc(v.letter)}</dd>`:""}${v.notes?`<dt>Notes</dt><dd>${esc(v.notes)}</dd>`:""}</dl></div>
   ${can?`<div class="panel"><h3>Attendance PIN</h3><p style="margin:0"><span class="code" style="font-size:22px;letter-spacing:.2em">${esc(v.pin)}</span></p><p class="subt" style="margin:4px 0 8px">The trainee enters this on the attendance kiosk in the DME&T office.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${waNum(v.mobile)?`<a class="btn small" target="_blank" rel="noopener" href="https://wa.me/${waNum(v.mobile)}?text=${encodeURIComponent(`Dear Dr. ${v.name},\nWelcome to the Rawalpindi Institute of Cardiology for your ${v.unit} rotation (${fd(v.start)} to ${fd(v.end)}).\nPlease mark your attendance every day on the attendance computer in the Department of Medical Education and Training. Your PIN is ${v.pin}.\nDME Office, RIC`)}">Send PIN on WhatsApp</a>`:""}<button class="btn small" data-act="rot-pin" data-id="${v.id}">New PIN</button></div></div>`:""}
   ${rotDocsHtml(v)}${v.cert?`<div class="panel"><h3>Certificate</h3><p style="margin:0">${esc(v.cert.no)} · issued ${fd(v.cert.at)}</p><p class="subt" style="margin:4px 0 0">Attendance on the certificate: ${v.cert.P} of ${v.cert.work} days (${v.cert.pct}%)</p></div>`:""}</div></div>`}

/* ---------- add / edit ---------- */
function sheetRot(v){const n=!v;v=v||{name:"",inst:"",program:"FCPS",spec:"",year:"",unit:"Cardiac Surgery",sup:"",start:iso(TODAY),end:"",cnic:"",pmdc:"",mobile:"",email:"",letter:"",notes:""};
 openSheet(n?"Add rotating trainee":"Edit · Dr. "+v.name,`<label class="f">Full name <span class="h">without "Dr."</span><input name="name" value="${esc(v.name)}"></label>
 <label class="f">Parent institute<input name="inst" value="${esc(v.inst||"")}" list="rot-inst" placeholder="e.g. Holy Family Hospital, Rawalpindi"></label><datalist id="rot-inst">${[...new Set(visList().map(x=>x.inst).filter(Boolean))].map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
 <div class="grid2"><label class="f">Programme<select name="program">${opt(ROT_PROGS,v.program||"FCPS")}</select></label><label class="f">Their specialty<input name="spec" value="${esc(v.spec||"")}" placeholder="e.g. General Surgery"></label></div>
 <div class="grid2"><label class="f">Training year<input name="year" value="${esc(v.year||"")}" placeholder="e.g. 3"></label><label class="f">Rotation unit at RIC<input name="unit" list="rot-units" value="${esc(v.unit||"")}"></label></div><datalist id="rot-units">${ROT_UNITS.map(u=>`<option value="${esc(u)}">`).join("")}</datalist>
 <label class="f">Supervisor at RIC<select name="sup"><option value="">Not assigned</option>${DB.faculty.filter(f=>f.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(f=>`<option value="${f.id}" ${v.sup===f.id?"selected":""}>${esc(facName(f))} · ${esc(f.spec)}</option>`).join("")}</select></label>
 <div class="grid2"><label class="f">Rotation starts<input type="date" name="start" value="${v.start||""}"></label><label class="f">Rotation ends<input type="date" name="end" value="${v.end||""}"></label></div>
 <div class="chips">${[1,2,3,6].map(m=>`<button type="button" class="chip" data-rotlen="${m}">${m} month${m>1?"s":""}</button>`).join("")}</div>
 <div class="grid2"><label class="f">Mobile<input name="mobile" value="${esc(v.mobile||"")}" placeholder="03xx-xxxxxxx"></label><label class="f">Email<input name="email" value="${esc(v.email||"")}"></label></div>
 <div class="grid2"><label class="f">CNIC<input name="cnic" value="${esc(v.cnic||"")}"></label><label class="f">PMDC no.<input name="pmdc" value="${esc(v.pmdc||"")}"></label></div>
 <label class="f">Rotation letter / NOC ref. <span class="h">optional</span><input name="letter" value="${esc(v.letter||"")}"></label>
 ${n?"":`<label class="f">Left early on <span class="h">only if the rotation ended before the planned date</span><input type="date" name="left" value="${v.left||""}"></label>`}
 <label class="f">Notes<textarea name="notes">${esc(v.notes||"")}</textarea></label>`,()=>{
  const name=fv("name").replace(/^(dr\.?\s+)+/i,"");if(name.length<3)return fail("Enter the full name.");if(!fv("inst"))return fail("Enter the parent institute.");if(!fv("unit"))return fail("Enter the rotation unit.");
  if(!fv("start")||!fv("end"))return fail("Enter the rotation dates.");if(fv("end")<fv("start"))return fail("The end date is before the start date.");
  let mob=fv("mobile").replace(/\D/g,"");if(mob.startsWith("92"))mob="0"+mob.slice(2);if(mob&&mob.length!==11)return fail("Enter the mobile as 03xx-xxxxxxx.");
  const rec={name,inst:fv("inst"),program:fv("program"),spec:fv("spec"),year:fv("year"),unit:fv("unit"),sup:fv("sup"),start:fv("start"),end:fv("end"),mobile:mob?mob.slice(0,4)+"-"+mob.slice(4):"",email:fv("email").toLowerCase(),cnic:fv("cnic"),pmdc:fv("pmdc").toUpperCase(),letter:fv("letter"),notes:fv("notes")};
  if(!n){const l=fv("left");if(l&&(l<rec.start||l>rec.end))return fail("The leaving date must be within the rotation.");rec.left=l||null}
  if(n){const nv={id:uid("V"),...rec,pin:rotPin(),att:{}};visList().push(nv);log(`Rotating trainee added: Dr. ${name}, ${rec.inst}, ${rec.unit} (${fd(rec.start)} – ${fd(rec.end)})`,"rot-"+nv.id);toast("Added. PIN "+nv.pin);go("rot-"+nv.id)}
  else{Object.assign(v,rec);if(!v.left)delete v.left;log(`Rotating trainee edited: Dr. ${name}`,"rot-"+v.id);toast("Saved")}return true})}

/* ---------- experience certificate ---------- */
function sheetRotCert(v){const s=rotStats(v),st=rotState(v);
 openSheet(v.cert?"Experience certificate":"Issue experience certificate",`${st==="Current"?`<div class="flag">The rotation is still running (ends ${fd(v.end)}). The certificate will show attendance up to today.</div>`:""}
 ${s.pct!=null&&s.pct<75?`<div class="flag">Attendance is ${s.pct}%, below 75%.</div>`:""}
 <dl class="kv"><dt>Rotation</dt><dd>${esc(v.unit)}, ${fd(v.start)} – ${fd(v.left||v.end)}</dd><dt>Attendance</dt><dd>${s.P} of ${s.work} working days (${s.pct??0}%)${s.L?`, ${s.L} on leave`:""}</dd></dl>
 <label class="f">Conduct<select name="conduct">${opt(["satisfactory","good","excellent","—"],v.cert?.conduct||"satisfactory")}</select></label>
 <label class="f">Signed by<input name="signer" value="${esc(v.cert?.signer||SELF)}"></label><label class="f">Designation<input name="sdesig" value="${esc(v.cert?.sdesig||"Director of Medical Education and Training")}"></label>
 <label class="check"><input type="checkbox" name="supsig" ${v.cert?.supsig!==false&&v.sup?"checked":""} ${v.sup?"":"disabled"}> Add a signature line for the supervisor${v.sup?` (${esc(rotFac(v))})`:""}</label>
 ${v.cert?`<p class="subt" style="margin:0">Certificate no. ${esc(v.cert.no)}, first issued ${fd(v.cert.at)}. Downloading again keeps the same number.</p>`:""}`,()=>{
  const yr=TODAY.getFullYear(),seq=visList().filter(x=>x.cert&&x.cert.no.includes(`/${yr}/`)).length+1;
  const supsig=!!document.querySelector('#sheetform [name="supsig"]')?.checked;
  v.cert={...(v.cert||{}),no:v.cert?.no||`RIC/DME/ROT/${yr}/${String(seq).padStart(3,"0")}`,at:v.cert?.at||iso(TODAY),conduct:fv("conduct"),signer:fv("signer"),sdesig:fv("sdesig"),supsig,P:s.P,work:s.work,pct:s.pct??0,L:s.L};
  log(`Experience certificate ${v.cert.no} for Dr. ${v.name}`,"rot-"+v.id);rotCertPdf(v).catch(e=>toast(e.message||"Could not make the PDF"));return true},v.cert?"Download PDF":"Issue and download")}
async function rotCertPdf(v){await bioLoadPdf();const{jsPDF}=window.jspdf;const d=new jsPDF({unit:"pt",format:"a4"}),W=595,c=v.cert,L=64,R=W-64;
 const logo=document.querySelector('img[alt="RIC logo"]')?.src;if(logo&&logo.startsWith("data:"))try{d.addImage(logo,"JPEG",W/2-32,40,64,64)}catch(e){}
 d.setFont("times","bold");d.setFontSize(16);d.text("RAWALPINDI INSTITUTE OF CARDIOLOGY",W/2,126,{align:"center"});d.setFont("times","normal");d.setFontSize(11.5);d.text("Department of Medical Education and Training · Rawal Road, Rawalpindi",W/2,143,{align:"center"});
 d.setDrawColor(109,31,43);d.setLineWidth(1.4);d.line(L,154,R,154);
 d.setFontSize(10.5);d.text(`No. ${c.no}`,L,180);d.text(`Dated: ${fd(iso(TODAY))}`,R,180,{align:"right"});
 d.setFont("times","bold");d.setFontSize(15);d.text("EXPERIENCE CERTIFICATE",W/2,222,{align:"center"});d.setLineWidth(.6);d.setDrawColor(0);const tw=d.getTextWidth("EXPERIENCE CERTIFICATE");d.line(W/2-tw/2,225,W/2+tw/2,225);
 const end=v.left||v.end;const prog=[v.program,v.spec].filter(Boolean).join(" ");
 const p1=`This is to certify that Dr. ${v.name}${prog?`, ${prog} trainee`:""}${v.year?` (year ${v.year})`:""} of ${v.inst}, completed a rotation in ${v.unit} at the Rawalpindi Institute of Cardiology, Rawalpindi, from ${fd(v.start)} to ${fd(end)}${v.sup?`, under the supervision of ${rotFac(v)}`:""}.`;
 const p2=`During this period the trainee attended ${c.P} of ${c.work} working days (${c.pct}%)${c.L?`, with ${c.L} day${c.L>1?"s":""} of approved leave`:""}.${c.conduct&&c.conduct!=="—"?` The trainee's conduct remained ${c.conduct}.`:""}`;
 const p3="We wish the trainee success in future endeavours.";
 d.setFont("times","normal");d.setFontSize(12.5);let y=262;[p1,p2,p3].forEach(p=>{const ls=d.splitTextToSize(p,R-L);d.text(ls,L,y,{lineHeightFactor:1.6,align:"justify",maxWidth:R-L});y+=ls.length*12.5*1.6+14});
 const sy=Math.max(y+80,560);d.setLineWidth(.5);
 if(c.supsig&&v.sup){d.line(L,sy,L+190,sy);d.setFont("times","bold");d.setFontSize(11.5);d.text(rotFac(v),L,sy+15);d.setFont("times","normal");d.text(`Supervisor, ${v.unit}`,L,sy+30);d.text("Rawalpindi Institute of Cardiology",L,sy+45)}
 d.line(R-200,sy,R,sy);d.setFont("times","bold");d.text(c.signer,R,sy+15,{align:"right"});d.setFont("times","normal");d.text(c.sdesig,R,sy+30,{align:"right"});d.text("Rawalpindi Institute of Cardiology",R,sy+45,{align:"right"});
 d.setFontSize(8.5);d.setTextColor(110);d.text(`Attendance recorded daily in the DME&T Office attendance register. Certificate no. ${c.no}.`,W/2,800,{align:"center"});
 d.save(`Experience certificate - Dr ${v.name.replace(/[^A-Za-z0-9 ]+/g,"")}.pdf`)}

/* ---------- attendance kiosk (DME&T office computer) ---------- */
UI.kio={sel:null,pin:"",msg:null};
const kioskOn=()=>{try{return sessionStorage.getItem("dme-kiosk")==="1"}catch(e){return false}};
function vKiosk(){try{sessionStorage.setItem("dme-kiosk","1")}catch(e){}document.body.classList.add("kiosk");const t=iso(TODAY),K=UI.kio;
 const cur=visList().filter(v=>rotState(v)==="Current").sort((a,b)=>a.name.localeCompare(b.name));
 const now=new Date();
 if(K.msg)return`<div class="kio"><div class="kio-done ${K.msg.ok?"ok":"bad"}"><b>${esc(K.msg.t)}</b><span>${esc(K.msg.s||"")}</span></div></div>`;
 if(K.sel){const v=cur.find(x=>x.id===K.sel);if(!v){K.sel=null;return vKiosk()}
  return`<div class="kio"><h2>${esc(visName(v))}</h2><p class="subt">Enter your 4-digit PIN</p><div class="kio-pin">${[0,1,2,3].map(i=>`<span class="${K.pin.length>i?"f":""}"></span>`).join("")}</div>
  <div class="kio-pad">${[1,2,3,4,5,6,7,8,9,"✕",0,"⌫"].map(k=>`<button data-kio="${k}">${k}</button>`).join("")}</div><button class="btn link" data-kio="back">Not you? Go back</button></div>`}
 return`<div class="kio"><div class="kio-h"><img src="${esc(document.querySelector('img[alt="RIC logo"]')?.src||"")}" alt=""><div><h2>Daily attendance</h2><p>Rotating trainees and observers · Department of Medical Education and Training</p></div><div class="kio-clock"><b>${now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</b>${now.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div></div>
  <p class="subt" style="text-align:center">Tap your name, then enter your PIN.</p>
  <div class="kio-names">${cur.map(v=>{const m=v.att?.[t];return`<button data-kio-sel="${v.id}" class="${m?.s==="P"?"done":""}"><b>${esc(visName(v))}</b><span>${esc(v.unit)}${m?.s==="P"?` · marked ${m.t}`:""}</span></button>`}).join("")||`<p class="subt">No rotating trainees or observers today.</p>`}</div>
  <button class="btn link kio-exit" data-kio="exit">Exit kiosk (staff)</button></div>`}
function kioMsg(ok,t,s){UI.kio={sel:null,pin:"",msg:{ok,t,s}};render();clearTimeout(UI.kioT);UI.kioT=setTimeout(()=>{UI.kio.msg=null;if(route.v==="kiosk")render()},3500)}
async function kioExit(){if(LIVE&&SYNC.email){const pw=prompt("Staff password to leave the kiosk");if(pw==null)return;const{error}=await SYNC.sb.auth.signInWithPassword({email:SYNC.email,password:pw});if(error){toast("Wrong password");return}}
 else if(!confirm("Leave the attendance kiosk?"))return;try{sessionStorage.removeItem("dme-kiosk")}catch(e){}document.body.classList.remove("kiosk");go("rotating")}
document.addEventListener("click",e=>{if(route.v!=="kiosk")return;const s=e.target.closest("[data-kio-sel]");if(s){UI.kio={sel:s.dataset.kioSel,pin:"",msg:null};render();return}
 const b=e.target.closest("[data-kio]");if(!b)return;const k=b.dataset.kio,K=UI.kio;
 if(k==="exit")return kioExit();if(k==="back"||k==="✕"){UI.kio={sel:null,pin:"",msg:null};render();return}
 if(k==="⌫"){K.pin=K.pin.slice(0,-1);render();return}if(K.pin.length>=4)return;K.pin+=k;
 if(K.pin.length<4){render();return}
 const v=visList().find(x=>x.id===K.sel),t=iso(TODAY);if(!v)return;
 if(K.pin!==String(v.pin)){K.fails=(K.fails||0)+1;return kioMsg(false,"Wrong PIN","Try again, or ask the DME&T office.")}
 if(v.att?.[t]?.s==="P")return kioMsg(true,`Already marked, ${visName(v)}`,`Marked present at ${v.att[t].t}`);
 markAtt(v,t,"P","Kiosk");persist();kioMsg(true,`Thank you, ${visName(v)}`,`Marked present at ${v.att[t].t} · ${fd(t)}`)});
document.addEventListener("keydown",e=>{if(route.v!=="kiosk"||!UI.kio.sel)return;if(/^\d$/.test(e.key)){const b=document.querySelector(`[data-kio="${e.key}"]`);if(b)b.click()}if(e.key==="Backspace"){const b=document.querySelector('[data-kio="⌫"]');if(b)b.click()}});
/* the kiosk stays on screen until a staff member exits it */
if(kioskOn()&&location.hash!=="#kiosk")location.hash="#kiosk";
window.addEventListener("hashchange",()=>{if(kioskOn()&&location.hash!=="#kiosk"){location.hash="#kiosk"}});
setInterval(()=>{if(route.v==="kiosk"&&!UI.kio.sel&&!UI.kio.msg){const c=document.querySelector(".kio-clock b");if(c)c.textContent=new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
 const today=iso(new Date(new Date().toDateString()));if(today!==iso(TODAY)){TODAY.setTime(new Date(new Date().toDateString()).getTime());render()}}},20000);

/* ---------- staff actions ---------- */
document.addEventListener("click",e=>{const r=e.target.closest("[data-rottab],[data-att],[data-attcyc],[data-rotlen],[data-act^='rot-']");if(!r)return;
 if(r.dataset.rottab){UI.rotTab=r.dataset.rottab;render();return}
 if(r.dataset.rotlen){const s=document.querySelector('#sheetform [name="start"]'),en=document.querySelector('#sheetform [name="end"]');if(s&&s.value){const d=P(s.value);d.setMonth(d.getMonth()+ +r.dataset.rotlen);d.setDate(d.getDate()-1);en.value=iso(d)}return}
 if(r.dataset.att){if(isViewer())return;const[id,ds,s]=r.dataset.att.split("|"),v=visList().find(x=>x.id===id);if(!v)return;const cur=v.att?.[ds]?.s;markAtt(v,ds,cur===s?null:s);persist();const y=window.scrollY;render();window.scrollTo(0,y);return}
 if(r.dataset.attcyc){if(isViewer())return;const[id,ds]=r.dataset.attcyc.split("|"),v=visList().find(x=>x.id===id);if(!v)return;const order=[undefined,"P","A","L","H"],cur=v.att?.[ds]?.s,nx=order[(order.indexOf(cur)+1)%order.length];markAtt(v,ds,nx||null);persist();const y=window.scrollY;render();window.scrollTo(0,y);return}
 const act=r.dataset.act;if(act==="rot-add")return sheetRot();if(act==="rot-off")return sheetRotOff();
 const v=visList().find(x=>x.id===r.dataset.id);if(!v)return;
 if(act==="rot-edit")return sheetRot(v);if(act==="rot-cert")return sheetRotCert(v);
 if(act==="rot-pin"){v.pin=rotPin();log(`New attendance PIN for ${visName(v)}`,(v.kind==="obs"?"obs-":"rot-")+v.id);render();return}
 if(act==="rot-del"){if(r.dataset.armed!=="1"){r.dataset.armed="1";r.textContent="Tap again to remove";return}DB.visitors=visList().filter(x=>x!==v);log(`Rotating trainee removed: Dr. ${v.name} (${v.inst})`);toast("Removed");go("rotating")}});
document.addEventListener("input",e=>{if(e.target.id==="rotq"){UI.rotQ=e.target.value;const p=e.target.selectionStart;render();const n=document.getElementById("rotq");n.focus();n.setSelectionRange(p,p)}});
function sheetRotOff(){const D=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],o=rotOff();
 openSheet("Weekly off days",`<p class="subt" style="margin:0">Days not counted as working days for rotating trainees. Public holidays can be marked "H" on each trainee's attendance calendar.</p>${D.map((d,i)=>`<label class="check"><input type="checkbox" name="off${i}" ${o.includes(i)?"checked":""}> ${d}</label>`).join("")}`,()=>{
  DB.settings.rotOff=D.map((d,i)=>document.querySelector(`#sheetform [name="off${i}"]`).checked?i:null).filter(x=>x!=null);log("Weekly off days for rotating trainees changed");toast("Saved");return true})}
VIEW_ACTS.add("rot-cert");
EXPORTS.rotating=()=>({file:"Rotating trainees",sheets:[sheetFrom("Rotating trainees",rotOnly().map(v=>{const s=rotStats(v);return{"Name":"Dr. "+v.name,"Parent institute":v.inst,"Programme":v.program,"Specialty":v.spec,"Year":v.year,"Rotation unit":v.unit,"Supervisor":rotFac(v),"Start":v.start,"End":v.left||v.end,"Status":rotState(v),"Working days":s.work,"Present":s.P,"Leave":s.L,"Absent":s.A,"Attendance %":s.pct??"","Mobile":v.mobile||"","Certificate":v.cert?.no||""}}))]});
function rotDashCard(){const cur=rotOnly().filter(v=>rotState(v)==="Current"),t=iso(TODAY),due=rotOnly().filter(v=>rotState(v)!=="Current"&&rotState(v)!=="Upcoming"&&!v.cert);if(!cur.length&&!due.length&&!rotOnly().some(rotNew))return"";
 return card("Rotating trainees",cur.length,"rotating",olist([...cur.slice(0,4).map(v=>oli("rot-"+v.id,"Dr. "+esc(v.name),esc(v.unit)+" · until "+fd(v.end).slice(0,6),(m=>m?.s==="P"?`<span class="pill p-ric">${m.t||"present"}</span>`:m?.s==="A"?'<span class="pill p-bad">absent</span>':m?.s==="L"?'<span class="pill p-leave">leave</span>':'<span class="pill p-pause">not marked</span>')(v.att?.[t]))),...(visList().some(rotNew)?[oli("rotating",`${visList().filter(rotNew).length} new online registration${visList().filter(rotNew).length>1?"s":""} to check`,"","")]:[]),...(due.length?[oli("rotating",`${due.length} experience certificate${due.length>1?"s":""} to issue`,"","")]:[])],"None at RIC."))}

/* =====================================================================
   V21 · ONLINE REGISTRATION FOR ROTATING TRAINEES (?rot=1)
   Movement order required, PMDC certificate optional
   ===================================================================== */
const rotLink=()=>LIVE?pubBase()+"?rot=1":"https://dme.ric.example/rotation";
let ROTPUB={sups:[]};
async function rotPublicPage(){document.body.classList.add("public");
 try{const{data}=await SYNC.sb.rpc("dme_public_lists");ROTPUB.sups=[...new Set((data&&data.faculty||[]).map(f=>f.n))].sort();ROTPUB.cfg={...FORM_DEF.rot,...((data&&data.forms&&data.forms.rot)||{})}}catch(e){ROTPUB.cfg={...FORM_DEF.rot}}
 rotPubRender()}
function rotPubRender(done){
 if(done)return pubShell(`<div class="panel fbform">${formHead(null,"Registration received","Rotating trainees · Department of Medical Education and Training")}
  <p>Thank you, Dr. ${esc(done.name)}. Your rotation in <b>${esc(done.unit)}</b> from ${fd(done.start)} to ${fd(done.end)} is now recorded with the DME&T office.</p>
  <div class="flag ok" style="display:grid;gap:4px"><span>Your attendance PIN</span><b style="font-size:32px;letter-spacing:.25em;font-family:var(--f-mono)">${esc(done.pin)}</b><span class="subt">Write it down. Mark your attendance every working day on the attendance computer in the Department of Medical Education and Training.</span></div>
  <p class="subt">Bring your original movement order to the DME&T office on your first day.</p></div>`);
 const C=ROTPUB.cfg||FORM_DEF.rot;
 if(!formIsOpen(C))return pubShell(`<div class="panel fbform">${formHead(null,"Rotation registration","Department of Medical Education and Training")}<p>Online registration for rotations is closed at the moment.</p>${C.msg?`<p style="white-space:pre-line">${esc(C.msg)}</p>`:""}${C.contact?`<p class="subt">Contact: ${esc(C.contact)}</p>`:""}</div>`);
 const f=(n,l,o={})=>`<label class="f"><span class="${o.opt?"":"req"}">${l}${o.h?` <span class="h">${o.h}</span>`:o.opt?` <span class="h">optional</span>`:""}</span><input name="${n}" ${o.type?`type="${o.type}"`:""} ${o.ph?`placeholder="${o.ph}"`:""} ${o.list?`list="${o.list}"`:""} ${o.mode?`inputmode="${o.mode}"`:""}></label>`;
 pubShell(`<form class="panel fbform" id="rotform" novalidate>${formHead(null,"Rotation registration","For postgraduate trainees from other institutes joining RIC for a rotation")}${C.msg?`<div class="flag info" style="white-space:pre-line">${esc(C.msg)}</div>`:""}
  <fieldset class="pfsec"><legend>About you</legend>${f("name","Full name",{h:'without "Dr."',ph:"e.g. Ahmed Raza"})}${f("father","Father's name",{opt:1})}
   <div class="grid2">${f("cnic","CNIC",{ph:"37405-1234567-1",mode:"numeric"})}${f("pmdc","PMDC number",{opt:1,ph:"e.g. 93232-P"})}</div>
   <div class="grid2">${f("mobile","Mobile",{ph:"03xx-xxxxxxx",type:"tel",mode:"numeric"})}${f("email","Email",{opt:1,type:"email"})}</div></fieldset>
  <fieldset class="pfsec"><legend>Your training</legend>${f("inst","Parent institute / hospital",{ph:"e.g. Holy Family Hospital, Rawalpindi"})}
   <div class="grid2"><label class="f"><span class="req">Programme</span><select name="program">${opt(["",...ROT_PROGS],"")}</select></label>${f("spec","Your specialty",{ph:"e.g. General Surgery"})}</div>
   ${f("year","Training year",{opt:1,ph:"e.g. 3"})}</fieldset>
  <fieldset class="pfsec"><legend>Rotation at RIC</legend>
   <label class="f"><span class="req">Department / unit</span><select name="unit">${opt(["",...(C.units&&C.units.length?C.units:ROT_UNITS).filter(u=>u!=="Other"),"Other"],"")}</select></label><label class="f" id="rp-uo" hidden><span class="req">Which unit?</span><input name="unitOther"></label>
   <div class="grid2">${f("start","Rotation starts",{type:"date"})}${f("end","Rotation ends",{type:"date"})}</div>
   <div class="chips">${[1,2,3,6].map(m=>`<button type="button" class="chip" data-rplen="${m}">${m} month${m>1?"s":""}</button>`).join("")}</div>
   <label class="f"><span>Supervisor at RIC <span class="h">if you know it</span></span><select name="supName">${opt(["",...ROTPUB.sups],"")}</select></label>
   ${f("letter","Movement order no. / date",{opt:1})}</fieldset>
  <fieldset class="pfsec"><legend>Documents</legend><p class="qd" style="margin:0">Photo or PDF, up to 5 MB each.</p>
   <label class="f"><span class="req">Movement order</span><input type="file" name="movement" accept="image/jpeg,image/png,image/webp,application/pdf"></label>
   <label class="f"><span>PMDC certificate <span class="h">optional</span></span><input type="file" name="pmdcdoc" accept="image/jpeg,image/png,image/webp,application/pdf"></label></fieldset>
  <label class="check2"><input type="checkbox" id="rp-decl"> The information I have given is correct.</label>
  <div class="err" id="rperr" role="alert"></div><button class="btn primary" type="button" data-act="rp-submit" style="justify-self:start">Submit</button>${C.contact?`<p class="subt" style="margin:0">Questions? ${esc(C.contact)}</p>`:""}</form>`)}
document.addEventListener("change",e=>{if(e.target.name==="unit"&&e.target.closest("#rotform"))document.getElementById("rp-uo").hidden=e.target.value!=="Other"});
document.addEventListener("click",async e=>{const lb=e.target.closest("[data-rplen]");if(lb){const fm=document.getElementById("rotform"),s=fm.start.value;if(!s){document.getElementById("rperr").textContent="Choose the start date first.";return}const d=P(s);d.setMonth(d.getMonth()+ +lb.dataset.rplen);d.setDate(d.getDate()-1);fm.end.value=iso(d);return}
 const b=e.target.closest('[data-act="rp-submit"]');if(!b)return;const fm=document.getElementById("rotform"),er=document.getElementById("rperr"),g=n=>(fm[n]?.value||"").trim();
 const bad=m=>{er.textContent=m;return};
 const name=g("name").replace(/^(dr\.?\s+)+/i,"");if(name.length<3)return bad("Enter your full name.");
 const cn=g("cnic").replace(/\D/g,"");if(cn.length!==13)return bad("Enter your 13-digit CNIC.");
 let mob=g("mobile").replace(/\D/g,"");if(mob.startsWith("92"))mob="0"+mob.slice(2);if(!/^03\d{9}$/.test(mob))return bad("Enter your mobile as 03xx-xxxxxxx.");
 if(g("email")&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g("email")))return bad("Check the email address.");
 if(!g("inst"))return bad("Enter your parent institute.");if(!g("program"))return bad("Choose your programme.");if(!g("spec"))return bad("Enter your specialty.");
 const unit=g("unit")==="Other"?g("unitOther"):g("unit");if(!unit)return bad("Choose the department or unit of your rotation.");
 if(!g("start")||!g("end"))return bad("Enter the rotation dates.");if(g("end")<g("start"))return bad("The end date is before the start date.");
 const mv=fm.movement.files[0],pd=fm.pmdcdoc.files[0];if(!mv)return bad("Attach your movement order.");
 for(const x of [mv,pd].filter(Boolean)){if(x.size>5*1024*1024)return bad(`${x.name} is larger than 5 MB.`);if(!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(x.type))return bad(`${x.name}: use a photo (JPG, PNG) or a PDF.`)}
 if(!document.getElementById("rp-decl").checked)return bad("Tick the declaration to submit.");
 er.textContent="";b.disabled=true;b.textContent="Uploading…";const folder=`rotating/${Date.now()}-${Math.random().toString(36).slice(2,8)}`,docs={};
 try{for(const[k,x] of [["movement",mv],["pmdc",pd]]){if(!x)continue;const path=`${folder}/${k}.${(x.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")}`;
   const{error}=await SYNC.sb.storage.from("dme-uploads").upload(path,x,{contentType:x.type||undefined});if(error)throw new Error("upload");docs[k]=path}
  b.textContent="Sending…";const p={name,father:g("father"),cnic:cn,pmdc:g("pmdc"),mobile:mob.slice(0,4)+"-"+mob.slice(4),email:g("email"),inst:g("inst"),program:g("program"),spec:g("spec"),year:g("year"),unit,start:g("start"),end:g("end"),supName:g("supName"),letter:g("letter"),docs};
  const{data,error}=await SYNC.sb.rpc("dme_submit_rot",{p});if(error||!data)throw new Error("send");
  if(data.error){b.disabled=false;b.textContent="Submit";return bad(data.error==="duplicate"?"You are already registered for a rotation at RIC on these dates. Contact the DME&T office.":data.error==="closed"?"Online registration has just closed. Contact the DME&T office.":"Some details are missing or not valid. Check the form.")}
  rotPubRender({...p,pin:data.pin});window.scrollTo(0,0)}
 catch(x){b.disabled=false;b.textContent="Submit";bad(x.message==="upload"?"A document could not be uploaded. Check the connection and try again.":"Could not send. Check the connection and try again.")}});
/* staff side: link, new-registration badge, documents */
const rotNew=v=>v.src==="form"&&!v.checked;
function rotLinkPanel(){if(isViewer())return"";const n=rotOnly().filter(rotNew).length;
 return`<div class="panel" style="display:grid;gap:8px"><div class="toolbar"><span class="subt">Registration link for rotating trainees</span><input id="rotlink" readonly value="${esc(rotLink())}" style="flex:1;min-width:220px;font-family:var(--f-mono);font-size:13px"><button class="btn small" data-act="rot-copylink">Copy link</button>${waNum?`<a class="btn small" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent("Rotation registration, Rawalpindi Institute of Cardiology (Department of Medical Education and Training). Please register before your first day and upload your movement order:\n"+rotLink())}">Share on WhatsApp</a>`:""}</div>
  ${n?`<div class="flag info">${n} new online registration${n>1?"s":""}: check the movement order, then press <b>Documents checked</b> on the profile.</div>`:""}</div>`}
function rotDocsHtml(v){const D=[["movement","Movement order"],["pmdc","PMDC certificate"]];if(!v.docs&&v.src!=="form")return"";
 return`<div class="panel"><h3>Documents</h3><div class="docs">${D.map(([k,l])=>{const pth=v.docs&&v.docs[k];return`<div class="doc"><b>${l}</b>${pth?`<button class="btn link" data-act="doc-open" data-path="${esc(pth)}">Open</button>`:k==="pmdc"?"Not uploaded (optional)":"Not uploaded"}</div>`}).join("")}</div>
  ${rotNew(v)&&!isViewer()?`<div style="margin-top:10px"><button class="btn primary small" data-act="rot-checked" data-id="${v.id}">Documents checked</button></div>`:v.checked?`<p class="subt" style="margin:8px 0 0">Checked${v.checkedBy?" by "+esc(v.checkedBy):""}.</p>`:""}</div>`}
document.addEventListener("click",e=>{const a=e.target.closest('[data-act="rot-copylink"],[data-act="rot-checked"]');if(!a)return;
 if(a.dataset.act==="rot-copylink")return copyText(document.getElementById("rotlink").value,a);
 const v=visList().find(x=>x.id===a.dataset.id);if(!v)return;v.checked=true;v.checkedBy=ME;log(`Documents checked for rotating trainee Dr. ${v.name}`,"rot-"+v.id);toast("Marked as checked");render()});
