/* =====================================================================
   V11 · VIEW-ONLY ACCESS (Executive Director and other viewers)
   Viewers see their sections in full but every editing control is hidden
   or locked, and nothing they do is saved.
   ===================================================================== */
function isViewer(){try{return(typeof SYNC!=="undefined"&&SYNC.on&&SYNC.role==="Viewer")||(DB&&DB.staff&&meObj().role==="Viewer")}catch(e){return false}}
const VIEW_ACTS=new Set(["navtoggle","navclose","lg-out","lg-pw","lg-cancelpw","lg-forgot","sy-retry","sy-refresh","doc-open","pg-clear","cf-prev","cf-next","att-print","close","pgt-copy","rg-copy","ws-copy","ws-copyfb","ws-copyrep","ws-qrbig","cf-cancel"]);
const VIEW_INPUTS=new Set(["q","fspec","fprog","fry","fcy","lvq","lvtype","exq","exyr","gq","sq","sdept","sprog","tassign","ex-pick","whoami","copysrc","fbsrc","rgsrc","pgtlink"]);
function lockForViewer(){const vo=isViewer();document.body.classList.toggle("viewonly",vo);if(!vo)return;const m=document.getElementById("main");if(!m)return;
 m.querySelectorAll("[data-act]").forEach(el=>{if(!VIEW_ACTS.has(el.dataset.act))el.hidden=true});
 m.querySelectorAll('a[href^="#fbedit-"],a[href^="#pfedit-"],a[href^="#rgedit-"],a[href^="#pfill-"],a[href^="#reg-"],a[href^="#fb-"]').forEach(el=>el.hidden=true);
 m.querySelectorAll("input,select,textarea").forEach(el=>{if(!VIEW_INPUTS.has(el.id)&&!el.readOnly)el.disabled=true});
 m.querySelectorAll(".formgrid").forEach(el=>{const p=el.closest(".panel");if(p&&!p.querySelector("table"))p.hidden=true})}
new MutationObserver(()=>lockForViewer()).observe(document.getElementById("main"),{childList:true});
/* belt and braces: refuse editing actions even if a control slips through */
document.addEventListener("click",e=>{if(!isViewer())return;const b=e.target.closest("[data-act]");if(!b||VIEW_ACTS.has(b.dataset.act))return;e.stopImmediatePropagation();e.preventDefault();toast("View-only access")},true);

/* ---------- invite codes for first sign-in ---------- */
function newInvite(){const A="ABCDEFGHJKMNPQRSTUVWXYZ23456789";let c="";const r=new Uint32Array(6);crypto.getRandomValues(r);r.forEach(n=>c+=A[n%A.length]);return c}
SYNC.staffRows=null;
async function refreshStaffRows(){if(!SYNC.on)return;const{data}=await SYNC.sb.from("dme_staff").select("email,uid,active,owner,invite");if(data){const before=JSON.stringify(SYNC.staffRows);SYNC.staffRows=data;if(route.v==="settings"&&before!==JSON.stringify(data))render()}}
function signinCell(s,i){if(s.me)return'<span class="subt">Director</span>';if(!s.email)return'<span class="subt">Add an email</span>';
 const row=(SYNC.staffRows||[]).find(r=>r.email===s.email.toLowerCase());
 if(row&&row.uid&&row.invite===s.invite)return`<span class="pill p-ric">Signed in</span>${isAdmin()?` <button class="btn link" data-act="tm-code" data-i="${i}">Reset login</button>`:""}`;
 return s.invite?`<span class="subt">Invite code</span> <b class="code" style="letter-spacing:1px">${esc(s.invite)}</b>${isAdmin()?` <button class="btn link" data-act="tm-code" data-i="${i}">New code</button>`:""}`:`${isAdmin()?`<button class="btn link" data-act="tm-code" data-i="${i}">Make invite code</button>`:"—"}`}
window.addEventListener("hashchange",()=>{if(route.v==="settings")refreshStaffRows()});
