
/* =====================================================================
   V38 · 1 section chips at the top of long pages (workshop, PGT, faculty,
   orientation): tap one to show only that part, "All" to show everything.
   2 PGT profile: workshops registered for and attended (from registrations
   linked to the PGT, or with the PGT's mobile number).
   ===================================================================== */

/* ---------- 1. section chips ---------- */
const SEC_PAGES=["ws","pgt","fac","orient"];
UI.sec=UI.sec||{};
function secName(t){t=String(t||"").replace(/\s+/g," ").trim();const L=t.toLowerCase();
 const map=[[/^feedback/,"Feedback"],[/^registration/,"Registration"],[/^participants/,"Participants"],[/^income|^finance|^expenses/,"Finance"],[/^next step/,"Next step"],[/^key dates/,"Dates"],[/^details/,"Details"],[/^history/,"History"],[/^report/,"Report"],
  [/^internal exam/,"Exams"],[/^workshops/,"Workshops"],[/^conduct/,"Conduct"],[/^timeline/,"Timeline"],[/^training/,"Training"],[/^personal/,"Personal"],[/^documents/,"Documents"],[/^bio/,"Bio data"],[/^training status/,"Training status"],
  [/^overview/,"Overview"],[/^pass rate by/,"Specialties"],[/^score distribution/,"Distribution"],[/^by year/,"By year"],[/^trainees to watch/,"To watch"],[/^top scores/,"Top scores"],[/^trend/,"Trend"],[/^all examinations/,"All exams"],[/^practice/,"Practice"],
  [/^credentials/,"Credentials"],[/^certificate/,"Certificates"],[/^active pgts|^pgts supervised/,"PGTs"],[/^checklist/,"Checklist"],[/^agenda/,"Agenda"]];
 for(const[re,n]of map)if(re.test(L))return n;return t.split(/ · |\s+\(|:/)[0].slice(0,22)}
function secBar(){const main=document.getElementById("main");if(!main)return;const old=main.querySelector(".secbar");if(old)old.remove();
 if(!SEC_PAGES.includes(route.v))return;const key=(typeof secKey==="function"?secKey():route.v+"-"+route.id);
 const H=":scope > h3, :scope > .head h3, :scope > .head > div > h3";
 const head=[...main.children].find(c=>c.querySelector&&(c.matches(".panel")&&c.querySelector("h2")||c.matches(".head")));
 const label=p=>{const h=p.querySelector(H);if(h)return secName(h.textContent);const h2=p.querySelector("h2");if(!h2)return null;const t=(p.textContent||"").trim().split("\n")[0];return /report/i.test(t)?"Report":secName(h2.textContent)};
 const panels=[...main.querySelectorAll(".panel")].filter(p=>p!==head&&!p.closest(".sheet")&&!p.parentElement.closest(".panel")&&label(p));
 if(panels.length<3)return;const groups=[];panels.forEach(p=>{const n=label(p);p.dataset.sec=n;if(!groups.includes(n))groups.push(n)});
 if(groups.length<3)return;let cur=UI.sec[key];if(cur&&!groups.includes(cur))cur="";
 const bar=document.createElement("nav");bar.className="secbar";bar.setAttribute("aria-label","Sections of this page");
 bar.innerHTML=[["","All"],...groups.map(g=>[g,g])].map(([k,l])=>`<button type="button" class="chip" data-sec="${esc(k)}" aria-pressed="${(cur||"")===k}">${esc(l)}</button>`).join("");
 /* the bar goes under the page's own heading block */
 if(head)head.after(bar);else main.prepend(bar);
 panels.forEach(p=>p.classList.toggle("sechide",!!cur&&p.dataset.sec!==cur));
 main.querySelectorAll(".cols").forEach(c=>{const ps=[...c.querySelectorAll(":scope > .panel, :scope > div > .panel")];c.classList.toggle("secsolo",!!cur&&ps.some(p=>!p.classList.contains("sechide")))});
 const on=bar.querySelector('[aria-pressed="true"]');if(on&&on.dataset.sec)bar.scrollLeft=Math.max(0,on.offsetLeft-bar.clientWidth/2+on.offsetWidth/2)}
{const _r=render;render=function(){_r.apply(this,arguments);try{secBar()}catch(e){}}}
document.addEventListener("click",e=>{const b=e.target.closest(".secbar [data-sec]");if(!b)return;UI.sec[typeof secKey==="function"?secKey():route.v+"-"+route.id]=b.dataset.sec;secBar();
 const bar=document.querySelector("#main .secbar");if(bar){const top=bar.getBoundingClientRect().top+scrollY-(parseInt(getComputedStyle(document.documentElement).getPropertyValue("--abh"))||64)-4;if(scrollY>top)scrollTo({top,behavior:"smooth"})}});

/* ---------- 2. workshops on the PGT profile ---------- */
const mob10=m=>String(m||"").replace(/\D/g,"").slice(-10);
function pgtWsRegs(p){const m=[mob10(p.mobile),mob10(p.mobile2)].filter(x=>x.length===10),out=[];
 DB.workshops.forEach(w=>regsOf(w).forEach(r=>{const hit=r.pid?r.pid===p.id:(m.length&&m.includes(mob10(r.a&&r.a.mobile)));if(hit)out.push({w,r})}));
 return out.sort((a,b)=>(b.w.date||b.w.month+"-01").localeCompare(a.w.date||a.w.month+"-01"))}
function wsRegState(w,r){if(r.status==="Cancelled")return["Cancelled","p-done"];
 if(w.stage>=5){if(r.present)return["Attended","p-ric"];if(r.status==="Confirmed")return[r.present===false?"Did not attend":"Attendance not marked",r.present===false?"p-bad":"p-pause"];return[r.status==="Waiting list"?"Waiting list, no seat":r.status,"p-done"]}
 return[r.status==="Confirmed"?"Registered":r.status==="Waiting list"?"Waiting list":"Registered · payment pending",r.status==="Confirmed"?"p-rot":"p-pause"]}
function pgtWsPanel(p){if(!canSee("pgts")&&!canSee("workshops"))return"";const L=pgtWsRegs(p);const att=L.filter(x=>x.w.stage>=5&&x.r.present).length;
 return`<div class="panel flush"><h3 style="padding:14px 16px 0;margin:0">Workshops · ${att} attended${L.length>att?`, ${L.length-att} other registration${L.length-att===1?"":"s"}`:""}</h3>
 ${L.length?`<div class="tblwrap"><table><thead><tr><th>Workshop</th><th>Date</th><th>Status</th></tr></thead><tbody>${L.map(({w,r})=>{const[s,c]=wsRegState(w,r);return`<tr class="click" data-href="ws-${w.id}"><td><a href="#ws-${w.id}">${esc(w.title)}</a>${w.dept?`<div class="subt">${esc(w.dept)}</div>`:""}</td><td>${w.date?fd(w.date):mLabel(w.month)}</td><td><span class="pill ${c}">${esc(s)}</span>${r.byHand?'<div class="subt">added by the DME&T office</div>':""}</td></tr>`}).join("")}</tbody></table></div>`
  :`<p class="subt" style="padding:0 16px 14px;margin:6px 0 0">No workshop registrations yet. They appear here when this PGT registers (picking their name on the form) or is added from the workshop or the trainee register.</p>`}</div>`}
{const _e=pgtExamPanel;pgtExamPanel=function(p){return _e(p)+(p.reg==="Verified"?pgtWsPanel(p):"")}}
{const _t=extraTimeline;extraTimeline=function(p){const ev=_t(p);pgtWsRegs(p).filter(x=>x.w.stage>=5&&x.r.present).forEach(({w})=>ev.push({d:w.date||w.month+"-01",k:"ws",e:`Attended workshop: ${w.title}`,n:w.dept||"",by:""}));return ev}}
/* trainee register export: workshops attended */
{const _x=EXPORTS.pgts;if(_x)EXPORTS.pgts=(...a)=>{const o=_x(...a);try{(o.sheets||[]).forEach(s=>{if(!Array.isArray(s.rows)||!s.rows.length||Array.isArray(s.rows[0]))return;s.rows.forEach(row=>{const p=DB.pgts.find(z=>z.code&&z.code===row["PGT ID"]);if(p)row["Workshops attended"]=pgtWsRegs(p).filter(x=>x.w.stage>=5&&x.r.present).map(x=>x.w.title).join("; ")})})}catch(e){}return o}}
