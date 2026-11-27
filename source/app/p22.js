
/* =====================================================================
   V19 · ACADEMIC CALENDAR: expert talks, exams, orientations, workshops,
   conferences, meetings and milestones in one place; next three on the
   dashboard
   ===================================================================== */
const EV_TYPES=[["talk","Expert talk","var(--brand)"],["workshop","Workshop","var(--gold)"],["exam","Examination","var(--info)"],["orient","Orientation","var(--ok)"],["conf","Conference / CME","#7A5AA6"],["cpc","Clinicopathological conference (CPC)","#A0522D"],["clinconf","Clinical conference / case presentation","#2E6DA4"],["research","Research activity","#3F7F7A"],["meeting","Meeting","var(--muted)"],["milestone","Milestone / deadline","var(--bad)"],["other","Other event","var(--muted)"]];
const EV_STATUS=["Planned","Confirmed","Held","Postponed","Cancelled"];
const evT=k=>EV_TYPES.find(t=>t[0]===k)||EV_TYPES[EV_TYPES.length-1];
const evList=()=>(DB.events=DB.events||[]);
UI.calV="list";
/* ---------- repeating events: dates are worked out from the first date, so they keep appearing without being entered again ---------- */
const REP_OPTS=[["","Does not repeat"],["w1","Every week"],["w2","Every 2 weeks"],["m1","Every month"],["m2","Every 2 months"],["m3","Every 3 months"],["m4","Every 4 months"],["m5","Every 5 months"],["m6","Every 6 months (biannually)"],["m12","Every year (annually)"]];
const ORDN=["","1st","2nd","3rd","4th","5th"];
const SPEAK_T=["talk","conf","cpc","clinconf"];
function repModes(ds){if(!ds)return[["date","On the same date each time"]];const d=P(ds),day=d.getDate(),wd=d.toLocaleDateString("en-GB",{weekday:"long"}),dim=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
 const o=[["date",`On the ${day}${[,"st","nd","rd"][day%10>3||Math.floor(day/10)===1?0:day%10]||"th"} of the month`]];if(day<=28)o.push(["nth",`On the ${ORDN[Math.ceil(day/7)]} ${wd}`]);if(day+7>dim)o.push(["last",`On the last ${wd}`]);return o}
function repLabel(e){const r=e&&e.rep;if(!r||!r.k)return"";const L=REP_OPTS.find(x=>x[0]===r.k);let t=L?L[1]:"Repeats";
 if(r.k[0]==="m"&&r.mode&&r.mode!=="date"){const m=repModes(e.date).find(x=>x[0]===r.mode);if(m)t+=", "+m[1].replace(/^On the/,"on the")}
 return t+(r.until?` until ${fd(r.until)}`:"")}
const REP_AHEAD=24;/* months of future dates shown for a series with no end date */
function evOccs(e){const r=e.rep;if(!r||!r.k)return[e.date];const hz=new Date(TODAY);hz.setMonth(hz.getMonth()+REP_AHEAD);let lim=iso(hz);if(r.until&&r.until<lim)lim=r.until;
 const f=r.k[0],n=+r.k.slice(1)||1,s=P(e.date),out=[];
 for(let i=0;i<800;i++){let d;
  if(f==="w"){d=new Date(s);d.setDate(s.getDate()+7*n*i)}
  else{const fm=new Date(s.getFullYear(),s.getMonth()+n*i,1),wd=s.getDay();
   if(r.mode==="last"){d=new Date(fm.getFullYear(),fm.getMonth()+1,0);while(d.getDay()!==wd)d.setDate(d.getDate()-1)}
   else if(r.mode==="nth"){d=new Date(fm);while(d.getDay()!==wd)d.setDate(d.getDate()+1);d.setDate(d.getDate()+7*(Math.ceil(s.getDate()/7)-1))}
   else d=new Date(fm.getFullYear(),fm.getMonth(),Math.min(s.getDate(),new Date(fm.getFullYear(),fm.getMonth()+1,0).getDate()))}
  const ds=iso(d);if(ds>lim)break;out.push(ds)}
 return out}
