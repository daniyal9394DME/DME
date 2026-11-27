
/* =====================================================================
   P59 · SETTINGS: GROUPED, SEARCHABLE, MORE TO ADJUST
   The Settings page was one long scroll. Its sections are now in
   groups: a menu on the left (computer) or a row of buttons (phone),
   with "Find a setting" searching every group. Sections added later
   by other modules land in "Other" automatically, so none is lost.
   New adjustable numbers (defaults = how the app worked before):
     ac_soon 180     accreditation "renew soon" window, days
     obs_wait 14     days with the MS before "follow up"
     obs_end 3       observership "ending soon", days
     task_soon 3     tasks "due soon", days
     backup_days 7   backup reminder after, days
   Settings kept elsewhere (online forms, observership fees and times,
   weekly off days, my preferences) are reachable from here too.
   ===================================================================== */
const ST_DEF={return_red:14,return_yellow:30,complete_red:30,complete_yellow:90,leave_soon:14,leave_recent:7,cert_warn:90,overload:10,proposal_weeks:8,director_share:60,
 ac_soon:180,obs_wait:14,obs_end:3,task_soon:3,backup_days:7};
const stN=(k)=>{const v=DB&&DB.settings?DB.settings[k]:undefined;return v===undefined||v===null||v===""||isNaN(+v)?ST_DEF[k]:+v};
{const _r=render;render=function(){if(DB&&DB.settings&&typeof OBS_WAIT!=="undefined")OBS_WAIT=stN("obs_wait");return _r.apply(this,arguments)}}

const ST_GROUPS=[
 ["alerts","Alerts and reminders","When the app warns you: colours, days ahead, reminders.",["set-thr","set-more"]],
 ["specs","Specialties and programmes","Specialties, programme durations and rotation rules.",["set-spec"]],
 ["trainees","Trainees","Rotation sites, weekly off days, leave types, reasons for leaving, units.",["set-sites","set-rotoff","set-lt","set-exit","set-units"]],
 ["forms","Forms and links","Online forms: open or closed, closing date, message. Observership fees and times.",["set-forms"]],
 ["team","Team and logins","Who can sign in and what each person can see.",["set-staff"]],
 ["data","Data and backup","Backup, update files, removed records.",["set-backup","set-import","set-upd","set-bin"]],
 ["device","My device","Theme, text size, menu pages and dashboard sections on this device.",["set-device"]]];

const stNum=(k,l,h)=>`<label class="f">${l}${h?` <span class="h">${h}</span>`:""}<input type="number" min="0" data-setting="${k}" value="${stN(k)}"></label>`;
function stMorePanel(){return`<div class="panel" id="set-more" style="display:grid;gap:10px"><h3 style="margin:0">More reminders</h3>
 <div class="formgrid3">${stNum("task_soon","Tasks: “due soon” within days","default 3")}${stNum("backup_days","Backup reminder after days","default 7")}${stNum("ac_soon","Accreditation: “renew soon” within days","default 180 (6 months)")}
 ${stNum("obs_wait","Observership: follow up with the MS after days","default 14")}${stNum("obs_end","Observership: “ending soon” within days","default 3")}</div>
 <div class="actions" style="justify-content:flex-start"><button class="btn small" data-act="st-defaults">Restore all alert defaults</button></div></div>`}
function stRotOffPanel(){const D=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
 return`<div class="panel" id="set-rotoff" style="display:grid;gap:8px"><h3 style="margin:0">Weekly off days</h3><p style="margin:0">Rotating trainees and observers: <b>${rotOff().map(d=>D[d]).join(", ")||"none"}</b>. Not counted as working days.</p>
 <div class="actions" style="justify-content:flex-start"><button class="btn small" data-act="st-rotoff">Change</button></div></div>`}
function stFormsPanel(){const ks=["pgt","sur","rot"].filter(k=>typeof formCfg==="function"&&FORM_DEF[k]);
 const row=k=>{const c=formCfg(k),op=formIsOpen(c);return`<tr><td><b>${esc(formName(k))}</b>${c.close?`<div class="subt">closes ${fd(c.close)}</div>`:""}</td><td><span class="pill ${op?"p-ric":"p-done"}">${op?"Open":"Closed"}</span></td>
  <td><span class="actions"><button class="btn small" data-act="form-edit" data-k="${k}">Edit</button><button class="btn small" data-act="form-qr" data-k="${k}">QR</button><button class="btn small" data-act="form-copy" data-k="${k}">Copy link</button></span></td></tr>`};
 const oc=typeof obsCfg==="function"?obsCfg():null;
 return`<div class="panel" id="set-forms" style="display:grid;gap:10px"><h3 style="margin:0">Online forms</h3>
 <div class="tblwrap"><table><thead><tr><th>Form</th><th>Status</th><th></th></tr></thead><tbody>${ks.map(row).join("")}
 ${oc?`<tr><td><b>Observership application</b><div class="subt">fees, attendance time, categories</div></td><td><span class="pill ${formIsOpen(oc)?"p-ric":"p-done"}">${formIsOpen(oc)?"Open":"Closed"}</span></td><td><span class="actions"><button class="btn small" data-act="st-obscfg">Edit</button></span></td></tr>`:""}</tbody></table></div>
 <p class="subt" style="margin:0">Edit opens or closes a form, sets a closing date and the message shown to people filling it in.</p></div>`}
