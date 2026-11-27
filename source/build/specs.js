const DEF_SPECS=[
["General Cardiology",1,[2,3,.5,1.5,3],{"FCPS":5,"UHS (MD)":5},"FCPS / MD General Cardiology","Level 3","CPSP, UHS",1],
["Cardiac Surgery",1,[2,3,.5,1.5,3],{"FCPS":5,"UHS (MS)":5},"FCPS / MS Cardiac Surgery","Level 3","CPSP, UHS",1],
["Anaesthesiology",1,[2,2,.5,1.5,3],{"FCPS":4,"UHS (MS)":5},"FCPS / MS Anaesthesiology","Level 3","CPSP, UHS",1],
["Cardiothoracic Anaesthesia",1,[2,3,.5,1.5,3],{"FCPS":5},"FCPS Cardiothoracic Anaesthesia","Level 3","CPSP",1],
["Radiology",0,null,{"FCPS":4},"FCPS Radiology","Level 3","CPSP",1],
["Interventional Cardiology",0,null,{"FCPS":2,"UHS (MS)":2},"FCPS / MS Interventional Cardiology","Level 4","CPSP, UHS",1],
["Paediatric Cardiology",0,null,{"FCPS":3,"UHS (MD)":3},"FCPS / MD Paediatric Cardiology","Level 4","CPSP, UHS",1],
["Paediatric Cardiac Surgery",0,null,{"FCPS":3},"Paediatric and Congenital Cardiac Surgery","Level 4","CPSP",1],
["Electrophysiology",0,null,{"FCPS":2},"FCPS Clinical Cardiac Electrophysiology","Level 4","CPSP",1],
["Nephrology",0,null,{},"","","",0],["Pulmonology",0,null,{},"","","",0],["Pathology",0,null,{},"","","",0]
].map(([name,rot,rule,dur,title,level,councils,teaching])=>({name,rotational:!!rot,rule:rule||[2,3,.5,1.5,3],dur,title,level,councils,teaching:!!teaching,active:true}));
const specOf=n=>DB.specs.find(s=>s.name===n);
const specNames=teach=>DB.specs.filter(s=>s.active&&(!teach||s.teaching)).map(s=>s.name);
const specIdx=n=>{const i=DB.specs.findIndex(s=>s.name===n);return i<0?99:i};