/* every date of an event with its own status (a single date of a series can be cancelled) */
function evExpand(e){if(!e.date)return[];const span=e.end&&e.end>e.date?Math.round((P(e.end)-P(e.date))/864e5):0,rep=!!(e.rep&&e.rep.k);
 return evOccs(e).map(ds=>{const o=rep&&e.occ&&e.occ[ds]||{};let end="";if(span){const x=P(ds);x.setDate(x.getDate()+span);end=iso(x)}return{date:ds,end,status:o.status||e.status||"Planned",occ:rep?ds:""}})}UI.calF=[];UI.calPast=false;UI.calM=null;

/* everything on the calendar: own entries plus workshops, exams and orientations already in the app */
function calItems(){const out=[],mon=d=>d.slice(0,7);
 evList().forEach(e=>{const sub=[e.speaker?(e.speaker+(e.speakerInfo?", "+e.speakerInfo:"")):"",e.sponsor?"Sponsored by "+e.sponsor:""].filter(Boolean).join(" · ");
  evExpand(e).forEach(o=>out.push({key:"e:"+e.id+(o.occ?":"+o.occ:""),date:o.date,end:o.end,month:mon(o.date),type:e.type,title:e.title,time:e.time||"",venue:e.venue||"",sub,status:o.status,ev:e,occ:o.occ}))});
 if(canSee("workshops"))DB.workshops.filter(w=>!w.example).forEach(w=>out.push({key:"w:"+w.id,date:w.date||"",month:w.date?mon(w.date):w.month,type:/research boot ?camp/i.test(w.title)?"research":"workshop",title:w.title,venue:w.venue||"",sub:[w.focal?"Focal: "+w.focal:"",w.dept].filter(Boolean).join(" · "),status:w.stage>=5?"Held":w.stage>=3?"Confirmed":"Planned",href:"ws-"+w.id}));
 const exM=new Set(),orM=new Set();
 if(canSee("exams"))DB.exams.filter(x=>!x.practice).forEach(x=>{exM.add(x.month);exM.add(mAdd(x.month,-1));exM.add(mAdd(x.month,1));out.push({key:"x:"+x.id,date:x.date||"",month:x.date?mon(x.date):x.month,type:"exam",title:`${x.title} · ${x.session}`,venue:x.venue||"",sub:`${exCands(x).length} candidates`,status:x.stage>=3?"Held":"Planned",href:"exam-"+x.id})});
 if(canSee("orientation"))DB.orients.forEach(o=>{const m=o.date?mon(o.date):(o.month||orientMonth(o.cycle));orM.add(m);out.push({key:"o:"+o.id,date:o.date||"",month:m,type:"orient",title:`PGT orientation · ${sessLong(o.cycle)} cycle`,sub:"First week",status:o.stage>=3?"Held":"Planned",href:"orient-"+o.id})});
 FIXTURES().forEach(f=>{const isEx=/exam/i.test(f.t);if(isEx?exM.has(f.month):orM.has(f.month))return;
  out.push({key:"f:"+f.month+f.t,date:"",month:f.month,type:isEx?"exam":"orient",title:isEx?"Six-monthly internal examination ("+(f.month.endsWith("06")?"Jun–Jul":"Nov–Dec")+")":"PGT orientation (first week)",sub:"From the annual calendar",status:"Planned",href:isEx?"exams":"orientation"})});
 return out}
const calKey=i=>(i.date||i.month+"-32");
const calUpcoming=()=>{const t=iso(TODAY),m=t.slice(0,7);return calItems().filter(i=>i.status!=="Cancelled"&&i.status!=="Held"&&(i.date?(i.end||i.date)>=t:i.month>=m)).sort((a,b)=>{const ka=a.date||a.month+"-32",kb=b.date||b.month+"-32";return ka<kb?-1:ka>kb?1:(a.date?0:1)-(b.date?0:1)})};

