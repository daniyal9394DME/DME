/* =====================================================================
   WORKSHOPS TAB (v2: reschedule, feedback + QR, detailed report)
   ===================================================================== */
UI.wsf="all";UI.resched=false;UI.pend={};
const EXP_CATS=["Refreshments","Printing & stationery","Certificates","Consumables","Equipment hire","Guest honoraria","Publicity","Venue & AV","Other"];
const FB_ITEMS=[["obj","The learning objectives were clear"],["rel","The content was relevant to my practice"],["hands","Hands-on and practical sessions were useful"],["fac","Facilitators were knowledgeable and engaging"],["time","Time given to each session was adequate"],["venue","Venue and arrangements were satisfactory"],["overall","Overall rating of the workshop"]];
const FB_ROLES=["PGT","Medical officer","Consultant","Nurse","Allied health","Medical student","Other"];
const SELF="Dr. Daniyal Ahmad Kamal";
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const blankWs=o=>({fbq:defFbQ(),pfq:defPfQ(),rgq:defRgQ(),regs:[],regOpen:false,payMode:"proof",holdHours:48,payInfo:"",regDesc:"",proposal:null,feeCollected:null,returned:null,date:null,venue:"",format:"",director:"",stage:0,seats:null,fee:null,reg:{registered:0,paid:0,attended:0},incomes:[],expenses:[],feedback:null,certs:0,check:{},notes:"",log:[],fbResp:[],fbOpen:false,...o});
function seedWorkshops(){
 const A="Dr. Muhammad Azam";
 const plan=[["2026-11","Basics of Cardiopulmonary Bypass","Cardiac Surgery",A],["2026-12","Transthoracic Echocardiography (TTE)","General Cardiology",""],["2027-01","Airway Management","Anaesthesiology",""],
  ["2027-02","Paediatric Echocardiography","Paediatric Cardiology",""],["2027-03","Conduits in CABG","Cardiac Surgery",A],["2027-04","Infection Prevention & Control","Infection Prevention & Control",""],
  ["2027-05","Invasive Lines & Monitoring","Anaesthesiology",""],["2027-06","Cardiology TOACS","General Cardiology",""],["2027-07","Anastomosis","Cardiac Surgery",A],
  ["2027-08","Basics of Cardiac Anaesthesia","Cardiothoracic Anaesthesia",""],["2027-09","Transoesophageal Echocardiography (TEE)","General Cardiology",""],["2027-10","Intra-aortic Balloon Pump (IABP)","Cardiac Surgery",A],
  ["2027-11","Anaesthesia TOACS","Anaesthesiology",""],["2027-12","Interventional Cardiology TOACS","Interventional Cardiology",""],["2028-01","Inotropes & Vasopressors","Critical Care",""]];
 const ws=plan.map(([m,t,d,f],i)=>blankWs({id:"W"+String(i+1).padStart(2,"0"),title:t,dept:d,focal:f,director:f,month:m,placeholder:true}));
 ["2026-12","2027-02","2027-04","2027-06","2027-08","2027-10"].forEach((m,i)=>ws.push(blankWs({id:"WB"+(i+1),title:"Research Bootcamp",dept:"Research Cell",focal:"",month:m,notes:"Every two months from Oct 2026",series:"Research Bootcamp",placeholder:true})));
 ws.push(seedExampleWs());
 return ws}
function seedExampleWs(){return blankWs({id:"WX1",title:"Basics of ECG Interpretation",dept:"General Cardiology",focal:"Example focal person",director:"Example course director",month:"2026-09",date:"2026-09-19",venue:"Auditorium",format:"Lectures + hands-on",stage:6,seats:40,fee:2000,example:true,
  reg:{registered:40,paid:32,attended:38},incomes:[{id:"I1",source:"Sponsorship",note:"Refreshments sponsor",amount:10000}],
  expenses:[{id:"E1",cat:"Refreshments",item:"Tea and lunch, 45 people",amount:18000},{id:"E2",cat:"Printing & stationery",item:"Handouts and folders",amount:4500},{id:"E3",cat:"Certificates",item:"Certificate printing",amount:2000},{id:"E4",cat:"Consumables",item:"ECG paper and electrodes",amount:12000}],
  certs:38,check:{cme:true,pub:true,regpage:true,fb:true},proposal:exampleProposal(),fbResp:exampleResponses(31),fbOpen:false,
  log:[{at:"2026-07-10T09:00:00Z",by:SELF,what:"Proposal link sent"},{at:"2026-07-21T09:00:00Z",by:"Focal person",what:"Proposal F-06 submitted"},{at:"2026-07-24T09:00:00Z",by:SELF,what:"Approved · 40 seats, PKR 2,000"},{at:"2026-09-19T15:00:00Z",by:SELF,what:"Marked conducted · 38 attended"},{at:"2026-09-25T10:00:00Z",by:SELF,what:"38 certificates issued; workshop closed"}]})}
const FIXTURES=()=>{const out=[];for(let y=TODAY.getFullYear()-1;y<=TODAY.getFullYear()+2;y++){
 out.push({month:`${y}-02`,t:"PGT orientation (first week)"},{month:`${y}-08`,t:"PGT orientation (first week)"},{month:`${y}-06`,t:"Internal PGT exam (Jun/Jul)"},{month:`${y}-11`,t:"Internal PGT exam (Nov/Dec)"})}return out};
