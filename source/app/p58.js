
/* =====================================================================
   P58 · INSTALL AS AN APP: EASY TO FIND
   The "Install app" button sat only at the foot of the side menu,
   which is hidden on phones and absent on the sign-in screen. Now the
   sign-in screen and the top of the dashboard also offer it:
   - Android / computer Chrome or Edge: an "Install app" button;
   - iPhone / iPad: Share → Add to Home Screen;
   - other browsers: the browser menu → Install app / Add to Home screen.
   Hidden once installed, in the prototype, or after "Not now".
   ===================================================================== */
const INST_K="dme-install-later";
const instLater=()=>{try{return(+localStorage.getItem(INST_K)||0)>Date.now()}catch(e){return false}};
function instHint(dash){const live=typeof LIVE!=="undefined"&&LIVE;if(!live||isStandalone())return"";if(dash&&instLater())return"";
 const later=dash?`<button class="btn small link" data-act="inst-later">Not now</button>`:"";
 if(installEvt)return`<div class="flag info inst-hint"><span><b>Install DME Office</b> on this ${/android|iphone|ipad|mobile/i.test(navigator.userAgent)?"phone":"computer"}: it opens like an app, from its own icon.</span><span class="actions"><button class="btn small primary" data-act="app-install">Install app</button>${later}</span></div>`;
 if(isIOS())return`<div class="flag info inst-hint"><span><b>Install DME Office on this iPhone or iPad:</b> open this page in Safari, tap the Share button <span aria-hidden="true">(□↑)</span>, then <b>Add to Home Screen</b>.</span>${later}</div>`;
 return`<div class="flag info inst-hint"><span><b>Install DME Office:</b> open the browser menu <span aria-hidden="true">(⋮)</span> and choose <b>Install app</b> or <b>Add to Home screen</b>. Use Chrome or Edge if you do not see it.</span>${later}</div>`}
function instSlots(){document.querySelectorAll(".inst-slot").forEach(s=>{s.innerHTML=instHint(s.dataset.dash==="1")})}
{const _b=installBtn;installBtn=function(){_b();instSlots()}}
{const _l=loginScreen;loginScreen=function(){const r=_l.apply(this,arguments);const c=document.querySelector("#main .solo-card");if(c&&!c.querySelector(".inst-slot"))c.insertAdjacentHTML("beforeend",`<div class="inst-slot" style="margin-top:14px"></div>`);instSlots();return r}}
{const _o=vOverview;vOverview=function(){const h=_o();setTimeout(instSlots,0);return`<div class="inst-slot" data-dash="1"></div>`+h}}
document.addEventListener("click",e=>{if(!e.target.closest('[data-act="inst-later"]'))return;try{localStorage.setItem(INST_K,String(Date.now()+30*864e5))}catch(x){}instSlots()});
if(!document.getElementById("inst-css"))document.head.insertAdjacentHTML("beforeend",`<style id="inst-css">.inst-slot:empty{display:none}.inst-slot[data-dash="1"]{margin-bottom:12px}.inst-hint{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between}.inst-hint .actions{display:flex;gap:6px;flex-wrap:wrap}</style>`);
