/* Explicit opt-in only. No conversion, catalogue migration or changes to recipe needs. */
(function(root){'use strict';
function norm(u){return String(u||'').trim().toLocaleLowerCase('fr').replace(/s$/,'').replace(/^(pièce|unité)$/,'article');}
function inspect(data,p){
 const resolver=root.BazarFamilyShopping,rows=(data.inventory?.items||[]).filter(i=>resolver?resolver.productFor(data,i)?.id===p.id:i.catalogId===p.id);
 if(!rows.length)return {quantity:null,reason:'Aucune ligne de Stock reliée sans ambiguïté à ce produit.'};
 if(rows.some(i=>!Number.isFinite(i.quantity)||i.quantity<0))return {quantity:null,reason:'Quantité en Stock inconnue : aucun déclenchement automatique.'};
 const units=new Set(rows.map(i=>norm(i.unit))),unit=p.restock.unit||rows[0].unit||'';
 if(units.size!==1||!units.has(norm(unit)))return {quantity:null,reason:'Unités incompatibles : Stock ('+[...new Set(rows.map(i=>i.unit||'non renseignée'))].join(', ')+') / Restock ('+(unit||'non renseignée')+'). Aucune conversion automatique.',incompatible:true};
 return {quantity:rows.reduce((n,i)=>n+i.quantity,0),unit};
}
function stock(data,p){return inspect(data,p).quantity;}
function destination(data,p){return root.BazarFamilyShopping?.routeFor(data,{catalogId:p.id})||{store:p.store,family:p.family};}
function closed(data,wk,item){return !!(data.shoppingCaddie?.[wk]?.[item.identity]||data.shoppingExcluded?.[wk]?.[item.identity]||(item.sourceKeys||[item.key]).some(k=>data.shoppingHidden?.[wk]?.includes(k)));}
function reconcile(data,wk,api){let changed=false;
 for(const p of data.shoppingCatalog||[]){const c=p.restock;if(c?.mode!=='automatic'||!destination(data,p).store||!Number.isFinite(c.threshold)||c.threshold<0||!Number.isFinite(c.quantity)||c.quantity<=0)continue;const previous=data.automaticRestock?.[p.id];
 // Carry only our still-open purchase. Recipe and manual purchases are never moved.
 if(previous&&!previous.adopted&&previous.week<wk){const row=api.items(previous.week).find(i=>(i.sourceKeys||[i.key]).includes(previous.key));const source=(data.manualShopping||[]).find(i=>i.key===previous.key);if(row&&source&&!closed(data,previous.week,row)){
  const oldWeek=previous.week,adjustment=data.shoppingQuantities?.[oldWeek]?.[row.identity];source.shoppingWeek=wk;
  const current=api.items(wk).find(i=>(i.sourceKeys||[i.key]).includes(previous.key));if(current){if(adjustment&&!data.shoppingQuantities?.[wk]?.[current.identity])api.quantity(wk,current,adjustment.quantity,adjustment.unit);previous.week=wk;previous.identity=current.identity;changed=true;}
 }}
 const checked=inspect(data,p),n=checked.quantity;if(n===null){api.issue?.(p,checked);continue;}const route=destination(data,p),unit=checked.unit;
 if(n>c.threshold){if(previous&&!previous.armed){previous.armed=true;changed=true;}continue;}
 if(previous&&!previous.armed)continue;
 // A pending purchase in any week is reused; never duplicate an explicit purchase.
 const weeks=new Set([wk,...(data.manualShopping||[]).map(i=>i.shoppingWeek).filter(Boolean)]);let existing;
 for(const w of weeks){existing=api.items(w).find(i=>api.product(i)?.id===p.id&&!closed(data,w,i));if(existing){existing={item:existing,week:w};break;}}
 data.automaticRestock??={};const cycle=(previous?.cycle||0)+1;
 if(existing){const item=existing.item;data.automaticRestock[p.id]={cycle,armed:false,week:existing.week,key:item.key,identity:item.identity,adopted:true};if(!item.adjustment&&!item.buyManual)api.quantity(existing.week,item,c.quantity,unit);changed=true;continue;}
 const key='automatic-restock:'+p.id+':'+cycle;
 data.manualShopping??=[];if(!data.manualShopping.some(i=>i.key===key))data.manualShopping.push({key,text:p.name,catalogId:p.id,shoppingWeek:wk,automaticRestock:{catalogId:p.id,cycle}});
 data.shops??={};data.shops[key]=route.store;data.productFamilies??={};data.productFamilies[key]=route.family||'Sans catégorie';
 const item=api.items(wk).find(i=>(i.sourceKeys||[i.key]).includes(key));if(!item)throw Error('Impossible de préparer le réapprovisionnement : '+p.name);
 api.quantity(wk,item,c.quantity,unit);data.automaticRestock[p.id]={cycle,armed:false,week:wk,key,identity:item.identity,adopted:false};changed=true;
 }
 return changed;
}
const api={norm,inspect,stock,destination,closed,reconcile};root.BazarAutomaticRestock=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