function stDevicePanel(){return`<div class="panel" id="set-device" style="display:grid;gap:8px"><h3 style="margin:0">My preferences</h3><p style="margin:0">Light or dark look, text size, compact lists, which pages show in the menu and which sections show on the dashboard. These apply only to this phone or computer.</p>
 <div class="actions" style="justify-content:flex-start"><button class="btn small primary" data-act="prefs">Open my preferences</button></div></div>`}

/* Specialties table: 8 columns became too wide. Level and councils go under the name; PGTs and faculty share a column;
   status sits with Edit. On a phone each specialty is a stacked block. Works on the rendered table, so nothing else changes. */
function stSpecTidy(R){const t=R.querySelector("#set-spec table");if(!t)return;const hs=[...t.querySelectorAll("thead th")].map(h=>h.textContent.trim());
 const ix=n=>hs.indexOf(n),iL=ix("Level · councils"),iP=ix("PGTs"),iF=ix("Faculty"),iS=ix("Status");if([iL,iP,iF,iS].some(i=>i<0))return;
 t.querySelectorAll("tbody tr").forEach(tr=>{const c=[...tr.children];const lv=c[iL].textContent.trim();if(lv&&lv!=="—")c[0].insertAdjacentHTML("beforeend",`<div class="subt">${esc(lv)}</div>`);
  c[iP].innerHTML=`${c[iP].textContent} PGTs<div class="subt">${c[iF].textContent} faculty</div>`;c[iP].classList.remove("num");
  const last=c[c.length-1];last.insertAdjacentHTML("afterbegin",c[iS].innerHTML+" ");[c[iL],c[iF],c[iS]].forEach(x=>x.remove());
  c[1].dataset.l="Programmes";c[2].dataset.l="Rotation"});
 const th=[...t.querySelectorAll("thead th")];th[iP].textContent="Trainees";th[iP].classList.remove("num");[th[iL],th[iF],th[iS]].forEach(x=>x.remove());t.classList.add("st-spec")}
{const _v=vSettings;vSettings=function(){const t=document.createElement("template");t.innerHTML=_v();const R=t.content;
 const chips=R.querySelector(".chips");if(chips&&chips.querySelector("[data-jump],[data-act='prefs']"))chips.remove();
 const hp=R.querySelector(".head p");if(hp&&/Replaces the Settings tab/.test(hp.textContent))hp.textContent="Changes apply across the app at once, for everyone. Choose a group, or find a setting by name.";
 stSpecTidy(R);
 const thr=R.querySelector("#set-thr");if(thr)thr.insertAdjacentHTML("afterend",stMorePanel());
 const extra=document.createElement("template");extra.innerHTML=stRotOffPanel()+stFormsPanel()+stDevicePanel();R.append(extra.content);
 const head=R.querySelector(".head");const used=new Set(),grp=ST_GROUPS.map(([k,l,d,ids])=>{const P=ids.map(id=>R.querySelector("#"+id)).filter(Boolean);P.forEach(p=>used.add(p));return[k,l,d,P]});
 const other=[...R.querySelectorAll(".panel")].filter(p=>!used.has(p)&&!p.parentElement.closest(".panel"));if(other.length)grp.push(["other","Other","Other settings.",other]);
 const G=grp.filter(g=>g[3].length),cur=G.some(g=>g[0]===UI.setTab)?UI.setTab:(stLast()||G[0][0]);UI.setTab=G.some(g=>g[0]===cur)?cur:G[0][0];
 return`${head?head.outerHTML:"<div class=\"head\"><div><h2>Settings</h2></div></div>"}
 <div class="st-wrap"><nav class="st-nav" aria-label="Settings groups"><input type="search" id="st-q" placeholder="Find a setting" autocomplete="off" value="${esc(UI.setQ||"")}">
  <div class="st-tabs">${G.map(([k,l])=>`<button class="st-tab" data-sttab="${k}" aria-pressed="${k===UI.setTab}">${esc(l)}</button>`).join("")}</div></nav>
  <div class="st-body">${G.map(([k,l,d,P])=>`<section class="st-grp" data-stgrp="${k}" ${k===UI.setTab?"":"hidden"}><div class="st-gh"><h3>${esc(l)}</h3><p class="subt">${esc(d)}</p></div>${P.map(p=>p.outerHTML).join("")}</section>`).join("")}
  <p class="empty panel" id="st-none" hidden>No setting matches the search.</p></div></div>`}}
const stLast=()=>{try{return localStorage.getItem("dme-set-tab")}catch(e){return null}};
function stShow(k){UI.setTab=k;try{localStorage.setItem("dme-set-tab",k)}catch(e){}document.querySelectorAll("main .st-tab").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.sttab===k)));
 document.querySelectorAll("main .st-grp").forEach(s=>s.hidden=s.dataset.stgrp!==k);const n=document.querySelector("main .st-body");if(n&&innerWidth<800)n.scrollIntoView({block:"start",behavior:"smooth"})}
