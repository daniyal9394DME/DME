/* =====================================================================
   TASKS
   ===================================================================== */
UI.tf="open";UI.tassign="";
const T_STATUS=["To do","In progress","Waiting","Done"];
const T_PRI=["High","Normal","Low"];
const T_PILL={"To do":"p-done","In progress":"p-rot","Waiting":"p-pause","Done":"p-ric"};
function seedTasks(){const t=(o)=>({id:uid("T"),details:"",by:"Dr. Daniyal Ahmad Kamal",created:"2026-10-27",priority:"Normal",status:"To do",progress:0,link:"",check:[],notes:[],doneAt:null,...o});
 const add=n=>iso(new Date(TODAY.getTime()+n*864e5));
 return[
  t({title:"Send the Basics of CPB proposal link to Dr. Muhammad Azam",assignee:"Dr. Daniyal Ahmad Kamal",due:add(3),priority:"High",link:"ws-W06",details:"Workshop is in May 2027. Send the proposal link at least 8 weeks before."}),
  t({title:"Get HoD signatures on the DME Annual Academic Calendar",assignee:"Data Entry Operator",due:add(7),priority:"High",status:"In progress",link:"workshops",
    check:[["Cardiac Surgery",1],["General Cardiology",1],["Anaesthesiology",0],["Paediatric Cardiology",0],["Interventional Cardiology",0],["Research Cell",0],["Infection Prevention & Control",0]].map(([t,d])=>({t,done:!!d}))}),
  t({title:"Collect PMDC faculty registration certificates",assignee:"Training Officer",due:add(30),status:"In progress",progress:20,link:"credentials",details:"Most faculty have no PMDC faculty registration on file. Upload each one in Faculty updates."}),
  t({title:"Correct missing training durations for two PGTs",assignee:"Training Officer",due:add(-2),link:"pgts",details:"Also check one PGT's start date, which was entered with the year 0026."}),
  t({title:"Prepare the Nov/Dec internal PGT exam",assignee:"Dr. Daniyal Ahmad Kamal",due:add(21),status:"In progress",link:"exam-EX1",
    check:["Collect MCQs from each specialty","Moderate and finalise papers","Book the exam hall","Issue date sheet to PGTs","Print papers"].map((t,i)=>({t,done:i<1}))}),
  t({title:"Share the PGT registration link with all new inductees",assignee:"Data Entry Operator",due:add(-10),status:"Done",progress:100,doneAt:add(-12)})
 ]}
const tProg=t=>t.status==="Done"?100:t.check.length?Math.round(t.check.filter(c=>c.done).length/t.check.length*100):(+t.progress||0);
const tDue=t=>t.status==="Done"||!t.due?null:days(P(t.due),TODAY);
const tOverdue=t=>tDue(t)!=null&&tDue(t)<0;
const tSoon=t=>tDue(t)!=null&&tDue(t)>=0&&tDue(t)<=3;
const dueTxt=t=>{const d=tDue(t);if(t.status==="Done")return`Done ${fd(t.doneAt)}`;if(d==null)return"No due date";if(d<0)return`<span class="d-red">${-d} day${d===-1?"":"s"} overdue</span>`;if(d===0)return`<span class="d-amb">Due today</span>`;if(d<=3)return`<span class="d-amb">Due in ${d} day${d===1?"":"s"}</span>`;return`Due ${fd(t.due)}`};
const progBar=(p,small)=>`<span class="pbar ${small?"sm":""}" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></span><span class="code">${p}%</span>`;
const linkLabel=l=>{if(!l)return"";const m=l.match(/^(pgt|fac|ws|exam|orient)-(\w+)$/);if(m){if(m[1]==="exam"){const x=DB.exams.find(e=>e.id===m[2]);return x?"Exam: "+x.session:"Exam"}if(m[1]==="orient"){const o=DB.orients.find(e=>e.id===m[2]);return o?"Orientation: "+sessLong(o.cycle):"Orientation"}if(m[1]==="ws"){const w=DB.workshops.find(x=>x.id===m[2]);return w?"Workshop: "+w.title:"Workshop"}if(m[1]==="pgt"){const p=DB.pgts.find(x=>x.id===m[2]);return p?"PGT: Dr. "+p.name:"PGT"}const f=facById(m[2]);return f?"Faculty: "+facName(f):"Faculty"}return({workshops:"Workshops",credentials:"Faculty updates",pgts:"PGTs",leaves:"Leave",verify:"Verification",faculty:"Faculty",settings:"Settings",exams:"Exams",orientation:"Orientation"})[l]||l};
const team=()=>DB.staff.map(s=>s.name);
function tFilter(t){const k=UI.tf;return(k==="open"?t.status!=="Done":k==="overdue"?tOverdue(t):k==="week"?t.status!=="Done"&&tDue(t)!=null&&tDue(t)<=7:k==="waiting"?t.status==="Waiting":k==="done"?t.status==="Done":k==="mine"?t.assignee===ME&&t.status!=="Done":true)&&(!UI.tassign||t.assignee===UI.tassign)}
function linkedTasks(ref){const ts=visibleTasks().filter(t=>t.link===ref&&t.status!=="Done");if(!ts.length)return"";
 return`<div class="panel flush"><h3>Open tasks for this workshop · ${ts.length}</h3><div class="tblwrap"><table><tbody>${ts.map(t=>`<tr class="click" data-href="task-${t.id}"><td>${esc(t.title)}</td><td>${esc(t.assignee)}</td><td>${dueTxt(t)}</td><td>${progBar(tProg(t),1)}</td></tr>`).join("")}</tbody></table></div></div>`}
