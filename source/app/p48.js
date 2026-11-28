/* =====================================================================
   V46 · RESULT SHEETS. A formal result per specialty (its paper or
   papers, plus any common paper its candidates sat) or per common
   paper: an A4 PDF with the RIC header, a summary of each paper and
   signature lines, or an Excel workbook with the same content.
   ===================================================================== */
const RS_PUNJAB="__PUNJAB__";
const RS_SIG="Director Medical Education and Training\nHead of Department\nExecutive Director",RS_SIG_OLD="Head of Department\nDirector Medical Education and Training";
const rs1=v=>v==null||isNaN(v)?"":Math.round(v*10)/10;
/* the pass mark as it reads on a formal sheet */
function rsPass(x,k,T){const r=(x.passPaper||{})[k];if(r&&r.mode==="marks"&&T)return`${r.marks} of ${T} marks (${(r.marks/T*100).toFixed(1)}%)`;
 const v=+exPassFor(x,k);return T?`${+v.toFixed(2)}% (${Math.ceil(v*T/100-1e-9)} of ${T} marks)`:`${+v.toFixed(2)}%`}
/* one paper's rows and figures; spec limits a common paper to one specialty's candidates */
function rsData(x,k,spec,o){const com=exIsCommon(x,k),M=exPM(x,k),T=paperTotal(x,k),S=typeof omrSpec==="function"?omrSpec(x,k):null;
 const C=exCands(x).filter(p=>exInPaper(x,p,k)&&(!spec||p.spec===spec));
 let R=C.map(p=>{const ab=!!M.absent[p.id],m=ab?null:M.marks[p.id]??null,r=M.raw&&M.raw[p.id];let ob=null,tt=T;
  if(m!=null&&r&&r.t){ob=r.o;tt=r.t}else if(m!=null&&T){const v=m*T/100;if(Math.abs(v-Math.round(v))<.06)ob=Math.round(v)}
  const res=ab?"Absent":m==null?"Awaited":(com?exCommPass(x,k,m):exPass(x,p,m))?"Pass":"Fail";
  return{p,roll:(x.roll&&x.roll[p.id])||rollOf(p)||"",m,ab,ob,tt,res,secs:(M.secs&&M.secs[p.id])||null,yr:examYear(x,p)||""}});
 const sat=R.filter(r=>r.m!=null).sort((a,b)=>b.m-a.m);sat.forEach((r,i)=>{r.pos=i&&sat[i-1].m===r.m?sat[i-1].pos:i+1});
 const ms=sat.map(r=>r.m),st={reg:R.length,sat:sat.length,abs:R.filter(r=>r.ab).length,wait:R.filter(r=>r.res==="Awaited").length,pass:R.filter(r=>r.res==="Pass").length,fail:R.filter(r=>r.res==="Fail").length};
 st.rate=st.sat?st.pass/st.sat*100:null;st.hi=ms.length?Math.max(...ms):null;st.lo=ms.length?Math.min(...ms):null;st.avg=ms.length?ms.reduce((a,b)=>a+b,0)/ms.length:null;
 if(o.noAbs)R=R.filter(r=>!r.ab);
 const byRoll=(a,b)=>String(a.roll||"~").localeCompare(String(b.roll||"~"))||a.p.name.localeCompare(b.p.name);
 R.sort(o.order==="merit"?(a,b)=>(a.m==null)-(b.m==null)||(b.m??0)-(a.m??0)||byRoll(a,b):o.order==="name"?(a,b)=>a.p.name.localeCompare(b.p.name):com&&!spec?(a,b)=>specIdx(a.p.spec)-specIdx(b.p.spec)||byRoll(a,b):byRoll);
 const drop=new Set(S&&S.drop||[]);const secs=o.secs&&S&&(S.sections||[]).length>1?S.sections.filter(z=>z.name).map(z=>{let n=0;for(let q=z.from;q<=z.to;q++)if(!drop.has(q))n++;return{name:z.name,n}}):[];
 const notes=[];if(drop.size){const L=[...drop].sort((a,b)=>a-b);notes.push(`Question${L.length>1?"s":""} ${L.join(", ")} ${L.length>1?"were":"was"} withdrawn from marking${T?`; marks are out of ${T}`:""}.`)}
 const alt=S&&S.alt?Object.keys(S.alt).sort((a,b)=>a-b):[];if(alt.length)notes.push(`Two answers were accepted for question${alt.length>1?"s":""} ${alt.join(", ")}.`);
 if(st.wait)notes.push(`${st.wait} candidate${st.wait>1?"s have":" has"} no marks entered yet ("Awaited").`);
 return{k,com,spec,T,R,st,secs,notes,pass:rsPass(x,k,T)}}
