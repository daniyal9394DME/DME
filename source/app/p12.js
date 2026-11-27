
/* =====================================================================
   V9 · LIVE MODE: shared data in Supabase, sign-in, public form pages
   Prototype mode (no Supabase settings) keeps working exactly as before.
   ===================================================================== */
var SYNC={on:false};
/* Supabase settings: from config.js, or saved on this device from the setup screen */
const SUPA=(()=>{let c=window.DME_SUPABASE||{};if(!(c.url&&(c.anonKey||c.key))){try{const l=JSON.parse(localStorage.getItem("dme-supabase")||"null");if(l&&l.url&&l.anonKey)c=l}catch(e){}}
 const url=String(c.url||"").trim().replace(/\/+$/,"").replace(/\/(rest|auth)\/v1$/,""),key=String(c.anonKey||c.key||"").trim();return url&&key?{url,anonKey:key}:null})();
const LIVE=!!SUPA;
/* stable JSON: the database returns object keys in its own order, so compare with keys sorted */
const sj=v=>JSON.stringify(v,(k,x)=>x&&typeof x==="object"&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,q)=>(o[q]=x[q],o),{}):x);
const ARR_COLLS=["pgts","faculty","creds","status","rots","sups","leaves","workshops","tasks","exams","orients","conduct","audit","bin","events","visitors"];
const SUPA_JS="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js";
const pubBase=()=>location.origin+location.pathname;
function pubLink(kind,w){if(LIVE)return`${pubBase()}?${kind}=${encodeURIComponent(w.id)}`;return`https://dme.ric.example/${{reg:"register",fb:"feedback",prop:"proposal"}[kind]}/${w.id.toLowerCase()}`}

/* ---------- boot ---------- */
function atobSafe(k){try{return atob(String(k).split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))}catch(e){return""}}
function bootApp(){
 if(!LIVE&&!SEED.pgts.length){document.body.classList.add("solo");const c=window.DME_SUPABASE;
  const why=!c?"The file <b>config.js</b> was not found next to index.html. Upload config.js to the same place on GitHub.":!String(c.url||"").trim()?"<b>config.js</b> was found, but the Project URL in it is empty.":"<b>config.js</b> was found, but the key in it is empty.";
  document.getElementById("main").innerHTML=`<div class="panel solo-card"><h2>Connect to Supabase</h2><p>${why}</p>
  <p class="subt" style="margin:0">Fix it in GitHub: open <b>config.js</b> → pencil icon → paste the two values between the quotes → Commit changes. Or paste them below to connect this device now.</p>
  <form id="cfgf" style="display:grid;gap:10px" novalidate><label class="f">Project URL<input name="u" placeholder="https://abcdefgh.supabase.co" autocomplete="off"></label><label class="f">Publishable (anon) key<input name="k" placeholder="sb_publishable_… or eyJ…" autocomplete="off"></label>
  <div class="err" id="cfgerr" role="alert"></div><div class="actions"><button class="btn primary" type="submit">Connect</button></div></form></div>`;
  document.getElementById("cfgf").onsubmit=ev=>{ev.preventDefault();const u=ev.target.u.value.trim(),k=ev.target.k.value.trim(),er=document.getElementById("cfgerr");
   if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?/i.test(u))return er.textContent="The URL should look like https://abcdefgh.supabase.co (Project Settings → Data API).";
   if(/^sb_secret_/i.test(k)||/service_role/i.test(atobSafe(k)))return er.textContent="That is the secret key. Use the publishable (anon) key instead.";
   if(k.length<20)return er.textContent="Paste the whole key.";
   try{localStorage.setItem("dme-supabase",JSON.stringify({url:u,anonKey:k}))}catch(x){}location.reload()};return}
 if(!LIVE){if(!DB||!DB.pgts)DB=seed();if(migrate9(DB))persist();if(!DB.staff.some(s=>s.name===ME))ME=DB.staff[0].name;route=parse();render();return}
 document.body.classList.add("live");DB=null;try{localStorage.removeItem(KEY)}catch(e){}
 const q=new URLSearchParams(location.search);const pk=["reg","fb","prop","rot","obs","bio","att","sur"].find(k=>q.get(k));
 screen(`<p class="subt">Connecting…</p>`);
 loadScript(SUPA_JS).then(()=>{SYNC.sb=window.supabase.createClient(SUPA.url,SUPA.anonKey,{auth:{persistSession:true,detectSessionInUrl:true}});
  if(pk==="rot")return rotPublicPage();
  if(pk==="obs")return obsPublicPage();
  if(pk==="bio")return bioPublicPage(q.get("bio"));
  if(pk==="att")return attPublicPage(q.get("att"));
  if(pk==="sur")return surPublicPage();
  if(pk)return publicPage(pk,q.get(pk));
  SYNC.sb.auth.onAuthStateChange((ev,ses)=>{if(ev==="PASSWORD_RECOVERY")return setPasswordScreen(true);if(ev==="SIGNED_OUT"){location.hash="";location.reload()}});
  return SYNC.sb.auth.getSession().then(({data})=>data.session?afterLogin(data.session):loginScreen())}).catch(e=>screen(`<h2>Cannot connect</h2><p>${esc(e.message||e)}</p><p class="subt">Check the internet connection and reload the page.</p>${localStorage.getItem("dme-supabase")?`<div class="actions"><button class="btn" onclick="localStorage.removeItem('dme-supabase');location.reload()">Change the Supabase settings</button></div>`:""}`))}