/* ---------- dashboard strip: the next three ---------- */
function calStrip(){const U=calUpcoming().filter((i,x,A)=>!i.ev||A.findIndex(j=>j.ev===i.ev)===x).slice(0,3);/* a repeating event shows only its next date */if(!U.length)return"";
 return`<div class="upnext">${U.map(i=>{const d=i.date?P(i.date):null,t=evT(i.type);return`<a class="upi" href="#${i.href||"calendar"}" ${i.ev?`data-evopen="${i.ev.id}" data-occ="${i.occ||""}"`:""} style="--k:${t[2]}">
  <span class="ud">${d?`<b>${d.getDate()}</b>${d.toLocaleDateString("en-GB",{month:"short"})}`:`<b style="font-size:13px">${P(i.month+"-01").toLocaleDateString("en-GB",{month:"short"})}</b>${i.month.slice(0,4)}`}</span>
  <span class="ut"><b>${esc(i.title)}</b><small>${t[1]}${d?" · "+d.toLocaleDateString("en-GB",{weekday:"short"}):" · date to be fixed"}${i.time?" · "+esc(i.time):""}${i.venue?" · "+esc(i.venue):""}</small></span></a>`}).join("")}
  <a class="upmore" href="#calendar">Calendar ›</a></div>`}

/* ---------- the calendar page ---------- */
function vCalendar(){const all=calItems(),t=iso(TODAY),m0=t.slice(0,7),F=UI.calF;
 const vis=all.filter(i=>!F.length||F.includes(i.type));const cnt=k=>all.filter(i=>i.type===k).length;
 const chips=`<div class="chips">${`<button class="chip" data-calf="" aria-pressed="${!F.length}">All<span class="c">${all.length}</span></button>`}${EV_TYPES.filter(([k])=>cnt(k)).map(([k,l,c])=>`<button class="chip" data-calf="${k}" aria-pressed="${F.includes(k)}"><i class="cdot" style="background:${c}"></i>${l}<span class="c">${cnt(k)}</span></button>`).join("")}</div>`;
 const can=!isViewer();
 return`<div class="head"><div><h2>Academic calendar</h2><p>Expert talks, workshops, examinations, orientations, conferences, meetings and milestones. Workshops, exams and orientations come from their own pages; add everything else here.</p></div>
  <div class="actions">${xbtn("calendar")}${can?`<button class="btn primary" data-act="ev-add">Add event</button>`:""}</div></div>
 <div class="panel" style="display:grid;gap:10px"><div class="toolbar"><div class="seg2">${[["list","List"],["month","Month"]].map(([k,l])=>`<button class="chip" data-calv="${k}" aria-pressed="${UI.calV===k}">${l}</button>`).join("")}</div>
  ${UI.calV==="list"?`<label class="subt" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="calpast" ${UI.calPast?"checked":""}> Show past events</label>`:""}</div>${chips}</div>
 ${UI.calV==="month"?calMonth(vis,m0):calAgenda(vis,t,m0)}`}
function calRow(i,t){const d=i.date?P(i.date):null,ty=evT(i.type),past=i.date?(i.end||i.date)<t:false;
 return`<li class="calrow ${past?"past":""} ${i.status==="Cancelled"?"cx":""}" style="--k:${ty[2]}"><span class="cd">${d?`<b>${d.getDate()}</b>${d.toLocaleDateString("en-GB",{weekday:"short"})}`:`<b>—</b>date TBC`}</span>
  <span class="cm"><span class="ct"><i class="cdot" style="background:${ty[2]}"></i>${ty[1]}${i.occ?` · <span class="rep" title="${esc(repLabel(i.ev))}">↻ ${esc(REP_OPTS.find(x=>x[0]===i.ev.rep.k)[1].replace(/ \(.*\)/,"").toLowerCase())}</span>`:""}${i.status!=="Planned"?` · <span class="${i.status==="Cancelled"?"d-red":i.status==="Postponed"?"d-amb":""}">${i.status}</span>`:""}</span>
   ${i.ev?`<button class="clink" data-evopen="${i.ev.id}" data-occ="${i.occ||""}">${esc(i.title)}</button>`:`<a class="clink" href="#${i.href}">${esc(i.title)}</a>`}
   <span class="subt">${[i.end&&i.end!==i.date?"until "+fd(i.end):"",i.time,i.venue,i.sub].filter(Boolean).map(esc).join(" · ")}</span></span></li>`}
