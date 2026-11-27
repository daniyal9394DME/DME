/* =====================================================================
   V50 · OMR: deleting a sheet takes its result out; a corrected sheet
   uploaded afterwards (even on its own) is read and its result goes
   straight in once the exam already has results. Leave documents can
   be opened from the PGT's timeline, and large phone photos are made
   smaller before upload instead of being refused.
   ===================================================================== */
function omrDeleteSheet(x,s){const O=omrOf(x),A=O.applied||{},p=s.pid&&DB.pgts.find(q=>q.id===s.pid);O.scans=omrScans(x).filter(z=>z!==s);delete UI.omrImg[s.id];let gone=false;
 if(s.pid&&s.spec){const key=s.spec+"|"+s.pid,M=exPM(x,s.spec),other=O.scans.find(z=>z.use&&z.pid===s.pid&&z.spec===s.spec&&!omrNeeds(x,z));
  /* the mark came from this sheet (or from a scan before marks were traced): take it out unless another sheet of theirs stands */
  if(!other&&M.marks[s.pid]!=null&&(A[key]===s.id||!A[key]&&M.raw&&M.raw[s.pid])){delete M.marks[s.pid];if(M.raw)delete M.raw[s.pid];if(M.secs)delete M.secs[s.pid];if(!exIsCommon(x,s.spec)&&x.res)delete x.res[s.pid];gone=true}
  if(A[key]===s.id)delete A[key]}
 if(LIVE&&SYNC.sb&&s.img)SYNC.sb.storage.from("dme-uploads").remove([s.img]).catch(()=>{});
 omrDupes(x);xlog(x,`OMR: sheet ${s.file}${p?` (Dr. ${p.name}, ${s.spec})`:""} deleted${gone?"; its result was taken out":""}`);return{gone,p}}
document.addEventListener("click",e=>{const b=e.target.closest("[data-omrdel]");if(!b||!DB||!DB.exams)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;
 const s=omrScans(x).find(z=>z.id===b.dataset.omrdel);if(!s)return;e.preventDefault();
 if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Tap again to delete";b.classList.add("d-red");return}
 const{gone,p}=omrDeleteSheet(x,s);persist();render();toast(`Sheet deleted${gone&&p?`; Dr. ${p.name}'s ${s.spec} result taken out. Upload the new sheet to enter it again`:""}`)});
/* once an exam has results, a sheet that is ready (after upload, or once its review is finished) goes straight in */
function omrAutoApply(x){const O=omrOf(x),A=O.applied||{};if(!Object.keys(A).length&&!exAllPapers(x).some(k=>Object.keys(exPM(x,k).marks).length))return;
 const R=omrScans(x).filter(s=>s.use&&s.pid&&s.spec&&!omrNeeds(x,s)&&omrKeyOk(x,s.spec)&&A[s.spec+"|"+s.pid]!==s.id);if(R.length)omrApply(x)}
{const _p=omrProcess;omrProcess=async function(x,files){await _p(x,files);setTimeout(()=>omrAutoApply(x),900)}}
["click","change"].forEach(ev=>document.addEventListener(ev,e=>{if(!e.target.closest('[data-omrfix],[data-act="omr-okissue"],[data-act="omr-keep"],[data-omrwho],[data-omrpaper]'))return;
 setTimeout(()=>{const x=DB&&DB.exams&&DB.exams.find(v=>v.id===route.id);if(x)omrAutoApply(x)},ev==="change"?1500:60)}));
/* PGT timeline: open the leave document */
{const _t=timeline;timeline=function(p){return _t(p).replace(/(<button class="btn link" data-edit="leave" data-id="([^"]+)">Edit<\/button>)/g,(m,btn,id)=>{const l=DB.leaves.find(z=>z.id===id);return(l&&l.doc?docBtn(l.doc,"View document"):"")+btn})}}
/* phone photos are often over 5 MB: shrink pictures before upload; PDFs up to 10 MB */
async function docShrink(file){if(!/^image\//.test(file.type||"")||file.size<1.5*1024*1024)return file;
 try{const url=URL.createObjectURL(file),im=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url});const k=Math.min(1,2200/Math.max(im.width,im.height)),c=document.createElement("canvas");
  c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);
  const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.82));return blob?new File([blob],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg"}):file}catch(e){return file}}
{const _d=docAttach;docAttach=async function(rec,file,folder,what){if(!rec||!file)return;const f=await docShrink(file);
 if(f.size>10*1024*1024){toast("The document is larger than 10 MB and was not attached. Scan it as a smaller PDF or a photo.");return}
 if(f.size>5*1024*1024&&LIVE&&SYNC&&SYNC.sb){toast("Uploading the document…");try{const path=await docUpload(folder,f);rec.doc={path,name:file.name,at:new Date().toISOString(),by:ME};persist();render();toast(`Document attached to ${what}`)}catch(e){rec.doc={name:file.name,failed:true};persist();render();toast("The document could not be uploaded. Open the record and attach it again.")}return}
 return _d(rec,f,folder,what)}}
