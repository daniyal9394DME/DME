/* =====================================================================
   V53/54 · OBSERVERSHIP PROGRAMME. Doctors, students, nurses,
   technologists and other staff from outside who observe at RIC.
   1 Apply online (scan the QR code, ?obs=1): RIC's observership form with
     a photograph, CNIC, and either their institute's ID card and a letter
     endorsing them for the observership, or (if not attached to an
     institute) their degree. They get only the filled application form.
   2 The Head of Department signs the application and they bring it to the
     DME office. The Director ME&T signs it and the office hands over the
     fee challan (four copies: Accounts, Admin, Applicant, ME&T). Applicants
     cannot download the challan themselves.
   3 They pay the fee in cash and bring the paid challan back; the DME
     office collects the cash for the Accounts Office and hands it over
     later. The Director ME&T sends the application to the MS with the
     Admin copy of the challan.
   4 The MS approves; the hospital administration issues the office order
     (about 1.5 weeks) and calls the applicant to collect it.
   5 They bring the office order to the DME office; it is uploaded and the
     observership starts. Attendance begins; each observer can mark it on
     the kiosk only within their attendance time (set per observer).
   6 Three days before the end the office is reminded to offer an
     extension (new challan) or tell them it is ending.
   The hospital issues the certificate, so there is none here.
   Fees (changeable): first 2 weeks PKR 5,000; each further 2 weeks
   PKR 3,000; at most 3 months. Records live with the rotating trainees
   (DB.visitors, kind "obs").
   ===================================================================== */
const OBS_CATS=["Doctor (MBBS / house officer / medical officer)","Dental surgeon (BDS)","Medical or dental student","Nurse","Nursing student","Allied health professional","Allied health student","Cath lab technologist","Laboratory technician","Other"];
FORM_DEF.obs={open:true,msg:"",close:"",contact:"",fee1:5000,fee2:3000,block:14,maxDays:91,dueDays:14,payTo:"Department of Medical Education Fund",attFrom:"08:00",attTo:"10:00",units:ROT_UNITS.slice(),cats:OBS_CATS.slice()};
const obsCfg=()=>{const c=formCfg("obs");return{...c,fee1:+c.fee1||0,fee2:+c.fee2||0,block:+c.block||14,maxDays:+c.maxDays||91,dueDays:+c.dueDays||14}};
const obsList=()=>visList().filter(v=>v.kind==="obs");
const obsLink=()=>LIVE?pubBase()+"?obs=1":"https://dme.ric.example/observership";
const obsFee=(c,n)=>n<1?0:c.fee1+c.fee2*(n-1);
const obsEndOf=(start,len)=>{const d=P(start);d.setDate(d.getDate()+len-1);return iso(d)};
const obsLen=v=>v.start&&v.end?days(P(v.end),P(v.start))+1:0;
const obsBlocks=v=>(v.fees||[]).reduce((a,f)=>a+(+f.blocks||0),0)||+v.blocks||1;
const obsBlocksLeft=(v,c)=>Math.max(0,Math.floor((c.maxDays-(obsLen(v)||obsBlocks(v)*c.block))/c.block));
const obsUnpaid=v=>(v.fees||[]).filter(f=>f.status!=="verified");
const obsPaid=v=>(v.fees||[]).filter(f=>f.status==="verified").reduce((a,f)=>a+(+f.amt||0),0);
/* fees are paid in cash at the DME office and handed to the Accounts Office later */
const obsCashHeld=()=>obsList().flatMap(v=>(v.fees||[]).filter(f=>f.status==="verified"&&!f.acc).map(f=>({v,f})));
const obsWeeks=d=>d>=89&&d<=92?"3 months":d>=59&&d<=62?"2 months":d%7===0?`${d/7} week${d/7>1?"s":""}`:`${d} days`;
const obsDurOpts=c=>Array.from({length:Math.max(1,Math.floor(c.maxDays/c.block))},(_,i)=>[String(i+1),`${obsWeeks(c.block*(i+1))} · ${money(obsFee(c,i+1))}`]);
/* where an observer stands */
const OBS_WAIT=14;/* days with the MS before a follow-up is suggested (the office order usually takes about 1.5 weeks) */
const obsFirst=v=>(v.fees||[]).find(f=>f.kind==="first");
function obsStage(v){if(v.closed)return"Closed";if(v.start){const s=rotState(v);return s==="Left early"?"Completed":s}if(v.fwd)return"With the MS";const f=obsFirst(v);if(f&&f.status==="verified")return"To forward";return v.recv||(f&&f.issued)?"Challan issued":"Applied"}
const OBS_TABS=["Applied","Challan issued","To forward","With the MS","Upcoming","Current","Completed","Closed"];
/* the kiosk accepts an observer's attendance only within their attendance time */
const obsWin=v=>{const c=obsCfg(),w=(v&&v.attWin)||{};return{from:w.from||c.attFrom||"08:00",to:w.to||c.attTo||"10:00"}};
const obsWinTxt=w=>`${w.from}–${w.to}`;
const obsWinOpen=(v,now)=>{if(!v||v.kind!=="obs")return true;const w=obsWin(v),t=(now||new Date()).toTimeString().slice(0,5);return t>=w.from&&t<=w.to};
const obsWaitDays=v=>v.fwd&&v.fwd.on?days(TODAY,P(v.fwd.on)):0;
const obsLate=v=>obsStage(v)==="With the MS"&&obsWaitDays(v)>OBS_WAIT;
const obsAgo=v=>v.regAt?days(TODAY,P(dDay(v.regAt))):0;
const obsEnding=v=>obsStage(v)==="Current"&&!v.left&&rotDaysLeft(v)<=3&&!(v.told&&v.told[v.end]);
const obsNew=v=>v.src==="form"&&!v.checked&&obsStage(v)==="Applied";
function obsAlertCount(){return obsList().filter(v=>obsEnding(v)||obsStage(v)==="To forward"||obsLate(v)).length}
/* an applicant with no start date yet is not "current": keep them off the kiosk */
{const _s=rotState;rotState=function(v){if(v&&v.kind==="obs"&&(!v.start||v.closed))return v.closed?"Closed":"Applied";return _s(v)}}
/* challan numbers: OBS-26-0001. Online applications number themselves on the server, so fetch the latest records first */
async function obsFresh(){if(typeof LIVE!=="undefined"&&LIVE&&typeof SYNC!=="undefined"&&SYNC&&SYNC.sb&&typeof reconcile==="function")try{await reconcile()}catch(e){}}
function obsNextChallan(){const yy=String(TODAY.getFullYear()).slice(2),re=new RegExp(`^OBS-${yy}-(\\d+)$`);let mx=0;obsList().forEach(v=>(v.fees||[]).forEach(f=>{const m=String(f.challan||"").match(re);if(m)mx=Math.max(mx,+m[1])}));return`OBS-${yy}-${String(mx+1).padStart(4,"0")}`}
/* amount in words, Pakistani style */
function obsWords(n){n=Math.round(+n||0);if(!n)return"Zero";const a=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"],t=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
 const two=x=>x<20?a[x]:t[Math.floor(x/10)]+(x%10?" "+a[x%10]:""),three=x=>(x>=100?a[Math.floor(x/100)]+" Hundred"+(x%100?" ":""):"")+(x%100?two(x%100):"");
 const parts=[];[[1e7,"Crore"],[1e5,"Lakh"],[1e3,"Thousand"]].forEach(([d,w])=>{if(n>=d){parts.push(two(Math.floor(n/d))+" "+w);n%=d}});if(n)parts.push(three(n));return parts.join(" ")}
/* the WhatsApp messages */
function obsMsg(v,kind,f){const c=obsCfg(),n=visName(v);
 if(kind==="ext")return`Dear ${n},\nYour observership in ${v.unit} at the Rawalpindi Institute of Cardiology ends on ${fd(v.end)}.\nIf you would like to continue, an extension of ${obsWeeks(c.block)} costs ${money(c.fee2)} (up to ${obsWeeks(c.maxDays)} in all). Please contact the DME office for the fee challan before ${fd(v.end)}.\nDME Office, RIC`;
 if(kind==="end")return`Dear ${n},\nYour observership in ${v.unit} at the Rawalpindi Institute of Cardiology ends on ${fd(v.end)}.\nThank you for observing with us.\nDME Office, RIC`;
 if(kind==="pin")return`Dear ${n},\nWelcome to the Rawalpindi Institute of Cardiology. Your observership in ${v.unit} runs from ${fd(v.start)} to ${fd(v.end)}.\nPlease mark your attendance every working day between ${obsWinTxt(obsWin(v))} on the attendance computer in the Medical Education Department. Your PIN is ${v.pin}.\nDME Office, RIC`;
 if(kind==="challan")return obsStage(v)==="Challan issued"?`Dear ${n},\nYour observership fee challan ${f?f.challan:""} for ${money(f?f.amt:0)} has been issued. Please pay the fee in cash and bring the paid challan to the Medical Education Department, RIC, so that we can send your application to the Medical Superintendent.\nDME Office, RIC`
  :`Dear ${n},\nThank you for applying for an observership in ${v.unit} at the Rawalpindi Institute of Cardiology (application ${f?f.challan:""}).\nPlease print your application form, get it signed by the Head of the ${v.unit} department and bring it to the Medical Education Department, RIC. You will receive the fee challan there.\nDME Office, RIC`;
 if(kind==="started")return`Dear ${n},\nYour observership in ${v.unit} at the Rawalpindi Institute of Cardiology runs from ${fd(v.start)} to ${fd(v.end)}.\nPlease mark your attendance every working day between ${obsWinTxt(obsWin(v))} on the attendance computer in the Medical Education Department. Your PIN is ${v.pin}.\nDME Office, RIC`;
 return""}
const obsWa=(v,kind,label,f)=>waNum(v.mobile)?`<a class="btn small" target="_blank" rel="noopener" ${kind==="ext"||kind==="end"?`data-obstold="${v.id}|${kind}"`:""} href="https://wa.me/${waNum(v.mobile)}?text=${encodeURIComponent(obsMsg(v,kind,f))}">${label}</a>`:"";

