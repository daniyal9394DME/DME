/* =====================================================================
   PHASE 5: logins and access, side menu, overview cards, form builder
   ===================================================================== */
const SECTIONS=[["tasks","Tasks"],["pgts","PGTs"],["leaves","Leave and left training"],["verify","Verification"],["faculty","Faculty"],["supervisors","Supervisors"],["credentials","Faculty updates"],["workshops","Workshops"],["exams","Exams"],["orientation","Orientation"],["settings","Settings"],["audit","Audit log"]];
const DESIGS={
 "Director of Medical Education":{role:"Admin",seeAll:true,sec:SECTIONS.map(s=>s[0])},
 "Executive Director":{role:"Viewer",seeAll:true,sec:SECTIONS.map(s=>s[0]).filter(k=>k!=="settings")},
 "Training Officer":{role:"Editor",seeAll:true,sec:["tasks","pgts","leaves","verify","faculty","supervisors","credentials","workshops","exams","orientation","audit"]},
 "Data Entry Operator":{role:"Editor",seeAll:false,sec:["tasks","pgts","leaves","verify","faculty","supervisors","credentials"]},
 "Library Assistant":{role:"Editor",seeAll:false,sec:["tasks","workshops"]},
 "Office Assistant":{role:"Editor",seeAll:false,sec:["tasks","workshops","orientation"]}};
const meObj=()=>DB.staff.find(s=>s.name===ME)||DB.staff[0];
const isAdmin=()=>meObj().role==="Admin";
const seeAll=()=>isAdmin()||!!meObj().seeAll;
const canSee=k=>{if(k==="exits")k="leaves";if(k==="rotating"||k==="observers"||k==="kiosk"||k==="status")k="pgts";if(k==="datacheck")k="pgts";if(k==="messages"||k==="calendar")return true;return k==="overview"||k==="search"||isAdmin()||(meObj().sections||[]).includes(k)};
const visibleTasks=()=>seeAll()?DB.tasks:DB.tasks.filter(t=>t.assignee===ME);
const canAssign=()=>seeAll();

/* ---------- side menu ---------- */
const NAVG=[["","overview","Dashboard"],["","tasks","Tasks"],["","messages","WhatsApp"],["Postgraduate trainees","pgts","Trainee register"],["Postgraduate trainees","verify","New registrations"],["Postgraduate trainees","datacheck","Data checks"],["Postgraduate trainees","leaves","Leave"],["Postgraduate trainees","exits","Left training"],["Postgraduate trainees","rotating","Rotating trainees"],["Postgraduate trainees","status","Training status"],["Faculty","faculty","Faculty directory"],["Faculty","supervisors","Supervisors"],["Faculty","credentials","Credentials"],["Teaching and assessment","calendar","Academic calendar"],["Teaching and assessment","workshops","Workshops"],["Teaching and assessment","exams","Examinations"],["Teaching and assessment","orientation","Orientation"],["Administration","settings","Settings"],["Administration","audit","Audit log"],["Administration","search","Search"]];
function renderChrome(cur){
 const late=visibleTasks().filter(tOverdue).length,pend=DB.pgts.filter(p=>p.reg==="Pending").length,wa=DB.workshops.filter(w=>wsFlags(w).length).length;
 const badge={tasks:late?[late,"late"]:null,verify:pend?[pend,""]:null,workshops:wa?[wa,""]:null};
 let g=null,h="";NAVG.filter(n=>canSee(n[1])).forEach(([grp,k,l])=>{if(grp!==g){h+=grp?`<div class="ng">${grp}</div>`:"";g=grp}
  h+=`<a href="#${k}" ${k===cur?'aria-current="page"':""}><span>${l}</span>${badge[k]?`<span class="cnt ${badge[k][1]}">${badge[k][0]}</span>`:""}</a>`});
 document.getElementById("nav").innerHTML=h;
 const m=meObj();document.getElementById("userbox").innerHTML=`<label class="whobox"><span class="s">Signed in as · prototype switch</span><select id="whoami" aria-label="Signed in as">${DB.staff.map(s=>`<option ${s.name===ME?"selected":""}>${esc(s.name)}</option>`).join("")}</select><span class="s">${esc(m.desig||m.role)}${seeAll()&&!isAdmin()?" · sees all tasks":""}</span></label>`;
 const cl=NAVG.find(n=>n[1]===cur);document.getElementById("crumb").textContent=cl?cl[2]:"";
}
function navToggle(){if(matchMedia("(min-width:1100px)").matches){document.body.classList.toggle("navcollapsed");try{localStorage.setItem("ric-dme-nav",document.body.classList.contains("navcollapsed")?"0":"1")}catch(e){}}else document.body.classList.toggle("navopen")}
try{if(localStorage.getItem("ric-dme-nav")==="0")document.body.classList.add("navcollapsed")}catch(e){}

/* ---------- team (settings) ---------- */
function teamPanel(){return`<div class="panel flush" id="set-staff"><div class="head" style="padding:14px 16px 0"><div><h3 style="margin:0">DME team and logins</h3><p class="subt" style="margin:4px 0 0">Each person signs in with their own account and sees only the sections you allow. Tasks: people who can see all tasks see everyone's; others see only their own.</p></div>${isAdmin()?`<button class="btn primary small" data-act="tm-add">Add person</button>`:""}</div>
 <div class="tblwrap" style="margin-top:10px"><table><thead><tr><th>Name</th><th>Designation</th><th>Login email</th><th>Sign-in</th><th>Access</th><th>Tasks</th><th>Conduct records</th><th>Sections</th><th class="num">Open tasks</th><th></th></tr></thead><tbody>
 ${DB.staff.map((s,i)=>`<tr><td><b style="font-weight:600">${esc(s.name)}</b>${s.me?' <span class="subt">you</span>':""}</td><td>${esc(s.desig||"—")}</td><td class="code">${esc(s.email)||"—"}</td><td>${signinCell(s,i)}</td><td><span class="pill ${s.role==="Admin"?"p-pend":s.role==="Editor"?"p-rot":"p-done"}">${s.role}</span></td><td>${s.role==="Admin"||s.seeAll?"Everyone's":"Own only"}</td><td>${s.role==="Admin"||s.conduct?"Can view and add":"No access"}</td>
  <td class="wrapcell" style="min-width:220px">${s.role==="Admin"?"All sections":(s.sections||[]).map(k=>(SECTIONS.find(x=>x[0]===k)||[k,k])[1]).join(", ")||"Overview only"}</td><td class="num">${DB.tasks.filter(t=>t.assignee===s.name&&t.status!=="Done").length}</td>
  <td>${isAdmin()?`<button class="btn link" data-act="tm-edit" data-i="${i}">Edit</button>${s.me?"":`<button class="btn link" data-act="tm-rm" data-i="${i}">Remove</button>`}`:""}</td></tr>`).join("")}
 </tbody></table></div></div>`}
function sheetTeam(st){const n=!st;st=st||{name:"",desig:"Training Officer",email:"",role:"Editor",seeAll:true,sections:DESIGS["Training Officer"].sec.slice()};
 const known=Object.keys(DESIGS);const custom=!known.includes(st.desig);
 openSheet(n?"Add person":`Edit · ${st.name}`,`
 <label class="f">Name<input name="n" value="${esc(st.name)}" placeholder="e.g. Mr. Ahmed Raza"></label>
 <label class="f">Designation<select name="dg" id="tm-dg">${opt([...known.filter(d=>!st.me||d===st.desig).filter(d=>st.me||d!=="Director of Medical Education"),["__c","Other designation…"]],custom?"__c":st.desig)}</select></label>
 <label class="f" id="tm-cw" ${custom?"":"hidden"}>Other designation<input name="dgc" value="${custom?esc(st.desig):""}" placeholder="e.g. Computer Operator"></label>
 <label class="f">Login email <span class="h">they sign in with this</span><input type="email" name="e" value="${esc(st.email)}"></label>
 ${st.me?"":`<div class="grid2"><label class="f">Access<select name="r">${opt([["Editor","Editor · add and edit"],["Viewer","Viewer · read only"],["Admin","Admin · everything"]],st.role)}</select></label>
 <label class="f">Tasks they can see<select name="sa">${opt([["1","Everyone's tasks"],["0","Only their own"]],st.seeAll?"1":"0")}</select></label></div>
 <label class="f">PGT conduct and disciplinary records<select name="cd">${opt([["0","No access"],["1","Can view and add"]],st.conduct?"1":"0")}</select></label>
 <div class="f"><span class="lbl">Sections they can open <span class="h">Overview is always on</span></span><div class="chips">${SECTIONS.map(([k,l])=>`<label class="chip"><input type="checkbox" class="sr" name="sec" value="${k}" ${(st.sections||[]).includes(k)?"checked":""}> ${l}</label>`).join("")}</div></div>
 <p class="subt" style="margin:0">Choosing a designation fills in suggested access; you can change it.</p>`}`,()=>{
 const nm=fv("n").trim();if(nm.length<3)return fail("Enter the name.");if(DB.staff.some(x=>x!==st&&x.name.toLowerCase()===nm.toLowerCase()))return fail("This person is already on the team.");
 const dg=fv("dg")==="__c"?fv("dgc"):fv("dg");if(!dg)return fail("Enter the designation.");if(fv("e")&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fv("e")))return fail("Enter a valid email.");
 const old=st.name;const rec={name:nm,desig:dg,email:fv("e").toLowerCase()};
 if(!st.me&&rec.email&&(n||rec.email!==(st.email||"").toLowerCase()||!st.invite))rec.invite=newInvite();
 if(!st.me){rec.role=fv("r");rec.seeAll=fv("sa")==="1";rec.conduct=fv("cd")==="1";rec.sections=[...document.querySelectorAll('#sheetform [name="sec"]:checked')].map(x=>x.value)}
 if(n){DB.staff.push(rec);log(`Added ${nm} (${dg}) to the DME team`);if(rec.invite)setTimeout(()=>toast(`Invite code for ${nm}: ${rec.invite}`),50)}else{Object.assign(st,rec);if(old!==nm){DB.tasks.forEach(t=>{if(t.assignee===old)t.assignee=nm});if(ME===old)ME=nm}log(`Edited ${nm} (${dg})`)}
 toast("Saved");return true})}
