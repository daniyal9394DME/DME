/* =====================================================================
   V56 · SMOOTHER DAY-TO-DAY USE
   1 Dates from saved timestamps are read in Pakistan time (a challan
     issued at 1 a.m. no longer shows the day before).
   2 A screen left open overnight moves to the new day by itself, so
     attendance tapped in the morning is not saved under yesterday.
   3 When a new version is uploaded, open screens offer to reload; the
     attendance kiosk reloads itself when nobody is using it.
   4 Search also finds rotating trainees and observers (name, CNIC,
     mobile, institution, challan number) and opens with Ctrl+K as well
     as /. Recently opened lists them too (V38).
   5 Results can also go to each trainee (one WhatsApp message each).
   ===================================================================== */
/* 1 · a saved timestamp as a local date */
function dDay(s){if(!s)return"";s=String(s);if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const d=new Date(s);return isNaN(d)?s.slice(0,10):iso(d)}

/* 2 · a new day while the app is open */
function dayCheck(){const now=new Date(new Date().toDateString());if(iso(now)===iso(TODAY))return;TODAY.setTime(now.getTime());if(!DB||!DB.pgts)return;
 const busy=document.getElementById("overlay")?.innerHTML||document.activeElement?.closest?.("main input,main textarea,main select");
 if(busy){UI.dayStale=1;return}UI.dayStale=0;render()}
setInterval(dayCheck,60000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)dayCheck()});
/* anything rendered under yesterday's date is redrawn as soon as the form or sheet closes */
{const _c=closeSheet;closeSheet=function(){_c();if(UI.dayStale){UI.dayStale=0;setTimeout(render,0)}}}

/* 3 · new version available */
const APP_BUILD="__BUILD__";
let VER={seen:0,shown:0};
function verCheck(force){if(typeof LIVE==="undefined"||!LIVE||APP_BUILD.indexOf("_")===0||VER.shown)return;const t=Date.now();if(!force&&t-VER.seen<10*60000)return;VER.seen=t;
 fetch("index.html?vc="+t,{cache:"no-store"}).then(r=>r.ok?r.text():"").then(h=>{const m=h.match(/const APP_BUILD="([0-9a-f]{8,})"/);if(m&&m[1]!==APP_BUILD)verNew()}).catch(()=>{})}
async function verReload(){try{if(typeof SYNC!=="undefined"&&SYNC&&SYNC.pending&&typeof syncPush==="function")await syncPush()}catch(e){}location.reload()}
function verNew(){VER.shown=1;
 if(document.body.classList.contains("kiosk")){const tryK=()=>{if(UI.kio&&!UI.kio.sel&&!UI.kio.msg&&!(typeof SYNC!=="undefined"&&SYNC&&SYNC.pending))verReload();else setTimeout(tryK,30000)};tryK();return}
 const b=document.createElement("div");b.id="verbar";b.setAttribute("role","status");
 b.style.cssText="position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:60;background:var(--ink,#222);color:#fff;padding:10px 12px 10px 16px;border-radius:12px;display:flex;gap:12px;align-items:center;box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:14px;max-width:calc(100vw - 24px)";
 b.innerHTML=`<span>A new version of the DME Office is ready.</span><button class="btn small primary" data-act="ver-reload">Reload</button><button class="btn small" data-act="ver-later" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.4)">Later</button>`;document.body.append(b)}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="ver-reload"],[data-act="ver-later"]');if(!b)return;if(b.dataset.act==="ver-reload"){b.disabled=true;b.textContent="Saving…";verReload()}else document.getElementById("verbar")?.remove()});
setTimeout(()=>verCheck(true),15000);setInterval(()=>verCheck(true),30*60000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)verCheck()});

