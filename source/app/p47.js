/* =====================================================================
   V45 · OMR safety checks before the remaining papers are scanned.
   - The QR code is tried at several sizes, so a sheet whose code is
     sharp but awkwardly scaled is still recognised.
   - Without a QR code (blank sheet, damaged corner), the paper is not
     assumed to be the candidate's specialty: it is chosen from the
     candidate's papers by the printed layout, and asked when unsure.
   - Any sheet's paper can be changed from the review card.
   - Results can be put in for the ready sheets while others wait.
   - A mark entered from a sheet that is later left out, or moved to
     another candidate or paper, is taken back out.
   ===================================================================== */
function omrQrCropW(img,F,size,pad){const out=new Uint8ClampedArray(size*size*4),X0=166-pad,Y0=6-pad,S=30+2*pad;
 for(let j=0;j<size;j++)for(let i=0;i<size;i++){const[x,y]=F.map(X0+S*i/size,Y0+S*j/size);const xi=Math.round(x),yi=Math.round(y);const v=xi>=0&&yi>=0&&xi<img.w&&yi<img.h?img.d[yi*img.w+xi]:255;const k=(j*size+i)*4;out[k]=out[k+1]=out[k+2]=v;out[k+3]=255}
 return out}
function omrQrRead(img,F){if(typeof jsQR!=="function")return null;
 for(const[sz,pad]of[[300,0],[240,0],[360,0],[300,3],[200,0],[420,3],[260,1.5]]){const r=jsQR(omrQrCropW(img,F,sz,pad),sz,sz,{inversionAttempts:"dontInvert"});if(r&&/^RICDME\|/.test(r.data))return r.data}
 return null}
const omrKeyOk=(x,k)=>{const S=omrSpec(x,k);return!!S&&omrKeyDone(S)>=S.n};
/* which of the candidate's papers this sheet is, from the printed circles */
function omrGuessPaper(x,id,p){const ks=Object.keys(omrOf(x).specs).filter(k=>exInPaper(x,p,k));
 if(!ks.length){const k=exPaperOf(x,p);return{sp:omrSpec(x,k)?k:"",sure:false}}
 if(ks.length===1)return{sp:ks[0],sure:true};
 const fit=(cfg,n)=>{const c2={...cfg,n,sections:(cfg.sections||[]).filter(z=>z.from<=n).map(z=>({...z,to:Math.min(z.to,n)}))},L=omrLayout(c2),pts=L.q.flat(),F=id.F&&id.F.onecol&&typeof omrRefineX==="function"?omrRefineX(id.img,id.F,c2):id.F;let b=-1e18;
  for(const dx of[-.8,0,.8])for(const dy of[-.8,0,.8]){const v=omrRingScore(id.img,F,pts,2.3,dx,dy)/pts.length;if(v>b)b=v}return b};
 const R=[];ks.forEach(k=>{const cfg=omrCfgOf(x,k),S=omrSpec(x,k);[...new Set([cfg.n,S&&S.printed&&S.printed.n].filter(Boolean))].forEach(n=>R.push({k,n,s:fit(cfg,n)}))});
 const top=Math.max(...R.map(r=>r.s)),own=ks.includes(exPaperOf(x,p))?exPaperOf(x,p):ks[0];if(!(top>0))return{sp:own,sure:false};
 /* a layout with fewer questions than printed also lands on circles: take the largest that fits; two papers of that size cannot be told apart */
 const ok=R.filter(r=>r.s>=top*.88).sort((a,b)=>b.n-a.n),same=new Set(ok.filter(r=>r.n===ok[0].n).map(r=>r.k));
 if(same.size>1)return{sp:same.has(own)?own:ok[0].k,sure:false};return{sp:ok[0].k,sure:true}}
