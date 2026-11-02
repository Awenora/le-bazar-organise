/* Restock is nested inside Autres. Original purchase identities and quantities remain intact. */
(function(){'use strict';
 const productOf=item=>familyShop.productFor(data,item,stockTools);
 const isAuto=item=>!!item.automaticRestock;
 function habitualStore(item){const p=productOf(item);return p?(familyShop.routeFor(data,{catalogId:p.id},stockTools).store||p.store||'À affecter'):'À affecter';}
 function savedIdentity(item){if(!isAuto(item)||item.identity)return null;const first='manual:'+item.key,wk=datekey(page==='Courses'?coursesWeek():week);const valid=id=>{try{const v=JSON.parse(id);return v.length===3&&v[0]===first?v:null;}catch{return null;}};
  const ids=[...new Set(['shoppingQuantities','shoppingCaddie','shoppingExcluded'].flatMap(field=>Object.keys(data[field]?.[wk]||{})).filter(id=>valid(id)))];
  if(ids.length===1)return valid(ids[0]);if(ids.length>1)return null;
  const record=data.automaticRestock?.[item.automaticRestock.catalogId];return record?.key===item.key?valid(record.identity):null;
 }
 const oldStore=storeOf,oldFamily=familyOf;
 storeOf=function(item){if(!isAuto(item))return oldStore(item);if(item.identity)return 'Autres';return savedIdentity(item)?.[1]||oldStore(item);};
 familyOf=function(item){if(!isAuto(item))return oldFamily(item);if(item.identity)return 'Restock';return savedIdentity(item)?.[2]||oldFamily(item);};
 const storesGroup='courses-categories-restock-stores',oldProducts='courses-products-Autres|Restock',productPrefix='courses-products-restock-store|';
 const previousConfig=sharedConfig;sharedConfig=function(group){const cfg=previousConfig(group);if(group.entry.id.startsWith(productPrefix)){
   const inherited=previousConfig({...group,entry:{...group.entry,id:oldProducts}});
   for(const item of group.items)cfg.items[item.id]={...(inherited.items[item.id]||{}),...(cfg.items[item.id]||{})};
  }return cfg;};
 function decorate(){const category=document.getElementById(coursesCategoryId('Autres','Restock')),root=category?.querySelector(':scope > .courses-category-products');if(!root)return;
  const items=shoppingItems(),rows=[...root.querySelectorAll('.courses-line[data-course-index]')].filter(row=>isAuto(items[Number(row.dataset.courseIndex)]));if(!rows.length)return;
  if(!root.dataset.restockStores){root.dataset.restockStores='true';const names=[...new Set(['Intermarché','Lidl','Carrefour',...rows.map(row=>habitualStore(items[Number(row.dataset.courseIndex)]))])];
   for(const store of names){const id='restock-store-'+encodeURIComponent(store),details=document.createElement('details');details.id=id;details.className='courses-restock-store';details.dataset.restockStore=store;details.open=true;const summary=document.createElement('summary');summary.textContent=store;summary.title='Personnaliser ce sous-groupe dans Personnaliser le site';details.append(summary);const products=document.createElement('div');products.id=id+'-products';products.className='courses-category-products';details.append(products);
    for(const row of rows.filter(row=>habitualStore(items[Number(row.dataset.courseIndex)])===store))products.append(row);root.append(details);
    const groupId=productPrefix+store;if(!sharedVisualGroups.some(g=>g.id===groupId))sharedVisualGroups.push({id:groupId,name:'Courses · Restock · '+store+' · Produits',selector:'#'+CSS.escape(products.id),items:':scope > .courses-line',essential:true,reorder:true});
   }
   // Keep any non-automatic legacy rows in their original Restock category.
   const legacy=sharedVisualGroups.find(g=>g.id===oldProducts);if(legacy)legacy.items=':scope > .courses-line';
   if(!sharedVisualGroups.some(g=>g.id===storesGroup))sharedVisualGroups.push({id:storesGroup,name:'Courses · Autres · Restock · Magasins',selector:'#'+CSS.escape(root.id),items:':scope > .courses-restock-store',reorder:true,essential:true});
   applySharedGroups();
  }
  const entry=sharedVisualGroups.find(g=>g.id===storesGroup),group=entry&&sharedNodes(entry),cfg=group&&sharedConfig(group),base=getComputedStyle(category.querySelector(':scope > summary'));
  root.querySelectorAll(':scope > .courses-restock-store').forEach(details=>{const summary=details.querySelector(':scope > summary'),p=cfg?.items[details.id]||{},label=p.label||details.dataset.restockStore;if(summary.textContent!==label)summary.textContent=label;
   for(const prop of ['font-family','font-size','font-weight','padding','border-bottom','background-color','color'])summary.style.setProperty(prop,base.getPropertyValue(prop));
   if(p.fontSize>0)summary.style.fontSize=p.fontSize+'px';if(p.padding!==undefined)summary.style.padding=p.padding+'px';if(p.color)summary.style.color=p.color;
   if(p.background){const rgb=[1,3,5].map(i=>parseInt(p.background.slice(i,i+2),16));summary.style.backgroundColor='rgba('+rgb.join(',')+','+(p.alpha??100)/100+')';}if(p.radius!==undefined)summary.style.borderRadius=p.radius+'px';
  });
 }
 const beforeShopping=shopping;shopping=function(){beforeShopping();decorate();};
 const beforeApply=applyVisualPreferences;applyVisualPreferences=function(){beforeApply();if(page==='Courses')decorate();};
})();
