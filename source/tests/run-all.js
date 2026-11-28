/* Runs every browser test on source/dist/ric-dme-office.html and prints a short summary.
   A test fails if it crashes, prints a line starting with "ERR", or (click-everything) reports errors above 0. */
const {spawnSync}=require('child_process'),path=require('path'),fs=require('fs');
const tests=['pages-and-layout.js','observership.js','accreditation.js','settings.js','qr-codes.js','ws-registration.js','public-form.js','results-to-supervisors.js','search-and-day-change.js','attendance-sheet.js','dashboard-attention.js','click-everything.js'];
if(!fs.existsSync(path.join(__dirname,'..','dist','ric-dme-office.html'))){console.log('Build first: python3 source/build.py');process.exit(1)}
let bad=0;
for(const t of tests){const r=spawnSync(process.execPath,[path.join(__dirname,t)],{encoding:'utf8',timeout:15*60*1000});
 const out=(r.stdout||'')+(r.stderr||''),errLines=out.split('\n').filter(l=>/^ERR\b|^PUB ERR/.test(l)),m=out.match(/^errors (\d+)/m);
 const ok=r.status===0&&!errLines.length&&(!m||m[1]==='0');if(!ok)bad++;
 console.log(`${ok?'PASS':'FAIL'}  ${t}`);if(!ok)console.log(out.split('\n').slice(-25).map(l=>'      '+l).join('\n'))}
console.log(bad?`${bad} test(s) failed`:'All tests passed');process.exit(bad?1:0);
