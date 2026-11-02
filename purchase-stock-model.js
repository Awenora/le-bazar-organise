/* Read-only availability for recognised products. No packaging or raw/cooked equivalence. */
(function(root){'use strict';
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/s$/,'');}
function unitOf(row){if(String(row.unit||'').trim())return row.unit;const format=String(row.format||'').trim();return /^(paquets?|litres?|bouteilles?|kgs?|kg|g|ml|cl|l|pieces?|pièces?|unites?|unités?|boites?|boîtes?|sachets?|pots?|tubes?|flacons?|conserves?)$/i.test(format)?format:'';}
function isRestock(item){return !!(item.automaticRestock||item.restockPresentation);}
function apply(data,items,week,tools){const budgets=new Map(),byProduct=new Map();for(const row of data.inventory?.items||[]){const id=root.BazarFamilyShopping?.productFor(data,row,tools)?.id;if(id){if(!byProduct.has(id))byProduct.set(id,[]);byProduct.get(id).push(row);}}return items.flatMap(item=>{
 if(isRestock(item)||item.manual||item.orphan||!item.uses?.length)return [item];
 const p=root.BazarFamilyShopping?.productFor(data,item,tools);if(!p)return [item];
 const stocks=byProduct.get(p.id)||[];if(!stocks.length)return [item];
 const manual=item.buyManual||item.adjustment;if(manual?.stockPurchaseOverride)return [item];
 const quantity=manual?.quantity??item.recipeRequired??item.required,unit=manual?.unit||item.recipeUnit||item.unit||'';
 const issue=reason=>[{...item,stockIssue:p.name+' : '+reason}];
 if(!Number.isFinite(quantity)||!unit)return issue('besoin sans quantité ou unité comparable ; préciser la quantité d’achat et son unité.');
 if(stocks.some(s=>!Number.isFinite(s.quantity)))return issue('quantité en Stock inconnue ; aucun calcul inventé.');
 const stockUnits=stocks.map(unitOf);if(stockUnits.some(u=>!u))return issue('unité du Stock non renseignée.');
 const converted=stocks.map((s,i)=>tools.quantityIn({quantity:s.quantity,unit:stockUnits[i]},unit));
 if(converted.some(n=>n===null))return issue('unités incompatibles : Stock ('+[...new Set(stockUnits)].join(', ')+') / achat ('+unit+'). Aucune équivalence supposée.');
 const displayUnit=item.purchaseDisplay?.unit;if(!manual&&displayUnit&&tools.quantityIn({quantity:quantity,unit},displayUnit)===null)return issue('le besoin et le conditionnement d’achat ne sont pas comparables sans choix explicite.');
 const [dimension,factor]=tools.unitInfo(unit),key=p.id+'|'+dimension;
 if(!budgets.has(key))budgets.set(key,converted.reduce((a,b)=>a+b,0)*factor);
 const available=budgets.get(key)/factor,used=Math.min(quantity,available),missing=Math.max(0,Math.round((quantity-used)*1e8)/1e8);budgets.set(key,Math.max(0,(available-used)*factor));
 const closed=data.shoppingCaddie?.[week]?.[item.identity]||data.shoppingExcluded?.[week]?.[item.identity];if(closed)return [item];
 if(missing===0)return [];
 const shown=displayUnit&&displayUnit!==unit?tools.quantityIn({quantity:missing,unit},displayUnit):missing;
 return [{...item,purchase:shown,stockCoverage:{target:quantity,unit,available,used,missing},...(item.purchaseDisplay?{purchaseDisplay:{...item.purchaseDisplay,quantity:shown}}:{})}];
 });}
const api={norm,unitOf,isRestock,apply};root.BazarPurchaseStock=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
