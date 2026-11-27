
/* =====================================================================
   V29 · OMR SCANNING: upload the scanned PDF (or photos), read every
   sheet in the browser, review only what is doubtful, then put the
   marks into the exam. Images are kept on the live app for appeals.
   ===================================================================== */
const OMR_PDFJS="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",OMR_PDFW="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",OMR_JSQR="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
const omrLoad=src=>new Promise((ok,no)=>{if([...document.scripts].some(s=>s.src===src&&s.dataset.ok))return ok();const s=document.createElement("script");s.src=src;s.onload=()=>{s.dataset.ok=1;ok()};s.onerror=()=>no(new Error("Could not load the scanning tools. Check the internet connection."));document.head.append(s)});
UI.omrImg=UI.omrImg||{};UI.omrRun=null;UI.omrTab="review";
const omrScans=x=>(omrOf(x).scans=omrOf(x).scans||[]);
const omrSpecBySid=(x,sid)=>Object.entries(omrOf(x).specs).find(([,s])=>s.sid===sid)?.[0]||"";
const omrCfgOf=(x,sp)=>{const s=omrSpec(x,sp);return s?{n:s.n,opts:s.opts,sections:s.sections,spec:sp,exam:x.title,session:x.session}:null};

/* ---------- reading ---------- */
function omrGray(canvas){const g=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data,d=new Uint8Array(canvas.width*canvas.height);for(let i=0,j=0;j<d.length;i+=4,j++)d[j]=(g[i]*299+g[i+1]*587+g[i+2]*114)/1000;return{w:canvas.width,h:canvas.height,d}}
async function omrPages(files,onPage){let n=0;
 for(const f of files){if(/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name)){await omrLoad(OMR_PDFJS);pdfjsLib.GlobalWorkerOptions.workerSrc=OMR_PDFW;const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;
   for(let p=1;p<=pdf.numPages;p++){const pg=await pdf.getPage(p),v0=pg.getViewport({scale:1}),sc=1300/Math.min(v0.width,v0.height),v=pg.getViewport({scale:sc}),c=document.createElement("canvas");c.width=Math.round(v.width);c.height=Math.round(v.height);
    await pg.render({canvasContext:c.getContext("2d"),viewport:v}).promise;await onPage(c,`${f.name} p${p}`,++n,pdf.numPages)}}
  else{const url=URL.createObjectURL(f),im=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url});const s=1300/Math.min(im.width,im.height),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);await onPage(c,f.name,++n,files.length)}}}
/* landscape scans are turned upright; a sheet scanned upside down is tried both ways */
function omrUpright(c,turn){const o=document.createElement("canvas"),q=turn%4;o.width=q%2?c.height:c.width;o.height=q%2?c.width:c.height;const g=o.getContext("2d");g.translate(o.width/2,o.height/2);g.rotate(q*Math.PI/2);g.drawImage(c,-c.width/2,-c.height/2);return o}
function omrIdentify(x,canvas){const tries=canvas.width>canvas.height?[1,3]:[0,2];let last=null;
 for(const t of tries){const c=t?omrUpright(canvas,t):canvas,img=omrGray(c),F=omrFrame(img);if(F.error){last={error:F.error};continue}
  const q=omrQrCrop(img,F,300),qr=typeof jsQR==="function"?jsQR(q.data,300,300,{inversionAttempts:"dontInvert"}):null;
  /* roll bubbles sit in the same place on every paper, so the roll number can be read before the paper is known */
  const probe=omrRead(img,{n:5,opts:5,sections:[]},F);
  if(!qr&&!/^\d{5}$/.test(probe.rollText)&&t===tries[0]){last={canvas:c,img,F,qr:null,probe};continue}
  return{canvas:c,img,F,qr:qr?qr.data:null,probe}}
 return last||{error:"The sheet could not be read."}}
