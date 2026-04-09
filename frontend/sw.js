// sw.js — PPK DriveHub Service Worker
var CACHE_NAME='ppk-v7';
var STATIC_ASSETS=[
  '/common.css','/config.js','/js/api.js','/js/export-utils.js','/common.js',
  '/dashboard.html','/login.html','/manifest.json'
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
  // Static assets only: cache first, then network
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