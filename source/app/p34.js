
/* =====================================================================
   V32 · ANSWER KEYS FROM EXCEL. In the Answer key window: Upload Excel /
   Download template (Question, Answer, Also accept, Drop). On the Papers
   tab: one workbook for the whole exam, one sheet per paper.
   ===================================================================== */
EXPORTS.omrkey=(id,enc)=>{const x=DB.exams.find(e=>e.id===id),sp=decodeURIComponent(enc),k=omrSpec(x,sp),a=UI.omrK&&UI.omrK.sp===sp?UI.omrK.a:omrKeyArr(k),dr=new Set(k.drop||[]),al=k.alt||{};
  return{file:`Answer key template ${sp} ${x.session}`,sheets:[{name:"Answer key",rows:[["Question","Answer","Also accept","Drop"],...Array.from({length:k.n},(_,i)=>[i+1,a[i]||"",al[i+1]||"",dr.has(i+1)?"Y":""])]},
   {name:"How to fill",rows:[["How to fill this sheet"],["Keep the first row (the headings) as it is."],["Question: the question number, 1 to "+k.n+"."],["Answer: one letter, "+"ABCDE".slice(0,k.opts).split("").join(", ")+"."],["Also accept (optional): a second correct letter for that question."],["Drop (optional): Y to drop the question so nobody loses marks."],["Then use Upload Excel in the answer key window. Only the first sheet is read."]]}]}};
document.addEventListener("change",e=>{const t=e.target;if(t.id==="omrk-xl"&&t.files[0]){const f=t.files[0];t.value="";omrKeyImport(f)}});
const omrNormKey=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const omrSheetName=k=>k.replace(/[\\/?*[\]:]/g," ").slice(0,31);
/* whole-exam template: a sheet for every paper that is set up, pre-filled with any key already entered */
EXPORTS.omrkeys=xid=>{const x=DB.exams.find(e=>e.id===xid),O=omrOf(x),keys=[...new Set([...exAllPapers(x),...Object.keys(O.specs)])];
 /* papers not set up yet get the usual length (General Cardiology 100, others 50); the upload sets them up */
 const sheets=keys.map(k=>{const s=O.specs[k]||{n:/^General Cardiology/.test(k)?100:50,opts:5,key:"",drop:[],alt:{}},a=omrKeyArr(s),dr=new Set(s.drop||[]),al=s.alt||{};return{name:omrSheetName(k),rows:[["Question","Answer","Also accept","Drop"],...Array.from({length:s.n},(_,i)=>[i+1,a[i]||"",al[i+1]||"",dr.has(i+1)?"Y":""])]}});
 sheets.push({name:"How to fill",rows:[["How to fill this file"],["One sheet per paper. Keep each sheet's name: it tells the app which paper the answers belong to."],["Answer: one letter per question. Also accept (optional): a second correct letter. Drop (optional): Y."],["Then use Upload answer keys (Excel) on the Papers tab. Every paper is filled in one go."]]});
 return{file:`Answer keys ${x.session}`,sheets}};
document.addEventListener("change",async e=>{if(e.target.id!=="omrk-all"||!e.target.files[0])return;const f=e.target.files[0];e.target.value="";const x=DB.exams.find(v=>v.id===route.id);if(!x)return;
 try{if(!window.XLSX)throw new Error("The Excel library did not load. Check the connection and reload.");const wb=XLSX.read(await f.arrayBuffer(),{type:"array"}),papers=[...new Set([...exAllPapers(x),...Object.keys(omrOf(x).specs)])],done=[],skip=[],bad=[],empty=[];
  for(const nm of wb.SheetNames){if(/^how to fill/i.test(nm))continue;const key=papers.find(k=>omrNormKey(omrSheetName(k))===omrNormKey(nm))||(papers.length===1&&wb.SheetNames.length<=2?papers[0]:null);if(!key){skip.push(nm);continue}
   const aoa0=XLSX.utils.sheet_to_json(wb.Sheets[nm],{header:1,raw:false,defval:null});
   /* a paper not set up yet: set it up from the sheet (number of questions = last question number, 5 options) */
   if(!aoa0.slice(1).some(r=>r&&String(r[1]??"").trim())){empty.push(nm);continue}
   if(!omrSpec(x,key)){const nq=Math.max(0,...aoa0.map(r=>parseInt(String((r||[])[0]??""),10)||0));if(nq<5){skip.push(nm);continue}const ns=omrSpec(x,key,true);ns.n=nq;ns.opts=aoa0.some(r=>/^\s*E\s*$/i.test(String((r||[])[1]??"")))||!aoa0.length?5:ns.opts}
   const s=omrSpec(x,key),L="ABCDE".slice(0,s.opts).split(""),r=omrKeyParse(XLSX.utils.sheet_to_json(wb.Sheets[nm],{header:1,raw:false,defval:null}),s.n,L);
   if(!Object.keys(r.key).length){skip.push(nm);continue}
   const a=omrKeyArr(s);Object.entries(r.key).forEach(([q,v])=>a[q-1]=v);s.key=a.map(v=>v||"-").join("");s.alt={...(s.alt||{}),...r.alt};if(r.drop.length)s.drop=[...new Set([...(s.drop||[]),...r.drop])].sort((p,q)=>p-q);
   done.push(`${key} (${omrKeyDone(s)}/${s.n})`);r.bad.forEach(b=>bad.push(`${key}: ${b}`))}
  if(done.length){xlog(x,`Answer keys uploaded from ${f.name}: ${done.join(", ")}`);if(omrScans(x).some(z=>z.use&&exPM(x,z.spec).marks[z.pid]!=null))omrApply(x);persist();render()}
  toast(done.length?`Keys loaded: ${done.join(", ")}${skip.length?`. Not matched to a paper: ${skip.join(", ")}`:""}${empty.length?`. Left empty: ${empty.length} sheet${empty.length>1?"s":""}`:""}${bad.length?`. Check: ${bad.slice(0,3).join("; ")}`:""}`:(empty.length&&!skip.length?"The sheets have no answers filled in yet.":"No sheet matched a paper. Use the template so the sheet names match the papers."))}
 catch(err){toast(err.message||"That file could not be read")}});
{const _p=exPapersTab;exPapersTab=function(x){return _p(x).replace('<div class="actions" style="justify-content:flex-start">',`<div class="actions" style="justify-content:flex-start">${xbtn(`omrkeys:${x.id}`,"Answer key template (all papers)")}<label class="btn small" for="omrk-all">Upload answer keys (Excel)</label><input type="file" id="omrk-all" accept=".xlsx,.xls" class="sr">`)}}