function omrCandByRoll(x,roll){if(!/^\d{5}$/.test(roll))return null;const R=x.roll||{};const id=Object.keys(R).find(k=>R[k]===roll);return(id&&DB.pgts.find(p=>p.id===id))||DB.pgts.find(p=>p.reg==="Verified"&&rollOf(p)===roll)||null}
/* one sheet: identify it, read it, note where each doubtful row is (for the review crops) */
function omrSheetFrom(x,canvas,label,force,fsp){const id=omrIdentify(x,canvas);const sc={id:uid("SC"),file:label,at:new Date().toISOString(),use:true,fix:{},fl:{}};
 if(id.error){sc.issue="unreadable";sc.err=id.error;return{sc,url:canvas.toDataURL("image/jpeg",.6)}}
 const parts=(id.qr||"").split("|");let sp="",pid=null;sc.ar=+(id.canvas.width/id.canvas.height).toFixed(4);
 if(parts[0]==="RICDME"){if(parts[1]!==x.id&&parts[1]!=="TRIAL")sc.issue="other-exam";sp=omrSpecBySid(x,parts[2]);if(parts[3]&&parts[3]!=="B")pid=parts[3]}
 if(fsp&&omrSpec(x,fsp))sp=fsp;
 const rollText=id.probe.rollText;sc.roll=rollText;
 const byRoll=omrCandByRoll(x,rollText);if(!pid&&byRoll)pid=byRoll.id;if(force)pid=force;
 if(!force&&pid&&byRoll&&byRoll.id!==pid){sc.rollClash=byRoll.id;sc.issue=sc.issue||"roll-clash"}
 /* no QR code: the paper is worked out from the candidate's papers and the printed layout; if that is not certain it is asked */
 if(!sp&&pid){const p=DB.pgts.find(q=>q.id===pid);if(p){const g=omrGuessPaper(x,id,p);sp=g.sp;if(sp&&!g.sure)sc.issue=sc.issue||"paper-check"}}
 sc.pid=pid;sc.spec=sp;const url=id.canvas.toDataURL("image/jpeg",.62);
 {const sx=1/id.canvas.width,sy=1/id.canvas.height,a=id.F.map(130,40),b=id.F.map(196,98);sc.rbox=[a[0]*sx,a[1]*sy,b[0]*sx,b[1]*sy].map(v=>+v.toFixed(4))}
 if(!sp){sc.issue=sc.issue||"no-paper";return{sc,url}}
 let cfg=omrCfgOf(x,sp);if(id.F&&id.F.onecol&&typeof omrRefineX==="function")id.F=omrRefineX(id.img,id.F,cfg);{const pn=+parts[4]||0,S0=omrSpec(x,sp);const n=pn||(typeof omrDetectN==="function"?omrDetectN(id.img,id.F,cfg,S0):0);if(n&&n!==cfg.n){cfg={...cfg,n,sections:(cfg.sections||[]).filter(z=>z.from<=n).map(z=>({...z,to:Math.min(z.to,n)}))};sc.printedN=n}}
 const r=omrRead(id.img,cfg,id.F),L=omrLayout(cfg),A=omrAlignAll(id.img,id.F,L);
 /* safety check: the printed circles must sit where the sheet is being read; if they do not, the sheet is not trusted */
 {let t=0,k=0;L.q.forEach((row,i)=>{t+=omrRingScore(id.img,id.F,row,2.3,A.off[i][0],A.off[i][1]);k+=row.length});sc.ring=Math.round(t/Math.max(1,k));if(sc.ring<1000)sc.issue=sc.issue||"misaligned"}
 sc.ans=r.ans.map(a=>a.a||(a.flag==="multiple"?"*":"-")).join("");r.ans.forEach((a,q)=>{if(a.flag)sc.fl[q+1]=[a.flag,a.m||""]});
 const sx=1/id.canvas.width,sy=1/id.canvas.height;sc.box={};r.ans.forEach((a,q)=>{if(!a.flag)return;const row=L.q[q],o=A.off[q],p0=id.F.map(row[0][0]+o[0]-10,row[0][1]+o[1]-3.4),p1=id.F.map(row[row.length-1][0]+o[0]+3,row[0][1]+o[1]+3.4);sc.box[q+1]=[p0[0]*sx,p0[1]*sy,p1[0]*sx,p1[1]*sy].map(v=>+v.toFixed(4))});
 {const p=pid&&DB.pgts.find(q=>q.id===pid);if(p&&!exInPaper(x,p,sp)&&!force)sc.issue=sc.issue||"other-paper"}
 if(!pid)sc.issue=sc.issue||"unidentified";else if(!force&&!/^\d{5}$/.test(rollText)&&!parts[3])sc.issue=sc.issue||"roll";
 return{sc,url}}
