
/* =====================================================================
   P61 · WORKSHOP REGISTRATION: CLOSING DATE, CLOSE WHEN FULL, SEATS SHOWN
   - w.regClose "YYYY-MM-DDTHH:MM" (Pakistan time): the form closes by
     itself then. Set in "Seats and payment".
   - w.whenFull "close" (default) or "wait": when every seat is taken the
     form closes, or (if chosen) people can still join a waiting list.
   - The form shows "12 of 30 seats filled" with a bar and the closing
     time. The database (08_ws_reg_close.sql) enforces both rules, so an
     old open page cannot get round them.
   ===================================================================== */
const wsWhenFull=w=>w.whenFull==="wait"?"wait":"close";
const wsHeld=w=>Array.isArray(w.regs)?regsOf(w).filter(holdsSeat).length:(+w.held||0);
function wsCloseAt(w){const c=String(w.regClose||"");if(!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(c))return null;return new Date(c.length===10?c+"T23:59":c)}
function wsCloseTxt(w){const d=wsCloseAt(w);if(!d)return"";const h=d.getHours(),m=String(d.getMinutes()).padStart(2,"0");return`${fd(iso(d))}, ${(h%12)||12}:${m} ${h<12?"am":"pm"}`}
/* is the form taking registrations now, and if not, why */
function wsRegState(w){if(!w.regOpen)return{open:false,why:"off"};if(w.date&&w.date<iso(TODAY))return{open:false,why:"past"};
 const c=wsCloseAt(w);if(c&&c<=new Date())return{open:false,why:"date"};
 const seats=+w.seats||0,held=wsHeld(w);if(seats&&held>=seats&&wsWhenFull(w)==="close")return{open:false,why:"full"};return{open:true,why:""}}
function wsClosedMsg(w,st){return st.why==="full"?`All ${w.seats} seats are filled. Registration is closed.`:st.why==="date"?`Registration closed on ${wsCloseTxt(w)}.`:st.why==="past"?"Registration is closed.":"Registration is not open."}
/* the seats box on the form: filled out of total, a bar, seats left, and the closing time */
function wsSeatBox(w){const seats=+w.seats||0,held=Math.min(wsHeld(w),seats||wsHeld(w)),left=Math.max(0,seats-held),pc=seats?Math.round(held/seats*100):0,full=seats&&left<=0,c=wsCloseTxt(w);
 return`<div class="flag ${full?"":"info"} seatbox"><div class="seatline"><b>${held} of ${seats} seats filled</b><span>${full?(wsWhenFull(w)==="wait"?"Full: you can join the waiting list":"Full"):`${left} seat${left===1?"":"s"} left`}</span></div>
  <div class="seatbar" role="img" aria-label="${held} of ${seats} seats filled"><span style="width:${pc}%"></span></div>${c?`<div class="subt">Registration closes on <b>${esc(c)}</b>, or earlier if all seats are filled.</div>`:""}</div>`}

/* Seats and payment: closing date and time, what happens when full */
{const _s=sheetRegSettings;sheetRegSettings=function(w){_s(w);const S=SHEET;if(!S)return;const c=String(w.regClose||""),cd=c.slice(0,10),ct=c.length>10?c.slice(11,16):"23:59";
 const seatsLab=[...document.querySelectorAll("#sheetform label.f")].find(l=>l.querySelector('[name="s"]'));
 const html=`<div class="grid2"><label class="f">Registration closes on <span class="h">optional; the form closes by itself</span><input type="date" name="rcd" value="${esc(cd)}"></label><label class="f">at <span class="h">Pakistan time</span><input type="time" name="rct" value="${esc(ct)}"></label></div>
  <label class="f">When all seats are taken<select name="wf">${opt([["close","Close the form"],["wait","Keep it open for a waiting list"]],wsWhenFull(w))}</select></label>`;
 if(seatsLab)seatsLab.insertAdjacentHTML("afterend",html);else document.getElementById("sheetform").insertAdjacentHTML("afterbegin",html);
 const save=S.onSave;S.onSave=function(){const d=fv("rcd"),t=fv("rct")||"23:59";if(d&&!/^\d{2}:\d{2}$/.test(t))return fail("Enter the closing time, e.g. 23:59.");
  if(d&&w.date&&d>w.date)return fail("The closing date is after the workshop date.");
  const nc=d?`${d}T${t}`:"",nw=fv("wf")==="wait"?"wait":"close",oc=w.regClose||"",ow=wsWhenFull(w);const r=save.apply(this,arguments);if(r===false)return r;
  if(nc)w.regClose=nc;else delete w.regClose;w.whenFull=nw;
  const ch=[];if(nc!==oc)ch.push(nc?`registration closes ${wsCloseTxt(w)}`:"no closing date");if(nw!==ow)ch.push(nw==="wait"?"waiting list when full":"form closes when full");if(ch.length)wlog(w,"Registration: "+ch.join("; "));return r}}}

/* workshop page: the real state of the form, the closing time, and the right wording for "when full" */
{const _p=regPanel;regPanel=function(w){let h=_p(w);if(!h)return h;const st=wsRegState(w),c=wsCloseTxt(w);
 if(wsWhenFull(w)==="close")h=h.replace("the rest go to the waiting list.","then the form closes.");
 const pill=st.open?'<span class="pill p-ric">Form open</span>':w.regOpen?`<span class="pill p-pause">Closed: ${st.why==="full"?"all seats filled":st.why==="date"?"closing date passed":"workshop date passed"}</span>`:'<span class="pill p-done">Form closed</span>';
 h=h.replace(w.regOpen?'<span class="pill p-ric">Form open</span>':'<span class="pill p-done">Form closed</span>',pill+(c?` · closes ${esc(c)}`:" · no closing date")+` · when full: ${wsWhenFull(w)==="wait"?"waiting list":"closes"}`);return h}}

/* the participant view inside the app (prototype and "Fill as participant") follows the same rules */
{const _s=submitReg;submitReg=function(){const w=DB.workshops.find(x=>x.id===route.id),st=w&&wsRegState(w);if(st&&!st.open){const er=document.getElementById("rgerr");if(er)er.textContent=wsClosedMsg(w,st);return}return _s.apply(this,arguments)}}

if(!document.getElementById("seat-css"))document.head.insertAdjacentHTML("beforeend",`<style id="seat-css">.seatbox{display:grid;gap:6px}.seatline{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.seatbar{height:10px;border-radius:999px;background:rgba(0,0,0,.08);overflow:hidden}.seatbar span{display:block;height:100%;background:var(--brand,#6D1F2B);border-radius:999px}</style>`);
