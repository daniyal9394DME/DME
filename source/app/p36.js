
/* =====================================================================
   V34 · EXAM ATTENDANCE SHEETS: a printable A4 sheet per paper (or all
   papers in one PDF): roll no., name, PGT ID, year, signature, with a
   few blank rows for walk-ins and an invigilator block at the end.
   ===================================================================== */
async function exAttPdf(x,keys){try{await bioLoadPdf()}catch(e){toast(e.message);return}
 const{jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"}),W=210,M=14,logo=document.querySelector('img[alt="RIC logo"]')?.src;
 const dt=x.date?P(x.date).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"";
 const cols=[["Sr.",9],["Roll No.",20],["Name",50],["PGT ID",24],["Year",11],["Signature",34],["Paper submitted",34]];const RH=9,brand=[109,31,43];let first=true,total=0;
 const T=(t,x0,y,o={})=>{doc.setFont("helvetica",o.b?"bold":"normal");doc.setFontSize(o.s||10);doc.setTextColor(...(o.c||[20,20,20]));doc.text(String(t),x0,y,{align:o.a||"left"})};
 for(const k of keys){const C=exCands(x).filter(p=>exInPaper(x,p,k)).sort((a,b)=>(x.roll?.[a.id]||"~").localeCompare(x.roll?.[b.id]||"~")||a.name.localeCompare(b.name));if(!C.length)continue;total+=C.length;
  const rows=[...C.map(p=>({roll:x.roll?.[p.id]||rollOf(p)||"",name:candName(p),code:candId(p),yr:examYear(x,p)?String(examYear(x,p)):""})),{},{},{}];
  /* split into pages: 24 rows fit a page; the last page also needs room for the invigilator block (4 rows) */
  const cap=24,chunks=[];let rest=rows.slice();while(rest.length){let n=Math.min(cap,rest.length);if(n===rest.length&&n>cap-4)n=rest.length>cap-4&&rest.length<=cap?rest.length-(n-(cap-4)):n;if(n<1)n=1;chunks.push(rest.slice(0,n));rest=rest.slice(n)}
  if(chunks.length&&chunks[chunks.length-1].length>cap-4)chunks.push([]);
  let sr=0;chunks.forEach((chunk,pi)=>{if(!first)doc.addPage();first=false;
   if(logo&&logo.startsWith("data:"))try{doc.addImage(logo,"JPEG",M,10,18,18)}catch(e){}
   T("RAWALPINDI INSTITUTE OF CARDIOLOGY",W/2,15,{a:"center",b:1,s:13,c:brand});T("Department of Medical Education and Training",W/2,20.5,{a:"center",s:9.5,c:[110,110,110]});
   T("ATTENDANCE SHEET",W/2,28,{a:"center",b:1,s:12});doc.setDrawColor(...brand);doc.setLineWidth(.5);doc.line(M,31.5,W-M,31.5);
   T(`${x.title}  |  ${x.session}`,M,37.5,{b:1,s:10});T(`Paper: ${k}`,M,43,{b:1,s:10.5,c:brand});
   T(`Date: ${dt||"______________"}`,W-M,37.5,{a:"right",s:9.5});T(`Venue: ${x.venue||"______________"}`,W-M,43,{a:"right",s:9.5});
   T(`Candidates: ${C.length}${chunks.length>1?`   |   Page ${pi+1} of ${chunks.length}`:""}`,M,48.5,{s:8.5,c:[110,110,110]});T("Sign under Signature on arrival, and under Paper submitted when you hand in your paper.",W-M,48.5,{a:"right",s:8,c:[110,110,110]});
   let y=52;if(chunk.length){doc.setFillColor(243,236,226);doc.rect(M,y,W-2*M,8,"F");let cx=M;cols.forEach(([h])=>{T(h,cx+2,y+5.4,{b:1,s:9});cx+=cols.find(c=>c[0]===h)[1]});y+=8}
   doc.setDrawColor(150,150,150);doc.setLineWidth(.2);
   chunk.forEach(r=>{sr++;let cx=M;const vals=r.name?[String(sr),r.roll,r.name,r.code,r.yr,"",""]:[String(sr),"","","","","",""];
    cols.forEach(([,w],c)=>{doc.rect(cx,y,w,RH);if(vals[c]){let t=vals[c],fs=c===1||c===3?9:9.5;if(c===2){fs=9.2;doc.setFont("helvetica","normal");doc.setFontSize(fs);while(fs>7.6&&doc.getTextWidth(t)>w-3.5){fs-=.2;doc.setFontSize(fs)}if(doc.getTextWidth(t)>w-3.5){let n=t.length;while(n>4&&doc.getTextWidth(t.slice(0,n)+"...")>w-3.5)n--;t=t.slice(0,n).trim()+"..."}}T(t,cx+2,y+5.9,{s:fs,b:c===1})}cx+=w});y+=RH});
   if(pi===chunks.length-1){y+=8;T("Present: ________     Absent: ________     Papers submitted: ________     Total on list: "+C.length,M,y,{s:9.5});y+=11;
    T("Invigilator name: ______________________________",M,y,{s:9.5});T("Signature: ____________________",W-M,y,{a:"right",s:9.5});y+=9;
    T("Blank rows at the end are for candidates not on the list: write the name and PGT ID and inform the DME&T office.",M,y,{s:7.5,c:[120,120,120]})}})}
 if(!total){toast("No candidates on these papers");return}
 doc.save(`Attendance ${keys.length===1?keys[0]:"all papers"} ${x.session}`.replace(/[\\/:*?"<>|·]+/g," ").replace(/\s+/g," ")+".pdf");xlog(x,`Attendance sheet downloaded: ${keys.length===1?keys[0]:keys.length+" papers"}`);persist();toast("Attendance sheet ready")}
/* buttons: one per paper on the Papers tab, and one for all papers */
{const _p=exPapersTab;exPapersTab=function(x){let h=_p(x);
 h=h.replace('<div class="actions" style="justify-content:flex-start">','<div class="actions" style="justify-content:flex-start"><button class="btn small" data-act="ex-attall">Attendance sheets (all papers)</button>');
 /* add an Attendance button next to each paper's OMR buttons */
 h=h.replace(/<button class="btn small\s*(primary)?\s*" data-act="omr-setup" data-sp="([^"]*)">/g,(m,pr,k)=>`<button class="btn small" data-act="ex-att" data-sp="${k}">Attendance sheet</button>${m}`);return h}}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="ex-att"],[data-act="ex-attall"]');if(!b)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;
 const div=document.createElement("textarea");div.innerHTML=b.dataset.sp||"";const k=div.value;
 exAttPdf(x,b.dataset.act==="ex-att"?[k]:exAllPapers(x))});
