(function(root){'use strict';
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/œ/g,'oe').replace(/[’‘]/g,"'").toLowerCase().replace(/\s+/g,' ').trim();
const productKey=s=>norm(s).replace(/(\d)[,](\d)/g,'$1.$2').replace(/[\s()'’\-]+/g,'');
const family=s=>(/^assaison/.test(norm(s))||norm(s)==='condiments')?'Condiments':String(s||'Sans catégorie').trim();
const id=prefix=>prefix+'-'+(root.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));
function ensure(d){d.familyShopping??={version:1,teams:[{id:'wed-lidl',name:'Mercredi — Lidl',day:3,store:'Lidl',participants:['GG','Audrey'],active:true},{id:'thu-inter',name:'Jeudi — Intermarché',day:4,store:'Intermarché',participants:['Jérémy'],active:true},{id:'fri-inter',name:'Vendredi — Intermarché',day:5,store:'Intermarché',participants:['Audrey','Emily'],notes:'Gros conditionnements et produits non réfrigérés, selon les besoins.',active:true}],locations:[{id:'kitchen',name:'Cuisine',emoji:'🍽️'},{id:'utility',name:'Buanderie',emoji:'🧺'},{id:'bathroom',name:'Salle de bain',emoji:'🛁'},{id:'dressing',name:'Dressing',emoji:'👕'}],overrides:{},imports:{}};const s=d.familyShopping;s.overrides??={};s.imports??={};return s;}
function renameFamilies(d){for(const p of d.shoppingCatalog||[])p.family=family(p.family);for(const c of d.inventory?.categories||[])c.name=family(c.name);for(const key of ['reserveCategories','reserveCategoryOrder'])if(Array.isArray(d[key]))d[key]=[...new Set(d[key].map(family))];for(const key of ['reserveFamilies','productFamilies'])if(d[key])for(const k of Object.keys(d[key]))d[key][k]=family(d[key][k]);if(d.shoppingRouting?.families)d.shoppingRouting.families=[...new Set(d.shoppingRouting.families.map(family))];for(const r of Object.values(d.shoppingRouting?.products||{}))if(r.family)r.family=family(r.family);for(const key of ['shopRules','shoppingCategories','shoppingCategoryOrder'])if(d[key]&&typeof d[key]==='object')for(const [k,v]of Object.entries(d[key])){const next=family(k);if(next!==k){if(d[key][next]===undefined)d[key][next]=v;delete d[key][k];}if(Array.isArray(v))d[key][next]=v.map(family);}}
function similarity(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let diagonal=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=old;}}return 1-row[b.length]/Math.max(1,a.length,b.length);}
function resolveFamily(d,value){const name=family(value),known=[...(d.shoppingCatalog||[]).map(p=>family(p.family)),...(d.inventory?.categories||[]).map(c=>family(c.name)),...(d.shoppingRouting?.families||[])];return known.find(v=>norm(v)===norm(name))||(name===name.toLocaleUpperCase('fr-FR')?name[0]+name.slice(1).toLocaleLowerCase('fr-FR'):name);}
function productKeys(p){const keys=[p.name,...String(p.aliases||'').split(',')];if(p.purchaseFormat&&!norm(p.name).endsWith(norm(p.purchaseFormat)))keys.unshift(p.name+' '+p.purchaseFormat);return [...new Set(keys.map(productKey).filter(Boolean))];}
function importCatalog(d,source){const state=ensure(d);if(state.imports[source.version])return {added:0,matched:0,alreadyImported:true};d.shoppingCatalog??=[];const byKey=new Map();for(const p of d.shoppingCatalog)for(const k of productKeys(p))if(!byKey.has(k))byKey.set(k,p);let added=0,matched=0,pending=0;state.importReview??=[];for(const row of source.products){const key=productKey(row.name);let p=byKey.get(key);if(p){matched++;p.importSources??=[];if(!p.importSources.includes(source.version))p.importSources.push(source.version);}else{const candidates=d.shoppingCatalog.map(p=>({id:p.id,score:similarity(productKey(p.name),key)})).filter(v=>v.score>=.78).sort((a,b)=>b.score-a.score).slice(0,3);if(candidates.length){state.importReview.push({id:id('review'),...row,candidates:candidates.map(v=>v.id)});pending++;continue;}p={id:id('catalog'),name:row.name.trim(),family:resolveFamily(d,row.family),store:'',aliases:'',notes:'',historicalStore:row.historicalStore||'',storeConfirmed:false,importSources:[source.version]};d.shoppingCatalog.push(p);for(const k of productKeys(p))byKey.set(k,p);added++;}}renameFamilies(d);state.imports[source.version]={added,matched,pending,at:new Date().toISOString()};return {added,matched,pending};}
function reference(item){return item.replacementTarget||(item.habitualProduct?'catalog:'+item.habitualProduct.id:item.catalogId?'catalog:'+item.catalogId:item.baseKey||item.key);}
/* Indexes live only inside an explicitly bounded, synchronous read phase. */
let productReadScope=null;
function withProductReadCache(fn){if(productReadScope)return fn();productReadScope=new WeakMap();try{return fn();}finally{productReadScope=null;}}
function invalidateProductReadCache(){if(productReadScope)productReadScope=new WeakMap();}
function productReadIndex(d){if(!productReadScope)return null;let index=productReadScope.get(d);if(index)return index;index={ids:new Map(),exact:new Map(),linked:new Map()};
 const add=(map,key,p)=>{if(!map.has(key))map.set(key,new Set());map.get(key).add(p);};
 for(const p of d.shoppingCatalog||[]){if(!index.ids.has(p.id))index.ids.set(p.id,p);for(const key of productKeys(p))add(index.exact,key,p);for(const name of p.ingredientLinks||[])add(index.linked,name,p);}
 productReadScope.set(d,index);return index;
}
function indexMatches(map,keys){const found=new Set();for(const key of keys)for(const p of map.get(key)||[])found.add(p);return [...found];}
/* One read-only resolver for catalogue, Stock, recipe ingredients and purchases.
   Explicit IDs win; contradictory IDs and ambiguous exact matches never guess. */