function loadScript(src){return new Promise((ok,no)=>{if([...document.scripts].some(s=>s.src===src&&s.dataset.ok))return ok();const s=document.createElement("script");s.src=src;s.onload=()=>{s.dataset.ok=1;ok()};s.onerror=()=>no(new Error("Could not load "+src));document.head.append(s)})}
function screen(html){document.body.classList.add("solo");document.getElementById("main").innerHTML=`<div class="panel solo-card">${html}</div>`;const n=document.getElementById("nav");if(n)n.innerHTML="";const u=document.getElementById("userbox");if(u)u.innerHTML=""}

/* ---------- sign in ---------- */
function loginScreen(msg){screen(`<h2>Sign in</h2><p class="subt" style="margin-top:0">DME Office · Rawalpindi Institute of Cardiology</p>
 <form id="loginf" style="display:grid;gap:12px" novalidate><label class="f">Email<input type="email" name="e" autocomplete="username" required></label><label class="f">Password<input type="password" name="p" autocomplete="current-password" required></label>
 <div class="err" id="loginerr" role="alert">${esc(msg||"")}</div><div class="actions"><button class="btn primary" type="submit">Sign in</button><button class="btn link" type="button" data-act="lg-forgot">Forgot password?</button></div></form>
 <p class="subt" style="margin:4px 0 0">First time here? <button class="btn link" type="button" data-act="lg-join">Set up your login with your invite code</button></p>`);
 document.getElementById("loginf").onsubmit=async ev=>{ev.preventDefault();const f=ev.target,er=document.getElementById("loginerr");er.textContent="";f.querySelector("button").disabled=true;
  const{data,error}=await SYNC.sb.auth.signInWithPassword({email:f.e.value.trim(),password:f.p.value});f.querySelector("button").disabled=false;
  if(error){er.textContent=error.message==="Invalid login credentials"?"Email or password is not correct.":error.message;return}afterLogin(data.session)}}
function joinScreen(){screen(`<h2>Set up your login</h2><p class="subt" style="margin-top:0">Use the email the Director added for you and the invite code they gave you.</p>
 <form id="joinf" style="display:grid;gap:12px" novalidate><label class="f">Email<input type="email" name="e" autocomplete="username"></label><label class="f">Invite code<input name="c" autocomplete="off" style="text-transform:uppercase;letter-spacing:2px"></label>
 <label class="f">Choose a password <span class="h">at least 8 characters</span><input type="password" name="p" autocomplete="new-password"></label><label class="f">Type it again<input type="password" name="p2" autocomplete="new-password"></label>
 <div class="err" id="joinerr" role="alert"></div><div class="actions"><button class="btn primary" type="submit">Create my login</button><button class="btn link" type="button" data-act="lg-back">Back to sign in</button></div></form>`);
 document.getElementById("joinf").onsubmit=async ev=>{ev.preventDefault();const f=ev.target,er=document.getElementById("joinerr"),em=f.e.value.trim().toLowerCase(),code=f.c.value.trim().toUpperCase();er.textContent="";
  if(!em.includes("@"))return er.textContent="Enter your email.";if(code.length<4)return er.textContent="Enter the invite code from the Director.";if(f.p.value.length<8)return er.textContent="Use at least 8 characters.";if(f.p.value!==f.p2.value)return er.textContent="The two passwords are different.";
  f.querySelector("button").disabled=true;let{data,error}=await SYNC.sb.auth.signUp({email:em,password:f.p.value,options:{emailRedirectTo:pubBase()}});
  if(error&&/registered|exists/i.test(error.message)){({data,error}=await SYNC.sb.auth.signInWithPassword({email:em,password:f.p.value}));if(error){f.querySelector("button").disabled=false;return er.textContent="A login for this email already exists. Sign in with its password, or ask the Director to reset it."}}
  f.querySelector("button").disabled=false;if(error)return er.textContent=error.message;
  if(!data.session)return screen(`<h2>Check your email</h2><p>Open the confirmation link sent to ${esc(em)}, then sign in and enter the invite code.</p><div class="actions"><button class="btn" data-act="lg-back">Back to sign in</button></div>`);
  afterLogin(data.session,code)}}
function codeScreen(wrong){screen(`<h2>Enter your invite code</h2><p class="subt" style="margin-top:0">${esc(SYNC.email)} is on the DME team. Enter the code the Director gave you to link this login.</p>
 <form id="codef" style="display:grid;gap:12px" novalidate><label class="f">Invite code<input name="c" autocomplete="off" style="text-transform:uppercase;letter-spacing:2px"></label><div class="err" role="alert">${wrong?"That code is not right. Check it with the Director.":""}</div>
 <div class="actions"><button class="btn primary" type="submit">Continue</button><button class="btn" type="button" data-act="lg-out">Sign out</button></div></form>`);
 document.getElementById("codef").onsubmit=async ev=>{ev.preventDefault();const{data}=await SYNC.sb.auth.getSession();if(data.session)afterLogin(data.session,ev.target.c.value.trim().toUpperCase())}}