async function omrProcess(x,files){const S=omrScans(x),out=[];UI.omrRun={done:0,total:0,msg:"Loading the scanning tools…"};render();
 try{await omrLoad(OMR_JSQR)}catch(e){UI.omrRun=null;toast(e.message);render();return}
 try{await omrPages(files,async(canvas,label,i,tot)=>{UI.omrRun={done:i-1,total:tot,msg:`Reading ${label}`};omrRunBar();await new Promise(r=>setTimeout(r,0));
  const{sc,url}=omrSheetFrom(x,canvas,label);UI.omrImg[sc.id]=url;out.push(sc)})}catch(e){toast("Could not open the file: "+(e.message||e))}
 /* the same page scanned again (same candidate, paper and every answer) is not added twice */
 {const same=(a,b)=>a.spec===b.spec&&a.ans&&a.ans===b.ans&&(a.pid?a.pid===b.pid:!b.pid&&a.roll===b.roll&&a.ans.replace(/-/g,"").length>=10);let sk=0,rp=0;const keep=[];out.forEach(sc=>{
  /* the same page of the same file read before: a newer reading replaces an older one that differs or had a problem */
  const i=S.findIndex(o=>o.use!==false&&o.file===sc.file&&(o.pid&&o.pid===sc.pid&&o.spec===sc.spec||sc.pid&&sc.spec&&(!o.pid||!o.spec||["unreadable","no-paper","unidentified"].includes(o.issue))));
  const dupe=S.some((o,j)=>j!==i&&(o.use!==false&&same(o,sc)||sc.issue==="unreadable"&&o.issue==="unreadable"&&o.file===sc.file))||keep.some(o=>same(o,sc));
  if(i>=0&&same(S[i],sc)){sk++;delete UI.omrImg[sc.id];return}
  if(i>=0){delete UI.omrImg[S[i].id];S.splice(i,1);rp++}
  if(dupe){sk++;delete UI.omrImg[sc.id];return}
  keep.push(sc)});
  out.length=0;keep.forEach(z=>out.push(z));if(sk||rp)setTimeout(()=>toast([sk?`${sk} page${sk>1?"s were":" was"} already scanned and ${sk>1?"were":"was"} not added again`:"",rp?`${rp} sheet${rp>1?"s were":" was"} read again and replaced`:""].filter(Boolean).join(" · ")),400)}
 /* keep the images on the live app so any sheet can be looked at later */
 if(LIVE&&SYNC.sb){let k=0;for(const sc of out){UI.omrRun={done:k++,total:out.length,msg:"Saving sheet images"};omrRunBar();await omrSaveImg(x,sc)}}
 out.forEach(sc=>S.push(sc));omrDupes(x);if(typeof omrPrune==="function")omrPrune(x);
 xlog(x,`OMR: ${out.length} sheet${out.length===1?"":"s"} scanned (${out.filter(s=>omrNeeds(x,s)).length} need review)`);UI.omrRun=null;UI.omrTab="review";persist();render();
 setTimeout(()=>document.getElementById("omrscan")?.scrollIntoView({behavior:"smooth"}),50)}
async function omrSaveImg(x,sc){try{const blob=await(await fetch(UI.omrImg[sc.id])).blob(),path=`exams/${x.id}/${sc.id}.jpg`;const{error}=await SYNC.sb.storage.from("dme-uploads").upload(path,blob,{contentType:"image/jpeg",upsert:true});if(!error)sc.img=path}catch(e){}}
/* a sheet whose paper was unknown is read again once you say whose it is */
async function omrReread(x,s,pid){let src=UI.omrImg[s.id];if(!src&&s.img&&LIVE){try{const{data}=await SYNC.sb.storage.from("dme-uploads").createSignedUrl(s.img,600);src=data&&data.signedUrl}catch(e){}}
 if(!src){toast("The sheet image is not available; scan it again.");return}
 await omrLoad(OMR_JSQR).catch(()=>{});const im=await new Promise((ok,no)=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>ok(i);i.onerror=no;i.src=src});const c=document.createElement("canvas");c.width=im.width;c.height=im.height;c.getContext("2d").drawImage(im,0,0);
 const{sc}=omrSheetFrom(x,c,s.file,pid);Object.assign(s,{...sc,id:s.id,img:s.img,at:s.at});if(!s.spec){s.issue="no-paper"}omrDupes(x);persist();render()}
