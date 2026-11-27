/* =====================================================================
   V15 · update trainee contact details from the setup file
   (for a database that was set up before the file carried them)
   ===================================================================== */
function contactImportPanel(){if(!isAdmin())return"";const miss=verified().filter(p=>!p.mobile).length;
 return`<div class="panel" id="set-import" style="display:grid;gap:10px"><h3 style="margin:0">Update trainee details from the data file</h3>
 <p class="subt" style="margin:0">Choose <b>dme-initial-data.json</b>. It fills in mobile, email, CNIC, PMDC number and father's name for trainees whose record is missing them. Nothing else is changed, and details already entered in the app are kept. ${miss} trainees have no mobile number at present.</p>
 <label class="f">Data file<input type="file" id="ci-file" accept=".json,application/json"></label><p class="status" id="ci-st"></p></div>`}
document.addEventListener("change",async e=>{if(e.target.id!=="ci-file"||!e.target.files[0])return;const st=document.getElementById("ci-st");
 let j;try{j=JSON.parse(await e.target.files[0].text())}catch(x){st.textContent="That file could not be read.";st.className="status warn";return}
 const src=(j.seed&&j.seed.pgts)||j.pgts;if(!Array.isArray(src)){st.textContent="That is not the DME data file.";st.className="status warn";return}
 const F=["mobile","email","cnic","pmdc","father"];let people=0,fields=0;
 src.forEach(s=>{const p=DB.pgts.find(x=>x.id===s.id)||DB.pgts.find(x=>x.name.toLowerCase()===String(s.name||"").toLowerCase()&&x.spec===s.spec);if(!p)return;let n=0;
  F.forEach(k=>{if(s[k]&&!p[k]){p[k]=s[k];n++}});if(n){people++;fields+=n}});
 e.target.value="";if(!people){st.textContent="Nothing to add: every trainee in the file already has these details.";st.className="status ok";return}
 log(`Contact details added from ${e.target.files?.[0]?.name||"the data file"}: ${people} trainees, ${fields} details`);
 const y=window.scrollY;render();window.scrollTo(0,y);const s2=document.getElementById("ci-st");if(s2){s2.textContent=`Added ${fields} details for ${people} trainees.`;s2.className="status ok"}});

/* =====================================================================
   V16 · apply a trainee update file (e.g. the HR list, Nov 2026).
   A change is applied only when the app still holds the old value,
   so anything edited in the app since is never overwritten.
   ===================================================================== */
UI.upd=null;
const UPD_L={mobile:"Mobile",mobile2:"Second mobile",email:"Email",emailAlt:"Alternate email",desig:"Designation",cnic:"CNIC",passport:"Passport no.",name:"Name",notes:"Notes",domicile:"Domicile",father:"Father's name",pmdc:"PMDC no."};
const updNorm=v=>String(v??"").trim().toLowerCase();
function updPlan(j){const out={apply:[],done:[],clash:[],add:[],dup:[]};
 (j.changes||[]).forEach(c=>{const L=c.coll==="faculty"?DB.faculty:DB.pgts,p=L.find(x=>x.id===c.id&&updNorm(x.name)===updNorm(c.name))||L.find(x=>updNorm(x.name)===updNorm(c.name));if(!p){out.clash.push({c,why:(c.coll==="faculty"?"faculty member":"trainee")+" not found"});return}
  const cur=p[c.field];if(updNorm(cur)===updNorm(c.to))out.done.push({c,p});else if(!cur||updNorm(cur)===updNorm(c.from)||(c.field==="notes"&&!String(cur).includes(c.to.trim())))out.apply.push({c,p});else out.clash.push({c,p,why:"changed in the app to “"+cur+"”"})});
 (j.add||[]).forEach(a=>{if(a.fac){const nn=s=>updNorm(s).replace(/^(prof\.?\s+)?(dr\.?\s+)?/,"");(DB.faculty.some(x=>nn(x.name)===nn(a.fac.name))?out.dup:out.add).push(a);return}const dg=s=>String(s||"").replace(/\D/g,"");const ex=DB.pgts.find(x=>(dg(a.pgt.cnic)&&dg(x.cnic)===dg(a.pgt.cnic))||updNorm(x.name)===updNorm(a.pgt.name));(ex?out.dup:out.add).push(a)});
 return out}