/* ---------- PDFs: the application form and the fee challan (four copies) ---------- */
async function obsDl(name,blob){try{await (DL||BROWSER_DL).save({filename:name,data:blob})}catch(e){if(e?.code!=="declined")toast("The file could not be saved in this view")}}
const obsFileName=v=>visName(v).replace(/[^A-Za-z0-9 .]+/g,"").trim();
const obsLogo=()=>document.querySelector('img[alt="RIC logo"]')?.src||document.querySelector(".fbhead img")?.src;
const OBS_COPIES=[["ACCOUNTS COPY","Accounts"],["ADMIN COPY","Admin"],["APPLICANT COPY","Paid"],["ME&T COPY","ME&T"]];
const OBS_PAYTO="Department of Medical Education Fund";
const obsPayTo=c=>!c.payTo||c.payTo==="Accounts Office, RIC"?OBS_PAYTO:c.payTo;
const obsRs=n=>`${Math.round(+n||0).toLocaleString("en-US")}/-`;
/* A4 portrait: four copies stacked, each a full-width strip */
function obsDrawChallan(d,v,f,c){const W=210,H=297,M=6,NB=27,N=OBS_COPIES.length,SH=(H-2*M-NB-2)/N,CW=W-2*M,logo=obsLogo();
 const GR=[24,92,48],RED=[200,30,30],INK=[25,25,25],GY=[95,95,95],LB=[45,45,45];
 const T=(t,x,y,o={})=>{d.setFont("helvetica",o.b?"bold":"normal");d.setFontSize(o.s||7.6);d.setTextColor(...(o.c||INK));d.text(t??"",x,y,{align:o.a||"left"})};
 const fit=(t,x,y,w,o={})=>{t=String(t??"");let s=o.s||7.6;d.setFont("helvetica",o.b?"bold":"normal");d.setFontSize(s);while(s>5.8&&d.getTextWidth(t)>w){s-=.2;d.setFontSize(s)}if(d.getTextWidth(t)>w){let n=t.length;while(n>3&&d.getTextWidth(t.slice(0,n)+"...")>w)n--;t=t.slice(0,n).trim()+"..."}T(t,x,y,{...o,s})};
 const ext=f.kind==="ext",wk=obsWeeks(c.block*(f.blocks||1)),issue=f.issued&&f.issued.at?dDay(f.issued.at):f.at?dDay(f.at):iso(TODAY),due=obsEndOf(issue,(c.dueDays||14)+1);
 const title=ext?"EXTENSION OF OBSERVERSHIP FEE CHALLAN":"OBSERVERSHIP FEE CHALLAN",purpose=`${ext?"Extension of observership":"Observership"} (${v.unit?v.unit+", ":""}${wk})`;
 OBS_COPIES.forEach(([lab,stamp],i)=>{const y0=M+i*SH;
  if(i){d.setDrawColor(140);d.setLineWidth(.25);d.setLineDashPattern([1.6,1.2],0);d.line(M,y0,W-M,y0);d.setLineDashPattern([],0);T("cut here",M,y0-.8,{s:5.2,c:[150,150,150]})}
  /* top: institute, copy, challan number */
  if(logo&&logo.startsWith("data:"))try{d.addImage(logo,"JPEG",M+.5,y0+2.4,15.5,15.5)}catch(e){}
  T("RAWALPINDI INSTITUTE OF CARDIOLOGY",M+19,y0+7.2,{b:1,s:11.2});T("RAWAL ROAD, RAWALPINDI",M+19,y0+11.4,{b:1,s:7,c:[60,60,60]});T("Accounts Office",M+19,y0+15.6,{b:1,s:8.4,c:RED});
  const xr=W-M-58;d.setFillColor(...GR);d.roundedRect(xr+18,y0+2.4,40,6.4,1,1,"F");T(lab,xr+38,y0+6.8,{b:1,s:7.8,a:"center",c:[255,255,255]});
  T("Challan No.",xr,y0+15.2,{b:1,s:8});d.setDrawColor(120);d.setLineWidth(.3);d.rect(xr+18,y0+10.6,40,6.6);T(f.challan||"",xr+38,y0+15.2,{b:1,s:10,a:"center"});
  d.setFillColor(...GR);d.roundedRect(M,y0+19.6,CW,7,1.2,1.2,"F");T(title,W/2,y0+24.4,{b:1,s:10.6,a:"center",c:[255,255,255]});
  /* body */
  const by=y0+29.6,bh=SH-32;d.setLineWidth(.25);d.setDrawColor(150);
  const xa=M,wa=76;d.rect(xa,by,wa,bh);const ra=bh/5;
  [["Applicant Name",visName(v)],["Father / Guardian Name",v.father],["CNIC / Passport No.",v.cnic],["Mobile Number",v.mobile],["Institution",v.inst]].forEach(([k,val],r)=>{const yy=by+ra*(r+.66);
   T(k,xa+2,yy,{b:1,s:6.2,c:LB});T(":",xa+27,yy,{s:6.2});fit(val||"",xa+29,yy-.2,wa-31,{s:7.2});d.setDrawColor(180);d.line(xa+28.6,yy+1,xa+wa-2,yy+1)});
  const xb=M+79,wb=81,c1=23,rows=[["Purpose",purpose],["Account Title",obsPayTo(c)],["Mode","Cash"],["Fee",`Rs.  ${obsRs(f.amt)}`],["Amount in Words",`Rupees ${obsWords(f.amt)} Only`],["Due Date",fd(due)],["Date of Deposit",f.status==="verified"&&f.paidOn?fd(f.paidOn):""]],rb=bh/rows.length;
  d.setDrawColor(150);d.rect(xb,by,wb,bh);d.line(xb+c1,by,xb+c1,by+bh);
  rows.forEach(([k,val],r)=>{const yy=by+rb*(r+.68);if(r)d.line(xb,by+rb*r,xb+wb,by+rb*r);T(k,xb+1.8,yy,{b:1,s:6.2,c:LB});
   if(val)fit(val,xb+c1+1.8,yy,wb-c1-3.4,{s:r===3?8:7.2,b:r===3||r===1});else{d.setDrawColor(180);d.line(xb+c1+2.5,yy+.6,xb+wb-3,yy+.6);d.setDrawColor(150)}});
  const xc=M+163,wc=W-M-xc,sh=bh-15;d.setDrawColor(140);d.setLineDashPattern([1,.8],0);d.rect(xc,by,wc,sh);d.setLineDashPattern([],0);
  T(stamp,xc+wc/2,by+sh/2-.6,{b:1,s:7.6,a:"center",c:GY});T("Stamp",xc+wc/2,by+sh/2+3.2,{b:1,s:7.6,a:"center",c:GY});
  d.setDrawColor(110);[["Depositor Signature",by+sh+5.6],["Cashier Signature",by+bh-1.6]].forEach(([t,yy])=>{d.line(xc+1,yy-2.6,xc+wc-1,yy-2.6);T(t,xc+wc/2,yy,{b:1,s:5.8,a:"center",c:GY})})});
 /* note and office use */
 const ny=M+N*SH+2,wn=122;d.setDrawColor(150);d.setLineWidth(.3);d.roundedRect(M,ny,wn,NB-1,1.5,1.5);d.roundedRect(M+wn+3,ny,CW-wn-3,NB-1,1.5,1.5);
 T("NOTE:",M+3,ny+4.6,{b:1,s:8,c:RED});
 const notes=ext?[["Please deposit the fee in cash with the Accounts Office, RIC."],["Attach this challan with your extension request."],["Fee is non-refundable and non-transferable."],[`This challan is only for the observership extension of ${wk}${f.to?` (until ${fd(f.to)})`:""}.`,1]]
  :[["Please deposit the fee in cash with the Accounts Office, RIC."],["Bring the paid challan back to the Medical Education Department."],["Attach this challan with your application form."],["Fee is non-refundable and non-transferable."],[`This challan is only for the observership duration of ${wk}.`,1]];
 notes.forEach(([t,red],k)=>{const yy=ny+8.8+k*3.4;d.setFillColor(...(red?RED:INK));d.circle(M+4.6,yy-.9,.45,"F");fit(t,M+6.8,yy,wn-9,{s:6.8,c:red?RED:INK})});
 const ox=M+wn+3,ow=CW-wn-3;T("FOR OFFICE USE ONLY",ox+ow/2,ny+5,{b:1,s:8.2,a:"center",c:GR});
 [["Received By:",ny+11],["Designation:",ny+17],["Date:",ny+23]].forEach(([l,yy])=>{T(l,ox+3,yy,{b:1,s:7});d.setDrawColor(130);d.line(ox+21,yy+.4,ox+ow-3,yy+.4)})}
function obsDrawApp(d,v,cfg){const W=210,L=20,R=W-20,BL=[47,84,150];
 const T=(t,x,y,o={})=>{d.setFont("times",o.b?"bold":o.i?"italic":"normal");d.setFontSize(o.s||11);d.setTextColor(...(o.c||[20,20,20]));d.text(t??"",x,y,{align:o.a||"left",maxWidth:o.w})};
 const at=(dDay(v.regAt||v.at)||iso(TODAY)),fee=obsFirst(v);let y=15;const RW=7;
 T("OBSERVERSHIP APPLICATION FORM",W/2,y,{b:1,s:15,a:"center"});d.setLineWidth(.4);d.setDrawColor(20);const tw=d.getTextWidth("OBSERVERSHIP APPLICATION FORM");d.line(W/2-tw/2,y+1,W/2+tw/2,y+1);y+=7.5;
 if(fee&&fee.challan){T("Application no.: ",L,y,{b:1,s:10.5});T(fee.challan,L+28,y,{s:10.5})}T("Date of Application: ",R-32,y,{b:1,s:10.5,a:"right"});T(fd(at),R,y,{s:10.5,a:"right"});y+=7;
 T("To,",L,y,{s:11});y+=5;T("The Medical Superintendent,",L,y,{b:1});y+=5;T("Rawalpindi Institute of Cardiology, Rawalpindi.",L,y,{b:1});y+=7.5;
 T("Subject:",L,y,{b:1});T(`Application for Observership in the Department of ${v.unit||""}`,L+17,y,{i:1});y+=7.5;
 T("Respected Sir/Madam,",L,y);y+=5.2;const body=d.splitTextToSize("I am writing to respectfully request permission to undertake an observership at Rawalpindi Institute of Cardiology in the department mentioned above. I have provided my personal, educational, and observership-related details below for your kind consideration. I assure you that I will abide by all rules and regulations of the Institute during the observership period.",R-L);
 d.setFont("times","normal");d.setFontSize(11);d.setTextColor(20,20,20);d.text(body,L,y,{align:"justify",maxWidth:R-L,lineHeightFactor:1.2});y+=body.length*5+1.5;
 const sec=t=>{d.setFillColor(222,231,243);d.rect(L,y-4.5,R-L,6.4,"F");T(t,L+1.5,y,{b:1,s:11,c:BL});y+=8};
 const fld=(k,val,x=L,w=R-L,lw=34)=>{T(k,x,y,{b:1,s:10.5});d.setFont("times","normal");d.setFontSize(10.5);const lines=d.splitTextToSize(String(val||""),w-lw-2);T(lines,x+lw,y,{s:10.5});d.setDrawColor(120);d.setLineWidth(.2);d.line(x+lw,y+1.3+(lines.length-1)*4.6,x+w,y+1.3+(lines.length-1)*4.6);return lines.length};
 const nx=n=>{y+=RW+4.6*(n-1)};
 sec("1. Personal & Contact Details");nx(fld("Full Name:",visName(v)));
 fld("Father's Name:",v.father,L,80,28);fld("Gender:",v.gender,L+95,R-L-95,18);nx(1);fld("Contact No.:",v.mobile,L,80,24);fld("CNIC:",v.cnic,L+95,R-L-95,14);nx(1);nx(fld("Email Address:",v.email||"—",L,R-L,30));y+=1.5;
 sec("2. Educational Details");nx(fld("Degree Program:",v.degree||v.qual||v.cat,L,R-L,34));nx(fld("Institution / University:",v.inst,L,R-L,46));fld("Year of Study / Passing:",v.yearStudy,L,90,46);fld("Category:",v.cat,L+95,R-L-95,20);nx(1);nx(fld("Current Semester / Status:",v.status2||v.qual,L,R-L,50));y+=1.5;
 sec("3. Observership Details");nx(fld("Department Applied For:",v.unit,L,R-L,46));nx(fld("Duration Requested:",obsWeeks((cfg||obsCfg()).block*(v.blocks||obsBlocks(v)))+(fee?` · fee ${money(fee.amt)}`:""),L,R-L,46));nx(fld("Reason / Purpose of Observership:",v.reason,L,R-L,58));y+=1.5;
 sec("Declaration");const dec=d.splitTextToSize("I hereby declare that the information provided above is true and correct to the best of my knowledge. I understand that I will not be entitled to any remuneration, certification of employment, or clinical privileges during this observership, and I will strictly adhere to the code of conduct and policies of Rawalpindi Institute of Cardiology.",R-L);
 d.setFont("times","normal");d.setFontSize(11);d.setTextColor(20,20,20);d.text(dec,L,y,{align:"justify",maxWidth:R-L,lineHeightFactor:1.2});y+=dec.length*5+8;
 d.setLineWidth(.3);d.setDrawColor(60);d.line(R-62,y,R,y);T("Signature of Applicant",R,y+5,{b:1,s:10.5,a:"right"});if(v.src==="form")T(`Submitted online on ${fd(at)}`,L,y+5,{i:1,s:9,c:[110,110,110]});y+=11;
 sec("For Office Use Only — Approval");y-=2;
 const bw=(R-L-6)/3,bh=Math.min(37,283-y),box=(i,title,sub,a,b)=>{const x=L+i*(bw+3);d.setDrawColor(150);d.setLineWidth(.25);d.rect(x,y,bw,bh);
  T(title,x+2.5,y+5,{b:1,s:9.6});if(sub)T(d.splitTextToSize(sub,bw-5)[0],x+2.5,y+9.2,{i:1,s:8.6,c:[90,90,90]});
  const cb=(t,cx,cy)=>{d.setDrawColor(60);d.rect(cx,cy-2.6,2.8,2.8);T(t,cx+4,cy,{s:8.6})};cb(a,x+2.5,y+15);if(b)cb(b,x+2.5,y+20);
  d.setDrawColor(90);d.line(x+2.5,y+bh-9,x+bw-2.5,y+bh-9);T("Signature & stamp",x+2.5,y+bh-5.6,{s:8,c:[90,90,90]});T("Date: ____________",x+2.5,y+bh-1.8,{s:8,c:[90,90,90]})};
 box(0,"Head of Department",`Department of ${v.unit||"________________"}`,"Recommended","Not recommended");
 box(1,"Director, ME & T","Medical Education & Training","Fee challan paid and attached","Forwarded to the MS");
 box(2,"Medical Superintendent","RIC, Rawalpindi","Approved","Not approved");
 y+=bh+4.5;T(`Attach: Admin copy of the paid fee challan${fee&&fee.challan?` (${fee.challan}, ${money(fee.amt)})`:""} · copies of CNIC and ${v.attached===false?"degree":"institute ID card and letter"}`,W/2,Math.min(y,291),{s:8.4,a:"center",c:[90,90,90]})}
async function obsAppPdf(v,save=true,cfg){await bioLoadPdf();const{jsPDF}=window.jspdf;const d=new jsPDF({unit:"mm",format:"a4"});obsDrawApp(d,v,cfg);
 if(save)await obsDl(`Observership application - ${obsFileName(v)}.pdf`,d.output("blob"));return d}
async function obsChallanPdf(v,f,c,save=true){await bioLoadPdf();const{jsPDF}=window.jspdf;const d=new jsPDF({unit:"mm",format:"a4"});obsDrawChallan(d,v,f,c);
 if(save)await obsDl(`Challan ${f.challan} - ${obsFileName(v)}.pdf`,d.output("blob"));return d}
/* ---------- quick actions: the next step and a collapsible "more" menu, used on the list and the profile ---------- */
function obsActs(v,can){const st=obsStage(v),c=obsCfg(),f1=obsFirst(v),rem=obsBlocksLeft(v,c),id=v.id,
 B=(act,l,cls="",extra="")=>`<button class="btn small ${cls}" data-act="${act}" data-id="${id}" ${extra}>${l}</button>`,fb=f=>`data-f="${f.id}"`;
 const pdfs=[B("obs-app","Application form (PDF)"),...(st!=="Applied"&&f1?[B("obs-challan","Challan (PDF)","",fb(f1))]:[])];
 if(!can)return{p:"",m:pdfs};
 let p="",m=[];
 if(st==="Applied"){p=B("obs-issue","HOD signed: issue challan","primary");m=[B("obs-app","Application form (PDF)"),B("obs-dur","Change duration"),obsWa(v,"challan","WhatsApp: what to do next",f1)]}
 else if(st==="Challan issued"){p=f1?B("obs-paid","Fee paid","primary",fb(f1)):"";m=[f1?B("obs-challan","Print the challan again","",fb(f1)):"",B("obs-dur","Change duration"),obsWa(v,"challan","WhatsApp: reminder to pay",f1),B("obs-app","Application form (PDF)")]}
 else if(st==="To forward"){p=B("obs-fwd","Sent to the MS","primary");m=[rem?B("obs-ext","Extend"):"",...pdfs]}
 else if(st==="With the MS"){p=B("obs-start","Office order: start","primary");m=[rem?B("obs-ext","Extend"):"",...pdfs]}
 else if(st==="Upcoming"||st==="Current"){p=rem?B("obs-ext","Extend",obsEnding(v)?"primary":""):"";
  m=[B("obs-win",`Attendance time · ${obsWinTxt(obsWin(v))}`),...obsUnpaid(v).map(f=>B("obs-paid",`Fee paid · ${esc(f.challan||"")}`,"",fb(f))),obsWa(v,"pin","WhatsApp: PIN and time"),
   ...(st==="Current"?[rem?obsWa(v,"ext","WhatsApp: offer extension"):"",obsWa(v,"end","WhatsApp: ending")]:[]),B("obs-edit","Edit dates / left early"),...pdfs]}
 else if(st==="Closed"){p=B("obs-reopen","Reopen");m=pdfs}
 else m=pdfs;
 if(st!=="Closed"&&st!=="Completed")m.push(B("obs-close","Withdrawn / not approved"));
 return{p,m:m.filter(Boolean)}}
