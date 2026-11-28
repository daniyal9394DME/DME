/* RIC DME&T OMR reader. Pure JS on a grayscale image {w,h,d:Uint8Array}; runs in the browser and in node.
   1. find the black squares (4 corners + 6 per side), 2. map sheet millimetres to pixels band by band,
   3. measure each bubble, 4. decide answers and flag anything doubtful. */
const OMR_MK={corner:[[11.5,11.5],[198.5,11.5],[11.5,267.5],[198.5,267.5]],side:[44,79,112,149,186,223],lx:11.5,rx:198.5};

/* bubble positions, taken from the drawing code itself so print and reader can never disagree */
function omrLayout(cfg){const Q=[],R=[],BX=[];
 const fake=new Proxy({},{get:(t,k)=>k==="circle"?(x,y,r,st)=>{if(Math.abs(r-2.3)<.01)Q.push([x,y]);else if(Math.abs(r-1.7)<.01)R.push([x,y])}:k==="rect"?(x,y,w,h)=>{if(Math.abs(w-6.4)<.01&&Math.abs(h-6.4)<.01)BX.push([x+3.2,y+3.2])}:()=>fake});
 omrSheet(fake,{...cfg,logo:null,cand:cfg.cand||null,qr:cfg.qr||"X|X|X|X"},()=>({addData(){},make(){},getModuleCount:()=>1,isDark:()=>false}));
 const o=cfg.opts||5,q=[];for(let i=0;i<Q.length/o;i++)q.push(Q.slice(i*o,i*o+o));
 const roll5=[];for(let d=0;d<5;d++)roll5.push(R.slice(d*10,d*10+10));return{q,roll:roll5,boxes:BX}}

/* ---------- geometry ---------- */
function solve(A,b){const n=b.length;for(let i=0;i<n;i++){let m=i;for(let k=i+1;k<n;k++)if(Math.abs(A[k][i])>Math.abs(A[m][i]))m=k;[A[i],A[m]]=[A[m],A[i]];[b[i],b[m]]=[b[m],b[i]];
  for(let k=i+1;k<n;k++){const f=A[k][i]/A[i][i];for(let j=i;j<n;j++)A[k][j]-=f*A[i][j];b[k]-=f*b[i]}}const x=new Array(n);for(let i=n-1;i>=0;i--){let s=b[i];for(let j=i+1;j<n;j++)s-=A[i][j]*x[j];x[i]=s/A[i][i]}return x}
/* least-squares homography mm -> px from >=4 point pairs */
function homog(P){const A=[],b=[];P.forEach(([X,Y,x,y])=>{A.push([X,Y,1,0,0,0,-x*X,-x*Y]);b.push(x);A.push([0,0,0,X,Y,1,-y*X,-y*Y]);b.push(y)});
 const At=A[0].map((_,j)=>A.map(r=>r[j])),AtA=At.map(r=>At.map(c=>r.reduce((s,v,k)=>s+v*c[k],0))),Atb=At.map(r=>r.reduce((s,v,k)=>s+v*b[k],0));const h=solve(AtA,Atb);
 return(X,Y)=>{const w=h[6]*X+h[7]*Y+1;return[(h[0]*X+h[1]*Y+h[2])/w,(h[3]*X+h[4]*Y+h[5])/w]}}
function affine(P){const A=[],b=[];P.forEach(([X,Y,x,y])=>{A.push([X,Y,1,0,0,0]);b.push(x);A.push([0,0,0,X,Y,1]);b.push(y)});
 const At=A[0].map((_,j)=>A.map(r=>r[j])),AtA=At.map(r=>At.map(c=>r.reduce((s,v,k)=>s+v*c[k],0))),Atb=At.map(r=>r.reduce((s,v,k)=>s+v*b[k],0));const h=solve(AtA,Atb);
 return(X,Y)=>[h[0]*X+h[1]*Y+h[2],h[3]*X+h[4]*Y+h[5]]}

