
/* =====================================================================
   V17 · SIGNED ANNUAL ACADEMIC CALENDAR (Oct 2026 – Dec 2027)
   One-click update of the workshop list to the calendar signed by the
   HoDs, the Executive Director and the DME. TTE moved to Dec 2026 on
   the Director's instruction (3 Nov 2026).
   ===================================================================== */
const CAL_ID="2026-27";
const CAL_ITEMS=[
 {re:/transthoracic|\btte\b/i,month:"2026-12",title:"Basics of Transthoracic Echocardiography",dept:"General Cardiology",focal:"Dr. Iman Iftikhar, Dr. Sana Sarfraz",note:"Moved from Nov 2026 to Dec 2026 on the Director's instruction."},
 {re:/invasive lines/i,month:"2026-12",title:"Invasive Lines and Monitoring",dept:"Cardiothoracic Anaesthesia",focal:"Dr. Palwasha"},
 {re:/conduits/i,month:"2027-01",title:"Conduits in CABG",dept:"Cardiac Surgery",focal:"Dr. Muhammad Azam / Dr. Alifa"},
 {re:/transoesophageal|transesophageal|\btee\b/i,month:"2027-03",title:"Transoesophageal Echocardiography",dept:"General Cardiology",focal:"Dr. Adeel Ur Rehman, Dr. Sana Sarfraz"},
 {re:/coronary angiography/i,month:"2027-04",title:"Basics of Coronary Angiography",dept:"Interventional Cardiology",focal:"Dr. Muhammad Umar Farooq"},
 {re:/cardiopulmonary bypass|\bcpb\b/i,month:"2027-05",title:"Basics of Cardiopulmonary Bypass",dept:"Cardiac Surgery",focal:"Dr. Muhammad Azam",note:"Joint workshop: Cardiac Surgery, Cardiac Anaesthesia and Cardiac Perfusion."},
 {re:/inotrop/i,month:"2027-06",title:"Inotropes and Vasopressors",dept:"Cardiothoracic Anaesthesia",focal:"Dr. Amna"},
 {re:/infection/i,month:"2027-07",title:"Infection Prevention and Control",dept:"Infection Prevention & Control",focal:"Dr. Musab"},
 {re:/paediatric echo|pediatric echo/i,month:"2027-08",title:"Basics of Paediatric Echocardiography",dept:"Paediatric Cardiology",focal:"Dr. Asma Kanwal"},
 {re:/anastomosis/i,month:"2027-09",title:"Anastomosis in Cardiac Surgery",dept:"Cardiac Surgery",focal:"Dr. Muhammad Azam / Dr. Muhammad Sohail Chaudhri"},
 {re:/airway/i,month:"2027-10",title:"Airway Management",dept:"Cardiothoracic Anaesthesia",focal:"Dr. Yasmeen Azeem"},
 {re:/balloon pump|\biabp\b/i,month:"2027-11",title:"Intra-Aortic Balloon Pump",dept:"Cardiac Surgery",focal:"Dr. Muhammad Azam / Dr. Wajeeha"}];
const CAL_BOOT={months:["2026-10","2026-11","2027-03","2027-07","2027-12"],title:"Research Bootcamp",dept:"Research Cell",focal:"Dr. Asma Shabbir"};
const CAL_DROP=/toacs|basics of cardiac anaesthesia|basics of cardiac anesthesia/i;
const calFirst=f=>String(f||"").split(/\s*[\/,]\s*/)[0].trim();
const isBoot=w=>w.series==="Research Bootcamp"||/research boot ?camp/i.test(w.title);
const wsBusy=w=>w.stage>0||(w.regs||[]).length||w.proposal;

function calPlan(){const W=DB.workshops.filter(w=>!w.example),used=new Set(),ops=[];
 // only the month changes; the focal person and course director are filled in only where missing
 const upd=(w,it,extra)=>{const ch={};
  if(w.month!==it.month)ch.month=it.month;
  if(!(w.focal||"").trim())ch.focal=it.focal;if(!(w.director||"").trim())ch.director=calFirst(it.focal);
  if(it.note&&ch.month&&!(w.notes||"").includes(it.note))ch.notes=((w.notes||"")+" "+it.note).trim();
  if(ch.month&&w.date&&!w.date.startsWith(ch.month))ch.date=null;
  if(Object.keys(ch).length||w.placeholder)ops.push({t:"upd",w,ch,...extra})};
 CAL_ITEMS.forEach(it=>{const c=W.filter(w=>!used.has(w)&&!isBoot(w)&&it.re.test(w.title)).sort((a,b)=>Math.abs(+P(a.month+"-01")-+P(it.month+"-01"))-Math.abs(+P(b.month+"-01")-+P(it.month+"-01")));
  if(c.length){used.add(c[0]);upd(c[0],it)}else ops.push({t:"add",rec:{title:it.title,dept:it.dept,focal:it.focal,director:calFirst(it.focal),month:it.month,notes:it.note||""}})});
 const boots=W.filter(isBoot).sort((a,b)=>a.month<b.month?-1:1),need=[...CAL_BOOT.months];
 boots.filter(w=>need.includes(w.month)).forEach(w=>{need.splice(need.indexOf(w.month),1);used.add(w);upd(w,{...CAL_BOOT,month:w.month})});
 boots.filter(w=>!used.has(w)).forEach(w=>{if(need.length&&!wsBusy(w)){used.add(w);upd(w,{...CAL_BOOT,month:need.shift()})}else if(w.stage>=5){used.add(w)}});
 need.forEach(m=>ops.push({t:"add",rec:{title:CAL_BOOT.title,dept:CAL_BOOT.dept,focal:CAL_BOOT.focal,director:CAL_BOOT.focal,month:m,series:"Research Bootcamp",notes:""}}));
 W.filter(w=>!used.has(w)).forEach(w=>{const off=CAL_DROP.test(w.title)||isBoot(w);
  if(w.stage<5)ops.push({t:"keep",w,why:"not on the signed calendar"})});
 return ops}
