
/* =====================================================================
   BIO DATA FORM (RIC-RWP-HRM-F-04) — shared by the PGT registration
   form and the DME&T Office app. Builds a filled PDF in the layout of
   the paper form. Needs jsPDF (window.jspdf).
   ===================================================================== */
const BIO_MARITAL=["Single","Married","Divorced","Widowed"];
const BIO_REL=["Father","Mother","Spouse","Son","Daughter","Brother","Sister","Guardian","Other"];
const BIO_JSPDF="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
function bioLoadPdf(){if(window.jspdf)return Promise.resolve();return new Promise((ok,no)=>{const s=document.createElement("script");s.src=BIO_JSPDF;s.onload=()=>ok();s.onerror=()=>no(new Error("Could not load the PDF tool. Check the connection."));document.head.append(s)})}
function bioDate(s){if(!s)return"";const d=new Date(s+"T00:00");return isNaN(d)?s:d.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"}).replace(/\//g,"-")}
/* r = {name,father,cnic,domicile,mobile,mobile2,email,bio:{dob,marital,religion,sect,passport,otherNat,resNo,curAddr,permAddr,bank,account,family:[{name,rel,cnic,passport,age,nat}]}}
   photo = data URL (jpeg/png) or null; meta = {ref, at} */
async function bioPdf(r,photo,meta){await bioLoadPdf();const{jsPDF}=window.jspdf;const doc=new jsPDF({unit:"pt",format:"letter"});
 const b=r.bio||{},L=36,R=576,W=R-L,UP=v=>String(v??"").trim().toUpperCase();
 const BLUE=[198,217,241],LINE=[90,90,90];doc.setDrawColor(...LINE);doc.setLineWidth(.6);
 // title
 doc.setFont("times","bold");doc.setFontSize(12.5);const tc=(L+452)/2;
 [["RAWALPINDI INSTITUTE OF CARDIOLOGY",50],["BIO DATA FORM",65]].forEach(([t,y])=>{doc.text(t,tc,y,{align:"center"});const w=doc.getTextWidth(t);doc.line(tc-w/2,y+1.5,tc+w/2,y+1.5)});
 // photo box
 const px=468,py=30,pw=108,ph=128;doc.rect(px,py,pw,ph);
 if(photo){try{const fmt=/^data:image\/png/.test(photo)?"PNG":"JPEG";const ip=doc.getImageProperties(photo);const s=Math.max(pw/ip.width,ph/ip.height);
   // cover-fit inside the box, clipped
   const iw=ip.width*s,ih=ip.height*s;let src=photo;
   if(Math.abs(iw-pw)>1||Math.abs(ih-ph)>1){src=await bioCrop(photo,pw/ph)}
   doc.addImage(src,"JPEG",px+.5,py+.5,pw-1,ph-1);doc.rect(px,py,pw,ph)}catch(e){console.warn(e);photo=null}}
 if(!photo){doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text("Picture",px+pw/2,py+50,{align:"center"});doc.setFont("helvetica","normal");doc.setFontSize(7);
  doc.text(["(With Blue","Background & No","Side Pose)"],px+pw/2,py+62,{align:"center"})}
 // documents
 doc.setFont("times","bold");doc.setFontSize(10);doc.text("Following Documents must attach.",L,95);
 doc.text("1.   CNIC Copy.",L+22,108);doc.text("2.   Passport Copy.",L+22,120);
 // employee information table
 let y=166;const c1=24,c2=168,vx=L+c1+c2;
 const band=(t,yy)=>{doc.setFillColor(...BLUE);doc.rect(L,yy,W,15,"FD");doc.setFont("times","bold");doc.setFontSize(10.5);doc.text(t,L+4,yy+11);
  const w=doc.getTextWidth(t);doc.setFontSize(6.5);doc.text("(IN CAPITAL LETTERS)",L+8+w,yy+10.5)};
 band("Employee Information:",y);y+=15;
 const mob=[r.mobile,r.mobile2].filter(Boolean).join(" / ");
 const rows=[["Name",UP(r.name?"Dr. "+r.name.replace(/^dr\.?\s*/i,""):"")],["Father Name",UP(r.father)],["Date of Birth",bioDate(b.dob)],["Marital Status",UP(b.marital)],["CNIC",r.cnic||""],["Religion",UP(b.religion)],
  ["Domicile",UP(r.domicile)],["Sect",UP(b.sect)],["Passport Number",UP(b.passport||r.passport)],["Mobile No",mob,"(Bio-Metric Verified & Should be on Whatsapp)"],["Other Nationality (If Any)",UP(b.otherNat)],
  ["Residence No/Guardian No",b.resNo||""],["Email Address",String(r.email||"").toLowerCase()],["Current Address",UP(b.curAddr)],["Permanent Address",UP(b.permAddr),"(As per CNIC)"],["Bank Name & Account #",UP([b.bank,b.account].filter(Boolean).join(", A/C ")),"(Salary)"]];
 rows.forEach(([l,v,sub],i)=>{doc.setFont("helvetica","normal");doc.setFontSize(9.5);const lines=doc.splitTextToSize(v||"",R-vx-8);
  const lab=doc.setFont("times","normal").setFontSize(10.5)&&doc.splitTextToSize(l,c2-8);const subl=sub?doc.setFontSize(6.5)&&doc.splitTextToSize(sub,c2-8):[];
  const h=Math.max(17,lines.length*11+6,lab.length*12+subl.length*8+5);
  doc.rect(L,y,c1,h);doc.rect(L+c1,y,c2,h);doc.rect(vx,y,R-vx,h);
  doc.setFont("times","normal");doc.setFontSize(10.5);doc.text(String(i+1),L+c1/2,y+12,{align:"center"});
  doc.text(lab,L+c1+4,y+12);if(sub){doc.setFontSize(6.5);if(l.length<20&&subl.length===1&&doc.getTextWidth(sub)+doc.setFontSize(10.5).getTextWidth(l)<c2-14){const w=doc.getTextWidth(l);doc.setFontSize(6.5);doc.text(sub,L+c1+8+w,y+12)}else{doc.setFontSize(6.5);doc.text(subl,L+c1+4,y+12+lab.length*12-3)}}
  doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.text(lines,vx+5,y+12);y+=h});
 // family table
 y+=12;const FC=[["Sr #",30],["Name of Family Member",142],["Relation",62],["CNIC #",92],["Passport #",66],["Age",34],["Other Nationality (if any)",114]];
 doc.rect(L,y,FC[0][1],15);doc.setFillColor(...BLUE);doc.rect(L+FC[0][1],y,W-FC[0][1],15,"FD");doc.setFont("times","bold");doc.setFontSize(10.5);doc.text("Family Information:",L+FC[0][1]+4,y+11);
 {const w=doc.getTextWidth("Family Information:");doc.setFontSize(6.5);doc.text("(IN CAPITAL LETTERS)",L+FC[0][1]+8+w,y+10.5)}y+=15;
 let x=L;doc.setFont("times","bold");doc.setFontSize(9.5);FC.forEach(([t,w])=>{doc.rect(x,y,w,26);const tl=doc.splitTextToSize(t,w-6);doc.text(tl,x+w/2,y+(tl.length>1?10:16),{align:"center"});x+=w});y+=26;
 const fam=(b.family||[]).filter(f=>f&&f.name);const n=Math.max(7,fam.length);
 for(let i=0;i<n;i++){const f=fam[i]||{};const vals=[String(i+1),UP(f.name),UP(f.rel),f.cnic||"",UP(f.passport),f.age?String(f.age):"",UP(f.nat)];
  doc.setFont("helvetica","normal");doc.setFontSize(8.5);const cells=vals.map((v,j)=>doc.splitTextToSize(v,FC[j][1]-6));const h=Math.max(16,...cells.map(c=>c.length*10+5));
  x=L;FC.forEach(([t,w],j)=>{doc.rect(x,y,w,h);doc.setFont(j===0?"times":"helvetica","normal");doc.setFontSize(j===0?10:8.5);doc.text(cells[j],j===0?x+w/2:x+3,y+11,j===0?{align:"center"}:undefined);x+=w});y+=h}
 // undertaking and signature
 y+=12;doc.setFont("times","normal");doc.setFontSize(9);
 doc.text(doc.splitTextToSize("I hereby undertake that I have read above information (provided by me) and I will responsible if declared false/fake at any stage.",W),L,y);
 const sy=Math.max(y+58,700);doc.setLineWidth(.6);doc.line(R-130,sy,R,sy);doc.setFontSize(10.5);doc.text("Employee's Signature",R-65,sy+13,{align:"center"});
 if(meta&&(meta.at||meta.ref)){doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(90);
  doc.text(`Filled online through the RIC DME&T PGT registration${meta.at?" on "+meta.at:""}${meta.ref?", ref. "+meta.ref:""}. Undertaking accepted online; sign above when printed.`,L,sy+13,{maxWidth:R-L-150});doc.setTextColor(0)}
 doc.setDrawColor(0);doc.setLineWidth(.5);doc.line(L,752,R-60,752);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.text("RIC-RWP-HRM-F-04",L,766);
 return doc}
function bioFileName(r){return"Bio-data-"+String(r.name||"PGT").replace(/^dr\.?\s*/i,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"")+".pdf"}
/* read a File or Blob as a data URL, downsized for the PDF photo */
function bioPhotoData(blob){return new Promise(ok=>{if(!blob)return ok(null);const u=URL.createObjectURL(blob),im=new Image();im.onload=()=>{const s=Math.min(1,600/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",.88))};im.onerror=()=>{URL.revokeObjectURL(u);ok(null)};im.src=u})}
/* crop a photo to the box shape (centre), as JPEG */
function bioCrop(src,ratio){return new Promise(ok=>{const im=new Image();im.onload=()=>{let w=im.width,h=im.height;if(w/h>ratio)w=h*ratio;else h=w/ratio;const c=document.createElement("canvas");c.width=Math.round(w);c.height=Math.round(h);
 const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(im,(im.width-w)/2,(im.height-h)/2,w,h,0,0,c.width,c.height);ok(c.toDataURL("image/jpeg",.9))};im.onerror=()=>ok(src);im.src=src})}
