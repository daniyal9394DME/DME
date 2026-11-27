
/* =====================================================================
   V40 · My preferences (kept on each device): light / dark / automatic,
   text size, compact layout, start page, dashboard blocks, section
   buttons, date boxes. Quick light/dark switch at the foot of the menu.
   ===================================================================== */
const PREF_K="ric-dme-prefs";
const PREF_DEF={theme:"auto",size:"1",density:"normal",start:"overview",dates:"typed",sec:"record",dash:[]};
const prefs=()=>({...PREF_DEF,...lsGet(PREF_K,{})});
function prefApply(){const p=prefs(),r=document.documentElement;
 if(p.theme==="auto")delete r.dataset.theme;else r.dataset.theme=p.theme;
 r.style.zoom=p.size==="1"?"":p.size;r.classList.toggle("dense",p.density==="compact");
 ["upnext","kpis","attention","lists","checks"].forEach(k=>r.classList.toggle("hide-"+k,(p.dash||[]).includes(k)));
 const dark=p.theme==="dark"||(p.theme==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);
 document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.setAttribute("content",dark?"#1A2027":"#FFFFFF"));
 if(typeof setAbh==="function")setTimeout(setAbh,0)}
function prefSet(k,v){const p=lsGet(PREF_K,{});p[k]=v;lsSet(PREF_K,p);prefApply()}
prefApply();
try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",prefApply)}catch(e){}
/* start page: only when the app is opened without a page in the address */
(()=>{const s=prefs().start;if(!location.hash&&s&&s!=="overview"&&!/[?&](reg|fb|prop|bio|att|sur|rot)=/.test(location.search))try{history.replaceState(null,"","#"+s)}catch(e){}})();

