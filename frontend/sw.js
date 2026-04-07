// sw.js — PPK DriveHub Service Worker
var CACHE_NAME='ppk-v1';
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
  // API calls: network first, no cache
  if(url.pathname.startsWith('/api/')){
    e.respondWith(
      fetch(e.request).catch(function(){
        return new Response(JSON.stringify({success:false,message:'ออฟไลน์ — ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'}),{headers:{'Content-Type':'application/json'}});
      })
    );
    return;
  }
  // Static assets: cache first, then network
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached)return cached;
      return fetch(e.request).then(function(resp){
        if(resp.status===200&&resp.type==='basic'){
          var clone=resp.clone();
          caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,clone)});
        }
        return resp;
      });
    }).catch(function(){
      // Fallback for HTML pages
      if(e.request.headers.get('accept').indexOf('text/html')>=0){
        return caches.match('/dashboard.html');
      }
    })
  );
});