/* take out marks whose sheet was left out, or moved to another candidate or paper */
function omrPrune(x){const O=omrOf(x),A=O.applied||{},S=omrScans(x);let n=0;
 Object.entries(A).forEach(([key,sid])=>{const i=key.indexOf("|"),k=key.slice(0,i),pid=key.slice(i+1),s=S.find(z=>z.id===sid);
  if(s&&s.use&&s.pid===pid&&s.spec===k)return;delete A[key];
  const other=S.find(z=>z.use&&z.pid===pid&&z.spec===k&&!omrNeeds(x,z));if(other)return;
  const M=exPM(x,k);if(M.marks[pid]!=null){delete M.marks[pid];if(M.raw)delete M.raw[pid];if(M.secs)delete M.secs[pid];if(!exIsCommon(x,k)&&x.res)delete x.res[pid];n++}});
 return n}
/* leaving a sheet out, or giving it to someone else, takes its earlier mark back out at once */
document.addEventListener("click",e=>{const a=e.target.closest('[data-act="omr-skip"],[data-act="omr-keep"]');if(!a||!DB||!DB.exams)return;
 setTimeout(()=>{const x=DB.exams.find(v=>v.id===route.id);if(!x||!omrOf(x).applied)return;const n=omrPrune(x);if(n){xlog(x,`OMR: ${n} result${n>1?"s":""} taken out (sheet left out)`);persist();render();toast(`${n} earlier result${n>1?"s":""} taken out`)}},0)});
/* the review card can set the paper of a sheet */
{const _c=omrReviewCard;omrReviewCard=function(x,s){let h=_c(x,s);const open=omrOpen(x,s);
 if(open.includes("issue")&&s.issue==="misaligned")h=h.replace(esc(OMR_ISSUE.misaligned)+"</b>",esc(OMR_ISSUE.misaligned)+`</b><span>The scan may be cut too close or stretched, so answers may have been read from the wrong circles. Open <b>View sheet</b> and compare with the questions below, or rescan this sheet with a little white margin around it.</span>`);
 if(open.includes("issue")&&s.issue==="roll-clash"&&s.rollClash){const o=DB.pgts.find(q=>q.id===s.rollClash),me=DB.pgts.find(q=>q.id===s.pid);h=h.replace(esc(OMR_ISSUE["roll-clash"])+"</b>",esc(OMR_ISSUE["roll-clash"])+`</b><span>The sheet was printed for Dr. ${esc(me?me.name:"")}, but roll number ${esc(s.roll||"")} (Dr. ${esc(o?o.name:"")}) is filled in. Choose whose answers these are.</span>`)}
 if(!open.includes("issue")||!["no-paper","other-paper","paper-check"].includes(s.issue))return h;
 const ks=Object.keys(omrOf(x).specs);if(ks.length<2&&s.spec)return h;
 const sel=`<label class="f">Paper on this sheet<select data-omrpaper="${s.id}">${opt([["","Choose the paper"],...ks.map(k=>[k,`${k} · ${omrSpec(x,k).n} questions`])],s.spec||"")}</select></label>`;
 const at=h.indexOf('<div class="actions" style="justify-content:flex-start">');return at<0?h:h.slice(0,at)+sel+h.slice(at)}}
document.addEventListener("change",async e=>{const w=e.target.closest("[data-omrpaper]");if(!w||!w.value||!DB||!DB.exams)return;
 const x=DB.exams.find(v=>v.id===route.id),s=x&&omrScans(x).find(v=>v.id===w.dataset.omrpaper);if(!s)return;const k=w.value;
 await omrLoad(OMR_JSQR).catch(()=>{});let r;try{r=await omrFixOne(x,s,s.pid,true,k)}catch(err){r="noimg"}
 if(r==="noimg"){toast("The picture of this sheet is not available; scan it again.");return}
 delete s.okIssue;xlog(x,`OMR: sheet ${s.file} read again as the ${k} paper`);omrDupes(x);omrPrune(x);persist();render();toast(`Read again as the ${k} paper`)});
/* the screen is not drawn before the records have loaded (e.g. the address changes while signing in) */
{const _r=render;render=function(...a){if(!DB||!DB.pgts)return;return _r.apply(this,a)}}
