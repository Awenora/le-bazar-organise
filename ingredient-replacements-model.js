/* Explicit purchased product choices. Never changes recipes, inventory or guessed names. */
(function(root){'use strict';
function sourceKey(text,tools){return tools.key(text);}
function habitualKey(text,tools){return tools.parseIngredient(text).normalized;}
function find(data,recipeId,text,tools){const cfg=data.ingredientReplacements||{},local=cfg.recipes?.[recipeId];const key=sourceKey(text,tools);return local&&Object.hasOwn(local,key)?{rule:local[key],scope:'recipe'}:{rule:cfg.habitual?.[habitualKey(text,tools)],scope:'habitual'};}
function product(data,target){if(target?.type==='stock')return (data.inventory?.items||[]).find(p=>p.id===target.id);if(target?.type==='catalog')return (data.shoppingCatalog||[]).find(p=>p.id===target.id);return null;}
function validate(data,rule,tools){if(!rule||rule.disabled||rule.kind==='home')return null;if(!product(data,rule.target))return 'Choisis un produit.';if(rule.purchaseCount!==undefined&&(!Number.isFinite(rule.purchaseCount)||rule.purchaseCount<0))return 'Indique une quantité positive ou zéro.';return null;}
function apply(data,recipeId,text,quantity,unit,tools,override){const found=override!==undefined?{rule:override,scope:'meal'}:find(data,recipeId,text,tools),rule=found.rule;if(!rule||rule.disabled)return null;const issue=validate(data,rule,tools);if(issue)return {issue};const p=product(data,rule.target),route=data.shoppingProductRoutes?.[rule.target.type+':'+rule.target.id];return {rule,scope:found.scope,quantity,unit,name:p.name,targetKey:rule.target.type+':'+rule.target.id,store:route?.store||rule.store,family:route?.family||rule.family,purchasePack:p.purchasePack||rule.purchasePack,purchaseUnit:p.purchaseUnit||rule.purchaseUnit||'pièce',purchaseFormat:p.purchaseFormat||rule.purchaseFormat,brand:rule.purchaseBrand??p.brand,purchaseCount:rule.kind==='purchase-choice'?rule.purchaseCount:null,stockIds:rule.target.type==='stock'?[rule.target.id]:(p.stockIds||[])};}
function put(data,recipeId,text,scope,rule,tools){const error=validate(data,rule,tools);if(error)throw Error(error);if(!['recipe','habitual'].includes(scope))throw Error('Choisis la portée de cette correspondance.');data.ingredientReplacements??={version:1,recipes:{},habitual:{}};const cfg=data.ingredientReplacements;cfg.recipes??={};cfg.habitual??={};if(scope==='recipe'){if(!recipeId)throw Error('Recette introuvable.');cfg.recipes[recipeId]??={};cfg.recipes[recipeId][sourceKey(text,tools)]=structuredClone(rule);}else cfg.habitual[habitualKey(text,tools)]=structuredClone(rule);}
function remove(data,recipeId,text,scope,tools){const cfg=data.ingredientReplacements;if(!cfg)return;if(scope==='recipe')delete cfg.recipes?.[recipeId]?.[sourceKey(text,tools)];else if(scope==='habitual')delete cfg.habitual?.[habitualKey(text,tools)];}
/* Allocate available quantity once across all needs for the same explicitly linked product.
   A manual purchase choice is never overwritten. Incompatible quantities stay visible. */
function stockRemainders(data,rows,tools){
 const budgets=new Map();
 return rows.map(row=>{
  const ids=row.replacementStockIds;
  if(row.replacementTarget||!Array.isArray(ids)||!ids.length||row.manual||!row.known||row.replacementIssue)return row;
  const candidates=[];
  for(const id of new Set(ids)){
   const item=(data.inventory?.items||[]).find(i=>i.id===id);
   if(!item)return {...row,stockUncertain:true};
   const quantity=tools.amount(item.quantity),measure=data.inventory?.unitModel===2&&item.packSize?{quantity:quantity===null?null:quantity*item.packSize.quantity,unit:item.packSize.unit}:item;
   if(tools.quantityIn(measure,row.unit)===null)return {...row,stockUncertain:true};
   if(!budgets.has(id))budgets.set(id,{quantity:tools.amount(measure.quantity),unit:measure.unit});
   candidates.push(budgets.get(id));
  }
  let remaining=row.required,used=0;
  for(const b of candidates){const available=tools.quantityIn(b,row.unit),take=Math.min(remaining,Math.max(0,available));remaining-=take;used+=take;b.quantity-=tools.quantityIn({quantity:take,unit:row.unit},b.unit)||0;}
  const manual=!!row.adjustment||!!row.buyManual;
  return {...row,stockAvailable:used,stockRemainder:Math.max(0,remaining),purchase:manual?row.purchase:Math.max(0,remaining)};
 });
}
function purchaseRows(data,rows,week,tools){return rows.map(row=>{
 if(!row.replacementTarget||row.replacementIssue)return row;
 const cut=row.replacementTarget.indexOf(':'),target={type:row.replacementTarget.slice(0,cut),id:row.replacementTarget.slice(cut+1)},actual=product(data,target);if(!actual)return row;
 const pack=actual.purchasePack||row.replacementPurchasePack,purchaseUnit=actual.purchaseUnit||row.replacementPurchaseUnit||'pièce',format=pack?quantityText(pack.quantity,pack.unit):actual.purchaseFormat||row.replacementPurchaseFormat||'',p={...actual,brand:row.replacementBrand??actual.brand,purchasePack:pack,purchaseUnit,purchaseFormat:format},buyKey=row.identity+'|'+p.id,manual=data.shoppingBuyQuantities?.[week]?.[buyKey];
 const counts=(row.uses||[]).map(u=>u.purchaseCount),chosen=counts.length&&counts.every(n=>Number.isFinite(n))?counts.reduce((a,b)=>a+b,0):null;
 return {...row,name:actual.name,habitualProduct:p,buyKey,buyManual:manual||null,adjustment:manual||row.adjustment,recipeRequired:row.required,recipeUnit:row.unit,conversionNeeded:false,needChanged:!!manual&&manual.needAtEdit!==row.required,purchaseDisplay:{quantity:manual?.quantity??chosen,unit:manual?.unit||purchaseUnit,format,brand:row.replacementBrand??actual.brand??''}};
 });}
function quantityText(quantity,unit){return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:4}).format(quantity)+' '+unit;}
const api={sourceKey,habitualKey,find,product,validate,apply,put,remove,stockRemainders,purchaseRows};root.BazarIngredientReplacements=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
