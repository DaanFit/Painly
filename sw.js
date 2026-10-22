// Offline support with a new cache version.
const CACHE='my-knee-v3-0';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&(/^(mijn-gym-|mijn-knie-)/.test(key))).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==location.origin)return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){let copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}return response;}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));});