function omrDupes(x){const S=omrScans(x),seen={};S.forEach(s=>{if(s.issue==="duplicate")delete s.issue});S.filter(s=>s.pid&&s.use).forEach(s=>{if(seen[s.pid+"|"+s.spec]){s.issue=s.issue||"duplicate";seen[s.pid+"|"+s.spec].issue=seen[s.pid+"|"+s.spec].issue||"duplicate"}else seen[s.pid+"|"+s.spec]=s})}
function omrRunBar(){const R=UI.omrRun,el=document.getElementById("omrrun");if(!R||!el)return;el.innerHTML=`<div class="subt">${esc(R.msg)}</div><div class="bar"><i style="width:${R.total?Math.round(R.done/R.total*100):5}%"></i></div>`}

/* ---------- state of each sheet ---------- */
const OMR_ISSUE={unreadable:"Could not read the sheet",unidentified:"Candidate not identified",roll:"Roll number incomplete","no-paper":"Paper (specialty) not known","other-exam":"Sheet belongs to another exam",duplicate:"Same candidate scanned more than once","not-candidate":"Not on this exam's candidate list","other-paper":"Candidate's specialty does not match this paper","paper-check":"Paper not certain: the QR code could not be read","roll-clash":"The roll number filled in belongs to another candidate",misaligned:"The answer circles could not be lined up on this sheet"};
const OMR_FL={multiple:"Two or more answers",faint:"Very faint mark",light:"Light mark, tick or cross",smudge:"Possible erasure"};
function omrOpen(x,s){if(!s.use)return[];const o=[];if(s.issue&&s.issue!=="duplicate"&&!s.okIssue)o.push("issue");if(s.issue==="duplicate")o.push("dup");
 if(s.pid&&!s.okIssue&&!exCands(x).some(p=>p.id===s.pid)&&!(x.added||[]).includes(s.pid))o.push("cand");
 Object.keys(s.fl||{}).forEach(q=>{if(!(q in s.fix))o.push("q"+q)});return o}
const omrNeeds=(x,s)=>omrOpen(x,s).length>0;
function omrFinal(x,s){const sp=omrSpec(x,s.spec);if(!sp||!s.ans)return null;return Array.from({length:sp.n},(_,i)=>{const q=i+1;if(q in s.fix)return s.fix[q];const a=s.ans[i];return a==="-"||a==="*"?"":a})}
function omrScore(x,s){const sp=omrSpec(x,s.spec),A=omrFinal(x,s);if(!A)return null;const key=omrKeyArr(sp),drop=new Set(sp.drop||[]),alt=sp.alt||{};let o=0,t=0;const secs={};
 const secOf=q=>(sp.sections||[]).find(z=>q>=z.from&&q<=z.to);
 for(let i=0;i<sp.n;i++){const q=i+1;if(drop.has(q)||!key[i])continue;t++;const ok=A[i]&&(A[i]===key[i]||alt[q]===A[i]);if(ok)o++;const z=secOf(q);if(z){secs[z.name]=secs[z.name]||[0,0];secs[z.name][1]++;if(ok)secs[z.name][0]++}}
 return{o,t,pct:t?Math.round(o/t*1000)/10:0,secs}}