function calAgenda(vis,t,m0){const L=vis.filter(i=>UI.calPast||(i.date?(i.end||i.date)>=t:i.month>=m0)).sort((a,b)=>calKey(a)<calKey(b)?-1:calKey(a)>calKey(b)?1:0);
 if(!L.length)return`<div class="panel empty">Nothing on the calendar${UI.calPast?"":" from today on"}. Use <b>Add event</b> to enter talks, meetings and milestones.</div>`;
 const months=[...new Set(L.map(i=>i.month))];
 return months.map(m=>`<div class="panel flush calm"><h3>${P(m+"-01").toLocaleDateString("en-GB",{month:"long",year:"numeric"})}${m===m0?' <span class="subt">this month</span>':""}</h3><ul class="callist">${L.filter(i=>i.month===m).map(i=>calRow(i,t)).join("")}</ul></div>`).join("")}
function calMonth(vis,m0){const m=UI.calM||m0,first=P(m+"-01"),start=new Date(first);start.setDate(1-((first.getDay()+6)%7));const t=iso(TODAY);
 const days=[];for(let k=0;k<42;k++){const d=new Date(start);d.setDate(start.getDate()+k);days.push(d)}
 const inDay=ds=>vis.filter(i=>i.date&&ds>=i.date&&ds<=(i.end||i.date));const loose=vis.filter(i=>!i.date&&i.month===m);
 return`<div class="panel" style="display:grid;gap:10px"><div class="toolbar" style="justify-content:space-between"><button class="btn small" data-calm="${mAdd(m,-1)}">‹ ${mLabel(mAdd(m,-1))}</button><h3 style="margin:0">${first.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</h3><button class="btn small" data-calm="${mAdd(m,1)}">${mLabel(mAdd(m,1))} ›</button></div>
  ${loose.length?`<div class="flag info" style="display:grid;gap:4px"><b>This month, date to be fixed</b>${loose.map(i=>`<a href="#${i.href}">${esc(i.title)}</a>`).join("")}</div>`:""}
  <div class="calgrid">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>`<div class="cgh">${d}</div>`).join("")}${days.map(d=>{const ds=iso(d),its=inDay(ds);return`<div class="cgd ${ds.slice(0,7)!==m?"out":""} ${ds===t?"today":""}"><span class="cgn">${d.getDate()}</span>${its.map(i=>`<${i.ev?"button":"a"} class="cge" style="--k:${evT(i.type)[2]}" ${i.ev?`data-evopen="${i.ev.id}" data-occ="${i.occ||""}"`:`href="#${i.href}"`} title="${esc(i.title)}">${esc(i.title)}</${i.ev?"button":"a"}>`).join("")}</div>`}).join("")}</div></div>`}

