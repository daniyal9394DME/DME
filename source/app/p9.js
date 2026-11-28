/* =====================================================================
   PHASE 9: workshop registration form, seats, waiting list, payment
   ===================================================================== */
const REG_ST=["Confirmed","Payment to verify","Awaiting payment","Waiting list","Cancelled"];
const REG_PILL={"Confirmed":"p-ric","Payment to verify":"p-pause","Awaiting payment":"p-leave","Waiting list":"p-rot","Cancelled":"p-done"};
const PAYMODES=[["free","Free workshop: no payment"],["proof","Pay first: registration needs a payment receipt (recommended)"],["hold","Hold the seat: pay within a deadline or the seat goes to the waiting list"]];
function defRgQ(){return[
 Q("name","Full name","short",{req:true,d:"As it should appear on your certificate",section:"Your details"}),
 Q("cat","Category","mc",{opts:["Newly inducted PGT","Other PGT / Resident","Consultant / Faculty","Medical Officer / Registrar","Nurse / Allied Health Professional"],other:true,req:true,section:"Your details"}),
 Q("sup","Name of supervisor (PGTs only)","dd",{opts:["@faculty"],other:true,section:"Your details"}),
 Q("dept","Department / Specialty","dd",{opts:["@depts"],other:true,req:true,section:"Your details"}),
 Q("inst","Institution","dd",{opts:["Rawalpindi Institute of Cardiology","Holy Family Hospital","Benazir Bhutto Hospital","DHQ Hospital Rawalpindi","Combined Military Hospital","Rawalpindi Medical University"],other:true,req:true,section:"Your details"}),
 Q("mobile","Mobile number","short",{req:true,d:"03xx-xxxxxxx. We will contact you on this number",section:"Contact"}),
 Q("email","Email address","short",{req:true,section:"Contact"}),
 Q("decl","Declaration","cb",{opts:["I confirm that I will attend the full workshop"],req:true,section:"Declaration"})]}
const regsOf=w=>w.regs||[];
const regCount=(w,s)=>regsOf(w).filter(r=>r.status===s).length;
const holdsSeat=r=>["Confirmed","Payment to verify","Awaiting payment"].includes(r.status);
function regSync(w){if(!regsOf(w).length)return;const seated=regsOf(w).filter(holdsSeat);w.reg.registered=regCount(w,"Confirmed");w.reg.paid=regsOf(w).filter(r=>r.status==="Confirmed"&&r.paid).length;if(w.stage>=5&&regsOf(w).some(r=>r.present!=null))w.reg.attended=regsOf(w).filter(r=>r.present).length}
function seatsLeft(w){return(w.seats||0)-regsOf(w).filter(holdsSeat).length}
const regLink=w=>pubLink("reg",w);
function placeNew(w,r){const pay=w.fee&&w.payMode!=="free";if(seatsLeft(w)>0){r.status=!pay?"Confirmed":r.paid?"Confirmed":r.txn?"Payment to verify":"Awaiting payment";if(r.status==="Awaiting payment")r.holdUntil=new Date(Date.now()+(w.holdHours||48)*3600e3).toISOString()}else r.status="Waiting list"}
function promote(w){const wl=regsOf(w).filter(r=>r.status==="Waiting list").sort((a,b)=>a.at<b.at?-1:1);const moved=[];while(seatsLeft(w)>0&&wl.length){const r=wl.shift();placeNew(w,r);moved.push(r)}return moved}
function expireHolds(w){if(w.payMode!=="hold")return[];const now=new Date().toISOString(),ex=regsOf(w).filter(r=>r.status==="Awaiting payment"&&r.holdUntil&&r.holdUntil<now);ex.forEach(r=>{r.status="Cancelled";r.note="Payment not received before the deadline"});return ex}
function regFlags(w){const f=[];if(regCount(w,"Payment to verify"))f.push(`${regCount(w,"Payment to verify")} payments to verify`);const now=new Date().toISOString();const ov=regsOf(w).filter(r=>r.status==="Awaiting payment"&&r.holdUntil<now).length;if(ov)f.push(`${ov} seat holds past the payment deadline`);return f}

