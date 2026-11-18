/* Checking selects purchases; checkout records their arrival in the inventory. */
(function(root){'use strict';
function receipt(d,wk,item){return d.shoppingStockReceipts?.[wk]?.[item.identity];}
function listed(d,wk,items){return items.filter(i=>!d.shoppingExcluded?.[wk]?.[i.identity]);}
function pending(d,wk,items){return listed(d,wk,items).filter(i=>!receipt(d,wk,i)?.finalized);}
function matches(d,item){
 const product=root.BazarFamilyShopping.productFor(d,item);
 const linked=new Set(item.replacementStockIds||[]);
 if(item.replacementTarget?.startsWith('stock:'))linked.add(item.replacementTarget.slice(6));
 return (d.inventory?.items||[]).filter(row=>linked.has(row.id)||(product?
  root.BazarFamilyShopping.productFor(d,row)?.id===product.id:
  root.BazarStockRooms.key(row.name)===root.BazarStockRooms.key(item.name)));
}
function defaults(d,item,row){
 const unit=row?(root.BazarPurchaseStock.unitOf(row)||item.purchaseDisplay?.unit||item.unit||''):(item.purchaseDisplay?.unit||item.unit||'');
 const quantity=item.purchaseDisplay?.quantity??item.purchase;
 const from=item.purchaseDisplay?.unit||item.unit;
 const converted=row?root.BazarCoursesOrganisation.convert(quantity,from,unit,root.BazarFamilyShopping.productFor(d,item),row):quantity;
 return {unit,quantity:Number.isFinite(converted)&&converted>0?converted:null};
}
function validate(d,wk,items,choices){
 const all=listed(d,wk,items);
 if(!all.length||all.some(i=>!d.shoppingCaddie?.[wk]?.[i.identity]))throw Error('Coche tous les articles avant de valider ton caddie.');
 const tables=d.familyShopping?.stockRooms?.tables||[];
 const todo=pending(d,wk,all);
 const plans=todo.map(item=>{
  const prior=receipt(d,wk,item);
  if(prior?.applied)return {item,prior}; // Purchases recorded by the previous version.
  const choice=choices[item.identity];
  if(!choice)throw Error('Précise le rangement et la quantité de '+item.name+'.');
  const row=choice.stockId?(d.inventory?.items||[]).find(r=>r.id===choice.stockId):null;
  if(choice.stockId&&!row)throw Error('Ce produit a été retiré du Stock. Rouvre ton caddie.');
  const table=tables.find(t=>t.id===(row?.tableId||choice.tableId)&&!t.deletedAt);
  if(!table)throw Error('Choisis un tableau de rangement pour '+item.name+'.');
  const unit=String(choice.unit||'').trim(),quantity=choice.quantity;
  if(!Number.isFinite(quantity)||quantity<=0||!unit)throw Error('Précise la quantité achetée et son unité pour '+item.name+'.');
  const stockUnit=row&&root.BazarPurchaseStock.unitOf(row);
  if(stockUnit&&root.BazarAutomaticRestock.norm(stockUnit)!==root.BazarAutomaticRestock.norm(unit))throw Error('Exprime la quantité de '+item.name+' dans l’unité du Stock : '+stockUnit+'.');
  const current=row?(Number.isFinite(row.quantity)?row.quantity:choice.current):0;
  if(!Number.isFinite(current)||current<0)throw Error('Précise le stock actuel de '+item.name+' avant cet achat.');
  return {item,prior,row,table,unit,quantity,current};
 });
 // Validate every line before changing any quantity.
 for(const plan of plans){
  const {item,prior,table,unit,quantity,current}=plan;
  d.shoppingStockReceipts??={};d.shoppingStockReceipts[wk]??={};
  if(prior?.applied){prior.finalized=true;continue;}
  let row=plan.row;
  if(!row){
   const category=d.inventory.categories.find(c=>root.BazarStockRooms.key(c.name)===root.BazarStockRooms.key(item.family||''))||d.inventory.categories[0];
   row={id:root.BazarStockRooms.uid('stock'),key:root.BazarStockRooms.uid('ingredient'),name:item.name,
    categoryId:category?.id,tableId:table.id,locationId:table.locationId,quantity:0,unit,format:'',legacyKeys:[],links:[]};
   const product=root.BazarFamilyShopping.productFor(d,item);if(product)row.catalogId=product.id;
   d.inventory.items.push(row);
  }
  // Several purchase lines may legitimately feed the same inventory row.
  row.quantity=(Number.isFinite(row.quantity)?row.quantity:current)+quantity;
  if(!root.BazarPurchaseStock.unitOf(row))row.unit=unit;
  d.shoppingStockReceipts[wk][item.identity]={...prior,applied:true,finalized:true,stockId:row.id,quantity,unit};
 }
 return plans.length;
}
const api={receipt,listed,pending,matches,defaults,validate};
root.BazarCourseCheckout=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
