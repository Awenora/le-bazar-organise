// Rendering resolver only. Never writes temporary URLs into business data.
export class PrivateMedia {
  constructor(backend,getView,storage,storageKey){this.backend=backend;this.getView=getView;this.storage=storage;this.storageKey=storageKey;this.sources=new Map();this.urls=new Map();this.inflight=new Map();}
  async initialize(){
    let list;
    try{list=await this.backend.media();this.storage?.setItem(this.storageKey,JSON.stringify(list));}
    catch(error){const cached=this.storage?.getItem(this.storageKey);if(!cached)throw error;list=JSON.parse(cached);}
    for(const item of list.filter(x=>!x.deleted_at))for(const ref of item.source_references||[]){
      let original=ref.originalReference;
      if(original==='inline-preserved-in-shared-data'){
        original=this.getView();if(ref.recipeId)original=original.recipes?.find(r=>r.id===ref.recipeId)?.photo;
        else for(const part of ref.path||[])original=original?.[part];
      }
      if(typeof original==='string')this.sources.set(original,item);
    }
    this.scan?.(document.body);
  }
  async url(original){
    const item=this.sources.get(original);if(!item)return original;
    if(this.urls.has(item.sha256))return this.urls.get(item.sha256);
    if(!this.inflight.has(item.sha256))this.inflight.set(item.sha256,(async()=>{
      const cache=await caches.open('bazar-private-media-v1');const cacheKey=new URL('./cached/'+item.sha256,location.href).href;
      let response=await cache.match(cacheKey),blob=response?await response.blob():await this.backend.download(item.object_path);
      const bytes=await blob.arrayBuffer(),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
      if(digest!==item.sha256||bytes.byteLength!==Number(item.byte_size))throw Error('Image privée différente : affichage bloqué.');
      if(!response)await cache.put(cacheKey,new Response(blob,{headers:{'Content-Type':item.mime_type}}));
      const result=URL.createObjectURL(blob);this.urls.set(item.sha256,result);return result;
    })().finally(()=>this.inflight.delete(item.sha256)));
    return this.inflight.get(item.sha256);
  }
  start(){
    const apply=node=>{
      if(node.nodeType!==1)return;
      const items=[node,...node.querySelectorAll('img,[style]')];
      for(const el of items){
        const src=el.getAttribute('src');
        if(src&&this.sources.has(src)){this.url(src).then(url=>{if(el.getAttribute('src')===src)el.setAttribute('src',url);}).catch(()=>{});}
        const style=el.getAttribute('style');if(!style||!style.includes('url('))continue;
        for(const [source]of this.sources)if(style.includes(source))this.url(source).then(url=>{
          const current=el.getAttribute('style');if(current?.includes(source))el.setAttribute('style',current.split(source).join(url));
        }).catch(()=>{});
      }
    };
    this.scan=apply;apply(document.body);this.observer=new MutationObserver(records=>{for(const r of records){if(r.type==='attributes')apply(r.target);else for(const node of r.addedNodes)apply(node);}});
    this.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','style']});
  }
}