const obsActCell=(v,can)=>{const a=obsActs(v,can);return`<div class="obsacts">${a.p}${a.m.length?`<details class="rowmenu"><summary class="btn small" title="More actions">More ▾</summary><div class="rowmenu-list">${a.m.join("")}</div></details>`:""}</div>`};
/* one open menu at a time */
document.addEventListener("toggle",e=>{const d=e.target;if(!(d instanceof HTMLDetailsElement)||!d.classList.contains("rowmenu")||!d.open)return;document.querySelectorAll("details.rowmenu[open]").forEach(o=>{if(o!==d)o.open=false})},true);

/* ---------- list ---------- */
UI.obsTab="Current";UI.obsQ="";
function vObservers(){const L=obsList(),t=iso(TODAY),can=!isViewer(),c=obsCfg();
 const G={};OBS_TABS.forEach(k=>G[k]=L.filter(v=>obsStage(v)===k));
 const tab=G[UI.obsTab]?UI.obsTab:"Current",q=UI.obsQ.toLowerCase();
 const rows=G[tab].filter(v=>!q||[v.name,v.inst,v.unit,v.cat,v.mobile,v.cnic,(v.fees||[]).map(f=>f.challan).join(" ")].join(" ").toLowerCase().includes(q)).sort((a,b)=>tab==="Completed"||tab==="Closed"?((b.end||b.regAt||"")>(a.end||a.regAt||"")?1:-1):((a.start||a.regAt||"")<(b.start||b.regAt||"")?-1:1));
 const end=L.filter(obsEnding),late=L.filter(obsLate);
 const today=v=>{const m=v.att?.[t];return`<div class="attbtns">${["P","A","L"].map(s=>`<button class="ab ${m?.s===s?"on a-"+s:""}" data-att="${v.id}|${t}|${s}" ${can?"":"disabled"} title="${AT_L[s]}">${s}</button>`).join("")}${m?.t?`<span class="subt">${m.t}</span>`:""}</div>`};
 const stepCell=v=>{const st=obsStage(v),f=obsUnpaid(v)[0];
  if(st==="Applied"){const ago=obsAgo(v);return`<span class="pill p-pend">Applied</span><div class="subt">${esc(f?f.challan:"")} · waiting for the HOD-signed application${ago>30?` · <span class="d-red">${ago} days, not returned</span>`:""}</div>`}
  if(st==="Challan issued"){const g=v.recv?days(TODAY,P(dDay(v.recv.at))):0;return`<span class="pill p-pend">Challan issued</span><div class="subt">${esc(f?f.challan:"")} · ${money(f?f.amt:0)} · waiting for the fee${g>7?` · <span class="d-red">${g} days</span>`:""}</div>`}
  if(st==="To forward")return`<span class="pill p-rot">Fee paid</span><div class="subt">sign and send to the MS with the Admin copy</div>`;
  if(st==="With the MS"){const w=obsWaitDays(v);return`<span class="pill ${w>OBS_WAIT?"p-bad":"p-rot"}">With the MS</span><div class="subt">sent ${fd(v.fwd.on)} · ${w===0?"today":w+" day"+(w===1?"":"s")+" ago"}${w>OBS_WAIT?" · follow up":""}</div>`}
  if(!v.start)return`${esc(st)}${v.closed?`<div class="subt">${esc(v.closed.why||"")}</div>`:""}`;const dl=rotDaysLeft(v);return`${fd(v.start)} – ${fd(v.left||v.end)}<div class="subt">${obsWeeks(obsLen(v))}${st==="Current"?` · ${dl===0?"<b class=\"d-red\">last day</b>":dl+" day"+(dl===1?"":"s")+" left"}`:st==="Upcoming"?` · starts in ${days(P(v.start),TODAY)} days`:""} · ${obsWinTxt(obsWin(v))}${f?` · <span class="d-red">${money(f.amt)} unpaid</span>`:""}</div>`};
 const statusTab=["Applied","Challan issued","To forward","With the MS","Closed"].includes(tab);
 return`<div class="head"><div><h2>Observership</h2><p>Doctors, students, nurses, technologists and other staff observing at RIC. Apply online → the HOD signs → challan issued here → fee paid → sent to the MS → office order (about 1.5 weeks) → the observership starts. ${money(c.fee1)} for the first ${obsWeeks(c.block)}, ${money(c.fee2)} for each further ${obsWeeks(c.block)}, up to ${obsWeeks(c.maxDays)}.</p></div>
  <div class="actions">${xbtn("observers")}${can?`<a class="btn" href="#kiosk">Open attendance kiosk</a><button class="btn" data-act="obs-cfg">Fees, times and form</button><button class="btn primary" data-act="obs-add">Add applicant</button>`:""}</div></div>
 ${can?obsLinkPanel():""}
 ${can?(H=>H.length?`<div class="panel" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b>Cash with the DME office: ${money(H.reduce((a,x)=>a+(+x.f.amt||0),0))}</b> <span class="subt">from ${H.length} paid challan${H.length>1?"s":""}, not yet handed to the Accounts Office</span></span><button class="btn small primary" data-act="obs-acc">Hand over to Accounts…</button></div>`:"")(obsCashHeld()):""}
 ${end.length&&can?`<div class="panel" style="display:grid;gap:10px;border-color:var(--warn,#c98a00)"><h3 style="margin:0">Ending soon · ${end.length}</h3><p class="subt" style="margin:0">Offer an extension or tell them it is ending. Sending either message (or pressing <b>Done</b>) clears the reminder.</p>
  ${end.map(v=>{const left=rotDaysLeft(v),rem=obsBlocksLeft(v,c);return`<div class="toolbar" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:8px"><span><a href="#obs-${v.id}"><b>${esc(visName(v))}</b></a> <span class="subt">${esc(v.unit)} · ends ${fd(v.end)} (${left===0?"<b class=\"d-red\">today</b>":left===1?"tomorrow":`in ${left} days`}) · ${obsWeeks(obsLen(v))} so far</span></span>
   <span class="actions">${rem?obsWa(v,"ext","WhatsApp: offer extension"):""}${obsWa(v,"end","WhatsApp: ending")}${rem?`<button class="btn small" data-act="obs-ext" data-id="${v.id}">Extend…</button>`:`<span class="subt">at the ${obsWeeks(c.maxDays)} limit</span>`}<button class="btn small" data-act="obs-told" data-id="${v.id}">Done</button></span></div>`}).join("")}</div>`:""}
 ${G["To forward"].length&&can?`<div class="flag info">${G["To forward"].length} paid application${G["To forward"].length>1?"s":""} to sign and send to the MS. <button class="btn link" data-obstab="To forward">Show</button></div>`:""}
 ${late.length&&can?`<div class="flag">${late.length} application${late.length>1?"s have":" has"} been with the MS for more than 2 weeks: follow up with the MS office. <button class="btn link" data-obstab="With the MS">Show</button></div>`:""}
 <div class="kpis">${[["Applied","waiting for the HOD's signature"],["Challan issued","waiting for the fee"],["To forward","to send to the MS"],["With the MS","waiting for the office order"],["Current",`${G.Current.filter(v=>v.att?.[t]).length} marked today`]].map(([k,s])=>`<button class="kpi" data-obstab="${k}" aria-pressed="${tab===k}"><span class="n">${G[k].length}</span><span class="l">${k}</span><span class="sub">${s}</span></button>`).join("")}
  <div class="kpi"><span class="n">${money(L.reduce((a,v)=>a+obsPaid(v),0))}</span><span class="l">Fees paid</span><span class="sub">${money(obsCashHeld().reduce((a,x)=>a+(+x.f.amt||0),0))} not yet with Accounts</span></div></div>
 <div class="panel flush"><div style="padding:12px 16px 0;display:grid;gap:8px"><div class="toolbar"><div class="chips">${OBS_TABS.map(k=>`<button class="chip" data-obstab="${k}" aria-pressed="${tab===k}">${k}<span class="c">${G[k].length}</span></button>`).join("")}</div><input type="search" id="obsq" placeholder="Search name, CNIC, challan, institution" value="${esc(UI.obsQ)}" aria-label="Search observers"></div></div>
  <div class="tblwrap" style="margin-top:8px"><table class="obstbl"><thead><tr><th>Applicant</th><th>Department</th><th>${statusTab?"Status":"Dates"}</th>${tab==="Current"?"<th>Today</th><th class=\"num\">Attendance</th>":""}<th>Next step</th></tr></thead><tbody>
  ${rows.map(v=>{const s=v.start?rotStats(v):null;return`<tr><td><a href="#obs-${v.id}"><b>${esc(visName(v))}</b></a>${obsNew(v)?' <span class="pill p-pend">New</span>':""}<div class="subt">${esc(v.cat||"")} · ${esc(v.inst||"")}</div><div class="subt">applied ${v.regAt?fd(dDay(v.regAt)):"—"}</div></td>
   <td>${esc(v.unit||"")}<div class="subt">${obsWeeks(c.block*obsBlocks(v))}</div></td><td>${stepCell(v)}</td>
   ${tab==="Current"?`<td>${today(v)}</td><td class="num">${s&&s.pct!=null?`<b class="${s.pct<75?"d-red":""}">${s.pct}%</b><div class="subt">${s.P} of ${s.work} days</div>`:"—"}</td>`:""}<td>${obsActCell(v,can)}</td></tr>`}).join("")||`<tr><td colspan="6" class="empty">None.</td></tr>`}
 </tbody></table></div></div>
 <p class="subt">Attendance uses the same weekly off days and kiosk as rotating trainees. Unmarked past working days count as absent. Observers can mark attendance on the kiosk only within their attendance time; staff can still mark it here at any time.</p>`}
function obsLinkPanel(){const c=obsCfg(),open=formIsOpen(c),url=obsLink();
 return`<div class="panel" style="display:grid;gap:10px"><div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap"><button class="qrthumb" data-act="obs-qr" title="Show QR code">${qrSvg(url,2)}</button>
  <div style="flex:1;min-width:240px;display:grid;gap:6px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>Observership application form</b><span class="pill ${open?"p-ric":"p-bad"}">${open?"Open":"Closed"}</span>${c.close&&open?`<span class="subt">closes ${fd(c.close)}</span>`:""}</div>
   <div class="toolbar"><input id="obslink" readonly class="linkbox" value="${esc(url)}" style="flex:1;min-width:200px;font-family:var(--f-mono);font-size:13px"><button class="btn small" data-act="obs-copy">Copy link</button><button class="btn small" data-act="obs-qr">QR code</button><a class="btn small" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Observership at the Rawalpindi Institute of Cardiology (Department of Medical Education).\nApply online here; you will get your application form straight away: ${url}`)}">Share on WhatsApp</a></div></div></div></div>`}

/* ---------- photos (live app: signed links, fetched once) ---------- */
const OBS_PH={};
function obsPhotoTag(v,cls="obsph"){const p=v.docs&&v.docs.photo&&(typeof v.docs.photo==="string"?v.docs.photo:v.docs.photo.path);return p?`<img class="${cls}" data-obsph="${esc(p)}" alt="Photograph of ${esc(visName(v))}">`:""}
async function obsPhotos(){const L=[...document.querySelectorAll("img[data-obsph]:not([src])")];if(!L.length||typeof LIVE==="undefined"||!LIVE||!SYNC||!SYNC.sb)return;
 for(const im of L){const p=im.dataset.obsph;if(!OBS_PH[p]){try{const{data}=await SYNC.sb.storage.from("dme-uploads").createSignedUrl(p,3600);OBS_PH[p]=data&&data.signedUrl}catch(e){}}if(OBS_PH[p])im.src=OBS_PH[p];else im.remove()}}
{const _r=render;render=function(){_r();try{obsKioskMarks();obsPhotos()}catch(e){}}}