/* ---------- 1. black squares ---------- */
function omrBlobs(img,thr){const{w,h,d}=img,lab=new Int32Array(w*h),out=[];let id=0;const st=[];
 for(let p=0;p<w*h;p++){if(lab[p]||d[p]>=thr)continue;id++;let n=0,x0=1e9,x1=-1,y0=1e9,y1=-1,sx=0,sy=0;st.push(p);lab[p]=id;
  while(st.length){const q=st.pop(),x=q%w,y=(q-x)/w;n++;sx+=x;sy+=y;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   if(n>60000)continue;const nb=[q-1,q+1,q-w,q+w];for(let k=0;k<4;k++){const r=nb[k];if(r<0||r>=w*h)continue;if((k===0&&x===0)||(k===1&&x===w-1))continue;if(!lab[r]&&d[r]<thr){lab[r]=id;st.push(r)}}}
  const bw=x1-x0+1,bh=y1-y0+1;if(n>20)out.push({x:sx/n,y:sy/n,bw,bh,n,fill:n/(bw*bh),x0,y0,x1,y1})}
 return out}
function omrFindMarks(img){const mm0=img.w/210,k=Math.max(1,Math.round(mm0*.5)),W=Math.floor(img.w/k),H=Math.floor(img.h/k),sd=new Uint8Array(W*H);
 /* averaged copy (cells of about 0.5 mm): grainy or grey-printed squares become solid */
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){let s=0;for(let j=0;j<k;j++){const o=(y*k+j)*img.w+x*k;for(let i=0;i<k;i++)s+=img.d[o+i]}sd[y*W+x]=s/(k*k)}
 const hist=new Array(256).fill(0);for(let i=0;i<sd.length;i++)hist[sd[i]]++;let acc=0,p1=0,p50=0;
 for(let v=0;v<256;v++){acc+=hist[v];if(!p1&&acc>sd.length*.003)p1=v;if(!p50&&acc>sd.length*.5)p50=v}
 const thr=Math.round(p1+(p50-p1)*.6),mmS=mm0/k;
 /* squares: square outline, mostly dark (printed squares can be grainy and lighter in the middle) */
 const B=omrBlobs({w:W,h:H,d:sd},thr).filter(b=>b.fill>.4&&b.bw/b.bh>.7&&b.bw/b.bh<1.43).map(b=>({...b,x:(b.x+.5)*k,y:(b.y+.5)*k,mm:(b.bw+b.bh)/2/mmS}));
 const corners=B.filter(b=>b.mm>5.4&&b.mm<9.5),sides=B.filter(b=>b.mm>3.3&&b.mm<6.2&&b.fill>.55);
 /* squares cut by the edge of the picture (a tight crop by the scanning app): the whole side gives the size, and the centre lies half a size in from the inner edge */
 const cut=[];omrBlobs({w:W,h:H,d:sd},thr).forEach(b=>{const L=b.x0===0,Rt=b.x1===W-1,Tp=b.y0===0,Bt=b.y1===H-1;if((L||Rt)&&(Tp||Bt))return;if(!(L||Rt||Tp||Bt)||b.fill<.6)return;
  const S=L||Rt?b.bh:b.bw,cutw=L||Rt?b.bw:b.bh,mmz=S/mmS;if(cutw<S*.2||cutw>S*.92)return;const t=mmz>3.3&&mmz<5.9?"s":mmz>=5.9&&mmz<9.5?"c":null;if(!t)return;
  const cx=L?b.x1+1-S/2:Rt?b.x0+S/2:b.x0+b.bw/2,cy=Tp?b.y1+1-S/2:Bt?b.y0+S/2:b.y0+b.bh/2;cut.push({x:cx*k,y:cy*k,mm:mmz,t,cut:1})});
 return{thr,corners,sides,cut,mm0}}
