
/* =====================================================================
   P60 · EVERY QR CODE CAN BE COPIED, DOWNLOADED OR SHARED
   QR codes (online forms, observership, workshop registration, feedback
   and check-in) were shown on screen only, so they could not go into a
   poster. Every QR code now carries its link (data-qr on the picture)
   and every full-screen QR gets:
     Copy QR picture · Download QR (PNG) · Download poster (PNG) · Share
   A small QR on a page (workshop registration) opens the same view.
   QR codes added later get the buttons automatically.
   ===================================================================== */
{const _q=qrSvg;qrSvg=function(text,cell){const h=_q(text,cell);return typeof h==="string"&&h.includes("<svg")?h.replace("<svg",`<svg data-qr="${esc(String(text))}"`):h}}

/* the QR alone: large, with the white margin scanners need */
function qrCanvas(url,size){if(typeof qrcode!=="function")throw new Error("QR code needs an internet connection");
 const q=qrcode(0,"M");q.addData(url);q.make();const n=q.getModuleCount(),cell=Math.max(4,Math.floor((size||1200)/(n+8))),S=(n+8)*cell,c=document.createElement("canvas");c.width=c.height=S;
 const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,S,S);g.fillStyle="#000";for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))g.fillRect((k+4)*cell,(r+4)*cell,cell,cell);return c}
/* a printable poster: RIC heading, title, what to do, the QR, the link */
function qrPoster(url,title,caption){const W=1240,H=1754,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
 g.fillStyle="#fff";g.fillRect(0,0,W,H);g.fillStyle="#6D1F2B";g.fillRect(0,0,W,24);g.fillRect(0,H-24,W,24);g.textAlign="center";
 const lg=document.querySelector('img[alt="RIC logo"]');if(lg&&lg.complete&&lg.naturalWidth){try{g.drawImage(lg,W/2-80,60,160,160)}catch(e){}}
 g.fillStyle="#231A17";g.font="600 46px Georgia,serif";g.fillText("RAWALPINDI INSTITUTE OF CARDIOLOGY",W/2,280);g.fillStyle="#6E625A";g.font="32px Arial,sans-serif";g.fillText("Department of Medical Education and Training",W/2,330);
 const wrap=(t,font,max,y,lh,col)=>{g.font=font;g.fillStyle=col;const words=String(t||"").split(/\s+/);let line="",lines=[];words.forEach(w=>{const tt=line?line+" "+w:w;if(g.measureText(tt).width>max&&line){lines.push(line);line=w}else line=tt});if(line)lines.push(line);lines=lines.slice(0,3);lines.forEach((l,i)=>g.fillText(l,W/2,y+i*lh));return y+lines.length*lh};
 let y=wrap(title,"bold 62px Arial,sans-serif",W-160,440,74,"#6D1F2B");if(caption)y=wrap(caption,"36px Arial,sans-serif",W-200,y+14,46,"#231A17");
 const q=qrCanvas(url,900),qs=Math.min(900,H-y-330);g.drawImage(q,(W-qs)/2,y+30,qs,qs);
 g.fillStyle="#6D1F2B";g.font="bold 48px Arial,sans-serif";g.fillText("Scan with your phone camera",W/2,y+30+qs+80);g.fillStyle="#6E625A";g.font="26px monospace";g.fillText(url.length>80?url.slice(0,80)+"…":url,W/2,y+30+qs+135);return c}
const qrBlob=c=>new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error("Could not make the picture")),"image/png"));
const qrFileName=(t,k)=>`${k} ${String(t||"QR code").replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim().slice(0,60)} - RIC.png`;
function qrSave(c,name){const a=document.createElement("a");a.href=c.toDataURL("image/png");a.download=name;document.body.append(a);a.click();a.remove()}
async function qrCopy(url,btn){try{if(!navigator.clipboard||typeof ClipboardItem==="undefined")throw new Error("no");
  await navigator.clipboard.write([new ClipboardItem({"image/png":qrBlob(qrCanvas(url,900))})]);if(btn){const t=btn.textContent;btn.textContent="Copied";setTimeout(()=>{if(btn.isConnected)btn.textContent=t},1800)}toast("QR picture copied: paste it into Word, PowerPoint, Canva or WhatsApp")}
 catch(e){try{qrSave(qrCanvas(url,1200),qrFileName("","QR"));toast("This browser cannot copy pictures; the QR was downloaded instead")}catch(x){toast(x.message||"Could not copy the QR code")}}}
async function qrShare(url,title){try{const f=new File([await qrBlob(qrCanvas(url,1200))],qrFileName(title,"QR"),{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:title||"QR code",text:url});else{qrSave(qrCanvas(url,1200),qrFileName(title,"QR"));toast("Sharing is not available here; the QR was downloaded")}}catch(e){if(e&&e.name!=="AbortError")toast("Could not share the QR code")}}
const qrCanShare=()=>!!(navigator.canShare&&typeof File!=="undefined");
function qrButtons(url,title,caption,hasPoster){const a=v=>esc(v||"");
 return`<div class="qrtools" data-qrurl="${a(url)}" data-qrtitle="${a(title)}" data-qrcap="${a(caption)}"><button class="btn primary" data-act="qr-copy">Copy QR picture</button><button class="btn" data-act="qr-dl">Download QR (PNG)</button>${hasPoster?"":`<button class="btn" data-act="qr-poster">Download poster (PNG)</button>`}${qrCanShare()?`<button class="btn" data-act="qr-share">Share</button>`:""}</div>`}