/* ---------- the panel on the exam page ---------- */
function omrScanPanel(x){if(isViewer())return"";const O=omrOf(x),specs=Object.keys(O.specs);if(!specs.length)return"";const S=omrScans(x),R=UI.omrRun;
 const used=S.filter(s=>s.use),need=used.filter(s=>omrNeeds(x,s)),ok=used.filter(s=>!omrNeeds(x,s)&&s.pid);
 const keyMiss=specs.filter(sp=>omrKeyDone(O.specs[sp])<O.specs[sp].n),okK=ok.filter(s=>!keyMiss.includes(s.spec));
 const absent=omrMissing(x);
 const tab=UI.omrTab;
 let body="";
 if(tab==="review")body=need.length?need.map(s=>omrReviewCard(x,s)).join(""):`<p class="subt" style="margin:0">${S.length?"Nothing needs review.":"No sheets scanned yet."}</p>`;
 if(tab==="all")body=omrAllTable(x,used);
 if(tab==="absent")body=absent.length?`<p style="margin:0">${absent.length} candidate${absent.length>1?"s":""} with no scanned sheet:</p><div class="chips">${absent.map(({p,k})=>`<span class="chip" aria-pressed="false">Dr. ${esc(p.name)} · ${esc(k)}</span>`).join("")}</div><div><button class="btn small" data-act="omr-absent">Mark all ${absent.length} as absent</button></div><p class="subt" style="margin:0">Only do this once every pile has been scanned.</p>`:`<p class="subt" style="margin:0">Every candidate has a sheet or is marked absent.</p>`;
 return`<div class="panel" id="omrscan" style="display:grid;gap:12px"><div class="head"><h3 style="margin:0">Scan answer sheets</h3><label class="btn small primary" for="omr-file" ${R?'aria-disabled="true"':""}>Upload scanned PDF or photos</label><input type="file" id="omr-file" accept="application/pdf,image/*" multiple class="sr"></div>
 <p class="subt" style="margin:0">Scan the sheets with Adobe Scan (or CamScanner) using the <b>Original</b> or <b>Grayscale</b> filter, as one PDF; piles of different specialties can be mixed. Reading happens on this computer. Only doubtful marks come to you for a decision.</p>
 ${R?`<div id="omrrun" style="display:grid;gap:6px"><div class="subt">${esc(R.msg)}</div><div class="bar"><i style="width:${R.total?Math.round(R.done/R.total*100):5}%"></i></div></div>`:""}
 ${S.length?`<div class="omrstats"><div><b>${used.length}</b><span>sheets read</span></div><div><b>${need.length}</b><span>need review</span></div><div><b>${ok.length}</b><span>ready</span></div><div><b>${absent.length}</b><span>candidates without a sheet</span></div></div>
  ${keyMiss.length?`<div class="flag">Answer key incomplete for ${keyMiss.map(esc).join(", ")}. Marks are worked out from the key, so finish it before putting results into the exam.</div>`:""}
  <div class="seg2" role="tablist">${[["review",`Needs review (${need.length})`],["all",`All sheets (${used.length})`],["absent",`Without a sheet (${absent.length})`]].map(([k,l])=>`<button class="chip" data-omrtab="${k}" aria-pressed="${tab===k}">${l}</button>`).join("")}</div>
  <div style="display:grid;gap:10px">${body}</div>
  <div class="actions" style="justify-content:flex-start"><button class="btn primary" data-act="omr-apply" ${!okK.length?"disabled":""}>Put ${okK.length} result${okK.length===1?"":"s"} into the exam</button>${need.length?`<span class="subt">${need.length} sheet${need.length>1?"s":""} still need review; press again once they are done.</span>`:""}${ok.length>okK.length?`<span class="subt">${ok.length-okK.length} wait for an answer key.</span>`:""}</div>`:""}</div>`}
{const _o=omrPanel;omrPanel=function(x){return _o(x)+omrScanPanel(x)}}
function omrCrop(x,s,box,h){const src=UI.omrImg[s.id];if(!box)return"";const[x0,y0,x1,y1]=box,W=x1-x0,H=y1-y0;
 if(src)return`<div class="omrcrop" style="height:${h}px;aspect-ratio:${(W/H*(s.ar||.707)).toFixed(3)};background-image:url(${src});background-size:${(100/W).toFixed(2)}% ${(100/H).toFixed(2)}%;background-position:${(x0/(1-W)*100).toFixed(2)}% ${(y0/(1-H)*100).toFixed(2)}%"></div>`;
 return s.img?`<div class="omrcrop" data-omrimg="${esc(s.img)}" data-box="${box.join(",")}" style="height:${h}px;aspect-ratio:${(W/H*.707).toFixed(3)}"></div>`:`<span class="subt">(image not kept)</span>`}