/* registration panel on the workshop page */
UI.rgTab="Confirmed";
function regPanel(w){if(w.stage<3)return"";const R=regsOf(w),pay=w.fee&&w.payMode!=="free";const fl=regFlags(w);
 const list=R.filter(r=>r.status===UI.rgTab).sort((a,b)=>a.at<b.at?-1:1);const nm=r=>esc(stripOther(r.a.name)||"—");
 return`<div class="panel" style="display:grid;gap:12px"><div class="head"><h3 style="margin:0">Registration</h3><div class="actions">${xbtn("regs:"+w.id,"Download list")}${waBtn("regs:"+w.id+":"+UI.rgTab,"WhatsApp "+UI.rgTab.toLowerCase())}<a class="btn small" href="#attend-${w.id}">Attendance sheet</a><a class="btn small" href="#rgedit-${w.id}">Edit form</a><button class="btn small" data-act="rg-settings">Seats and payment</button></div></div>
 <div class="kpis small4"><div class="kpi"><span class="n">${R.filter(holdsSeat).length}<span class="of"> / ${w.seats??"—"}</span></span><span class="l">Seats taken</span></div><div class="kpi"><span class="n">${regCount(w,"Confirmed")}</span><span class="l">Confirmed${pay?" and paid":""}</span></div><div class="kpi"><span class="n">${regCount(w,"Waiting list")}</span><span class="l">Waiting list</span></div><div class="kpi"><span class="n">${pay?money(R.filter(r=>r.status==="Confirmed"&&r.paid).length*w.fee):"Free"}</span><span class="l">Fees received</span></div></div>
 <p class="subt" style="margin:0">${!w.fee||w.payMode==="free"?"Free: the first "+(w.seats??"—")+" registrations are confirmed; the rest go to the waiting list.":w.payMode==="proof"?`Pay first: people pay ${money(w.fee)} to the RIC account and enter the transaction ID with a receipt photo. Their seat is held while you verify the payment. Without a receipt the form cannot be submitted, which stops dummy entries.`:`Seat hold: the seat is held for ${w.holdHours||48} hours; if payment is not verified by then, the seat goes to the next person on the waiting list.`} ${w.fbOpen?"":""}</p>
 ${fl.length?`<div class="flag">${fl.map(esc).join("<br>")}${regsOf(w).some(r=>r.status==="Awaiting payment"&&r.holdUntil<new Date().toISOString())?` <button class="btn small" data-act="rg-expire">Release expired holds</button>`:""}</div>`:""}
 <div class="qrrow"><div class="qrbox sm">${qrSvg(regLink(w),3)}</div><div style="display:grid;gap:8px;min-width:0;flex:1"><div class="toolbar"><input id="rgsrc" readonly value="${regLink(w)}" class="linkbox"><button class="btn small" data-act="rg-copy">Copy</button></div>
  <div class="actions"><button class="btn small ${w.regOpen?"":"primary"}" data-act="rg-toggle">${w.regOpen?"Close registration":"Open registration form"}</button><a class="btn small" href="#reg-${w.id}">Fill as participant</a><button class="btn small" data-act="rg-addm">Add someone by hand</button></div>
  <span class="subt">${w.regOpen?'<span class="pill p-ric">Form open</span>':'<span class="pill p-done">Form closed</span>'} · ${R.length} registrations</span></div></div>
 <div class="chips">${REG_ST.filter(s=>pay||!["Payment to verify","Awaiting payment"].includes(s)).map(s=>`<button class="chip" data-rgtab="${s}" aria-pressed="${UI.rgTab===s}">${s}<span class="c">${regCount(w,s)}</span></button>`).join("")}</div>
 <div class="tblwrap"><table><thead><tr><th class="num">#</th><th>Name</th><th>Category · where they work</th><th>Mobile</th><th>Registered</th>${pay?"<th>Payment</th>":""}${w.stage>=5&&UI.rgTab==="Confirmed"?"<th>Present</th>":""}<th>Move to</th></tr></thead><tbody>
 ${list.map((r,i)=>`<tr><td class="num">${i+1}</td><td><b style="font-weight:600">${nm(r)}</b>${r.byHand?' <span class="subt">added by hand</span>':""}${isViewer()?"":` <button class="btn link" data-rgedit="${r.id}">Edit</button>`}${r.note?`<div class="subt">${esc(r.note)}</div>`:""}</td><td class="wrapcell">${esc(stripOther(r.a.cat)||"")}<div class="subt">${esc(regWhere(r))}</div></td><td class="code">${esc(r.a.mobile||"")}</td><td>${fdt(r.at)}${r.status==="Awaiting payment"?`<div class="subt ${r.holdUntil<new Date().toISOString()?"d-red":""}">pay by ${fdt(r.holdUntil)}</div>`:""}</td>
  ${pay?`<td>${r.paid?`<span class="pill p-ric">Paid</span>${r.txn?`<div class="code">${esc(r.txn)}</div>`:""}`:r.txn?`<span class="code">${esc(r.txn)}</span>${r.receipt?'<div class="subt">receipt attached</div>':""}<div><button class="btn link" data-act="rg-paid" data-id="${r.id}">Verify payment</button></div>`:r.status==="Waiting list"||r.status==="Cancelled"?"—":`<button class="btn link" data-act="rg-paid" data-id="${r.id}">Record payment</button>`}</td>`:""}
  ${w.stage>=5&&UI.rgTab==="Confirmed"?`<td><input type="checkbox" data-rgpresent="${r.id}" ${r.present?"checked":""} aria-label="Present"></td>`:""}
  <td><select data-rgmove="${r.id}" aria-label="Move ${nm(r)}"><option value="">${r.status}</option>${REG_ST.filter(s=>s!==r.status&&(pay||!["Payment to verify","Awaiting payment"].includes(s))).map(s=>`<option>${s}</option>`).join("")}</select></td></tr>`).join("")||`<tr><td colspan="8" class="empty">Nobody here.</td></tr>`}
 </tbody></table></div></div>`}