/* ---------- add / edit an event ---------- */
function sheetEvent(e,occ){const n=!e;e=e||{type:"talk",title:"",date:iso(TODAY),end:"",time:"",venue:"",speaker:"",speakerInfo:"",sponsor:"",dept:"",focal:"",status:"Planned",notes:""};
 const R=e.rep||{},oc=occ&&e.rep&&e.rep.k?occ:"",ocx=oc&&e.occ&&e.occ[oc]&&e.occ[oc].status==="Cancelled";
 openSheet(n?"Add to the calendar":"Edit event",`${oc?`<div class="flag info" style="display:grid;gap:8px"><span><b>${fd(oc)}</b> is one date of an event that ${esc(repLabel(e).replace(/^E/,"e"))}.${ocx?" <b>This date is cancelled.</b>":""} Changes below apply to every date.</span><span><button type="button" class="btn small" data-act="ev-occx" data-id="${e.id}" data-occ="${oc}">${ocx?"Restore this date":"Cancel only this date"}</button></span></div>`:""}
 <label class="f">Type<select name="type" id="ev-type">${opt(EV_TYPES.map(([k,l])=>[k,l]),e.type)}</select></label>
 <label class="f">Title <span class="h">for a talk, the topic</span><input name="title" value="${esc(e.title)}" placeholder="e.g. Heart failure: what's new in 2026"></label>
 <div class="grid2"><label class="f"><span id="ev-dl">${R.k?"First date":"Date"}</span><input type="date" name="date" id="ev-date" value="${e.date||""}"></label><label class="f">Ends <span class="h">if more than one day</span><input type="date" name="end" value="${e.end||""}"></label></div>
 <div class="grid2"><label class="f">Time<input name="time" value="${esc(e.time||"")}" placeholder="e.g. 2:00 pm"></label><label class="f">Venue<input name="venue" list="ev-venues" value="${esc(e.venue||"")}"></label></div>
 <datalist id="ev-venues">${VENUES.filter(v=>v!=="Other").map(v=>`<option value="${esc(v)}">`).join("")}</datalist>
 <div class="grid2"><label class="f">Repeats<select name="rep" id="ev-rep">${opt(REP_OPTS,R.k||"")}</select></label>
  <label class="f" id="ev-modew" ${R.k&&R.k[0]==="m"?"":"hidden"}>Which day<select name="repmode" id="ev-mode">${opt(repModes(e.date),R.mode||"date")}</select></label></div>
 <label class="f" id="ev-untilw" ${R.k?"":"hidden"}>Repeat until <span class="h">leave empty to keep repeating</span><input type="date" name="until" value="${R.until||""}"></label>
 <div id="ev-talk" class="grid2" ${SPEAK_T.includes(e.type)?"":"hidden"}><label class="f">Speaker / presenter<input name="speaker" value="${esc(e.speaker||"")}" placeholder="e.g. Prof. Dr. ..."></label><label class="f">Speaker's designation / institution<input name="speakerInfo" value="${esc(e.speakerInfo||"")}"></label>
  <label class="f">Sponsor <span class="h">company</span><input name="sponsor" value="${esc(e.sponsor||"")}"></label></div>
 <div class="grid2"><label class="f">Department<select name="dept">${opt(["",...wsDepts()],e.dept||"")}</select></label><label class="f">Focal person<input name="focal" list="ev-fac" value="${esc(e.focal||"")}"></label></div>
 <datalist id="ev-fac">${DB.faculty.filter(f=>f.active!==false).map(f=>`<option value="${esc(facName(f))}">`).join("")}</datalist>
 <label class="f">Status<select name="status">${opt(EV_STATUS,e.status||"Planned")}</select></label>
 <label class="f">Notes<textarea name="notes">${esc(e.notes||"")}</textarea></label>
 ${n?"":`<button type="button" class="btn danger" data-act="ev-del" data-id="${e.id}" style="justify-self:start">Delete this event</button>`}`,()=>{
  if(fv("title").length<3)return fail("Enter a title.");if(!fv("date"))return fail("Choose the date.");if(fv("end")&&fv("end")<fv("date"))return fail("The end date is before the start date.");
  const rk=fv("rep");if(rk&&fv("until")&&fv("until")<fv("date"))return fail("“Repeat until” is before the first date.");
  const rep=rk?{k:rk,mode:rk[0]==="m"?(repModes(fv("date")).some(m=>m[0]===fv("repmode"))?fv("repmode"):"date"):"",until:fv("until")||""}:null;
  const rec={rep,type:fv("type"),title:fv("title"),date:fv("date"),end:fv("end"),time:fv("time"),venue:fv("venue"),speaker:fv("speaker"),speakerInfo:fv("speakerInfo"),sponsor:fv("sponsor"),dept:fv("dept"),focal:fv("focal"),status:fv("status"),notes:fv("notes")};
  if(!rep)delete rec.rep;
  if(n){const ne={id:uid("E"),...rec};evList().push(ne);log(`Added to the academic calendar: ${evT(rec.type)[1]}, ${rec.title} (${fd(rec.date)}${rep?", "+repLabel(ne).toLowerCase():""})`)}
  else{const was=e.date;if(!rep)delete e.rep;if(!rep||rep.k!==(e.rep||{}).k||rec.date!==was)delete e.occ;Object.assign(e,rec);log(`Calendar event edited: ${rec.title}${was!==rec.date?` (moved from ${fd(was)} to ${fd(rec.date)})`:""}`)}
  toast("Saved");return true})}
document.addEventListener("change",e=>{if(e.target.id==="ev-type"){const b=document.getElementById("ev-talk");if(b)b.hidden=!SPEAK_T.includes(e.target.value)}
 if(e.target.id==="ev-rep"||e.target.id==="ev-date"){const k=document.getElementById("ev-rep").value,m=document.getElementById("ev-mode"),cur=m.value;
  m.innerHTML=opt(repModes(document.getElementById("ev-date").value),cur);document.getElementById("ev-modew").hidden=!(k&&k[0]==="m");document.getElementById("ev-untilw").hidden=!k;document.getElementById("ev-dl").textContent=k?"First date":"Date"}
 if(e.target.id==="calpast"){UI.calPast=e.target.checked;render()}});
