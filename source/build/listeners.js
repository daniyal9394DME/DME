document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
 if(d.lvf){UI.lvf=d.lvf;render();return}
 if(d.wsf){UI.wsf=d.wsf;if(route.v!=="workshops")go("workshops");else render();return}
 if(d.jump){document.getElementById(d.jump)?.scrollIntoView({behavior:"smooth",block:"start"});return}
 const a=d.act;if(!a)return;
 if(a==="lv-add")return addLeaveInline();
 if(a==="lv-edit"){const l=DB.leaves.find(x=>x.id===d.id);return sheetLeave(DB.pgts.find(p=>p.id===l.pid),l)}
 if(a==="cr-pick"){UI.credFac=d.id;go("credentials");return}
 if(a.startsWith("cr-"))return credAction(a);
 if(a==="ws-add")return sheetWs();
 if(a.startsWith("ws-"))return wsAction(a,b);
 if(/^(spec|site|lt|unit|staff)-/.test(a)){settingsAction(a,b);persist();return}
});
document.addEventListener("input",e=>{const t=e.target;
 if(t.id==="lvq"){UI.lvq=t.value;const pos=t.selectionStart;render();const n=document.getElementById("lvq");n.focus();n.setSelectionRange(pos,pos)}
 if(t.id==="lv-start"||t.id==="lv-end")leaveDays()});
document.addEventListener("change",e=>{const t=e.target;
 if(t.id==="lvtype"){UI.lvtype=t.value;render()}
 if(t.id==="cr-fac"){const f=DB.faculty.find(x=>facLabel(x)===t.value);if(f){UI.credFac=f.id;render()}}
 if(t.dataset.staff){const s=DB.staff[+t.dataset.staff];s.role=t.value;log(`Changed role of ${s.name} to ${t.value}`)}
 if(t.dataset.wscheck){const w=DB.workshops.find(x=>x.id===route.id);w.check[t.dataset.wscheck]=t.checked;persist()}});