function updPanel(){if(!isAdmin())return"";const u=UI.upd;
 let body=`<p class="subt" style="margin:0">Choose an update file (for example <b>dme-faculty-update-nov2026.json</b>). You will see every change before anything is saved. A value is only replaced if it has not been edited in the app since.</p>
 <label class="f">Update file<input type="file" id="upd-file" accept=".json,application/json"></label>`;
 if(u){const P=u.plan,row=x=>`<tr><td>${x.c.coll==="faculty"?'<span class="subt">Faculty</span> ':""}${esc(x.p?x.p.name:x.c.name)}</td><td>${UPD_L[x.c.field]||esc(x.c.field)}</td><td>${esc(x.c.from||"—")}</td><td><b>${esc(x.c.to)}</b></td><td class="subt">${esc(x.why||x.c.why||"")}</td></tr>`;
  body+=`<div class="status ${P.apply.length||P.add.length?"":"ok"}" style="display:block"><b>${esc(u.title)}</b>: ${P.apply.length} changes to make${P.add.length?`, ${P.add.length} new ${P.add[0].fac?"faculty member":"trainee"}${P.add.length>1?"s":""} to add`:""}. ${P.done.length} already done${P.clash.length?`, ${P.clash.length} skipped because the app has a newer value`:""}${P.dup.length?`, ${P.dup.length} ${P.dup[0].fac?"faculty member":"new trainee"}${P.dup.length>1?"s":""} already in the app`:""}.</div>
  ${P.apply.length||P.clash.length?`<div class="tblwrap" style="max-height:340px;overflow:auto"><table><thead><tr><th>Name</th><th>Detail</th><th>Now</th><th>Will become</th><th>Reason</th></tr></thead><tbody>${P.apply.map(row).join("")}${P.clash.map(x=>row(x).replace("<tr>",'<tr style="opacity:.6">')).join("")}</tbody></table></div>`:""}
  ${P.add.map(a=>a.fac?`<p style="margin:0">New faculty: <b>${esc(facName(a.fac))}</b>, ${esc(a.fac.desig)}, ${esc(a.fac.spec)}.</p>`:`<p style="margin:0">New: <b>Dr. ${esc(a.pgt.name)}</b>, ${esc(a.pgt.spec)}. Added to <b>New registrations</b> for you to verify.</p>`).join("")}
  <div style="display:flex;gap:8px;flex-wrap:wrap">${P.apply.length||P.add.length?`<button class="btn primary" data-act="upd-go">Apply ${P.apply.length+P.add.length} updates</button>`:""}<button class="btn" data-act="upd-x">Close</button></div>`}
 return`<div class="panel" id="set-upd" style="display:grid;gap:10px"><h3 style="margin:0">Apply an update file (trainees or faculty)</h3>${body}</div>`}
document.addEventListener("change",async e=>{if(e.target.id!=="upd-file"||!e.target.files[0])return;let j;
 try{j=JSON.parse(await e.target.files[0].text())}catch(x){toast("That file could not be read");return}
 if(j.kind==="dme-exam-results"){exrInit(j);e.target.value="";const y=window.scrollY;render();window.scrollTo(0,y);return}
 if(j.kind!=="dme-pgt-update"&&j.kind!=="dme-update"){toast("That is not a DME update file");return}
 UI.upd={title:j.title||"Update",j,plan:updPlan(j)};const y=window.scrollY;render();window.scrollTo(0,y)});