function setPasswordScreen(recovery){screen(`<h2>${recovery?"Choose a new password":"Change password"}</h2><form id="pwf" style="display:grid;gap:12px" novalidate><label class="f">New password <span class="h">at least 8 characters</span><input type="password" name="p" autocomplete="new-password"></label><label class="f">Type it again<input type="password" name="p2" autocomplete="new-password"></label><div class="err" id="pwerr" role="alert"></div><div class="actions"><button class="btn primary" type="submit">Save password</button>${recovery?"":`<button class="btn" type="button" data-act="lg-cancelpw">Cancel</button>`}</div></form>`);
 document.getElementById("pwf").onsubmit=async ev=>{ev.preventDefault();const f=ev.target,er=document.getElementById("pwerr");if(f.p.value.length<8)return er.textContent="Use at least 8 characters.";if(f.p.value!==f.p2.value)return er.textContent="The two passwords are different.";
  const{error}=await SYNC.sb.auth.updateUser({password:f.p.value});if(error)return er.textContent=error.message;toast("Password saved");const{data}=await SYNC.sb.auth.getSession();if(DB){document.body.classList.remove("solo");render()}else if(data.session)afterLogin(data.session)}}
document.addEventListener("click",async e=>{const b=e.target.closest("button");if(!b||!LIVE)return;const a=b.dataset.act;
 if(a==="lg-forgot"){const em=(document.querySelector('#loginf [name="e"]')?.value||"").trim();const er=document.getElementById("loginerr");if(!em.includes("@")){er.textContent="Type your email above first.";return}
  const{error}=await SYNC.sb.auth.resetPasswordForEmail(em,{redirectTo:pubBase()});er.textContent=error?error.message:"If this email is on the DME team, a link to set a new password has been sent.";return}
 if(a==="lg-out"){if(SYNC.pending){toast("Saving your last change first…");await syncPush()}await SYNC.sb.auth.signOut();return}
 if(a==="lg-pw")return setPasswordScreen(false);
 if(a==="lg-join")return joinScreen();
 if(a==="lg-back")return loginScreen();
 if(a==="lg-cancelpw"){document.body.classList.remove("solo");render();return}
 if(a==="sy-retry"){syncPush();return}
 if(a==="sy-refresh"){SYNC.stale=false;render();return}
 if(a==="doc-open"){openStored(b.dataset.path);return}
 if(a==="setup-load")return firstSetup(b);
 if(a==="pgt-copy"){const v=document.getElementById("pgtlink").value;try{await navigator.clipboard.writeText(v);toast("Link copied")}catch(err){document.getElementById("pgtlink").select()}return}});

/* ---------- after sign in: load everything ---------- */
async function afterLogin(ses,code){SYNC.email=(ses.user.email||"").toLowerCase();screen(`<p class="subt">Loading the DME records…</p>`);
 const{data:cl,error:ce}=await SYNC.sb.rpc("dme_claim",{p_code:code||""});
 if(ce)return screen(`<h2>Cannot sign in</h2><p>${esc(ce.message)}</p><div class="actions"><button class="btn" data-act="lg-out">Sign out</button></div>`);
 if(cl&&cl.error==="not_staff")return screen(`<h2>No access yet</h2><p>${esc(SYNC.email)} is not on the DME team list. Ask the Director of Medical Education to add this email under Settings → DME team.</p><div class="actions"><button class="btn" data-act="lg-out">Sign out</button></div>`);
 if(cl&&cl.error==="claimed")return screen(`<h2>Login already linked</h2><p>This email is already linked to another login. Ask the Director for a new invite code.</p><div class="actions"><button class="btn" data-act="lg-out">Sign out</button></div>`);
 if(cl&&cl.error==="bad_code")return codeScreen(!!code);
 const{data:me,error:e1}=await SYNC.sb.from("dme_staff").select("*").eq("email",SYNC.email).maybeSingle();
 if(e1)return screen(`<h2>Cannot load</h2><p>${esc(e1.message)}</p>`);
 if(!me||!me.active)return screen(`<h2>No access yet</h2><p>${esc(SYNC.email)} is not on the DME team list. Ask the Director of Medical Education to add this email under Settings → DME team.</p><div class="actions"><button class="btn" data-act="lg-out">Sign out</button></div>`);
 SYNC.role=me.role;let rows;try{rows=await pullAll()}catch(err){return screen(`<h2>Cannot load</h2><p>${esc(err.message||err)}</p>`)}
 if(!rows.length){if(me.role!=="Admin")return screen(`<h2>Not set up yet</h2><p>The database is empty. The Director needs to sign in once to load the RIC records.</p><div class="actions"><button class="btn" data-act="lg-out">Sign out</button></div>`);
  return screen(`<h2>Set up the DME database</h2><p>This loads the records already in the prototype into Supabase:</p><ul><li>127 PGTs, 63 faculty and their credentials, rotations, supervisors and status history</li><li>The workshop calendar (placeholder months) and the Research Bootcamp series</li><li>The June 2026 Cardiac Surgery results and the Nov/Dec 2026 exam plan</li><li>Settings: specialties, rotation sites, leave types, reasons for leaving</li></ul><p>Example items (the sample workshop, sample tasks and the two example registrations) are left out. You are added as the only team member; add the others in Settings → DME team.</p>${SEED.pgts.length?"":`<label class="f">Initial data file <span class="h">dme-initial-data.json, sent with these instructions</span><input type="file" id="setupfile" accept=".json,application/json"></label>`}<div class="actions"><button class="btn primary" data-act="setup-load">Load the RIC records</button><button class="btn" data-act="lg-out">Sign out</button></div><p class="status" id="setupst"></p>`)}
 DB=rowsToDb(rows);const ch=migrate9(DB);regAll();startLive(me);if(ch)persist()}
