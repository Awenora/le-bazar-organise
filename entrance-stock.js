/* Import demandé du placard d'entrée : composants Stock communs, aucun achat automatique. */
(function(root){'use strict';
const version='placard-entree-58-v1';
const shelves=[
 [
 {name:'Sauce tomate Lidl',store:'Lidl'},
 {name:'Sauce arrabbiata',aliases:['Sauce tomate Ariabatta']},
 {name:'Tomates cuisinées'},
 {name:'Sauce tomate basilic'},
 {name:'Bolognaise Intermarché — petit format',store:'Intermarché',format:'petit format'},
 {name:'Bolognaise Intermarché — grand format',store:'Intermarché',format:'grand format'},
 {name:'Concentré de tomates en tube',format:'tube',unit:'tube'},
 {name:'Marrons en conserve',aliases:['Marrons'],format:'conserve',unit:'conserve'},
 {name:'Pois chiches'},
 {name:'Champignons — boîte 1/4',format:'boîte 1/4',unit:'boîte 1/4'},
 {name:'Soupe Liebig — légumes du soleil',brand:'Liebig'}
 ],[
 {name:'Oignons frits',aliases:['Oignons crispy']},
 {name:'Chapelure Lidl',store:'Lidl'},
 {name:'Nouilles chinoises bœuf — Intermarché',aliases:['Nouilles chinoises bœuf'],store:'Intermarché'},
 {name:'Nouilles chinoises poulet'},
 {name:'Semoule grain moyen — Intermarché',store:'Intermarché'},
 {name:'Riz rond — Intermarché',store:'Intermarché'},
 {name:'Pâté'},{name:'Lasagnes'},{name:'Quinoa'},{name:'Lentilles'}
 ],[
 {name:'Vinaigrette César'},
 {name:'Vinaigrette classique — Intermarché',aliases:['Vinaigrette classique'],store:'Intermarché'},
 {name:'Huile de colza'},{name:'Vinaigre'},
 {name:"Huile d'olive — Lidl",aliases:["Huile d'olive"],store:'Lidl'},
 {name:'Sauce à emporter BBQ'},{name:'Sauce à emporter curry'},
 {name:'Mayomix — Action',store:'Action'},
 {name:'Ketchup'},{name:'Moutarde douce'},{name:'Moutarde mi-forte'},{name:"Moutarde à l'ancienne"},
 {name:'Citron'},{name:'Sauce soja salée'},
 {name:'Sauce soja sucrée — Lidl',aliases:['Sauce soja sucrée'],store:'Lidl'},
 {name:'Algues'}
 ],[
 {name:"Pom'Potes famille"},{name:"Pom'Potes Hailey"},{name:'Prince'},{name:'Délice Choc'},
 {name:'Pick Up chocolat noir — Carrefour',store:'Carrefour'},
 {name:'Pick Up chocolat au lait — Carrefour',store:'Carrefour'},
 {name:'Briquettes de jus de pomme',format:'briquette',unit:'briquette'},
 {name:'Lait de soja chocolat'},
 {name:'Jus multifruits — Carrefour',store:'Carrefour'}
 ],[
 {name:'Apéro'},{name:'Purée classique'},{name:'Muscade'},{name:'Vermicelles chinois'},
 {name:'Pains burger'},{name:'Farine complète'},
 {name:'Levure boulangère en sachets',format:'sachet',unit:'sachet'}
 ],[
 {name:'Kit burritos'},
 {name:'Wraps grand format — Lidl',store:'Lidl',format:'grand format'},
 {name:'Farine'},{name:'Sucre cristal'},{name:'Crème entière'}
 ]
];
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/œ/g,'oe').toLocaleLowerCase('fr').replace(/[’‘]/g,"'").replace(/[^a-z0-9]/g,'');
function catalogMatch(d,row){const names=[row.name,...row.aliases||[]].map(norm);const found=d.shoppingCatalog.filter(p=>names.includes(norm(p.name))&&(!row.store||!p.store||norm(p.store)===norm(row.store))&&(!row.brand||!p.brand||norm(p.brand)===norm(row.brand))&&(!row.format||norm(p.purchaseFormat)===norm(row.format)||norm(p.name)===norm(row.name)||(!p.purchaseFormat&&row.format==='conserve'&&row.aliases?.some(a=>norm(a)===norm(p.name))&&norm(p.family)==='conserves')));return found.length===1?found[0]:null;}
function apply(d){
 const state=d.familyShopping,rooms=state?.stockRooms;if(!rooms?.seededVersion||!Array.isArray(d.inventory?.items)||!Array.isArray(d.shoppingCatalog))throw Error('Le Stock doit être initialisé avant le placard.');
 state.imports??={};if(state.imports[version])return {alreadyImported:true,...state.imports[version]};
 const locations=state.locations.filter(l=>norm(l.name)===norm("Placard d'entrée"));if(locations.length>1)throw Error("Plusieurs lieux Placard d'entrée existent : aucune fusion automatique.");
 let location=locations[0];if(!location){location={id:'stock-entrance',name:"Placard d'entrée",emoji:''};if(state.locations.some(l=>l.id===location.id))throw Error('Identifiant du lieu déjà utilisé');state.locations.push(location);}
 let added=0,reused=0,stockAdded=0;const entries=[];
 d.visualPreferences??={};d.visualPreferences.stockRoomTables??={view:{},modes:{desktop:{},mobile:{}}};const prefs=d.visualPreferences.stockRoomTables;prefs.modes??={};prefs.modes.desktop??={};prefs.modes.mobile??={};
 const reference=prefs.modes.desktop['utility-tins']||{},appearance={};for(const k of ['fontFamily','fontSize','fontWeight','padding','color','background','alpha','borderColor','borderWidth','radius','titleSize','titleColor','titleWeight','rowSpace','rowHeight','lineColor','quantityWidth','formatWidth','buyWidth','headerWeight','headerSize','separators','separatorColor','stripeOdd','stripeEven'])if(reference[k]!==undefined)appearance[k]=reference[k];
 shelves.forEach((rows,index)=>{
  const name='Étagère '+(index+1),matches=rooms.tables.filter(t=>!t.deletedAt&&t.locationId===location.id&&norm(t.name)===norm(name));if(matches.length>1)throw Error('Étagère ambiguë : '+name);
  let table=matches[0];if(!table){table={id:'entrance-shelf-'+(index+1),name,locationId:location.id,emoji:'',column:Math.floor(index/2),order:index%2};if(rooms.tables.some(t=>t.id===table.id))throw Error('Identifiant de tableau déjà utilisé');rooms.tables.push(table);prefs.modes.desktop[table.id]={...appearance};}
  rows.forEach((row,position)=>{
   const seedKey=(index+1)+'-'+(position+1);let product=catalogMatch(d,row);
   if(product)reused++;else{const id='entrance-product-'+seedKey;if(d.shoppingCatalog.some(p=>p.id===id))throw Error('Identifiant de produit déjà utilisé');product={id,name:row.name,brand:row.brand||'',purchaseFormat:row.format||'',store:row.store||'',storeConfirmed:!!row.store,family:'Sans catégorie',aliases:'',notes:''};d.shoppingCatalog.push(product);added++;}
   const existing=d.inventory.items.filter(i=>i.tableId===table.id&&(i.catalogId===product.id||(!i.catalogId&&norm(i.name)===norm(row.name))));if(existing.length>1)throw Error('Stock ambigu : '+row.name);
   let item=existing[0];if(!item){let category=d.inventory.categories.find(c=>c.name===product.family);if(!category){category={id:'entrance-stock-category-'+norm(product.family),name:product.family};if(d.inventory.categories.some(c=>c.id===category.id))throw Error('Identifiant catégorie déjà utilisé');d.inventory.categories.push(category);}
    item={id:'entrance-stock-'+seedKey,key:'entrance-ingredient-'+seedKey,name:row.name,catalogId:product.id,brand:row.brand||product.brand||'',format:row.format||product.purchaseFormat||'',quantity:1,unit:row.unit||'',categoryId:category.id,locationId:location.id,tableId:table.id,links:[],legacyKeys:[]};if(d.inventory.items.some(i=>i.id===item.id))throw Error('Identifiant stock déjà utilisé');d.inventory.items.push(item);stockAdded++;
   }
   entries.push({seedKey,tableId:table.id,catalogId:product.id,itemId:item.id});
  });
 });
 const audit={locationId:location.id,addedCatalog:added,reusedCatalog:reused,addedStock:stockAdded,entries,at:new Date().toISOString()};state.imports[version]=audit;return audit;
}
const api={version,shelves,apply,catalogMatch};root.BazarEntranceStock=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
if(typeof window!=='undefined'&&typeof familyCommit==='function'&&!data.familyShopping?.imports?.[BazarEntranceStock.version]){
 familyCommit(()=>{stockRoomState();BazarEntranceStock.apply(data);},false);
}
