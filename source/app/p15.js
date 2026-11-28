
/* =====================================================================
   V12 · EASIER TO USE: menu icons, clickable names, back returns to the
   same spot, search in the top bar, install as an app
   ===================================================================== */
const _ic=d=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const NAV_ICON={
 search:_ic('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
 overview:_ic('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
 tasks:_ic('<path d="M4 6.5l1.8 1.8L9 5"/><path d="M12 7h8"/><path d="M4 13.5l1.8 1.8L9 12"/><path d="M12 14h8"/><path d="M12 19.5h8"/>'),
 pgts:_ic('<path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3V11"/><path d="M21.5 9v5"/>'),
 verify:_ic('<circle cx="9.5" cy="8" r="3.5"/><path d="M3 20c.6-3.4 3.2-5.5 6.5-5.5 1.5 0 2.8.4 3.9 1.2"/><path d="M15 18.5l2 2 4-4.5"/>'),
 leaves:_ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
 datacheck:_ic('<path d="M9 3.5h6l1 2h3v15H5v-15h3z"/><path d="M12 10v4M12 17h.01"/>'),
 messages:_ic('<path d="M4 20l1.3-4A8 8 0 1 1 8.5 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.4-1.6-1-2-2l1-1-1-2z"/>'),
 exits:_ic('<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M14 8l4 4-4 4M9 12h9"/>'),
 faculty:_ic('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.5-3.3 3-5.4 6-5.4s5.5 2.1 6 5.4"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.6c2.4.2 4.1 2 4.5 4.6"/>'),
 supervisors:_ic('<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5c.6-3.6 3.5-6 7-6s6.4 2.4 7 6"/><path d="M12 14.5l-1.3 3 1.3 1.6 1.3-1.6z"/>'),
 credentials:_ic('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.5-1.5 1.6-2.3 3-2.3s2.5.8 3 2.3M14 10h4.5M14 13.5h3"/>'),
 workshops:_ic('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20.5h8M7 12l3-3 2.5 2.5L17 7"/>'),
 exams:_ic('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8.5 11l2 2 4-4M8.5 16.5h7"/>'),
 orientation:_ic('<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
 settings:_ic('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
 calendar:_ic('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M12 14h2M16 14h.5M8 17.5h2M12 17.5h2"/>'),
 rotating:_ic('<circle cx="9" cy="7.5" r="3"/><path d="M3.5 19c.5-3.2 2.8-5.2 5.5-5.2 1.2 0 2.3.4 3.2 1"/><path d="M14 17.5a4 4 0 1 0 1.2-2.9"/><path d="M14.2 13.6v1.6h1.6"/>'),
 audit:_ic('<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4v4h4M12 7.5V12l3 2"/>')};

/* ---------- names open profiles ---------- */
const facLink=f=>f?`<span class="pn" data-fid="${f.id}">${esc(facName(f))}</span>`:"—";
function nameLink(s){const n=stripOther(String(s||""));if(!n)return"";const key=n.toLowerCase().replace(/^(prof\.?\s*)?(dr\.?\s*)?/,"").trim();
 const f=DB.faculty.find(f=>facName(f).toLowerCase()===n.toLowerCase()||f.name.toLowerCase()===key);return f?facLink(f):esc(n)}
document.addEventListener("click",e=>{const n=e.target.closest(".pn");if(!n||e.target.closest("a"))return;if(document.body.classList.contains("solo"))return;
 e.stopPropagation();e.preventDefault();go(n.dataset.pid?"pgt-"+n.dataset.pid:"fac-"+n.dataset.fid)},true);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.classList&&e.target.classList.contains("pn"))e.target.click()});

/* ---------- back goes exactly where you were ---------- */
const NAVSTACK=[];let navPending=null;
function curHash(){return location.hash.slice(1)||"overview"}
NAVSTACK.push({h:curHash(),y:0,t:""});
window.addEventListener("scroll",()=>{const top=NAVSTACK[NAVSTACK.length-1];if(top&&top.h===curHash())top.y=window.scrollY},{passive:true});
window.addEventListener("hashchange",()=>{const h=curHash(),prev=NAVSTACK[NAVSTACK.length-2];
 if(prev&&prev.h===h){NAVSTACK.pop();const y=prev.y;requestAnimationFrame(()=>{window.scrollTo(0,y);requestAnimationFrame(()=>window.scrollTo(0,y))})}
 else if(NAVSTACK[NAVSTACK.length-1]?.h!==h){NAVSTACK.push({h,y:0,t:pageTitle()});if(NAVSTACK.length>60)NAVSTACK.shift()}
 setTimeout(fixBackLinks,0)});
let lastTitle="";
const pageTitle=()=>{const h=document.querySelector("main h2");return h?h.textContent.trim().replace(/\s+Example$/,""):""};
new MutationObserver(()=>{const top=NAVSTACK[NAVSTACK.length-1];if(top&&top.h===curHash())top.t=pageTitle();fixBackLinks()}).observe(document.getElementById("main"),{childList:true});
/* "← All PGTs" style links go back to the page you came from, and say so */
function fixBackLinks(){const prev=NAVSTACK[NAVSTACK.length-2];document.querySelectorAll("main a.btn.link").forEach(a=>{if(!a.textContent.trim().startsWith("←"))return;
 if(prev&&prev.h!==curHash()){a.dataset.back="1";a.textContent="← Back to "+(prev.t||NAVG.find(n=>n[1]===prev.h)?.[2]||"previous page")}})}
document.addEventListener("click",e=>{const a=e.target.closest('a[data-back="1"]');if(a&&NAVSTACK.length>1){e.preventDefault();history.back()}});

/* ---------- search box in the top bar ---------- */
document.addEventListener("input",e=>{if(e.target.id!=="topq")return;UI.gq=e.target.value;if(route.v!=="search"){if(UI.gq.trim().length>=2)go("search")}else render()});
document.addEventListener("keydown",e=>{if(e.target.id==="topq"&&e.key==="Escape"){e.target.value="";UI.gq="";e.target.blur();if(route.v==="search")history.back()}});
window.addEventListener("hashchange",()=>{const t=document.getElementById("topq");if(t&&route.v!=="search"&&document.activeElement!==t)t.value=""});
document.addEventListener("keydown",e=>{const t=document.getElementById("topq");if(e.key==="/"&&t&&t.offsetParent&&!e.target.closest("input,textarea,select,[contenteditable]")){e.preventDefault();e.stopImmediatePropagation();t.focus()}},true);

/* ---------- install as an app ---------- */
let installEvt=null;
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;installBtn()});
window.addEventListener("appinstalled",()=>{installEvt=null;installBtn();toast("DME&T Office installed")});
function installBtn(){const box=document.getElementById("installbox");if(!box)return;const live=typeof LIVE!=="undefined"&&LIVE;
 if(isStandalone()||!live){box.innerHTML="";return}
 box.innerHTML=installEvt?`<button class="btn small" data-act="app-install">${NAV_ICON.overview.replace('width="18" height="18"','width="15" height="15"')} Install app</button>`:isIOS()?`<span class="subt">To install on iPhone or iPad: tap Share, then <b>Add to Home Screen</b>.</span>`:""}
document.addEventListener("click",async e=>{if(!e.target.closest('[data-act="app-install"]')||!installEvt)return;installEvt.prompt();await installEvt.userChoice.catch(()=>{});installEvt=null;installBtn()});
if(typeof LIVE!=="undefined"&&LIVE&&"serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))navigator.serviceWorker.register("sw.js").catch(()=>{});
setTimeout(installBtn,0);
window.addEventListener("hashchange",()=>{if(route.v==="search"){const t=document.getElementById("topq");if(t&&t.offsetParent){t.value=UI.gq;setTimeout(()=>t.focus(),40)}}});
/* keep the side menu just under the top bar, whatever its height */
function setAbh(){const a=document.querySelector(".appbar");if(a)document.documentElement.style.setProperty("--abh",a.offsetHeight+"px")}
window.addEventListener("resize",setAbh);window.addEventListener("hashchange",()=>setTimeout(setAbh,0));setTimeout(setAbh,0);setTimeout(setAbh,800);
