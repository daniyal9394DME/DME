
/* =====================================================================
   V42 · OMR: start a paper (or the whole exam) again. Removes the scanned
   sheets and the marks they put into the exam, so the PDFs can be
   uploaded again from scratch.
   ===================================================================== */
function omrRedoCounts(x,k){const base=f=>String(f||"").replace(/ p\d+$/,""),files=new Set(omrScans(x).filter(s=>s.spec===k).map(s=>base(s.file)));
 /* sheets of the same scanned file whose paper was never worked out go too */
 const S=omrScans(x).filter(s=>k==="*"||s.spec===k||(!s.spec&&(k==="*"||files.has(base(s.file)))));
 const keys=k==="*"?exAllPapers(x):[k];let marks=0,abs=0,hand=0;
 keys.forEach(pk=>{const M=exPM(x,pk),C=exCands(x).filter(p=>exInPaper(x,p,pk)),scanned=new Set(omrScans(x).filter(s=>s.spec===pk&&s.pid).map(s=>s.pid));
  C.forEach(p=>{if(M.marks[p.id]!=null){if(scanned.has(p.id))marks++;else hand++}if(M.absent[p.id])abs++})});
 return{S,keys,marks,abs,hand}}
function omrRedoSheet(x){const papers=exAllPapers(x);
 const optsFor=()=>[["*","All papers"],...papers.map(k=>[k,k])];
 const info=k=>{const c=omrRedoCounts(x,k);return`${c.S.length} scanned sheet${c.S.length===1?"":"s"} · ${c.marks} mark${c.marks===1?"":"s"} from scanning${c.hand?` · ${c.hand} typed by hand or from Evalbee`:""}${c.abs?` · ${c.abs} marked absent`:""}`};
 openSheet("Remove scanned sheets and results",`<p style="margin:0">Use this to start a paper again, then upload all the PDFs afresh. Answer keys and paper set-up are kept.</p>
  <label class="f">Which paper<select name="k">${opt(optsFor(),"*")}</select></label>
  <p class="subt" id="redo-info" style="margin:0">${info("*")}</p>
  <label class="check2"><input type="checkbox" name="sheets" checked> Remove the scanned sheets and their pictures</label>
  <label class="check2"><input type="checkbox" name="marks" checked> Remove the marks they put into the exam</label>
  <label class="check2"><input type="checkbox" name="abs" checked> Clear "absent" for this paper</label>
  <label class="check2"><input type="checkbox" name="hand"> Also remove marks typed by hand or uploaded from Evalbee</label>
  ${(x.stage||0)>=5?`<div class="flag">Results for this exam are already published. PGTs will see their marks disappear until you put the new results in.</div>`:""}
  <label class="check2" style="margin-top:6px"><input type="checkbox" name="sure"> I understand this cannot be undone</label>`,()=>{
  const k=fv("k"),on=n=>{const el=document.querySelector(`#sheetform [name="${n}"]`);return el&&el.checked};if(!on("sure"))return fail("Tick “I understand this cannot be undone” to go ahead.");
  if(!on("sheets")&&!on("marks")&&!on("abs")&&!on("hand"))return fail("Tick at least one thing to remove.");
  const c=omrRedoCounts(x,k);let nm=0,na=0,ns=0;
  c.keys.forEach(pk=>{const M=exPM(x,pk),C=exCands(x).filter(p=>exInPaper(x,p,pk)),scanned=new Set(omrScans(x).filter(s=>s.spec===pk&&s.pid).map(s=>s.pid));
   C.forEach(p=>{if(M.marks[p.id]!=null&&((on("marks")&&scanned.has(p.id))||(on("hand")&&!scanned.has(p.id)))){delete M.marks[p.id];if(M.raw)delete M.raw[p.id];if(M.secs)delete M.secs[p.id];if(!exIsCommon(x,pk)&&x.res)delete x.res[p.id];nm++}
    if(on("abs")&&M.absent[p.id]){delete M.absent[p.id];na++}})});
  if(on("sheets")){const gone=new Set(c.S.map(s=>s.id));const paths=c.S.map(s=>s.img).filter(Boolean);ns=gone.size;
   omrOf(x).scans=omrScans(x).filter(s=>!gone.has(s.id));gone.forEach(id=>delete UI.omrImg[id]);
   if(LIVE&&SYNC.sb&&paths.length)SYNC.sb.storage.from("dme-uploads").remove(paths).catch(()=>{})}
  xlog(x,`Started again: ${k==="*"?"all papers":k} · ${ns} scanned sheets removed, ${nm} marks removed${na?`, ${na} absent cleared`:""}`);
  UI.omrTab="review";toast(`Removed ${ns} sheet${ns===1?"":"s"} and ${nm} mark${nm===1?"":"s"}. Upload the PDFs again.`);return true},"Remove")}
document.addEventListener("change",e=>{if(e.target.name==="k"&&e.target.closest("#sheetform")&&document.getElementById("redo-info")){const x=DB.exams.find(v=>v.id===route.id);if(!x)return;
 const c=omrRedoCounts(x,e.target.value);document.getElementById("redo-info").textContent=`${c.S.length} scanned sheet${c.S.length===1?"":"s"} · ${c.marks} mark${c.marks===1?"":"s"} from scanning${c.hand?` · ${c.hand} typed by hand or from Evalbee`:""}${c.abs?` · ${c.abs} marked absent`:""}`}});
{const _p=omrScanPanel;omrScanPanel=function(x){const h=_p(x);if(isViewer()||!h)return h;const any=omrScans(x).length||exAllPapers(x).some(k=>Object.keys(exPM(x,k).marks).length);if(!any)return h;
 return h.replace(/(<label class="btn small primary" for="omr-file"[^>]*>[^<]*<\/label><input type="file" id="omr-file"[^>]*>)/,'<span class="actions">$1<button class="btn small" data-act="omr-redo" title="Remove scanned sheets and results, then upload again">Start again…</button></span>')}}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="omr-redo"]');if(!b)return;const x=DB.exams.find(v=>v.id===route.id);if(x)omrRedoSheet(x)});