function omrWho(x,s){const p=s.pid&&DB.pgts.find(q=>q.id===s.pid);return p?`${esc(candName(p))} <span class="subt">${esc(candId(p))} · ${esc(s.spec||p.spec)}</span>`:`<span class="d-red">Not identified</span>${s.roll?` <span class="subt">roll read as ${esc(s.roll)}</span>`:""}`}
function omrReviewCard(x,s){const open=omrOpen(x,s),letters="ABCDE".slice(0,(omrSpec(x,s.spec)||{opts:5}).opts).split("");
 const cands=exCands(x).slice().sort((a,b)=>(exInPaper(x,a,s.spec)?0:1)-(exInPaper(x,b,s.spec)?0:1)||a.name.localeCompare(b.name));
 const issue=open.includes("issue")||open.includes("cand")?`<div class="flag" style="display:grid;gap:8px"><b>${esc(open.includes("cand")?OMR_ISSUE["not-candidate"]:OMR_ISSUE[s.issue]||s.issue)}</b>${s.err?`<span class="subt">${esc(s.err)}</span>`:""}
  ${s.rbox?omrCrop(x,s,s.rbox,190):""}
  ${["unidentified","roll","no-paper","other-paper","paper-check","roll-clash"].includes(s.issue)||open.includes("cand")?`<label class="f">This sheet belongs to<select data-omrwho="${s.id}">${opt([["","Choose the candidate"],...cands.map(p=>[p.id,`Dr. ${p.name} · ${p.code||""} · ${exPaperOf(x,p)}`])],s.pid||"")}</select></label>`:""}
  <div class="actions" style="justify-content:flex-start">${open.includes("cand")?`<button class="btn small" data-act="omr-addcand" data-id="${s.id}">Add to the candidate list</button>`:""}${s.issue==="other-exam"||s.issue==="unreadable"||s.issue==="misaligned"?`<button class="btn small" data-act="omr-skip" data-id="${s.id}">Leave this sheet out</button>`:""}${s.issue==="misaligned"?`<button class="btn small" data-act="omr-okissue" data-id="${s.id}">I checked the sheet: the reading is right</button>`:""}${["roll"].includes(s.issue)&&s.pid?`<button class="btn small" data-act="omr-okissue" data-id="${s.id}">Roll number is fine</button>`:""}${s.issue==="other-paper"&&s.pid?`<button class="btn small" data-act="omr-okissue" data-id="${s.id}">Correct: this candidate sat the ${esc(s.spec)} paper</button>`:""}${s.issue==="paper-check"&&s.pid?`<button class="btn small" data-act="omr-okissue" data-id="${s.id}">Correct: ${esc(s.spec)} paper</button>`:""}${s.issue==="roll-clash"&&s.pid?`<button class="btn small" data-act="omr-okissue" data-id="${s.id}">Keep Dr. ${esc((DB.pgts.find(q=>q.id===s.pid)||{}).name||"")} (name printed on the sheet)</button>`:""}</div></div>`:"";
 const dup=open.includes("dup")?`<div class="flag" style="display:grid;gap:6px"><b>${OMR_ISSUE.duplicate}</b><span>Keep this sheet, or leave it out?</span><div class="actions" style="justify-content:flex-start"><button class="btn small" data-act="omr-keep" data-id="${s.id}">Keep this one</button><button class="btn small" data-act="omr-skip" data-id="${s.id}">Leave this one out</button></div></div>`:"";
 const qs=open.filter(k=>k[0]==="q").map(k=>+k.slice(1)).sort((a,b)=>a-b).map(q=>{const[f,m]=s.fl[q];return`<div class="omrq"><div><b>Q${q}</b> <span class="subt">${esc(OMR_FL[f]||f)}${m?` · read as ${esc(m)}`:s.ans&&s.ans[q-1]&&s.ans[q-1]!=="-"&&s.ans[q-1]!=="*"?` · read as ${s.ans[q-1]}`:""}</span></div>${omrCrop(x,s,s.box&&s.box[q],44)}
  <div class="omrpick">${letters.map(l=>`<button class="btn small ${(s.ans||"")[q-1]===l||(m||"").includes(l)?"read":""}" data-omrfix="${s.id}|${q}|${l}" title="${(s.ans||"")[q-1]===l?"What the reader saw":""}">${l}</button>`).join("")}<button class="btn small" data-omrfix="${s.id}|${q}|">No answer</button></div></div>`}).join("");
 return`<div class="omrcard"><div class="head"><span>${omrWho(x,s)}</span><span class="subt">${esc(s.file)}${s.img||UI.omrImg[s.id]?` · <button class="btn link" data-omrview="${s.id}">View sheet</button>`:""}</span></div>${issue}${dup}${qs}</div>`}
