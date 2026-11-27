/* =====================================================================
   V49 · WORKSHOP PARTICIPANTS: edit a registration's details, or take
   the person off the list completely (by hand or from the form). A
   removed person who held a seat frees it, and the next person on the
   waiting list moves up. Every change goes into the workshop history.
   ===================================================================== */
const RE_TOUCH=new Set();
document.addEventListener("input",e=>{const n=e.target&&e.target.name;if(n&&n.startsWith("re-")&&e.target.closest("#sheetform"))RE_TOUCH.add(n.replace(/-other$/,""))});
document.addEventListener("change",e=>{const n=e.target&&e.target.name;if(n&&n.startsWith("re-")&&e.target.closest("#sheetform"))RE_TOUCH.add(n.replace(/-other$/,""))});
function sheetRegEdit(w,r){RE_TOUCH.clear();const Q=(w.rgq||defRgQ()).filter(q=>!["decl"].includes(q.k)&&q.type!=="section"&&q.type!=="info"),nm=stripOther(r.a&&r.a.name)||"this person";
 const p=r.pid&&DB.pgts.find(z=>z.id===r.pid);
 openSheet("Edit participant",`<p class="subt" style="margin:0">${esc(r.status)} · registered ${fdt(r.at)}${r.byHand?" · added by hand":""}${p?` · linked to RIC PGT Dr. ${esc(p.name)} (${esc(p.code||"")})`:""}</p>
 ${(()=>{const A=r.a||{},has=q=>!qEmpty(A[q.k]),vis=Q.filter(q=>has(q)||condMet(q,A)),more=Q.filter(q=>!vis.includes(q));
  const ctl=q=>{let h=qCtrl(q,A[q.k],"re-"+q.k,false);const v=A[q.k];if(q.type==="dd"&&v&&typeof v==="string"&&!isOther(v)&&!qOpts(q).includes(v))h=h.replace('<option value="">Choose</option>',`<option value="">Choose</option><option selected>${esc(v)}</option>`);return h};
  const row=q=>`<div class="f" style="display:grid;gap:6px"><span>${esc(q.t)}</span>${ctl(q)}</div>`;
  return vis.map(row).join("")+(more.length?`<details><summary style="cursor:pointer" class="subt">More fields (${more.map(q=>esc(q.t)).join(", ")})</summary><div style="display:grid;gap:12px;margin-top:10px">${more.map(row).join("")}</div></details>`:"")})()}
 <label class="f">Note <span class="h">shown under the name in the list</span><input name="re-note" value="${esc(r.note||"")}"></label>
 <div class="flag" style="display:grid;gap:8px;margin-top:6px"><b>Remove from the list</b><span>${esc(nm)} will be taken off this workshop completely${holdsSeat(r)?"; their seat goes to the next person on the waiting list":""}. To keep a record instead, move them to <i>Cancelled</i>.</span>
  <div class="actions" style="justify-content:flex-start"><button type="button" class="btn small" data-rgremove="${esc(r.id)}">Remove ${esc(nm)}</button></div></div>`,()=>{
  const root=document.getElementById("sheetform"),a={...(r.a||{})},ch=[];
  /* only questions that were actually changed are read back, so answers the form cannot show (e.g. an institution typed by hand) are kept */
  Q.forEach(q=>{if(!RE_TOUCH.has("re-"+q.k))return;const v=qRead(root,q,"re-"+q.k),o=a[q.k];if(JSON.stringify(v??"")!==JSON.stringify(o??"")){a[q.k]=v;ch.push(q.t)}});
  if(!stripOther(a.name)||String(stripOther(a.name)).length<3)return fail("Enter the full name.");
  const note=fv("re-note");if(note!==(r.note||"")){if(note)r.note=note;else delete r.note;ch.push("note")}
  if(!ch.length){toast("No changes");return true}
  r.a=a;r.edited=new Date().toISOString();wlog(w,`${stripOther(a.name)}: details edited (${ch.join(", ")})`);regSync(w);toast("Saved");return true},"Save")}
document.addEventListener("click",e=>{const b=e.target.closest("[data-rgedit],[data-rgremove]");if(!b||!DB||!DB.workshops)return;const w=DB.workshops.find(x=>x.id===route.id);if(!w)return;
 const id=b.dataset.rgedit||b.dataset.rgremove,r=regsOf(w).find(z=>z.id===id);if(!r)return;e.preventDefault();
 if(b.dataset.rgedit){sheetRegEdit(w,r);return}
 /* second tap confirms */
 if(b.dataset.armed!=="1"){b.dataset.armed="1";b.classList.add("danger");b.textContent="Tap again to remove for good";return}
 const nm=stripOther(r.a&&r.a.name)||"Participant",held=holdsSeat(r);w.regs=regsOf(w).filter(z=>z!==r);let msg=`${nm} removed from the registration list (was ${r.status})`;
 if(held){const m=promote(w);if(m.length)msg+=`; moved up from the waiting list: ${m.map(x=>stripOther(x.a.name)).join(", ")}`}
 wlog(w,msg);regSync(w);persist();closeSheet();render();toast(`${nm} removed`)});