/* ---------- 2. mm -> px mapping ---------- */
function omrFrame0(img,M){M=M||omrFindMarks(img);const{w,h}=img,mm0=M.mm0;
 /* corners: nearest candidate to each image corner region */
 /* up to 3 candidates per corner (or none); keep the combination that the side squares agree with best */
 const cand=[[0,0],[1,0],[0,1],[1,1]].map(([fx,fy])=>[...M.corners.map(b=>({b,d:Math.hypot((b.x-fx*w)/w,(b.y-fy*h)/h),dx:Math.abs(b.x-fx*w)/w,dy:Math.abs(b.y-fy*h)/h})).filter(c=>c.dx<.18&&c.dy<.18).sort((a,c)=>a.d-c.d).slice(0,3).map(c=>c.b),null]);
 let best=null;
 for(const a of cand[0])for(const b of cand[1])for(const c of cand[2])for(const d of cand[3]){const C=[a,b,c,d],P=[];C.forEach((m,i)=>{if(m)P.push([...OMR_MK.corner[i],m.x,m.y])});if(P.length<3)continue;
  const T=P.length===4?homog(P):affine(P);const[x0,y0]=T(0,0),[x1]=T(210,0),[,y2]=T(0,297);const sx=(x1-x0)/w,sy=(y2-y0)/h;if(sx<.6||sx>1.3||sy<.6||sy>1.3)continue;
  let sc=P.length*2;OMR_MK.side.forEach(Y=>[OMR_MK.lx,OMR_MK.rx].forEach(X=>{const[px,py]=T(X,Y);if(M.sides.some(m=>Math.hypot(m.x-px,m.y-py)<2.5*mm0))sc+=1}));
  if(P.length===4){const e=P.map(([X,Y,x,y])=>{const[px,py]=T(X,Y);return Math.hypot(px-x,py-y)});if(Math.max(...e)>3*mm0)sc-=4}
  if(!best||sc>best.sc)best={sc,P,T}}
 if(!best)return{error:"The corner squares could not be found. Rescan the sheet with all four corners visible."};
 const P=best.P;let T=best.T;
 /* snap side markers near their predicted places, then refit */
 const all=P.slice(),miss=[];const snap=(X,Y)=>{const[px,py]=T(X,Y);let best=null,bd=(3.5*mm0)**2;M.sides.forEach(b=>{const dd=(b.x-px)**2+(b.y-py)**2;if(dd<bd){bd=dd;best=b}});return best};
 OMR_MK.side.forEach(Y=>[OMR_MK.lx,OMR_MK.rx].forEach(X=>{const b=snap(X,Y);if(b)all.push([X,Y,b.x,b.y]);else miss.push([X,Y])}));
 const G=homog(all);
 /* bands: rows of markers top to bottom; each band gets its own mapping from its four squares */
 const levels=[11.5,...OMR_MK.side,267.5],pt=(X,Y)=>{const f=all.find(a=>a[0]===X&&a[1]===Y);return f?[f[2],f[3]]:G(X,Y)};
 const bands=[];for(let i=0;i<levels.length-1;i++){const y0=levels[i],y1=levels[i+1];bands.push({y0,y1,T:homog([[OMR_MK.lx,y0,...pt(OMR_MK.lx,y0)],[OMR_MK.rx,y0,...pt(OMR_MK.rx,y0)],[OMR_MK.lx,y1,...pt(OMR_MK.lx,y1)],[OMR_MK.rx,y1,...pt(OMR_MK.rx,y1)]])})}
 const map=(X,Y)=>{const b=bands.find(b=>Y>=b.y0&&Y<=b.y1)||(Y<11.5?bands[0]:bands[bands.length-1]);return b.T(X,Y)};
 const[ax,ay]=map(0,0),[bx,by]=map(100,0);const pxmm=Math.hypot(bx-ax,by-ay)/100;
 return{map,pxmm,found:all.length,of:4+OMR_MK.side.length*2,missing:miss.length+(4-P.length),thr:M.thr}}