function omrAllTable(x,L){const rows=L.slice().sort((a,b)=>(a.spec||"").localeCompare(b.spec||"")||((DB.pgts.find(p=>p.id===a.pid)||{}).name||"").localeCompare((DB.pgts.find(p=>p.id===b.pid)||{}).name||""));
 return`<div class="tblwrap"><table><thead><tr><th>Candidate</th><th>Paper</th><th>Roll</th><th class="num">Score</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(s=>{const sc=omrScore(x,s),n=omrNeeds(x,s);
  return`<tr><td>${omrWho(x,s)}</td><td>${esc(s.spec||"—")}${s.only?` <span class="pill p-rot">Q${s.only[0]}–${s.only[1]} only</span>`:""}</td><td class="code">${esc(s.roll||"")}</td><td class="num">${sc?`${sc.o}/${sc.t} · ${sc.pct}%`:"—"}</td><td>${n?'<span class="pill p-pause">Review</span>':'<span class="pill p-ric">Ready</span>'}</td><td>${s.img||UI.omrImg[s.id]?`<button class="btn link" data-omrview="${s.id}">View</button>`:""}${s.ans&&s.spec?`<button class="btn link" data-omrpart="${s.id}">${s.only?"Change part marked":"Mark part only"}</button>`:""}<button class="btn link" data-omrdel="${s.id}">Delete</button></td></tr>`}).join("")}</tbody></table></div>`}

/* ---------- actions ---------- */
document.addEventListener("change",e=>{if(e.target.id==="omr-file"&&e.target.files.length){const x=DB.exams.find(v=>v.id===route.id);if(!x)return;const f=[...e.target.files];e.target.value="";omrProcess(x,f)}
 const w=e.target.closest("[data-omrwho]");if(w){const x=DB.exams.find(v=>v.id===route.id),s=x&&omrScans(x).find(v=>v.id===w.dataset.omrwho);if(!s)return;const p=DB.pgts.find(q=>q.id===w.value);if(!p)return;
  xlog(x,`OMR: sheet ${s.file} assigned to Dr. ${p.name}`);
  if(!s.ans){if(!Object.keys(omrOf(x).specs).some(k=>exInPaper(x,p,k))){toast(`Set up the ${exPaperOf(x,p)} sheet first`);return}omrReread(x,s,p.id);return}
  s.pid=p.id;if(["unidentified","roll","no-paper","roll-clash"].includes(s.issue))delete s.issue;if(s.issue==="other-paper"&&exInPaper(x,p,s.spec))delete s.issue;omrDupes(x);persist();render()}});
document.addEventListener("click",async e=>{if(!DB||!DB.exams||!e.target.closest("[data-omrtab],[data-omrfix],[data-omrview],[data-act^=\"omr-\"]"))return;const x=DB.exams.find(v=>v.id===route.id);
 const t=e.target.closest("[data-omrtab]");if(t){UI.omrTab=t.dataset.omrtab;render();return}
 const f=e.target.closest("[data-omrfix]");if(f&&x){const[id,q,l]=f.dataset.omrfix.split("|");const s=omrScans(x).find(v=>v.id===id);if(!s)return;s.fix[q]=l;persist();const y=window.scrollY;render();window.scrollTo(0,y);return}
 const v=e.target.closest("[data-omrview]");if(v&&x){const s=omrScans(x).find(z=>z.id===v.dataset.omrview);if(s)omrView(x,s);return}
 const a=e.target.closest('[data-act="omr-skip"],[data-act="omr-keep"],[data-act="omr-addcand"],[data-act="omr-okissue"],[data-act="omr-absent"],[data-act="omr-apply"]');if(!a||!x)return;const s=a.dataset.id&&omrScans(x).find(z=>z.id===a.dataset.id);
 if(a.dataset.act==="omr-skip"&&s){s.use=false;omrDupes(x);xlog(x,`OMR: sheet ${s.file} left out`)}
 if(a.dataset.act==="omr-keep"&&s){omrScans(x).filter(z=>z!==s&&z.pid===s.pid&&z.spec===s.spec).forEach(z=>z.use=false);delete s.issue;omrDupes(x);xlog(x,`OMR: kept sheet ${s.file} for the candidate scanned twice`)}
 if(a.dataset.act==="omr-okissue"&&s){s.okIssue=true}
 if(a.dataset.act==="omr-addcand"&&s){const p=DB.pgts.find(q=>q.id===s.pid);if(x.cands){if(!x.cands.includes(s.pid))x.cands.push(s.pid)}else{x.added=x.added||[];if(!x.added.includes(s.pid))x.added.push(s.pid)}if(x.removed)delete x.removed[s.pid];xlog(x,`Added Dr. ${p?p.name:""} to the candidate list (sheet scanned)`)}
 if(a.dataset.act==="omr-absent"){const L=omrMissing(x);L.forEach(({p,k})=>{const M=exPM(x,k);M.absent[p.id]=true;delete M.marks[p.id]});xlog(x,`OMR: ${L.length} candidates without a sheet marked absent`)}
 if(a.dataset.act==="omr-apply"){omrApply(x);return}
 persist();const y=window.scrollY;render();window.scrollTo(0,y)});