function regMove(w,r,to){const from=r.status;if(to==="Confirmed"&&!holdsSeat(r)&&seatsLeft(w)<=0&&!confirmOver){confirmOver=true;toast(`All ${w.seats} seats are taken. Choose again to confirm anyway.`);return false}confirmOver=false;
 r.status=to;if(to==="Confirmed"&&w.fee&&w.payMode!=="free"&&!r.paid)r.note="Confirmed by DME&T before payment";if(to!=="Awaiting payment")delete r.holdUntil;else r.holdUntil=new Date(Date.now()+(w.holdHours||48)*3600e3).toISOString();
 let msg=`${stripOther(r.a.name)}: ${from} → ${to}`;if(holdsSeat({status:from})&&!holdsSeat(r)){const m=promote(w);if(m.length)msg+=`; moved up from the waiting list: ${m.map(x=>stripOther(x.a.name)).join(", ")}`}
 wlog(w,msg);regSync(w);return true}
let confirmOver=false;
function sheetRegSettings(w){openSheet("Seats and payment",`<label class="f">Seats<input type="number" min="1" name="s" value="${w.seats??30}"></label>
 <label class="f">Registration fee (PKR) <span class="h">0 for free</span><input type="number" min="0" step="100" name="fee" value="${w.fee??0}"></label>
 <label class="f">How payment works<select name="pm">${opt(PAYMODES,w.payMode||"proof")}</select></label>
 <div class="grid2"><label class="f">Seat hold (hours) <span class="h">for the seat-hold option</span><input type="number" min="6" name="hh" value="${w.holdHours||48}"></label><label class="f">Account details shown on the form<input name="acct" value="${esc(w.payInfo||"")}" placeholder="e.g. RIC Workshop Fund, Bank of Punjab, A/C 0000-0000000"></label></div>
 <div class="flag info">Pay first is the most reliable way to stop dummy entries: the form only submits with a transaction ID and a receipt photo, a transaction ID can be used once, and one registration is allowed per mobile number and email.</div>`,()=>{
 const s=+fv("s");if(!(s>0))return fail("Enter the number of seats.");const before=regsOf(w).filter(holdsSeat).length;w.seats=s;w.fee=+fv("fee")||0;w.payMode=w.fee?fv("pm"):"free";w.holdHours=+fv("hh")||48;w.payInfo=fv("acct");
 let msg=`Registration settings: ${s} seats, ${w.fee?money(w.fee):"free"}${w.fee?", "+(PAYMODES.find(p=>p[0]===w.payMode)||["",""])[1].split(":")[0]:""}`;const m=promote(w);if(m.length)msg+=`; ${m.length} moved up from the waiting list`;if(before>s)msg+=`; ${before-s} more seats taken than available — move people to the waiting list if needed`;wlog(w,msg);regSync(w);toast("Saved");return true})}