async function firstSetup(b){const st=document.getElementById("setupst");
 if(!SEED.pgts.length){const f=document.getElementById("setupfile")?.files[0];if(!f){st.textContent="Choose the file dme-initial-data.json first.";return}
  try{const j=JSON.parse(await f.text());if(!j.seed||!Array.isArray(j.seed.pgts)||!j.seed.pgts.length)throw 0;Object.assign(SEED,j.seed);SAMPLE_RESULTS.splice(0,SAMPLE_RESULTS.length,...(j.sample||[]))}catch(e){st.textContent="That is not the DME initial data file.";return}}
 b.disabled=true;st.textContent="Preparing…";
 DB=seed();stripExamples(DB);migrate9(DB);const nm=(DB.staff.find(s=>s.me)||{}).name||"Dr. Daniyal Ahmad Kamal";
 DB.staff=[{name:nm,desig:"Director of Medical Education",email:SYNC.email,role:"Admin",seeAll:true,conduct:true,sections:[],me:true}];
 DB.audit=[{id:uid("A"),at:new Date().toISOString(),by:nm,what:"DME database set up from the prototype records (127 PGTs, 63 faculty, workshop calendar, exams).",ref:""}];
 SYNC.snap={};st.textContent="Uploading…";try{await syncPush(true,(k,n)=>{st.textContent=`Uploading ${k} of ${n} records…`})}catch(e){st.textContent="Upload failed: "+(e.message||e);b.disabled=false;return}
 const{data:me}=await SYNC.sb.from("dme_staff").select("*").eq("email",SYNC.email).maybeSingle();startLive(me||{role:"Admin"});toast("Database set up")}
function stripExamples(d){const ex=new Set(d.pgts.filter(p=>p.example).map(p=>p.id));d.pgts=d.pgts.filter(p=>!ex.has(p.id));["status","rots","sups","leaves"].forEach(k=>d[k]=d[k].filter(x=>!ex.has(x.pid)));
 d.workshops=d.workshops.filter(w=>!w.example);d.tasks=[];d.conduct=[];d.orients.forEach(o=>{o.log=[]})}
function startLive(me){SYNC.on=true;SYNC.role=me.role;document.body.classList.remove("solo");
 const st=DB.staff.find(s=>(s.email||"").toLowerCase()===SYNC.email);ME=st?st.name:(me.name||SYNC.email);
 if(!st)DB.staff.push({name:ME,desig:"",email:SYNC.email,role:me.role,seeAll:me.role==="Admin",sections:[]});
 route=parse();render();refreshStaffRows();clearInterval(SYNC.timer);SYNC.timer=setInterval(syncPull,15000);window.addEventListener("focus",()=>syncPull())}
const regAll=()=>DB.workshops.forEach(w=>{try{regSync(w)}catch(e){}});

/* ---------- rows ⇄ DB ---------- */
function dbRows(){const out=[];Object.keys(DB).forEach(k=>{const v=DB[k];
 if(ARR_COLLS.includes(k)){(v||[]).forEach((x,i)=>{if(!x.id)x.id=uid(k==="audit"?"A":"X");out.push({coll:k,id:String(x.id),ord:k==="audit"?0:i,data:x})})}
 else out.push({coll:"meta",id:k,ord:0,data:v})});return out}
function rowsToDb(rows){const d={};ARR_COLLS.forEach(k=>d[k]=[]);const ord={};SYNC.snap={};
 rows.forEach(r=>{if(r.deleted)return;SYNC.snap[r.coll+"|"+r.id]=sj([r.ord,r.data]);if(r.coll==="meta")d[r.id]=r.data;else{(d[r.coll]=d[r.coll]||[]).push(r.data);ord[r.coll+"|"+r.id]=r.ord}});
 ARR_COLLS.forEach(k=>{if(k==="audit")d.audit.sort((a,b)=>(b.at||"")<(a.at||"")?-1:1);else d[k].sort((a,b)=>(ord[k+"|"+a.id]||0)-(ord[k+"|"+b.id]||0))});
 SYNC.last=rows.reduce((m,r)=>r.updated_at>m?r.updated_at:m,"");return d}