function vTasks(){
 const T=visibleTasks(),open=T.filter(t=>t.status!=="Done");
 const cnt=k=>{const s=UI.tf;UI.tf=k;const n=T.filter(tFilter).length;UI.tf=s;return n};
 const rows=T.filter(tFilter).sort((a,b)=>(a.status==="Done")-(b.status==="Done")||(tDue(a)??9999)-(tDue(b)??9999)||T_PRI.indexOf(a.priority)-T_PRI.indexOf(b.priority));
 LAST.tasks=rows;return`<div class="head"><div><h2>Tasks</h2><p>Work handed to the DME team. Overdue and due-soon tasks also show on the Overview.</p></div>${xbtn("tasks")}<button class="btn primary" data-act="t-new">New task</button></div>
 <div class="kpis">
  <button class="kpi" data-tf="open"><span class="n">${open.length}</span><span class="l">Open</span></button>
  <button class="kpi ${open.some(tOverdue)?"attn":""}" data-tf="overdue"><span class="n">${open.filter(tOverdue).length}</span><span class="l">Overdue</span></button>
  <button class="kpi" data-tf="week"><span class="n">${cnt("week")}</span><span class="l">Due in 7 days</span></button>
  <button class="kpi" data-tf="waiting"><span class="n">${open.filter(t=>t.status==="Waiting").length}</span><span class="l">Waiting on others</span></button>
  <button class="kpi" data-tf="mine"><span class="n">${open.filter(t=>t.assignee===ME).length}</span><span class="l">Assigned to me</span></button>
  <button class="kpi" data-tf="done"><span class="n">${T.filter(t=>t.status==="Done").length}</span><span class="l">Done</span></button>
 </div>
 ${seeAll()?`<div class="panel flush"><h3>Team workload</h3><div class="tblwrap"><table><thead><tr><th>Member</th><th class="num">Open</th><th class="num">Overdue</th><th class="num">Due in 7 days</th><th>Average progress</th><th></th></tr></thead><tbody>
  ${DB.staff.map(s=>{const m=open.filter(t=>t.assignee===s.name),av=m.length?Math.round(m.reduce((a,t)=>a+tProg(t),0)/m.length):0;return`<tr><td>${esc(s.name)}<div class="subt">${esc(s.desig||s.role)}</div></td><td class="num">${m.length}</td><td class="num"><span class="days ${m.some(tOverdue)?"d-red":""}">${m.filter(tOverdue).length}</span></td><td class="num">${m.filter(t=>tDue(t)!=null&&tDue(t)<=7).length}</td><td>${m.length?progBar(av,1):"—"}</td><td><button class="btn small" data-tassign="${esc(s.name)}">Show tasks</button></td></tr>`}).join("")}
 </tbody></table></div></div>`:""}
 <div class="panel" style="display:grid;gap:10px">${seeAll()?`<div class="toolbar"><select id="tassign" aria-label="Assigned to"><option value="">Everyone</option>${team().map(n=>`<option ${UI.tassign===n?"selected":""}>${esc(n)}</option>`).join("")}</select></div>`:""}
  <div class="chips">${[["open","Open"],["overdue","Overdue"],["week","Due in 7 days"],["waiting","Waiting"],["mine","Mine"],["done","Done"],["all","All"]].map(([k,l])=>`<button class="chip" data-tf="${k}" aria-pressed="${UI.tf===k}">${l}<span class="c">${cnt(k)}</span></button>`).join("")}</div></div>
 <div class="tasklist">${rows.map(t=>`<a class="task ${tOverdue(t)?"late":""} ${t.status==="Done"?"done":""}" href="#task-${t.id}">
   <div class="tt"><span class="pill ${T_PILL[t.status]}">${t.status}</span>${t.priority==="High"?'<span class="pill p-bad">High</span>':""}<b>${esc(t.title)}</b></div>
   <div class="tm"><span>${esc(t.assignee)}</span><span>${dueTxt(t)}</span>${t.check.length?`<span>${t.check.filter(c=>c.done).length}/${t.check.length} steps</span>`:""}${t.link?`<span>${esc(linkLabel(t.link))}</span>`:""}${t.notes.length?`<span>${t.notes.length} update${t.notes.length>1?"s":""}</span>`:""}</div>
   <div class="tp">${progBar(tProg(t))}</div></a>`).join("")||`<div class="panel empty">No tasks here. Use "New task" to hand work to a team member.</div>`}</div>`}