/* participant view */
UI.rgDone=null;
function vReg(){const w=DB.workshops.find(x=>x.id===route.id);if(!w)return`<div class="panel">Not found.</div>`;const pay=w.fee&&w.payMode!=="free";
 const back=`<div class="flag info">Participant view. This is what opens from the registration link or QR code. <a href="#ws-${w.id}">Back to the workshop</a></div>`;
 if(UI.rgDone&&UI.rgDone.w===w.id){const r=regsOf(w).find(x=>x.id===UI.rgDone.r);return back+`<div class="panel fbform"><h2>${r.status==="Waiting list"?"You are on the waiting list":r.status==="Confirmed"?"Registration confirmed":"Registration received"}</h2>
  <p>${r.status==="Waiting list"?`All seats for <b>${esc(w.title)}</b> are taken. You are number ${regsOf(w).filter(x=>x.status==="Waiting list"&&x.at<=r.at).length} on the waiting list; we will contact you if a seat opens.`:r.status==="Confirmed"?`Your seat for <b>${esc(w.title)}</b> on ${fd(w.date)} is confirmed.`:r.status==="Payment to verify"?`Your seat is held while the DME&T office verifies your payment (transaction ${esc(r.txn)}). You will receive a confirmation.`:`Your seat is held until ${fdt(r.holdUntil)}. Please pay ${money(w.fee)} before then or the seat will go to the next person.`}</p>
  <div class="actions"><button class="btn" data-act="rg-again">Register another person (testing)</button><a class="btn" href="#ws-${w.id}">Back to the workshop</a></div></div>`}
 if(!w.regOpen)return back+`<div class="panel fbform"><h2>${esc(w.title)}</h2><p>Registration is not open.</p></div>`;
 const full=seatsLeft(w)<=0;
 return back+`<form class="panel fbform" id="rgform" novalidate>${formHead(w,"Registration: "+w.title,`${fd(w.date)} · ${esc(w.venue||"RIC")}${w.fee?` · Fee ${money(w.fee)}`:" · Free"}`)}
 ${w.regDesc?`<p style="margin:0;white-space:pre-line">${esc(w.regDesc)}</p>`:""}
 ${full?`<div class="flag">All seats are taken. You can still register for the waiting list.</div>`:`<div class="flag info">${seatsLeft(w)} of ${w.seats} seats left</div>`}
 ${formHtml(w.rgq,{},"rg-",false)}
 ${pay&&!full&&w.payMode==="proof"?`<fieldset class="pfsec"><legend>Payment</legend><p class="qd" style="margin:0">Pay ${money(w.fee)} first, then enter the details below. ${w.payInfo?`<br><b>${esc(w.payInfo)}</b>`:""}</p>
  <div class="q"><div class="qt"><span class="req">Transaction ID / reference number</span></div><input name="rg-txn" placeholder="From your bank or wallet receipt"></div>
  <div class="q"><div class="qt"><span class="req">Photo or screenshot of the receipt</span></div><input type="file" name="rg-rcpt" accept="image/*,application/pdf"></div></fieldset>`:""}
 ${pay&&!full&&w.payMode==="hold"?`<div class="flag info">Your seat will be held for ${w.holdHours||48} hours. Pay ${money(w.fee)}${w.payInfo?` to ${esc(w.payInfo)}`:""} and send the receipt to the DME&T office before then.</div>`:""}
 <div class="err" id="rgerr" role="alert"></div><button class="btn primary" type="button" data-act="rg-submit" style="justify-self:start">${full?"Join the waiting list":"Register"}</button></form>`}
function submitReg(){const w=DB.workshops.find(x=>x.id===route.id),fm=document.getElementById("rgform"),er=document.getElementById("rgerr");const{vals:v,missing}=formRead(fm,w.rgq,"rg-");
 if(missing.length){er.textContent="Please answer: "+missing.map(q=>q.t).join("; ");return}
 if(v.mobile&&!/^(\+92|0)3\d{2}-?\d{7}$/.test(v.mobile.replace(/\s/g,""))){er.textContent="Enter the mobile as 03xx-xxxxxxx.";return}
 if(v.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)){er.textContent="Check the email address.";return}
 const norm=s=>String(s||"").replace(/\D/g,"").slice(-10);const dup=regsOf(w).find(r=>r.status!=="Cancelled"&&((v.mobile&&norm(r.a.mobile)===norm(v.mobile))||(v.email&&String(r.a.email||"").toLowerCase()===v.email.toLowerCase())));
 if(dup){er.textContent="This mobile number or email is already registered for this workshop.";return}
 const r={id:uid("RG"),at:new Date().toISOString(),a:v,paid:false};
 const pay=w.fee&&w.payMode==="proof"&&seatsLeft(w)>0;if(pay){const t=(fm.querySelector('[name="rg-txn"]').value||"").trim(),f=fm.querySelector('[name="rg-rcpt"]').files[0];
  if(t.length<5){er.textContent="Enter the transaction ID from your payment receipt.";return}if(!f){er.textContent="Attach a photo or screenshot of the payment receipt.";return}
  if(regsOf(w).some(x=>x.txn&&x.txn.toLowerCase()===t.toLowerCase())){er.textContent="This transaction ID has already been used.";return}r.txn=t;r.receipt=f.name}
 placeNew(w,r);w.regs=[...regsOf(w),r];regSync(w);w.log.push({at:r.at,by:stripOther(v.name)||"Participant",what:`Registered: ${r.status}`});persist();UI.rgDone={w:w.id,r:r.id};render();window.scrollTo(0,0)}