/* ---------- profile ---------- */
function obsCal(v,can){const t=iso(TODAY),months=[];for(let m=v.start.slice(0,7);m<=(v.left||v.end).slice(0,7);m=mAdd(m,1))months.push(m);
 return months.map(m=>{const f=P(m+"-01"),st0=new Date(f);st0.setDate(1-((f.getDay()+6)%7));const cells=[];for(let k=0;k<42;k++){const d=new Date(st0);d.setDate(st0.getDate()+k);cells.push(d)}
  const last=cells.findLastIndex(d=>iso(d).slice(0,7)===m),rowsN=Math.ceil((last+1)/7);
  return`<div class="attcal"><h4>${f.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</h4><div class="acg">${["M","T","W","T","F","S","S"].map(x=>`<span class="acgh">${x}</span>`).join("")}${cells.slice(0,rowsN*7).map(d=>{const ds=iso(d),inR=ds>=v.start&&ds<=(v.left||v.end)&&ds.slice(0,7)===m,mk=v.att?.[ds],off=rotOff().includes(d.getDay());
   if(!inR)return`<span class="acd out">${ds.slice(0,7)===m?d.getDate():""}</span>`;const cls=mk?"a-"+mk.s:off?"a-off":ds<t?"a-miss":"";
   return`<button class="acd ${cls} ${ds===t?"today":""}" data-attcyc="${v.id}|${ds}" ${can&&ds<=t?"":"disabled"} title="${fd(ds)}: ${mk?AT_L[mk.s]+(mk.t?" at "+mk.t:"")+(mk.by?" · "+mk.by:""):off?"Weekly off":ds<t?"Not marked (absent)":""}">${d.getDate()}</button>`}).join("")}</div></div>`}).join("")}
const obsDocBtn=x=>!x?"Not uploaded":typeof x==="string"?`<button class="btn link" data-act="doc-open" data-path="${esc(x)}">Open</button>`:x.path?`<button class="btn link" data-act="doc-open" data-path="${esc(x.path)}">Open</button>`:`<span class="subt">${esc(x.name||"file")}</span>`;
const OBS_DOCS=[["photo","Photograph"],["cnic","CNIC (front)"],["cnic2","CNIC (back)"],["idcard","Institute ID card"],["letter","Letter from the institute"],["degree","Degree"],["signed","HOD-signed application"],["order","Office order"]];
function obsDocsHtml(v){const D=v.docs||{},need=v.attached===false?["photo","cnic","degree"]:v.attached===true?["photo","cnic","idcard","letter"]:["cnic"];
 const keys=[...OBS_DOCS.filter(([k])=>D[k]||need.includes(k)||k==="order"),...Object.keys(D).filter(k=>/^order\d+$/.test(k)).map(k=>[k,"Extension office order"])];
 return keys.map(([k,l])=>`<div class="doc"><b>${l}</b>${obsDocBtn(D[k])}</div>`).join("")}
function vObs(){const v=obsList().find(x=>x.id===route.id);if(!v)return`<div class="panel">Not found. <a href="#observers">Back</a></div>`;const st=obsStage(v),can=!isViewer(),c=obsCfg(),rem=obsBlocksLeft(v,c),F=v.fees||[],s=v.start?rotStats(v):null,unpaid=obsUnpaid(v);
 const f1=obsFirst(v),paid=!!(f1&&f1.status==="verified");
 const steps=[["Applied online",true],["HOD signed, challan issued",!!(v.recv||(f1&&f1.issued)||paid||v.fwd||v.start)],["Fee paid",paid||!!v.start],["Sent to the MS",!!(v.fwd||v.start)],["Office order",!!v.start],["Observing",!!v.start&&v.start<=iso(TODAY)],["Completed",st==="Completed"]];
 const a=obsActs(v,can),btns=h=>`<div class="actions" style="justify-content:flex-start">${h}</div>`,more=a.m.length?`<details class="rowmenu"><summary class="btn small">More ▾</summary><div class="rowmenu-list">${a.m.join("")}</div></details>`:"";
 const msg={"Applied":`<b>Next: the HOD-signed application.</b><span>The applicant prints the application form, gets it signed by the Head of the ${esc(v.unit||"")} department and brings it here. The Director signs it; then issue the fee challan (${money(f1?.amt)}) and hand it over.${obsAgo(v)>30?` <span class="d-red">Applied ${obsAgo(v)} days ago.</span>`:""}</span>`,
  "Challan issued":`<b>Next: the fee.</b><span>The challan (${esc(f1?.challan||"")}, ${money(f1?.amt)}) was issued on ${f1&&f1.issued?fd(dDay(f1.issued.at)):v.recv?fd(dDay(v.recv.at)):"—"}. When they bring the paid challan, press <b>Fee paid</b>.</span>`,
  "To forward":`<b>Next: sign and send to the MS.</b><span>The fee is paid. Keep the ME&amp;T copy of the challan; attach the Admin copy to the application and send it to the Medical Superintendent.</span>`,
  "With the MS":`<b>With the MS since ${v.fwd?fd(v.fwd.on):""}${obsWaitDays(v)?` (${obsWaitDays(v)} day${obsWaitDays(v)===1?"":"s"})`:""}.</b><span>The office order usually takes about 1.5 weeks; the hospital administration calls the applicant to collect it.${obsLate(v)?" <b>It has been more than 2 weeks: follow up with the MS office.</b>":""} When they bring the office order here, upload it and start the observership.</span>`}[st];
 const next=msg&&can?`<div class="flag ${st==="With the MS"&&!obsLate(v)||st==="To forward"?"info":""}" style="display:grid;gap:8px">${msg}${btns(a.p+more)}</div>`
  :obsEnding(v)&&can?`<div class="flag" style="display:grid;gap:8px"><b>The observership ends ${rotDaysLeft(v)===0?"today":fd(v.end)}.</b><span>Offer an extension${rem?` (${money(c.fee2)} for ${obsWeeks(c.block)})`:""} or tell them it is ending.</span>${btns(`${rem?`<button class="btn small primary" data-act="obs-ext" data-id="${v.id}">Extend…</button>`+obsWa(v,"ext","WhatsApp: offer extension"):""}${obsWa(v,"end","WhatsApp: ending")}<button class="btn small" data-act="obs-told" data-id="${v.id}">Done</button>`)}</div>`
  :can&&(a.p||a.m.length)?btns(a.p+more):"";
 return`<div><a href="#observers" class="btn link" style="padding-left:0">← Observership</a></div>
 <div class="panel"><div class="prof"><div class="avatar" aria-hidden="true">${obsPhotoTag(v,"obsph avatar-img")}${esc(v.name.split(" ").map(w=>w[0]).slice(0,2).join(""))}</div>
  <div class="who"><div class="code">Observer · ${esc(st)}</div><h2>${esc(visName(v))}</h2><div class="meta"><span>${esc(v.cat||"")}</span><span>${esc(v.inst||"")}</span><span>${esc(v.unit||"")} · ${obsWeeks(c.block*obsBlocks(v))}</span>${v.start?`<span>attendance ${obsWinTxt(obsWin(v))}</span>`:""}</div></div>
  <div class="actions">${can?`<button class="btn" data-act="obs-edit" data-id="${v.id}">Edit details</button>${st==="Closed"?"":`<button class="btn danger" data-act="obs-del" data-id="${v.id}">Delete</button>`}`:""}</div></div>
  <ol class="stepper" style="display:flex;gap:6px;flex-wrap:wrap;list-style:none;padding:0;margin:12px 0 0">${steps.map(([l,ok])=>`<li class="pill ${ok?"p-ric":""}" ${ok?"":'style="opacity:.6"'}>${l}</li>`).join("")}</ol></div>
 ${v.closed?`<div class="flag">Closed: ${esc(v.closed.why||"")} · ${fd(dDay(v.closed.at))}</div>`:""}${next}
 ${s?`<div class="kpis">${[[s.pct==null?"—":s.pct+"%","Attendance",`${s.P} present of ${s.work} working days so far`],[s.A,"Absent","unmarked past days count as absent"],[obsWeeks(obsLen(v)),"Observership",`${fd(v.start)} – ${fd(v.left||v.end)}`],[money(obsPaid(v)),"Fees paid",unpaid.length?`${money(unpaid.reduce((a,f)=>a+(+f.amt||0),0))} outstanding`:"nothing outstanding"]].map(([n,l,sub])=>`<div class="kpi"><span class="n">${n}</span><span class="l">${l}</span>${sub?`<span class="sub">${sub}</span>`:""}</div>`).join("")}</div>`:""}
 <div class="cols side"><div style="display:grid;gap:18px;align-content:start">${s?`<div class="panel"><h3>Attendance</h3><p class="subt" style="margin:0 0 8px">${can?"Tap a day to change it: Present › Absent › Leave › Holiday › clear.":""} <span class="lg a-P">P</span> present <span class="lg a-A">A</span> absent <span class="lg a-L">L</span> leave <span class="lg a-H">H</span> holiday / off · kiosk open ${obsWinTxt(obsWin(v))}</p><div class="attcals">${obsCal(v,can)}</div></div>`:""}
  <div class="panel"><h3>Fees and challans</h3><div class="tblwrap"><table><thead><tr><th>Challan</th><th>For</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>
   ${F.map(f=>{const iss=f.kind!=="first"||f.issued||f.status==="verified"||v.recv;return`<tr><td class="code">${esc(f.challan||"—")}${iss||!can?`<div><button class="btn link" data-act="obs-challan" data-id="${v.id}" data-f="${f.id}">PDF</button></div>`:""}</td><td>${f.kind==="first"?`First ${obsWeeks(c.block*(f.blocks||1))}`:f.kind==="ext"?`Extension · ${obsWeeks(c.block*(f.blocks||1))}`:esc(f.note||"Fee")}<div class="subt">${iss?`issued ${fd(dDay(f.issued?f.issued.at:f.at))}`:"not issued yet"}</div></td><td class="num">${money(f.amt)}</td>
    <td>${f.status==="verified"?`<span class="pill p-ric">Paid</span><div class="subt">${f.paidOn?fd(f.paidOn):""}${f.ref?` · ${esc(f.ref)}`:""}</div><div class="subt">${f.acc?`given to Accounts ${fd(f.acc.on)}`:`<span class="d-red">cash not yet given to Accounts</span>`}</div>${f.doc?`<div>${docBtn(f.doc,"Paid challan")}</div>`:""}`:`<span class="pill p-pend">Unpaid</span>${can?`<div><button class="btn link" data-act="${f.kind==="first"&&!iss?"obs-issue":"obs-paid"}" data-id="${v.id}" data-f="${f.id}">${f.kind==="first"&&!iss?"Issue challan":"Fee paid"}</button></div>`:""}`}</td></tr>`}).join("")||`<tr><td colspan="4" class="empty">No challan.</td></tr>`}</tbody></table></div></div></div>
  <div style="display:grid;gap:18px;align-content:start"><div class="panel"><h3>Details</h3><dl class="kv"><dt>Father's name</dt><dd>${esc(v.father||"—")}</dd>${v.gender?`<dt>Gender</dt><dd>${esc(v.gender)}</dd>`:""}${v.cnic?`<dt>CNIC</dt><dd>${esc(v.cnic)}</dd>`:""}<dt>Mobile</dt><dd>${esc(v.mobile||"—")}</dd>${v.email?`<dt>Email</dt><dd>${esc(v.email)}</dd>`:""}
   <dt>Category</dt><dd>${esc(v.cat||"—")}</dd><dt>Degree programme</dt><dd>${esc(v.degree||v.qual||"—")}</dd><dt>Institution</dt><dd>${esc(v.inst||"—")}${v.attached===true?" · endorsed by the institute":v.attached===false?" · not attached to an institute now":""}</dd>${v.yearStudy?`<dt>Year of study / passing</dt><dd>${esc(v.yearStudy)}</dd>`:""}${v.status2?`<dt>Semester / status</dt><dd>${esc(v.status2)}</dd>`:""}
   <dt>Department</dt><dd>${esc(v.unit||"—")}</dd>${v.sup?`<dt>Supervisor</dt><dd>${esc(rotFac(v))}</dd>`:""}${v.reason?`<dt>Purpose</dt><dd>${esc(v.reason)}</dd>`:""}<dt>Applied</dt><dd>${v.regAt?fd(dDay(v.regAt)):"—"}${v.src==="form"?" · online":""}</dd>${v.recv?`<dt>HOD-signed application received</dt><dd>${fd(dDay(v.recv.at))}${v.recv.by?" · "+esc(v.recv.by):""}</dd>`:""}${v.fwd?`<dt>Sent to the MS</dt><dd>${fd(v.fwd.on)}</dd>`:""}${v.order?`<dt>Office order</dt><dd>${esc(v.order.no||"received")}${v.order.date?` · ${fd(v.order.date)}`:""}</dd>`:""}${v.start?`<dt>Attendance time</dt><dd>${obsWinTxt(obsWin(v))}${v.attWin?"":" (usual time)"}</dd>`:""}${v.notes?`<dt>Notes</dt><dd>${esc(v.notes)}</dd>`:""}</dl></div>
   <div class="panel"><h3>Documents</h3><div class="docs">${obsDocsHtml(v)}</div>
    ${obsNew(v)&&can?`<div style="margin-top:10px"><button class="btn primary small" data-act="obs-checked" data-id="${v.id}">Documents checked</button></div>`:v.checked?`<p class="subt" style="margin:8px 0 0">Checked${v.checkedBy?" by "+esc(v.checkedBy):""}.</p>`:""}</div>
   ${can&&v.start?`<div class="panel"><h3>Attendance PIN</h3><p style="margin:0"><span class="code" style="font-size:22px;letter-spacing:.2em">${esc(v.pin)}</span></p><p class="subt" style="margin:4px 0 8px">Entered on the attendance kiosk in the DME office, ${obsWinTxt(obsWin(v))}.</p><div style="display:flex;gap:8px;flex-wrap:wrap">${obsWa(v,"pin","Send PIN on WhatsApp")}<button class="btn small" data-act="obs-win" data-id="${v.id}">Attendance time</button><button class="btn small" data-act="rot-pin" data-id="${v.id}">New PIN</button></div></div>`:""}</div></div>`}

