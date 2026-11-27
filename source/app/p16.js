
/* =====================================================================
   V13 · DATA CHECKS (fix missing trainee data in place) and
   credential shortcuts straight to the missing certificate
   ===================================================================== */
const DC_KINDS=[["rotsite","Rotation hospital"],["rotret","Return date"],["sup","Supervisor"],["supok","Supervisor approval"],["dates","Training dates"],["done","Past completion"],["code","PGT ID"],["dom","Domicile"],["contact","Contact details"]];
function dcIssues(){const out=[];
 verified().forEach(p=>{const c=CUR.get(p.id);if(!c||!c.active)return;const rot=DB.rots.filter(r=>r.pid===p.id).sort((a,b)=>a.start<b.start?1:-1)[0];
  const add=(k,t)=>out.push({p,c,k,t,rot});
  if(c.pk==="rot"&&(!rot||!rot.site||!DB.sites.some(s=>s.short===rot.site)))add("rotsite","On rotation, hospital not recorded");
  if(c.rotational&&rot&&rot.start&&!rot.ret&&P(rot.start)<=TODAY)add("rotret","Rotation started "+fd(rot.start)+", return date not recorded");
  if(!c.sup)add("sup","No supervisor recorded");
  else if(c.sup.active===false)add("sup",`${facName(c.sup)} has left RIC; choose a new supervisor`);
  else if(!canSup(c.sup,p.spec,p.program))add("supok",`${facName(c.sup)} is not an approved ${p.program==="FCPS"?"CPSP":"UHS"} supervisor in ${p.spec}`);
  if(!p.start||!p.dur)add("dates",!p.start&&!p.dur?"Start date and duration missing":!p.start?"Training start date missing":"Training duration missing");
  if(c.phase==="Past expected completion")add("done","Past expected completion ("+fd(c.comp)+")");
  if(!p.code)add("code","No PGT ID");
  if(!p.domicile)add("dom","Domicile missing");
  if(!p.mobile||!p.cnic||!p.pmdc)add("contact",["CNIC","PMDC no.","mobile"].filter((x,i)=>![p.cnic,p.pmdc,p.mobile][i]).join(", ")+" not recorded")});
 return out}
UI.dck="";UI.dcq="";
function dcFix(x){const{p,c,k,rot}=x,n=f=>`name="dc-${f}"`;
 const supOpts=()=>{const pool=DB.faculty.filter(f=>f.active!==false&&canSup(f,p.spec,p.program)),rest=DB.faculty.filter(f=>f.active!==false&&!pool.includes(f)).sort((a,b)=>a.name.localeCompare(b.name));
  return`<select ${n("fid")} aria-label="Supervisor"><option value="">Choose supervisor</option>${pool.length?`<optgroup label="Approved, ${esc(p.spec)}">${pool.map(f=>`<option value="${f.id}">${esc(facName(f))}</option>`).join("")}</optgroup>`:""}<optgroup label="All faculty">${rest.map(f=>`<option value="${f.id}">${esc(facName(f))} · ${esc(f.spec)}</option>`).join("")}</optgroup></select>`};
 if(k==="rotsite")return`<select ${n("site")} aria-label="Hospital"><option value="">Hospital</option>${DB.sites.filter(s=>s.active).map(s=>`<option value="${esc(s.short)}">${esc(s.name)}</option>`).join("")}</select><label class="dcl">from<input type="date" ${n("start")} value="${rot?.start||c.rotStart||""}"></label><label class="dcl">back<input type="date" ${n("ret")} value="${rot?.ret||c.ret||""}"></label>`;
 if(k==="rotret")return`<label class="dcl">back to RIC<input type="date" ${n("ret")} value="${c.ret||""}"></label>`;
 if(k==="sup"||k==="supok")return supOpts()+(k==="supok"?`<a class="btn link" href="#cred-${c.sup.id}">or record their approval</a>`:"");
 if(k==="dates")return`<label class="dcl">start<input type="date" ${n("start")} value="${p.start||""}"></label><label class="dcl">years<select ${n("dur")}>${opt([["",""],"2","3","4","5","6"],p.dur?String(p.dur):"")}</select></label>`;
 if(k==="done")return`<label class="dcl">completed on<input type="date" ${n("cdate")} value="${c.comp||""}"></label><span class="subt">or</span><label class="dcl">new completion<input type="date" ${n("ndate")}></label>`;
 if(k==="code")return`<span class="code">${esc(nextCode(p))}</span>`;
 if(k==="dom")return`<input ${n("dom")} placeholder="District" aria-label="Domicile">`;
 if(k==="contact")return`<input ${n("cnic")} placeholder="CNIC" value="${esc(p.cnic||"")}" aria-label="CNIC"><input ${n("pmdc")} placeholder="PMDC no." value="${esc(p.pmdc||"")}" aria-label="PMDC"><input ${n("mobile")} placeholder="03xx-xxxxxxx" value="${esc(p.mobile||"")}" aria-label="Mobile"><input ${n("email")} placeholder="Email" value="${esc(p.email||"")}" aria-label="Email">`;
 return""}
