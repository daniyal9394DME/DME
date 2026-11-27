
/* =====================================================================
   V44 · OMR: sheets printed with a different number of questions from
   the paper's current set-up (e.g. printed with 50, paper set to 30).
   New sheets carry the number in their QR code; for sheets printed
   before that, the layout that matches the printed circles is found.
   ===================================================================== */
function omrDetectN(img,F,cfg,S){const cands=[...new Set([cfg.n,S&&S.printed&&S.printed.n,20,25,30,35,40,45,50,60,70,75,80,90,100,120,150,200].filter(n=>n>=5&&n<=200))];
 const score=n=>{const L=omrLayout({...cfg,n,sections:(cfg.sections||[]).filter(z=>z.from<=n).map(z=>({...z,to:Math.min(z.to,n)}))}),pts=L.q.flat();let best=-1e18;
  for(const dx of[-.8,0,.8])for(const dy of[-.8,0,.8]){const v=omrRingScore(img,F,pts,2.3,dx,dy)/pts.length;if(v>best)best=v}return best};
 /* a layout with fewer questions than printed also lands on circles, one with more lands on blank paper:
    take the largest number whose circles all line up nearly as well as the best */
 const R=cands.map(n=>({n,s:score(n)}));const top=Math.max(...R.map(r=>r.s));if(!(top>0))return cfg.n;
 const ok=R.filter(r=>r.s>=top*.88).sort((a,b)=>b.n-a.n);return ok.length?ok[0].n:cfg.n}
/* the review card says when a sheet was printed for a different number of questions */
{const _c=omrReviewCard;omrReviewCard=function(x,s){const h=_c(x,s);const S=omrSpec(x,s.spec);if(!s.printedN||!S||s.printedN===S.n)return h;
 return h.replace('<div class="head">',`<div class="flag info" style="margin:0 0 8px">This sheet was printed with ${s.printedN} questions; the paper is set to ${S.n}. It was read with the printed layout${s.printedN>S.n?`; questions after ${S.n} are not counted`:`; questions ${s.printedN+1}–${S.n} could not be answered on it`}.</div><div class="head">`)}}
