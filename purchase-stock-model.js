/* Read-only availability for recognised products. Packaging is used only when explicitly recorded. */
(function(root){'use strict';
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/s$/,'');}
function unitOf(row){if(String(row.unit||'').trim())return row.unit;const format=String(row.format||'').trim();return /^(paquets?|litres?|bouteilles?|kgs?|kg|g|ml|cl|l|pieces?|pièces?|unites?|unités?|boites?|boîtes?|sachets?|pots?|tubes?|flacons?|conserves?)$/i.test(format)?format:'';}
function isRestock(item){return !!(item.automaticRestock||item.restockPresentation);}
function apply(data,items,week,tools){const budgets=new Map(),byProduct=new Map();for(const row of data.inventory?.items||[]){const id=root.BazarFamilyShopping?.productFor(data,row,tools)?.id;if(id){if(!byProduct.has(id))byProduct.set(id,[]);byProduct.get(id).push(row);}}return items.flatMap(item=>{
 if(isRestock(item)||item.manual||item.orphan||!item.uses?.length)return [item];
 const p=root.BazarFamilyShopping?.productFor(data,item,tools);if(!p)return [item];
 const model=root.BazarCoursesOrganisation;
 const displayUnit=model?.purchaseUnit?.(p)||p.purchaseUnit||item.purchaseDisplay?.unit;
 const stocks=byProduct.get(p.id)||[];if(!stocks.length&&!model?.purchaseUnit?.(p))return [item];
 const manual=item.buyManual||item.adjustment;if(manual?.stockPurchaseOverride||item.buyManual)return [item];
 const quantity=manual?.quantity??item.recipeRequired??item.required,unit=manual?.unit||item.recipeUnit||item.unit||'';
 const issue=reason=>[{...item,stockIssue:p.name+' : '+reason}];
 if(!Number.isFinite(quantity)||!unit)return issue('besoin sans quantité ou unité comparable ; préciser la quantité d’achat et son unité.');
 const stockUnits=stocks.map(unitOf);
 const converted=stocks.map((s,i)=>s.quantity===0?0:!Number.isFinite(s.quantity)||!stockUnits[i]?null:
  model?model.convert(s.quantity,stockUnits[i],unit,p,s,tools):tools.quantityIn({quantity:s.quantity,unit:stockUnits[i]},unit));
 const [dimension,factor]=tools.unitInfo(unit),key=p.id+'|'+dimension;
 if(!budgets.has(key))budgets.set(key,converted.reduce((a,b)=>a+(b??0),0)*factor);
 const available=budgets.get(key)/factor,used=Math.min(quantity,available),missing=Math.max(0,Math.round((quantity-used)*1e8)/1e8);
 const closed=data.shoppingCaddie?.[week]?.[item.identity]||data.shoppingExcluded?.[week]?.[item.identity];
 if(closed)return [item];
 // Known stock can cover the recipe even when another row has unknown contents.
 budgets.set(key,Math.max(0,(available-used)*factor));
 if(missing===0)return [];
 if(stocks.some(s=>!Number.isFinite(s.quantity)))return issue('quantité en Stock inconnue.');
 if(stockUnits.some((u,i)=>!u&&stocks[i].quantity!==0))return issue('unité du Stock non renseignée.');
 if(converted.some(n=>n===null))return issue('unités incompatibles : Stock ('+[...new Set(stockUnits)].join(', ')+') / recette ('+unit+').');
 const convert=q=>model?model.convert(q,unit,displayUnit,p,null,tools):tools.quantityIn({quantity:q,unit},displayUnit);
 const convertedMissing=displayUnit&&displayUnit!==unit?convert(missing):missing;
 if(convertedMissing===null)return issue('conditionnement à préciser.');
 const shown=displayUnit&&model?.size(p)&&tools.unitInfo(unit)[0]!==tools.unitInfo(displayUnit)[0]&&!['mass','volume'].includes(tools.unitInfo(displayUnit)[0])?Math.ceil(convertedMissing-1e-8):convertedMissing;
 return [{...item,purchase:shown,stockCoverage:{target:quantity,unit,available,used,missing},...(displayUnit?{purchaseDisplay:{...item.purchaseDisplay,quantity:shown,unit:displayUnit}}:{})}];
 });}
const api={norm,unitOf,isRestock,apply};root.BazarPurchaseStock=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
