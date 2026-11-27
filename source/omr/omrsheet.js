/* RIC DME OMR answer sheet (A4, mm). Same code will run in the app.
   cfg: {exam, session, date, spec, n, opts, sections:[{name,from,to}], cand:{name,code,year,program}|null, qr, logo} */
function omrSheet(doc, cfg, qrcode){
  const W=210,H=297,OPT="ABCDE".slice(0,cfg.opts||5).split("");
  const ink=[20,20,20],mid=[110,110,110],light=[200,200,200],brand=[109,31,43];
  const T=(t,x,y,o={})=>{doc.setFont("helvetica",o.b?"bold":"normal");doc.setFontSize(o.s||9);doc.setTextColor(...(o.c||ink));doc.text(String(t),x,y,{align:o.a||"left",baseline:o.bl||"alphabetic"})};
  /* 1. corner markers: the scanner finds these to straighten the page */
  doc.setFillColor(0,0,0);[[8,8],[195,8],[8,264],[195,264]].forEach(([x,y])=>doc.rect(x,y,7,7,"F"));
  /* side markers (smaller than the corners): let the reader correct each band of the page separately when the paper curls */
  [44,79,112,149,186,223].forEach(y=>{doc.rect(9.25,y-2.25,4.5,4.5,"F");doc.rect(196.25,y-2.25,4.5,4.5,"F")});
  /* 2. header */
  if(cfg.logo)doc.addImage(cfg.logo,"JPEG",18,10,22,22);
  T("RAWALPINDI INSTITUTE OF CARDIOLOGY",105,15.5,{a:"center",b:1,s:13.5,c:brand});
  T("Department of Medical Education & Training",105,21,{a:"center",s:9.5,c:mid});
  T(`${cfg.exam}  |  ${cfg.session}`,105,28,{a:"center",b:1,s:11.5});
  T(["MCQ answer sheet",cfg.spec,cfg.n+" questions",cfg.date].filter(Boolean).join("  |  "),105,33.5,{a:"center",s:9});
  /* QR: exam + paper (+ candidate on personalised sheets) */
  const q=qrcode(0,"M");q.addData(cfg.qr);q.make();const m=q.getModuleCount(),sz=22,c=sz/m,qx=170,qy=10;
  doc.setFillColor(0,0,0);for(let r=0;r<m;r++)for(let k=0;k<m;k++)if(q.isDark(r,k))doc.rect(qx+k*c,qy+r*c,c+.02,c+.02,"F");
  doc.setDrawColor(...brand);doc.setLineWidth(.6);doc.line(15,37.5,195,37.5);
  /* 3. candidate block */
  const P=cfg.cand,by=41;doc.setDrawColor(...light);doc.setLineWidth(.25);doc.roundedRect(15,by,112,56,2,2);
  T("CANDIDATE",19,by+6,{b:1,s:7.5,c:brand});
  const row=(l,v,y)=>{T(l,19,y,{s:8.5,c:mid});if(v)T(v,46,y,{b:1,s:10.5});else{doc.setDrawColor(...light);doc.line(46,y+.8,123,y+.8)}};
  row("Name",P?`${P.title!=null?(P.title?P.title+" ":""):"Dr. "}${P.name}`:"",by+15);row("PGT ID",P?P.code:"",by+24);row("Specialty",P?cfg.spec:"",by+33);row("Programme / year",P?[P.program,P.year?`Year ${P.year}`:""].filter(Boolean).join("  |  ")||" ":"",by+42);
  T("Candidate's signature",19,by+51.5,{s:8.5,c:mid});doc.setDrawColor(...light);doc.line(56,by+52.3,123,by+52.3);
  /* roll number: write boxes + bubbles (pre-filled on personalised sheets) */
  const rx=136,rw=59;doc.setDrawColor(...light);doc.roundedRect(rx-4,by,rw+4,56,2,2);
  T("ROLL NUMBER",rx+rw/2-2,by+6,{a:"center",b:1,s:7.5,c:brand});
  let roll=P?String(P.roll||P.code||"").replace(/\D/g,""):"";if(roll.length!==5)roll="";const cw=9.4,x0=rx+3.5;
  for(let d=0;d<5;d++){const x=x0+d*cw;doc.setDrawColor(...mid);doc.setLineWidth(.3);doc.rect(x-3.2,by+8,6.4,6.4);if(roll)T(roll[d],x,by+12.9,{a:"center",b:1,s:11});
   for(let v=0;v<10;v++){const y=by+19+v*3.85;if(roll&&+roll[d]===v){doc.setFillColor(0,0,0);doc.circle(x,y,1.7,"F")}else{doc.setDrawColor(...mid);doc.setLineWidth(.22);doc.circle(x,y,1.7);T(v,x,y+.05,{a:"center",bl:"middle",s:6,c:mid})}}}
  /* 4. instructions with mark examples */
  const iy=102;T("Use a dark (2B) pencil or a black / blue ball-point. Fill the circle completely. To change a pencil answer, erase it fully.",105,iy,{a:"center",s:8});
  const ex=(x,l,draw)=>{doc.setDrawColor(...mid);doc.setLineWidth(.25);doc.circle(x,iy+5.2,1.9);draw(x,iy+5.2);T(l,x+3.3,iy+6.1,{s:7.5,c:mid})};
  T("Correct:",58,iy+6.1,{s:7.5,b:1});ex(73,"",(x,y)=>{doc.setFillColor(0,0,0);doc.circle(x,y,1.9,"F")});
  T("Wrong:",88,iy+6.1,{s:7.5,b:1});
  ex(101,"tick",(x,y)=>{doc.setDrawColor(0,0,0);doc.setLineWidth(.45);doc.line(x-1.1,y,x-.2,y+1);doc.line(x-.2,y+1,x+1.3,y-1.2)});
  ex(116,"cross",(x,y)=>{doc.setDrawColor(0,0,0);doc.setLineWidth(.45);doc.line(x-1,y-1,x+1,y+1);doc.line(x-1,y+1,x+1,y-1)});
  ex(133,"half",(x,y)=>{doc.setFillColor(0,0,0);doc.rect(x-1.9,y-1.9,1.9,3.8,"F");doc.setDrawColor(...mid);doc.circle(x,y,1.9)});
  ex(148,"dot",(x,y)=>{doc.setFillColor(0,0,0);doc.circle(x,y,.6,"F")});
  /* 5. answer grid: flows into columns; each section starts with a heading row */
  const top=113,bottom=259;
  const items=[];(cfg.sections&&cfg.sections.length?cfg.sections:[{name:"",from:1,to:cfg.n}]).forEach((s,i)=>{if(s.name)items.push({h:`SECTION ${String.fromCharCode(65+i)}  |  ${s.name}  (Q${s.from}-${s.to})`});for(let k=s.from;k<=s.to;k++)items.push({q:k})});
  const cols=Math.min(4,Math.max(2,Math.ceil(items.length/26))),per=Math.ceil(items.length/cols),pitch=Math.min(6.4,(bottom-top)/per);
  const bw=6.6,qw=8,colW=qw+OPT.length*bw,gap=(180-cols*colW)/(cols+1);
  for(let ci=0;ci<cols;ci++){const x=15+gap+ci*(colW+gap),its=items.slice(ci*per,(ci+1)*per);
   its.forEach((it,ri)=>{const y=top+ri*pitch+pitch/2;
    if(it.h){doc.setFillColor(243,236,226);doc.rect(x-1,y-2.6,colW+1,5.2,"F");T(it.h,x,y+.1,{s:it.h.length>34?5.4:6,b:1,bl:"middle",c:brand});return}
    T(it.q,x+qw-2.2,y+.1,{a:"right",b:1,s:8.5,bl:"middle"});
    OPT.forEach((o,k)=>{const cx=x+qw+bw/2+k*bw;doc.setDrawColor(...mid);doc.setLineWidth(.25);doc.circle(cx,y,2.3);T(o,cx,y+.1,{a:"center",bl:"middle",s:6.3,c:mid})});
    if(it.q%5===0&&ri<its.length-1){doc.setDrawColor(...light);doc.setLineWidth(.15);doc.line(x,y+pitch/2,x+colW,y+pitch/2)}})}
  /* 6. footer */
  T("Invigilator's signature ______________________",19,268.8,{s:8,c:mid});
  T(`Sheet ${cfg.qr.split("|").slice(1).join("-")}`,191,268.8,{a:"right",s:7,c:mid});
  doc.setDrawColor(...light);doc.setLineWidth(.25);doc.setLineDashPattern([1,1],0);doc.line(15,276,195,276);doc.setLineDashPattern([],0);
  T("One answer per question. Do not fold the sheet or write near the black squares. Leave this strip blank.",105,280,{a:"center",s:6.5,c:mid});
}
if(typeof module!=="undefined")module.exports={omrSheet};
