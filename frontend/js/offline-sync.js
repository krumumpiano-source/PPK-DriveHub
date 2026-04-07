/* offline-sync.js — IndexedDB queue for offline QR submissions */
(function(){
  'use strict';
  var DB_NAME='ppk_offline';
  var STORE='pending';
  var db=null;

  function openDB(){
    return new Promise(function(resolve,reject){
      if(db){resolve(db);return}
      var req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=function(e){e.target.result.createObjectStore(STORE,{keyPath:'id',autoIncrement:true})};
      req.onsuccess=function(e){db=e.target.result;resolve(db)};
      req.onerror=function(e){reject(e.target.error)};
    });
  }

  /** Queue a request for later sync */
  async function queueRequest(action,data){
    var d=await openDB();
    return new Promise(function(resolve,reject){
      var tx=d.transaction(STORE,'readwrite');
      tx.objectStore(STORE).add({action:action,data:data,timestamp:Date.now()});
      tx.oncomplete=function(){resolve();updateBadge()};
      tx.onerror=function(e){reject(e.target.error)};
    });
  }

  /** Get all pending items */
  async function getPending(){
    var d=await openDB();
    return new Promise(function(resolve,reject){
      var tx=d.transaction(STORE,'readonly');
      var req=tx.objectStore(STORE).getAll();
      req.onsuccess=function(){resolve(req.result||[])};
      req.onerror=function(e){reject(e.target.error)};
    });
  }

  /** Remove a synced item */
  async function removePending(id){
    var d=await openDB();
    return new Promise(function(resolve,reject){
      var tx=d.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete=function(){resolve();updateBadge()};
      tx.onerror=function(e){reject(e.target.error)};
    });
  }

  /** Try to sync all pending items */
  async function syncAll(){
    if(!navigator.onLine)return{synced:0,failed:0};
    var items=await getPending();
    var synced=0,failed=0;
    for(var i=0;i<items.length;i++){
      try{
        await apiCall(items[i].action,items[i].data);
        await removePending(items[i].id);
        synced++;
      }catch(e){
        console.warn('Sync failed for',items[i].action,e);
        failed++;
      }
    }
    updateBadge();
    return{synced:synced,failed:failed};
  }

  /** Update the offline badge in the UI */
  async function updateBadge(){
    try{
      var items=await getPending();
      var badge=document.getElementById('offlineBadge');
      if(!badge){
        badge=document.createElement('div');
        badge.id='offlineBadge';
        badge.style.cssText='position:fixed;bottom:80px;right:20px;background:#ef4444;color:#fff;padding:6px 14px;border-radius:20px;font-size:.85rem;font-weight:600;z-index:9999;display:none;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2)';
        badge.onclick=function(){syncAll().then(function(r){if(r.synced)alert('Sync สำเร็จ '+r.synced+' รายการ');if(r.failed)alert('Sync ไม่สำเร็จ '+r.failed+' รายการ')})};
        document.body.appendChild(badge);
      }
      if(items.length>0){
        badge.textContent='📡 '+items.length+' รายการรอ sync';
        badge.style.display='block';
      }else{
        badge.style.display='none';
      }
    }catch(e){}
  }

  // Auto-sync when coming back online
  window.addEventListener('online',function(){
    syncAll().then(function(r){
      if(r.synced>0){
        if(typeof ppkToast==='function')ppkToast('Sync สำเร็จ '+r.synced+' รายการ','success');
      }
    });
  });

  // Show offline indicator
  window.addEventListener('offline',function(){
    if(typeof ppkToast==='function')ppkToast('ออฟไลน์ — ข้อมูลจะถูกบันทึกไว้ส่ง sync ภายหลัง','warning');
  });

  // Initial badge check
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateBadge);
  else updateBadge();

  window.OfflineSync={queueRequest:queueRequest,getPending:getPending,syncAll:syncAll,updateBadge:updateBadge};
})();