const wsMonthStart=w=>P(w.month+"-01");
const mLabel=m=>P(m+"-01").toLocaleDateString("en-GB",{month:"short",year:"numeric"});
const mAdd=(m,n)=>{const d=P(m+"-01");d.setMonth(d.getMonth()+n);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`};
function fin(w){const R=regsOf(w),fees=w.feeCollected!=null?+w.feeCollected:R.length?R.filter(r=>r.paid&&r.status!=="Cancelled").reduce((s,r)=>s+(+(r.amount??w.fee)||0),0):(+w.fee||0)*(+w.reg.paid||0),other=(w.incomes||[]).reduce((s,x)=>s+(+x.amount||0),0),totalIn=fees+other,totalOut=w.expenses.reduce((s,e)=>s+(+e.amount||0),0),net=totalIn-totalOut;
 const sh=DB.settings.director_share??60,dir=net>0?Math.round(net*sh/100):0;
 const byCat={};w.expenses.forEach(e=>{(byCat[e.cat||"Other"]=byCat[e.cat||"Other"]||[]).push(e)});
 return{fees,other,totalIn,totalOut,net,share:sh,dir,dme:net>0?net-dir:0,byCat}}
const wsIncome=w=>fin(w).totalIn,wsExp=w=>fin(w).totalOut;
function wsFlags(w){const f=[...(w.stage>=3&&w.stage<6?regFlags(w):[])];const to=days(wsMonthStart(w),TODAY);const lead=(DB.settings.proposal_weeks||8)*7;
 const end=wsMonthStart(w);end.setMonth(end.getMonth()+1);
 if(w.stage<2&&to<=lead&&end>TODAY)f.push(to>0?`Proposal not received; workshop month starts in ${to} day${to===1?"":"s"}`:"Proposal not received; workshop month has started");
 if(!w.focal&&w.stage<5&&to<=90&&end>TODAY)f.push("No focal person assigned");
 if(w.stage<5&&end<=TODAY)f.push("Month has passed. Mark as conducted or reschedule");
 if(w.stage===5&&w.certs<w.reg.attended)f.push(`${w.reg.attended-w.certs} certificates not issued`);
 if(w.stage===5&&!(w.fbResp||[]).length)f.push("No feedback responses yet");
 if(w.stage===5)f.push("Report not finalised");
 return f}
function wlog(w,what){w.log.push({at:new Date().toISOString(),by:ME,what});log(`${w.title} (${mLabel(w.month)}): ${what}`,"ws-"+w.id)}
const segs=s=>`<span class="segs" aria-label="Stage ${s+1} of 7">${STAGES.map((_,i)=>`<i class="${i<s?"on":i===s?"now":""}"></i>`).join("")}</span>`;
const fbLink=w=>pubLink("fb",w);
function qrSvg(text,cell){if(typeof qrcode!=="function")return`<div class="qrmiss">QR code needs an internet connection to load. The link below works the same.</div>`;
 const q=qrcode(0,"M");q.addData(text);q.make();return q.createSvgTag({cellSize:cell||5,margin:2,scalable:true})}

/* ---- clash check for rescheduling ---- */
function clashes(list){const out={};const by=(id,m)=>{(out[id]=out[id]||[]).push(m)};
 list.forEach(a=>list.forEach(b=>{if(a===b||a.dept!==b.dept||a.series)return;
  if(a.month===b.month)by(a.id,`${b.title} is also in ${mLabel(b.month)}`);
  else if(mAdd(a.month,1)===b.month||mAdd(a.month,-1)===b.month)by(a.id,`${a.dept} also runs ${b.title} in ${mLabel(b.month)}`)}));
 list.forEach(a=>list.forEach(b=>{if(a!==b&&a.date&&a.date===b.date)by(a.id,`Same date as ${b.title}`)}));
 return out}

function vWorkshops(){
 const W=DB.workshops.slice().sort((a,b)=>a.month<b.month?-1:a.month>b.month?1:a.title.localeCompare(b.title));
 if(UI.resched)return vResched(W);
 const attn=W.filter(w=>wsFlags(w).length);
 const match=w=>UI.wsf==="all"||(UI.wsf==="attn"?wsFlags(w).length>0:UI.wsf==="upcoming"?w.stage<5:UI.wsf==="done"?w.stage>=5:String(w.stage)===UI.wsf);
 const rows=W.filter(match);LAST.workshops=rows;
 const closed=W.filter(w=>w.stage>=5),F=closed.map(fin),net=F.reduce((s,f)=>s+f.net,0),fund=F.reduce((s,f)=>s+f.dme,0),att=closed.reduce((s,w)=>s+(+w.reg.attended||0),0);
 const months=[];for(let i=-1;i<14;i++)months.push(mAdd(`${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,"0")}`,i));
 const nowM=months[1],fx=FIXTURES(),cl=clashes(W.filter(w=>w.stage<6));
 return`<div class="head"><div><h2>Workshops</h2><p>DME&T Annual Academic Calendar · proposals, approval, registration, feedback, finance, certificates</p></div>
  <div class="actions">${xbtn("workshops")}<button class="btn" data-act="ws-resched">Reschedule</button><button class="btn primary" data-act="ws-add">Add workshop</button></div></div>
 ${calPanel()}${W.some(w=>w.placeholder)&&!calPanel()?`<div class="flag info">Workshop months are a draft spread. Use <b>Reschedule</b> to set the real months for all workshops in one go.</div>`:""}
 <div class="kpis">
  <button class="kpi" data-wsf="upcoming"><span class="n">${W.filter(w=>w.stage<5).length}</span><span class="l">Upcoming</span></button>
  <button class="kpi" data-wsf="1"><span class="n">${W.filter(w=>w.stage===1).length}</span><span class="l">Proposals awaited</span></button>
  <button class="kpi" data-wsf="2"><span class="n">${W.filter(w=>w.stage===2).length}</span><span class="l">Proposals to review</span></button>
  <button class="kpi ${attn.length?"attn":""}" data-wsf="attn"><span class="n">${attn.length}</span><span class="l">Need attention</span></button>
  <button class="kpi" data-wsf="done"><span class="n">${att}</span><span class="l">Participants trained in ${closed.length} workshop${closed.length===1?"":"s"}</span></button>
  <button class="kpi" data-wsf="done"><span class="n money">${money(fund)}</span><span class="l">To DME&T fund · net ${money(net)}</span></button>
 </div>
 <div class="panel" style="display:grid;gap:10px"><div class="head"><h3 style="margin:0">Calendar</h3>${Object.keys(cl).length?`<span class="pill p-pause">${Object.keys(cl).length} scheduling clashes · see Reschedule</span>`:""}</div>
  <div class="cal">${months.map(m=>{const ws=W.filter(w=>w.month===m),f=fx.filter(x=>x.month===m);return`<div class="month ${m===nowM?"now":""}"><h4><span>${mLabel(m)}</span>${m===nowM?"<span>This month</span>":""}</h4>
   ${ws.map(w=>`<a class="ev" href="#ws-${w.id}"><span class="pill ${STAGE_PILL[w.stage]}" style="padding:0 6px;font-size:11px">${w.stage+1}/7</span> ${esc(w.title)}${wsFlags(w).length||cl[w.id]?' <b class="d-red" title="Needs attention">!</b>':""}</a>`).join("")}
   ${f.map(x=>`<span class="fixture">${esc(x.t)}</span>`).join("")}${!ws.length&&!f.length?`<span class="fixture">Nothing scheduled</span>`:""}</div>`}).join("")}</div>
  <div class="legend">${STAGES.map((s,i)=>`<span><span class="pill ${STAGE_PILL[i]}" style="padding:0 6px;font-size:11px">${i+1}</span> ${s}</span>`).join("")}<span>Grey text: DME&T fixtures</span></div>
 </div>
 <div class="panel"><div class="chips">${[["all","All"],["attn","Needs attention"],...STAGES.map((s,i)=>[String(i),s])].map(([k,l])=>`<button class="chip" data-wsf="${k}" aria-pressed="${UI.wsf===k}">${l}<span class="c">${W.filter(w=>k==="all"||(k==="attn"?wsFlags(w).length:String(w.stage)===k)).length}</span></button>`).join("")}</div></div>
 <div class="panel flush"><div class="tblwrap"><table><thead><tr><th>Month</th><th>Workshop</th><th>Department</th><th>Focal person</th><th>Progress</th><th>Next step</th><th class="num">Registered</th><th class="num">Feedback</th></tr></thead><tbody>
  ${rows.map(w=>{const s=fbSummary(w);return`<tr class="click" data-href="ws-${w.id}"><td>${mLabel(w.month)}${w.date?`<div class="code">${fd(w.date)}</div>`:""}</td><td>${esc(w.title)}${w.example?' <span class="pill p-done">Example</span>':""}${wsFlags(w).length?`<div class="d-red" style="white-space:normal;font-size:13px">${esc(wsFlags(w)[0])}</div>`:""}</td><td>${esc(w.dept)}</td><td>${esc(w.focal)||'<span class="pill p-bad">Not assigned</span>'}</td>
   <td>${segs(w.stage)}<div class="code">${STAGES[w.stage]}</div></td><td>${NEXT[w.stage]||"—"}</td><td class="num">${w.stage>=4?`${w.reg.registered}${w.seats?" / "+w.seats:""}`:"—"}</td><td class="num">${s?s.overall.toFixed(1)+" / 5":"—"}</td></tr>`}).join("")||`<tr><td colspan="8" class="empty">No workshops match this filter.</td></tr>`}
 </tbody></table></div></div>`}

function vResched(W){
 const cand=W.map(w=>({...w,month:UI.pend[w.id]?.month??w.month,date:UI.pend[w.id]?.date!==undefined?UI.pend[w.id].date:w.date}));
 const cl=clashes(cand.filter(w=>w.stage<6)),n=Object.keys(UI.pend).filter(id=>{const w=W.find(x=>x.id===id),p=UI.pend[id];return p.month!==w.month||(p.date??null)!==(w.date??null)}).length;
 return`<div class="head"><div><h2>Reschedule workshops</h2><p>Change months or dates for any number of workshops, then save once. Closed workshops cannot be moved.</p></div>
  <div class="actions"><button class="btn" data-act="ws-rcancel">Cancel</button><button class="btn primary" data-act="ws-rsave" ${n?"":"disabled"}>Save ${n||""} change${n===1?"":"s"}</button></div></div>
 <div class="flag info">Clash check: the same department in the same or the next month, or two workshops on one date. Research Bootcamp is a series and is not checked against itself.</div>
 <div class="panel flush"><div class="tblwrap"><table><thead><tr><th>Workshop</th><th>Department</th><th>Stage</th><th>Month</th><th>Date <span style="font-weight:400">(optional)</span></th><th>Check</th></tr></thead><tbody>
 ${cand.map(w=>{const o=W.find(x=>x.id===w.id),ch=w.month!==o.month||(w.date??null)!==(o.date??null),lock=w.stage>=6;return`<tr class="${ch?"changed":""}"><td>${esc(w.title)}${w.example?' <span class="pill p-done">Example</span>':""}${ch?`<div class="code">was ${mLabel(o.month)}${o.date?", "+fd(o.date):""}</div>`:""}</td><td>${esc(w.dept)}</td><td><span class="pill ${STAGE_PILL[w.stage]}">${STAGES[w.stage]}</span></td>
  <td><input type="month" data-rm="${w.id}" value="${w.month}" ${lock?"disabled":""} aria-label="Month for ${esc(w.title)}"></td>
  <td><input type="date" data-rd="${w.id}" value="${w.date||""}" min="${w.month}-01" max="${w.month}-31" ${lock?"disabled":""} aria-label="Date for ${esc(w.title)}"></td>
  <td class="wrapcell">${cl[w.id]?cl[w.id].map(m=>`<span class="d-red" style="font-size:13px;display:block">${esc(m)}</span>`).join(""):lock?"":'<span class="pill p-ric">OK</span>'}</td></tr>`}).join("")}
 </tbody></table></div></div>`}

function vWs(){
 const w=DB.workshops.find(x=>x.id===route.id);if(!w)return`<div class="panel">Workshop not found. <a href="#workshops">Back</a></div>`;
 const fl=wsFlags(w),F=fin(w),S=fbSummary(w);
 const link=pubLink("prop",w);
 let next="";
 if(w.stage===0)next=`<p style="margin:0">Send this link to ${w.focal?esc(w.focal):"the departmental focal person"}. It opens the proposal e-form (F-06) with title, department and month filled in.</p>
  <div class="toolbar"><input id="copysrc" readonly value="${link}" class="linkbox"><button class="btn small" data-act="ws-copy">Copy link</button></div>
  <div class="actions"><a class="btn" href="#pfedit-${w.id}">Edit proposal form</a><a class="btn" href="#pfill-${w.id}">Preview</a><button class="btn primary" data-act="ws-sent">Mark link as sent</button><button class="btn" data-act="t-new" data-link="ws-${w.id}" data-title="Follow up proposal: ${esc(w.title)}">Make a task</button></div>`;
 if(w.stage===1)next=`<p style="margin:0">Waiting for the focal person to submit the proposal. When they submit, it appears here and the workshop moves to review on its own.</p>${w.returned?`<div class="flag">Returned with comments: ${esc(w.returned)}</div>`:""}
  <div class="toolbar"><input id="copysrc" readonly value="${link}" class="linkbox"><button class="btn small" data-act="ws-copy">Copy link again</button></div>
  <div class="actions"><a class="btn primary" href="#pfill-${w.id}">Fill as focal person (prototype)</a><a class="btn" href="#pfedit-${w.id}">Edit proposal form</a></div>`;
 if(w.stage===2)next=`<p style="margin:0">${esc(w.proposal?.submitted?.by||"The focal person")} submitted the proposal${w.proposal?" on "+fdt(w.proposal.submitted.at):""}. Review it, edit anything the DME&T office wants changed, then approve the affirmed version or return it.</p>
  <div class="actions"><a class="btn primary" href="#prop-${w.id}">Review and affirm proposal</a><button class="btn danger" data-act="ws-return">Return with comments</button></div>`;
 if(w.stage===3)next=`<p style="margin:0">Before registration opens:</p>
  ${[["cme","CME / accreditation applied"],["pub","Publicity sent to universities and hospitals"],["regpage","Registration page ready"],["fb","Feedback form checked"]].map(([k,l])=>`<label class="check2"><input type="checkbox" data-wscheck="${k}" ${w.check[k]?"checked":""}> ${l}</label>`).join("")}
  <div class="actions"><button class="btn primary" data-act="ws-open">Open registration</button></div>`;
 if(w.stage===4)next=`<p style="margin:0">${regsOf(w).length?`${regCount(w,"Confirmed")} confirmed of ${w.seats} seats, ${regCount(w,"Waiting list")} on the waiting list. Manage people in the registration panel below.`:`${w.reg.registered} registered${w.seats?" of "+w.seats+" seats":""}, ${w.reg.paid} paid.`}</p>
  <div class="actions"><button class="btn" data-act="ws-reg">Update registrations</button><button class="btn primary" data-act="ws-held">Mark as conducted</button></div>`;
 if(w.stage===5)next=`<p style="margin:0">${w.certs} of ${w.reg.attended} certificates issued · ${(w.fbResp||[]).length} feedback responses.</p>
  <div class="actions"><a class="btn ${w.certs<w.reg.attended?"primary":""}" href="#cert-${w.id}">${w.certs<w.reg.attended?`Make certificates (${w.reg.attended-w.certs} to issue)`:"Certificates"}</a><button class="btn ${w.certs>=w.reg.attended?"primary":""}" data-act="ws-close">Finalise report and close</button></div>`;
 return`<div><a href="#workshops" class="btn link" style="padding-left:0">← All workshops</a></div>
 <div class="panel" style="display:grid;gap:14px"><div class="prof"><div class="who"><div class="code">${mLabel(w.month)}${w.date?" · "+fd(w.date):""}</div><h2>${esc(w.title)} ${w.example?'<span class="pill p-done" style="vertical-align:5px">Example</span>':""}</h2>
  <div class="meta"><span>${esc(w.dept)}</span><span>Focal person: ${nameLink(w.focal)||"not assigned"}</span><span>Course director: ${nameLink(w.director||w.focal)||"not set"}</span>${w.series?`<span>Series: ${esc(w.series)}</span>`:""}</div></div>
  <div class="actions">${w.proposal?`<a class="btn" href="#prop-${w.id}">Proposal</a>`:""}${progData(w)?`<button class="btn" data-act="ws-prog" data-id="${w.id}">Print programme</button>`:""}${w.stage>=4?`<a class="btn" href="#cert-${w.id}">Certificates</a>`:""}<button class="btn" data-act="ws-edit">Edit details</button>${w.stage>0&&w.stage<6?`<button class="btn" data-act="ws-back">Move back a step</button>`:""}<button class="btn" data-act="t-new" data-link="ws-${w.id}" data-title="${esc(w.title)}: ">Add task</button><button class="btn danger" data-act="ws-del">Delete</button></div></div>
  <div class="stepper">${STAGES.map((s,i)=>`<div class="${i<w.stage?"done":i===w.stage?"now":""}">${s}</div>`).join("")}</div></div>
 ${fl.length?`<div class="flag">${fl.map(esc).join("<br>")}</div>`:""}
 ${linkedTasks("ws-"+w.id)}
 <div class="cols side">
  <div style="display:grid;gap:18px;align-content:start;min-width:0">
   ${w.stage<6?`<div class="panel" style="display:grid;gap:12px"><h3 style="margin:0">Next step · ${NEXT[w.stage]}</h3>${next}</div>`:""}
   ${wsTimeline(w)}${regPanel(w)}
   ${w.stage>=5?reportDoc(w,F,S):""}
   ${S?fbPanel(w,S):""}
   <div class="panel flush"><h3>History</h3><div class="tblwrap"><table><tbody>${w.log.slice().reverse().map(l=>`<tr><td class="code">${fdt(l.at)}</td><td class="wrapcell">${esc(l.what)}</td><td>${esc(l.by)}</td></tr>`).join("")||`<tr><td class="empty">No activity yet.</td></tr>`}</tbody></table></div></div>
  </div>
  <div style="display:grid;gap:18px;align-content:start;min-width:0">
   <div class="panel" style="display:grid;gap:10px"><h3 style="margin:0">Feedback form</h3>
    <div class="qrbox">${qrSvg(fbLink(w),4)}</div>
    <div class="toolbar"><input id="fbsrc" readonly value="${fbLink(w)}" class="linkbox"><button class="btn small" data-act="ws-copyfb">Copy</button></div>
    <div class="actions"><button class="btn ${w.fbOpen?"":"primary"}" data-act="ws-fbtoggle">${w.fbOpen?"Close form":"Open form for responses"}</button><button class="btn" data-act="ws-qrbig">Show QR full screen</button><a class="btn" href="#fbedit-${w.id}">Edit form</a><a class="btn" href="#fb-${w.id}">Fill as participant</a></div>
    <p class="code" style="margin:0">${w.fbOpen?'<span class="pill p-ric">Accepting responses</span>':'<span class="pill p-done">Closed</span>'} · ${(w.fbResp||[]).length} responses${w.reg.attended?` from ${w.reg.attended} attendees`:""} · ${w.fbq.length} questions. Anonymous; responses go straight into this workshop.</p></div>
   <div class="panel"><h3>Details</h3><dl class="kv"><dt>Date</dt><dd>${fd(w.date)}</dd><dt>Venue</dt><dd>${esc(w.venue)||"—"}</dd><dt>Format</dt><dd>${esc(w.format)||"—"}</dd><dt>Course director</dt><dd>${esc(w.director||w.focal)||"—"}</dd><dt>Seats</dt><dd>${w.seats??"—"}</dd><dt>Fee</dt><dd>${w.fee==null?"—":w.fee?money(w.fee):"Free"}</dd>${w.notes?`<dt>Notes</dt><dd>${esc(w.notes)}</dd>`:""}</dl></div>
   <div class="panel"><h3>Participants</h3>${w.stage>=4?`<dl class="kv"><dt>Registered</dt><dd>${w.reg.registered}${w.seats?" / "+w.seats:""}</dd><dt>Paid</dt><dd>${w.reg.paid}</dd><dt>Attended</dt><dd>${w.stage>=5?w.reg.attended:"—"}</dd><dt>Certificates</dt><dd>${w.certs}</dd></dl>`:`<p class="code" style="margin:0">Opens at stage 5, Registration open.</p>`}</div>
   <div class="panel flush"><h3>Income and expenses</h3><div class="tblwrap"><table><tbody>
    <tr class="sub"><td colspan="3">Income</td></tr>
    <tr><td>Registration fees <span class="subt">${w.feeCollected!=null?"amount collected":w.fee?`${w.reg.paid} × ${money(w.fee)}`:"free"}</span></td><td class="num">${money(F.fees)}</td><td><button class="btn link" data-act="ws-fee">Edit</button></td></tr>
    ${(w.incomes||[]).map(x=>`<tr><td>${esc(x.source)}${x.note?` <span class="code">${esc(x.note)}</span>`:""}</td><td class="num">${money(x.amount)}</td><td><button class="btn link" data-act="ws-rminc" data-id="${x.id}">Remove</button></td></tr>`).join("")}
    <tr class="tot"><td>Total income</td><td class="num">${money(F.totalIn)}</td><td></td></tr>
    <tr class="sub"><td colspan="3">Expenses</td></tr>
    ${w.expenses.map(e=>`<tr><td>${esc(e.cat||"Other")}${e.item?` <span class="code">${esc(e.item)}</span>`:""}</td><td class="num">− ${money(e.amount)}</td><td><button class="btn link" data-act="ws-rmexp" data-id="${e.id}">Remove</button></td></tr>`).join("")||`<tr><td colspan="3" class="code">No expenses recorded</td></tr>`}
    <tr class="tot"><td>Total expenses</td><td class="num">− ${money(F.totalOut)}</td><td></td></tr>
    <tr class="tot"><td>Net income</td><td class="num"><b class="${F.net<0?"d-red":""}">${money(F.net)}</b></td><td></td></tr>
    <tr><td>Course director (${F.share}%)</td><td class="num">${money(F.dir)}</td><td></td></tr>
    <tr><td>DME&T fund (${100-F.share}%)</td><td class="num">${money(F.dme)}</td><td></td></tr></tbody></table></div>
    <div class="actions" style="padding:12px 16px"><button class="btn small" data-act="ws-fee">Registration fees</button><button class="btn small" data-act="ws-exp">Add expense</button><button class="btn small" data-act="ws-inc">Add other income</button></div>
    ${F.net<0?`<p class="code" style="padding:0 16px 12px;margin:0">Net is negative, so there is nothing to distribute.</p>`:""}</div>
  </div>
 </div>`}

function bars(dist){const t=dist.reduce((a,b)=>a+b,0)||1;const C=["var(--bad)","#C8794B","var(--gold)","#7FA37A","var(--ok)"];return`<span class="dist" title="${dist.map((n,i)=>`${i+1}: ${n}`).join(", ")}">${dist.map((n,i)=>n?`<i style="width:${n/t*100}%;background:${C[i]}"></i>`:"").join("")}</span>`}
function qrOverlay(w){document.getElementById("overlay").innerHTML=`<div class="scrim" data-act="close"></div><div class="qrfull" role="dialog" aria-modal="true" aria-label="Feedback QR code"><div class="code">Scan to give feedback</div><h2>${esc(w.title)}</h2><div class="qrbig">${qrSvg(fbLink(w),10)}</div><div class="code" style="font-size:14px">${fbLink(w)}</div><button class="btn" data-act="close">Close</button></div>`}

function sheetWs(w){const n=!w;w=w||{title:"",dept:"Cardiac Surgery",focal:"",director:"",month:mAdd(`${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,"0")}`,1),date:"",venue:"",format:"",notes:""};
 openSheet(n?"Add workshop":"Edit workshop",`
 <label class="f">Title<input name="title" value="${esc(w.title)}"></label>
 <label class="f">Lead department<select name="dept">${opt(wsDepts(),w.dept)}</select></label>
 <datalist id="ws-fac">${DB.faculty.map(f=>`<option value="${esc(facName(f))}">`).join("")}</datalist>
 <div class="grid2"><label class="f">Focal person<input name="focal" list="ws-fac" value="${esc(w.focal)}"></label><label class="f">Course director <span class="h">receives the director's share</span><input name="director" list="ws-fac" value="${esc(w.director||"")}" placeholder="Same as focal person"></label></div>
 <div class="grid2"><label class="f">Month<input type="month" name="month" value="${w.month}"></label><label class="f">Date <span class="h">if fixed</span><input type="date" name="date" value="${w.date||""}"></label></div>
 <div class="grid2"><label class="f">Venue<select name="venue">${opt([["","Not set"],...VENUES],w.venue)}</select></label><label class="f">Format<select name="format">${opt([["","Not set"],...FORMATS],w.format)}</select></label></div>
 <label class="f">Notes<textarea name="notes">${esc(w.notes)}</textarea></label>`,()=>{
 if(fv("title").length<3)return fail("Enter the workshop title.");if(!fv("month"))return fail("Choose the month.");const d=fv("date");if(d&&!d.startsWith(fv("month")))return fail("The date is not in the chosen month.");
 const rec={title:fv("title"),dept:fv("dept"),focal:fv("focal"),director:fv("director")||fv("focal"),month:fv("month"),date:d||null,venue:fv("venue"),format:fv("format"),notes:fv("notes")};
 if(n){const nw=blankWs({id:uid("W"),...rec});DB.workshops.push(nw);wlog(nw,"Workshop added to the calendar");go("ws-"+nw.id)}
 else{const ch=rec.month!==w.month?` (moved to ${mLabel(rec.month)})`:"";Object.assign(w,rec);delete w.placeholder;wlog(w,"Details edited"+ch)}toast("Saved");return true})}
function wsAction(a,b){
 if(a==="ws-resched"){UI.resched=true;UI.pend={};render();return}
 if(a==="ws-rcancel"){UI.resched=false;UI.pend={};render();return}
 if(a==="ws-rsave"){let n=0;for(const[id,p] of Object.entries(UI.pend)){const w=DB.workshops.find(x=>x.id===id);const nd=p.date===undefined?w.date:p.date;if(p.month!==w.month||(nd??null)!==(w.date??null)){const from=mLabel(w.month);w.month=p.month;w.date=nd&&nd.startsWith(p.month)?nd:null;delete w.placeholder;wlog(w,`Rescheduled from ${from} to ${mLabel(w.month)}${w.date?" ("+fd(w.date)+")":""}`);n++}}
  UI.resched=false;UI.pend={};persist();toast(`${n} workshop${n===1?"":"s"} rescheduled`);render();return}
 const w=DB.workshops.find(x=>x.id===route.id);if(!w)return;
 const step=(s,what)=>{w.stage=s;wlog(w,what);persist();render()};
 if(a==="ws-copy")return copyText(document.getElementById("copysrc").value,b);
 if(a==="ws-copyfb")return copyText(fbLink(w),b);
 if(a==="ws-copyrep")return copyText(document.getElementById("repsrc").value,b);
 if(a==="ws-fbtoggle"){w.fbOpen=!w.fbOpen;wlog(w,w.fbOpen?"Feedback form opened":"Feedback form closed");persist();render();return}
 if(a==="ws-qrbig")return qrOverlay(w);
 if(a==="ws-fee")return sheetFee(w);
 if(a==="ws-sent")return step(1,"Proposal link sent to "+(w.focal||"focal person"));
 if(a==="ws-recv")return step(2,"Proposal F-06 received");
 if(a==="ws-back"){if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to confirm";return}return step(w.stage-1,`Moved back to "${STAGES[w.stage-1]}"`)}
 if(a==="ws-del"){if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to delete";return}
  DB.workshops=DB.workshops.filter(x=>x!==w);log(`Deleted workshop ${w.title} (${mLabel(w.month)})`);toast("Workshop deleted");go("workshops");return}
 if(a==="ws-edit")return sheetWs(w);
 if(a==="ws-approve")return openSheet("Approve proposal",`
  <label class="f">Workshop date<input type="date" name="date" value="${w.date||w.month+"-15"}"></label>
  <div class="grid2"><label class="f">Venue<select name="venue">${opt(VENUES,w.venue||"Auditorium")}</select></label><label class="f">Seats<input type="number" min="1" name="seats" value="${w.seats||30}"></label></div>
  <label class="f">Registration fee (PKR) <span class="h">0 for free</span><input type="number" min="0" step="100" name="fee" value="${w.fee??0}"></label>
  <label class="f">Course director <span class="h">receives ${DB.settings.director_share??60}% of net income</span><input name="director" list="ws-fac2" value="${esc(w.director||w.focal)}"><datalist id="ws-fac2">${DB.faculty.map(f=>`<option value="${esc(facName(f))}">`).join("")}</datalist></label>
  <div class="flag info">Fees are charged only where the Office of the Executive Director and the Department of Medical Education and Training agree.</div>
  <label class="f">Approval note <span class="h">optional</span><textarea name="note"></textarea></label>`,()=>{
  const d=fv("date");if(!d)return fail("Enter the date.");if(!(+fv("seats")>0))return fail("Enter the number of seats.");
  Object.assign(w,{date:d,month:d.slice(0,7),venue:fv("venue"),seats:+fv("seats"),fee:+fv("fee")||0,director:fv("director")});w.stage=3;wlog(w,`Approved · ${fd(d)}, ${w.seats} seats, ${w.fee?money(w.fee):"free"}${fv("note")?" · "+fv("note"):""}`);toast("Proposal approved");return true},"Approve");
 if(a==="ws-return")return openSheet("Return proposal",`<p style="margin:0">The focal person gets the same link back to make changes.</p><label class="f">Comments<textarea name="c" placeholder="e.g. Add a hands-on station; reduce the estimated cost"></textarea></label>`,()=>{
  if(fv("c").length<5)return fail("Write what needs to change.");w.stage=1;w.returned=fv("c");wlog(w,"Returned with comments: "+fv("c"));if(route.v==="prop")go("ws-"+w.id);toast("Returned to focal person");return true},"Return");
 if(a==="ws-open"){const miss=["cme","pub","regpage","fb"].filter(k=>!w.check[k]);if(miss.length&&b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent=`${miss.length} item${miss.length>1?"s":""} unticked · tap again to open anyway`;return}w.regOpen=true;if(!w.rgq)w.rgq=defRgQ();if(!w.fee)w.payMode="free";return step(4,"Registration opened; registration form open")}
 if(a==="ws-reg")return openSheet("Update registrations",`<div class="grid2"><label class="f">Registered<input type="number" min="0" name="r" value="${w.reg.registered}"></label><label class="f">Paid<input type="number" min="0" name="p" value="${w.reg.paid}"></label></div>`,()=>{
  const r=+fv("r"),p=+fv("p");if(p>r)return fail("Paid cannot be more than registered.");if(w.seats&&r>w.seats)return fail(`Only ${w.seats} seats were approved.`);
  w.reg.registered=r;w.reg.paid=p;wlog(w,`Registrations: ${r} registered, ${p} paid`);toast("Registrations updated");return true});
 if(a==="ws-held")return openSheet("Mark as conducted",`<label class="f">Held on<input type="date" name="d" value="${w.date||iso(TODAY)}"></label>
  <label class="f">Attended <span class="h">${regsOf(w).length?"you can also tick attendance in the registration list":""}</span><input type="number" min="0" name="a" value="${regsOf(w).length?regsOf(w).filter(r=>r.status==="Confirmed").length:w.reg.registered}"></label>
  <div class="flag info">Open the feedback form and show the QR code at the end of the workshop. Responses fill the report on their own.</div>`,()=>{
  if(fv("d")>iso(TODAY))return fail("The date held is in the future. Mark the workshop as conducted on or after the day.");
  const at=+fv("a");w.date=fv("d")||w.date;w.reg.attended=at;w.stage=5;w.fbOpen=true;w.regOpen=false;regsOf(w).filter(r=>r.status==="Confirmed").forEach(r=>{if(r.present==null)r.present=true});wlog(w,`Marked conducted · ${at} attended; feedback form opened`);toast("Marked as conducted");return true});
 if(a==="ws-certs"){go("cert-"+w.id);return}
 if(a==="ws-close"){const miss=[];if(!(w.cert?.issued||[]).some(z=>z.group==="participant")&&w.certs<w.reg.attended)miss.push("certificates not made");if(!w.expenses.length)miss.push("no expenses entered");if(w.fbOpen&&!(w.fbResp||[]).length)miss.push("no feedback received");
  if(miss.length&&b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent=`${miss.join(", ")} · tap again to close anyway`;return}w.fbOpen=false;return step(6,"Report finalised; feedback form closed; workshop closed")}
 if(a==="ws-exp")return openSheet("Add expense",`<label class="f">Category<select name="c">${opt(EXP_CATS)}</select></label><label class="f">Description <span class="h">what it was spent on</span><input name="i" placeholder="e.g. Tea and lunch, 45 people"></label><label class="f">Amount (PKR)<input type="number" min="0" step="50" name="a"></label><label class="f">Receipt <span class="h">optional</span><input type="file" name="rc" accept="image/*,application/pdf"></label>`,()=>{
  if(!(+fv("a")>0))return fail("Enter the amount.");w.expenses.push({id:uid("E"),cat:fv("c"),item:fv("i"),amount:+fv("a")});wlog(w,`Expense: ${fv("c")}${fv("i")?" ("+fv("i")+")":""} ${money(+fv("a"))}`);toast("Expense added");return true});
 if(a==="ws-inc")return openSheet("Add other income",`<label class="f">Source<select name="s">${opt(["Sponsorship","Grant","Donation","Other"])}</select></label><label class="f">Details <span class="h">optional</span><input name="n" placeholder="e.g. company name"></label><label class="f">Amount (PKR)<input type="number" min="0" step="50" name="a"></label>`,()=>{
  if(!(+fv("a")>0))return fail("Enter the amount.");(w.incomes=w.incomes||[]).push({id:uid("I"),source:fv("s"),note:fv("n"),amount:+fv("a")});wlog(w,`Income: ${fv("s")} ${money(+fv("a"))}`);toast("Income added");return true});
 if(a==="ws-rmexp"){const e=w.expenses.find(x=>x.id===b.dataset.id);w.expenses=w.expenses.filter(x=>x!==e);wlog(w,`Expense removed: ${e.cat||""} ${money(e.amount)}`);persist();render()}
 if(a==="ws-rminc"){const e=w.incomes.find(x=>x.id===b.dataset.id);w.incomes=w.incomes.filter(x=>x!==e);wlog(w,`Income removed: ${e.source} ${money(e.amount)}`);persist();render()}}