/* 4 · search: visitors and Ctrl+K (recently opened is in V38) */
{const _s=vSearch;vSearch=function(){let h=_s();const q=UI.gq.trim().toLowerCase(),dig=q.replace(/\D/g,""),hit=s=>String(s||"").toLowerCase().includes(q);
 const grp=(t,rows)=>rows.length?`<div class="panel flush"><h3 style="padding:14px 16px 0;margin:0">${t} · ${rows.length}</h3><div class="slist">${rows.slice(0,25).join("")}</div>${rows.length>25?`<p class="subt" style="padding:0 16px 12px">Showing 25; type more to narrow.</p>`:""}</div>`:"";
 const row=(href,a,b)=>`<a class="srow" href="#${href}"><b>${a}</b><span class="subt">${b}</span></a>`;
 h=h.replace("exams; tasks.","exams; tasks; rotating trainees and observers (also by challan number).").replace("Press / anywhere to come here.","Press / or Ctrl+K anywhere to come here.");
 if(q.length<2)return h;
 if(!canSee("pgts"))return h;
 const V=visList().filter(v=>hit(v.name)||hit(v.inst)||hit(v.unit)||hit(v.cnic)||(dig.length>=4&&[v.cnic,v.mobile].some(x=>String(x||"").replace(/\D/g,"").includes(dig)))||(v.fees||[]).some(f=>hit(f.challan)));
 const O=V.filter(v=>v.kind==="obs"),T=V.filter(v=>v.kind!=="obs");
 const extra=grp("Observership",O.map(v=>row("obs-"+v.id,esc(visName(v)),`${esc(v.cat||"Observer")} · ${esc(v.inst||"")} · ${esc(obsStage(v))}${(v.fees||[])[0]?.challan?` · ${esc(v.fees[0].challan)}`:""}`)))
  +grp("Rotating trainees",T.map(v=>row("rot-"+v.id,esc(visName(v)),`${esc(v.inst||"")} · ${esc(v.unit||"")} · ${esc(rotState(v))}`)));
 if(!extra)return h;return h.replace(/<div class="panel empty">Nothing found for[^<]*<\/div>/,"")+extra}}
document.addEventListener("keydown",e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey||(e.key!=="k"&&e.key!=="K")||!DB||!DB.pgts||document.body.classList.contains("solo")||document.body.classList.contains("kiosk"))return;e.preventDefault();
 const t=document.getElementById("topq");if(t&&t.offsetParent){t.focus();t.select();return}if(route.v!=="search")go("search");setTimeout(()=>{const g=document.getElementById("gq");if(g){g.focus();g.select()}},30)});

/* 5 · results to each trainee */
const srTplP=x=>`Dear {name},\n\nThe results of the *{exam}*${x.date?", held on {date},":""} have been published. Your result is below.\n\n{results}\n\nRegards,\nDepartment of Medical Education & Training\nRawalpindi Institute of Cardiology`;
function srTextP(x,t){const pm=new Map();t.papers.forEach(z=>pm.set(srPaper(x,z.k),srPassTxt(x,z.k)));const vals=[...new Set(pm.values())];
 return t.papers.map(z=>srLine(x,z)).join("\n")+"\n\n"+(vals.length===1?`Pass mark: ${vals[0]}`:`*Pass marks*\n${[...pm].map(([n,v])=>`${n}: ${v}`).join("\n")}`)}
function srPgtList(x,spec){const cache={},row=(k,p)=>{if(!cache[k])cache[k]=rsData(x,k,null,{});return cache[k].R.find(r=>r.p.id===p.id)};
 return exCands(x).filter(p=>!p.guest&&(!spec||p.spec===spec)).map(p=>({p,papers:exAllPapers(x).filter(k=>exInPaper(x,p,k)).map(k=>({k,r:row(k,p)})).filter(z=>z.r)})).filter(t=>t.papers.length).sort((a,b)=>a.p.name.localeCompare(b.p.name))}