document.addEventListener("click",e=>{const o=e.target.closest("[data-evopen]");if(o){e.preventDefault();const ev=evList().find(x=>x.id===o.dataset.evopen);if(ev){if(isViewer())return calInfo(ev,o.dataset.occ);sheetEvent(ev,o.dataset.occ)}return}
 const ox=e.target.closest('[data-act="ev-occx"]');if(ox){const ev=evList().find(x=>x.id===ox.dataset.id),d=ox.dataset.occ;if(!ev)return;ev.occ=ev.occ||{};
  if(ev.occ[d]&&ev.occ[d].status==="Cancelled"){delete ev.occ[d];log(`Calendar: ${ev.title} on ${fd(d)} restored`)}else{ev.occ[d]={status:"Cancelled"};log(`Calendar: ${ev.title} on ${fd(d)} cancelled (other dates unchanged)`)}
  document.getElementById("overlay").innerHTML="";toast("Saved");render();return}
 const a=e.target.closest('[data-act="ev-add"],[data-act="ev-del"],[data-calv],[data-calf],[data-calm]');if(!a)return;
 if(a.dataset.calv){UI.calV=a.dataset.calv;render();return}
 if(a.dataset.calm){UI.calM=a.dataset.calm;render();return}
 if(a.dataset.calf!=null){const k=a.dataset.calf;UI.calF=k===""?[]:UI.calF.includes(k)?UI.calF.filter(x=>x!==k):[...UI.calF,k];render();return}
 if(a.dataset.act==="ev-add")return sheetEvent();
 if(a.dataset.act==="ev-del"){if(a.dataset.armed!=="1"){a.dataset.armed="1";a.textContent="Tap again to delete";return}const ev=evList().find(x=>x.id===a.dataset.id);if(!ev)return;
  DB.events=evList().filter(x=>x!==ev);log(`Removed from the academic calendar: ${ev.title} (${fd(ev.date)})`);document.getElementById("overlay").innerHTML="";toast("Event deleted");render()}});
function calInfo(ev,occ){const t=evT(ev.type);openSheet(ev.title,`<dl class="kv"><dt>Type</dt><dd>${t[1]}</dd><dt>Date</dt><dd>${fd(occ||ev.date)}${ev.end&&!occ?" to "+fd(ev.end):""}${ev.rep&&ev.rep.k?`<div class="subt">${esc(repLabel(ev))}</div>`:""}${ev.time?" · "+esc(ev.time):""}</dd>${ev.venue?`<dt>Venue</dt><dd>${esc(ev.venue)}</dd>`:""}${ev.speaker?`<dt>Speaker</dt><dd>${esc(ev.speaker)}${ev.speakerInfo?", "+esc(ev.speakerInfo):""}</dd>`:""}${ev.sponsor?`<dt>Sponsor</dt><dd>${esc(ev.sponsor)}</dd>`:""}${ev.focal?`<dt>Focal person</dt><dd>${esc(ev.focal)}</dd>`:""}<dt>Status</dt><dd>${esc(ev.status||"Planned")}</dd>${ev.notes?`<dt>Notes</dt><dd>${esc(ev.notes)}</dd>`:""}</dl>`,()=>true,"Close")}
EXPORTS.calendar=()=>({file:"RIC academic calendar",sheets:[sheetFrom("Calendar",calItems().sort((a,b)=>calKey(a)<calKey(b)?-1:1).map(i=>({"Date":i.date||"","Month":mLabel(i.month),"Type":evT(i.type)[1],"Title":i.title,"Repeats":i.occ?repLabel(i.ev):"","Time":i.time||"","Venue":i.venue||"","Speaker":i.ev?.speaker||"","Speaker details":i.ev?.speakerInfo||"","Sponsor":i.ev?.sponsor||"","Department":i.ev?.dept||"","Focal person":i.ev?.focal||"","Status":i.status,"Notes":i.ev?.notes||i.sub||""})))]});