/* a full-screen QR: add the buttons under the link */
function qrDecorate(root){(root||document).querySelectorAll(".qrfull").forEach(box=>{if(box.querySelector(".qrtools"))return;const svg=box.querySelector("svg[data-qr]");if(!svg)return;
 const url=svg.getAttribute("data-qr"),title=(box.querySelector("h2")||{}).textContent||"",cap=([...box.querySelectorAll(".code")].find(c=>!/^https?:/.test(c.textContent.trim()))||{}).textContent||"";
 const big=box.querySelector(".qrbig"),after=big&&big.nextElementSibling&&big.nextElementSibling.classList.contains("code")?big.nextElementSibling:big;(after||svg).insertAdjacentHTML("afterend",qrButtons(url,title,cap,!!box.querySelector('[data-act="form-qrpng"]')))})}
{const ov=document.getElementById("overlay");if(ov)new MutationObserver(()=>qrDecorate(ov)).observe(ov,{childList:true,subtree:true})}
/* a small QR on a page that has no full-screen view of its own: tap it for the same view */
function qrOpen(url,title,caption){document.getElementById("overlay").innerHTML=`<div class="scrim" data-act="close"></div><div class="qrfull" role="dialog" aria-modal="true" aria-label="QR code">${caption?`<div class="code">${esc(caption)}</div>`:""}<h2>${esc(title||"QR code")}</h2>
 <div class="qrbig">${qrSvg(url,10)}</div><div class="code" style="font-size:13px;word-break:break-all">${esc(url)}</div><button class="btn" data-act="close">Close</button></div>`}
function qrMarkInline(){document.querySelectorAll("main .qrbox svg[data-qr]").forEach(s=>{const b=s.closest(".qrbox");if(!b||b.closest("button,a,.qrfull")||b.dataset.qrtap)return;b.dataset.qrtap="1";b.setAttribute("role","button");b.tabIndex=0;b.title="Tap to copy, download or share this QR code";
 const row=b.closest(".qrrow"),bar=row&&row.querySelector(".toolbar");if(row&&row.querySelector(".qrhint"))return;
 const btn=`<button class="btn small qrhint" data-act="qr-open">QR picture</button>`;if(bar)bar.insertAdjacentHTML("beforeend",btn);else if(!b.parentElement.querySelector(".qrhint"))b.insertAdjacentHTML("afterend",btn)})}
{const _r=render;render=function(){const r=_r.apply(this,arguments);setTimeout(qrMarkInline,0);return r}}
document.addEventListener("click",e=>{const t=e.target.closest('[data-act^="qr-"],.qrbox[data-qrtap]');if(!t)return;
 if(t.matches(".qrbox[data-qrtap]")||t.dataset.act==="qr-open"){const box=t.matches(".qrbox")?t:(t.closest(".qrrow")||t.parentElement).querySelector(".qrbox[data-qrtap]");const s=box&&box.querySelector("svg[data-qr]");if(!s)return;
  const title=(document.querySelector("main h2")||{}).textContent||"QR code",cap=/\?reg=|reg-|register/i.test(s.getAttribute("data-qr"))?"Scan to register":"";qrOpen(s.getAttribute("data-qr"),title,cap);return}
 const w=t.closest(".qrtools");if(!w)return;const url=w.dataset.qrurl,title=w.dataset.qrtitle,cap=w.dataset.qrcap;
 try{if(t.dataset.act==="qr-copy")return qrCopy(url,t);if(t.dataset.act==="qr-share")return qrShare(url,title);
  if(t.dataset.act==="qr-dl"){qrSave(qrCanvas(url,1200),qrFileName(title,"QR"));toast("QR code downloaded");return}
  if(t.dataset.act==="qr-poster"){qrSave(qrPoster(url,title,cap),qrFileName(title,"Poster"));toast("Poster downloaded");return}}catch(x){toast(x.message||"Could not make the QR picture")}});
document.addEventListener("keydown",e=>{const b=e.target.closest&&e.target.closest(".qrbox[data-qrtap]");if(b&&(e.key==="Enter"||e.key===" ")){e.preventDefault();b.click()}});
if(typeof VIEW_ACTS!=="undefined")["qr-copy","qr-dl","qr-poster","qr-share","qr-open"].forEach(a=>VIEW_ACTS.add(a));
if(!document.getElementById("qr-css"))document.head.insertAdjacentHTML("beforeend",`<style id="qr-css">.qrtools{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.qrbox[data-qrtap]{cursor:pointer}.qrfull{max-height:94vh;overflow:auto}</style>`);