/* the marker pattern: 4 corners, 12 side squares, and the QR code's three finder squares (fixed place on every sheet) */
const OMR_TPL=[...OMR_MK.corner.map(p=>[p[0],p[1],"c"]),...OMR_MK.side.flatMap(Y=>[[OMR_MK.lx,Y,"s"],[OMR_MK.rx,Y,"s"]]),[172.9,12.9,"c",1],[189.1,12.9,"c",1],[172.9,29.1,"c",1]];
function omrSim(A,B,a,b){const dX=B[0]-A[0],dY=B[1]-A[1],dx=b[0]-a[0],dy=b[1]-a[1],den=dX*dX+dY*dY,p=(dx*dX+dy*dY)/den,q=(dy*dX-dx*dY)/den,tx=a[0]-(p*A[0]-q*A[1]),ty=a[1]-(q*A[0]+p*A[1]);
 return{p,q,f:(X,Y)=>[p*X-q*Y+tx,q*X+p*Y+ty]}}
function omrSimLS(P){const n=P.length;let mX=0,mY=0,mx=0,my=0;P.forEach(([X,Y,x,y])=>{mX+=X/n;mY+=Y/n;mx+=x/n;my+=y/n});let a=0,b=0,ss=0;
 P.forEach(([X,Y,x,y])=>{const X0=X-mX,Y0=Y-mY,x0=x-mx,y0=y-my;a+=X0*x0+Y0*y0;b+=X0*y0-Y0*x0;ss+=X0*X0+Y0*Y0});const p=a/ss,q=b/ss,tx=mx-(p*mX-q*mY),ty=my-(q*mX+p*mY);return(X,Y)=>[p*X-q*Y+tx,q*X+p*Y+ty]}
