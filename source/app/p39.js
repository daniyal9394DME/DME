
/* =====================================================================
   V37 · RIC PGTs in workshop registration: pick the PGT from a searchable
   list and their details fill in (form, "Add someone by hand", and the
   trainee register's selection bar). Registrations keep the PGT link.
   ===================================================================== */
const RIC_INST="Rawalpindi Institute of Cardiology";
/* the list: full records for staff and the prototype; names only (+ last 4 mobile digits) on the public form */
function wsPgtList(){if(typeof PUB!=="undefined"&&PUB&&PUB.kind==="reg")return PUB.pgts||[];
 return verified().filter(p=>CUR.get(p.id)&&CUR.get(p.id).active).sort((a,b)=>a.name.localeCompare(b.name)).map(p=>{const c=CUR.get(p.id),m=p.mobile||p.mobile2||"";
  return{id:p.id,n:p.name,s:p.spec,prog:p.program,code:p.code||"",sup:c.sup?facName(c.sup):"",m4:m.replace(/\D/g,"").slice(-4)||null,e:!!p.email,mobile:m,email:p.email||"",year:ricLabel(p)}})}
const wsPgtLabel=x=>`Dr. ${x.n} · ${x.s}${x.code?" · "+x.code:""}`;
const wsPgtFind=v=>{const L=wsPgtList();return L.find(x=>wsPgtLabel(x)===v)||null};
/* answers to fill in for a picked PGT, only for questions the form has */
function wsPgtVals(qs,x){const has=k=>qs.find(q=>q.k===k),v={};const pick=(k,val)=>{const q=has(k);if(!q||val==null||val==="")return;
  if(q.opts&&q.opts.length&&!q.opts.some(o=>String(o).startsWith("@"))&&!q.opts.includes(val))val=q.other?"Other: "+val:null;if(val!=null)v[k]=val};
 pick("name","Dr. "+x.n);const cq=has("cat");if(cq&&cq.opts){const nw=x.year&&/year 1|initial/i.test(x.year);pick("cat",nw&&cq.opts.includes("Newly inducted PGT")?"Newly inducted PGT":cq.opts.find(o=>/PGT/i.test(o)&&!/newly/i.test(o))||cq.opts[0])}
 pick("atric","At RIC");pick("sup",x.sup);pick("dept",x.s);if(!has("atric"))pick("inst",RIC_INST);if(x.mobile)pick("mobile",x.mobile);if(x.email)pick("email",x.email);return v}
function wsPickerHtml(){const L=wsPgtList();if(!L.length)return"";
 return`<div class="panel wspick" style="display:grid;gap:6px;background:var(--sunk);box-shadow:none"><label class="f" style="margin:0"><b>RIC postgraduate trainee?</b> <span class="h">Find your name and your details fill in. Everyone else, fill in the form below.</span>
  <input id="rg-pgtpick" list="rg-pgtlist" placeholder="Type your name" autocomplete="off"></label><datalist id="rg-pgtlist">${L.map(x=>`<option value="${esc(wsPgtLabel(x))}">`).join("")}</datalist><input type="hidden" id="rg-pid"><div class="subt" id="rg-pgtnote"></div></div>`}
/* where the picker sits: under "Where do you work?" (shown for At RIC), or at the top when the form has no such question */
function wsPlacePicker(){const fm=document.getElementById("rgform"),pk=fm&&fm.querySelector(".wspick");if(!pk)return;const a=fm.querySelector('[name="rg-atric"]'),q=a&&a.closest(".q");
 if(q){if(q.nextElementSibling!==pk)q.after(pk);const v=(fm.querySelector('[name="rg-atric"]:checked')||{}).value;const hide=v!=="At RIC";pk.style.display=hide?"none":"grid";if(hide){const pid=fm.querySelector("#rg-pid");if(pid)pid.value=""}}else pk.style.display="grid"}