/* ---------- staff sheets ---------- */
async function obsSaveFile(file,folder){if(!file)return null;const f=typeof docShrink==="function"?await docShrink(file):file;if(f.size>10*1024*1024)throw new Error(`${file.name} is larger than 10 MB`);
 if(!LIVE||!SYNC||!SYNC.sb)return{name:file.name};return{path:await docUpload(folder,f),name:file.name,at:new Date().toISOString(),by:ME}}
const obsFileIn=n=>document.querySelector(`#sheetform [name="${n}"]`)?.files?.[0];
const obsDocFields=(att)=>`<label class="f">Attached to an institute? <span class="h">studying or working there now</span><select name="attached" data-obsatt="1">${opt([["1","Yes: institute ID card and endorsement letter"],["0","No: degree instead"]],att===false?"0":"1")}</select></label>
 <label class="f">Photograph <span class="h">photo</span><input type="file" name="photoDoc" accept="image/*"></label>
 <div class="grid2"><label class="f">CNIC (front) <span class="h">photo or PDF</span><input type="file" name="cnicDoc" accept="image/*,application/pdf"></label><label class="f">CNIC (back) <span class="h">optional</span><input type="file" name="cnic2Doc" accept="image/*,application/pdf"></label></div>
 <div class="grid2" data-obsatt-yes ${att===false?'hidden':""}><label class="f">Institute ID card <span class="h">photo or PDF</span><input type="file" name="idcardDoc" accept="image/*,application/pdf"></label><label class="f">Institute's endorsement letter <span class="h">photo or PDF</span><input type="file" name="letterDoc" accept="image/*,application/pdf"></label></div>
 <label class="f" data-obsatt-no ${att===false?"":'hidden'}>Degree <span class="h">photo or PDF</span><input type="file" name="degreeDoc" accept="image/*,application/pdf"></label>`;
/* show the right document boxes for "attached to an institute" on the staff sheet and the public form */
document.addEventListener("change",e=>{const t=e.target;if(!t.dataset||!t.dataset.obsatt)return;const root=t.closest("form")||document,yes=t.value==="1";
 root.querySelectorAll("[data-obsatt-yes]").forEach(x=>x.hidden=!yes);root.querySelectorAll("[data-obsatt-no]").forEach(x=>x.hidden=yes)});