/* the columns, shared by the PDF and the Excel file */
function rsCols(d,o){const progs=d.R.some(r=>r.p.program),all=d.com&&!d.spec,C=[];
 C.push({h:"Sr.",w:8,a:"center",v:(r,i)=>String(i+1)});
 C.push({h:"Roll No.",w:15,a:"center",v:r=>r.roll});
 C.push({h:"Name of candidate",w:0,v:r=>candName(r.p)});
 if(all)C.push({h:"Specialty",w:30,v:r=>r.p.spec});
 C.push({h:"PGT ID",w:24,v:r=>candId(r.p)});
 if(progs)C.push({h:"Prog.",w:13,a:"center",v:r=>r.p.program||""});
 C.push({h:"Year",w:9,a:"center",v:r=>r.yr?String(r.yr):"",x:r=>r.yr||""});
 if(o.pos)C.push({h:"Position",w:14,a:"center",v:r=>r.m!=null?String(r.pos):"—",x:r=>r.m!=null?r.pos:""});
 d.secs.forEach(z=>C.push({h:`${z.name} (${z.n})`,w:17,a:"center",v:r=>{const s=r.secs&&r.secs[z.name];return s&&r.m!=null?`${s[0]}`:"—"},x:r=>{const s=r.secs&&r.secs[z.name];return s&&r.m!=null?s[0]:""}}));
 C.push({h:"Marks",xh:d.T?`Marks (out of ${d.T})`:"Marks",w:18,a:"center",v:r=>r.ob!=null?`${r.ob} / ${r.tt}`:"—",x:r=>r.ob!=null?r.ob:""});
 C.push({h:"%",w:12,a:"center",v:r=>r.m!=null?(+r.m).toFixed(1):"—",x:r=>r.m!=null?+r.m:""});
 C.push({h:"Result",w:16,a:"center",v:r=>r.res,res:1});
 return C}
const rsSpecs=x=>{const A=exAllPapers(x),C=exCands(x);return exSpecs(x).filter(s=>A.some(k=>exIsCommon(x,k)?C.some(p=>p.spec===s&&exInPaper(x,p,k)):exPaperSpec(k)===s))};
function rsUnits(x,o){const sig=String(o.sig||"").split("\n").map(s=>s.trim()).filter(Boolean).slice(0,4),C=exCands(x);
 const spU=s=>{const ks=exAllPapers(x).filter(k=>!exIsCommon(x,k)&&exPaperSpec(k)===s),cs=o.common?exCommon(x).map(c=>c.name).filter(n=>C.some(p=>p.spec===s&&exInPaper(x,p,n))):[];
  return{title:s,kind:"Specialty",papers:[...ks.map(k=>rsData(x,k,null,o)),...cs.map(k=>rsData(x,k,s,o))].filter(d=>d.st.reg),sig}};
 const w=o.who||"all";let U=[];
 if(w==="all")U=rsSpecs(x).map(spU);else if(w.startsWith("s:"))U=[spU(w.slice(2))];else if(w.startsWith("c:")){const k=w.slice(2);U=[{title:k,kind:"Common paper",papers:[rsData(x,k,null,o)].filter(d=>d.st.reg),sig}]}
 return U.filter(u=>u.papers.length)}