document.addEventListener("change",e=>{if(e.target.name==="rg-atric")wsPlacePicker()});
new MutationObserver(()=>{const fm=document.getElementById("rgform");if(fm&&fm.querySelector(".wspick")&&!fm.dataset.wsp){fm.dataset.wsp="1";wsPlacePicker()}}).observe(document.documentElement,{childList:true,subtree:true});
/* put the picker in the registration form */
const wsInject=h=>{if(!/id="rgform"/.test(h)||/id="rg-pgtpick"/.test(h))return h;const i=h.indexOf('<fieldset class="pfsec">',h.indexOf('id="rgform"'));return i<0?h:h.slice(0,i)+wsPickerHtml()+h.slice(i)};
{const _v=vReg;vReg=function(){return wsInject(_v())}}
if(typeof pubShell==="function"){const _p=pubShell;pubShell=function(inner){_p(wsInject(inner))}}
/* load the names for the public form (needs 05_ws_pgts.sql); without it the form works as before */
if(typeof publicPage==="function"){const _pp=publicPage;publicPage=async function(kind,id){if(kind==="reg"&&typeof SYNC!=="undefined"&&SYNC.sb){try{const{data}=await SYNC.sb.rpc("dme_ws_pgts",{p_id:id});window.__wsp=data&&data.list||[]}catch(e){window.__wsp=[]}}
 await _pp(kind,id);if(kind==="reg"&&PUB){PUB.pgts=window.__wsp||[];if(PUB.pgts.length&&document.getElementById("rgform")&&!document.getElementById("rg-pgtpick"))pubRender()}}}
/* picking a name re-draws the questions with the answers filled in, keeping what was already typed */
document.addEventListener("input",e=>{if(e.target.id!=="rg-pgtpick")return;const fm=document.getElementById("rgform"),x=wsPgtFind(e.target.value);const pidEl=document.getElementById("rg-pid"),note=document.getElementById("rg-pgtnote");
 if(!x){if(pidEl.value){pidEl.value="";note.textContent=""}return}const w=(typeof PUB!=="undefined"&&PUB&&PUB.w)||DB.workshops.find(z=>z.id===route.id);if(!w||!fm)return;
 const qs=w.rgq||[],cur=formRead(fm,qs,"rg-").vals,fill=wsPgtVals(qs,x),vals={...cur};Object.entries(fill).forEach(([k,v])=>{vals[k]=v});
 const secs=[...fm.querySelectorAll("fieldset.pfsec")].filter(f=>!f.querySelector('[name="rg-txn"]'));if(!secs.length)return;
 const pk=fm.querySelector(".wspick"),tmp=document.createElement("div");tmp.innerHTML=formHtml(qs,vals,"rg-",false);secs[0].before(pk,...tmp.children);secs.forEach(f=>f.remove());pidEl.value=x.id;wsPlacePicker();applyShow(fm);
 const mob=fm.querySelector('[name="rg-mobile"]'),em=fm.querySelector('[name="rg-email"]');
 if(!x.mobile&&x.m4&&mob&&!mob.value){mob.placeholder=`Leave blank to use the number on file, ending ${x.m4}`}
 if(!x.email&&x.e&&em&&!em.value){em.placeholder="Leave blank to use the email on file"}
 note.textContent=`Filled in for Dr. ${x.n}, ${x.s}. Check the details before you register.`});
/* reading the form: a picked PGT may leave mobile and email blank when they are on file */
{const _f=formRead;formRead=function(root,qs,prefix){const r=_f(root,qs,prefix);if(!root||root.id!=="rgform")return r;const pid=(root.querySelector("#rg-pid")||{}).value;if(!pid)return r;
 const x=wsPgtList().find(z=>z.id===pid);if(!x)return r;r.vals.pid=pid;const onFile={mobile:!!(x.mobile||x.m4),email:!!(x.email||x.e)};
 if(x.mobile&&!r.vals.mobile)r.vals.mobile=x.mobile;if(x.email&&!r.vals.email)r.vals.email=x.email;
 r.missing=r.missing.filter(q=>!(q&&q.k&&onFile[q.k]&&!r.vals[q.k]));return r}}
/* prototype participant view: keep the link to the PGT on the registration */
{const _s=submitReg;submitReg=function(){const w=DB.workshops.find(x=>x.id===route.id),pid=(document.getElementById("rg-pid")||{}).value,n=regsOf(w).length;
 if(pid&&regsOf(w).some(r=>r.pid===pid&&r.status!=="Cancelled")){document.getElementById("rgerr").textContent="This trainee is already registered for this workshop.";return}
 _s();if(pid&&regsOf(w).length>n){const r=regsOf(w)[regsOf(w).length-1];r.pid=pid;delete r.a.pid;const p=DB.pgts.find(z=>z.id===pid);if(p)Object.assign(r.a,{pgtCode:p.code||"",spec:p.spec,program:p.program});persist()}}}

