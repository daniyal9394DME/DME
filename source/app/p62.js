
/* =====================================================================
   P62 · NEW NAME: DEPARTMENT OF MEDICAL EDUCATION AND TRAINING (DME&T)
   The wording across the app was changed in the source. Saved values
   that other records match on (e.g. the exam reason "Exempted by DME",
   reference numbers RIC/DME/...) are left as they are.
   The Director's designation: "Director of Medical Education" and the
   new "Director of Medical Education and Training" both give full access;
   saved team entries with the old title are updated once, by the Director.
   ===================================================================== */
const DMET_DIR="Director of Medical Education and Training";
function dmetTitleOnce(){if(!DB||!Array.isArray(DB.staff)||typeof isAdmin!=="function"||!isAdmin())return;let n=0;
 DB.staff.forEach(s=>{if(s&&s.desig==="Director of Medical Education"){s.desig=DMET_DIR;n++}});if(n){log(`Designation updated to ${DMET_DIR}`);persist()}}
{const _r=render;render=function(){try{dmetTitleOnce()}catch(e){}return _r.apply(this,arguments)}}