const rsAbbr=k=>k.length<=14?k:k.split(/\s+/).filter(w=>!/^(and|of|the|&|in|for)$/i.test(w)).map(w=>w[0].toUpperCase()).join("");
const rsWho=o=>o.who==="all"?"all specialties":o.who.slice(2);
const rsFile=(x,o,ext)=>`Result ${rsWho(o)} ${x.session}`.replace(/[\\/:*?"<>|·]+/g," ").replace(/\s+/g," ").trim()+ext;

async function rsPdf(x,o){try{await bioLoadPdf()}catch(e){toast(e.message);return}
 const U=rsUnits(x,o);if(!U.length){toast("No candidates on this result");return}
 const{jsPDF}=window.jspdf,M=13,BR=[109,31,43],GOLD=[176,141,87],INK=[28,28,28],GR=[108,108,108],GRN=[22,112,62],RED=[178,34,34];
 /* landscape only when the columns do not fit on an upright page */
 const fits=cw=>U.every(u=>u.papers.every(d=>cw-rsCols(d,o).reduce((a,c)=>a+c.w,0)>=38));const land=!fits(210-2*M);
 const doc=new jsPDF({unit:"mm",format:"a4",orientation:land?"landscape":"portrait"}),W=land?297:210,H=land?210:297,CW=W-2*M;
 const ric=document.querySelector('img[alt="RIC logo"]')?.src,pun=RS_PUNJAB.startsWith("data:")?RS_PUNJAB:null;
 const T=(t,x0,y,q={})=>{doc.setFont(q.f||"helvetica",q.b&&q.i?"bolditalic":q.b?"bold":q.i?"italic":"normal");doc.setFontSize(q.s||9);doc.setTextColor(...(q.c||INK));doc.text(String(t),x0,y,{align:q.a||"left",charSpace:q.cs||0})};
 const issued=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
 const dt=x.date?P(x.date).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"";
 let y=0,first=true,cur=null;
 const full=u=>{if(ric&&ric.startsWith("data:"))try{doc.addImage(ric,"JPEG",M,9,23,23)}catch(e){}
  if(pun)try{doc.addImage(pun,"JPEG",W-M-25.8,9,25.8,23)}catch(e){}
  T("RAWALPINDI INSTITUTE OF CARDIOLOGY",W/2,16.5,{f:"times",b:1,s:16,c:BR,a:"center"});T("RAWAL ROAD, RAWALPINDI",W/2,22,{s:8.2,c:GR,a:"center",cs:.6});
  T("Department of Medical Education and Training",W/2,27.8,{f:"times",i:1,s:11.5,a:"center"});
  doc.setDrawColor(...BR);doc.setLineWidth(.7);doc.line(M,35,W-M,35);doc.setDrawColor(...GOLD);doc.setLineWidth(.3);doc.line(M,36.3,W-M,36.3);
  T("RESULT",W/2,45.5,{f:"times",b:1,s:18,a:"center",cs:2.2});T(`${x.title}  ·  ${x.session}`,W/2,52,{s:10.5,c:GR,a:"center"});
  if(o.ref)T(`Ref. No.: ${o.ref}`,M,59,{s:8.5});T(`Date of issue: ${issued}`,W-M,59,{s:8.5,a:"right"});
  doc.setFillColor(...BR);doc.rect(M,62,CW,9,"F");T(`${u.kind.toUpperCase()}:  ${u.title}`,M+3.5,67.9,{b:1,s:10.5,c:[255,255,255]});
  const n=new Set(u.papers.flatMap(d=>d.R.map(r=>r.p.id))).size;T(`${u.papers.length} paper${u.papers.length>1?"s":""}  ·  ${n} candidate${n>1?"s":""}`,W-M-3.5,67.9,{s:8.5,c:[255,255,255],a:"right"});y=78};
 const cont=u=>{if(ric&&ric.startsWith("data:"))try{doc.addImage(ric,"JPEG",M,7,10,10)}catch(e){}
  T("RAWALPINDI INSTITUTE OF CARDIOLOGY",M+13,11,{f:"times",b:1,s:10,c:BR});T(`Result · ${x.title} · ${x.session}`,M+13,15.5,{s:7.8,c:GR});T(`${u.title} (continued)`,W-M,13,{s:8.5,b:1,a:"right"});
  doc.setDrawColor(...BR);doc.setLineWidth(.4);doc.line(M,19,W-M,19);y=25};
 const page=(u,isFull)=>{if(!first)doc.addPage();first=false;cur=u;isFull?full(u):cont(u)};
 const room=h=>y+h<=H-17;
 for(const u of U){page(u,true);
  u.papers.forEach((d,pi)=>{const cols=rsCols(d,o),fixed=cols.reduce((a,c)=>a+c.w,0);cols.find(c=>c.w===0).w=CW-fixed;
   doc.setFont("helvetica","bold");doc.setFontSize(7.8);const hl=cols.map(c=>doc.splitTextToSize(c.h,c.w-2));const HH=Math.max(...hl.map(l=>l.length))*3.3+3.4;
   const thead=()=>{doc.setFillColor(...BR);doc.rect(M,y,CW,HH,"F");let cx=M;cols.forEach((c,i)=>{const L=hl[i];L.forEach((s,j)=>T(s,c.a==="center"?cx+c.w/2:cx+1.8,y+(HH-L.length*3.3)/2+2.6+j*3.3,{b:1,s:7.8,c:[255,255,255],a:c.a==="center"?"center":"left"}));cx+=c.w});y+=HH};
   if(!room(19+HH+3*7.2))page(u,false);
   /* paper heading */
   doc.setFillColor(247,242,235);doc.rect(M,y,CW,15,"F");doc.setFillColor(...BR);doc.rect(M,y,1.6,15,"F");
   T(`Paper${u.papers.length>1?` ${pi+1}`:""}: ${d.k}${d.com?(d.spec?`  (common paper · ${d.spec} candidates)`:"  (common paper)"):""}`,M+5,y+6,{b:1,s:10.2});
   T([dt?`Date: ${dt}`:"",d.T?`Total marks: ${d.T}`:"",`Pass marks: ${d.pass}`].filter(Boolean).join("     ·     "),M+5,y+11.4,{s:8,c:GR});y+=18.5;
   thead();doc.setFont("helvetica","normal");doc.setFontSize(8.6);
   d.R.forEach((r,i)=>{const vals=cols.map(c=>c.v(r,i)),nm=cols.findIndex(c=>c.w&&c.h==="Name of candidate");doc.setFont("helvetica","normal");doc.setFontSize(8.6);
    const lines=cols.map((c,j)=>j===nm||c.h==="Specialty"?doc.splitTextToSize(vals[j],c.w-3).slice(0,2):[vals[j]]),rh=Math.max(...lines.map(l=>l.length))>1?10.4:7.2;
    if(!room(rh)){page(u,false);thead()}
    if(i%2){doc.setFillColor(250,248,245);doc.rect(M,y,CW,rh,"F")}doc.setDrawColor(222,214,204);doc.setLineWidth(.15);doc.line(M,y+rh,W-M,y+rh);
    let cx=M;cols.forEach((c,j)=>{const L=lines[j],col=c.res?(r.res==="Pass"?GRN:r.res==="Fail"?RED:GR):j===nm?INK:[50,50,50];
     L.forEach((s,k2)=>T(s,c.a==="center"?cx+c.w/2:cx+1.8,y+rh/2+1.25+(k2-(L.length-1)/2)*3.5,{s:c.res?8.4:8.6,b:!!c.res&&r.res!=="Awaited",i:!!c.res&&r.res==="Awaited",c:col,a:c.a==="center"?"center":"left"}));cx+=c.w});y+=rh});
   doc.setDrawColor(...BR);doc.setLineWidth(.4);doc.line(M,y,W-M,y);y+=4;
   /* summary of the paper */
   const st=d.st,tiles=[["Candidates",st.reg],["Appeared",st.sat],["Absent",st.abs],...(st.wait?[["Awaited",st.wait]]:[]),["Passed",st.pass,GRN],["Failed",st.fail,RED],["Pass rate",st.rate==null?"—":rs1(st.rate)+"%"],["Highest",st.hi==null?"—":rs1(st.hi)+"%"],["Average",st.avg==null?"—":rs1(st.avg)+"%"]];
   if(!room(17+d.notes.length*4.5)){page(u,false)}
   const tw=(CW-(tiles.length-1)*1.6)/tiles.length;tiles.forEach(([l,v,c],i)=>{const tx=M+i*(tw+1.6);doc.setFillColor(250,248,245);doc.setDrawColor(226,216,204);doc.setLineWidth(.2);doc.rect(tx,y,tw,13.5,"FD");
    T(l.toUpperCase(),tx+tw/2,y+4.6,{s:6.4,c:GR,a:"center",cs:.2});T(String(v),tx+tw/2,y+10.6,{b:1,s:11,c:c||INK,a:"center"})});y+=17;
   d.notes.forEach(n=>{T(n,M,y,{i:1,s:7.8,c:GR});y+=4.5});y+=5});
  /* closing: status line and signatures */
  if(!room(44))page(u,false);
  if(o.prov){T("This result is provisional and subject to verification by the Department of Medical Education and Training.",M,y+2,{i:1,s:8,c:GR});y+=6}
  else{T("This result has been verified by the Department of Medical Education and Training.",M,y+2,{i:1,s:8,c:GR});y+=6}
  if(u.sig.length){y+=19;const sw=CW/u.sig.length;u.sig.forEach((s,i)=>{const cx=M+sw*i+sw/2;doc.setDrawColor(70,70,70);doc.setLineWidth(.3);doc.line(cx-Math.min(28,sw/2-4),y,cx+Math.min(28,sw/2-4),y);
   doc.setFont("helvetica","bold");doc.setFontSize(8.6);const tl=doc.splitTextToSize(s,sw-5);tl.forEach((t,j)=>T(t,cx,y+4.8+j*3.7,{b:1,s:8.6,a:"center"}));
   const sub=/^head of department$/i.test(s)?(u.kind==="Specialty"?`Department of ${u.title}`:""):/^(director medical education|executive director)/i.test(s)?"Rawalpindi Institute of Cardiology":"";if(sub)T(sub,cx,y+4.8+tl.length*3.7+.4,{s:7.4,c:GR,a:"center"})});y+=16}}
 /* page furniture: footer, page numbers, provisional mark */
 const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setDrawColor(200,190,180);doc.setLineWidth(.2);doc.line(M,H-12.5,W-M,H-12.5);
  T("Rawalpindi Institute of Cardiology · Department of Medical Education and Training",M,H-8.3,{s:7,c:GR});T(`Confidential  ·  Page ${i} of ${n}`,W-M,H-8.3,{s:7,c:GR,a:"right"});
  if(o.prov)try{doc.saveGraphicsState();doc.setGState(new doc.GState({opacity:.07}));doc.setFont("helvetica","bold");doc.setFontSize(78);doc.setTextColor(...BR);const t="PROVISIONAL",w=doc.getTextWidth(t),a=32*Math.PI/180;
   doc.text(t,W/2-w/2*Math.cos(a),H/2+w/2*Math.sin(a)+8,{angle:32});doc.restoreGraphicsState()}catch(e){}}
 const blob=doc.output("blob"),file=rsFile(x,o,".pdf");
 try{await (DL||BROWSER_DL).save({filename:file,data:blob});toast("Result PDF ready")}catch(e){if(e?.code!=="declined")toast("The file could not be saved in this view")}
 xlog(x,`Result downloaded (PDF): ${rsWho(o)}`);persist()}

async function rsXlsx(x,o,btn){if(!window.XLSX){toast("The Excel library did not load. Check the connection and reload the page.");return}
 const U=rsUnits(x,o);if(!U.length){toast("No candidates on this result");return}
 const dt=x.date?P(x.date).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"";
 const wb=XLSX.utils.book_new(),used=new Set(),nm=s=>{let b=s.replace(/[\\\/?*\[\]:]/g,"").slice(0,31),t=b,i=2;while(used.has(t.toLowerCase()))t=b.slice(0,28)+" "+i++;used.add(t.toLowerCase());return t};
 const top=["Rawalpindi Institute of Cardiology · Department of Medical Education and Training",`Result · ${x.title} · ${x.session}${o.prov?" · PROVISIONAL":""}`];
 const sum=[[top[0]],[top[1]],[dt?`Date of examination: ${dt}`:""],[],["Result for","Paper","Total marks","Pass marks","Candidates","Appeared","Absent","Passed","Failed","Pass rate %","Highest %","Average %","Lowest %"]];
 U.forEach(u=>u.papers.forEach(d=>sum.push([u.title,d.k+(d.com&&d.spec?` (${d.spec} candidates)`:""),d.T??"",d.pass,d.st.reg,d.st.sat,d.st.abs,d.st.pass,d.st.fail,rs1(d.st.rate),rs1(d.st.hi),rs1(d.st.avg),rs1(d.st.lo)])));
 const ws0=XLSX.utils.aoa_to_sheet(sum);ws0["!cols"]=[26,40,11,26,11,10,9,9,9,11,10,10,10].map(w=>({wch:w}));ws0["!merges"]=[0,1,2].map(r=>({s:{r,c:0},e:{r,c:12}}));XLSX.utils.book_append_sheet(wb,ws0,nm("Summary"));
 U.forEach(u=>u.papers.forEach(d=>{const C=rsCols(d,o),rows=[[top[0]],[top[1]],[`Paper: ${d.k}${d.com&&d.spec?` (${d.spec} candidates)`:d.com?" (common paper)":""}`],[[dt?`Date: ${dt}`:"",d.T?`Total marks: ${d.T}`:"",`Pass marks: ${d.pass}`].filter(Boolean).join("   ·   ")],[],C.map(c=>c.xh||c.h)];
  d.R.forEach((r,i)=>rows.push(C.map(c=>c.x?c.x(r,i):c.h==="Sr."?i+1:c.v(r,i))));
  rows.push([],["Candidates",d.st.reg],["Appeared",d.st.sat],["Absent",d.st.abs],["Passed",d.st.pass],["Failed",d.st.fail],["Pass rate %",rs1(d.st.rate)],["Highest %",rs1(d.st.hi)],["Average %",rs1(d.st.avg)]);d.notes.forEach(n=>rows.push([n]));
  const ws=XLSX.utils.aoa_to_sheet(rows);ws["!cols"]=C.map(c=>({wch:c.w===0?30:Math.max(8,Math.round(c.w*.75)+2)}));ws["!merges"]=[0,1,2,3].map(r=>({s:{r,c:0},e:{r,c:C.length-1}}));
  XLSX.utils.book_append_sheet(wb,ws,nm(d.com&&d.spec?`${rsAbbr(d.k)} (${d.spec})`:d.k))}));
 const buf=XLSX.write(wb,{bookType:"xlsx",type:"array"});if(btn)btn.disabled=true;
 try{await (DL||BROWSER_DL).save({filename:rsFile(x,o,".xlsx"),data:buf});toast("Result Excel file ready")}catch(e){if(e?.code!=="declined")toast("The file could not be saved in this view")}finally{if(btn&&btn.isConnected)btn.disabled=false}
 xlog(x,`Result downloaded (Excel): ${rsWho(o)}`);persist()}

/* the download sheet */
function sheetResult(x,pre){const S=rsSpecs(x),Cm=exCommon(x).map(c=>c.name).filter(k=>exCands(x).some(p=>exInPaper(x,p,k))),O=x.resOpt||{};
 const anySec=exAllPapers(x).some(k=>{const s=typeof omrSpec==="function"&&omrSpec(x,k);return s&&(s.sections||[]).length>1});
 const who=[["all",`All specialties (${S.length}), each starting on a new page`],...S.map(s=>["s:"+s,s]),...Cm.map(c=>["c:"+c,`${c} · common paper, all candidates`])];
 openSheet("Download result",`<p class="subt" style="margin:0">A formal result on A4 with the RIC header, each paper's summary and signature lines. The same content can be downloaded as Excel.</p>
 <label class="f">Result for<select name="who">${opt(who,pre||O.who||"all")}</select></label>
 <label class="f">Order of candidates<select name="order">${opt([["roll","By roll number"],["merit","By marks (highest first)"],["name","By name"]],O.order||"roll")}</select></label>
 <div style="display:grid;gap:6px">${Cm.length?`<label class="check2"><input type="checkbox" name="common" ${O.common===false?"":"checked"}> Include the common paper${Cm.length>1?"s":""} (${Cm.map(esc).join(", ")}) in each specialty's result</label>`:""}
 <label class="check2"><input type="checkbox" name="pos" ${O.pos?"checked":""}> Show each candidate's position</label>
 ${anySec?`<label class="check2"><input type="checkbox" name="secs" ${O.secs?"checked":""}> Show marks by section</label>`:""}
 <label class="check2"><input type="checkbox" name="noabs" ${O.noAbs?"checked":""}> Leave out absent candidates</label>
 <label class="check2"><input type="checkbox" name="prov" ${(O.prov??(x.stage||0)<5)?"checked":""}> Mark as provisional</label></div>
 <label class="f">Reference no. <span class="h">optional, printed at the top</span><input name="ref" value="${esc(O.ref||"")}" placeholder="e.g. RIC/DME/Exam/2026/112" autocomplete="off"></label>
 <label class="f">Signature lines <span class="h">one per line, up to four</span><textarea name="sig" rows="3">${esc(O.sig==null||O.sig===RS_SIG_OLD?RS_SIG:O.sig)}</textarea></label>
 <div class="actions" style="justify-content:flex-start"><button type="button" class="btn" data-act="rs-xlsx">Download Excel instead</button></div>`,()=>{const o=rsForm(x);rsPdf(x,o)},"Download PDF")}
function rsForm(x){const f=document.getElementById("sheetform"),g=n=>f.querySelector(`[name="${n}"]`);
 const o={who:g("who").value,order:g("order").value,common:g("common")?g("common").checked:true,pos:g("pos").checked,secs:g("secs")?g("secs").checked:false,noAbs:g("noabs").checked,prov:g("prov").checked,ref:g("ref").value.trim(),sig:g("sig").value};
 if(!isViewer())x.resOpt={...o};return o}
/* buttons: Results tab (marks panel) and Analysis tab */
{const _r=exResultsTab;exResultsTab=function(x){const h=_r(x);if(!exAllPapers(x).length)return h;
 return h.replace('<h3 style="margin:0">Marks by paper</h3>','<div class="head"><h3 style="margin:0">Marks by paper</h3><button class="btn small primary" data-act="rs-open">Download result</button></div>')}}
{const _a=exAnalysisTab;exAnalysisTab=function(x){const h=_a(x);if(!exAllPapers(x).length||!exAllPapers(x).some(k=>{const M=exPM(x,k);return Object.keys(M.marks).length||Object.keys(M.absent).length}))return h;
 return`<div class="panel" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><b>Result sheets</b><div class="subt">Formal A4 result per specialty or common paper, with the RIC header and signature lines.</div></div><button class="btn primary" data-act="rs-open">Download result</button></div>`+h}}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="rs-open"],[data-act="rs-xlsx"]');if(!b||!DB||!DB.exams)return;const x=DB.exams.find(v=>v.id===route.id);if(!x)return;e.preventDefault();
 if(b.dataset.act==="rs-open")return sheetResult(x,b.dataset.who);rsXlsx(x,rsForm(x),b)});
