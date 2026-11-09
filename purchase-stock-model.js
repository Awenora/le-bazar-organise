/* Recipe purchases depend on stock presence across all locations. */
(function(root){'use strict';
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/s$/,'');}
function unitOf(row){if(String(row.unit||'').trim())return row.unit;const format=String(row.format||'').trim();return /^(paquets?|litres?|bouteilles?|kgs?|kg|g|ml|cl|l|pieces?|pièces?|unites?|unités?|boites?|boîtes?|sachets?|pots?|tubes?|flacons?|conserves?)$/i.test(format)?format:'';}
function isRestock(item){return !!(item.automaticRestock||item.restockPresentation);}
function apply(data,items,week,tools){
 const family=root.BazarFamilyShopping;
 const shouldCheck=item=>!isRestock(item)&&!item.manual&&!item.orphan&&item.uses?.length&&
  !data.shoppingCaddie?.[week]?.[item.identity]&&!data.shoppingExcluded?.[week]?.[item.identity];
 if(!items.some(shouldCheck))return items;
 const byId=new Map(),byProduct=new Map(),byIngredient=new Map();
 function record(index,key,available){
  if(key)index.set(key,available||index.get(key)||false);
 }
 for(const row of data.inventory?.items||[]){
  const available=row.quantity==null||tools.amount(row.quantity)>0;
  record(byId,row.id,available);
  record(byProduct,family?.productFor(data,row,tools)?.id,available);
  record(byIngredient,family?.ingredientName(row.name,tools),available);
 }
 return items.filter(item=>{
  if(!shouldCheck(item))return true;
  const product=family?.productFor(data,item,tools);
  const choice=family?.hasIngredientChoice(data,item,tools);
  const linked=new Set(item.replacementStockIds||[]);
  if(item.replacementTarget?.startsWith('stock:'))linked.add(item.replacementTarget.slice(6));
  const matches=[...linked].map(id=>byId.get(id));
  if(product)matches.push(byProduct.get(product.id));
  if(!choice)matches.push(byIngredient.get(family?.recipeIngredient(item,tools)));
  if(matches.some(available=>available!==undefined))return !matches.includes(true);
  return choice||!(item.baseKeys||[item.baseKey||item.key]).some(key=>
   data.confirmedIngredients?.[key]&&data.stock?.[key]!==false);
 });
}
const api={norm,unitOf,isRestock,apply};root.BazarPurchaseStock=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
