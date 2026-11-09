// RIC DME Office: lets the app install and open quickly. Records are never cached here;
// they always come live from Supabase.
const V="dme-v20";
const SHELL=["./index.html","./config.js","./register.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=="GET"||u.hostname.endsWith("supabase.co")||u.pathname.includes("/rest/v1/")||u.pathname.includes("/auth/v1/")||u.pathname.includes("/storage/v1/"))return;
 // the app's own pages and settings: newest from the network, cached copy when offline
 if(u.origin===location.origin){e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match("./index.html"))));return}
 // libraries and fonts from CDNs: cached copy first, refreshed in the background
 e.respondWith(caches.match(r).then(m=>{const net=fetch(r).then(res=>{if(res.ok||res.type==="opaque"){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res}).catch(()=>m);return m||net}))});