const srRecP=(x,t)=>{const r=recPgt(t.p);return{...r,key:"srp:"+t.p.id,vars:{...r.vars,exam:srExam(x),date:x.date?fd(x.date):"",results:srTextP(x,t)}}};
function sheetPgtRes(x,spec){spec=spec||"";const L=srPgtList(x,spec),noNum=L.filter(t=>!waNum(t.p.mobile||t.p.mobile2)),specs=exSpecs(x).filter(s=>exCands(x).some(p=>p.spec===s&&!p.guest));
 openSheet(`Results to trainees · ${x.title}`,`<p class="subt" style="margin:0">Each trainee gets their own result on WhatsApp. You check the message, then send it one trainee at a time.</p>
 <label class="f">Specialty<select name="spec" data-srpspec="${x.id}">${opt([["","All specialties"],...specs.map(s=>[s,s])],spec)}</select></label>
 <div class="kpis" style="grid-template-columns:repeat(2,1fr)"><div class="kpi"><span class="n">${L.length}</span><span class="l">Trainees</span></div><div class="kpi"><span class="n">${L.length-noNum.length}</span><span class="l">With a WhatsApp number</span></div></div>
 ${noNum.length?`<div class="flag">No mobile number for ${noNum.slice(0,12).map(t=>`<a href="#pgt-${t.p.id}">${esc(candName(t.p))}</a>`).join(", ")}${noNum.length>12?` and ${noNum.length-12} more`:""}.</div>`:""}
 ${L[0]?`<div class="msgprev"><span class="subt">Example: ${esc(candName(L[0].p))}</span><div>${esc(msgFill(srTplP(x),srRecP(x,L[0]))).replace(/\*([^*\n]+)\*/g,"<b>$1</b>").replace(/\n/g,"<br>")}</div></div>`:`<p class="empty">No trainees in this exam.</p>`}`,
 ()=>{if(!L.length)return fail("Nobody to send to.");UI.msg={recs:[],text:srTplP(x),sent:{},src:"supres"};msgAdd(L.map(t=>srRecP(x,t)));
  x.pgtSent={at:new Date().toISOString(),by:ME,n:L.length,spec};xlog(x,`Results prepared for ${L.length} trainee${L.length>1?"s":""}${spec?` (${spec})`:""} on WhatsApp`);persist();closeSheet();go("messages");return false},"Open WhatsApp messages")}
document.addEventListener("change",e=>{const t=e.target;if(!t.dataset||!t.dataset.srpspec)return;const x=DB.exams.find(z=>z.id===t.dataset.srpspec);if(x)sheetPgtRes(x,t.value)});
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="ex-pgtres"]');if(!b||!DB)return;const x=DB.exams.find(z=>z.id===route.id);if(x)sheetPgtRes(x)});
{const _v=vExam;vExam=function(){const h=_v(),x=DB.exams.find(e=>e.id===route.id);if(!x||x.practice||(x.stage||0)<5||isViewer())return h;
 return h.replace('<button class="btn small primary" data-act="ex-supres">Send results to supervisors</button>','<button class="btn small" data-act="ex-pgtres">Send results to trainees</button><button class="btn small primary" data-act="ex-supres">Send results to supervisors</button>')}}

/* 6 · the dashboard's "Needs attention" also lists observership work */
{const _e=extraAttn;extraAttn=function(){const o=_e();if(typeof obsList!=="function")return o;const L=obsList(),nm=a=>a.slice(0,3).map(visName).join(", ")+(a.length>3?` and ${a.length-3} more`:"");
 const tf=L.filter(v=>obsStage(v)==="To forward"),late=L.filter(obsLate),end=L.filter(obsEnding);
 if(tf.length)o.push([tf.length,"pend",`observership application${tf.length>1?"s":""} to send to the MS`,nm(tf),"observers","To forward"]);
 if(late.length)o.push([late.length,"pause",`observership application${late.length>1?"s":""} with the MS over 2 weeks`,nm(late),"observers","With the MS"]);
 if(end.length)o.push([end.length,"pause",`observership${end.length>1?"s":""} ending in 3 days`,nm(end),"observers","Current"]);
 return o}}
document.addEventListener("click",e=>{const a=e.target.closest("a[data-go-filter]");if(!a)return;const[v,f]=a.dataset.goFilter.split(":");if(v==="observers"&&f)UI.obsTab=f},true);