/* which marker squares a mapping explains: template point -> nearest square of the right kind */
function omrInliers(B,f,tol){const used=new Set(),m=[];OMR_TPL.forEach(([X,Y,t,qr])=>{const[px,py]=f(X,Y);let bb=null,bd=tol*tol;B.forEach(b=>{if(b.t!==t||used.has(b))return;const d=(b.x-px)**2+(b.y-py)**2;if(d<bd){bd=d;bb=b}});if(bb){used.add(bb);m.push([X,Y,bb.x,bb.y,qr?1:0])}});return m}
/* for tightly cropped scans: fit the whole pattern to whichever squares are visible (any two fix size, turn and place; the rest must agree) */
function omrFrameFit(img,M){const{w,h}=img,mm0=M.mm0,B=[...M.corners.map(b=>({...b,t:"c"})),...M.sides.map(b=>({...b,t:"s"})),...(M.cut||[])];
 const N=OMR_TPL.map(([X,Y,t])=>B.filter(b=>b.t===t&&Math.abs(b.x-X/210*w)<.17*w&&Math.abs(b.y-Y/297*h)<.15*h));let best=null;
 for(let i=0;i<OMR_TPL.length;i++)for(let j=i+1;j<OMR_TPL.length;j++){const A=OMR_TPL[i],C=OMR_TPL[j];if(Math.hypot(A[0]-C[0],A[1]-C[1])<60)continue;
  for(const a of N[i])for(const b of N[j]){if(a===b)continue;const S=omrSim(A,C,[a.x,a.y],[b.x,b.y]),sc=Math.hypot(S.p,S.q);if(sc<mm0*.85||sc>mm0*1.4||Math.abs(Math.atan2(S.q,S.p))>.14)continue;
   const m=omrInliers(B,S.f,2.6*sc),k=m.filter(r=>!r[4]).length+m.filter(r=>r[4]).length*.5;if(!best||k>best.k)best={k,m,sc}}}
 if(!best||best.m.length<4)return null;
 let m=best.m,T=null,one=null;for(let it=0;it<3;it++){const Ls=m.filter(r=>r[0]===OMR_MK.lx&&OMR_MK.side.includes(r[1])).length,Rs=m.filter(r=>r[0]===OMR_MK.rx&&OMR_MK.side.includes(r[1])).length,La=m.filter(r=>r[0]<105).length,Ra=m.filter(r=>r[0]>105).length;
  if(La>=2&&Ra>=2){one=null;T=Ls>=3&&Rs>=3&&m.length>=7?homog(m):affine(m)}
  else{/* one column of side squares: fit size, turn and place from that side only; the width is found later from the answer circles */
   one=Ra>=La?"r":"l";const keep=m.filter(r=>one==="r"?r[0]>105:r[0]<105);T=omrSimLS(keep.length>=2?keep:m)}
  m=omrInliers(B,T,2.6*best.sc);if(one)m=m.filter(r=>one==="r"?r[0]>105:r[0]<105);
  /* the other column, with more room sideways (the page may be stretched across by the scanning app) */
  if(one){const X=one==="r"?OMR_MK.lx:OMR_MK.rx,tol=2.6*best.sc,used=new Set(),add=[];
   OMR_MK.side.forEach(Y=>{const[px,py]=T(X,Y);let bb=null,bd=1e18;B.forEach(b=>{if(b.t!=="s"||used.has(b))return;const dx=Math.abs(b.x-px),dy=Math.abs(b.y-py);if(dy<tol&&dx<4*tol&&dx+dy<bd){bd=dx+dy;bb=b}});if(bb){used.add(bb);add.push([X,Y,bb.x,bb.y,0])}});
   /* they must agree with each other: the same shift sideways */
   if(add.length>=2){const sh=add.map(r=>r[2]-T(r[0],r[1])[0]).sort((a,b)=>a-b),med=sh[sh.length>>1],ok=add.filter(r=>Math.abs(r[2]-T(r[0],r[1])[0]-med)<1.2*tol);if(ok.length>=2)m=m.concat(ok)}}}
 {const Ls=m.filter(r=>r[0]===OMR_MK.lx&&OMR_MK.side.includes(r[1])).length,Rs=m.filter(r=>r[0]===OMR_MK.rx&&OMR_MK.side.includes(r[1])).length,La=m.filter(r=>r[0]<105).length,Ra=m.filter(r=>r[0]>105).length;
  if(La>=2&&Ra>=2){one=null;T=Ls>=3&&Rs>=3&&m.length>=7?homog(m):affine(m)}else one=Ra>=La?"r":"l"}
 return{m,T,one,sq:m.filter(r=>!r[4]).length}}
function omrFrame(img){const M=omrFindMarks(img),F0=omrFrame0(img,M);if(!F0.error&&F0.found>=14)return F0;
 const fit=omrFrameFit(img,M);if(!fit)return F0;
 if(!F0.error){const B=[...M.corners.map(b=>({...b,t:"c"})),...M.sides.map(b=>({...b,t:"s"})),...(M.cut||[])],m0=omrInliers(B,F0.map,2.6*F0.pxmm).length;if(m0>=fit.m.length)return F0}
 /* bands as before, from the squares that were found and the fitted pattern for the rest */
 const all=fit.m.filter(r=>!r[4]).map(r=>r.slice(0,4)),G=fit.T,levels=[11.5,...OMR_MK.side,267.5],pt=(X,Y)=>{const f=all.find(a=>a[0]===X&&a[1]===Y);return f?[f[2],f[3]]:G(X,Y)};
 const bands=[];for(let i=0;i<levels.length-1;i++){const y0=levels[i],y1=levels[i+1];bands.push({y0,y1,T:homog([[OMR_MK.lx,y0,...pt(OMR_MK.lx,y0)],[OMR_MK.rx,y0,...pt(OMR_MK.rx,y0)],[OMR_MK.lx,y1,...pt(OMR_MK.lx,y1)],[OMR_MK.rx,y1,...pt(OMR_MK.rx,y1)]])})}
 const map=(X,Y)=>{const b=bands.find(b=>Y>=b.y0&&Y<=b.y1)||(Y<11.5?bands[0]:bands[bands.length-1]);return b.T(X,Y)};
 const[ax,ay]=map(0,0),[bx,by]=map(100,0),Fr={map,pxmm:Math.hypot(bx-ax,by-ay)/100,found:fit.sq,of:4+OMR_MK.side.length*2,missing:4+OMR_MK.side.length*2-fit.sq,thr:M.thr,fitted:1,onecol:fit.one};
 return fit.one==="l"?omrRefineX(img,Fr,null):Fr}