async function pullAll(){const all=[];for(let from=0;;from+=1000){const{data,error}=await SYNC.sb.from("dme_records").select("coll,id,ord,data,deleted,updated_at").order("coll").order("id").range(from,from+999);if(error)throw error;all.push(...data);if(data.length<1000)break}return all}

/* ---------- saving ---------- */
SYNC.dirty=()=>{SYNC.pending=true;syncBadge();clearTimeout(SYNC.t);SYNC.t=setTimeout(()=>syncPush(),700)};
async function syncPush(all,prog){if(SYNC.busy){SYNC.again=true;return}SYNC.busy=true;clearTimeout(SYNC.t);
 try{const rows=dbRows(),seen=new Set(),up=[];rows.forEach(r=>{const k=r.coll+"|"+r.id;seen.add(k);const j=sj([r.ord,r.data]);if(all||SYNC.snap[k]!==j)up.push({...r,deleted:false,_j:j})});
  Object.keys(SYNC.snap).forEach(k=>{if(!seen.has(k)){const[coll,...id]=k.split("|");up.push({coll,id:id.join("|"),ord:0,data:null,deleted:true,_j:null})}});
  for(let i=0;i<up.length;i+=200){const part=up.slice(i,i+200);if(prog)prog(Math.min(i+200,up.length),up.length);
   const{error}=await SYNC.sb.from("dme_records").upsert(part.map(({_j,...r})=>r),{onConflict:"coll,id"});if(error)throw error;
   part.forEach(r=>{const k=r.coll+"|"+r.id;if(r.deleted)delete SYNC.snap[k];else SYNC.snap[k]=r._j})}
  SYNC.pending=false;SYNC.err=null}
 catch(e){SYNC.err=e.code==="42501"||/row-level security/i.test(e.message||"")?"view":(e.message||String(e));if(all)throw e}
 finally{SYNC.busy=false;syncBadge();if(SYNC.again){SYNC.again=false;syncPush()}}
 if(SYNC.err==="view"){toast(SYNC.role==="Viewer"?"You have view-only access. That change was not saved.":"You don't have permission for that change. It was not saved.");SYNC.pending=false;const rows=await pullAll();DB=rowsToDb(rows);regAll();render()}}
window.addEventListener("beforeunload",e=>{if(SYNC.on&&SYNC.pending){syncPush();e.preventDefault();e.returnValue=""}});

/* ---------- picking up other people's changes ---------- */
async function syncPull(){if(!SYNC.on||SYNC.busy||document.hidden)return;
 const since=SYNC.last?new Date(new Date(SYNC.last).getTime()-15000).toISOString():"1970-01-01";
 const{data,error}=await SYNC.sb.from("dme_records").select("coll,id,ord,data,deleted,updated_at").gt("updated_at",since).order("updated_at").limit(1000);
 if(error){SYNC.err=error.message;syncBadge();return}if(SYNC.err&&SYNC.err!=="view"&&!SYNC.pending){SYNC.err=null;syncBadge()}
 const local=new Map(dbRows().map(r=>[r.coll+"|"+r.id,sj([r.ord,r.data])]));let changed=0;
 data.forEach(r=>{if(r.updated_at>SYNC.last)SYNC.last=r.updated_at;const k=r.coll+"|"+r.id,j=r.deleted?null:sj([r.ord,r.data]);
  if(j===SYNC.snap[k]||(j===null&&!(k in SYNC.snap)))return;
  if(local.has(k)&&local.get(k)!==SYNC.snap[k])return; /* you changed this record and it is about to be saved */
  applyRow(r);if(j===null)delete SYNC.snap[k];else SYNC.snap[k]=j;changed++});
 if(!changed)return;regAll();
 const busy=document.getElementById("overlay").innerHTML||(document.activeElement&&document.activeElement.closest&&document.activeElement.closest("main input,main textarea,main select"));
 if(busy){SYNC.stale=true;syncBadge()}else render()}
function applyRow(r){if(r.coll==="meta"){if(!r.deleted)DB[r.id]=r.data;return}const arr=DB[r.coll]=DB[r.coll]||[];const i=arr.findIndex(x=>String(x.id)===r.id);
 if(r.deleted){if(i>=0)arr.splice(i,1);return}if(i>=0)arr[i]=r.data;else if(r.coll==="audit")arr.unshift(r.data);else arr.push(r.data)}

/* ---------- status in the top bar ---------- */
function syncBadge(){const el=document.getElementById("syncst");if(!el)return;
 el.innerHTML=SYNC.err&&SYNC.err!=="view"?`<span class="sy bad">Not saved · <button class="btn link" data-act="sy-retry">Try again</button></span>`:SYNC.pending||SYNC.busy?`<span class="sy">Saving…</span>`:SYNC.stale?`<span class="sy">Others made changes · <button class="btn link" data-act="sy-refresh">Show</button></span>`:`<span class="sy ok">All changes saved</span>`}