function vDataCheck(){const all=dcIssues(),q=UI.dcq.toLowerCase();
 const def=all.filter(x=>x.k!=="contact");const rows=(UI.dck?all.filter(x=>x.k===UI.dck):def).filter(x=>!q||(x.p.name+" "+x.p.code+" "+x.p.spec).toLowerCase().includes(q)).sort((a,b)=>specIdx(a.p.spec)-specIdx(b.p.spec)||a.p.name.localeCompare(b.p.name));
 const cnt=k=>all.filter(x=>x.k===k).length;
 return`<div class="head"><div><h2>Data checks</h2><p>Gaps and conflicts in active trainees' records. Fix each one here and press Save; it leaves the list once it is complete. Every change is recorded in the trainee's timeline.</p></div></div>
 <div class="panel" style="display:grid;gap:10px"><div class="toolbar"><input type="search" id="dcq" placeholder="Search trainee" value="${esc(UI.dcq)}" aria-label="Search trainee"></div>
  <div class="chips"><button class="chip" data-dck="" aria-pressed="${!UI.dck}">All except contact<span class="c">${def.length}</span></button>${DC_KINDS.filter(([k])=>cnt(k)).map(([k,l])=>`<button class="chip" data-dck="${k}" aria-pressed="${UI.dck===k}">${l}<span class="c">${cnt(k)}</span></button>`).join("")}</div>
  ${cnt("contact")?`<p class="subt" style="margin:0">Contact details (CNIC, PMDC, mobile) are listed separately because records imported from the Google Sheet do not have them; new registrations bring them in.</p>`:""}</div>
 <div class="panel flush"><div class="tblwrap"><table class="dctable"><thead><tr><th>Trainee</th><th>What is missing</th><th>Fix it here</th><th></th></tr></thead><tbody>
 ${rows.slice(0,150).map(x=>`<tr data-dcrow="${x.p.id}|${x.k}"><td>${pgtName(x.p)}<div class="subt">${esc(x.p.code||"no ID")} · ${esc(x.p.spec)} · ${esc(x.p.program)}</div></td><td class="wrapcell">${esc(x.t)}</td><td><div class="dcfix">${dcFix(x)}</div><div class="err" role="alert"></div></td><td><button class="btn small primary" data-act="dc-save" data-pid="${x.p.id}" data-k="${x.k}">${x.k==="code"?"Assign":x.k==="done"?"Save":"Save"}</button></td></tr>`).join("")||`<tr><td colspan="4" class="empty">Nothing to fix${UI.dck||q?" for this filter":""}.</td></tr>`}
 </tbody></table></div>${rows.length>150?`<p class="subt" style="padding:0 16px 12px">Showing 150 of ${rows.length}. Use the filters above.</p>`:""}</div>`}