async function obsSaveDocs(v,folder){const out={};for(const[k,n] of [["photo","photoDoc"],["cnic","cnicDoc"],["cnic2","cnic2Doc"],["idcard","idcardDoc"],["letter","letterDoc"],["degree","degreeDoc"]]){const x=obsFileIn(n);if(x)out[k]=await obsSaveFile(x,folder)}return out}
const obsWinFields=v=>{const w=obsWin(v);return`<div class="grid2"><label class="f">Kiosk attendance from<input type="time" name="wfrom" value="${w.from}"></label><label class="f">until<input type="time" name="wto" value="${w.to}"></label></div>`};
function obsReadWin(v){const a=fv("wfrom"),b=fv("wto");if(!a||!b)return"Set the attendance time.";if(b<=a)return"The attendance time must end after it starts.";const c=obsCfg();if(a===c.attFrom&&b===c.attTo)delete v.attWin;else v.attWin={from:a,to:b};return""}
function sheetObs(v){const n=!v,c=obsCfg();v=v||{title:"",name:"",gender:"",father:"",cat:"",degree:"",inst:"",yearStudy:"",status2:"",unit:"",reason:"",cnic:"",mobile:"",email:"",notes:""};
 openSheet(n?"Add applicant":"Edit · "+visName(v),`<p class="subt" style="margin:0">${n?"For someone who applied on paper. Their application form is made; issue the challan when they bring it back signed by the HOD.":""}</p>
 <div class="grid2"><label class="f">Title <span class="h">optional</span><select name="title">${opt([["",""],["Dr.","Dr."],["Mr.","Mr."],["Ms.","Ms."],["Mrs.","Mrs."]],v.title||"")}</select></label><label class="f">Full name<input name="name" value="${esc(v.name)}"></label></div>
 <div class="grid2"><label class="f">Father's name<input name="father" value="${esc(v.father||"")}"></label><label class="f">Gender<select name="gender">${opt(["","Female","Male"],v.gender||"")}</select></label></div>
 <div class="grid2"><label class="f">CNIC<input name="cnic" value="${esc(v.cnic||"")}"></label><label class="f">Mobile<input name="mobile" value="${esc(v.mobile||"")}" placeholder="03xx-xxxxxxx"></label></div>
 <label class="f">Email <span class="h">optional</span><input name="email" value="${esc(v.email||"")}"></label>
 <div class="grid2"><label class="f">Category<select name="cat">${opt(["",...new Set([...(c.cats||OBS_CATS),v.cat].filter(Boolean))],v.cat||"")}</select></label><label class="f">Degree programme<input name="degree" value="${esc(v.degree||v.qual||"")}" placeholder="e.g. MBBS, BS Cardiac Perfusion"></label></div>
 <label class="f">Institution / university<input name="inst" value="${esc(v.inst||"")}"></label>
 <div class="grid2"><label class="f">Year of study / passing<input name="yearStudy" value="${esc(v.yearStudy||"")}"></label><label class="f">Current semester / status<input name="status2" value="${esc(v.status2||"")}" placeholder="e.g. 7th semester, graduated, working"></label></div>
 <div class="grid2"><label class="f">Department at RIC<input name="unit" list="obs-units" value="${esc(v.unit||"")}"></label>${n?`<label class="f">Duration<select name="blocks">${opt(obsDurOpts(c),"1")}</select></label>`:`<label class="f">Supervisor <span class="h">optional</span><select name="sup"><option value="">Not assigned</option>${DB.faculty.filter(f=>f.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(f=>`<option value="${f.id}" ${v.sup===f.id?"selected":""}>${esc(facName(f))}</option>`).join("")}</select></label>`}</div><datalist id="obs-units">${(c.units||ROT_UNITS).map(u=>`<option value="${esc(u)}">`).join("")}</datalist>
 <label class="f">Reason / purpose<textarea name="reason" rows="2">${esc(v.reason||"")}</textarea></label>
 ${n?obsDocFields(true):`<details class="f"><summary class="btn link" style="padding-left:0">Add or replace documents</summary><div style="display:grid;gap:10px;margin-top:8px">${obsDocFields(v.attached??(v.docs&&v.docs.degree&&!v.docs.letter?false:true))}</div></details>
  ${v.start?`<div class="grid2"><label class="f">Started<input type="date" name="start" value="${v.start}"></label><label class="f">Ends<input type="date" name="end" value="${v.end}"></label></div><label class="f">Left early on <span class="h">only if they stopped before the end date</span><input type="date" name="left" value="${v.left||""}"></label>${obsWinFields(v)}`:""}`}
 <label class="f">Notes<textarea name="notes" rows="2">${esc(v.notes||"")}</textarea></label>`,async()=>{
  const name=fv("name").replace(/^((dr|mr|ms|mrs)\.?\s+)+/i,"");if(name.length<3)return fail("Enter the full name.");if(!fv("inst"))return fail("Enter the institution.");if(!fv("unit"))return fail("Enter the department at RIC.");
  let mob=fv("mobile").replace(/\D/g,"");if(mob.startsWith("92"))mob="0"+mob.slice(2);if(mob&&mob.length!==11)return fail("Enter the mobile as 03xx-xxxxxxx.");const cn=fv("cnic").replace(/\D/g,"");
  const rec={title:fv("title"),name,father:fv("father"),gender:fv("gender"),cnic:cn.length===13?cn.slice(0,5)+"-"+cn.slice(5,12)+"-"+cn.slice(12):fv("cnic"),mobile:mob?mob.slice(0,4)+"-"+mob.slice(4):"",email:fv("email").toLowerCase(),cat:fv("cat"),degree:fv("degree"),inst:fv("inst"),yearStudy:fv("yearStudy"),status2:fv("status2"),unit:fv("unit"),reason:fv("reason"),notes:fv("notes"),attached:fv("attached")!=="0"};
  if(n){const dup=cn.length===13&&obsList().find(o=>String(o.cnic||"").replace(/\D/g,"")===cn&&!o.closed&&(!o.start||(o.left||o.end)>=iso(TODAY)));if(dup)return fail(`${visName(dup)} already has an open application with this CNIC.`);
   const b=+fv("blocks")||1,id=uid("V");let docs={};try{docs=await obsSaveDocs(null,`observers/${id}`)}catch(e){return fail(e.message||"A document could not be uploaded.")}
   await obsFresh();const fee={id:uid("F"),kind:"first",blocks:b,amt:obsFee(c,b),challan:obsNextChallan(),at:new Date().toISOString(),by:ME,status:"unpaid"};
   const nv={id,kind:"obs",...rec,blocks:b,pin:rotPin(),att:{},fees:[fee],docs,src:"hand",regAt:new Date().toISOString()};visList().push(nv);
   log(`Observership applicant added: ${visName(nv)}, ${rec.inst}, ${rec.unit}, ${obsWeeks(b*c.block)}; application ${fee.challan}`,"obs-"+id);persist();go("obs-"+id);
   toast(`Added. Application ${fee.challan}`);setTimeout(()=>obsAppPdf(nv,true,c).catch(e=>toast(e.message)),300);return true}
  rec.sup=fv("sup");if(v.start){const s=fv("start"),e=fv("end");if(!s||!e||e<s)return fail("Check the dates.");if(days(P(e),P(s))+1>c.maxDays)return fail(`An observership can be at most ${obsWeeks(c.maxDays)}.`);rec.start=s;rec.end=e;const l=fv("left");if(l&&(l<s||l>e))return fail("The leaving date must be within the observership.");rec.left=l||null;const we=obsReadWin(v);if(we)return fail(we)}
  let docs={};try{docs=await obsSaveDocs(v,`observers/${v.id}`)}catch(e){return fail(e.message||"A document could not be uploaded.")}
  Object.assign(v,rec);v.docs={...(v.docs||{}),...docs};if(!v.left)delete v.left;log(`Observer edited: ${visName(v)}${Object.keys(docs).length?` (documents: ${Object.keys(docs).join(", ")})`:""}`,"obs-"+v.id);toast("Saved");return true},n?"Add applicant":"Save")}
/* async save: openSheet expects a sync return, so the handler closes the sheet itself */
function obsAsyncSave(){const S=SHEET;if(!S)return;const f=S.onSave;S.onSave=()=>{if(S.busy)return false;const p=f();if(p&&typeof p.then==="function"){S.busy=1;const b=document.querySelector('.sheet [data-act="save"]'),t=b&&b.textContent;if(b){b.disabled=true;b.textContent="Saving…"}
 p.then(r=>{S.busy=0;if(r===true){if(SHEET===S){persist();closeSheet();render()}}else if(b&&b.isConnected){b.disabled=false;b.textContent=t}}).catch(e=>{S.busy=0;if(b&&b.isConnected){b.disabled=false;b.textContent=t}fail(e.message||"Could not save")});return false}return p}}
/* step 2: the HOD-signed application is back; the Director signs it and the office hands over the challan */
function sheetObsIssue(v){const c=obsCfg(),f=obsFirst(v),b0=f?f.blocks||1:v.blocks||1;
 openSheet(`Issue challan · ${visName(v)}`,`<p class="subt" style="margin:0">The applicant has brought the application signed by the Head of Department. The Director ME&amp;T signs it; then print the fee challan (four copies) and hand it over. Applicants cannot download the challan themselves.</p>
 <label class="check2"><input type="checkbox" name="hod"> The Head of Department has signed the application</label>
 <label class="f">Duration<select name="blocks">${opt(obsDurOpts(c),String(b0))}</select></label>
 <label class="f">HOD-signed application <span class="h">optional: scan or photo</span><input type="file" name="app" accept="image/*,application/pdf"></label>`,async()=>{
  if(!document.querySelector('#sheetform [name="hod"]').checked)return fail("The Head of Department must sign the application first.");
  let a=null;try{a=await obsSaveFile(obsFileIn("app"),`observers/${v.id}`)}catch(e){return fail(e.message||"The file could not be uploaded.")}
  const b=+fv("blocks")||1;let fee=f;if(!fee){await obsFresh();fee={id:uid("F"),kind:"first",challan:obsNextChallan(),at:new Date().toISOString(),by:ME,status:"unpaid"};v.fees=[fee,...(v.fees||[])]}
  Object.assign(fee,{blocks:b,amt:obsFee(c,b),issued:{at:new Date().toISOString(),by:ME}});v.blocks=b;
  v.recv={at:new Date().toISOString(),by:ME,hod:true};v.docs=v.docs||{};if(a)v.docs.signed=a;if(!v.checked){v.checked=true;v.checkedBy=ME}
  log(`Observership challan issued: ${visName(v)}, HOD signed; challan ${fee.challan} ${money(fee.amt)} (${obsWeeks(c.block*b)})`,"obs-"+v.id);
  setTimeout(()=>obsChallanPdf(v,fee,c).catch(er=>toast(er.message)),300);toast(`Challan ${fee.challan} issued. Print it and hand it over.`);return true},"Issue challan")}
/* before the fee is paid: change the length (and so the fee) */
function sheetObsDur(v){const c=obsCfg(),f=obsFirst(v);if(f&&f.status==="verified"){sheetObsExt(v);return}
 openSheet(`Change duration · ${visName(v)}`,`<p class="subt" style="margin:0">Before the fee is paid. ${f&&f.issued?"Print the challan again afterwards and give the new one to the applicant.":""}</p><label class="f">Duration<select name="blocks">${opt(obsDurOpts(c),String(f?f.blocks||1:v.blocks||1))}</select></label>`,()=>{
  const b=+fv("blocks")||1;v.blocks=b;if(f){f.blocks=b;f.amt=obsFee(c,b)}log(`Observership duration changed: ${visName(v)}, ${obsWeeks(c.block*b)}${f?`, ${money(f.amt)}`:""}`,"obs-"+v.id);
  if(f&&f.issued)setTimeout(()=>obsChallanPdf(v,f,c).catch(er=>toast(er.message)),300);toast("Duration changed");return true},"Save")}
/* step 3: fee paid; usually sent to the MS the same day */
function sheetObsPaid(v,f){const first=f.kind==="first"&&!v.fwd&&!v.start;
 openSheet(`Fee paid · ${visName(v)}`,`<p style="margin:0">Challan <b class="code">${esc(f.challan||"")}</b> · ${money(f.amt)}. Keep the ME&amp;T copy; the cash goes to the Accounts Office.</p>
 <div class="grid2"><label class="f">Cash received on<input type="date" name="on" value="${iso(TODAY)}"></label><label class="f">Receipt no. <span class="h">optional</span><input name="ref"></label></div>
 <label class="f">Paid challan <span class="h">optional: photo or PDF</span><input type="file" name="doc" accept="image/*,application/pdf"></label>
 ${first?`<label class="check2"><input type="checkbox" name="fwd" checked> Signed by the Director ME&amp;T and sent to the MS today, with the Admin copy of the challan</label>`:""}`,async()=>{
  const on=fv("on")||iso(TODAY);if(on>iso(TODAY))return fail("The payment date cannot be in the future.");
  let doc=null;try{doc=await obsSaveFile(obsFileIn("doc"),`observers/${v.id}`)}catch(e){return fail(e.message||"The file could not be uploaded.")}
  Object.assign(f,{status:"verified",paidOn:on,ref:fv("ref"),vBy:ME,vAt:new Date().toISOString()});if(doc)f.doc=doc;if(f.kind==="first"&&!f.issued)f.issued={at:f.at||new Date().toISOString(),by:ME};
  const fw=first&&document.querySelector('#sheetform [name="fwd"]')?.checked;if(fw)v.fwd={on:iso(TODAY),by:ME};
  log(`Observership fee paid: ${visName(v)}, challan ${f.challan}, ${money(f.amt)}${fw?"; sent to the MS":""}`,"obs-"+v.id);toast(fw?"Fee paid and sent to the MS":"Fee recorded as paid");return true},"Save")}
function sheetObsFwd(v){openSheet(`Sent to the MS · ${visName(v)}`,`<p class="subt" style="margin:0">Signed by the Director ME&amp;T, with the Admin copy of the paid challan attached.</p><label class="f">Sent on<input type="date" name="on" value="${iso(TODAY)}"></label>`,()=>{
  const on=fv("on")||iso(TODAY);if(on>iso(TODAY))return fail("The date cannot be in the future.");v.fwd={on,by:ME};log(`Observership application sent to the MS: ${visName(v)} (${fd(on)})`,"obs-"+v.id);toast("Marked as sent to the MS");return true},"Save")}
function sheetObsStart(v){const c=obsCfg(),b=obsBlocks(v);
 openSheet(`Office order received · ${visName(v)}`,`<p class="subt" style="margin:0">The applicant has brought the office order issued by the hospital administration. Upload it and set the start date. The end date follows the ${obsWeeks(c.block*b)} paid for; change it if the order says otherwise.</p>
 <label class="f">Office order <span class="h">photo or PDF</span><input type="file" name="doc" accept="image/*,application/pdf"></label>
 <div class="grid2"><label class="f">Order no. <span class="h">optional</span><input name="no"></label><label class="f">Order date <span class="h">optional</span><input type="date" name="od"></label></div>
 <div class="grid2"><label class="f">Starts<input type="date" name="start" value="${iso(TODAY)}" data-obsstart="${v.id}"></label><label class="f">Ends<input type="date" name="end" value="${obsEndOf(iso(TODAY),c.block*b)}"></label></div>
 ${obsWinFields(v)}
 <label class="f">Supervisor at RIC <span class="h">optional</span><select name="sup"><option value="">Not assigned</option>${DB.faculty.filter(f=>f.active!==false).sort((a,b2)=>a.name.localeCompare(b2.name)).map(f=>`<option value="${f.id}">${esc(facName(f))} · ${esc(f.spec)}</option>`).join("")}</select></label>`,async()=>{
  const file=obsFileIn("doc");if(!file&&LIVE)return fail("Upload the office order.");const s=fv("start"),e=fv("end");if(!s||!e||e<s)return fail("Check the dates.");if(days(P(e),P(s))+1>c.maxDays)return fail(`An observership can be at most ${obsWeeks(c.maxDays)}.`);
  const we=obsReadWin(v);if(we)return fail(we);
  let doc=null;try{doc=await obsSaveFile(file,`observers/${v.id}`)}catch(er){return fail(er.message||"The file could not be uploaded.")}
  v.docs=v.docs||{};if(doc)v.docs.order=doc;v.order={no:fv("no"),date:fv("od")};v.start=s;v.end=e;v.sup=fv("sup");v.pin=v.pin||rotPin();v.att=v.att||{};
  (v.fees||[]).filter(f=>f.kind==="ext"&&!f.from).forEach(f=>{f.from=s;f.to=e});
  log(`Observership started: ${visName(v)}, ${v.unit}, ${fd(s)} – ${fd(e)}, attendance ${obsWinTxt(obsWin(v))}${v.order.no?` (office order ${v.order.no})`:""}`,"obs-"+v.id);toast(`Started. PIN ${v.pin}`);return true},"Start observership")}
document.addEventListener("change",e=>{const t=e.target;if(!t.dataset||!t.dataset.obsstart)return;const v=obsList().find(x=>x.id===t.dataset.obsstart),en=document.querySelector('#sheetform [name="end"]');if(v&&en&&t.value)en.value=obsEndOf(t.value,obsCfg().block*obsBlocks(v))});
/* extension: from the start, or even before (a longer observership paid in advance) */
function sheetObsExt(v){const c=obsCfg(),rem=obsBlocksLeft(v,c),f1=obsFirst(v);if(!rem){toast(`Already at the ${obsWeeks(c.maxDays)} limit`);return}
 if(f1&&f1.status!=="verified"&&!v.start){sheetObsDur(v);return}
 const from=v.start?obsEndOf(v.end,2):null;
 openSheet(`Extend · ${visName(v)}`,`<p style="margin:0">${v.start?`Now ${fd(v.start)} – ${fd(v.end)} (${obsWeeks(obsLen(v))}).`:`Not started yet; ${obsWeeks(c.block*obsBlocks(v))} so far.`} Up to ${obsWeeks(c.maxDays)} in all.</p>
 <label class="f">Extend by<select name="b">${opt(Array.from({length:rem},(_,i)=>[String(i+1),`${obsWeeks(c.block*(i+1))}${from?` · until ${fd(obsEndOf(from,c.block*(i+1)))}`:""} · ${money(c.fee2*(i+1))}`]),"1")}</select></label>
 <label class="f">Extension office order <span class="h">optional, photo or PDF</span><input type="file" name="doc" accept="image/*,application/pdf"></label>
 <p class="subt" style="margin:0">A challan for the extension fee is made; print it and record it as paid when they bring it back.</p>`,async()=>{
  await obsFresh();const b=+fv("b")||1,to=from?obsEndOf(from,c.block*b):null,f={id:uid("F"),kind:"ext",blocks:b,amt:c.fee2*b,challan:obsNextChallan(),from,to,at:new Date().toISOString(),issued:{at:new Date().toISOString(),by:ME},by:ME,status:"unpaid"};
  let doc=null;try{doc=await obsSaveFile(obsFileIn("doc"),`observers/${v.id}`)}catch(er){return fail(er.message)}if(doc){v.docs=v.docs||{};v.docs["order"+((v.fees||[]).length)]=doc}
  v.fees=[...(v.fees||[]),f];if(v.start){const old=v.end;v.end=to;if(v.told)delete v.told[old];delete v.left}
  log(`Observership extended: ${visName(v)}${to?` until ${fd(to)}`:""} (${obsWeeks(c.block*b)}); challan ${f.challan} ${money(f.amt)}`,"obs-"+v.id);setTimeout(()=>obsChallanPdf(v,f,c).catch(er=>toast(er.message)),300);toast(`${to?`Extended until ${fd(to)}`:"Extended"}. Challan ${f.challan}`);return true},"Extend and make challan")}
function sheetObsWin(v){openSheet(`Attendance time · ${visName(v)}`,`<p class="subt" style="margin:0">The kiosk takes ${esc(visName(v))}'s attendance only between these times. Staff can still mark attendance at any time. The usual time is set in <b>Fees, times and form</b>.</p>${obsWinFields(v)}`,()=>{
  const we=obsReadWin(v);if(we)return fail(we);log(`Observer ${visName(v)}: kiosk attendance time ${obsWinTxt(obsWin(v))}`,"obs-"+v.id);toast("Attendance time saved");return true},"Save")}
function sheetObsAcc(){const H=obsCashHeld().sort((a,b)=>(a.f.paidOn||"").localeCompare(b.f.paidOn||""));if(!H.length){toast("No cash waiting to be handed over");return}
 openSheet("Hand over cash to the Accounts Office",`<p class="subt" style="margin:0">Tick the challans whose cash you are handing over. A handover list (PDF) is made for the Accounts Office to sign.</p>
 <div style="display:grid;gap:6px">${H.map(({v,f},i)=>`<label class="check2"><input type="checkbox" name="h${i}" checked> <span><b class="code">${esc(f.challan||"")}</b> · ${esc(visName(v))} · ${money(f.amt)} <span class="subt">received ${f.paidOn?fd(f.paidOn):"—"}</span></span></label>`).join("")}</div>
 <div class="grid2"><label class="f">Handed over on<input type="date" name="on" value="${iso(TODAY)}"></label><label class="f">Received by (Accounts Office)<input name="to" placeholder="name"></label></div>
 <label class="f">Accounts receipt no. <span class="h">optional</span><input name="ref"></label>`,async()=>{
  const pick=H.filter((x,i)=>document.querySelector(`#sheetform [name="h${i}"]`)?.checked);if(!pick.length)return fail("Tick at least one challan.");const on=fv("on")||iso(TODAY);if(on>iso(TODAY))return fail("The date cannot be in the future.");
  const acc={on,to:fv("to"),ref:fv("ref"),by:ME,at:new Date().toISOString()},tot=pick.reduce((a,x)=>a+(+x.f.amt||0),0);pick.forEach(x=>x.f.acc={...acc});
  log(`Observership fees handed to the Accounts Office: ${money(tot)}, ${pick.length} challan${pick.length>1?"s":""} (${pick.map(x=>x.f.challan).join(", ")})${acc.to?`, received by ${acc.to}`:""}`);
  setTimeout(()=>obsAccPdf(pick,acc).catch(e=>toast(e.message||"Could not make the PDF")),300);toast(`${money(tot)} recorded as handed over`);return true},"Hand over")}
async function obsAccPdf(L,acc){await bioLoadPdf();const{jsPDF}=window.jspdf;const d=new jsPDF({unit:"mm",format:"a4"}),W=210,M=16,BR=[109,31,43],logo=obsLogo();
 const T=(t,x,y,o={})=>{d.setFont("helvetica",o.b?"bold":"normal");d.setFontSize(o.s||9.5);d.setTextColor(...(o.c||[25,25,25]));d.text(t??"",x,y,{align:o.a||"left"})};
 if(logo&&logo.startsWith("data:"))try{d.addImage(logo,"JPEG",M,10,18,18)}catch(e){}
 T("RAWALPINDI INSTITUTE OF CARDIOLOGY",W/2,16,{b:1,s:13,a:"center",c:BR});T("Observership fees handed to the Accounts Office",W/2,22.5,{b:1,s:11,a:"center"});
 T(`Date: ${fd(acc.on)}`,M,36);if(acc.ref)T(`Accounts receipt no.: ${acc.ref}`,W-M,36,{a:"right"});
 const cols=[["Sr.",10],["Challan no.",28],["Name",56],["Department",36],["Received",24],["Amount",24]];let y=42;d.setFillColor(243,236,226);d.rect(M,y,W-2*M,7.5,"F");let x=M;cols.forEach(([h,w],i)=>{T(h,i===5?x+w-2:x+2,y+5,{b:1,s:9,a:i===5?"right":"left"});x+=w});y+=7.5;
 d.setDrawColor(170);d.setLineWidth(.2);L.forEach(({v,f},i)=>{if(y>262){d.addPage();y=20}x=M;const vals=[String(i+1),f.challan||"",visName(v),v.unit||"",f.paidOn?fd(f.paidOn):"",money(f.amt)];
  cols.forEach(([,w],c)=>{d.rect(x,y,w,7.5);let t=vals[c];d.setFontSize(9);while(t.length>3&&d.getTextWidth(t)>w-4)t=t.slice(0,-1);T(t,c===5?x+w-2:x+2,y+5,{s:9,a:c===5?"right":"left",b:c===1});x+=w});y+=7.5});
 const tot=L.reduce((a,x)=>a+(+x.f.amt||0),0);T("Total",M+10+28+56+36+24-2,y+5.5,{b:1,a:"right"});T(money(tot),W-M-2,y+5.5,{b:1,a:"right",c:BR});y+=10;T(`Rupees ${obsWords(tot)} only`,M,y+2,{s:9,c:[80,80,80]});
 y=Math.max(y+30,230);d.setDrawColor(90);d.line(M,y,M+70,y);d.line(W-M-70,y,W-M,y);T("Handed over by (Medical Education)",M,y+5,{s:9,b:1});T(ME||"",M,y+10,{s:8.5,c:[90,90,90]});T("Received by (Accounts Office)",W-M,y+5,{s:9,b:1,a:"right"});if(acc.to)T(acc.to,W-M,y+10,{s:8.5,a:"right",c:[90,90,90]});
 await obsDl(`Observership fees to Accounts ${acc.on}.pdf`,d.output("blob"))}
function sheetObsCfg(){const c=obsCfg();
 openSheet("Observership: fees, times and form",`<div class="grid2"><label class="f">First period (PKR)<input type="number" name="fee1" min="0" step="500" value="${c.fee1}"></label><label class="f">Each extension (PKR)<input type="number" name="fee2" min="0" step="500" value="${c.fee2}"></label></div>
 <div class="grid2"><label class="f">Length of each period (days)<input type="number" name="block" min="1" value="${c.block}"></label><label class="f">Longest observership (days)<input type="number" name="maxDays" min="1" value="${c.maxDays}"></label></div>
 <h4 style="margin:6px 0 0">Printed on the challan</h4>
 <label class="f">Account title on the challan <span class="h">paid in cash</span><input name="payTo" value="${esc(obsPayTo(c))}"></label>
 <label class="f">Pay-by date: days after the challan is issued <span class="h">allow time for the HOD's signature</span><input type="number" name="dueDays" min="1" value="${c.dueDays}"></label>
 <h4 style="margin:6px 0 0">Attendance kiosk</h4>
 <div class="grid2"><label class="f">Usual attendance time from<input type="time" name="attFrom" value="${esc(c.attFrom||"08:00")}"></label><label class="f">until<input type="time" name="attTo" value="${esc(c.attTo||"10:00")}"></label></div>
 <p class="subt" style="margin:0">Observers can mark attendance on the kiosk only within this time. Change it for one observer from their row's menu or profile.</p>
 <h4 style="margin:6px 0 0">Application form</h4>
 <label class="f">Status<select name="open">${opt([["1","Open: accepting applications"],["0","Closed"]],c.open===false?"0":"1")}</select></label>
 <label class="f">Close automatically after <span class="h">optional</span><input type="date" name="close" value="${esc(c.close||"")}"></label>
 <label class="f">Message at the top of the form <span class="h">optional</span><textarea name="msg" rows="3">${esc(c.msg||"")}</textarea></label>
 <label class="f">Contact for questions<input name="contact" value="${esc(c.contact||"")}" placeholder="e.g. DME office, 051-xxxxxxx"></label>
 <label class="f">Departments offered <span class="h">one per line</span><textarea name="units" rows="6">${esc((c.units||[]).join("\n"))}</textarea></label>
 <label class="f">Categories <span class="h">one per line</span><textarea name="cats" rows="6">${esc((c.cats||OBS_CATS).join("\n"))}</textarea></label>`,()=>{
  const n={...c,fee1:+fv("fee1"),fee2:+fv("fee2"),block:+fv("block"),maxDays:+fv("maxDays"),dueDays:+fv("dueDays")||14,payTo:fv("payTo")||OBS_PAYTO,attFrom:fv("attFrom")||"08:00",attTo:fv("attTo")||"10:00",open:fv("open")==="1",close:fv("close"),msg:fv("msg"),contact:fv("contact"),units:fv("units").split("\n").map(s=>s.trim()).filter(Boolean),cats:fv("cats").split("\n").map(s=>s.trim()).filter(Boolean)};
  ["acct","bank","branch","acctTitle","acctNo"].forEach(k=>delete n[k]);if(!(n.block>0&&n.maxDays>=n.block))return fail("Check the period lengths.");if(n.attTo<=n.attFrom)return fail("The attendance time must end after it starts.");if(!n.units.length||!n.cats.length)return fail("List at least one department and one category.");
  DB.settings.forms=DB.settings.forms||{};DB.settings.forms.obs=n;log(`Observership settings: ${money(n.fee1)} for ${obsWeeks(n.block)}, ${money(n.fee2)} per extension, up to ${obsWeeks(n.maxDays)}; kiosk ${n.attFrom}–${n.attTo}; form ${n.open?"open":"closed"}`);toast("Saved");return true})}

/* ---------- staff actions ---------- */
document.addEventListener("click",e=>{const r=e.target.closest("[data-obstab],[data-obstold],[data-act^='obs-']");if(!r||!DB)return;
 if(r.dataset.obstab){UI.obsTab=r.dataset.obstab;render();return}
 if(r.dataset.obstold){const[id,k]=r.dataset.obstold.split("|"),v=obsList().find(x=>x.id===id);if(v){v.told={...(v.told||{}),[v.end]:{at:new Date().toISOString(),by:ME,what:k}};log(`Observer ${visName(v)}: ${k==="ext"?"extension offered":"told the observership is ending"} (WhatsApp)`,"obs-"+v.id);persist();setTimeout(render,300)}return}
 const a=r.dataset.act;if(a==="obs-add"){sheetObs();obsAsyncSave();return}if(a==="obs-cfg")return sheetObsCfg();if(a==="obs-acc"){sheetObsAcc();obsAsyncSave();return}if(a==="obs-copy")return copyText(obsLink(),r);
 if(a==="obs-qr"){const url=obsLink();document.getElementById("overlay").innerHTML=`<div class="scrim" data-act="close"></div><div class="qrfull" role="dialog" aria-modal="true" aria-label="QR code"><div class="code">Scan to apply</div><h2>Observership application</h2><div class="qrbig">${qrSvg(url,10)}</div><div class="code" style="font-size:13px;word-break:break-all">${esc(url)}</div><button class="btn" data-act="close">Close</button></div>`;return}
 const v=obsList().find(x=>x.id===r.dataset.id);if(!v)return;const f=r.dataset.f&&(v.fees||[]).find(z=>z.id===r.dataset.f);
 if(a==="obs-edit"){sheetObs(v);obsAsyncSave();return}if(a==="obs-ext"){sheetObsExt(v);obsAsyncSave();return}if(a==="obs-start"){sheetObsStart(v);obsAsyncSave();return}if(a==="obs-issue"||a==="obs-recv"){sheetObsIssue(v);obsAsyncSave();return}if(a==="obs-fwd")return sheetObsFwd(v);
 if(a==="obs-dur")return sheetObsDur(v);if(a==="obs-win")return sheetObsWin(v);
 if(a==="obs-paid"&&f){if(f.kind==="first"&&obsStage(v)==="Applied")sheetObsIssue(v);else sheetObsPaid(v,f);obsAsyncSave();return}
 if(a==="obs-pack"){obsAppPdf(v).catch(er=>toast(er.message||"Could not make the PDF"));return}
 if(a==="obs-challan"&&f){obsChallanPdf(v,f,obsCfg()).catch(er=>toast(er.message||"Could not make the challan"));return}
 if(a==="obs-app"){obsAppPdf(v).catch(er=>toast(er.message||"Could not make the PDF"));return}
 if(a==="obs-checked"){v.checked=true;v.checkedBy=ME;log(`Observership documents checked: ${visName(v)}`,"obs-"+v.id);persist();render();return}
 if(a==="obs-told"){v.told={...(v.told||{}),[v.end]:{at:new Date().toISOString(),by:ME,what:"done"}};log(`Observer ${visName(v)}: end-of-observership reminder cleared`,"obs-"+v.id);persist();render();return}
 if(a==="obs-close")return openSheet(`Close · ${visName(v)}`,`<label class="f">Reason<select name="w">${opt(["Withdrawn by the applicant","Not approved by the MS","Did not return after applying","Did not pay the fee","Other"])}</select></label><label class="f">Note <span class="h">optional</span><input name="n"></label>`,()=>{v.closed={why:fv("w")+(fv("n")?": "+fv("n"):""),at:new Date().toISOString(),by:ME};log(`Observership closed: ${visName(v)} (${v.closed.why})`,"obs-"+v.id);return true},"Close");
 if(a==="obs-reopen"){delete v.closed;log(`Observership reopened: ${visName(v)}`,"obs-"+v.id);persist();render();return}
 if(a==="obs-del"){if(r.dataset.armed!=="1"){r.dataset.armed="1";r.textContent="Tap again to delete";return}DB.visitors=visList().filter(x=>x!==v);log(`Observership record deleted: ${visName(v)} (${v.inst})`);toast("Deleted");go("observers")}});
document.addEventListener("input",e=>{if(e.target.id==="obsq"){UI.obsQ=e.target.value;const p=e.target.selectionStart;render();const n=document.getElementById("obsq");if(n){n.focus();n.setSelectionRange(p,p)}}});
VIEW_ACTS.add("obs-qr");VIEW_ACTS.add("obs-copy");VIEW_ACTS.add("obs-challan");VIEW_ACTS.add("obs-app");VIEW_ACTS.add("obs-pack");

/* ---------- kiosk: each observer's attendance time ---------- */
function obsKioskMarks(){if(route.v!=="kiosk")return;const now=new Date();
 document.querySelectorAll("[data-kio-sel]").forEach(b=>{const v=visList().find(x=>x.id===b.dataset.kioSel);if(!v||v.kind!=="obs"||b.dataset.win)return;b.dataset.win="1";const open=obsWinOpen(v,now),sp=b.querySelector("span");
  if(sp)sp.insertAdjacentHTML("beforeend",` · ${open?"":"closed now · "}${obsWinTxt(obsWin(v))}`);if(!open)b.classList.add("kio-closed")});
 if(UI.kio&&UI.kio.sel){const v=visList().find(x=>x.id===UI.kio.sel),h=document.querySelector(".kio h2");if(v&&v.kind==="obs"&&h&&!h.dataset.ph){h.dataset.ph="1";const ph=obsPhotoTag(v,"obsph kio-ph");if(ph)h.insertAdjacentHTML("beforebegin",ph)}}}
document.addEventListener("click",e=>{if(route.v!=="kiosk")return;let v=null;const s=e.target.closest("[data-kio-sel]");
 if(s)v=visList().find(x=>x.id===s.dataset.kioSel);
 else{const b=e.target.closest("[data-kio]");if(b&&/^\d$/.test(b.dataset.kio)&&UI.kio&&UI.kio.sel&&UI.kio.pin.length===3)v=visList().find(x=>x.id===UI.kio.sel)}
 if(v&&!obsWinOpen(v)){e.stopImmediatePropagation();e.preventDefault();const w=obsWin(v);kioMsg(false,`Attendance time: ${obsWinTxt(w)}`,`${visName(v)}, you can mark your attendance only between ${w.from} and ${w.to}. Please ask the DME office.`)}},true);
setInterval(()=>{if(route.v==="kiosk"&&UI.kio&&!UI.kio.sel&&!UI.kio.msg)render()},60000);

/* ---------- menu, dashboard, download ---------- */
{const i=NAVG.findIndex(n=>n[1]==="rotating");if(i>=0&&!NAVG.some(n=>n[1]==="observers"))NAVG.splice(i+1,0,[NAVG[i][0],"observers","Observership"])}
if(typeof NAV_ICON==="object"&&NAV_ICON)NAV_ICON.observers=NAV_ICON.rotating||"";
{const _d=rotDashCard;rotDashCard=function(){const a=_d()||"",L=obsList(),cur=L.filter(v=>obsStage(v)==="Current"),end=L.filter(obsEnding),tf=L.filter(v=>obsStage(v)==="To forward"),ms=L.filter(v=>obsStage(v)==="With the MS"),lt=ms.filter(obsLate);if(!cur.length&&!end.length&&!tf.length&&!ms.length)return a;
 return a+card("Observership",cur.length,"observers",olist([...end.map(v=>oli("obs-"+v.id,esc(visName(v)),esc(v.unit)+" · ends "+fd(v.end).slice(0,6),'<span class="pill p-pend">extend or end</span>')),...(tf.length?[oli("observers",`${tf.length} to send to the MS`,"HOD signed, fee paid",'<span class="pill p-pend">to do</span>')]:[]),...(ms.length?[oli("observers",`${ms.length} with the MS`,"waiting for the office order",lt.length?`<span class="pill p-bad">${lt.length} over 2 weeks</span>`:"")]:[]),...cur.filter(v=>!obsEnding(v)).slice(0,4).map(v=>oli("obs-"+v.id,esc(visName(v)),esc(v.unit)+" · until "+fd(v.end).slice(0,6),(m=>m?.s==="P"?`<span class="pill p-ric">${m.t||"present"}</span>`:'<span class="pill p-pause">not marked</span>')(v.att?.[iso(TODAY)])))],"No observers at RIC."))}}
EXPORTS.observers=()=>({file:"Observership",sheets:[sheetFrom("Observership",obsList().map(v=>{const s=v.start?rotStats(v):{};return{"Name":visName(v),"Father's name":v.father||"","Gender":v.gender||"","CNIC":v.cnic||"","Mobile":v.mobile||"","Category":v.cat||"","Degree":v.degree||v.qual||"","Institution":v.inst||"","Department":v.unit||"","Stage":obsStage(v),"Applied":dDay(v.regAt),"HOD-signed application received":v.recv?dDay(v.recv.at):"","Challan issued":(f=>f&&f.issued?dDay(f.issued.at):"")(obsFirst(v)),"Sent to the MS":v.fwd?v.fwd.on:"","Start":v.start||"","End":v.left||v.end||"","Weeks":v.start?Math.round(obsLen(v)/7*10)/10:"","Present":s.P??"","Working days":s.work??"","Attendance %":s.pct??"","Fees paid (PKR)":obsPaid(v),"Given to Accounts (PKR)":(v.fees||[]).filter(f=>f.acc).reduce((a,f)=>a+(+f.amt||0),0),"Outstanding (PKR)":obsUnpaid(v).reduce((a,f)=>a+(+f.amt||0),0),"Challans":(v.fees||[]).map(f=>f.challan).filter(Boolean).join(", "),"Office order":v.order?.no||"","Attendance time":v.start?obsWinTxt(obsWin(v)):"","Attached to an institute":v.attached===true?"Yes":v.attached===false?"No":""}}))]});
{const _v=vRot;vRot=function(){const v=visList().find(x=>x.id===route.id);if(v&&v.kind==="obs"){setTimeout(()=>go("obs-"+v.id),0);return""}return _v()}}

/* ---------- the public application form (?obs=1) ---------- */
let OBSPUB={cfg:null};
async function obsPublicPage(){document.body.classList.add("public");
 try{const{data}=await SYNC.sb.rpc("dme_public_lists");OBSPUB.cfg={...FORM_DEF.obs,...((data&&data.forms&&data.forms.obs)||{})}}catch(e){OBSPUB.cfg={...FORM_DEF.obs}}
 obsPubRender()}
const obsPubCfg=()=>{const C={...FORM_DEF.obs,...(OBSPUB.cfg||{})};return{...C,fee1:+C.fee1,fee2:+C.fee2,block:+C.block||14,maxDays:+C.maxDays||91,dueDays:+C.dueDays||14}};
function obsPubRender(done){const c=obsPubCfg();
 if(done){OBSPUB.done=done;const u=esc(done.v.unit);return pubShell(`<div class="panel fbform">${formHead(null,"Application submitted","Observership · Department of Medical Education")}
  <p>Thank you, ${esc(visName(done.v))}. Your application for an observership in <b>${u}</b> (${obsWeeks(c.block*done.v.blocks)}) is number <b class="code">${esc(done.f.challan)}</b>.</p>
  <div class="actions" style="justify-content:flex-start"><button class="btn primary" data-act="op-app">Download application form (PDF)</button></div>
  <div class="flag ok" style="display:grid;gap:6px"><b>What to do next</b>
   <span>1. Print the application form.</span>
   <span>2. Get it signed by the Head of the ${u} department.</span>
   <span>3. Bring the signed application to the Medical Education Department, RIC. After the Director signs it, you will be given the fee challan (${money(done.f.amt)}).</span>
   <span>4. Pay the fee in cash and bring the paid challan back to the Medical Education Department. We then send your application to the Medical Superintendent.</span>
   <span>5. The office order usually takes about 1.5 weeks. The hospital administration will call you to collect it.</span>
   <span>6. Bring the office order to the Medical Education Department. Your observership starts then.</span></div>
  ${c.contact?`<p class="subt" style="margin:0">Questions? ${esc(c.contact)}</p>`:""}</div>`)}
 if(!formIsOpen(c))return pubShell(`<div class="panel fbform">${formHead(null,"Observership application","Department of Medical Education")}<p>Online applications for observership are closed at the moment.</p>${c.msg?`<p style="white-space:pre-line">${esc(c.msg)}</p>`:""}${c.contact?`<p class="subt">Contact: ${esc(c.contact)}</p>`:""}</div>`);
 const f=(n,l,o={})=>`<label class="f"><span class="${o.opt?"":"req"}">${l}${o.h?` <span class="h">${o.h}</span>`:o.opt?` <span class="h">optional</span>`:""}</span><input name="${n}" ${o.type?`type="${o.type}"`:""} ${o.ph?`placeholder="${o.ph}"`:""} ${o.mode?`inputmode="${o.mode}"`:""} ${o.list?`list="${o.list}"`:""}></label>`;
 const file=(n,l,o={})=>`<label class="f"><span class="${o.opt?"":"req"}">${l}${o.h?` <span class="h">${o.h}</span>`:""}</span><input type="file" name="${n}" accept="image/jpeg,image/png,image/webp,application/pdf"></label>`;
 pubShell(`<form class="panel fbform" id="obsform" novalidate>${formHead(null,"Observership application form","To the Medical Superintendent, Rawalpindi Institute of Cardiology, Rawalpindi")}${c.msg?`<div class="flag info" style="white-space:pre-line">${esc(c.msg)}</div>`:""}
  <div class="flag info" style="display:grid;gap:4px"><span>Fee: <b>${money(c.fee1)}</b> for the first ${obsWeeks(c.block)}; <b>${money(c.fee2)}</b> for each further ${obsWeeks(c.block)}; up to ${obsWeeks(c.maxDays)} in all.</span><span>After you submit you get your application form. Get it signed by the Head of Department and bring it to the Medical Education Department, where you will be given the fee challan. Your observership starts once the hospital issues your office order.</span></div>
  <fieldset class="pfsec"><legend>1. Personal & contact details</legend><div class="grid2"><label class="f"><span>Title <span class="h">optional</span></span><select name="title">${opt([["",""],["Dr.","Dr."],["Mr.","Mr."],["Ms.","Ms."],["Mrs.","Mrs."]],"")}</select></label>${f("name","Full name",{ph:"e.g. Ayesha Khan"})}</div>
   <div class="grid2">${f("father","Father's name")}<label class="f"><span class="req">Gender</span><select name="gender">${opt(["","Female","Male"],"")}</select></label></div>
   <div class="grid2">${f("cnic","CNIC",{ph:"37405-1234567-1",mode:"numeric"})}${f("mobile","Contact no.",{ph:"03xx-xxxxxxx",type:"tel",mode:"numeric"})}</div>${f("email","Email address",{type:"email"})}</fieldset>
  <fieldset class="pfsec"><legend>2. Educational details</legend><label class="f"><span class="req">You are a</span><select name="cat">${opt(["",...(c.cats&&c.cats.length?c.cats:OBS_CATS)],"")}</select></label>
   ${f("degree","Degree programme",{ph:"e.g. MBBS, BDS, BS Cardiac Perfusion, BS Nursing",list:"obs-deg"})}<datalist id="obs-deg">${["MBBS","BDS","BS Nursing","BS Cardiac Perfusion","BS Medical Imaging Technology","BS Medical Laboratory Technology","BS Cardiology Technology","DAE / Diploma","Pharm-D","DPT"].map(x=>`<option value="${x}">`).join("")}</datalist>
   ${f("inst","Institution / university",{ph:"e.g. Rawalpindi Medical University"})}<div class="grid2">${f("yearStudy","Year of study / passing",{ph:"e.g. 4th year, 2025"})}${f("status2","Current semester / status",{ph:"e.g. 7th semester, graduated, working"})}</div></fieldset>
  <fieldset class="pfsec"><legend>3. Observership details</legend><label class="f"><span class="req">Department applied for</span><select name="unit">${opt(["",...(c.units&&c.units.length?c.units:ROT_UNITS)],"")}</select></label>
   <label class="f"><span class="req">Duration requested</span><select name="blocks">${opt(obsDurOpts(c),"1")}</select></label>
   <label class="f"><span class="req">Reason / purpose of observership</span><textarea name="reason" rows="3"></textarea></label></fieldset>
  <fieldset class="pfsec"><legend>4. Documents</legend><p class="qd" style="margin:0">Photo or PDF, up to 5 MB each.</p>
   <label class="f"><span class="req">Your photograph</span> <span class="h">a recent passport-size photo</span><input type="file" name="photoDoc" accept="image/jpeg,image/png,image/webp"></label>
   ${file("cnicDoc","CNIC (front)")}${file("cnic2Doc","CNIC (back)",{opt:1,h:"optional"})}
   <label class="f"><span class="req">Are you studying or working at an institute now?</span><select name="attached" data-obsatt="1">${opt([["",""],["1","Yes"],["0","No"]],"")}</select></label>
   <div data-obsatt-yes hidden class="obsattgrp">${file("idcardDoc","Your institute ID card",{h:"student or employee card"})}${file("letterDoc","Letter from your institute",{h:"endorsing you for an observership at RIC"})}</div>
   <div data-obsatt-no hidden>${file("degreeDoc","Your degree",{h:"or latest certificate"})}</div></fieldset>
  <fieldset class="pfsec"><legend>Declaration</legend><label class="check2"><input type="checkbox" id="op-decl"> I hereby declare that the information provided above is true and correct to the best of my knowledge. I understand that I will not be entitled to any remuneration, certification of employment, or clinical privileges during this observership, and I will strictly adhere to the code of conduct and policies of Rawalpindi Institute of Cardiology.</label></fieldset>
  <div class="err" id="operr" role="alert"></div><button class="btn primary" type="button" data-act="op-submit" style="justify-self:start">Submit application</button>${c.contact?`<p class="subt" style="margin:0">Questions? ${esc(c.contact)}</p>`:""}</form>`)}
document.addEventListener("click",async e=>{const dl=e.target.closest('[data-act="op-app"]');if(dl&&OBSPUB.done){const D=OBSPUB.done;dl.disabled=true;try{await obsAppPdf(D.v,true,obsPubCfg())}catch(x){console.error(x)}dl.disabled=false;return}
 const b=e.target.closest('[data-act="op-submit"]');if(!b)return;const fm=document.getElementById("obsform"),er=document.getElementById("operr"),g=n=>(fm[n]?.value||"").trim(),bad=m=>{er.textContent=m;er.scrollIntoView({block:"center"})};
 const name=g("name").replace(/^((dr|mr|ms|mrs)\.?\s+)+/i,"");if(name.length<3)return bad("Enter your full name.");if(g("father").length<3)return bad("Enter your father's name.");if(!g("gender"))return bad("Choose your gender.");
 const cn=g("cnic").replace(/\D/g,"");if(cn.length!==13)return bad("Enter your 13-digit CNIC number.");
 let mob=g("mobile").replace(/\D/g,"");if(mob.startsWith("92"))mob="0"+mob.slice(2);if(!/^03\d{9}$/.test(mob))return bad("Enter your contact number as 03xx-xxxxxxx.");
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g("email")))return bad("Enter a valid email address.");
 if(!g("cat"))return bad("Choose what you are (doctor, student, nurse…).");if(!g("degree"))return bad("Enter your degree programme.");if(!g("inst"))return bad("Enter your institution or university.");if(!g("yearStudy"))return bad("Enter your year of study or passing.");if(!g("status2"))return bad("Enter your current semester or status.");
 if(!g("unit"))return bad("Choose the department.");if(g("reason").length<5)return bad("Write the reason or purpose of your observership.");
 const fl=n=>{const i=fm.querySelector(`input[type=file][name="${n}"]`);return i&&i.files&&i.files[0]},ph=fl("photoDoc"),c1=fl("cnicDoc"),c2=fl("cnic2Doc"),att=g("attached");
 if(!ph)return bad("Attach your photograph.");if(!/^image\//.test(ph.type))return bad("Your photograph must be a picture (JPG or PNG).");if(!c1)return bad("Attach a photo of your CNIC.");
 if(att!=="1"&&att!=="0")return bad("Say whether you are studying or working at an institute now.");
 const ic=att==="1"?fl("idcardDoc"):null,lt=att==="1"?fl("letterDoc"):null,dg=att==="0"?fl("degreeDoc"):null;
 if(att==="1"&&!ic)return bad("Attach your institute ID card.");if(att==="1"&&!lt)return bad("Attach the letter from your institute endorsing you for the observership.");if(att==="0"&&!dg)return bad("Attach your degree.");
 for(const x of [ph,c1,c2,ic,lt,dg].filter(Boolean)){if(x.size>5*1024*1024)return bad(`${x.name} is larger than 5 MB.`);if(!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(x.type))return bad(`${x.name}: use a photo (JPG, PNG) or a PDF.`)}
 if(!document.getElementById("op-decl").checked)return bad("Tick the declaration to submit.");
 er.textContent="";b.disabled=true;b.textContent="Uploading…";const folder=`observers/${Date.now()}-${Math.random().toString(36).slice(2,8)}`,docs={};
 try{for(const[k,x] of [["photo",ph],["cnic",c1],["cnic2",c2],["idcard",ic],["letter",lt],["degree",dg]]){if(!x)continue;const path=`${folder}/${k}.${(x.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")}`;
   const{error}=await SYNC.sb.storage.from("dme-uploads").upload(path,x,{contentType:x.type||undefined});if(error)throw new Error("upload");docs[k]=path}
  b.textContent="Sending…";const p={title:g("title"),name,father:g("father"),gender:g("gender"),cnic:cn,mobile:mob.slice(0,4)+"-"+mob.slice(4),email:g("email").toLowerCase(),cat:g("cat"),degree:g("degree"),inst:g("inst"),yearStudy:g("yearStudy"),status2:g("status2"),unit:g("unit"),blocks:+g("blocks")||1,reason:g("reason"),attached:att==="1",docs};
  const{data,error}=await SYNC.sb.rpc("dme_submit_obs",{p});if(error||!data)throw new Error("send");
  if(data.error){b.disabled=false;b.textContent="Submit application";return bad(data.error==="duplicate"?"You already have an observership application with RIC. Contact the DME office.":data.error==="closed"?"Applications have just closed. Contact the DME office.":"Some details are missing or not valid. Check the form.")}
  const v={...p,kind:"obs",cnic:cn.slice(0,5)+"-"+cn.slice(5,12)+"-"+cn.slice(12),regAt:new Date().toISOString(),src:"form"},fee={id:"F",kind:"first",blocks:p.blocks,amt:data.amt,challan:data.challan,at:new Date().toISOString(),status:"unpaid"};v.fees=[fee];
  obsPubRender({v,f:fee});window.scrollTo(0,0);obsAppPdf(v,true,obsPubCfg()).catch(()=>{})}
 catch(x){b.disabled=false;b.textContent="Submit application";bad(x.message==="upload"?"A file could not be uploaded. Check the connection and try again.":"Could not send. Check the connection and try again.")}});
