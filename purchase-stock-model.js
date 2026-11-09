/* Recipe purchases depend on stock presence across all locations. */
(function(root){'use strict';
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/s$/,'');}
function unitOf(row){if(String(row.unit||'').trim())return row.unit;const format=String(row.format||'').trim();return /^(paquets?|litres?|bouteilles?|kgs?|kg|g|ml|cl|l|pieces?|pièces?|unites?|unités?|boites?|boîtes?|sachets?|pots?|tubes?|flacons?|conserves?)$/i.test(format)?format:'';}
function isRestock(item){return !!(item.automaticRestock||item.restockPresentation);}
function apply(data,items,week,tools){
 const family=root.BazarFamilyShopping;
 const stock=(data.inventory?.items||[]).map(row=>({
  row,
  product:family?.productFor(data,row,tools)?.id,
  ingredient:family?.ingredientName(row.name,tools),
  available:row.quantity==null||tools.amount(row.quantity)>0
 }));
 return items.filter(item=>{
  if(isRestock(item)||item.manual||item.orphan||!item.uses?.length)return true;
  if(data.shoppingCaddie?.[week]?.[item.identity]||data.shoppingExcluded?.[week]?.[item.identity])return true;
  const product=family?.productFor(data,item,tools);
  const name=family?.recipeIngredient(item,tools);
  const choice=family?.hasIngredientChoice(data,item,tools);
  const linked=new Set(item.replacementStockIds||[]);
  if(item.replacementTarget?.startsWith('stock:'))linked.add(item.replacementTarget.slice(6));
  const matches=stock.filter(entry=>linked.has(entry.row.id)||
   (product&&entry.product===product.id)||
   (!choice&&name&&entry.ingredient===name));
  if(matches.length)return !matches.some(entry=>entry.available);
  return choice||!(item.baseKeys||[item.baseKey||item.key]).some(key=>
   data.confirmedIngredients?.[key]&&data.stock?.[key]!==false);
 });
}
const api={norm,unitOf,isRestock,apply};root.BazarPurchaseStock=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