function regAction(a,b){const w=DB.workshops.find(x=>x.id===route.id);if(!w)return;
 if(a==="rg-copy")return copyText(regLink(w),b);
 if(a==="rg-toggle"){w.regOpen=!w.regOpen;if(!w.rgq)w.rgq=defRgQ();if(w.regOpen&&!w.seats){w.regOpen=false;toast("Set the number of seats first");return sheetRegSettings(w)}wlog(w,w.regOpen?"Registration form opened":"Registration form closed");persist();render();return}
 if(a==="rg-settings")return sheetRegSettings(w);
 if(a==="rg-expire"){const ex=expireHolds(w),m=promote(w);wlog(w,`${ex.length} expired seat holds released${m.length?`; ${m.length} moved up from the waiting list`:""}`);regSync(w);persist();render();return}
 if(a==="rg-paid"){const r=regsOf(w).find(x=>x.id===b.dataset.id);return openSheet(`Payment · ${stripOther(r.a.name)}`,`<p style="margin:0">${r.txn?`Transaction ID given: <b class="code">${esc(r.txn)}</b>${r.receiptPath?` · <button type="button" class="btn link" data-act="doc-open" data-path="${esc(r.receiptPath)}">Open receipt</button>`:r.receipt?` · receipt ${esc(r.receipt)}`:""}. Check it against the bank statement.`:"Record the payment."}</p>
  <label class="f">Transaction ID<input name="t" value="${esc(r.txn||"")}"></label><label class="f">Amount (PKR)<input type="number" name="amt" value="${w.fee||0}"></label>`,()=>{if(!fv("t"))return fail("Enter the transaction ID.");if(regsOf(w).some(x=>x!==r&&x.txn&&x.txn.toLowerCase()===fv("t").toLowerCase()))return fail("This transaction ID is already used by another registration.");
  r.txn=fv("t");r.paid=true;r.amount=+fv("amt");if(r.status!=="Confirmed"){if(holdsSeat(r)||seatsLeft(w)>0)r.status="Confirmed";}delete r.holdUntil;delete r.note;wlog(w,`Payment verified for ${stripOther(r.a.name)} (${r.txn})`);regSync(w);toast("Payment verified");return true},"Verify")}
 if(a==="rg-addm"){return openSheet("Add a participant by hand",`<label class="f">Full name<input name="n"></label><div class="grid2"><label class="f">Category<select name="c">${opt(w.rgq.find(q=>q.k==="cat")?.opts||["Other"])}</select></label><label class="f">Mobile<input name="m" placeholder="03xx-xxxxxxx"></label></div><label class="f">Institution<input name="i" value="Rawalpindi Institute of Cardiology"></label><label class="f">Add to<select name="s">${opt(["Confirmed","Waiting list"])}</select></label>`,()=>{
  if(fv("n").length<3)return fail("Enter the name.");const r={id:uid("RG"),at:new Date().toISOString(),a:{name:fv("n"),cat:fv("c"),mobile:fv("m"),inst:fv("i")},paid:false,byHand:true,status:fv("s")};w.regs=[...regsOf(w),r];wlog(w,`${fv("n")} added by hand to ${fv("s")}`);regSync(w);toast("Added");return true})}}
EXPORTS.regs=id=>{const w=DB.workshops.find(x=>x.id===id);const row=r=>{const o={"Status":r.status,"Registered":new Date(r.at).toLocaleString("en-GB")};w.rgq.forEach(q=>o[q.t]=qText(q,r.a[q.k]));if(w.fee)Object.assign(o,{"Transaction ID":r.txn||"","Paid":r.paid?"Yes":"No"});if(w.stage>=5)o["Present"]=r.present?"Yes":"";return o};
 return{file:`Registrations ${w.title}`,sheets:!regsOf(w).length?[sheetFrom("Registrations",[])]:REG_ST.filter(s=>regCount(w,s)).map(s=>sheetFrom(s,regsOf(w).filter(r=>r.status===s).sort((a,b)=>a.at<b.at?-1:1).map(row)))}};
const vRgEdit=()=>vFormEdit("rg");