/* only one column of side squares was visible: how wide the page is cannot be told from it, so stretch the sheet sideways
   (about the visible column) until the printed answer circles line up */
function omrRefineX(img,F,cfg,rad){if(!F||!F.onecol||F.kx)return F;const L=omrLayout(cfg||{n:5,opts:5,sections:[]}),pts=cfg?L.q.flat():L.roll.flat(),r=rad||(cfg?2.3:1.7);if(!pts.length)return F;const ax=F.onecol==="r"?OMR_MK.rx:OMR_MK.lx;
 const mk=k=>(X,Y)=>F.map(ax+(X-ax)*k,Y),sc=k=>{const G={...F,map:mk(k)};let b=-1e18;for(const dx of[-.5,0,.5])for(const dy of[-.6,0,.6]){const v=omrRingScore(img,G,pts,r,dx,dy);if(v>b)b=v}return b};
 let best={k:1,s:sc(1)};for(let k=.86;k<=1.16;k+=.006){const v=sc(k);if(v>best.s)best={k,s:v}}
 for(let k=best.k-.006;k<=best.k+.006;k+=.0015){const v=sc(k);if(v>best.s)best={k,s:v}}
 return{...F,map:mk(best.k),kx:best.k,kxBy:cfg?"q":"roll"}}

/* ---------- 3. bubbles ---------- */
function omrDark(img,F,X,Y,rmm){const[cx,cy]=F.map(X,Y),r=rmm*F.pxmm,r2=r*r;let s=0,n=0;const{w,h,d}=img;
 for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++){if(y<0||y>=h)continue;for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++){if(x<0||x>=w)continue;if((x-cx)**2+(y-cy)**2>r2)continue;s+=255-d[y*w+x];n++}}
 return n?s/n:0}
/* fine alignment: every bubble has a printed ring, so slide a group of bubbles until the rings sit on the
   printed rings (ring darker than the paper just outside it). Corrects curl and print drift of 1-2 mm. */
const OMR_RING=(()=>{const a=[];for(let k=0;k<20;k++){const t=k/20*2*Math.PI;a.push([Math.cos(t),Math.sin(t)])}return a})();
function omrRingScore(img,F,pts,r,dx,dy){const{w,h,d}=img;let s=0;
 const ri=Math.max(.9,r-.75);
 for(const[X,Y]of pts){const[cx,cy]=F.map(X+dx,Y+dy),R1=r*F.pxmm,R2=(r+.7)*F.pxmm,R0=ri*F.pxmm;
  for(const[c,sn]of OMR_RING){const x1=Math.round(cx+c*R1),y1=Math.round(cy+sn*R1),x2=Math.round(cx+c*R2),y2=Math.round(cy+sn*R2),x0=Math.round(cx+c*R0),y0=Math.round(cy+sn*R0);
   if(x1<0||y1<0||x2<0||y2<0||x0<0||y0<0||x1>=w||x2>=w||y1>=h||y2>=h||x0>=w||y0>=h)continue;const o=d[y2*w+x2],i=d[y0*w+x0],g=d[y1*w+x1],cl=v=>v<-30?-30:v>80?80:v;s+=cl(Math.min(o,i)-g)+cl(o-g)}}return s}