/* ---------- staff: Add someone by hand, with the PGT picker ---------- */
function wsRegFromPgt(w,p,status,how){const c=CUR.get(p.id)||{},x=wsPgtList().find(z=>z.id===p.id)||{n:p.name,s:p.spec,sup:c.sup?facName(c.sup):"",mobile:p.mobile||p.mobile2||"",email:p.email||"",year:ricLabel(p)};
 const a={...wsPgtVals(w.rgq||defRgQ(),x),name:"Dr. "+p.name,mobile:x.mobile||"",email:x.email||"",inst:RIC_INST,pgtCode:p.code||"",spec:p.spec,program:p.program};
 return{id:uid("RG"),at:new Date().toISOString(),a,paid:false,byHand:true,pid:p.id,status,how}}
{const _r=regAction;regAction=function(a,b){if(a!=="rg-addm")return _r(a,b);const w=DB.workshops.find(x=>x.id===route.id);if(!w)return;if(!w.rgq)w.rgq=defRgQ();
 const L=wsPgtList();
 openSheet("Add a participant by hand",`<label class="f">RIC PGT <span class="h">pick to fill in their details, or leave blank for anyone else</span><input name="pgt" list="rg-addl" placeholder="Type a name, specialty or PGT ID" autocomplete="off"><datalist id="rg-addl">${L.map(x=>`<option value="${esc(wsPgtLabel(x))}">`).join("")}</datalist></label>
  <div class="subt" id="rg-addnote"></div>
  <label class="f">Full name<input name="n"></label><div class="grid2"><label class="f">Category<select name="c">${opt(w.rgq.find(q=>q.k==="cat")?.opts||["Other"])}</select></label><label class="f">Mobile<input name="m" placeholder="03xx-xxxxxxx"></label></div>
  <label class="f">Institution<input name="i" value="${RIC_INST}"></label><label class="f">Add to<select name="s">${opt(["Confirmed","Waiting list"])}</select></label>`,()=>{
  const x=wsPgtFind(fv("pgt")),st=fv("s");
  if(x){const p=DB.pgts.find(z=>z.id===x.id);if(regsOf(w).some(r=>r.pid===p.id&&r.status!=="Cancelled"))return fail(`Dr. ${p.name} is already registered.`);
   const r=wsRegFromPgt(w,p,st);if(fv("m"))r.a.mobile=fv("m");if(fv("c"))r.a.cat=fv("c");w.regs=[...regsOf(w),r];wlog(w,`Dr. ${p.name} (${p.spec}) added by hand to ${st}`);regSync(w);toast("Added");return true}
  if(fv("n").length<3)return fail("Enter the name, or pick an RIC PGT.");const r={id:uid("RG"),at:new Date().toISOString(),a:{name:fv("n"),cat:fv("c"),mobile:fv("m"),inst:fv("i")},paid:false,byHand:true,status:st};
  w.regs=[...regsOf(w),r];wlog(w,`${fv("n")} added by hand to ${st}`);regSync(w);toast("Added");return true},"Add")}}
document.addEventListener("input",e=>{if(e.target.name!=="pgt"||!e.target.closest("#sheetform")||!document.getElementById("rg-addl"))return;const x=wsPgtFind(e.target.value),F=n=>document.querySelector(`#sheetform [name="${n}"]`),note=document.getElementById("rg-addnote");
 if(!x){note.textContent="";return}const w=DB.workshops.find(z=>z.id===route.id),v=wsPgtVals(w.rgq||defRgQ(),x);
 F("n").value="Dr. "+x.n;F("m").value=x.mobile||"";F("i").value=RIC_INST;if(v.cat&&[...F("c").options].some(o=>o.value===v.cat))F("c").value=v.cat;
 note.textContent=`${x.s} · ${x.prog||""}${x.year?" · "+x.year:""}${x.sup?" · supervisor "+x.sup:""}${x.email?" · "+x.email:""}`});