function omrApply(x){const O=omrOf(x),used=omrScans(x).filter(s=>s.use&&s.pid&&!omrNeeds(x,s)&&omrKeyOk(x,s.spec));let n=0;O.applied=O.applied||{};
 used.forEach(s=>{const sc=omrScore(x,s);if(!sc)return;const M=exPM(x,s.spec);M.marks[s.pid]=sc.pct;M.raw[s.pid]={o:sc.o,t:sc.t};M.secs[s.pid]=sc.secs;O.applied[s.spec+"|"+s.pid]=s.id;delete M.absent[s.pid];if(!exIsCommon(x,s.spec)&&x.res)delete x.res[s.pid];n++});
 const gone=omrPrune(x),left=omrScans(x).filter(s=>s.use&&omrNeeds(x,s)).length;
 if(x.cands)used.forEach(s=>{if(!x.cands.includes(s.pid))x.cands.push(s.pid)});
 if((x.stage||0)<4)x.stage=Math.max(x.stage||0,4);if(!x.cands)x.cands=exCands(x).map(p=>p.id);
 xlog(x,`OMR results put into the exam: ${n} candidates${gone?`; ${gone} earlier result${gone>1?"s":""} removed (sheet left out or moved)`:""}`);persist();toast(`${n} results entered${left?` · ${left} sheet${left>1?"s":""} still need review`:""}`);render()}
/* re-score after the key changes (dropped question, second answer, corrected key) */
{const _k=sheetOmrKey;sheetOmrKey=function(x,sp){_k(x,sp);const o=SHEET.onSave;SHEET.onSave=(...a)=>{const r=o(...a);if(r!==false){const has=omrScans(x).some(s=>s.use&&s.spec===sp&&exPM(x,sp).marks[s.pid]!=null);if(has){omrApply(x);toast(`Answer key saved; ${sp} re-marked`)}}return r}}}

/* full sheet view */
async function omrView(x,s){let src=UI.omrImg[s.id];if(!src&&s.img&&LIVE){try{const{data}=await SYNC.sb.storage.from("dme-uploads").createSignedUrl(s.img,600);src=data&&data.signedUrl}catch(e){}}if(!src){toast("The sheet image is not available");return}
 document.getElementById("overlay").innerHTML=`<div class="scrim" data-act="close"></div><div class="qrfull" role="dialog" aria-modal="true" aria-label="Scanned sheet" style="max-width:min(760px,96vw);max-height:94vh;overflow:auto"><div class="head" style="width:100%"><b>${omrWho(x,s)}</b><button class="btn small" data-act="close">Close</button></div><img src="${src}" alt="Scanned sheet" style="width:100%;height:auto;border:1px solid var(--line)"></div>`}
/* crops of stored images on the live app: fetch a signed address once per sheet */
const OMR_URL={};
setInterval(async()=>{const el=document.querySelector(".omrcrop[data-omrimg]:not([data-l])");if(!el||!LIVE)return;const p=el.dataset.omrimg;
 if(!OMR_URL[p]){try{const{data}=await SYNC.sb.storage.from("dme-uploads").createSignedUrl(p,3600);OMR_URL[p]=data&&data.signedUrl}catch(e){}}
 document.querySelectorAll(`.omrcrop[data-omrimg="${CSS.escape(p)}"]`).forEach(c=>{const[x0,y0,x1,y1]=c.dataset.box.split(",").map(Number),W=x1-x0,H=y1-y0;c.dataset.l=1;if(!OMR_URL[p])return;c.style.backgroundImage=`url(${OMR_URL[p]})`;c.style.backgroundSize=`${(100/W).toFixed(2)}% ${(100/H).toFixed(2)}%`;c.style.backgroundPosition=`${(x0/(1-W)*100).toFixed(2)}% ${(y0/(1-H)*100).toFixed(2)}%`})},400);
