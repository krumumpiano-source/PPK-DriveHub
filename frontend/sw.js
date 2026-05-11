// sw.js — PPK DriveHub Service Worker
// v9: Switched JS/CSS to network-first to prevent stale code on mobile (esp. iOS Safari/PWA)
//     where users rarely hard-reload and were stuck with old apiCall/common.js after deploys.
var CACHE_NAME='ppk-v9';
// Only pre-cache truly static fallback assets. JS/CSS use network-first below.
var STATIC_ASSETS=[
  '/manifest.json'
];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(STATIC_ASSETS);
    }).then(function(){self.skipWaiting()})
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){return n!==CACHE_NAME}).map(function(n){return caches.delete(n)}));
    }).then(function(){return self.clients.claim()})
  );
});

// Allow page to trigger immediate activation
self.addEventListener('message',function(e){
  if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting();
});

function isJsCss(url){
  return /\.(js|css)(\?|$)/i.test(url.pathname);
}

self.addEventListener('fetch',function(e){
  var url=new URL(e.request.url);
  // Skip non-GET requests
  if(e.request.method!=='GET')return;
  // Skip cross-origin requests (Google Fonts, CDNs, etc.)
  if(url.origin!==self.location.origin)return;
  // Skip API calls — let them go to network directly
  if(url.pathname.startsWith('/api/'))return;
  // Skip navigation requests (HTML pages) — avoid redirect issues with Cloudflare Pages
  if(e.request.mode==='navigate')return;

  // JS/CSS: network-first (always try fresh; fall back to cache only if offline)
  // This fixes mobile users (iOS Safari/PWA) being stuck on old common.js / api.js
  // after a deploy because they rarely close/reopen the browser.
  if(isJsCss(url)){
    e.respondWith(
      fetch(e.request).then(function(resp){
        if(resp&&resp.status===200&&resp.type==='basic'&&!resp.redirected){
          var clone=resp.clone();
          caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,clone)});
        }
        return resp;
      }).catch(function(){
        return caches.match(e.request).then(function(cached){
          return cached||new Response('',{status:503});
        });
      })
    );
    return;
  }

  // Other static assets (images, fonts, manifest): cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached)return cached;
      return fetch(e.request).then(function(resp){
        if(resp.status===200&&resp.type==='basic'&&!resp.redirected){
          var clone=resp.clone();
          caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,clone)});
        }
        return resp;
      });
    }).catch(function(){return new Response('',{status:503})})
  );
});