function teamAction(a,b){if(!isAdmin())return;const i=+b.dataset.i;
 if(a==="tm-add")return sheetTeam();
 if(a==="tm-code"){const s=DB.staff[i];if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again: their current login stops working";return}s.invite=newInvite();log(`New invite code issued for ${s.name}`);persist();render();toast(`New invite code for ${s.name}: ${s.invite}`);return}if(a==="tm-edit")return sheetTeam(DB.staff[i]);
 if(a==="tm-rm"){const s=DB.staff[i],n=DB.tasks.filter(t=>t.assignee===s.name&&t.status!=="Done").length;if(n){toast(`${s.name} has ${n} open tasks. Reassign them first.`);return}if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Confirm";return}DB.staff.splice(i,1);log(`Removed ${s.name} from the DME team`);persist();render()}}

/* ---------- Overview (cards) ---------- */
function card(title,count,href,body,cls=""){return`<section class="ocard ${cls}"><header><h3>${title}${count!=null?` <span class="oc-n">${count}</span>`:""}</h3>${href?`<a href="#${href}">View all</a>`:""}</header>${body}</section>`}
const olist=(items,empty)=>items.length?`<ul class="olist">${items.join("")}</ul>`:`<p class="oempty">${empty}</p>`;
const oli=(href,main,sub,right)=>`<li><a href="#${href}"><span class="m">${main}${sub?`<span class="subt">${sub}</span>`:""}</span>${right?`<span class="r">${right}</span>`:""}</a></li>`;
function vOverview(){
 const V=verified(),A=V.filter(p=>CUR.get(p.id).active),C=p=>CUR.get(p.id),S=DB.settings;
 const atRic=A.filter(p=>C(p).pk==="ric"&&!C(p).leave).length,onRot=A.filter(p=>C(p).pk==="rot").length,onLeave=A.filter(p=>C(p).leave);
 const pend=DB.pgts.filter(p=>p.reg==="Pending");
 const fac=DB.faculty.map(f=>[f,facCur(f)]),sups=fac.filter(([f])=>f.cpsp||f.uhs),credBad=fac.filter(([f,c])=>credIssues(f,c).some(i=>i[0]!=="mute"));
 const T=visibleTasks(),openT=T.filter(t=>t.status!=="Done"),late=openT.filter(tOverdue),soon=openT.filter(tSoon);
 const W=DB.workshops,wAttn=W.filter(w=>wsFlags(w).length),yr=String(TODAY.getFullYear()),closed=W.filter(w=>w.stage>=5),fund=closed.reduce((s,w)=>s+fin(w).dme,0);
 const flags=A.map(p=>[p,checks(p,C(p))]).filter(([p,f])=>f.length);
 const att=[
  ["tasks",late.length,"bad","Overdue tasks",late[0]?.title,"tasks","overdue"],
  ["tasks",soon.length,"pause","Tasks due in 3 days",soon[0]?.title,"tasks","week"],
  ["verify",pend.length,"pend","Registrations to verify",pend[0]?"Dr. "+pend[0].name:"","verify"],
  ["workshops",wAttn.length,"pause","Workshops need attention",wAttn[0]?`${wAttn[0].title}: ${wsFlags(wAttn[0])[0]}`:"","workshops","attn"],
  ["credentials",credBad.length,"pause","Faculty credential issues",credBad.slice(0,2).map(([f])=>facName(f)).join(", "),"credentials"],
  ...extraAttn().map(x=>[x[4],...x]),
  ["pgts",flags.length,"done","PGT records to check","Missing durations, supervisors or dates","#datacheck"]
 ].filter(x=>x[1]&&canSee(x[0]));
 const kp=(k,n,l,sub,href,cls="")=>canSee(k)?`<a class="kpi ${cls}" href="#${href}"><span class="n">${n}</span><span class="l">${l}</span>${sub?`<span class="sub">${sub}</span>`:""}</a>`:"";
 const m0=iso(TODAY).slice(0,7),m1=mAdd(m0,1),inWin=d=>d&&(d.startsWith(m0)||d.startsWith(m1))&&d>=iso(TODAY);
 const ev=[];
 if(canSee("workshops"))W.filter(w=>(w.month===m0||w.month===m1)&&w.stage<6).forEach(w=>ev.push([w.date||w.month+"-01",!!w.date,"Workshop",w.title,"ws-"+w.id]));
 if(canSee("exams"))DB.exams.filter(x=>x.month===m0||x.month===m1).forEach(x=>ev.push([x.date||x.month+"-01",!!x.date,"Exam",x.title+" "+x.session,"exam-"+x.id]));
 if(canSee("orientation"))DB.orients.filter(o=>o.month===m0||o.month===m1).forEach(o=>ev.push([o.date||o.month+"-01",!!o.date,"Orientation",sessLong(o.cycle)+" cycle","orient-"+o.id]));
 if(canSee("pgts"))A.forEach(p=>{const c=C(p);if(inWin(c.comp))ev.push([c.comp,true,"Completion","Dr. "+p.name,"pgt-"+p.id]);if(c.pk==="rot"&&inWin(c.ret))ev.push([c.ret,true,"Return","Dr. "+p.name+" from "+c.rotSite,"pgt-"+p.id])});
 openT.filter(t=>inWin(t.due)).forEach(t=>ev.push([t.due,true,"Task",t.title,"task-"+t.id]));
 (DB.events||[]).forEach(e=>evExpand(e).filter(o=>o.status!=="Cancelled"&&inWin(o.date)).forEach(o=>ev.push([o.date,true,"Event",e.title,"calendar"])));
 ev.sort((a,b)=>a[0]<b[0]?-1:1);
 const ret=A.filter(p=>C(p).pk==="rot"&&C(p).toRet!=null&&C(p).toRet<=60).sort((a,b)=>C(a).toRet-C(b).toRet);
 const comp=A.filter(p=>C(p).toComp>0&&C(p).toComp<=180).sort((a,b)=>C(a).toComp-C(b).toComp);
 const nextW=W.filter(w=>w.stage<5).sort((a,b)=>a.month<b.month?-1:1).slice(0,4);
 const ex=DB.exams.filter(x=>x.stage<3&&!x.practice).sort((a,b)=>a.month<b.month?-1:1)[0]||DB.exams.filter(x=>x.stage<5&&!x.practice).sort((a,b)=>a.month<b.month?1:-1)[0];
 const nx=sessNext(curSess(),1),orient=DB.orients.find(o=>o.cycle===nx),joining=arrivalsIn(nx).length;
 const bySpec=DB.specs.map(s=>s.name).filter(s=>A.some(p=>p.spec===s)).map(s=>{const g=A.filter(p=>p.spec===s);return[s,g.filter(p=>p.program==="FCPS").length,g.filter(p=>p.program!=="FCPS").length]});
 const mx=Math.max(1,...bySpec.map(r=>r[1]+r[2]));
 const cards=[];
 if(canSee("tasks"))cards.push(card(seeAll()?"Tasks due next":"My tasks",openT.length,"tasks",olist(openT.slice().sort((a,b)=>(tDue(a)??9999)-(tDue(b)??9999)).slice(0,5).map(t=>oli("task-"+t.id,esc(t.title),esc(t.assignee),dueTxt(t))),"No open tasks.")));
 cards.push(card(`${mLabel(m0)} and ${mLabel(m1)}`,ev.length,"",olist(ev.slice(0,6).map(e=>oli(e[4],`<span class="pill ${({Workshop:"p-pend",Exam:"p-rot",Orientation:"p-rot",Completion:"p-ric",Return:"p-rot",Task:"p-pause",Event:"p-leave"})[e[2]]}" style="margin-right:6px">${e[2]}</span>${esc(e[3])}`,"",e[1]?fd(e[0]).slice(0,6):mLabel(e[0].slice(0,7)))),"Nothing scheduled.")));
 if(canSee("pgts")){const rc=rotDashCard();if(rc)cards.push(rc)}
 if(canSee("verify"))cards.push(card("Waiting for verification",pend.length,"verify",olist(pend.slice(0,5).map(p=>oli("pgt-"+p.id,pgtName(p),esc(p.spec+" · "+p.program),fd(p.submitted))),"No registrations waiting.")));
 if(canSee("pgts")){
  cards.push(card("Returning to RIC · 60 days",ret.length,"pgts",olist(ret.slice(0,5).map(p=>oli("pgt-"+p.id,pgtName(p),esc(p.spec)+" · from "+esc(C(p).rotSite),`<span class="days ${C(p).toRet<=S.return_red?"d-red":C(p).toRet<=S.return_yellow?"d-amb":""}">${C(p).toRet} d</span>`)),"No returns due.")));
  cards.push(card("Completing training · 6 months",comp.length,"pgts",olist(comp.slice(0,5).map(p=>oli("pgt-"+p.id,pgtName(p),esc(p.spec),`<span class="days ${C(p).toComp<=S.complete_red?"d-red":C(p).toComp<=S.complete_yellow?"d-amb":""}">${fd(C(p).comp)}</span>`)),"No completions due.")));}
 if(canSee("leaves"))cards.push(card("On leave today",onLeave.length,"leaves",olist(onLeave.slice(0,5).map(p=>oli("pgt-"+p.id,pgtName(p),esc(C(p).leave.type)+" leave",`${C(p).leaveLeft} d left`)),"Nobody is on leave today.")));
 if(canSee("workshops"))cards.push(card("Next workshops",W.filter(w=>w.stage<5).length,"workshops",olist(nextW.map(w=>oli("ws-"+w.id,esc(w.title),mLabel(w.month)+" · "+STAGES[w.stage],wsFlags(w).length?'<b class="d-red">!</b>':segs(w.stage))),"No upcoming workshops.")));
 if(canSee("exams")&&ex){const sp=exSpecs(ex),nf=sp.filter(s=>!(ex.papers[s]||{}).final).length;cards.push(card("Next PGT exam",null,"exam-"+ex.id,`<div class="obig"><b>${esc(ex.session)}</b><span class="pill ${["p-done","p-rot","p-rot","p-leave","p-pend","p-ric"][ex.stage]}">${EX_STAGES[ex.stage]}</span></div><dl class="kv"><dt>Date</dt><dd>${ex.date?fd(ex.date):"Not set"}</dd><dt>Candidates</dt><dd>${exCands(ex).length}</dd><dt>Question papers final</dt><dd>${sp.length-nf} of ${sp.length}</dd></dl>${exFlags(ex).length?`<p class="d-red" style="margin:0;font-size:13px">${esc(exFlags(ex)[0])}</p>`:""}`))}
 if(canSee("orientation"))cards.push(card("Next orientation",null,orient?"orient-"+orient.id:"orientation",`<div class="obig"><b>${sessLong(nx)} cycle</b>${orient?`<span class="pill ${["p-done","p-rot","p-pend","p-ric"][orient.stage]}">${OR_STAGES[orient.stage]}</span>`:'<span class="pill p-bad">Not planned</span>'}</div><dl class="kv"><dt>When</dt><dd>${orient?.date?fd(orient.date):mLabel(orientMonth(nx))+", first week"}</dd><dt>PGTs joining RIC</dt><dd>${joining}${sessKey(nx)>sessKey(curSess())?' <span class="subt">so far</span>':""}</dd></dl>`));
 if(canSee("pgts"))cards.push(card("Active PGTs by specialty",A.length,"pgts",`<div class="legend" style="margin-bottom:6px"><span><i style="background:var(--brand)"></i>FCPS</span><span><i style="background:var(--gold)"></i>UHS</span></div>${bySpec.map(([s,a,b])=>`<div class="spec-row sm"><span>${s}</span><span class="bar"><span class="track" style="max-width:${(a+b)/mx*100}%"><i style="width:${a/(a+b)*100}%;background:var(--brand)"></i><i style="width:${b/(a+b)*100}%;background:var(--gold)"></i></span></span><span class="v">${a+b}</span></div>`).join("")}`,"wide"));
 if(canSee("credentials"))cards.push(card("Faculty credentials",credBad.length,"credentials",olist(credBad.slice(0,5).map(([f,c])=>oli("cred-"+f.id,esc(facName(f)),esc(credIssues(f,c).filter(i=>i[0]!=="mute")[0][1]),"")),"All supervisor credentials are current.")));
 if(seeAll()&&canSee("tasks"))cards.push(card("Team workload",null,"tasks",olist(DB.staff.map(s=>{const m=openT.filter(t=>t.assignee===s.name),av=m.length?Math.round(m.reduce((a,t)=>a+tProg(t),0)/m.length):0;return oli("tasks",esc(s.name),`${m.length} open${m.filter(tOverdue).length?` · <span class="d-red">${m.filter(tOverdue).length} overdue</span>`:""}`,m.length?progBar(av,1):"")}),"")));
 return`<div class="head"><div><h2>Overview</h2><p>${TODAY.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · ${esc(ME)}</p></div><div class="actions">${canSee("tasks")?`<button class="btn" data-act="t-new">New task</button>`:""}${canSee("leaves")?`<a class="btn" href="#leaves">Add leave</a>`:""}${canSee("workshops")?`<button class="btn" data-act="ws-add">Add workshop</button>`:""}</div></div>
 ${calStrip()}
 <div class="kpis">
  ${kp("pgts",A.length,"Active PGTs",`${atRic} at RIC · ${onRot} rotation · ${onLeave.length} leave`,"pgts")}
  ${kp("faculty",sups.length,"Approved supervisors",`of ${fac.length} faculty`,"faculty")}
  ${kp("verify",pend.length,"To verify",`${V.length} PGTs on record`,"verify",pend.length?"attn":"")}
  ${kp("tasks",openT.length,seeAll()?"Open tasks":"My open tasks",`${late.length} overdue`,"tasks",late.length?"attn":"")}
  ${kp("workshops",`${W.filter(w=>w.month.startsWith(yr)&&w.stage>=5).length}<span class="of"> / ${W.filter(w=>w.month.startsWith(yr)).length}</span>`,`Workshops held in ${yr}`,`${W.filter(w=>w.stage<5).length} upcoming`,"workshops")}
  ${isAdmin()?kp("workshops",`<span class="money">${money(fund)}</span>`,"DME fund",`${100-(S.director_share??60)}% of workshop net income`,"workshops"):""}
 </div>
 ${att.length?`<div><h3 class="sech">Needs attention</h3><div class="agrid">${att.map(([s,n,k,l,sub,h,f])=>`<a class="acard k-${k}" href="${h.startsWith("#")?h:"#"+h}" ${f?`data-go-filter="${h}:${f}"`:""}><span class="an">${n}</span><span class="al">${l[0].toUpperCase()+l.slice(1)}</span>${sub?`<span class="subt">${esc(sub)}</span>`:""}</a>`).join("")}</div></div>`:`<div class="flag ok">Nothing needs attention today.</div>`}
 <div class="ogrid">${cards.join("")}</div>
 ${canSee("pgts")&&flags.length?`<details class="panel flush" id="checks"><summary><h3 style="display:inline">PGT records that need checking · ${flags.length}</h3></summary><div class="tblwrap"><table><tbody>${flags.slice(0,60).map(([p,f])=>`<tr class="click" data-href="pgt-${p.id}"><td>${pgtName(p)}<div class="subt">${esc(p.spec)}</div></td><td class="wrapcell">${f.map(esc).join("<br>")}</td></tr>`).join("")}</tbody></table></div></details>`:""}`}

/* =====================================================================
   FORM BUILDER (Google Forms style) for feedback and proposal forms
   ===================================================================== */
const QTYPES=[["short","Short answer"],["para","Paragraph"],["mc","Multiple choice"],["cb","Checkboxes"],["dd","Dropdown"],["scale","Linear scale"],["num","Number"],["date","Date"],["time","Time"],["list","List, one per line"],["sched","Programme schedule (sessions with times)"],["roster","Faculty table"],["items","Items to procure, with costs"]];
const CHOICE=new Set(["mc","cb","dd"]);
const OPT_TOKENS={"@depts":["All departments",()=>wsDepts()],"@faculty":["All faculty names",()=>DB.faculty.map(facName)],"@workshops":["All workshop titles",()=>[...new Set(DB.workshops.filter(w=>!w.example).map(w=>w.title))]]};
const qOpts=q=>(q.opts||[]).flatMap(o=>OPT_TOKENS[o]?OPT_TOKENS[o][1]():[o]);
const Q=(k,t,type,o={})=>({k,t,type,d:"",req:false,opts:[],other:false,min:1,max:5,minL:"",maxL:"",section:"",...o});
const qEmpty=v=>v==null||v===""||(Array.isArray(v)&&!v.length);
const isOther=v=>typeof v==="string"&&(v==="Other"||v.startsWith("Other:"));
function qCtrl(q,v,name,dis){if(PB_KINDS.has(q.type))return pbCtrl(q,v,name,dis);const d=dis?"disabled":"";const O=qOpts(q);
 const otherTxt=Array.isArray(v)?(v.find(isOther)||""):isOther(v)?v:"";const ot=otherTxt.replace(/^Other:?\s*/,"");
 const otherBox=q.other?`<input class="otherbox" name="${name}-other" value="${esc(ot)}" placeholder="Other (please specify)" ${d} aria-label="Other, please specify">`:"";
 switch(q.type){
  case"para":return`<textarea name="${name}" ${d}>${esc(v||"")}</textarea>`;
  case"list":return`<textarea name="${name}" rows="4" ${d}>${esc(Array.isArray(v)?v.join("\n"):v||"")}</textarea>`;
  case"num":return`<input type="number" name="${name}" value="${esc(v??"")}" ${d}>`;
  case"date":return`<input type="date" name="${name}" value="${esc(v||"")}" ${d}>`;
  case"time":return`<input type="time" name="${name}" value="${esc(v||"")}" ${d}>`;
  case"dd":return`<select name="${name}" ${d}><option value="">Choose</option>${O.map(o=>`<option ${v===o?"selected":""}>${esc(o)}</option>`).join("")}${q.other?`<option value="__other" ${isOther(v)?"selected":""}>Other</option>`:""}</select>${otherBox}`;
  case"mc":return`<div class="chips">${O.map(o=>`<label class="chip"><input type="radio" class="sr" name="${name}" value="${esc(o)}" ${v===o?"checked":""} ${d}> ${esc(o)}</label>`).join("")}${q.other?`<label class="chip"><input type="radio" class="sr" name="${name}" value="__other" ${isOther(v)?"checked":""} ${d}> Other</label>`:""}</div>${otherBox}`;
  case"cb":{const arr=Array.isArray(v)?v:[];return`<div class="chips">${O.map(o=>`<label class="chip"><input type="checkbox" class="sr" name="${name}" value="${esc(o)}" ${arr.includes(o)?"checked":""} ${d}> ${esc(o)}</label>`).join("")}${q.other?`<label class="chip"><input type="checkbox" class="sr" name="${name}" value="__other" ${arr.some(isOther)?"checked":""} ${d}> Other</label>`:""}</div>${otherBox}`}
  case"scale":{const n=[];for(let i=+q.min;i<=+q.max;i++)n.push(i);return`<div class="scalewrap">${q.minL?`<span class="subt">${esc(q.minL)}</span>`:""}<div class="scale" role="radiogroup" aria-label="${esc(q.t)}">${n.map(i=>`<label><input type="radio" name="${name}" value="${i}" ${+v===i?"checked":""} ${d}><span>${i}</span></label>`).join("")}</div>${q.maxL?`<span class="subt">${esc(q.maxL)}</span>`:""}</div>`}
  default:{const dl=(q.opts||[]).find(o=>OPT_TOKENS[o]);return`<input name="${name}" value="${esc(v||"")}" ${dl?`list="dl-${name}"`:""} ${d}>${dl?`<datalist id="dl-${name}">${qOpts(q).map(o=>`<option value="${esc(o)}">`).join("")}</datalist>`:""}`}}}
function qRead(root,q,name){if(PB_KINDS.has(q.type))return pbRead(root,q,name);const el=root.querySelector(`[name="${name}"]`);const oth=()=>{const t=(root.querySelector(`[name="${name}-other"]`)?.value||"").trim();return t?"Other: "+t:"Other"};
 switch(q.type){
  case"list":return(el?.value||"").split("\n").map(s=>s.trim()).filter(Boolean);
  case"num":{const v=(el?.value||"").trim();return v===""?"":+v}
  case"mc":case"scale":{const c=root.querySelector(`[name="${name}"]:checked`);if(!c)return"";if(q.type==="scale")return+c.value;return c.value==="__other"?oth():c.value}
  case"dd":return el?.value==="__other"?oth():(el?.value||"");
  case"cb":return[...root.querySelectorAll(`[name="${name}"]:checked`)].map(c=>c.value==="__other"?oth():c.value);
  default:return(el?.value||"").trim()}}
const qText=(q,v)=>qEmpty(v)?"":PB_KINDS.has(q.type)?pbText(q,v):Array.isArray(v)?v.join("; "):String(v);
const qShow=(q,v)=>{if(qEmpty(v))return'<span class="subt">—</span>';if(PB_KINDS.has(q.type))return pbShow(q,v);if(q.type==="list")return`<ul class="cm">${v.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;if(q.type==="cb")return v.map(x=>`<span class="pill p-done" style="margin:2px 4px 2px 0">${esc(x)}</span>`).join("");if(q.type==="date")return fd(v);if(q.type==="scale")return`${v} / ${q.max}`;return esc(v)};
function formHtml(qs,vals,prefix,dis){let h="",sec=null,open=false;
 qs.forEach(q=>{if(q.section!==sec){if(open)h+="</fieldset>";h+=`<fieldset class="pfsec">${q.section?`<legend>${esc(q.section)}</legend>`:""}`;open=true;sec=q.section}
  h+=`<div class="q"><div class="qt"><span class="${q.req?"req":""}">${esc(q.t)}</span></div>${q.d?`<p class="qd">${esc(q.d)}</p>`:""}${qCtrl(q,vals[q.k],prefix+q.k,dis)}</div>`});
 return h+(open?"</fieldset>":"")}
function formRead(root,qs,prefix){const vals={},missing=[];qs.forEach(q=>{const v=qRead(root,q,prefix+q.k);vals[q.k]=v;if(q.req&&qEmpty(v))missing.push(q)});return{vals,missing}}

/* =====================================================================
   V12 · STRUCTURED PROPOSAL FIELDS
   Programme schedule builder (start/end times, session type, topic, facilitator),
   faculty table and items-to-procure table, instead of free-text lists.
   ===================================================================== */
const PB_TYPES=[
 {k:"reg",l:"Registration & pre-test",d:30,opt:1},
 {k:"open",l:"Welcome / inauguration",d:15,opt:1},
 {k:"lecture",l:"Lecture",d:30},
 {k:"handson",l:"Hands-on / skills station",d:45},
 {k:"rotation",l:"Station rotation",d:60},
 {k:"demo",l:"Live or video demonstration",d:30},
 {k:"case",l:"Case discussion",d:30},
 {k:"sim",l:"Simulation",d:45},
 {k:"panel",l:"Panel discussion / Q&A",d:20},
 {k:"assess",l:"Assessment (OSCE / DOPS)",d:30},
 {k:"break",l:"Tea break",d:15,brk:1},
 {k:"lunch",l:"Lunch & prayer break",d:45,brk:1},
 {k:"close",l:"Post-test, feedback & certificates",d:30,opt:1}];
const PB_KINDS=new Set(["sched","roster","items"]);
const PB_PH={lecture:"Lecture title",handson:"Skill or station",rotation:"Stations, e.g. A: IABP set-up, B: ECMO circuit",demo:"What is demonstrated",case:"Case or theme",sim:"Scenario",panel:"Panel theme",assess:"What is assessed"};
const PB_DESIG=["Professor","Associate Professor","Assistant Professor","Senior Registrar","Consultant","Registrar","Medical Officer","Nurse / Allied health","Perfusionist / Technologist"];
const PB_ROLES=["Course director","Lecturer / speaker","Station facilitator","Demonstrator","Moderator","Panelist","Assessor"];
const PB_RIC="Rawalpindi Institute of Cardiology";
const pbT=k=>PB_TYPES.find(x=>x.k===k)||PB_TYPES[2];
const pbMin=s=>{const m=/^(\d{1,2})[:.](\d{2})/.exec(String(s||""));return m?+m[1]*60+ +m[2]:null};
const pbHM=n=>n==null||isNaN(n)?"":String(Math.floor(((n%1440)+1440)%1440/60)).padStart(2,"0")+":"+String(((n%60)+60)%60).padStart(2,"0");
const pb12=s=>{const n=pbMin(s);if(n==null)return"";let h=Math.floor(n/60),m=n%60;const ap=h>=12?"pm":"am";h=h%12||12;return`${h}:${String(m).padStart(2,"0")} ${ap}`};
const pbDur=n=>n<60?`${n} min`:`${Math.floor(n/60)} h${n%60?` ${n%60} min`:""}`;
const pbPKR=n=>"PKR "+Math.round(+n||0).toLocaleString("en-US");
const pbFac=()=>{const s=new Map();(DB.faculty||[]).filter(f=>f&&f.active!==false).forEach(f=>{const n=facName(f);if(n&&n!=="—"&&!s.has(n))s.set(n,f.desig||"")});return[...s].map(([n,d])=>({n,d})).sort((a,b)=>a.n.replace(/^(prof\.?\s*)?(dr\.?\s*)?/i,"").localeCompare(b.n.replace(/^(prof\.?\s*)?(dr\.?\s*)?/i,"")))};

/* values saved by earlier versions were plain lines of text: read them into rows */
function pbSched(v){if(!Array.isArray(v))return[];
 if(v.every(x=>x&&typeof x==="object"))return v.map(r=>({day:+r.day||1,type:r.type||"lecture",start:r.start||"",end:r.end||"",topic:r.topic||"",by:r.by||""}));
 const R=v.map(s=>{s=String(s).trim();const m=/^(\d{1,2}[:.]\d{2})\s*(?:[-–]\s*(\d{1,2}[:.]\d{2}))?\s*(.*)$/.exec(s);let rest=m?m[3]:s,by="";const c=rest.lastIndexOf(",");
  if(c>0&&/\b(dr|prof|mr|ms)\b/i.test(rest.slice(c+1))){by=rest.slice(c+1).trim();rest=rest.slice(0,c).trim()}
  const low=rest.toLowerCase(),type=/registration/.test(low)?"reg":/lunch|prayer/.test(low)?"lunch":/tea|break/.test(low)?"break":/post-test|certificate|closing/.test(low)?"close":/rotation|station/.test(low)?"rotation":/hands-on|hands on/.test(low)?"handson":/case/.test(low)?"case":/panel|q&a/.test(low)?"panel":"lecture";
  return{day:1,type,start:m?pbHM(pbMin(m[1])):"",end:m&&m[2]?pbHM(pbMin(m[2])):"",topic:pbT(type).brk?"":rest.replace(/^lecture:\s*/i,""),by}});
 R.forEach((r,i)=>{if(!r.end&&r.start){const nx=R[i+1]?.start;r.end=nx&&pbMin(nx)>pbMin(r.start)?nx:pbHM(pbMin(r.start)+pbT(r.type).d)}});return R}
function pbRoster(v){if(!Array.isArray(v))return[];return v.map(x=>{if(x&&typeof x==="object")return{name:x.name||"",desig:x.desig||"",inst:x.inst||PB_RIC,role:x.role||""};
 const p=String(x).split(",").map(s=>s.trim());const inst=p[2]||"RIC";return{name:p[0]||"",desig:p[1]||"",inst:/^ric$|rawalpindi institute of cardiology/i.test(inst)?PB_RIC:inst,role:""}})}
function pbItems(v){if(!Array.isArray(v))return[];return v.map(x=>{if(x&&typeof x==="object")return{item:x.item||"",qty:x.qty??"",unit:x.unit??""};
 const p=String(x).split(",").map(s=>s.trim());const q=parseInt(p[1])||1,c=+(String(p[2]||"").replace(/[^\d.]/g,""))||0;return{item:p[0]||"",qty:q,unit:c?Math.round(c/q):""}})}
const pbIsLegacy=v=>Array.isArray(v)&&v.some(x=>typeof x==="string");

/* ---- programme schedule ---- */
function pbByOpts(sel,roster){const F=pbFac().map(f=>f.n),R=[...new Set((roster||[]).filter(Boolean))],others=F.filter(n=>!R.includes(n));
 const o=n=>`<option ${n===sel?"selected":""}>${esc(n)}</option>`;
 return`<option value="">Choose</option>${R.length?`<optgroup label="Faculty on this proposal">${R.map(o).join("")}</optgroup>`:""}<optgroup label="RIC faculty">${others.map(o).join("")}</optgroup>${sel&&!R.includes(sel)&&!F.includes(sel)?`<option selected>${esc(sel)}</option>`:""}`}
function pbSchedRow(r,dis){const t=pbT(r.type),D=dis?"disabled":"";
 return`<li class="sbrow${t.brk?" brk":""}">
 <label class="sbc sbst"><span>Starts</span><input type="time" step="300" data-f="start" value="${esc(r.start||"")}" data-old="${esc(r.start||"")}" ${D}></label>
 <label class="sbc sben"><span>Ends</span><input type="time" step="300" data-f="end" value="${esc(r.end||"")}" data-old="${esc(r.end||"")}" ${D}></label>
 <label class="sbc sbty"><span>Session</span><select data-f="type" ${D}>${PB_TYPES.map(o=>`<option value="${o.k}" ${o.k===t.k?"selected":""}>${esc(o.l)}</option>`).join("")}</select></label>
 ${t.brk?`<span class="sbc sbto sbna">No topic or facilitator needed</span>`:`<label class="sbc sbto"><span>Topic${t.opt?" (optional)":""}</span><input data-f="topic" value="${esc(r.topic||"")}" placeholder="${esc(PB_PH[t.k]||"Optional")}" ${D}></label>
 <label class="sbc sbby"><span>Facilitator / speaker${t.opt?" (optional)":""}</span><select data-f="by" ${D}>${pbByOpts(r.by,[])}</select></label>`}
 <span class="sbfoot"><span class="sbdur subt"></span>${dis?"":`<span class="sbbtn"><button type="button" class="btn link" data-sb="up" aria-label="Move up">↑</button><button type="button" class="btn link" data-sb="down" aria-label="Move down">↓</button><button type="button" class="btn link" data-sb="del">Delete</button></span>`}</span></li>`}
function pbDayHtml(d,R,dis){return`<div class="sbday"><div class="sbdh"><b class="sbdn">Day ${d}</b><span class="sbsum subt"></span>${!dis&&d>1?`<button type="button" class="btn link" data-sb="rmday">Remove this day</button>`:""}</div>
 <ol class="sbrows">${R.map(r=>pbSchedRow(r,dis)).join("")}</ol>
 ${dis?"":`<div class="sbadd"><button type="button" class="btn small" data-sb="add" data-t="lecture">+ Session</button><button type="button" class="btn small" data-sb="add" data-t="break">+ Break</button></div>`}</div>`}
function pbSchedHtml(v,name,dis){let rows=pbSched(v);if(!rows.length)rows=[{day:1,type:"reg",start:"09:00",end:"09:30"},{day:1,type:"lecture",start:"09:30",end:"10:00"}];
 const n=Math.max(1,...rows.map(r=>r.day));let h=`<div class="sbw" data-sbw="sched" data-name="${esc(name)}">${pbIsLegacy(v)?`<div class="flag info">This schedule was sent as plain text. Times and sessions were read from it; check each row.</div>`:""}`;
 for(let d=1;d<=n;d++)h+=pbDayHtml(d,rows.filter(r=>r.day===d),dis);
 return h+(dis?"":`<button type="button" class="btn link" data-sb="addday">+ Add another day</button>`)+`<div class="sbtot subt"></div></div>`}
const pbRowVal=li=>{const g=f=>li.querySelector(`[data-f="${f}"]`);const type=g("type").value,brk=pbT(type).brk;return{type,start:g("start").value,end:g("end").value,topic:brk?"":(g("topic")?.value||"").trim(),by:brk?"":(g("by")?.value||"")}};
function pbReadSched(w){const out=[];w.querySelectorAll(".sbday").forEach((dy,i)=>dy.querySelectorAll(".sbrow").forEach(li=>out.push({day:i+1,...pbRowVal(li)})));return out}
function pbSchedRefresh(w){let teach=0,first=null,last=null;
 w.querySelectorAll(".sbday").forEach((dy,i)=>{dy.querySelector(".sbdn").textContent=`Day ${i+1}`;let tt=0,a=null,b=null,prevEnd=null;
  dy.querySelectorAll(".sbrow").forEach(li=>{const r=pbRowVal(li),s=pbMin(r.start),e=pbMin(r.end),ok=s!=null&&e!=null&&e>s,ov=ok&&prevEnd!=null&&s<prevEnd;
   li.querySelector(".sbdur").textContent=ok?pbDur(e-s)+(ov?" · overlaps the session above":""):s!=null&&e!=null?"Ends before it starts":"";li.classList.toggle("bad",(s!=null&&e!=null&&!ok)||ov);
   if(ok){if(!pbT(r.type).brk)tt+=e-s;a=a==null?s:Math.min(a,s);b=b==null?e:Math.max(b,e);prevEnd=e}});
  dy.querySelector(".sbsum").textContent=a!=null?`${pb12(pbHM(a))} – ${pb12(pbHM(b))} · ${pbDur(tt)} teaching`:"";teach+=tt;first=first??a;last=b??last});
 const t=w.querySelector(".sbtot");if(t)t.textContent=teach?`Total teaching time ${pbDur(teach)}, breaks excluded.`:""}
/* when a session's end time changes, later sessions that followed straight on move with it */
const pbSet=(el,v)=>{el.value=v;el.dataset.old=v};
function pbShift(li,oldEnd,newEnd){const d=pbMin(newEnd)-pbMin(oldEnd);if(isNaN(d)||!d)return;let prev=oldEnd,n=li.nextElementSibling;
 while(n){const s=n.querySelector('[data-f="start"]'),e=n.querySelector('[data-f="end"]');if(s.value!==prev)break;prev=e.value;pbSet(s,pbHM(pbMin(s.value)+d));if(e.value)pbSet(e,pbHM(pbMin(e.value)+d));n=n.nextElementSibling}}
function pbRechain(ol){let t=null;ol.querySelectorAll(".sbrow").forEach(li=>{const s=li.querySelector('[data-f="start"]'),e=li.querySelector('[data-f="end"]');const a=pbMin(s.value),b=pbMin(e.value),dur=a!=null&&b!=null&&b>a?b-a:30;
 if(t==null)t=a??540;pbSet(s,pbHM(t));pbSet(e,pbHM(t+dur));t+=dur})}

/* ---- faculty table ---- */
function pbRosterRow(r,dis){const F=pbFac(),ric=!r.ext&&(!r.inst||r.inst===PB_RIC),D=dis?"disabled":"";const known=F.some(f=>f.n===r.name);
 const sel=(f,list,v,ph)=>`<select data-f="${f}" ${D}><option value="">${ph}</option>${list.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("")}${v&&!list.includes(v)?`<option selected>${esc(v)}</option>`:""}</select>`;
 return`<li class="sbrow rrow" data-ext="${ric?0:1}">
 <label class="sbc rname"><span>${ric?"RIC faculty":"Name (external)"}</span>${ric?`<select data-f="name" ${D}><option value="">Choose</option>${F.map(f=>`<option ${f.n===r.name?"selected":""} data-d="${esc(f.d)}">${esc(f.n)}</option>`).join("")}${r.name&&!known?`<option selected>${esc(r.name)}</option>`:""}</select>`:`<input data-f="name" value="${esc(r.name||"")}" placeholder="e.g. Dr. Full Name" ${D}>`}</label>
 <label class="sbc rdes"><span>Designation</span>${sel("desig",PB_DESIG,r.desig,"Choose")}</label>
 <label class="sbc rins"><span>Institution</span><input data-f="inst" value="${esc(ric?PB_RIC:r.inst||"")}" ${ric?"readonly tabindex=-1":D} placeholder="Hospital or university"></label>
 <label class="sbc rrol"><span>Role in workshop</span>${sel("role",PB_ROLES,r.role,"Choose")}</label>
 ${dis?"":`<span class="sbfoot"><span></span><span class="sbbtn"><button type="button" class="btn link" data-sb="del">Delete</button></span></span>`}</li>`}
function pbRosterHtml(v,name,dis){let rows=pbRoster(v);if(!rows.length)rows=[{inst:PB_RIC}];
 return`<div class="sbw" data-sbw="roster" data-name="${esc(name)}"><ol class="sbrows">${rows.map(r=>pbRosterRow(r,dis)).join("")}</ol>
 ${dis?"":`<div class="sbadd"><button type="button" class="btn small" data-sb="radd">+ RIC faculty</button><button type="button" class="btn small" data-sb="radd" data-ext="1">+ External faculty</button></div>`}</div>`}
function pbReadRoster(w){return[...w.querySelectorAll(".sbrow")].map(li=>{const g=f=>(li.querySelector(`[data-f="${f}"]`)?.value||"").trim();return{name:g("name"),desig:g("desig"),inst:li.dataset.ext==="1"?g("inst"):PB_RIC,role:g("role")}}).filter(r=>r.name||r.desig||r.role||(r.inst&&r.inst!==PB_RIC))}

/* ---- items to procure ---- */
function pbItemRow(r,dis){const D=dis?"disabled":"";return`<li class="sbrow irow">
 <label class="sbc iitem"><span>Item</span><input data-f="item" value="${esc(r.item||"")}" placeholder="e.g. ECG electrodes" ${D}></label>
 <label class="sbc iqty"><span>Quantity</span><input type="number" min="1" step="1" inputmode="numeric" data-f="qty" value="${esc(r.qty??"")}" ${D}></label>
 <label class="sbc iunit"><span>Unit cost (PKR)</span><input type="number" min="0" step="1" inputmode="numeric" data-f="unit" value="${esc(r.unit??"")}" ${D}></label>
 <span class="sbc itot"><span>Line total</span><b class="ilt"></b></span>
 ${dis?"":`<span class="sbbtn"><button type="button" class="btn link" data-sb="del">Delete</button></span>`}</li>`}
function pbItemsHtml(v,name,dis,est){let rows=pbItems(v);if(!rows.length)rows=[{}];
 return`<div class="sbw" data-sbw="items" data-name="${esc(name)}" data-est="${esc(est)}"><ol class="sbrows">${rows.map(r=>pbItemRow(r,dis)).join("")}</ol>
 ${dis?"":`<div class="sbadd"><button type="button" class="btn small" data-sb="iadd">+ Item</button></div>`}<div class="sbtot"></div></div>`}
function pbReadItems(w){return[...w.querySelectorAll(".sbrow")].map(li=>{const g=f=>(li.querySelector(`[data-f="${f}"]`)?.value||"").trim();return{item:g("item"),qty:g("qty")===""?"":+g("qty"),unit:g("unit")===""?"":+g("unit")}}).filter(r=>r.item||r.qty!==""||r.unit!=="")}
const pbItemsTotal=rows=>rows.reduce((a,r)=>a+(+r.qty||0)*(+r.unit||0),0);
function pbEstBand(n){return n<25000?"Under PKR 25,000":n<=50000?"PKR 25,000 to 50,000":n<=100000?"PKR 50,000 to 100,000":"Over PKR 100,000"}
function pbItemsRefresh(w,auto){const rows=pbReadItems(w);w.querySelectorAll(".sbrow").forEach(li=>{const q=+li.querySelector('[data-f="qty"]').value||0,u=+li.querySelector('[data-f="unit"]').value||0;li.querySelector(".ilt").textContent=q&&u?pbPKR(q*u):"—"});
 const tot=pbItemsTotal(rows);w.querySelector(".sbtot").innerHTML=tot?`Estimated total <b>${pbPKR(tot)}</b>`:"";
 if(auto&&tot){const root=w.closest("form,#propform")||document,s=root.querySelector(`select[name="${CSS.escape(w.dataset.est||"")}"]`);if(s&&!s.dataset.touched){const b=pbEstBand(tot);if([...s.options].some(o=>o.value===b||o.text===b))s.value=b}}}

/* ---- shared ---- */
function pbCtrl(q,v,name,dis){if(q.type==="sched")return pbSchedHtml(v,name,dis);if(q.type==="roster")return pbRosterHtml(v,name,dis);return pbItemsHtml(v,name,dis,name.slice(0,name.length-q.k.length)+"estCost")}
function pbRead(root,q,name){const w=root.querySelector(`.sbw[data-name="${CSS.escape(name)}"]`);if(!w)return[];return q.type==="sched"?pbReadSched(w):q.type==="roster"?pbReadRoster(w):pbReadItems(w)}
function pbSyncFacs(root){root=root||document;const R=[];root.querySelectorAll('.sbw[data-sbw="roster"] .sbrow [data-f="name"]').forEach(x=>{const n=x.value.trim();if(n)R.push(n)});
 root.querySelectorAll('.sbw[data-sbw="sched"] select[data-f="by"]').forEach(s=>{if(s.disabled)return;const v=s.value;s.innerHTML=pbByOpts(v,R)})}
function pbInit(w){if(w.dataset.init)return;w.dataset.init=1;if(w.dataset.sbw==="sched"){pbSyncFacs(w.closest("form,#propform")||document);pbSchedRefresh(w)}if(w.dataset.sbw==="items")pbItemsRefresh(w,false);if(w.dataset.sbw==="roster")pbSyncFacs(w.closest("form,#propform")||document)}
new MutationObserver(()=>document.querySelectorAll(".sbw:not([data-init])").forEach(pbInit)).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener("click",e=>{const b=e.target.closest("[data-sb]");if(!b)return;const w=b.closest(".sbw");if(!w)return;e.preventDefault();const a=b.dataset.sb,li=b.closest(".sbrow"),root=w.closest("form,#propform")||document;
 if(w.dataset.sbw==="sched"){
  if(a==="add"){const ol=b.closest(".sbday").querySelector(".sbrows"),lastE=[...ol.querySelectorAll('[data-f="end"]')].pop()?.value,t=b.dataset.t,s=lastE||"09:00";
   ol.insertAdjacentHTML("beforeend",pbSchedRow({type:t,start:s,end:pbHM(pbMin(s)+pbT(t).d)},false));pbSyncFacs(root);ol.lastElementChild.querySelector(t==="break"?'[data-f="type"]':'[data-f="topic"]')?.focus()}
  if(a==="del"&&li){li.remove()}
  if((a==="up"||a==="down")&&li){const ol=li.parentElement;if(a==="up"&&li.previousElementSibling)ol.insertBefore(li,li.previousElementSibling);if(a==="down"&&li.nextElementSibling)ol.insertBefore(li.nextElementSibling,li);pbRechain(ol)}
  if(a==="addday"){const days=w.querySelectorAll(".sbday");days[days.length-1].insertAdjacentHTML("afterend",pbDayHtml(days.length+1,[{type:"lecture",start:"09:00",end:"09:30"}],false));pbSyncFacs(root)}
  if(a==="rmday")b.closest(".sbday").remove();
  pbSchedRefresh(w);return}
 if(w.dataset.sbw==="roster"){if(a==="radd"){w.querySelector(".sbrows").insertAdjacentHTML("beforeend",pbRosterRow(b.dataset.ext?{ext:1,inst:""}:{inst:PB_RIC},false));w.querySelector(".sbrows").lastElementChild.querySelector('[data-f="name"]').focus()}
  if(a==="del"&&li)li.remove();pbSyncFacs(root);return}
 if(w.dataset.sbw==="items"){if(a==="iadd"){w.querySelector(".sbrows").insertAdjacentHTML("beforeend",pbItemRow({},false));w.querySelector(".sbrows").lastElementChild.querySelector('[data-f="item"]').focus()}
  if(a==="del"&&li)li.remove();pbItemsRefresh(w,true)}});
document.addEventListener("change",e=>{const t=e.target;if(t.tagName==="SELECT"&&/estCost$/.test(t.name||""))t.dataset.touched=1;
 const w=t.closest&&t.closest(".sbw");if(!w||!t.dataset.f)return;const li=t.closest(".sbrow"),root=w.closest("form,#propform")||document;
 if(w.dataset.sbw==="sched"){
  if(t.dataset.f==="type"){const r=pbRowVal(li),s=pbMin(r.start),e2=pbMin(r.end),old=li.dataset.type||"";const prevDur=s!=null&&e2!=null?e2-s:null;
   const oldEnd=r.end;if(s!=null&&(prevDur==null||PB_TYPES.some(x=>x.d===prevDur)))r.end=pbHM(s+pbT(r.type).d);
   const tmp=document.createElement("ol");tmp.innerHTML=pbSchedRow(r,false);const nl=tmp.firstElementChild;li.replaceWith(nl);if(oldEnd&&r.end!==oldEnd)pbShift(nl,oldEnd,r.end);pbSyncFacs(root);nl.querySelector(`[data-f="${pbT(r.type).brk?"type":"topic"}"]`)?.focus()}
  if(t.dataset.f==="end"){if(t.dataset.old&&t.value)pbShift(li,t.dataset.old,t.value);t.dataset.old=t.value}
  if(t.dataset.f==="start"){if(t.dataset.old&&t.value){const d=pbMin(t.value)-pbMin(t.dataset.old),e=li.querySelector('[data-f="end"]');if(d&&e.value){const oe=e.value;pbSet(e,pbHM(pbMin(oe)+d));pbShift(li,oe,e.value)}}t.dataset.old=t.value}
  pbSchedRefresh(w);return}
 if(w.dataset.sbw==="roster"){if(t.dataset.f==="name"&&t.tagName==="SELECT"){const d=t.selectedOptions[0]?.dataset.d,ds=li.querySelector('[data-f="desig"]');if(d&&ds&&!ds.value){if(![...ds.options].some(o=>o.text===d))ds.insertAdjacentHTML("beforeend",`<option>${esc(d)}</option>`);ds.value=d}}pbSyncFacs(root);return}
 if(w.dataset.sbw==="items")pbItemsRefresh(w,true)});
document.addEventListener("input",e=>{const t=e.target,w=t.closest&&t.closest(".sbw");if(!w)return;if(w.dataset.sbw==="items")pbItemsRefresh(w,true);if(w.dataset.sbw==="roster"&&t.dataset.f==="name")pbSyncFacs(w.closest("form,#propform")||document);if(w.dataset.sbw==="sched")pbSchedRefresh(w)});

/* checks run when the form is submitted */
function pbCheck(q,v,vals){const E=[];
 if(q.type==="sched"){const rows=pbSched(v),n=Math.max(1,...rows.map(r=>r.day));
  for(let d=1;d<=n;d++){const R=rows.filter(r=>r.day===d),pre=n>1?`Day ${d}, `:"";if(!R.length){E.push(`Programme schedule: Day ${d} has no sessions`);continue}
   if(!R.some(r=>!pbT(r.type).brk&&!pbT(r.type).opt))E.push(`Programme schedule: ${pre||""}add at least one teaching session`);let prev=null;
   R.forEach((r,i)=>{const s=pbMin(r.start),e=pbMin(r.end),t=pbT(r.type),at=`Programme schedule, ${pre}session ${i+1} (${t.l})`;
    if(s==null||e==null)E.push(`${at}: enter the start and end time`);else if(e<=s)E.push(`${at}: ends before it starts`);else{if(prev!=null&&s<prev)E.push(`${at}: starts before the previous session ends`);if(s<7*60||e>21*60)E.push(`${at}: check the time (am or pm)`);prev=e}
    if(!t.brk&&!t.opt){if(!r.topic)E.push(`${at}: add the topic`);if(!r.by)E.push(`${at}: choose the facilitator`)}})}
  if(vals&&vals.length){const two=/two/i.test(vals.length);if(two&&n<2)E.push("Length is two days, so add Day 2 to the programme schedule");if(!two&&n>1)E.push(`Length is “${vals.length}”, but the programme schedule has ${n} days`)}}
 if(q.type==="roster"){const rows=pbRoster(v);rows.forEach((r,i)=>{const at=`Faculty, row ${i+1}${r.name?` (${r.name})`:""}`;if(!r.name)E.push(`${at}: add the name`);if(!r.desig)E.push(`${at}: choose the designation`);if(!r.inst)E.push(`${at}: add the institution`);if(!r.role)E.push(`${at}: choose the role`)});
  const seen=new Set();rows.forEach(r=>{const k=r.name.toLowerCase().replace(/^(prof\.?\s*)?(dr\.?\s*)?/,"").replace(/\s+/g," ");if(k&&seen.has(k))E.push(`Faculty: ${r.name} is listed twice`);seen.add(k)})}
 if(q.type==="items")pbItems(v).forEach((r,i)=>{const at=`Items to procure, row ${i+1}`;if(!r.item)E.push(`${at}: add the item name`);if(!(+r.qty>0))E.push(`${at}: enter the quantity`);if(r.unit===""||!(+r.unit>=0))E.push(`${at}: enter the unit cost (0 if donated)`)});
 return E}

/* read-only views and text for exports */
function pbShow(q,v){if(pbIsLegacy(v))return`<ul class="cm">${v.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;
 if(q.type==="sched"){const rows=pbSched(v),n=Math.max(1,...rows.map(r=>r.day));return`<table class="sbshow"><tbody>${Array.from({length:n},(_,i)=>i+1).map(d=>`${n>1?`<tr><th colspan="3">Day ${d}</th></tr>`:""}${rows.filter(r=>r.day===d).map(r=>{const t=pbT(r.type);return`<tr class="${t.brk?"brk":""}"><td class="tm">${esc(pb12(r.start))}–${esc(pb12(r.end))}</td><td><b>${esc(t.l)}</b>${r.topic?`<div>${esc(r.topic)}</div>`:""}</td><td>${esc(r.by||"")}</td></tr>`}).join("")}`).join("")}</tbody></table>`}
 if(q.type==="roster")return`<ul class="cm">${pbRoster(v).map(r=>`<li><b>${esc(r.name)}</b>, ${esc(r.desig)}, ${esc(r.inst===PB_RIC?"RIC":r.inst)}${r.role?` · ${esc(r.role)}`:""}</li>`).join("")}</ul>`;
 const rows=pbItems(v);return`<ul class="cm">${rows.map(r=>`<li>${esc(r.item)} × ${esc(r.qty)}${r.unit!==""?` @ ${pbPKR(r.unit)} = ${pbPKR((+r.qty||0)*(+r.unit||0))}`:""}</li>`).join("")}</ul>${rows.length?`<b>Total ${pbPKR(pbItemsTotal(rows))}</b>`:""}`}
function pbText(q,v){if(pbIsLegacy(v))return v.join("; ");
 if(q.type==="sched"){const rows=pbSched(v),n=Math.max(1,...rows.map(r=>r.day));return rows.map(r=>{const t=pbT(r.type);return`${n>1?`Day ${r.day} `:""}${r.start}–${r.end} ${t.l}${r.topic?": "+r.topic:""}${r.by?" ("+r.by+")":""}`}).join("; ")}
 if(q.type==="roster")return pbRoster(v).map(r=>`${r.name} (${r.desig}, ${r.inst===PB_RIC?"RIC":r.inst})${r.role?" – "+r.role:""}`).join("; ");
 const rows=pbItems(v);return rows.map(r=>`${r.item} × ${r.qty}${r.unit!==""?` @ ${pbPKR(r.unit)}`:""}`).join("; ")+(rows.length?`; Total ${pbPKR(pbItemsTotal(rows))}`:"")}

/* proposal forms saved before this version used free-text lists */
function pbUpgrade(w){let ch=false;(w&&w.pfq||[]).forEach(q=>{const nq=PB_DEF[q.k];if(nq&&q.type==="list"){q.type=nq.type;q.d=nq.d;if(nq.map)q.map=1;q.opts=[];ch=true}});return ch}
const PB_DEF={
 faculty:{type:"roster",map:1,d:"Choose RIC faculty from the list. Add external faculty with their institution. Everyone listed here can be picked as a facilitator in the schedule and gets a certificate."},
 schedule:{type:"sched",map:1,d:"Add sessions in order with start and end times. A new session starts when the one above ends; change an end time and the sessions after it move with it."},
 resources:{type:"items",d:"Leave out items already available at RIC. The estimated total cost below is filled in from these lines."}};


/* ---- default forms ---- */
function defFbQ(){return[
 Q("role","You are a","dd",{opts:["PGT","Medical officer","Consultant","Nurse","Allied health professional","Medical student"],other:true,req:true,section:"About you"}),
 Q("inst","Your institution","dd",{opts:["Rawalpindi Institute of Cardiology","Holy Family Hospital","Benazir Bhutto Hospital","DHQ Hospital Rawalpindi","Combined Military Hospital","Rawalpindi Medical University"],other:true,section:"About you"}),
 Q("year","Year of training","dd",{opts:["Not in training","Year 1","Year 2","Year 3","Year 4","Year 5"],section:"About you"}),
 ...FB_ITEMS.map(([k,l])=>Q(k,l,"scale",{req:true,minL:"Poor",maxL:"Excellent",section:"Rate the workshop"})),
 Q("pre","Your confidence in this skill before the workshop","scale",{minL:"Not confident",maxL:"Very confident",section:"Your learning"}),
 Q("post","Your confidence in this skill after the workshop","scale",{minL:"Not confident",maxL:"Very confident",section:"Your learning"}),
 Q("dur","The length of the workshop was","mc",{opts:["Too short","About right","Too long"],section:"Your learning"}),
 Q("rec","Would you recommend this workshop to a colleague?","mc",{opts:["Yes","Maybe","No"],req:true,section:"Your learning"}),
 Q("useful","Which parts were most useful?","cb",{opts:["Lectures","Hands-on stations","Live or video demonstrations","Case discussions","Simulation","Handouts"],other:true,section:"Your comments",d:"Tick all that apply"}),
 Q("improve","What should we improve?","cb",{opts:["More hands-on time","Smaller groups per station","Better time keeping","More case discussions","Better venue and audio-visual","Share material in advance"],other:true,section:"Your comments",d:"Tick all that apply"}),
 Q("topics","Topics you would like in future workshops","cb",{opts:["@workshops"],other:true,section:"Your comments"}),
 Q("comments","Any other comments","para",{section:"Your comments"})]}
const AUD2=["Cardiology PGTs","Cardiac Surgery PGTs","Anaesthesia PGTs","Medical officers","House officers","Consultants","Nurses","Perfusionists","Allied health staff","Medical students"];
function defPfQ(){const L=true;return[
 Q("title","Workshop title","short",{req:L,map:1,section:"Workshop"}),
 Q("dept","Lead department","dd",{opts:["@depts"],req:L,map:1,section:"Workshop"}),
 Q("collab","Collaborating departments","cb",{opts:["@depts"],section:"Workshop",d:"Tick any that will take part"}),
 Q("date","Proposed date","date",{req:L,map:1,section:"Workshop"}),
 Q("altDate","Alternate date","date",{section:"Workshop"}),
 Q("length","Length","dd",{opts:["Half day (up to 4 hours)","Full day","Two days"],req:L,section:"Workshop"}),
 Q("venue","Venue","dd",{opts:["Auditorium","Skills lab","Operating theatre","Cath lab","Seminar room"],other:true,req:L,map:1,section:"Workshop"}),
 Q("format","Format","mc",{opts:FORMATS.slice(),req:L,map:1,section:"Workshop"}),
 Q("focal","Academic focal person","dd",{opts:["@faculty"],other:true,req:L,map:1,section:"People"}),
 Q("focalDesig","Focal person's designation","dd",{opts:["Professor","Associate Professor","Assistant Professor","Senior Registrar"],other:true,req:L,section:"People"}),
 Q("focalMobile","Focal person's mobile","short",{req:L,d:"Format 03xx-xxxxxxx",section:"People"}),
 Q("director","Course director","dd",{opts:["@faculty"],other:true,req:L,map:1,section:"People",d:"Receives the course director's share of net income"}),
 Q("faculty","Faculty and facilitators","roster",{req:L,map:1,section:"People",d:PB_DEF.faculty.d}),
 Q("audience","Target audience","cb",{opts:AUD2.slice(),other:true,req:L,section:"Audience"}),
 Q("seats","Maximum seats","num",{req:L,map:1,section:"Audience"}),
 Q("ricSeats","Seats reserved for RIC","num",{section:"Audience"}),
 Q("fee","Suggested registration fee","dd",{opts:["Free","PKR 1,000","PKR 2,000","PKR 3,000","PKR 5,000"],other:true,map:1,section:"Audience",d:"Final fee is decided by the Office of the Executive Director and the DME"}),
 Q("objectives","Learning objectives","list",{req:L,section:"Learning plan",d:"One per line, each starting with an action verb (demonstrate, interpret, perform…)"}),
 Q("assessment","Assessment method","cb",{opts:["Pre/post MCQ test","Skills checklist / DOPS","OSCE station","Case presentation","No formal assessment"],req:L,section:"Learning plan"}),
 Q("handouts","Handouts or reading material","mc",{opts:["Printed","Digital (PDF)","Both","None"],req:L,section:"Learning plan"}),
 Q("cme","Request CME accreditation?","mc",{opts:["Yes","No"],req:L,section:"Learning plan"}),
 Q("schedule","Programme schedule","sched",{req:L,map:1,section:"Schedule",d:PB_DEF.schedule.d}),
 Q("equip","Equipment needed","cb",{opts:["Simulator or manikin","Wet lab / animal tissue","Ultrasound or echo machine","Consumables","Projector and sound","Laptops"],other:true,section:"Resources"}),
 Q("resources","Items to procure","items",{section:"Resources",d:PB_DEF.resources.d}),
 Q("estCost","Estimated total cost","dd",{opts:["Under PKR 25,000","PKR 25,000 to 50,000","PKR 50,000 to 100,000","Over PKR 100,000"],req:L,section:"Resources"}),
 Q("sponsor","Sponsorship","mc",{opts:["No sponsor","Consumables","Equipment","Catering","More than one of these"],req:L,section:"Sponsorship",d:"Sponsors have no role in topics, speakers or content"}),
 Q("sponsorName","Sponsoring company","short",{section:"Sponsorship"})]}
function exampleResponses(n){const r=rng(7),pick1=a=>a[Math.floor(r()*a.length)],sc=lo=>Math.min(5,Math.max(1,Math.round(lo+r()*(5.4-lo)))),some=(a,k)=>[...a].sort(()=>r()-.5).slice(0,k);
 return Array.from({length:n},(_,i)=>{const a={role:pick1(["PGT","PGT","PGT","Medical officer","Medical officer","Nurse","Medical student"]),inst:pick1(["Rawalpindi Institute of Cardiology","Rawalpindi Institute of Cardiology","Holy Family Hospital","Benazir Bhutto Hospital","DHQ Hospital Rawalpindi"]),year:pick1(["Year 1","Year 2","Year 3","Not in training"])};
  FB_ITEMS.forEach(([k])=>a[k]=sc(k==="time"?2.6:k==="venue"?3:3.4));a.pre=Math.max(1,sc(1.2)-1);a.post=sc(3.6);a.dur=pick1(["About right","About right","About right","Too short"]);a.rec=r()<.86?"Yes":r()<.6?"Maybe":"No";
  a.useful=some(["Hands-on stations","Case discussions","Lectures","Handouts"],1+Math.floor(r()*2));a.improve=some(["More hands-on time","Smaller groups per station","Share material in advance","Better time keeping"],1+Math.floor(r()*2));
  a.topics=some(["Transthoracic Echocardiography (TTE)","Cardiology TOACS","Inotropes & Vasopressors","Airway Management"],1+Math.floor(r()*2));a.comments=i%7===0?pick1(["Very well organised","Please run this again for house officers","More ECG strips to practise on"]):"";
  return{at:`2026-09-19T${String(13+Math.floor(i/10)).padStart(2,"0")}:${String(5+i%50).padStart(2,"0")}:00Z`,a}})}

/* ---- feedback summary + report ---- */
const f1=v=>v==null||isNaN(v)?"—":v.toFixed(1);
function fbSummary(w){const R=w.fbResp||[];if(!R.length)return null;const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
 const qs=w.fbq.map(q=>{const vals=R.map(r=>r.a?.[q.k]).filter(v=>!qEmpty(v));const o={q,n:vals.length};
  if(q.type==="scale"){const nums=vals.map(Number);o.avg=avg(nums);o.dist=[];for(let i=+q.min;i<=+q.max;i++)o.dist.push(nums.filter(x=>x===i).length)}
  else if(CHOICE.has(q.type)){const c={},oth=[];vals.flatMap(v=>Array.isArray(v)?v:[v]).forEach(v=>{const k=isOther(v)?"Other":v;c[k]=(c[k]||0)+1;if(isOther(v)&&v.length>7)oth.push(v.replace(/^Other:\s*/,""))});o.counts=Object.entries(c).sort((a,b)=>b[1]-a[1]);o.others=oth}
  else if(q.type==="num"){o.avg=avg(vals.map(Number))}
  else{const c={};vals.flatMap(v=>Array.isArray(v)?v:[v]).forEach(t=>{t=String(t).trim();c[t]=(c[t]||0)+1});o.texts=Object.entries(c).sort((a,b)=>b[1]-a[1])}
  return o});
 const rating=qs.filter(x=>x.q.type==="scale"&&!["pre","post"].includes(x.q.k)&&x.n);
 const by=k=>qs.find(x=>x.q.k===k);const ov=by("overall");const rec=by("rec");
 return{n:R.length,rate:w.reg.attended?Math.round(R.length/w.reg.attended*100):null,qs,rating,overall:ov&&ov.n?ov.avg:avg(rating.map(x=>x.avg)),mean:avg(rating.map(x=>x.avg)),
  pre:by("pre")?.avg??null,post:by("post")?.avg??null,rec:rec&&rec.n?Math.round(((rec.counts.find(c=>c[0]==="Yes")||[0,0])[1])/rec.n*100):null,
  low:rating.filter(x=>x.avg/(+x.q.max)*5<3.5).map(x=>x.q.t)}}
function cbars(o,total){const mx=Math.max(1,...o.counts.map(c=>c[1]));return`<ul class="cbars">${o.counts.slice(0,8).map(([k,n])=>`<li><span>${esc(k)}</span><span class="cbar"><i style="width:${n/mx*100}%"></i></span><b>${n}</b></li>`).join("")}</ul>${o.others.length?`<p class="subt" style="margin:4px 0 0">Other: ${o.others.slice(0,4).map(esc).join("; ")}</p>`:""}`}
function fbPanel(w,S){const blocks=S.qs.filter(x=>x.n&&x.q.type!=="scale"&&!(["pre","post","rec"].includes(x.q.k)));
 return`<div class="panel" style="display:grid;gap:12px"><div class="head"><h3 style="margin:0">Feedback summary · ${S.n} responses${S.rate!=null?` (${S.rate}% of attendees)`:""}</h3>${xbtn("ws:"+w.id,"Download responses")}</div>
 <div class="kpis small"><div class="kpi"><span class="n">${f1(S.overall)}</span><span class="l">Overall rating / 5</span></div>${S.rec!=null?`<div class="kpi"><span class="n">${S.rec}%</span><span class="l">Would recommend</span></div>`:""}${S.pre!=null&&S.post!=null?`<div class="kpi"><span class="n">${f1(S.pre)} → ${f1(S.post)}</span><span class="l">Self-rated confidence, before → after</span></div>`:""}</div>
 ${S.rating.length?`<div class="fbrows">${S.rating.map(x=>`<div class="fbrow"><span>${esc(x.q.t)}</span>${bars(x.dist)}<b class="${x.avg/(+x.q.max)*5<3.5?"d-red":""}">${f1(x.avg)}</b></div>`).join("")}</div>
 <div class="legend"><span><i style="background:var(--bad)"></i>Lowest</span><span><i style="background:var(--gold)"></i>Middle</span><span><i style="background:var(--ok)"></i>Highest</span></div>`:""}
 ${blocks.length?`<div class="cols three">${blocks.map(x=>`<div><b style="font-size:13.5px">${esc(x.q.t)}</b> <span class="subt">${x.n} answered</span>${x.counts?cbars(x):x.avg!=null?`<p style="margin:4px 0 0">Average ${f1(x.avg)}</p>`:`<ul class="cm">${x.texts.slice(0,5).map(([t,n])=>`<li>${esc(t)}${n>1?` <span class="code">×${n}</span>`:""}</li>`).join("")}</ul>`}</div>`).join("")}</div>`:""}</div>`}
function reportText(w,F,S){const L=[];const yy=(w.date||w.month).slice(2,4),num=w.id.replace(/\D/g,"").padStart(2,"0");
 L.push(`WORKSHOP REPORT: ${w.title.toUpperCase()}`,`Rawalpindi Institute of Cardiology · Department of Medical Education`,``,`1. DETAILS`,`Date: ${fd(w.date)}   Venue: ${w.venue||"RIC"}   Format: ${w.format||"—"}`,`Lead department: ${w.dept}`,`Focal person: ${w.focal||"—"}   Course director: ${w.director||w.focal||"—"}`,``,
 `2. PARTICIPATION`,`Seats ${w.seats??"—"} · registered ${w.reg.registered} · paid ${w.reg.paid} · attended ${w.reg.attended}${w.reg.registered?` (${Math.round(w.reg.attended/w.reg.registered*100)}% of registered)`:""}`,`Certificates issued: ${w.certs}${w.certs?` (RIC/DME/${yy}/${num}/001 to /${String(w.certs).padStart(3,"0")})`:""}`,``,`3. FEEDBACK`);
 if(S){L.push(`${S.n} responses (${S.rate??"—"}% of attendees). Overall ${f1(S.overall)}/5${S.rec!=null?`; ${S.rec}% would recommend`:""}.`);if(S.pre!=null&&S.post!=null)L.push(`Self-rated confidence: ${f1(S.pre)} before, ${f1(S.post)} after.`);
  S.rating.forEach(x=>L.push(`  ${x.q.t}: ${f1(x.avg)}`));if(S.low.length)L.push(`Below 3.5: ${S.low.join("; ")}.`);
  S.qs.filter(x=>x.counts&&x.n&&x.q.k!=="rec").forEach(x=>L.push(`${x.q.t}: ${x.counts.slice(0,3).map(([k,n])=>`${k} (${n})`).join(", ")}`));
  S.qs.filter(x=>x.texts&&x.n).forEach(x=>L.push(`${x.q.t}: ${x.texts.slice(0,3).map(t=>t[0]).join("; ")}`))}
 else L.push("No feedback recorded.");
 L.push(``,`4. FINANCIAL STATEMENT (PKR)`,`Income`,`  Registration fees${w.feeCollected!=null?" (amount collected)":w.fee?` (${w.reg.paid} × ${(+w.fee).toLocaleString()})`:" (free workshop)"}: ${F.fees.toLocaleString()}`);
 (w.incomes||[]).forEach(x=>L.push(`  ${x.source}${x.note?" ("+x.note+")":""}: ${(+x.amount).toLocaleString()}`));L.push(`  Total income: ${F.totalIn.toLocaleString()}`,`Expenses`);
 Object.entries(F.byCat).forEach(([c,es])=>{L.push(`  ${c}: ${es.reduce((s,e)=>s+(+e.amount),0).toLocaleString()}`);es.forEach(e=>e.item&&L.push(`    - ${e.item}: ${(+e.amount).toLocaleString()}`))});
 L.push(`  Total expenses: ${F.totalOut.toLocaleString()}`,`Net income: ${F.net.toLocaleString()}`,F.net>0?`Distribution: course director ${w.director||w.focal||""} ${F.share}% = ${F.dir.toLocaleString()}; DME fund ${100-F.share}% = ${F.dme.toLocaleString()}`:`Distribution: none (net income is not positive)`,``,`Prepared by: ${SELF}, Director of Medical Education, Rawalpindi Institute of Cardiology`);
 return L.join("\n")}
function reportDoc(w,F,S){const pct=w.reg.registered?Math.round(w.reg.attended/w.reg.registered*100):null;
 return`<article class="panel report"><div class="head"><div><div class="code">Post-workshop report${w.stage===5?" · draft":" · final"}</div><h2 style="font-size:22px">${esc(w.title)}</h2></div><div class="actions"><button class="btn small" data-act="ws-copyrep">Copy report as text</button>${xbtn("ws:"+w.id)}</div></div>
 <textarea id="repsrc" hidden>${esc(reportText(w,F,S))}</textarea>
 <h4>1 · Details</h4><dl class="kv"><dt>Date and venue</dt><dd>${fd(w.date)} · ${esc(w.venue)||"RIC"}</dd><dt>Department</dt><dd>${esc(w.dept)}</dd><dt>Focal person</dt><dd>${esc(w.focal)||"—"}</dd><dt>Course director</dt><dd>${esc(w.director||w.focal)||"—"}</dd></dl>
 <h4>2 · Participation</h4><dl class="kv"><dt>Registered / seats</dt><dd>${w.reg.registered} / ${w.seats??"—"}</dd><dt>Paid</dt><dd>${w.reg.paid}</dd><dt>Attended</dt><dd>${w.reg.attended}${pct!=null?` (${pct}%)`:""}</dd><dt>Certificates</dt><dd>${w.certs}</dd></dl>
 <h4>3 · Feedback</h4>${S?`<p>${S.n} responses${S.rate!=null?` (${S.rate}% of attendees)`:""}. Overall <b>${f1(S.overall)}/5</b>${S.rec!=null?`, ${S.rec}% would recommend`:""}.${S.pre!=null&&S.post!=null?` Self-rated confidence went from ${f1(S.pre)} to ${f1(S.post)}.`:""}${S.low.length?` Below 3.5: ${S.low.map(esc).join("; ")}.`:" All rated items scored 3.5 or above."}</p>
  ${S.qs.filter(x=>x.counts&&x.n&&x.q.k!=="rec").map(x=>`<p class="subt" style="margin:0"><b style="color:var(--ink);font-weight:600">${esc(x.q.t)}</b> ${x.counts.slice(0,3).map(([k,n])=>`${esc(k)} (${n})`).join(", ")}</p>`).join("")}`:`<p class="subt">No feedback responses yet. Open the feedback form and share the QR code.</p>`}
 <h4>4 · Financial statement</h4><div class="tblwrap"><table class="fin"><tbody>
  <tr><td>Registration fees${w.feeCollected!=null?" (amount collected)":w.fee?` (${w.reg.paid} × ${money(w.fee)})`:" (free)"}</td><td class="num">${money(F.fees)}</td></tr>
  ${(w.incomes||[]).map(x=>`<tr><td>${esc(x.source)}${x.note?` · ${esc(x.note)}`:""}</td><td class="num">${money(x.amount)}</td></tr>`).join("")}
  <tr class="tot"><td>Total income</td><td class="num">${money(F.totalIn)}</td></tr>
  ${Object.entries(F.byCat).map(([c,es])=>`<tr><td>${esc(c)}${es.some(e=>e.item)?`<div class="subt">${es.map(e=>esc(e.item||"")).filter(Boolean).join(" · ")}</div>`:""}</td><td class="num">− ${money(es.reduce((s,e)=>s+(+e.amount),0))}</td></tr>`).join("")}
  <tr class="tot"><td>Total expenses</td><td class="num">− ${money(F.totalOut)}</td></tr><tr class="tot"><td>Net income</td><td class="num">${money(F.net)}</td></tr>
  <tr><td>Course director · ${esc(w.director||w.focal)||"—"} (${F.share}%)</td><td class="num"><b>${money(F.dir)}</b></td></tr><tr><td>DME fund (${100-F.share}%)</td><td class="num"><b>${money(F.dme)}</b></td></tr></tbody></table></div>
 <p class="subt" style="margin:0">Prepared by ${SELF}, Director of Medical Education</p></article>`}
EXPORTS.ws=id=>{const w=DB.workshops.find(x=>x.id===id),F=fin(w);
 const resp=(w.fbResp||[]).map(r=>{const o={"Submitted":new Date(r.at).toLocaleString("en-GB")};w.fbq.forEach(q=>o[q.t]=qText(q,r.a?.[q.k]));return o});
 const finRows=[["Item","Category","Amount (PKR)"],["Registration fees","Income",F.fees],...(w.incomes||[]).map(x=>[x.source+(x.note?" · "+x.note:""),"Income",x.amount]),["Total income","",F.totalIn],...w.expenses.map(e=>[e.item||e.cat,e.cat,-e.amount]),["Total expenses","",-F.totalOut],["Net income","",F.net],[`Course director (${F.share}%)`,"",F.dir],[`DME fund (${100-F.share}%)`,"",F.dme]];
 const prop=w.proposal?[["Field","Proposed","Affirmed by DME"],...w.pfq.map(q=>[q.t,qText(q,w.proposal.submitted.values[q.k]),qText(q,w.proposal.final[q.k])])]:[["No proposal submitted"]];
 return{file:`${w.title} ${w.date||w.month}`,sheets:[{name:"Report",rows:reportText(w,F,fbSummary(w)).split("\n").map(l=>[l])},{name:"Finance",rows:finRows},sheetFrom("Feedback responses",resp),{name:"Proposal",rows:prop}]}};

/* ---- participant feedback view ---- */
UI.fbDone=null;
const formHead=(w,title,sub)=>`<div class="fbhead"><img src="${document.querySelector(".appbar img").src}" alt=""><div><div class="subt">Rawalpindi Institute of Cardiology · Medical Education</div><h2>${esc(title)}</h2><div class="subt">${sub}</div></div></div>`;
function vFb(){const w=DB.workshops.find(x=>x.id===route.id);if(!w)return`<div class="panel">Form not found.</div>`;
 const back=`<div class="flag info">Participant view. This is what people see after scanning the QR code. <a href="#ws-${w.id}">Back to the workshop</a></div>`;
 if(UI.fbDone===w.id)return back+`<div class="panel fbform"><h2>Thank you</h2><p>Your feedback for <b>${esc(w.title)}</b> has been recorded.</p><div class="actions"><button class="btn" data-act="fb-again">Submit another response (testing)</button><a class="btn" href="#ws-${w.id}">See the summary</a></div></div>`;
 if(!w.fbOpen)return back+`<div class="panel fbform"><h2>${esc(w.title)}</h2><p>This feedback form is closed. Open it from the workshop page to accept responses.</p></div>`;
 return back+`<form class="panel fbform" id="fbform" novalidate>${formHead(w,w.title,`${fd(w.date)} · Workshop feedback · anonymous`)}${formHtml(w.fbq,{},"fb-",false)}<div class="err" id="fberr" role="alert"></div><button class="btn primary" type="button" data-act="fb-submit" style="justify-self:start">Submit feedback</button></form>`}
function submitFb(){const w=DB.workshops.find(x=>x.id===route.id),fm=document.getElementById("fbform");const{vals,missing}=formRead(fm,w.fbq,"fb-");
 if(missing.length){document.getElementById("fberr").textContent="Please answer: "+missing.map(q=>q.t).join("; ");return}
 w.fbResp.push({at:new Date().toISOString(),a:vals});persist();UI.fbDone=w.id;render();window.scrollTo(0,0)}

/* ---- shared form editor ---- */
UI.fd=null;
function vFormEdit(kind){const w=DB.workshops.find(x=>x.id===route.id);if(!w)return`<div class="panel">Not found.</div>`;const key={fb:"fbq",pf:"pfq",rg:"rgq"}[kind];if(!w[key])w[key]=kind==="rg"?defRgQ():kind==="fb"?defFbQ():defPfQ();
 if(!UI.fd||UI.fd.id!==w.id||UI.fd.kind!==kind)UI.fd={id:w.id,kind,qs:JSON.parse(JSON.stringify(w[key]))};const qs=UI.fd.qs;
 const secs=[...new Set(qs.map(q=>q.section).filter(Boolean))];
 const warn=kind==="rg"?(regsOf(w).length?`${regsOf(w).length} people have already registered. Changes apply to new registrations.`:""):kind==="fb"?((w.fbResp||[]).length?`${w.fbResp.length} responses already received. Answers to removed questions are kept in downloads but leave the summary.`:""):(w.proposal?"A proposal has already been submitted. Changes apply if the form is sent again.":"");
 return`<div><a href="#ws-${w.id}" class="btn link" style="padding-left:0">← ${esc(w.title)}</a></div>
 <div class="head"><div><h2>${{fb:"Feedback form",pf:"Proposal form",rg:"Registration form"}[kind]}</h2><p>${kind==="rg"?"Questions people answer when registering. Payment details are added automatically when the workshop has a fee.":kind==="fb"?"Questions participants answer after the workshop. The QR code and link stay the same.":"Questions the focal person answers (Form RIC/ME&amp;T/F-06). Questions marked “Used by the app” fill the workshop's date, venue, seats, fee and people when approved."} Prefer dropdowns, multiple choice and checkboxes so answers group cleanly.</p></div>
  <div class="actions"><button class="btn" data-act="fe-reset">Reset to standard</button><a class="btn" href="#${{fb:"fb",pf:"pfill",rg:"reg"}[kind]}-${w.id}">Preview</a><button class="btn primary" data-act="fe-save">Save form</button></div></div>
 ${warn?`<div class="flag">${warn}</div>`:""}
 ${kind==="rg"?`<div class="panel" style="display:grid;gap:8px"><label class="f">Text at the top of the form <span class="h">date, time, venue, who should attend, what to bring</span><textarea id="fe-desc" rows="5">${esc(w.regDesc||"")}</textarea></label></div>`:""}
 <datalist id="fe-secs">${secs.map(s=>`<option value="${esc(s)}">`).join("")}</datalist>
 <div class="qcards">${qs.map((q,i)=>qCard(q,i,qs.length)).join("")}</div>
 <div class="actions"><button class="btn primary" data-act="fe-add">Add question</button><button class="btn" data-act="fe-save">Save form</button></div>`}
function qCard(q,i,n){const ch=CHOICE.has(q.type);
 return`<div class="qcard" data-qi="${i}"><div class="qc-top"><span class="code">${i+1}</span><input data-qf="t" value="${esc(q.t)}" placeholder="Question" aria-label="Question ${i+1}"><select data-qf="type" ${q.map?"disabled":""} aria-label="Question type">${opt(QTYPES,q.type)}</select></div>
 <input data-qf="d" value="${esc(q.d)}" placeholder="Description or help text (optional)" aria-label="Description">
 ${ch?`<label class="f"><span class="h">Options, one per line. ${Object.entries(OPT_TOKENS).map(([k,v])=>`<code>${k}</code> = ${v[0].toLowerCase()}`).join(", ")}.</span><textarea data-qf="opts" rows="${Math.min(8,Math.max(3,(q.opts||[]).length+1))}">${esc((q.opts||[]).join("\n"))}</textarea></label>
  <label class="check2"><input type="checkbox" data-qf="other" ${q.other?"checked":""}> Add an “Other” option with a text box</label>`:""}
 ${q.type==="scale"?`<div class="formgrid4"><label class="f">From<select data-qf="min">${opt(["0","1"],String(q.min))}</select></label><label class="f">To<select data-qf="max">${opt(["3","4","5","6","7","8","9","10"],String(q.max))}</select></label><label class="f">Label for lowest<input data-qf="minL" value="${esc(q.minL)}" placeholder="e.g. Poor"></label><label class="f">Label for highest<input data-qf="maxL" value="${esc(q.maxL)}" placeholder="e.g. Excellent"></label></div>`:""}
 ${q.type==="short"||q.type==="list"?`<label class="check2"><input type="checkbox" data-qf="sugg" ${(q.opts||[]).includes("@faculty")?"checked":""}> Suggest faculty names while typing</label>`:""}
 <div class="qc-foot"><label class="f inline">Section<input data-qf="section" value="${esc(q.section)}" list="fe-secs" placeholder="Section"></label>
  <label class="check2"><input type="checkbox" data-qf="req" ${q.req?"checked":""}> Required</label>${q.map?'<span class="pill p-rot">Used by the app</span>':""}
  <span class="qc-btns"><button class="btn link" data-act="fe-up" data-i="${i}" ${i?"":"disabled"} aria-label="Move up">↑</button><button class="btn link" data-act="fe-down" data-i="${i}" ${i<n-1?"":"disabled"} aria-label="Move down">↓</button><button class="btn link" data-act="fe-dup" data-i="${i}">Duplicate</button>${q.map?"":`<button class="btn link" data-act="fe-del" data-i="${i}">Delete</button>`}</span></div></div>`}
function readFormDraft(){if(!UI.fd)return;document.querySelectorAll(".qcard[data-qi]").forEach(c=>{const q=UI.fd.qs[+c.dataset.qi];if(!q)return;const g=f=>c.querySelector(`[data-qf="${f}"]`);
 q.t=g("t").value;q.d=g("d").value;if(!q.map)q.type=g("type").value;q.req=g("req").checked;q.section=g("section").value.trim();
 if(g("opts"))q.opts=g("opts").value.split("\n").map(s=>s.trim()).filter(Boolean);if(g("other"))q.other=g("other").checked;
 if(g("min")){q.min=+g("min").value;q.max=+g("max").value;q.minL=g("minL").value;q.maxL=g("maxL").value}
 if(g("sugg"))q.opts=g("sugg").checked?["@faculty"]:[]})}
function formEditAction(a,b){const w=DB.workshops.find(x=>x.id===route.id),key={fb:"fbq",pf:"pfq",rg:"rgq"}[UI.fd.kind];if(document.getElementById("fe-desc"))w.regDesc=document.getElementById("fe-desc").value;readFormDraft();const qs=UI.fd.qs,i=+b.dataset.i;
 if(a==="fe-add"){const last=qs[qs.length-1];qs.push(Q(uid("q"),"","mc",{opts:["Option 1","Option 2"],section:last?.section||""}));render();setTimeout(()=>{const c=document.querySelectorAll(".qcard");c[c.length-1]?.querySelector('[data-qf="t"]').focus()},0);return}
 if(a==="fe-del"){qs.splice(i,1)}
 if(a==="fe-up"&&i>0)[qs[i-1],qs[i]]=[qs[i],qs[i-1]];
 if(a==="fe-down"&&i<qs.length-1)[qs[i+1],qs[i]]=[qs[i],qs[i+1]];
 if(a==="fe-dup"){const c={...JSON.parse(JSON.stringify(qs[i])),k:uid("q"),map:0};c.t+=" (copy)";qs.splice(i+1,0,c)}
 if(a==="fe-reset")UI.fd.qs=UI.fd.kind==="fb"?defFbQ():UI.fd.kind==="rg"?defRgQ():defPfQ();
 if(a==="fe-save"){const bad=qs.findIndex(q=>!q.t.trim());if(bad>=0){toast(`Question ${bad+1} has no text`);return}
  const fewOpts=qs.findIndex(q=>CHOICE.has(q.type)&&qOpts(q).length<2&&!q.other);if(fewOpts>=0){toast(`Question ${fewOpts+1} needs at least two options`);return}
  qs.forEach(q=>{if(!CHOICE.has(q.type)&&!["short","list"].includes(q.type))q.opts=[];if(q.type==="scale"&&+q.max<=+q.min)q.max=+q.min+1});
  w[key]=qs;wlog(w,`${{fb:"Feedback",pf:"Proposal",rg:"Registration"}[UI.fd.kind]} form edited: ${qs.length} questions`);UI.fd=null;persist();toast("Form saved");go("ws-"+w.id);return}
 render()}
const fbEditAction=formEditAction,pfEditAction=formEditAction;
const vFbEdit=()=>vFormEdit("fb"),vPfEdit=()=>vFormEdit("pf");

/* ---- proposal: focal person view, DME review ---- */
UI.pfDone=null;
const stripOther=v=>typeof v==="string"?v.replace(/^Other:\s*/,""):v;
function vPfill(){const w=DB.workshops.find(x=>x.id===route.id);if(!w)return`<div class="panel">Not found.</div>`;
 const back=`<div class="flag info">Focal person view. This is what opens from the proposal link. <a href="#ws-${w.id}">Back to the workshop</a></div>`;
 if(UI.pfDone===w.id)return back+`<div class="panel fbform"><h2>Proposal submitted</h2><p>The DME office has received the proposal for <b>${esc(w.title)}</b>. They will review it and confirm the final details.</p><div class="actions"><a class="btn primary" href="#prop-${w.id}">Review it as DME</a></div></div>`;
 if(w.stage>=3)return back+`<div class="panel fbform"><h2>${esc(w.title)}</h2><p>This proposal has been approved. Contact the DME office for any change.</p></div>`;
 const fnames=DB.faculty.map(facName);const pre=w.proposal?.submitted?.values||{title:w.title,dept:w.dept,focal:fnames.includes(w.focal)?w.focal:"",director:fnames.includes(w.director)?w.director:""};
 return back+`<form class="panel fbform" id="pfform" novalidate>${formHead(w,"Workshop proposal",`Form RIC/ME&amp;T/F-06 · calendar slot ${mLabel(w.month)} · submit at least ${DB.settings.proposal_weeks||8} weeks before`)}
 ${w.returned?`<div class="flag">Returned by the DME office: ${esc(w.returned)}</div>`:""}${formHtml(w.pfq,pre,"pf-",false)}
 <label class="check2"><input type="checkbox" id="pf-decl"> The Head of Department has been informed and supports this workshop. The information is accurate.</label>
 <div class="err" id="pferr" role="alert"></div><button class="btn primary" type="button" data-act="pf-submit" style="justify-self:start">Submit proposal</button></form>`}
function submitPf(){const w=DB.workshops.find(x=>x.id===route.id),fm=document.getElementById("pfform"),er=document.getElementById("pferr");const{vals:v,missing}=formRead(fm,w.pfq,"pf-");
 if(missing.length){er.textContent="Still needed: "+missing.map(q=>q.t).join("; ");return}
 if(v.focalMobile&&!/^03\d{2}-?\d{7}$/.test(v.focalMobile)){er.textContent="Mobile must be 11 digits starting with 03.";return}
 if(v.seats!==""&&v.seats!=null&&!(+v.seats>0)){er.textContent="Maximum seats must be more than 0.";return}
 if(v.date&&!v.date.startsWith(w.month)&&!er.dataset.warned){er.dataset.warned="1";er.textContent=`The proposed date is outside the calendar month (${mLabel(w.month)}). Submit again to send it anyway.`;return}
 if(!document.getElementById("pf-decl").checked){er.textContent="Tick the declaration to submit.";return}
 const n=(w.proposal?.versions||0)+1,by=stripOther(v.focal)||w.focal||"Focal person";w.proposal={submitted:{values:v,at:new Date().toISOString(),by},final:JSON.parse(JSON.stringify(v)),versions:n};w.returned=null;
 if(w.stage<2)w.stage=2;w.log.push({at:new Date().toISOString(),by,what:`Proposal submitted${n>1?" (version "+n+")":""}`});log(`${w.title}: proposal submitted by ${by}`,"ws-"+w.id);persist();UI.pfDone=w.id;render();window.scrollTo(0,0)}
function vProp(){const w=DB.workshops.find(x=>x.id===route.id);if(!w)return`<div class="panel">Not found.</div>`;
 const back=`<div><a href="#ws-${w.id}" class="btn link" style="padding-left:0">← ${esc(w.title)}</a></div>`;
 if(!w.proposal)return back+`<div class="panel empty">No proposal has been submitted yet. Send the proposal link from the workshop page.</div>`;
 const P0=w.proposal,qs=w.pfq,ed=qs.filter(q=>JSON.stringify(P0.final[q.k]??"")!==JSON.stringify(P0.submitted.values[q.k]??""));
 return back+`<div class="head"><div><h2>Proposal · ${esc(w.title)}</h2><p>Submitted by ${esc(P0.submitted.by)} on ${fdt(P0.submitted.at)}${P0.versions>1?` · version ${P0.versions}`:""}. The DME office has the final say: edit the affirmed column, then ${w.stage===2?"approve":"save"}. The workshop runs on the affirmed version.</p></div>
  <div class="actions">${xbtn("ws:"+w.id)}${w.stage===2?`<button class="btn danger" data-act="ws-return">Return with comments</button>`:""}<button class="btn" data-act="pr-save">${w.stage>=3?"Save and update workshop":"Save affirmed version"}</button>${w.stage===2?`<button class="btn primary" data-act="pr-approve">Approve affirmed proposal</button>`:""}</div></div>
 <div class="flag ${ed.length?"":"info"}">${ed.length?`${ed.length} field${ed.length>1?"s":""} changed by the DME office: ${ed.map(q=>esc(q.t)).join(", ")}`:"No changes yet. The affirmed version matches what was proposed."}${w.stage>=3?" · Approved":""}</div>
 <div class="panel flush" id="propform"><div class="tblwrap"><table class="prop"><thead><tr><th>Question</th><th>Proposed by focal person</th><th>Affirmed by DME</th></tr></thead><tbody>
 ${qs.map(q=>{const ch=ed.includes(q);return`<tr class="${ch?"changed":""}"><td><b>${esc(q.t)}</b><div class="subt">${esc(q.section)}${ch?" · edited":""}${q.map?" · used by the app":""}</div></td><td class="wrapcell">${qShow(q,P0.submitted.values[q.k])}</td><td>${qCtrl(q,P0.final[q.k],"af-"+q.k)}</td></tr>`}).join("")}
 </tbody></table></div></div>`}
const feeNum=v=>{if(qEmpty(v))return null;if(typeof v==="number")return v;if(/free/i.test(v))return 0;const d=String(v).replace(/[^\d]/g,"");return d?+d:null};
function applyProposal(w){const v=w.proposal.final;if(v.title)w.title=v.title;if(v.dept)w.dept=stripOther(v.dept);if(v.date){w.date=v.date;w.month=v.date.slice(0,7)}if(v.venue)w.venue=stripOther(v.venue);if(v.format)w.format=v.format;
 if(!qEmpty(v.seats))w.seats=+v.seats;const f=feeNum(v.fee);if(f!=null)w.fee=f;else if(w.fee==null)w.fee=0;if(v.director)w.director=stripOther(v.director);if(v.focal)w.focal=stripOther(v.focal);delete w.placeholder}
function propAction(a){const w=DB.workshops.find(x=>x.id===route.id);const{vals}=formRead(document.getElementById("propform"),w.pfq,"af-");
 const before=JSON.stringify(w.proposal.final);Object.assign(w.proposal.final,vals);const changed=before!==JSON.stringify(w.proposal.final);
 if(a==="pr-approve"){if(!w.proposal.final.date){toast("Set the affirmed date before approving");return}if(!(+w.proposal.final.seats>0)){toast("Set the affirmed number of seats");return}
  applyProposal(w);w.stage=3;wlog(w,`Affirmed proposal approved · ${fd(w.date)}, ${w.seats} seats, ${w.fee?money(w.fee):"free"}`);persist();toast("Proposal approved");go("ws-"+w.id);return}
 if(changed){if(w.stage>=3)applyProposal(w);wlog(w,"Affirmed proposal edited by DME"+(w.stage>=3?"; workshop details updated":""));persist();toast("Saved")}else toast("No change to save");render()}

/* ---- example proposal for the sample workshop ---- */
function exampleProposal(){const v={title:"Basics of ECG Interpretation",dept:"General Cardiology",collab:["Cardiac Imaging"].filter(()=>false),date:"2026-09-19",altDate:"2026-09-26",length:"Half day (up to 4 hours)",venue:"Auditorium",format:"Lectures + hands-on",focal:"Other: Example focal person",focalDesig:"Assistant Professor",focalMobile:"0300-0000000",director:"Other: Example course director",faculty:[{name:"Example faculty 1",desig:"Assistant Professor",inst:PB_RIC,role:"Lecturer / speaker"},{name:"Example faculty 2",desig:"Senior Registrar",inst:PB_RIC,role:"Station facilitator"}],audience:["Cardiology PGTs","Medical officers","Nurses"],seats:50,ricSeats:15,fee:"PKR 3,000",objectives:["Use a systematic approach to read a 12-lead ECG","Recognise common arrhythmias","Identify acute ischaemia patterns"],assessment:["Pre/post MCQ test"],handouts:"Printed",cme:"Yes",schedule:[{day:1,type:"reg",start:"09:00",end:"09:30",topic:"",by:""},{day:1,type:"lecture",start:"09:30",end:"10:15",topic:"Basics of the 12-lead ECG",by:"Example faculty 1"},{day:1,type:"break",start:"10:15",end:"10:30",topic:"",by:""},{day:1,type:"rotation",start:"10:30",end:"12:30",topic:"A: Lead placement, B: Arrhythmias, C: Ischaemia patterns",by:"Example faculty 2"},{day:1,type:"close",start:"12:30",end:"13:00",topic:"Case quiz",by:""}],equip:["Consumables","Projector and sound"],resources:[{item:"ECG paper and electrodes (sets)",qty:50,unit:240}],estCost:"PKR 25,000 to 50,000",sponsor:"Catering",sponsorName:"Example sponsor"};
 return{submitted:{values:v,at:"2026-07-21T09:00:00Z",by:"Example focal person"},final:{...v,seats:40,fee:"PKR 2,000"},versions:1}}
