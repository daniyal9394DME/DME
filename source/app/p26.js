
/* =====================================================================
   V24 · PRINT PROGRAMME: a clean programme on RIC letterhead from the
   proposal's schedule (affirmed version if there is one), day by day
   ===================================================================== */
const t12=s=>{const[h,m]=String(s||"").split(":").map(Number);if(isNaN(h))return"";return`${h%12||12}:${String(m||0).padStart(2,"0")} ${h<12?"am":"pm"}`};
function progData(w){if(!w||!w.proposal)return null;const V=w.proposal.final||w.proposal.submitted.values;const q=(w.pfq||[]).find(x=>x.type==="sched");
 const R=q?pbSched(V[q.k]||[]).filter(r=>r.start||r.topic):[];return R.length?{R,V}:null}
function progPrint(w){const p=progData(w);if(!p)return;const lg=document.querySelector('img[alt="RIC logo"]')?.src||"";const x=window.open("","_blank");if(!x){toast("Allow pop-ups to print the programme");return}
 const days=[...new Set(p.R.map(r=>r.day||1))].sort((a,b)=>a-b),dt=w.date||p.V.date,ven=String(w.venue||p.V.venue||"").replace(/^Other:?\s*/,"");
 const dayDate=d=>{if(!dt)return"";const x=new Date(dt+"T00:00");x.setDate(x.getDate()+d-1);return fd(iso(x))};
 const rows=d=>p.R.filter(r=>(r.day||1)===d).map(r=>{const t=pbT(r.type);return`<tr class="${t.brk?"brk":""}"><td class="t">${esc(t12(r.start))}${r.end?" – "+esc(t12(r.end)):""}</td><td><span class="ty">${esc(t.l)}</span>${r.topic?`<div>${esc(r.topic)}</div>`:""}</td><td class="who">${esc(r.by||"")}</td></tr>`}).join("");
 x.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Programme · ${esc(w.title)}</title><style>body{font:14px/1.45 Georgia,serif;margin:40px;color:#222}header{text-align:center;margin-bottom:14px}header img{width:64px}h1{font-size:22px;margin:6px 0 2px}h2{font-size:15px;font-weight:normal;margin:0;color:#555}h3{font-size:15px;margin:22px 0 0;color:#6D1F2B}table{width:100%;border-collapse:collapse;margin-top:8px}td,th{border-bottom:1px solid #ccc;padding:8px 6px;text-align:left;vertical-align:top}th{background:#f3eee6}td.t{white-space:nowrap;width:140px;font-family:Arial,sans-serif;font-size:13px}.ty{font-weight:bold}.who{color:#555;font-size:13px}.brk td{background:#faf7f2;color:#666}@media print{body{margin:16mm}}</style></head><body>
  <header>${lg?`<img src="${lg}" alt="">`:""}<div style="font-size:13px;letter-spacing:.06em">RAWALPINDI INSTITUTE OF CARDIOLOGY · DEPARTMENT OF MEDICAL EDUCATION</div><h1>${esc(w.title)}</h1><h2>${dt?fd(dt):""}${days.length>1&&dt?" – "+dayDate(days[days.length-1]):""}${ven?" · "+esc(ven):""}</h2>${w.director||w.focal?`<div style="font-size:13px;margin-top:4px">Course director: ${esc(String(w.director||w.focal).replace(/^Other:?\s*/,""))}</div>`:""}</header>
  ${days.map(d=>`${days.length>1?`<h3>Day ${d}${dt?" · "+dayDate(d):""}</h3>`:""}<table><thead><tr><th>Time</th><th>Session</th><th>Speaker / facilitator</th></tr></thead><tbody>${rows(d)}</tbody></table>`).join("")}
  <script>setTimeout(()=>print(),300)<\/script></body></html>`);x.document.close()}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="ws-prog"]');if(!b)return;const w=DB.workshops.find(x=>x.id===b.dataset.id);if(w)progPrint(w)});
VIEW_ACTS.add("ws-prog");
/* compatibility: proposals saved with the short-lived V24 table format (9 Nov) */
{const MAP={"Registration":"reg","Pre-test":"reg","Inauguration / welcome":"open","Lecture":"lecture","Demonstration":"demo","Hands-on station":"handson","Case discussion":"case","Panel discussion":"panel","Tea break":"break","Lunch / prayer break":"lunch","Post-test":"close","Feedback":"close","Closing and certificates":"close","Other":"lecture"};
 const fixVals=V=>{if(!V)return false;let ch=false;
  if(Array.isArray(V.schedule))V.schedule.forEach(r=>{if(r&&typeof r==="object"){if(r.who!=null&&r.by==null){r.by=r.who;delete r.who;ch=true}if(MAP[r.type]){r.type=MAP[r.type];ch=true}}});
  if(Array.isArray(V.resources))V.resources.forEach(r=>{if(r&&typeof r==="object"&&r.cost!=null&&r.unit==null){r.unit=r.cost;delete r.cost;ch=true}});return ch};
 const _u=pbUpgrade;pbUpgrade=function(w){let ch=false;(w&&w.pfq||[]).forEach(q=>{if(q.type==="people"){q.type="roster";ch=true}});
  if(w&&w.proposal){if(fixVals(w.proposal.submitted&&w.proposal.submitted.values))ch=true;if(fixVals(w.proposal.final))ch=true}return _u(w)||ch}}

/* small screens: the account details fold into a button so the header stays on one line */
VIEW_ACTS.add("usermenu");
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="usermenu"]'),box=document.getElementById("userbox");if(!box)return;
 if(b){e.stopPropagation();const o=!box.classList.contains("open");box.classList.toggle("open",o);b.setAttribute("aria-expanded",String(o));return}
 if(box.classList.contains("open")&&!e.target.closest(".whobox")){box.classList.remove("open");box.querySelector(".avbtn")?.setAttribute("aria-expanded","false")}},true);
window.addEventListener("hashchange",()=>{const box=document.getElementById("userbox");if(box)box.classList.remove("open")});
