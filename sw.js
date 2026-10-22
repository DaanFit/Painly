const CACHE = 'painly-v6-1-icons';
const ASSETS = ['./','./index.html','./app.js','./styles.css','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./share-preview.png'];
self.addEventListener('install',e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate',e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE && /^(painly-|my-pain-|my-knee-|mijn-knie-|mijn-gym-)/.test(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch',e => {
 if (e.request.method!=='GET') return;
 const url=new URL(e.request.url);
 if (url.origin!==self.location.origin) return;
 e.respondWith(fetch(e.request).then(resp => { if(resp.ok) { const copy=resp.clone(); caches.open(CACHE).then(c => c.put(e.request,copy)).catch(()=>{}); } return resp; }).catch(() => caches.match(e.request).then(resp => resp || (e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