function renderChrome(cur){
 const late=visibleTasks().filter(tOverdue).length,pend=DB.pgts.filter(p=>p.reg==="Pending").length,wa=DB.workshops.filter(w=>wsFlags(w).length).length;
 const dcn=canSee("pgts")?dcIssues().filter(x=>x.k!=="contact").length:0;const badge={datacheck:dcn?[dcn,""]:null,tasks:late?[late,"late"]:null,verify:pend?[pend,""]:null,workshops:wa?[wa,""]:null,rotating:(n=>n?[n,""]:null)(typeof visList==="function"?visList().filter(v=>v.src==="form"&&!v.checked&&v.kind!=="obs").length:0),observers:(n=>n?[n,""]:null)(typeof obsAlertCount==="function"?obsAlertCount():0)};
 let g=null,h="";NAVG.filter(n=>canSee(n[1])).forEach(([grp,k,l])=>{if(grp!==g){h+=grp?`<div class="ng">${grp}</div>`:"";g=grp}
  h+=`<a href="#${k}" ${k===cur?'aria-current="page"':""} title="${l}"><span class="ni" aria-hidden="true">${NAV_ICON[k]||""}</span><span class="nl">${l}</span>${badge[k]?`<span class="cnt ${badge[k][1]}">${badge[k][0]}</span>`:""}</a>`});
 document.getElementById("nav").innerHTML=h;const m=meObj();
 document.getElementById("userbox").innerHTML=LIVE?`<button class="avbtn" data-act="usermenu" aria-label="Account: ${esc(ME)}" aria-expanded="false">${esc((w=>(w[0][0]+(w.length>1?w[w.length-1][0]:"")).toUpperCase())(String(ME).replace(/^(prof\.?\s*)?(dr\.?\s*)?/i,"").trim().split(/\s+/)))}</button><div class="whobox"><span class="live" id="syncst"></span><b>${esc(ME)}</b><span class="live"><span class="hide-sm">${esc(m.desig||m.role||SYNC.role)}${SYNC.role==="Viewer"?" · view only":""} · </span><button class="btn link" data-act="lg-pw">Password</button> · <button class="btn link" data-act="lg-out">Sign out</button></span></div>`
  :`<label class="whobox"><span class="s">Signed in as · prototype switch</span><select id="whoami" aria-label="Signed in as">${DB.staff.map(s=>`<option ${s.name===ME?"selected":""}>${esc(s.name)}</option>`).join("")}</select><span class="s">${esc(m.desig||m.role)}${seeAll()&&!isAdmin()?" · sees all tasks":""}</span></label>`;
 if(LIVE)syncBadge();
 const cl=NAVG.find(n=>n[1]===cur);document.getElementById("crumb").textContent=cl?cl[2]:""}

/* ---------- stored files (PGT documents, receipts) ---------- */
async function openStored(path){if(!LIVE||!path){toast("Files open in the live app");return}const w=window.open("","_blank");
 const{data,error}=await SYNC.sb.storage.from("dme-uploads").createSignedUrl(path,300);if(error||!data){if(w)w.close();toast("Could not open the file");return}if(w)w.location=data.signedUrl;else location.href=data.signedUrl}
const DOC_L=[["photo","Photo"],["cnic","CNIC copy"],["pmdc","PMDC copy"],["joining","Joining letter"],["passport","Passport copy"]];
function docsHtml(p){return DOC_L.filter(([k])=>(k!=="passport"||(p.docs&&p.docs.passport))&&(k!=="rtmc"||!/UHS/i.test(p.program||"")||(p.docs&&p.docs.rtmc))).map(([k,l])=>{const path=p.docs&&p.docs[k];return`<div class="doc"><b>${l}</b>${path?`<button class="btn link" data-act="doc-open" data-path="${esc(path)}">Open</button>`:p.example?"Uploaded":["rtmc","acls","bls"].includes(k)?`Not on file<span class="subt" style="display:block;font-size:12px">${p.survey?"not uploaded in the status form":"status form not sent yet"}</span>`:"Not on file"}</div>`}).join("")}
function personalHtml(p){const v=x=>x?esc(x):'<span class="subt">not recorded</span>';if(!LIVE&&!p.cnic){const h='<dd class="masked">hidden in prototype</dd>';return["Father's name","CNIC","PMDC","Mobile","Email"].map(t=>`<dt>${t}</dt>${h}`).join("")}
 return`<dt>Father's name</dt><dd>${v(p.father)}</dd><dt>CNIC</dt><dd>${v(p.cnic)}</dd><dt>PMDC</dt><dd>${v(p.pmdc)}</dd><dt>Mobile</dt><dd>${v([p.mobile,p.mobile2].filter(Boolean).join(" · "))}</dd><dt>Email</dt><dd>${v([p.email,p.emailAlt].filter(Boolean).join(" · "))}</dd>${p.passport?`<dt>Passport</dt><dd>${esc(p.passport)}</dd>`:""}`}

/* =====================================================================
   PUBLIC PAGES (registration, feedback, proposal) — no sign-in
   ===================================================================== */
