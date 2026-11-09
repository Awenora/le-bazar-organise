/* Courses-only presentation and explicit packaging. Never rewrites stored categories. */
(function(root){'use strict';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/œ/g,'oe').replace(/[^a-z0-9]+/g,' ').trim();
const groups={Viandes:['viande','viandes','boucherie'],'Fruits et légumes':['fruits','legumes','fruits et legumes'],'Boulangerie et viennoiseries':['boulangerie','viennoiserie','viennoiseries'],Fromages:['fromage','fromages'],'Crèmerie':['cremerie','produits laitiers'],Surgelés:['surgele','surgeles'],'Épicerie salée':['epicerie salee'],'Petit déjeuner':['petit dej','petit dejeuner'],Goûter:['gouter'],Pâtisserie:['patisserie'],Apéritif:['apperitif','aperitif'],'Épicerie du monde':['epicerie monde','epicerie du monde']};
function family(v){const key=norm(v);return Object.keys(groups).find(k=>groups[k].includes(key))||String(v||'Sans catégorie').trim();}
function families(d,store){return [...new Set([...(d.shoppingCategories?.[store]||[]),...(d.shoppingRouting?.families||[]),...(d.shoppingCatalog||[]).filter(p=>!store||p.store===store).map(p=>p.family),...Object.values(d.productFamilies||{})].filter(Boolean).map(family))].sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base',numeric:true}));}
function addFamily(d,store,name){if(!String(name||'').trim())throw Error('Indique un nom de rayon.');name=family(name);if(!name||norm(name)==='sans categorie')throw Error('Indique un nom de rayon.');const existing=families(d).find(v=>norm(v)===norm(name));name=existing||name;d.shoppingCategories??={};d.shoppingCategories[store]??=[];if(!d.shoppingCategories[store].some(v=>norm(family(v))===norm(name)))d.shoppingCategories[store].push(name);return name;}
function purchaseUnit(p){return p?.purchaseUnit||'';}
function container(unit){return norm(unit).replace(/s$/,'');}
function formatSize(format){
 const match=String(format||'').trim().match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)$/i);
 return match?{quantity:Number(match[1].replace(',','.')),unit:match[2]}:null;
}
function size(p,row){
 const unit=purchaseUnit(p)||p?.restock?.unit;
 const sameContainer=!row||container(row.unit||row.format)===container(unit);
 const candidates=[row?.packSize,formatSize(row?.format)];
 if(sameContainer){
  candidates.push(p?.purchasePack,formatSize(p?.purchaseFormat));
 }
 return candidates.find(v=>v&&Number.isFinite(v.quantity)&&v.quantity>0&&/^(kg|g|ml|cl|l)$/i.test(v.unit));
}
function count(unit){return /^(paquets?|bo[iî]tes?|bouteilles?|sachets?|pots?|barquettes?|briques?|flacons?|tubes?)$/i.test(String(unit||'').trim());}
function convert(q,from,to,p,row,tools=root.BazarStockTools){
 if(!Number.isFinite(q)||!from||!to)return null;
 const direct=tools.quantityIn({quantity:q,unit:from},to);
 if(direct!==null)return direct;
 const pack=size(p,row);
 if(!pack)return null;
 const samePack=unit=>count(unit)&&container(unit)===container(row?(row.unit||row.format):(purchaseUnit(p)||p?.restock?.unit));
 if(samePack(from))return tools.quantityIn({quantity:q*pack.quantity,unit:pack.unit},to);
 if(samePack(to)){const amount=tools.quantityIn({quantity:q,unit:from},pack.unit);return amount===null?null:amount/pack.quantity;}return null;}
function classify(d,item,week,store,rayon,remember=false){if(!['Lidl','Intermarché','Autres','Carrefour'].includes(store))throw Error('Choisis un magasin.');const p=root.BazarFamilyShopping.productFor(d,item);if(remember&&!p&&!item.oneOff)throw Error('Associe d’abord cet ingrédient à un produit pour mémoriser son classement.');rayon=family(rayon||'Sans catégorie');d.shoppingWeeklyDestinations??={};d.shoppingWeeklyDestinations[week]??={};d.shoppingWeeklyDestinations[week][item.identity]={store,family:rayon};if(remember&&p&&!item.oneOff){d.shoppingProductRoutes??={};d.shoppingProductRoutes['catalog:'+p.id]={...d.shoppingProductRoutes['catalog:'+p.id],store,family:rayon,confirmed:true};}if(remember&&item.oneOff){rememberOccasional(d,item.name,store,rayon);}return {store,family:rayon};}
function rememberOccasional(d,name,store,rayon){d.shoppingOccasionalProducts??={};const key=norm(name);if(!key)throw Error('Indique un produit.');d.shoppingOccasionalProducts[key]={name:name.trim(),store,family:family(rayon)};}
function coordinate(d,items,week,tools=root.BazarStockTools){const result=[...items],closed=i=>d.shoppingCaddie?.[week]?.[i.identity]||d.shoppingExcluded?.[week]?.[i.identity];for(const auto of result.filter(i=>i.automaticRestock&&!closed(i))){const p=root.BazarFamilyShopping.productFor(d,auto,tools);if(!p)continue;const matches=result.filter(i=>i!==auto&&!i.automaticRestock&&!i.manual&&!closed(i)&&i.uses?.length&&!d.shoppingWeeklyDestinations?.[week]?.[i.identity]&&root.BazarFamilyShopping.productFor(d,i,tools)?.id===p.id);if(!matches.length||matches.some(i=>i.stockIssue))continue;const unit=auto.purchaseDisplay?.unit||auto.unit,base=auto.purchaseDisplay?.quantity??auto.purchase;if(!Number.isFinite(base)||auto.stockIssue)continue;const quantities=matches.map(i=>convert(i.purchaseDisplay?.quantity??i.purchase,i.purchaseDisplay?.unit||i.unit,unit,p,null,tools));if(quantities.some(q=>q===null))continue;/* Explicit manual purchase quantities stay separate, never silently increased. */
 if(matches.some(i=>i.buyManual||i.adjustment))continue;
 const total=quantities.reduce((a,b)=>a+b,0),manual=auto.adjustment?.stockPurchaseOverride||auto.buyManual;if(manual&&base<total)continue;
 const quantity=manual?base:Math.max(base,count(unit)?Math.ceil(total-1e-8):Math.round(total*1e8)/1e8),index=result.indexOf(auto);result[index]={...auto,purchase:quantity,purchaseDisplay:{...(auto.purchaseDisplay||{}),quantity,unit},uses:[...(auto.uses||[]),...matches.flatMap(i=>i.uses||[])],coordinatedIds:matches.map(i=>i.identity),coordinatedSources:matches.map(i=>({identity:i.identity,uses:i.uses,quantity:i.purchase,unit:i.unit})),purchaseOrigins:['Restock','Recettes']};for(const match of matches)result.splice(result.indexOf(match),1);
 }return result;}
const api={norm,family,families,addFamily,purchaseUnit,size,convert,classify,rememberOccasional,coordinate};root.BazarCoursesOrganisation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