function productFor(d,item,tools=root.BazarStockTools){
 if(!item)return null;const catalogue=d.shoppingCatalog||[],index=productReadIndex(d),findId=id=>index?index.ids.get(id):catalogue.find(p=>p.id===id);
 if(item.replacementTarget?.startsWith('stock:')){const stock=(d.inventory?.items||[]).find(i=>i.id===item.replacementTarget.slice(6));return stock?productFor(d,stock,tools):null;}
 const ids=[item.catalogId,item.habitualProduct?.id,item.replacementTarget?.startsWith('catalog:')?item.replacementTarget.slice(8):null,...(item.sourceKeys||[item.key]).filter(k=>k?.startsWith('family-catalog:')).map(k=>k.slice(15))].filter(Boolean);
 const unique=[...new Set(ids)];if(unique.length)return unique.length===1?findId(unique[0])||null:null;
 // A physical Stock product is not a recipe ingredient to substitute.
 if(item.name&&(!item.text&&!item.uses||item.manual)){const exact=index?indexMatches(index.exact,[productKey(item.name)]):catalogue.filter(p=>productKeys(p).includes(productKey(item.name)));if(exact.length)return exact.length===1?exact[0]:null;}
 const texts=[...(item.texts||[]),...(item.uses||[]).map(u=>u.originalText||u.text),item.text,item.name].filter(Boolean),names=[...new Set(texts.map(t=>tools?.parseIngredient?tools.parseIngredient(t).normalized:norm(t)))];
 const assigned=names.filter(n=>Object.hasOwn(d.shoppingIngredientProducts||{},n));
 if(assigned.length){const targets=[...new Set(assigned.map(n=>d.shoppingIngredientProducts[n]))];return targets.length===1&&targets[0]?findId(targets[0])||null:null;}
 const linked=index?indexMatches(index.linked,names):catalogue.filter(p=>(p.ingredientLinks||[]).some(n=>names.includes(n)));if(linked.length)return linked.length===1?linked[0]:null;
 const exact=[item.name,item.text,...names].filter(Boolean).map(productKey),matches=index?indexMatches(index.exact,exact):catalogue.filter(p=>productKeys(p).some(k=>exact.includes(k)));
 return matches.length===1?matches[0]:null;
}
function routeFor(d,item,tools=root.BazarStockTools,legacyKey=root.shoppingProduct){
 const product=productFor(d,item,tools),keys=[item.key,item.baseKey,...(item.sourceKeys||[]),...(item.baseKeys||[])].filter(Boolean);
 const texts=[...(item.uses||[]).map(u=>u.originalText||u.text),...(item.texts||[]),item.text,item.name,...(product?[product.name,...String(product.aliases||'').split(',')]:[])].filter(Boolean),routes=d.shoppingRouting?.products||{};
 const learned=()=>texts.flatMap(t=>{const n=tools?.parseIngredient?tools.parseIngredient(t).normalized:norm(t);return [routes['ingredient:'+n],legacyKey?routes[legacyKey(t)]:undefined];}).filter(Boolean);
 const habit=product?d.shoppingProductRoutes?.['catalog:'+product.id]:null,targetRoute=d.shoppingProductRoutes?.[item.replacementTarget],catalogKey=product?'family-catalog:'+product.id:null;
 const valid=v=>v&&v!=='À affecter'&&v!=='Sans catégorie';
 const unanimous=list=>{const values=[...new Set(list.filter(valid))];return values.length===1?values[0]:undefined;};
 const pick=values=>values.find(valid);
 const store=pick([d.shops?.[item.key],item.routingStore,item.replacementStore,item.purchaseStore,item.orphan?item.store:undefined,unanimous(keys.map(k=>d.shops?.[k])),targetRoute?.store,habit?.store,product?.store,d.shops?.[catalogKey]]);
 const learnedRoutes=store?null:learned();
 const resolvedStore=store||unanimous(learnedRoutes.map(r=>r.store));
 const family=pick([d.productFamilies?.[item.key],item.replacementFamily,item.purchaseFamily,item.orphan?item.family:undefined,unanimous(keys.map(k=>d.productFamilies?.[k])),targetRoute?.family,habit?.family,product?.family,d.productFamilies?.[catalogKey]]);
 const resolvedFamily=family||unanimous((learnedRoutes||learned()).map(r=>r.family));
 return {store:resolvedStore,family:resolvedFamily};
}
function teamFor(d,item,week){const s=ensure(d),ref=reference(item),p=productFor(d,item),override=s.overrides[week]?.[ref]??(p?s.overrides[week]?.['catalog:'+p.id]:undefined);const teamId=override?.teamId??p?.teamId??s.habits?.[ref]?.teamId??'';return s.teams.find(t=>t.id===teamId&&t.active!==false)||null;}
function transfer(d,item,week,teamId){const s=ensure(d),team=s.teams.find(t=>t.id===teamId&&t.active!==false);if(teamId&&!team)throw Error('Équipe introuvable.');s.overrides[week]??={};s.overrides[week][reference(item)]={teamId:team?.id||'',store:team?.store||''};}
function saveTeam(d,values,teamId){const s=ensure(d),existing=s.teams.find(t=>t.id===teamId),name=String(values.name||'').trim(),store=String(values.store||'').trim(),day=Number(values.day);if(!name||!store||!Number.isInteger(day)||day<0||day>6)throw Error('Renseigne le nom, le jour et le magasin.');const row=existing||{id:id('team')};Object.assign(row,{name,store,day,participants:[...new Set(values.participants||[])],notes:String(values.notes||''),active:values.active!==false});if(!existing)s.teams.push(row);return row;}
const api={norm,productKey,family,resolveFamily,id,ensure,renameFamilies,productKeys,importCatalog,reference,productFor,routeFor,withProductReadCache,invalidateProductReadCache,teamFor,transfer,saveTeam};root.BazarFamilyShopping=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