/* ---------- the registration list shows the PGT link, specialty and year ---------- */
{const _p=regPanel;regPanel=function(w){let h=_p(w);if(!regsOf(w).some(r=>r.pid))return h;
 return h.split("<tr>").map(seg=>{const m=seg.match(/data-rgmove="([^"]+)"/);if(!m)return seg;const r=regsOf(w).find(z=>z.id===m[1]);if(!r||!r.pid)return seg;const p=DB.pgts.find(z=>z.id===r.pid);if(!p)return seg;
  const info=`${esc(p.spec)} · ${esc(ricLabel(p))}${p.code?" · "+esc(p.code):""}`;
  seg=seg.replace(/(<b style="font-weight:600">[^<]*<\/b>)/,`$1 <a class="pill p-ric" href="#pgt-${p.id}" style="text-decoration:none">RIC PGT</a>`);
  seg=seg.replace(/(<td class="wrapcell">[^<]*<div class="subt">)([^<]*)(<\/div>)/,`$1${info}$3`);
  if(!r.a.mobile&&(p.mobile||p.mobile2))seg=seg.replace('<td class="code"></td>',`<td class="code">${esc(p.mobile||p.mobile2)}</td>`);return seg}).join("<tr>")}}
/* the downloaded list gets PGT ID, specialty and year columns when there are RIC PGTs */
{const _x=EXPORTS.regs;EXPORTS.regs=id=>{const o=_x(id),w=DB.workshops.find(x=>x.id===id);if(!regsOf(w).some(r=>r.pid))return o;
 o.sheets.forEach(s=>{if(!s.rows)return;const R=regsOf(w).filter(r=>r.status===s.name).sort((a,b)=>a.at<b.at?-1:1);s.rows.forEach((row,i)=>{const r=R[i],p=r&&r.pid&&DB.pgts.find(z=>z.id===r.pid);if(row&&typeof row==="object"&&!Array.isArray(row)){row["PGT ID"]=p?p.code||"":"";row["Specialty (register)"]=p?p.spec:"";row["Year at RIC"]=p?ricLabel(p):""}})});return o}}

/* ---------- trainee register: Add selected PGTs to a workshop ---------- */
{const _v=vPgts;vPgts=function(){const h=_v();if(!UI.psel||!UI.psel.size||!canSee("workshops"))return h;return h.replace('<button class="btn small" data-act="ps-sup">','<button class="btn small" data-act="ps-ws">Add to workshop</button><button class="btn small" data-act="ps-sup">')}}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="ps-ws"]');if(!b)return;const L=DB.pgts.filter(p=>UI.psel.has(p.id));if(!L.length)return;
 const W=DB.workshops.filter(w=>w.stage<5).sort((a,b)=>(a.month+(a.date||"")).localeCompare(b.month+(b.date||"")));if(!W.length){toast("No upcoming workshop to add them to");return}
 openSheet(`Add ${L.length} PGT${L.length>1?"s":""} to a workshop`,`<label class="f">Workshop<select name="w">${opt(W.map(w=>[w.id,`${w.title} · ${mLabel(w.month)}${w.date?" · "+fd(w.date):""}`]))}</select></label>
  <label class="f">Add as<select name="s">${opt(["Confirmed","Waiting list"])}</select></label><p class="subt" style="margin:0">Their name, specialty, supervisor, mobile and email are taken from the trainee register. PGTs already registered are skipped. Seats are not checked; adjust in the workshop's registration list.</p>`,()=>{
  const w=DB.workshops.find(x=>x.id===fv("w"));if(!w)return fail("Choose a workshop.");if(!w.rgq)w.rgq=defRgQ();const st=fv("s");let n=0,skip=0;
  L.forEach(p=>{if(regsOf(w).some(r=>r.pid===p.id&&r.status!=="Cancelled")){skip++;return}w.regs=[...regsOf(w),wsRegFromPgt(w,p,st)];n++});
  if(n)wlog(w,`${n} PGT${n===1?"":"s"} added from the trainee register to ${st}`);regSync(w);UI.psel.clear();toast(`${n} added to ${w.title}${skip?` · ${skip} already registered`:""}`);return true},"Add")});