const OMR_SQ=(()=>{const a=[];for(let k=0;k<8;k++){const t=k/8*2-1;a.push([t,-1],[t,1],[-1,t],[1,t])}return a})();
function omrBoxScore(img,F,ctr,dx,dy){const{w,h,d}=img;let s=0;for(const[X,Y]of ctr)for(const[u,v]of OMR_SQ){const[x1,y1]=F.map(X+dx+u*3.2,Y+dy+v*3.2),[x2,y2]=F.map(X+dx+u*4,Y+dy+v*4),[x0,y0]=F.map(X+dx+u*2.4,Y+dy+v*2.4);
 const g=(x,y)=>{x=Math.round(x);y=Math.round(y);return x>=0&&y>=0&&x<w&&y<h?d[y*w+x]:255};const o=g(x2,y2),i=g(x0,y0),r=g(x1,y1),cl=v=>v<-30?-30:v>80?80:v;s+=cl(Math.min(o,i)-r)+cl(o-r)}return s}
function omrAlign(img,F,pts,r,range,step,dx0,dy0,ry){let best=[dx0||0,dy0||0],bs=-1e18;ry=ry==null?range:ry;
 for(let dy=-ry;dy<=ry+1e-9;dy+=step)for(let dx=-range;dx<=range+1e-9;dx+=step){const v=omrRingScore(img,F,pts,r,(dx0||0)+dx,(dy0||0)+dy);if(v>bs){bs=v;best=[(dx0||0)+dx,(dy0||0)+dy]}}return best}
/* each question row is aligned on its own (paper can fold or curl abruptly), then a row that disagrees
   with both neighbours by more than 1 mm takes their average (protects rows that are mostly filled) */
function omrAlignAll(img,F,L){const raw=L.q.map(row=>{const c=omrAlign(img,F,row,2.3,2.6,.4);return omrAlign(img,F,row,2.3,.3,.1,c[0],c[1])});
 const cols={};L.q.forEach((row,i)=>{const k=Math.round(row[0][0]);(cols[k]=cols[k]||[]).push(i)});const off=raw.map(v=>v.slice());
 Object.values(cols).forEach(ix=>ix.forEach((i,k)=>{const a=raw[ix[k-1]],b=raw[ix[k+1]],v=raw[i];const far=p=>p&&Math.hypot(p[0]-v[0],p[1]-v[1])>1;
  if(a&&b&&far(a)&&far(b)&&Math.hypot(a[0]-b[0],a[1]-b[1])<1)off[i]=[(a[0]+b[0])/2,(a[1]+b[1])/2]}));
 /* roll block: the five write-in boxes above the digits are not repeated, so they pin the block; then each digit column is refined a little */
 let rb=[0,0],rs=-1e18;const allR=L.roll.flat();for(let dy=-3;dy<=3.01;dy+=.25)for(let dx=-3;dx<=3.01;dx+=.25){const v=omrBoxScore(img,F,L.boxes,dx,dy)*1.5+omrRingScore(img,F,allR,1.7,dx,dy);if(v>rs){rs=v;rb=[dx,dy]}}
 const roff=L.roll.map(col=>{const c=omrAlign(img,F,col,1.7,2.8,.2,rb[0],rb[1],.6);return omrAlign(img,F,col,1.7,.2,.1,c[0],c[1])});
 return{off,roff}}
/* paper level around the sheet, for scaling darkness: the 90th percentile brightness */
function omrPaper(img){const h=new Array(256).fill(0);for(let i=0;i<img.d.length;i+=5)h[img.d[i]]++;let t=0;h.forEach(v=>t+=v);let a=0;for(let v=255;v>=0;v--){a+=h[v];if(a>t*.25)return v}return 230}