document.addEventListener("click",e=>{
 const ga=e.target.closest("a[data-go-filter]");if(ga){const[v,f]=ga.dataset.goFilter.split(":");if(v==="tasks")UI.tf=f;if(v==="workshops")UI.wsf=f}
 const ck=e.target.closest('a[href="#checks"]');if(ck){e.preventDefault();const d=document.getElementById("checks");if(d){d.open=true;d.scrollIntoView({behavior:"smooth"})}return}
 const tg=e.target.closest("tr[data-tassign-go]");if(tg){UI.tassign=tg.dataset.tassignGo;UI.tf="open"}
 const b=e.target.closest("button");if(!b)return;const d=b.dataset;
 if(d.tf){UI.tf=d.tf;if(route.v!=="tasks")go("tasks");else render();return}
 if(d.tassign!=null){UI.tassign=d.tassign;UI.tf="open";render();return}
 if(d.tstatus){const t=DB.tasks.find(x=>x.id===route.id);if(t){setTStatus(t,d.tstatus)}return}
 if(d.tcrm!=null){const t=DB.tasks.find(x=>x.id===route.id);t.check.splice(+d.tcrm,1);persist();render();return}
 const a=d.act;if(!a)return;
 if(a.startsWith("t-"))return taskAction(a,b);
 if(a==="fb-submit")return submitFb();
 if(a==="fb-again"){UI.fbDone=null;render();return}
});
document.addEventListener("change",e=>{const t=e.target;
 if(t.id==="tassign"){UI.tassign=t.value;render()}
 if(t.dataset.tcheck!=null){const k=DB.tasks.find(x=>x.id===route.id),c=k.check[+t.dataset.tcheck];c.done=t.checked;
  const all=k.check.every(x=>x.done);if(all&&k.status!=="Done"){setTStatus(k,"Done");return}if(!all&&k.status==="Done"){k.status="In progress";k.doneAt=null}if(k.status==="To do"&&t.checked)k.status="In progress";
  tlog(k,`${t.checked?"Completed":"Reopened"} step: ${c.t}`);persist();render()}
 if(t.id==="tprog"){const k=DB.tasks.find(x=>x.id===route.id);k.progress=+t.value;if(k.status==="To do"&&k.progress>0)k.status="In progress";tlog(k,`Progress set to ${k.progress}%`);persist();render()}
 if(t.dataset.rm){const id=t.dataset.rm,w=DB.workshops.find(x=>x.id===id);const p=UI.pend[id]=UI.pend[id]||{month:w.month,date:w.date};p.month=t.value||w.month;if(p.date&&!p.date.startsWith(p.month))p.date=null;render()}
 if(t.dataset.rd){const id=t.dataset.rd,w=DB.workshops.find(x=>x.id===id);const p=UI.pend[id]=UI.pend[id]||{month:w.month,date:w.date};p.date=t.value||null;if(p.date)p.month=p.date.slice(0,7);render()}
});
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
 if(d.export){doExport(d.export,b);return}
 if(d.cymode){UI.cyMode=d.cymode;render();return}
 if(d.exspec){UI.exSpec=d.exspec;render();return}
 const a=d.act;if(!a)return;
 if(a==="pg-clear"){UI.cy="";UI.spec="";UI.prog="";UI.q="";render();return}
 if(a.startsWith("fe-"))return fbEditAction(a,b);
 if(a.startsWith("pe-"))return pfEditAction(a,b);
 if(a==="pf-submit")return submitPf();
 if(a.startsWith("pr-"))return propAction(a);
 if(a.startsWith("ex-"))return examAction(a,b);
 if(a.startsWith("or-"))return orientAction(a,b);
});
document.addEventListener("change",e=>{const t=e.target;
 if(t.id==="fcy"){UI.cy=t.value;if(t.value&&UI.phase==="active")UI.phase="all";render();return}
 if(t.dataset.expaper){const x=DB.exams.find(e=>e.id===route.id);x.papers[t.dataset.expaper]={...(x.papers[t.dataset.expaper]||{}),status:t.value};xlog(x,`${t.dataset.expaper} paper: ${t.value}`);persist();render();return}
 if(t.dataset.exsetter){const x=DB.exams.find(e=>e.id===route.id);x.papers[t.dataset.exsetter]={...(x.papers[t.dataset.exsetter]||{}),setter:t.value.trim()};persist();return}
 if(t.dataset.exmark){const x=DB.exams.find(e=>e.id===route.id),v=t.value.trim();if(v!==""&&(+v<0||+v>100)){toast("Marks must be between 0 and 100");t.value=x.marks[t.dataset.exmark]??"";return}
  if(v==="")delete x.marks[t.dataset.exmark];else x.marks[t.dataset.exmark]=+v;persist();const all=[...document.querySelectorAll("[data-exmark]")],i=all.indexOf(t),nx=all[i+1]?.dataset.exmark;render();if(nx)document.querySelector(`[data-exmark="${nx}"]`)?.focus();return}
 if(t.dataset.exabs){const x=DB.exams.find(e=>e.id===route.id);if(t.checked){x.absent[t.dataset.exabs]=true;delete x.marks[t.dataset.exabs]}else delete x.absent[t.dataset.exabs];persist();render();return}
 if(t.dataset.oratt){const o=DB.orients.find(e=>e.id===route.id);o.att[t.dataset.oratt]=t.value;persist();render();return}
 if(t.dataset.orck){const o=DB.orients.find(e=>e.id===route.id);o.check[+t.dataset.orck].done=t.checked;persist();render();return}
});
window.addEventListener("hashchange",()=>{if(!["fbedit"].includes(route.v))UI.fbDraft=null;if(route.v!=="pfedit")UI.pfDraft=null;if(route.v!=="pfill")UI.pfDone=null;if(route.v!=="fb")UI.fbDone=null});
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const a=b.dataset.act;if(!a)return;
 if(a==="navtoggle")return navToggle();
 if(a==="navclose"){document.body.classList.remove("navopen");return}
 if(a.startsWith("tm-"))return teamAction(a,b);
});
document.addEventListener("click",e=>{if(e.target.closest(".navscrim"))document.body.classList.remove("navopen")});
document.addEventListener("change",e=>{const t=e.target;
 if(t.id==="whoami"){ME=t.value;try{localStorage.setItem("ric-dme-me",ME)}catch(x){}UI.tassign="";UI.tf="open";const r=parse();const cur=["ws","fb","fbedit","pfedit","pfill","prop","reg","rgedit"].includes(r.v)?"workshops":r.v==="task"?"tasks":r.v==="exam"?"exams":r.v==="orient"?"orientation":r.v==="pgt"?"pgts":r.v==="fac"?"faculty":r.v;if(!canSee(cur))go("overview");else render();toast("Signed in as "+ME);return}
 if(t.dataset.qf==="type"){readFormDraft();render();return}
 if(t.id==="tm-dg"){const v=t.value,cw=document.getElementById("tm-cw");if(cw)cw.hidden=v!=="__c";const p=DESIGS[v];if(p){const f=document.getElementById("sheetform");const r=f.querySelector('[name="r"]'),sa=f.querySelector('[name="sa"]');if(r)r.value=p.role==="Admin"?"Admin":p.role;if(sa)sa.value=p.seeAll?"1":"0";f.querySelectorAll('[name="sec"]').forEach(c=>c.checked=p.sec.includes(c.value))}return}
 if(t.dataset.expc){const x=DB.exams.find(e=>e.id===route.id);const[s,f]=t.dataset.expc.split("|");const pp=x.papers[s]=x.papers[s]||{};
  if(t.type==="checkbox"){pp[f]=t.checked;if(f==="final"&&t.checked){pp.recv=true;pp.req=true}xlog(x,`${s}: ${({req:"requested",recv:"questions received",key:"answer key received",mod:"moderated",final:"final"})[f]} ${t.checked?"✓":"unticked"}`);persist();render()}
  else{pp[f]=f==="mcqs"?(t.value===""?null:+t.value):t.value.trim();persist()}return}
});
window.addEventListener("hashchange",()=>{document.body.classList.remove("navopen");if(!["fbedit","pfedit","rgedit"].includes(route.v))UI.fd=null});
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const a=b.dataset.act;if(!a)return;
 if(["ex-addc","ex-excl","ex-incl"].includes(a))return examCandAction(a,b);
 if(a.startsWith("cd-"))return conductAction(a,b);
});
document.addEventListener("change",e=>{const t=e.target;if(t.id==="ex-scope"){const x=DB.exams.find(e=>e.id===route.id);x.scope=t.value;xlog(x,`Eligibility set to ${t.value==="ric"?"active PGTs at RIC":"all active PGTs"}`);persist();render()}});
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
 if(d.exyear!=null){UI.exYear=d.exyear;render();return}
 if(d.sdept!=null){UI.sdept=UI.sdept===d.sdept?"":d.sdept;render();return}
 if(d.stype!=null){UI.stype=d.stype;render();return}
 if(d.sload!=null){UI.sload=d.sload;render();return}
});
document.addEventListener("input",e=>{const t=e.target;if(t.id==="sq"){UI.sq=t.value;const pos=t.selectionStart;render();const n=document.getElementById("sq");n.focus();n.setSelectionRange(pos,pos)}});
document.addEventListener("change",e=>{const t=e.target;
 if(t.id==="sdept"){UI.sdept=t.value;render()}if(t.id==="sprog"){UI.sprog=t.value;render()}if(t.id==="fry"){UI.ry=t.value;if(t.value&&UI.phase!=="all")UI.phase="active";render()}
 if(t.dataset.exroll){const x=DB.exams.find(e=>e.id===route.id),v=t.value.trim();const dup=Object.entries(x.roll).find(([k,r])=>k!==t.dataset.exroll&&r===v&&v);if(dup){toast("That roll number is already used");t.value=x.roll[t.dataset.exroll];return}x.roll[t.dataset.exroll]=v;persist()}
});
document.addEventListener("change",e=>{const d=e.target.dataset||{};const need=d.exroll||d.exmark||d.exabs||d.expc||d.expaper||d.exsetter?"exam":d.oratt||d.orck?"orient":d.tcheck!=null||e.target.id==="tprog"?"task":d.wscheck?"ws":null;
 if(need&&route.v!==need){e.stopImmediatePropagation();return}
 if(need&&!document.body.contains(e.target)){e.stopImmediatePropagation()}},true);
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
 if(d.rgtab){UI.rgTab=d.rgtab;render();return}
 const a=d.act;if(!a)return;
 if(a==="ev-cancel"||a==="ev-save")return importAction(a);
 if(a==="rg-submit")return submitReg();
 if(a==="rg-again"){UI.rgDone=null;render();return}
 if(a.startsWith("rg-")){regAction(a,b);persist();render();return}
});
document.addEventListener("change",e=>{const t=e.target;
 if(t.id==="ev-file"&&t.files[0]){readImport(t.files[0]);return}
 if(t.dataset.evmap!=null&&UI.imp){UI.imp.map[+t.dataset.evmap]=t.value;UI.imp.how[+t.dataset.evmap]=t.value?"Chosen by hand":"";render();return}
 if(t.id==="ex-pick"){UI.exPick=t.value;render();return}
 if(t.dataset.rgmove&&t.value){const w=DB.workshops.find(x=>x.id===route.id),r=regsOf(w).find(x=>x.id===t.dataset.rgmove);if(regMove(w,r,t.value)){persist();toast(`Moved to ${t.value}`)}render();return}
 if(t.dataset.rgpresent){const w=DB.workshops.find(x=>x.id===route.id),r=regsOf(w).find(x=>x.id===t.dataset.rgpresent);r.present=t.checked;regSync(w);persist();render();return}
});
window.addEventListener("hashchange",()=>{if(route.v!=="exam")UI.imp=null;if(route.v!=="reg")UI.rgDone=null});