const calDone=()=>DB.settings.calApplied===CAL_ID||DB.workshops.some(w=>w.cal===CAL_ID);
function calPanel(){if(calDone()||isViewer())return"";const ops=calPlan(),real=ops.filter(o=>o.t!=="keep");if(!real.length)return"";
 const L={month:"month",focal:"focal person",director:"course director",notes:"note",date:"fixed date cleared (not in the new month)"};
 const row=o=>o.t==="upd"?`<tr><td>${esc(o.w.title)}</td><td>${mLabel(o.w.month)}</td><td><b>${mLabel(o.ch.month||o.w.month)}</b></td><td class="subt">${Object.keys(o.ch).filter(k=>k!=="title"&&k!=="month").map(k=>k==="focal"?"focal: "+esc(o.ch.focal):k==="director"?"":L[k]).filter(Boolean).join(" · ")||"month confirmed"}</td></tr>`
  :o.t==="add"?`<tr><td><b>${esc(o.rec.title)}</b><div class="subt">new on the calendar</div></td><td>—</td><td><b>${mLabel(o.rec.month)}</b></td><td class="subt">focal: ${esc(o.rec.focal)}</td></tr>`
  :o.t==="del"?`<tr style="opacity:.7"><td><s>${esc(o.w.title)}</s><div class="subt">not on the signed calendar; will be removed</div></td><td>${mLabel(o.w.month)}</td><td>—</td><td></td></tr>`
  :`<tr style="opacity:.7"><td>${esc(o.w.title)}<div class="subt">${esc(o.why)}; left as it is</div></td><td>${mLabel(o.w.month)}</td><td>${mLabel(o.w.month)}</td><td></td></tr>`;
 const n=k=>ops.filter(o=>o.t===k).length;
 return`<div class="panel" id="calupd" style="display:grid;gap:10px;border-color:var(--gold)"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
  <div><h3 style="margin:0">Update to the signed Annual Academic Calendar (Oct 2026 – Dec 2027)</h3><p class="subt" style="margin:4px 0 0">${n("upd")} workshops get their calendar month, ${n("add")} on the calendar are added. Focal persons are filled in only where none is recorded. Nothing is deleted, and titles, proposals, registrations and finances stay as they are. Transthoracic Echocardiography goes to December 2026.</p></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="cal-show">${UI.calShow?"Hide changes":"See changes"}</button><button class="btn primary" data-act="cal-apply">Apply calendar</button></div></div>
  ${UI.calShow?`<div class="tblwrap"><table><thead><tr><th>Workshop</th><th>Now</th><th>Signed calendar</th><th>Also</th></tr></thead><tbody>${ops.sort((a,b)=>((a.ch&&a.ch.month)||(a.rec&&a.rec.month)||a.w.month).localeCompare((b.ch&&b.ch.month)||(b.rec&&b.rec.month)||b.w.month)).map(row).join("")}</tbody></table></div>`:""}
  <p class="subt" style="margin:0">Exams (Jun/Jul and Nov/Dec) and PGT orientation (first week of Feb and Aug) are already fixed in the calendar view.</p></div>`}
function calApply(){const ops=calPlan();let m=0,a=0,d=0;
 ops.forEach(o=>{if(o.t==="upd"){const from=o.w.month;Object.assign(o.w,o.ch);delete o.w.placeholder;o.w.cal=CAL_ID;wlog(o.w,"Set to the signed Annual Academic Calendar"+(o.ch.month?` (moved from ${mLabel(from)} to ${mLabel(o.w.month)})`:""));m++}
  if(o.t==="add"){const nw=blankWs({id:uid("W"),...o.rec,cal:CAL_ID});DB.workshops.push(nw);wlog(nw,"Added from the signed Annual Academic Calendar");a++}
  if(o.t==="del"){DB.workshops=DB.workshops.filter(x=>x!==o.w);log(`Removed ${o.w.title} (${mLabel(o.w.month)}): not on the signed Annual Academic Calendar`);d++}});
 DB.settings.calApplied=CAL_ID;log(`Workshop list set to the signed Annual Academic Calendar Oct 2026 – Dec 2027: ${m} updated, ${a} added, ${d} removed`);persist();UI.calShow=false;toast("Calendar applied");render()}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="cal-show"],[data-act="cal-apply"]');if(!b)return;
 if(b.dataset.act==="cal-show"){UI.calShow=!UI.calShow;const y=window.scrollY;render();window.scrollTo(0,y);return}
 if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to apply";return}calApply()});
/* new installs start from the signed calendar */
function seedWorkshops(){const ws=[];let i=0;
 CAL_ITEMS.forEach(it=>ws.push(blankWs({id:"W"+String(++i).padStart(2,"0"),title:it.title,dept:it.dept,focal:it.focal,director:calFirst(it.focal),month:it.month,notes:it.note||"",cal:CAL_ID})));
 CAL_BOOT.months.forEach((m,k)=>ws.push(blankWs({id:"WB"+(k+1),title:CAL_BOOT.title,dept:CAL_BOOT.dept,focal:CAL_BOOT.focal,director:CAL_BOOT.focal,month:m,series:"Research Bootcamp",cal:CAL_ID})));
 ws.push(seedExampleWs());return ws}