function vTask(){const t=visibleTasks().find(x=>x.id===route.id);if(!t)return`<div class="panel">Task not found. <a href="#tasks">Back</a></div>`;const p=tProg(t);
 return`<div><a href="#tasks" class="btn link" style="padding-left:0">← All tasks</a></div>
 <div class="panel" style="display:grid;gap:12px"><div class="prof"><div class="who"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill ${T_PILL[t.status]}">${t.status}</span><span class="pill ${t.priority==="High"?"p-bad":"p-done"}">${t.priority} priority</span></div>
  <h2 style="margin-top:6px">${esc(t.title)}</h2><div class="meta"><span>Assigned to <b>${esc(t.assignee)}</b></span><span>by ${esc(t.by)} on ${fd(t.created)}</span><span>${dueTxt(t)}</span></div></div>
  <div class="actions"><button class="btn" data-act="t-edit">Edit</button><button class="btn danger" data-act="t-del">Delete</button></div></div>
  ${t.details?`<p style="margin:0;max-width:70ch">${esc(t.details)}</p>`:""}
  ${t.link?`<div><a class="btn small" href="#${t.link}">Open ${esc(linkLabel(t.link))}</a></div>`:""}
  <div class="seg" role="group" aria-label="Status">${T_STATUS.map(s=>`<button class="chip" data-tstatus="${s}" aria-pressed="${t.status===s}">${s}</button>`).join("")}</div></div>
 <div class="cols two">
  <div class="panel" style="display:grid;gap:12px"><h3 style="margin:0">Progress · ${p}%</h3>${progBar(p)}
   ${t.check.length?`<ul class="checklist">${t.check.map((c,i)=>`<li><label class="check2"><input type="checkbox" data-tcheck="${i}" ${c.done?"checked":""}> <span class="${c.done?"struck":""}">${esc(c.t)}</span></label><button class="btn link" data-tcrm="${i}" aria-label="Remove step">Remove</button></li>`).join("")}</ul>`:
   `<label class="f">Set progress <span class="h">or add steps below and progress is counted from them</span><input type="range" min="0" max="100" step="10" id="tprog" value="${t.progress||0}"></label>`}
   <div class="toolbar"><input id="tnewstep" placeholder="Add a step" aria-label="New step"><button class="btn small" data-act="t-addstep">Add step</button></div></div>
  <div class="panel" style="display:grid;gap:12px"><h3 style="margin:0">Updates</h3>
   <textarea id="tnote" placeholder="Write an update, e.g. Called Dr. Azam; he will send the form on Monday"></textarea><div class="actions"><button class="btn small primary" data-act="t-note">Post update</button></div>
   <ul class="tl">${t.notes.slice().reverse().map(n=>`<li class="k-${n.sys?"reg":"status"}"><div class="d">${fdt(n.at)} · ${esc(n.by)}</div><div class="${n.sys?"n":""}">${esc(n.text)}</div></li>`).join("")||`<li class="k-reg"><div class="n">No updates yet.</div></li>`}</ul></div>
 </div>`}