document.addEventListener("click",e=>{const a=e.target.closest("[data-act]");if(!a)return;
 if(a.dataset.act==="upd-x"){UI.upd=null;const y=window.scrollY;render();window.scrollTo(0,y)}
 if(a.dataset.act==="upd-go"&&UI.upd){const P=updPlan(UI.upd.j);let n=0;
  P.apply.forEach(({c,p})=>{if(c.field==="notes")p.notes=((p.notes||"")+" "+c.to.replace(p.notes||"","")).trim();else p[c.field]=c.to;n++});
  P.add.forEach(a=>{if(a.fac){const f={title:"Dr.",pmdc:"",regno:"",unit:"",cpsp:false,uhs:false,active:true,notes:"",...a.fac};f.id=DB.faculty.some(x=>x.id===f.id)||!f.id?uid("F"):f.id;
   if(f.spec&&!DB.specs.some(s=>s.name===f.spec))DB.specs.push({name:f.spec,rotational:false,rule:[2,3,.5,1.5,3],dur:{},title:"",level:"",councils:"",teaching:false,active:true});
   f.sups=[{spec:f.spec,cpsp:!!f.cpsp,uhs:!!f.uhs}];DB.faculty.push(f);log(`Added faculty member ${facName(f)} from ${UI.upd.title}`,"fac-"+f.id);n++;return}
   const r={...a.pgt};if(DB.pgts.some(x=>x.id===r.id))r.id=uid("P");if(DB.pgts.some(x=>x.code===r.code))r.code=nextCode(r);DB.pgts.push(r);
   DB.status.push({...a.status,id:uid("S"),pid:r.id});if(a.sup&&DB.faculty.some(f=>f.id===a.sup.fid))DB.sups.push({...a.sup,id:uid("V"),pid:r.id});n++});
  log(`${UI.upd.title}: ${P.apply.length} details updated${P.add.length?`, ${P.add.length} new trainee added for verification`:""}`);
  UI.upd=null;toast(`${n} updates applied`);const y=window.scrollY;render();window.scrollTo(0,y)}});

/* ---------- contact details in "Edit details" (hidden in the prototype) ---------- */
const CE_F=[["father","Father's name"],["cnic","CNIC","xxxxx-xxxxxxx-x"],["passport","Passport no.","foreign nationals"],["pmdc","PMDC no."],["mobile","Mobile","03xx-xxxxxxx"],["mobile2","Second mobile","optional"],["email","Email"],["emailAlt","Alternate email","optional"]];
function contactEditHtml(p,F=CE_F){if(!LIVE&&!p.cnic)return"";return`<div class="grid2">${F.map(([k,l,h])=>`<label class="f">${l}${h?` <span class="h">${h}</span>`:""}<input name="ce-${k}" value="${esc(p[k]||"")}"></label>`).join("")}</div>`}
function contactEditRead(p,F=CE_F,href){if(!document.querySelector('[name="ce-mobile"]'))return"";const g=k=>(document.querySelector(`[name="ce-${k}"]`)?.value||"").trim();
 const mob=v=>{let x=v.replace(/\D/g,"");if(x.startsWith("92"))x="0"+x.slice(2);if(x.length===10&&x[0]==="3")x="0"+x;return x.length===11?x.slice(0,4)+"-"+x.slice(4):v};
 for(const k of["mobile","mobile2"])if(g(k)&&mob(g(k)).length!==12)return"Enter mobile numbers as 03xx-xxxxxxx.";
 for(const k of["email","emailAlt"])if(g(k)&&!/^\S+@\S+\.\S+$/.test(g(k)))return"Check the email address.";
 const cn=g("cnic").replace(/\D/g,"");if(g("cnic")&&cn.length!==13&&!g("passport"))return F.some(x=>x[0]==="passport")?"A CNIC has 13 digits. For a foreign national, enter the passport number instead.":"A CNIC has 13 digits.";
 const v0={father:g("father"),cnic:cn.length===13?cn.replace(/^(\d{5})(\d{7})(\d)$/,"$1-$2-$3"):g("cnic"),passport:g("passport"),pmdc:g("pmdc").toUpperCase(),mobile:g("mobile")?mob(g("mobile")):"",mobile2:g("mobile2")?mob(g("mobile2")):"",email:g("email").toLowerCase(),emailAlt:g("emailAlt").toLowerCase()},v={};F.forEach(([k])=>v[k]=v0[k]);
 const ch=Object.keys(v).filter(k=>(p[k]||"")!==v[k]);ch.forEach(k=>{if(v[k])p[k]=v[k];else delete p[k]});
 if(ch.length)log(`Contact details of Dr. ${p.name} edited: ${ch.map(k=>CE_F.find(f=>f[0]===k)[1]).join(", ")}`,href||"pgt-"+p.id);return""}
