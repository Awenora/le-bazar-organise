import {config} from './config.mjs';
import {CloudEngine} from './engine.mjs';
import {createBackend} from './backend.mjs';
import {PrivateMedia} from './media.mjs';
import {encodeCache,decodeCache} from './cache-codec.mjs';
import {applyPublicationVisuals} from './publication-visuals.mjs';
import {applyAllMonthVisuals} from './publication-seasonal-visuals.mjs';
import {importRecipeByLink,fetchImportedImage} from './recipe-import-client.mjs?v=edge-import-20261030-2';
const native={get:Storage.prototype.getItem,set:Storage.prototype.setItem,remove:Storage.prototype.removeItem};
const isCache=k=>k.startsWith('bazar-cloud-cache:');
const store={getItem:k=>{const raw=native.get.call(localStorage,k);return isCache(k)?decodeCache(raw):raw;},setItem:(k,v)=>native.set.call(localStorage,k,isCache(k)?encodeCache(v):v)};
let legacy=JSON.parse(store.getItem('bazar-organise-v1')||'null');
const client=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'bazar-cloud-auth-v1'}});
const dialog=document.getElementById('dialog');
async function login(){
  const {data:{session}}=await client.auth.getSession();if(session)return session;
  dialog.innerHTML='<h2>Connexion familiale</h2><form id="familyLogin"><label>E-mail<input name="email" type="email" autocomplete="username" required></label><label>Mot de passe<input name="password" type="password" autocomplete="current-password" required></label><p role="status"></p><button type="submit">Se connecter</button></form>';
  dialog.showModal();
  return new Promise(resolve=>{dialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;
    const password=form.elements.password.value;form.elements.password.value='';
    const {data,error}=await client.auth.signInWithPassword({email:form.elements.email.value.trim(),password});
    if(error){form.querySelector('[role=status]').textContent='Connexion refusée ou indisponible. Vos données restent conservées.';button.disabled=false;return;}
    dialog.close();resolve(data.session);
  };});
}
async function acquireCache(household){
  const prefix='bazar-cloud-cache:'+household+':';
  const candidates=Object.keys(localStorage).filter(k=>k.startsWith(prefix));
  const previous=sessionStorage.getItem(prefix+'tab');
  if(previous)candidates.unshift(previous);
  candidates.push(prefix+crypto.randomUUID());
  if(!navigator.locks)throw Error('Ce navigateur ne fournit pas le verrouillage nécessaire aux onglets. Utiliser une version récente de Firefox.');
  for(const name of [...new Set(candidates)]){
    let settle;const chosen=new Promise(resolve=>settle=resolve);
    navigator.locks.request(name,{ifAvailable:true},async lock=>{
      if(!lock){settle(false);return;}
      sessionStorage.setItem(prefix+'tab',name);settle(true);
      await new Promise(resolve=>addEventListener('pagehide',resolve,{once:true}));
    }).catch(()=>settle(false));
    if(await chosen)return name;
  }
  throw Error('Impossible de réserver le cache local.');
}
function patch(target,source){
  if(Array.isArray(target)&&Array.isArray(source)){
    const byId=new Map(target.filter(x=>x&&typeof x==='object'&&x.id).map(x=>[x.id,x]));
    target.splice(0,target.length,...source.map(x=>{const old=x?.id&&byId.get(x.id);if(old){patch(old,x);return old;}return structuredClone(x);}));return;
  }
  for(const k of Object.keys(target))if(!Object.hasOwn(source,k))delete target[k];
  for(const [k,v]of Object.entries(source)){
    if(v&&typeof v==='object'&&target[k]&&typeof target[k]==='object'&&Array.isArray(v)===Array.isArray(target[k]))patch(target[k],v);
    else target[k]=structuredClone(v);
  }
}
try{
  const session=await login();
  if(!legacy&&['127.0.0.1','localhost'].includes(location.hostname)){
    try{legacy=await fetch('cloud/device-preferences.json').then(r=>r.ok?r.json():null);}catch{}
  }
  let household,error;
  if(window.__BAZAR_CLOUD_TEST__)household={id:window.__BAZAR_CLOUD_TEST__.household};
  else{
    const result=await client.schema('bazar').from('households').select('id,name').limit(2);
    if(!result.error&&result.data.length===1)household=result.data[0];else error=result.error;
    const last=JSON.parse(store.getItem('bazar-cloud-last-account')||'null');
    if(!household&&last?.user===session.user.id)household={id:last.household};
  }
  if(!household)throw Error('Foyer inaccessible. Aucune bibliothèque de démonstration ne sera créée.');
  store.setItem('bazar-cloud-last-account',JSON.stringify({user:session.user.id,household:household.id}));
  // Activation candidate: only the validated family UUID may write.
  // The served preparation copy remains locked; this file is not installed.
  const backend=window.__BAZAR_CLOUD_TEST__?.backend||createBackend(client,household.id,{writes:household.id==='b7322f6b-7918-4e65-996f-ee041d9942ef'});
  const storageKey=await acquireCache(household.id);
  let uiSnapshot,loaded=false,applyScheduled=false;
  const engine=new CloudEngine({storage:store,storageKey,remote:backend,notify:()=>{
    if(loaded&&!applyScheduled){applyScheduled=true;queueMicrotask(()=>{applyScheduled=false;window.BazarCloud.tryApply?.();});}
  }});
  let rows;try{rows=await backend.read();}catch(e){if(!engine.state)throw e;}
  if(rows&&!rows.some(r=>!r.deleted&&r.path.length===1&&r.path[0]==='recipes'))
    throw Error('Ce compte ne contient pas la bibliothèque familiale. Le compte de test doit être utilisé uniquement dans la page d’essais séparée.');
  if(!engine.state)engine.initialize(rows,legacy||{});else if(rows&&!engine.state.attempt)engine.receive(rows);
  if(engine.state.startupDivergence){
    dialog.innerHTML='<h2>Données locales différentes</h2><p>Votre ancienne version locale est conservée. Elle ne sera pas envoyée automatiquement sur les données familiales.</p><button id="cloudExportOld">Exporter la version locale</button><button id="cloudContinue">Afficher les données partagées</button>';
    dialog.querySelector('#cloudExportOld').onclick=()=>{
      const blob=new Blob([JSON.stringify(engine.state.drafts.find(x=>x.reason==='pre-cloud-local-data')?.data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='bazar-avant-raccordement-conserve.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    dialog.showModal();await new Promise(resolve=>dialog.querySelector('#cloudContinue').onclick=()=>{const next=structuredClone(engine.state);next.startupDivergence=false;engine.persist(next);dialog.close();resolve();});
  }
  applyPublicationVisuals(engine);
  applyAllMonthVisuals(engine);
  uiSnapshot=engine.view();
  const bridge=window.BazarCloud={engine,client,backend,household:household.id,patch,
    initialData:uiSnapshot,view:()=>engine.view(),uiSnapshot:()=>structuredClone(uiSnapshot),
    applied:value=>{uiSnapshot=structuredClone(value);},
    status:'local',
    reconnect:login,
    importRecipeByLink:url=>importRecipeByLink(client,url),
    async sync(){
      if(bridge.syncing){bridge.syncAgain=true;return bridge.syncing;}
      bridge.syncing=(async()=>{
      try{
        const auth=await client.auth.getSession();
        if(!auth.data.session){bridge.authRequired=true;bridge.status='pending';bridge.tryApply?.();return;}
        bridge.authRequired=false;
        // Only newly referenced images are sent; migrated images are resolved,
        // never reimported. If offline, the original bytes/reference remain queued.
        const current=engine.view(),images=[];
        current.recipes?.forEach((r,i)=>{if(r.photo&&!media.sources.has(r.photo))images.push({value:r.photo,path:['recipes',String(i),'photo'],recipeId:r.id});});
        for(const [id,value]of Object.entries(current.profileAvatars||{}))if(typeof value==='string'&&!media.sources.has(value))images.push({value,path:['profileAvatars',id]});
        for(const image of images){
          if(!/^(data:image\/|https?:|assets\/)/.test(image.value)||image.value.startsWith('data:image/svg'))continue;
          let blob;
          try{blob=await fetch(image.value).then(r=>{if(!r.ok)throw Error();return r.blob();});}
          catch(error){
            if(!/^https?:/.test(image.value))throw Error('Nouvelle image non accessible ; conservée localement.');
            if(!['127.0.0.1','localhost'].includes(location.hostname))blob=await fetchImportedImage(client,image.value);
            else{
              const cached=await fetch('/api/cache-recipe-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:image.value})}).then(r=>{if(!r.ok)throw Error('Photo non récupérée ; version locale conservée.');return r.json();});
              blob=await fetch(cached.photo).then(r=>r.blob());
            }
          }
          await backend.newImage(blob,[{path:image.path,recipeId:image.recipeId,originalReference:image.value.startsWith('data:')?'inline-preserved-in-shared-data':image.value}]);
        }
        if(images.length||!bridge.mediaRefresh||Date.now()-bridge.mediaRefresh>30000){await media.initialize();bridge.mediaRefresh=Date.now();}
        await engine.flush();bridge.status=engine.state.conflicts.length?'conflict':engine.pending().length?'pending':'synced';
      }catch(e){bridge.status='pending';bridge.lastError=e.message;}
      bridge.tryApply?.();
      })();
      try{await bridge.syncing;}finally{bridge.syncing=null;if(bridge.syncAgain){bridge.syncAgain=false;queueMicrotask(()=>bridge.sync());}}
    },
  };
  const routed=new Set(['bazar-organise-v1','bazar-courses-undo','bazar-stock-last-undo-v1','bazar-organise-before-inventory-1','bazar-organise-before-packs-2']);
  const namespace=k=>'bazar-cloud-local:'+household.id+':'+k;
  Storage.prototype.getItem=function(k){
    if(this!==localStorage||!routed.has(k))return native.get.call(this,k);
    if(k==='bazar-organise-v1')return JSON.stringify(uiSnapshot);
    return native.get.call(this,namespace(k));
  };
  Storage.prototype.setItem=function(k,value){
    if(this!==localStorage||!routed.has(k))return native.set.call(this,k,value);
    if(k==='bazar-organise-v1'){
      const next=JSON.parse(value);engine.edit(uiSnapshot,next,{page:bridge.currentPage?.(),checkpoint:!!bridge.restoring});uiSnapshot=structuredClone(next);
      if(loaded)queueMicrotask(()=>bridge.sync());return;
    }
    return native.set.call(this,namespace(k),value);
  };
  Storage.prototype.removeItem=function(k){
    if(this===localStorage&&routed.has(k)){
      if(k==='bazar-organise-v1')throw Error('La base locale protégée ne peut pas être supprimée.');
      return native.remove.call(this,namespace(k));
    }
    return native.remove.call(this,k);
  };
  const media=new PrivateMedia(backend,()=>engine.view(),store,'bazar-cloud-media-map:'+household.id);bridge.media=media;
  try{await media.initialize();}catch(e){bridge.lastError=e.message;}
  window.BAZAR_HAD_LOCAL_DATA=true;
  for(const paused of document.querySelectorAll('script[data-cloud-src]')){
    const script=document.createElement('script');script.src=paused.dataset.cloudSrc;
    await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('Impossible de charger '+script.src));document.body.append(script);});
  }
  loaded=true;media.start();
  addEventListener('online',()=>bridge.sync());
  addEventListener('focus',()=>bridge.sync());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)bridge.sync();});
  setInterval(()=>{if(!document.hidden)bridge.sync();},8000);
  // Closed tabs keep their own durable queue. Drain only caches whose lifetime
  // lock is no longer held; never take over a live tab's edits.
  setInterval(async()=>{
    const prefix='bazar-cloud-cache:'+household.id+':';
    for(const name of Object.keys(localStorage).filter(k=>k.startsWith(prefix)&&k!==storageKey)){
      await navigator.locks.request(name,{ifAvailable:true},async lock=>{
        if(!lock)return;
        const other=new CloudEngine({storage:store,storageKey:name,remote:backend});
        if(!other.state||(!other.pending().length&&!other.state.attempt&&!other.state.conflicts.length))return;
        try{await other.flush();if(other.state.conflicts.length)bridge.externalConflict?.(other);}catch{}
      });
    }
  },15000);
  if(!window.__BAZAR_CLOUD_TEST__)client.channel('family-'+household.id)
    .on('postgres_changes',{event:'*',schema:'bazar',table:'family_records',filter:'household_id=eq.'+household.id},()=>bridge.sync())
    .on('postgres_changes',{event:'*',schema:'bazar',table:'media_files',filter:'household_id=eq.'+household.id},()=>{bridge.mediaRefresh=0;bridge.sync();}).subscribe();
  bridge.sync();
}catch(error){
  dialog.innerHTML='<h2>Connexion familiale indisponible</h2><p></p><button type="button">Réessayer</button>';
  dialog.querySelector('p').textContent=error.message;
  dialog.querySelector('button').onclick=()=>location.reload();if(!dialog.open)dialog.showModal();
}