let PUB=null;
async function publicPage(kind,id){document.body.classList.add("public");
 const{data,error}=await SYNC.sb.rpc("dme_public_form",{p_kind:kind,p_id:id});
 if(error||!data||data.error)return screen(`<h2>Form not found</h2><p>Check the link, or contact the DME office.</p>`);
 PUB={kind,w:data.w};pbUpgrade(PUB.w);DB={faculty:data.faculty||[],specs:data.specs||[],settings:data.settings||{},workshops:[data.w],pgts:[],staff:[],tasks:[],leaves:[],status:[],sups:[],rots:[],exams:[]};
 pubRender()}
function pubShell(inner){document.body.classList.add("solo");document.getElementById("main").innerHTML=inner}
function pubRender(done){const w=PUB.w,k=PUB.kind;const head=(t,s)=>formHead(w,t,s);
 if(k==="reg"){const pay=w.fee&&w.payMode!=="free",left=(w.seats||0)-(w.held||0),full=left<=0;
  if(done)return pubShell(`<div class="panel fbform"><h2>${done.status==="Waiting list"?"You are on the waiting list":done.status==="Confirmed"?"Registration confirmed":"Registration received"}</h2><p>${done.status==="Waiting list"?`All seats for <b>${esc(w.title)}</b> are taken. You are number ${done.position} on the waiting list; the DME office will contact you if a seat opens.`:done.status==="Confirmed"?`Your seat for <b>${esc(w.title)}</b>${w.date?" on "+fd(w.date):""} is confirmed.`:done.status==="Payment to verify"?`Your seat is held while the DME office verifies your payment. You will receive a confirmation.`:`Your seat is held until ${fdt(done.holdUntil)}. Pay ${money(w.fee)}${w.payInfo?` to ${esc(w.payInfo)}`:""} and send the receipt to the DME office before then.`}</p><p class="subt">You can close this page.</p></div>`);
  if(!w.regOpen||(w.date&&w.date<iso(TODAY)))return pubShell(`<div class="panel fbform">${head(w.title,"Registration")}<p>Registration is ${w.date&&w.date<iso(TODAY)?"closed":"not open"}.</p></div>`);
  return pubShell(`<form class="panel fbform" id="rgform" novalidate>${head("Registration: "+w.title,`${w.date?fd(w.date):"Date to be announced"} · ${esc(w.venue||"RIC")}${w.fee?` · Fee ${money(w.fee)}`:" · Free"}`)}
   ${w.regDesc?`<p style="margin:0;white-space:pre-line">${esc(w.regDesc)}</p>`:""}
   ${full?`<div class="flag">All seats are taken. You can still register for the waiting list.</div>`:`<div class="flag info">${left} of ${w.seats} seats left</div>`}
   ${formHtml(w.rgq,{},"rg-",false)}
   ${pay&&!full&&w.payMode==="proof"?`<fieldset class="pfsec"><legend>Payment</legend><p class="qd" style="margin:0">Pay ${money(w.fee)} first, then enter the details below. ${w.payInfo?`<br><b>${esc(w.payInfo)}</b>`:""}</p><div class="q"><div class="qt"><span class="req">Transaction ID / reference number</span></div><input name="rg-txn" placeholder="From your bank or wallet receipt"></div><div class="q"><div class="qt"><span class="req">Photo or screenshot of the receipt</span></div><input type="file" name="rg-rcpt" accept="image/*,application/pdf"></div></fieldset>`:""}
   ${pay&&!full&&w.payMode==="hold"?`<div class="flag info">Your seat will be held for ${w.holdHours||48} hours. Pay ${money(w.fee)}${w.payInfo?` to ${esc(w.payInfo)}`:""} and send the receipt to the DME office before then.</div>`:""}
   <div class="err" id="rgerr" role="alert"></div><button class="btn primary" type="button" data-act="pub-reg" style="justify-self:start">${full?"Join the waiting list":"Register"}</button></form>`)}
 if(k==="fb"){if(done)return pubShell(`<div class="panel fbform"><h2>Thank you</h2><p>Your feedback for <b>${esc(w.title)}</b> has been recorded.</p></div>`);
  if(!w.fbOpen)return pubShell(`<div class="panel fbform">${head(w.title,"Workshop feedback")}<p>This feedback form is closed.</p></div>`);
  return pubShell(`<form class="panel fbform" id="fbform" novalidate>${head(w.title,`${w.date?fd(w.date):""} · Workshop feedback · anonymous`)}${formHtml(w.fbq,{},"fb-",false)}<div class="err" id="fberr" role="alert"></div><button class="btn primary" type="button" data-act="pub-fb" style="justify-self:start">Submit feedback</button></form>`)}
 if(k==="prop"){if(done)return pubShell(`<div class="panel fbform"><h2>Proposal submitted</h2><p>The DME office has received the proposal for <b>${esc(w.title)}</b>. They will review it and confirm the final details.</p></div>`);
  if(w.stage>=3)return pubShell(`<div class="panel fbform">${head(w.title,"Workshop proposal")}<p>This proposal has been approved. Contact the DME office for any change.</p></div>`);
  const fnames=DB.faculty.map(facName);const pre={title:w.title,dept:w.dept,focal:fnames.includes(w.focal)?w.focal:"",director:fnames.includes(w.director)?w.director:""};
  return pubShell(`<form class="panel fbform" id="pfform" novalidate>${head("Workshop proposal",`Form RIC/ME&amp;T/F-06 · calendar slot ${mLabel(w.month)} · submit at least ${DB.settings.proposal_weeks||8} weeks before`)}${w.returned?`<div class="flag">Returned by the DME office: ${esc(w.returned)}</div>`:""}${formHtml(w.pfq,pre,"pf-",false)}
   <label class="check2"><input type="checkbox" id="pf-decl"> The Head of Department has been informed and supports this workshop. The information is accurate.</label><div class="err" id="pferr" role="alert"></div><button class="btn primary" type="button" data-act="pub-prop" style="justify-self:start">Submit proposal</button></form>`)}}
