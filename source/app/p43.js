
/* =====================================================================
   V41 · OMR: upside-down sheets. A sheet scanned upside down could be
   read the wrong way up when its roll-number area happened to look like
   five digits. The way up is now chosen by how many of the side squares
   line up (and the QR code), and existing sheets can be checked and
   read again in one go.
   ===================================================================== */
function omrIdentify(x,canvas){const tries=canvas.width>canvas.height?[1,3]:[0,2],R=[];
 for(const t of tries){const c=t?omrUpright(canvas,t):canvas,img=omrGray(c),F=omrFrame(img);if(F.error){R.push({t,error:F.error});continue}
  const qd=omrQrRead(img,F),qr=qd?{data:qd}:null;
  const probe=omrRead(img,{n:5,opts:5,sections:[]},F),roll=/^\d{5}$/.test(probe.rollText);
  /* side squares only line up the right way up; a QR code is only found where it is printed */
  const r={t,canvas:c,img,F,qr:qr?qr.data:null,probe,score:(qr?1000:0)+(F.found||0)*10+(roll?5:0)};R.push(r);
  if(t===tries[0]&&(F.found||0)>=Math.max(8,(F.of||16)*.75)&&(qr||roll))break}
 const ok=R.filter(r=>!r.error).sort((a,b)=>b.score-a.score);
 if(!ok.length)return{error:(R.find(r=>r.error)||{}).error||"The sheet could not be read."};
 omrIdentify.last=ok[0].t-tries[0];return ok[0]}
{const _s=omrSheetFrom;omrSheetFrom=function(x,canvas,label,force,fsp){omrIdentify.last=null;const r=_s(x,canvas,label,force,fsp);if(r&&r.sc&&omrIdentify.last!=null)r.sc.turn=omrIdentify.last;if(r&&r.sc&&r.sc.issue==="unreadable")r.sc.turn=0;return r}}
/* a re-read sheet keeps the picture the right way up for the review crops */
{const _r=omrReread;omrReread=async function(x,s,pid){const res=await omrFixOne(x,s,pid||s.pid,true);if(res==="noimg")return _r(x,s,pid)}}

async function omrImgCanvas(x,s){let src=UI.omrImg[s.id];if(!src&&s.img&&LIVE){try{const{data}=await SYNC.sb.storage.from("dme-uploads").createSignedUrl(s.img,600);src=data&&data.signedUrl}catch(e){}}
 if(!src)return null;const im=await new Promise((ok,no)=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>ok(i);i.onerror=no;i.src=src});
 const c=document.createElement("canvas");c.width=im.width;c.height=im.height;c.getContext("2d").drawImage(im,0,0);return c}
/* read one stored sheet again; returns "turned" when it had been read upside down */
async function omrFixOne(x,s,pid,always,fsp){let c;try{c=await omrImgCanvas(x,s)}catch(e){c=null}if(!c)return"noimg";
 const{sc,url}=omrSheetFrom(x,c,s.file,pid||s.pid||undefined,fsp);const turned=sc.turn===2||sc.turn===-2||(sc.turn&&sc.turn!==0);
 if(!always&&!turned){s.turn=0;return"same"}
 const had=s.pid&&s.spec&&exPM(x,s.spec).marks[s.pid]!=null,o0={pid:s.pid,spec:s.spec};
 Object.assign(s,{...sc,id:s.id,img:s.img,at:s.at,use:s.use});if(!s.spec)s.issue="no-paper";
 if(turned){UI.omrImg[s.id]=url;if(LIVE&&SYNC.sb){await omrSaveImg(x,s)}s.turn=0;s.turnedFix=new Date().toISOString()}
 /* the mark this sheet gave earlier comes out if the sheet now needs a look, or now belongs to another paper or candidate */
 if(had&&(omrNeeds(x,s)||s.spec!==o0.spec||s.pid!==o0.pid)){const A=omrOf(x).applied||{},key=o0.spec+"|"+o0.pid;if(!A[key]||A[key]===s.id){const M=exPM(x,o0.spec);delete M.marks[o0.pid];if(M.raw)delete M.raw[o0.pid];if(M.secs)delete M.secs[o0.pid];delete A[key]}}
 return turned?"turned":"same"}
async function omrCheckTurned(x,btn){const S=omrScans(x).filter(s=>s.use!==false&&s.turn==null&&s.issue!=="unreadable");if(!S.length){toast("All sheets have already been checked");return}
 if(btn)btn.disabled=true;await omrLoad(OMR_JSQR).catch(()=>{});let n=0,k=0,miss=0;const fixed=[];
 for(const s of S){UI.omrRun={done:k++,total:S.length,msg:`Checking sheet ${k} of ${S.length}`};omrRunBar();await new Promise(r=>setTimeout(r,0));
  try{const r=await omrFixOne(x,s,s.pid,false);if(r==="turned"){n++;fixed.push(s)}if(r==="noimg")miss++}catch(e){miss++}}
 UI.omrRun=null;omrDupes(x);
 const ready=fixed.filter(s=>s.pid&&!omrNeeds(x,s)&&exPM(x,s.spec).marks[s.pid]==null);
 xlog(x,`OMR: ${S.length} sheets checked; ${n} had been read upside down and were read again${miss?`; ${miss} without a stored image`:""}`);
 if(ready.length&&omrScans(x).some(s=>s.use&&exPM(x,s.spec).marks[s.pid]!=null))omrApply(x);
 persist();UI.omrTab="review";render();
 toast(n?`${n} sheet${n===1?" was":"s were"} upside down and ${n===1?"has":"have"} been read again. Review any that need it, then put the results into the exam.`:`No upside-down sheets found${miss?` (${miss} had no stored image)`:""}`)}
{const _p=omrScanPanel;omrScanPanel=function(x){const h=_p(x);const S=omrScans(x);if(!S.length||isViewer())return h;const old=S.filter(s=>s.use!==false&&s.turn==null&&s.issue!=="unreadable").length;
 const fixedN=S.filter(s=>s.turnedFix).length;
 const box=old?`<div class="flag" style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b>${old} sheet${old===1?"":"s"} scanned before the upside-down fix.</b> Check them: any read upside down are read again the right way up, and their answers change.</span><button class="btn small primary" data-act="omr-turncheck">Check for upside-down sheets</button></div>`
  :fixedN?`<p class="subt" style="margin:0">${fixedN} sheet${fixedN===1?" was":"s were"} found upside down and read again.</p>`:"";
 return h.replace('<div class="seg2" role="tablist">',box+'<div class="seg2" role="tablist">')}}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="omr-turncheck"]');if(!b)return;const x=DB.exams.find(v=>v.id===route.id);if(x)omrCheckTurned(x,b)});