function tlog(t,text){t.notes.push({at:new Date().toISOString(),by:ME,text,sys:true})}
function sheetTask(t,pre){const n=!t;pre=pre||{};t=t||{title:pre.title||"",details:"",assignee:ME,due:iso(new Date(TODAY.getTime()+7*864e5)),priority:"Normal",link:pre.link||"",check:[]};
 const links=[["","None"],["workshops","Workshops"],["credentials","Faculty updates"],["pgts","PGTs"],["leaves","Leave"],["verify","Verification"],["exams","Exams"],["orientation","Orientation"],...DB.exams.filter(x=>x.stage<5).map(x=>["exam-"+x.id,`Exam: ${x.session}`]),...DB.orients.filter(o=>o.stage<3).map(o=>["orient-"+o.id,`Orientation: ${sessLong(o.cycle)}`]),...DB.workshops.filter(w=>w.stage<6).map(w=>["ws-"+w.id,`Workshop: ${w.title} (${mLabel(w.month)})`])];
 if(t.link&&!links.some(l=>l[0]===t.link))links.push([t.link,linkLabel(t.link)]);
 openSheet(n?"New task":"Edit task",`
 <label class="f">Task<input name="title" value="${esc(t.title)}" placeholder="e.g. Book the auditorium for the TTE workshop"></label>
 <label class="f">Details <span class="h">optional</span><textarea name="details">${esc(t.details)}</textarea></label>
 <div class="grid2"><label class="f">Assign to<select name="assignee">${opt(canAssign()?team():[ME],t.assignee)}</select></label><label class="f">Due date<input type="date" name="due" value="${t.due||""}"></label></div>
 <div class="grid2"><label class="f">Priority<select name="priority">${opt(T_PRI,t.priority)}</select></label><label class="f">Linked to<select name="link">${opt(links,t.link)}</select></label></div>
 ${n?`<label class="f">Steps <span class="h">optional, one per line; progress is counted from them</span><textarea name="steps" placeholder="Draft letter&#10;Get it signed&#10;Send to CPSP"></textarea></label>`:""}`,()=>{
 if(fv("title").length<4)return fail("Describe the task.");if(!fv("due"))return fail("Set a due date so it can be tracked.");
 const rec={title:fv("title"),details:fv("details"),assignee:fv("assignee"),due:fv("due"),priority:fv("priority"),link:fv("link")};
 if(n){const nt={id:uid("T"),...rec,by:ME,created:iso(TODAY),status:"To do",progress:0,check:fv("steps").split("\n").map(s=>s.trim()).filter(Boolean).map(s=>({t:s,done:false})),notes:[],doneAt:null};tlog(nt,`Task created and assigned to ${rec.assignee}`);DB.tasks.push(nt);log(`Task "${rec.title}" assigned to ${rec.assignee}, due ${fd(rec.due)}`,"task-"+nt.id);go("task-"+nt.id)}
 else{const ch=[];if(rec.assignee!==t.assignee)ch.push("reassigned to "+rec.assignee);if(rec.due!==t.due)ch.push("due date moved to "+fd(rec.due));Object.assign(t,rec);tlog(t,ch.length?"Edited: "+ch.join(", "):"Details edited");log(`Edited task "${t.title}"`,"task-"+t.id)}
 toast("Task saved");return true})}
function taskAction(a,b){
 if(a==="t-new")return sheetTask(null,{link:b.dataset.link,title:b.dataset.title});
 const t=visibleTasks().find(x=>x.id===route.id);if(!t)return;
 if(a==="t-edit")return sheetTask(t);
 if(a==="t-del"){if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to delete";return}DB.tasks=DB.tasks.filter(x=>x!==t);log(`Deleted task "${t.title}"`);toast("Task deleted");go("tasks");return}
 if(a==="t-addstep"){const v=document.getElementById("tnewstep").value.trim();if(!v)return;t.check.push({t:v,done:false});if(t.status==="Done")t.status="In progress";persist();render();document.getElementById("tnewstep")?.focus();return}
 if(a==="t-note"){const v=document.getElementById("tnote").value.trim();if(!v)return;t.notes.push({at:new Date().toISOString(),by:ME,text:v});log(`Update on "${t.title}": ${v}`,"task-"+t.id);toast("Update posted");render()}}
function setTStatus(t,s){if(t.status===s)return;const old=t.status;t.status=s;if(s==="Done"){t.doneAt=iso(TODAY);t.check.forEach(c=>c.done=true)}else t.doneAt=null;
 if(s==="In progress"&&old==="To do"&&!t.check.length&&!t.progress)t.progress=10;tlog(t,`Status: ${old} → ${s}`);log(`Task "${t.title}" marked ${s}`,"task-"+t.id);toast(s==="Done"?"Task done":"Status updated");render()}