function dcSave(b){const pid=b.dataset.pid,k=b.dataset.k,p=DB.pgts.find(x=>x.id===pid),c=CUR.get(pid),tr=b.closest("tr"),v=f=>(tr.querySelector(`[name="dc-${f}"]`)?.value||"").trim(),err=m=>{tr.querySelector(".err").textContent=m};
 const rot=DB.rots.filter(r=>r.pid===pid).sort((a,b)=>a.start<b.start?1:-1)[0];let msg="";
 if(k==="rotsite"){if(!v("site"))return err("Choose the hospital.");if(!v("start"))return err("Enter the rotation start date.");if(v("ret")&&v("ret")<v("start"))return err("Return is before the start.");
  if(rot&&rot.start===v("start")){rot.site=v("site");rot.ret=v("ret")||rot.ret||null}else DB.rots.push({id:uid("R"),pid,site:v("site"),start:v("start"),ret:v("ret")||null,notes:"Added from data checks",by:ME});msg=`Rotation recorded for Dr. ${p.name}: ${v("site")} from ${fd(v("start"))}`}
 if(k==="rotret"){if(!v("ret"))return err("Enter the return date.");if(v("ret")<rot.start)return err("Return is before the rotation start.");rot.ret=v("ret");msg=`Return to RIC for Dr. ${p.name}: ${fd(v("ret"))}`}
 if(k==="sup"||k==="supok"){const f=facById(v("fid"));if(!f)return err("Choose the supervisor.");DB.sups.filter(s=>s.pid===pid&&!s.to).forEach(s=>s.to=iso(TODAY));DB.sups.push({id:uid("V"),pid,fid:f.id,from:iso(TODAY),to:null});msg=`Supervisor of Dr. ${p.name}: ${facName(f)}`}
 if(k==="dates"){if(!p.start&&!v("start"))return err("Enter the start date.");if(!p.dur&&!v("dur"))return err("Choose the duration.");if(v("start"))p.start=v("start");if(v("dur"))p.dur=+v("dur");msg=`Training dates for Dr. ${p.name}: start ${fd(p.start)}, ${p.dur} years`}
 if(k==="done"){if(v("ndate")){p.override=v("ndate");msg=`New completion date for Dr. ${p.name}: ${fd(v("ndate"))}`}else{if(!v("cdate"))return err("Enter the completion date, or a new expected date.");DB.status.push({id:uid("S"),pid,status:"Completed",date:v("cdate"),notes:"From data checks",by:ME});msg=`Dr. ${p.name} completed training on ${fd(v("cdate"))}`}}
 if(k==="code"){p.code=nextCode(p);msg=`PGT ID ${p.code} assigned to Dr. ${p.name}`}
 if(k==="dom"){if(v("dom").length<2)return err("Enter the district.");p.domicile=v("dom");msg=`Domicile of Dr. ${p.name}: ${v("dom")}`}
 if(k==="contact"){const cn=v("cnic"),pm=v("pmdc").toUpperCase(),mo=v("mobile"),em=v("email");
  if(cn&&!/^\d{5}-?\d{7}-?\d$/.test(cn))return err("CNIC must be 13 digits.");if(mo&&!/^03\d{2}-?\d{7}$/.test(mo))return err("Mobile must be 11 digits starting with 03.");if(em&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))return err("Check the email.");
  if(!cn&&!pm&&!mo&&!em)return err("Enter at least one detail.");if(cn)p.cnic=cn.replace(/\D/g,"").replace(/^(\d{5})(\d{7})(\d)$/,"$1-$2-$3");if(pm)p.pmdc=pm;if(mo)p.mobile=mo.replace(/\D/g,"").replace(/^(\d{4})(\d{7})$/,"$1-$2");if(em)p.email=em.toLowerCase();msg=`Contact details updated for Dr. ${p.name}`}
 log(msg,"pgt-"+pid);const y=window.scrollY;render();window.scrollTo(0,y);toast("Saved")}
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||route.v!=="datacheck")return;
 if(b.dataset.dck!=null){UI.dck=b.dataset.dck;render();return}if(b.dataset.act==="dc-save")dcSave(b)});
document.addEventListener("input",e=>{if(e.target.id==="dcq"){UI.dcq=e.target.value;const pos=e.target.selectionStart;render();const n=document.getElementById("dcq");n.focus();n.setSelectionRange(pos,pos)}});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&route.v==="datacheck"&&e.target.closest("[data-dcrow] .dcfix")){e.preventDefault();e.target.closest("tr").querySelector('[data-act="dc-save"]').click()}});

/* ---------- credentials: open the right faculty member at the right form ---------- */
UI.credType=null;UI.credMute=false;
function credTypeOf(issue){return/CPSP/.test(issue)?CRED[1]:/UHS/.test(issue)?CRED[2]:CRED[0]}
function credGo(fid,type){UI.credFac=fid;UI.credType=type||null;if(route.v!=="credentials")go("credentials");else render();setTimeout(()=>{const el=document.getElementById("cr-upload")||document.getElementById("cr-type")?.closest(".panel");if(el){el.scrollIntoView({behavior:"smooth",block:"start"});el.classList.add("flash");setTimeout(()=>el.classList.remove("flash"),1600);document.getElementById("cr-issue")?.focus({preventScroll:true})}},60)}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="cr-goto"]');if(!b)return;e.preventDefault();e.stopPropagation();UI.credSpec=b.dataset.spec||"";credGo(b.dataset.id,b.dataset.type)},true);
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="cr-mute"],[data-act="cr-pick"]');if(!b)return;e.stopPropagation();e.preventDefault();
 if(b.dataset.act==="cr-mute"){UI.credMute=!UI.credMute;render();return}credGo(b.dataset.id,null)},true);