/* ---------- 4. decisions ---------- */
const OMR_T={mark:.42,clear:.24,ratio:.62,faint:.1};
function omrDecide(vals,base,full,letters){const s=vals.map(v=>Math.max(0,(v-base)/Math.max(30,full-base)));const o=s.map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]);const[s1,i1]=o[0],[s2]=o[1]||[0];
 const r={s:s.map(v=>Math.round(v*100)/100)};
 /* nothing marked; a faint mark that stands out from the rest of the row is shown for review */
 if(s1<OMR_T.clear){r.a="";if(s1>=OMR_T.faint&&s1-s2>=.08){r.flag="faint";r.m=letters[i1]}return r}
 /* two or more marks of similar darkness */
 if(s2>=OMR_T.clear&&s2>=s1*OMR_T.ratio){r.a="";r.flag="multiple";r.m=o.filter(x=>x[0]>=OMR_T.clear&&x[0]>=s1*OMR_T.ratio).map(x=>letters[x[1]]).join("");return r}
 r.a=letters[i1];
 /* clear single answer; a light mark (tick, cross, light pencil) is kept but shown for review */
 if(s1>=OMR_T.mark&&s2<OMR_T.clear*.85)return r;
 r.flag=s2>=OMR_T.clear*.6?"smudge":"light";return r}

/* read one page. cfg = sheet layout for that paper (n, opts, sections) */
function omrRead(img,cfg,F){F=F||omrFrame(img);if(F.error)return F;const L=omrLayout(cfg),letters="ABCDE".slice(0,cfg.opts||5);
 const A=omrAlignAll(img,F,L);
 const qv=L.q.map((row,i)=>row.map(([X,Y])=>omrDark(img,F,X+A.off[i][0],Y+A.off[i][1],1.55))),rv=L.roll.map((col,j)=>col.map(([X,Y])=>omrDark(img,F,X+A.roff[j][0],Y+A.roff[j][1],1.1)));
 /* blank level = typical empty bubble (printed letter + paper); full level = typical filled bubble on this page */
 const flat=qv.flat().sort((a,b)=>a-b),base=flat[Math.floor(flat.length*.3)];
 const maxes=qv.map(r=>Math.max(...r)).sort((a,b)=>a-b),filled=maxes.filter(v=>v>base+40);const full=filled.length?filled[Math.floor(filled.length*.7)]:base+120;
 const ans=qv.map(r=>omrDecide(r,base,full,letters));
 const rflat=rv.flat().sort((a,b)=>a-b),rbase=rflat[Math.floor(rflat.length*.4)],rmax=rv.map(c=>Math.max(...c)).sort((a,b)=>b-a)[1]||rbase+120;
 const roll=rv.map(c=>omrDecide(c,rbase,Math.max(rmax,full*.9),"0123456789"));
 return{frame:{found:F.found,of:F.of},base:Math.round(base),full:Math.round(full),ans,roll,rollText:roll.map(r=>r.a||"?").join(""),rollFlag:roll.some(r=>r.flag||!r.a)}}

/* warp the QR corner of the sheet into a small upright image for the QR decoder */
function omrQrCrop(img,F,size){size=size||260;const out=new Uint8ClampedArray(size*size*4),X0=166,Y0=6,S=30;
 for(let j=0;j<size;j++)for(let i=0;i<size;i++){const[x,y]=F.map(X0+S*i/size,Y0+S*j/size);const xi=Math.round(x),yi=Math.round(y);const v=xi>=0&&yi>=0&&xi<img.w&&yi<img.h?img.d[yi*img.w+xi]:255;const k=(j*size+i)*4;out[k]=out[k+1]=out[k+2]=v;out[k+3]=255}
 return{data:out,width:size,height:size}}
if(typeof module!=="undefined")module.exports={omrRefineX,omrAlignAll,omrLayout,omrFrame,omrRead,omrQrCrop,omrDark,OMR_T,omrFindMarks,omrBlobs,homog,affine,omrRingScore,omrAlign};