/* search: every section in every group whose text matches; the group headings stay for context */
function stFind(q){q=(q||"").trim().toLowerCase();UI.setQ=q;const G=[...document.querySelectorAll("main .st-grp")];let n=0;
 if(!q){G.forEach(s=>{s.hidden=s.dataset.stgrp!==UI.setTab;s.querySelectorAll(".panel").forEach(p=>p.hidden=false)});document.querySelectorAll("main .st-tab").forEach(b=>b.disabled=false);const e=document.getElementById("st-none");if(e)e.hidden=true;return}
 G.forEach(s=>{const gl=s.querySelector(".st-gh").textContent.toLowerCase().includes(q);let any=false;
  s.querySelectorAll(":scope > .panel").forEach(p=>{const hit=gl||[p.textContent,...[...p.querySelectorAll("input,select,textarea")].map(i=>(i.placeholder||"")+" "+(i.value||""))].join(" ").toLowerCase().includes(q);p.hidden=!hit;if(hit){any=true;n++}});s.hidden=!any});
 document.querySelectorAll("main .st-tab").forEach(b=>{const s=document.querySelector(`main .st-grp[data-stgrp="${b.dataset.sttab}"]`);b.disabled=!!(s&&s.hidden)});
 const e=document.getElementById("st-none");if(e)e.hidden=n>0}
document.addEventListener("click",e=>{const b=e.target.closest("[data-sttab],[data-act='st-defaults'],[data-act='st-rotoff'],[data-act='st-obscfg'],[data-jump]");if(!b||!DB||route.v!=="settings")return;
 if(b.dataset.sttab){const q=document.getElementById("st-q");if(q&&q.value){q.value="";stFind("")}stShow(b.dataset.sttab);return}
 if(b.dataset.jump){const g=ST_GROUPS.find(x=>x[3].includes(b.dataset.jump));if(g){e.preventDefault();e.stopImmediatePropagation();stShow(g[0]);const p=document.getElementById(b.dataset.jump);if(p)p.scrollIntoView({block:"start"})}return}
 const a=b.dataset.act;if(isViewer())return;
 if(a==="st-rotoff")return sheetRotOff();if(a==="st-obscfg")return sheetObsCfg();
 if(a==="st-defaults"){if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to restore the defaults";return}
  Object.entries(ST_DEF).forEach(([k,v])=>{if(k!=="director_share"&&k!=="proposal_weeks")DB.settings[k]=v});log("Alert and reminder settings restored to the defaults");persist();toast("Defaults restored");render()}},true);
document.addEventListener("input",e=>{if(e.target.id==="st-q")stFind(e.target.value)});
/* after any redraw of Settings, keep the search applied */
{const _r=render;render=function(){const r=_r.apply(this,arguments);if(route.v==="settings"&&UI.setQ)setTimeout(()=>stFind(UI.setQ),0);return r}}

if(!document.getElementById("st-css"))document.head.insertAdjacentHTML("beforeend",`<style id="st-css">
.st-wrap{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px;align-items:start}
.st-nav{position:sticky;top:calc(var(--abh,64px) + 10px);display:grid;gap:10px;align-self:start}
.st-nav input{width:100%;box-sizing:border-box;min-width:0}
.st-tabs{display:grid;gap:2px}
.st-tab{all:unset;cursor:pointer;padding:9px 12px;border-radius:8px;font-weight:600;color:var(--ink);font-size:14.5px}
.st-tab:hover{background:var(--sunk)}.st-tab[aria-pressed="true"]{background:var(--brand-soft);color:var(--brand)}.st-tab:focus-visible{outline:2px solid var(--brand)}.st-tab:disabled{opacity:.35;cursor:default}
.st-body{display:grid;gap:12px;min-width:0}.st-grp{display:grid;gap:12px;min-width:0}.st-grp[hidden],.st-grp .panel[hidden],#st-none[hidden]{display:none}
.st-gh h3{margin:0}.st-gh p{margin:2px 0 0}
.st-grp .cols.two{display:contents}
.st-spec td{white-space:normal;vertical-align:top}.st-spec td:last-child{white-space:nowrap;text-align:right}.st-spec .code{white-space:normal}
@media (max-width:800px){.st-wrap{grid-template-columns:1fr}
 .st-spec thead{display:none}.st-spec,.st-spec tbody,.st-spec tr,.st-spec td{display:block;width:auto}.st-spec tr{padding:10px 14px;border-bottom:1px solid var(--line)}.st-spec td{border:0;padding:2px 0}
 .st-spec td[data-l]::before{content:attr(data-l) ": ";color:var(--muted);font-size:13px}.st-spec td:last-child{text-align:left;padding-top:6px}.st-nav{position:static}
 .st-tabs{display:flex;flex-wrap:wrap;gap:6px}
 .st-tab{white-space:nowrap;border:1px solid var(--line2);border-radius:999px;padding:6px 12px;font-size:13.5px;background:var(--surface)}}
</style>`);