document.addEventListener("click",async e=>{const b=e.target.closest("button");if(!b||!PUB)return;const a=b.dataset.act;if(!a||!a.startsWith("pub-"))return;const w=PUB.w;
 const busy=on=>{b.disabled=on;b.dataset.l=b.dataset.l||b.textContent;b.textContent=on?"Sending…":b.dataset.l};
 if(a==="pub-reg"){const fm=document.getElementById("rgform"),er=document.getElementById("rgerr");const{vals:v,missing}=formRead(fm,w.rgq,"rg-");
  if(missing.length){er.textContent="Please answer: "+missing.map(q=>q.t).join("; ");return}
  if(v.mobile&&!/^(\+92|0)3\d{2}-?\d{7}$/.test(v.mobile.replace(/\s/g,""))){er.textContent="Enter the mobile as 03xx-xxxxxxx.";return}
  if(v.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)){er.textContent="Check the email address.";return}
  let txn=null,path=null;const tEl=fm.querySelector('[name="rg-txn"]');
  if(tEl){txn=tEl.value.trim();const f=fm.querySelector('[name="rg-rcpt"]').files[0];if(txn.length<5){er.textContent="Enter the transaction ID from your payment receipt.";return}if(!f){er.textContent="Attach a photo or screenshot of the payment receipt.";return}
   if(f.size>5*1024*1024){er.textContent="The receipt file is larger than 5 MB.";return}busy(true);
   path=`receipts/${w.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${(f.name.split(".").pop()||"jpg").toLowerCase()}`;
   const{error}=await SYNC.sb.storage.from("dme-uploads").upload(path,f,{contentType:f.type||undefined});if(error){busy(false);er.textContent="The receipt could not be uploaded. Try again.";return}}
  busy(true);const{data,error}=await SYNC.sb.rpc("dme_submit_reg",{p_id:w.id,p_answers:v,p_txn:txn,p_receipt:path});busy(false);
  if(error||!data){er.textContent="Could not send. Check the connection and try again.";return}
  if(data.error){er.textContent={duplicate:"This mobile number or email is already registered for this workshop.",txn_used:"This transaction ID has already been used.",closed:"Registration has just closed.",payment_required:"Enter the transaction ID and attach the receipt.",not_found:"This workshop was not found."}[data.error]||"Could not register.";return}
  pubRender(data);window.scrollTo(0,0);return}
 if(a==="pub-fb"){const fm=document.getElementById("fbform");const{vals,missing}=formRead(fm,w.fbq,"fb-");if(missing.length){document.getElementById("fberr").textContent="Please answer: "+missing.map(q=>q.t).join("; ");return}
  busy(true);const{data,error}=await SYNC.sb.rpc("dme_submit_fb",{p_id:w.id,p_answers:vals});busy(false);if(error||!data||data.error){document.getElementById("fberr").textContent=data?.error==="closed"?"This feedback form has closed.":"Could not send. Try again.";return}pubRender({ok:1});window.scrollTo(0,0);return}
 if(a==="pub-prop"){const fm=document.getElementById("pfform"),er=document.getElementById("pferr");const{vals:v,missing}=formRead(fm,w.pfq,"pf-");
  if(missing.length){er.textContent="Still needed: "+missing.map(q=>q.t).join("; ");return}
  if(v.focalMobile&&!/^03\d{2}-?\d{7}$/.test(v.focalMobile)){er.textContent="Mobile must be 11 digits starting with 03.";return}
  if(v.seats!==""&&v.seats!=null&&!(+v.seats>0)){er.textContent="Maximum seats must be more than 0.";return}
  if(v.date&&!v.date.startsWith(w.month)&&!er.dataset.warned){er.dataset.warned="1";er.textContent=`The proposed date is outside the calendar month (${mLabel(w.month)}). Submit again to send it anyway.`;return}
  if(!document.getElementById("pf-decl").checked){er.textContent="Tick the declaration to submit.";return}
  busy(true);const{data,error}=await SYNC.sb.rpc("dme_submit_prop",{p_id:w.id,p_values:v});busy(false);
  if(error||!data||data.error){er.textContent=data?.error==="approved"?"This proposal has already been approved.":"Could not send. Try again.";return}pubRender({ok:1});window.scrollTo(0,0)}});