const THEME_L={auto:"Automatic (follows this device)",light:"Light",dark:"Dark"};
const THEME_ICON={light:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 dark:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>',
 auto:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/></svg>'};
/* the foot of the side menu: theme switch and preferences */
{const _rc=renderChrome;renderChrome=function(cur){_rc(cur);const nav=document.getElementById("nav");if(!nav||nav.querySelector(".navprefs"))return;const t=prefs().theme;
 const box=document.createElement("div");box.className="navprefs";
 box.innerHTML=`<div class="seg3" role="group" aria-label="Appearance">${["light","dark","auto"].map(k=>`<button type="button" data-theme-set="${k}" aria-pressed="${t===k}" title="${THEME_L[k]}">${THEME_ICON[k]}<span>${k==="auto"?"Auto":k[0].toUpperCase()+k.slice(1)}</span></button>`).join("")}</div>
  <button type="button" class="btn link" data-act="prefs">My preferences</button>`;
 const ed=nav.querySelector(".navedit");if(ed)ed.before(box);else nav.append(box)}}
document.addEventListener("click",e=>{const b=e.target.closest("[data-theme-set]");if(b){e.preventDefault();prefSet("theme",b.dataset.themeSet);
 document.querySelectorAll("[data-theme-set]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.themeSet===b.dataset.themeSet)));toast("Appearance: "+THEME_L[b.dataset.themeSet])}});

/* the preferences sheet */
function prefsSheet(){const p=prefs();const seg=(name,opts,val)=>`<div class="seg3 wide" role="radiogroup">${opts.map(([v,l])=>`<label><input type="radio" name="${name}" value="${v}" ${String(val)===String(v)?"checked":""}><span>${l}</span></label>`).join("")}</div>`;
 const pages=NAVG.filter(n=>canSee(n[1])&&!["search"].includes(n[1]));
 const dashOpts=[["upnext","Coming up (next events)"],["kpis","Key numbers"],["attention","Needs attention"],["lists","Tasks, calendar and verification lists"],["checks","PGT records that need checking"]];
 openSheet("My preferences",`<p class="subt" style="margin:0">These apply on this device only, for whoever is signed in here. Shared settings for the whole office are in Settings.</p>
 <div class="f"><span class="lbl" style="font-weight:600">Appearance</span>${seg("theme",[["light","Light"],["dark","Dark"],["auto","Automatic"]],p.theme)}<span class="subt">Automatic follows the light or dark setting of this phone or computer.</span></div>
 <div class="f"><span class="lbl" style="font-weight:600">Text size</span>${seg("size",[["0.9","Smaller"],["1","Normal"],["1.1","Large"],["1.2","Larger"]],p.size)}</div>
 <div class="f"><span class="lbl" style="font-weight:600">Layout</span>${seg("density",[["normal","Comfortable"],["compact","Compact: more rows on screen"]],p.density)}</div>
 <label class="f">Open the app on<select name="start">${opt(pages.map(([g,k,l])=>[k,l]),p.start)}</select></label>
 <div class="f"><span class="lbl" style="font-weight:600">Section buttons on workshop, PGT and faculty pages</span>${seg("sec",[["record","Start on All for each record"],["type","Keep my last section"]],p.sec)}</div>
 <div class="f"><span class="lbl" style="font-weight:600">Date boxes</span>${seg("dates",[["typed","Type dd/mm/yyyy (with calendar button)"],["device","Device's own date picker"]],p.dates)}<span class="subt">On phones the device picker is always used. Takes effect after the page reloads.</span></div>
 <div class="f"><span class="lbl" style="font-weight:600">Show on the dashboard</span><div style="display:grid;gap:4px">${dashOpts.map(([k,l])=>`<label class="check2"><input type="checkbox" data-dash="${k}" ${(p.dash||[]).includes(k)?"":"checked"}> ${l}</label>`).join("")}</div></div>
 <div class="f"><span class="lbl" style="font-weight:600">Side menu</span><div class="actions" style="justify-content:flex-start"><button type="button" class="btn small" data-act="nav-edit">Choose menu pages</button><button type="button" class="btn small" data-act="nav-foldall">Fold all groups</button><button type="button" class="btn small" data-act="nav-unfold">Unfold all</button></div></div>
 <button type="button" class="btn link" data-act="prefs-reset" style="justify-self:start">Reset to the usual settings</button>`,()=>{
  const g=n=>{const el=document.querySelector(`#sheetform [name="${n}"]:checked`)||document.querySelector(`#sheetform [name="${n}"]`);return el?el.value:""};const before=prefs().dates;
  const np={theme:g("theme"),size:g("size"),density:g("density"),start:g("start"),sec:g("sec"),dates:g("dates"),dash:[...document.querySelectorAll("#sheetform [data-dash]")].filter(c=>!c.checked).map(c=>c.dataset.dash)};
  lsSet(PREF_K,np);prefApply();toast(np.dates!==before?"Saved. Reload the page for the date boxes to change.":"Preferences saved");return true},"Save")}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="prefs"],[data-act="prefs-reset"],[data-act="nav-foldall"],[data-act="nav-unfold"]');if(!b)return;e.preventDefault();const a=b.dataset.act;
 if(a==="prefs")return prefsSheet();
 if(a==="prefs-reset"){lsSet(PREF_K,{});prefApply();closeSheet();render();toast("Back to the usual settings");return}
 if(a==="nav-foldall"){lsSet(NAV_FOLD_K,[...new Set(NAVG.map(n=>n[0]).filter(Boolean))]);toast("Menu groups folded");render();return}
 if(a==="nav-unfold"){lsSet(NAV_FOLD_K,[]);toast("Menu groups unfolded");render();return}});
/* live preview of appearance choices while the sheet is open */
document.addEventListener("change",e=>{const t=e.target;if(!t.closest("#sheetform"))return;if(["theme","size","density"].includes(t.name)){const r=document.documentElement;
 if(t.name==="theme"){if(t.value==="auto")delete r.dataset.theme;else r.dataset.theme=t.value}if(t.name==="size")r.style.zoom=t.value==="1"?"":t.value;if(t.name==="density")r.classList.toggle("dense",t.value==="compact")}});
/* closing without saving puts the saved look back */
{const _c=closeSheet;closeSheet=function(){_c();prefApply()}}

/* Settings: a link to these preferences for the Director */
{const _v=vSettings;vSettings=function(){return _v().replace('<div class="chips"><button class="chip" data-jump="set-backup">','<div class="chips"><button class="chip" data-act="prefs">My preferences (this device)</button><button class="chip" data-jump="set-backup">')}}

/* section buttons: keep the last section per page type when chosen */
const secKey=()=>prefs().sec==="type"?route.v:route.v+"-"+route.id;
