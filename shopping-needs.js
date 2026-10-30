/* Read-only planning calculation. Recipe quantities already describe recipe.portions. */
(function(root){'use strict';
function collect(data,start,end,tools){
 const rows=new Map(),recipes=new Map((data.recipes||[]).map(r=>[r.id,r]));
 for(const [date,slots] of Object.entries(data.plans||{})){
  if(date<start||date>end)continue;
  for(const [slot,meal] of Object.entries(slots)){
   if(!['midi','soir'].includes(slot))continue;
   const r=recipes.get(meal?.recipeId);if(!r)continue;
   for(const text of r.ingredients||[]){
    const key=tools.key(text);
    const mealRule=meal.ingredientReplacements?.[key],replacementRule=mealRule===undefined?root.BazarIngredientReplacements?.find(data,r.id,text,tools)?.rule:mealRule;
    if(replacementRule?.kind==='home')continue;
    if(data.confirmedIngredients?.[key]&&data.stock?.[key]!==false&&(!replacementRule||replacementRule.disabled))continue;
    const p=tools.parseIngredient(text);
    const reference=Number(r.portions),selected=Number(meal.portions),portions=Number.isFinite(selected)&&selected>0?selected:reference,quantity=p.quantity===null?null:Number.isFinite(reference)&&reference>0&&Number.isFinite(portions)&&portions>0?p.quantity*portions/reference:p.quantity;
    const replacement=root.BazarIngredientReplacements?.apply(data,r.id,text,quantity,p.unit,tools,mealRule);
    const mapped=replacement&&!replacement.issue;
    const actualText=mapped?replacement.quantity+' '+replacement.unit+' '+replacement.name:text;
    const actualKey=mapped?key+'::produit:'+replacement.targetKey:replacement?.issue?key+'::a-verifier:'+r.id:key;
    if(!rows.has(actualKey))rows.set(actualKey,{key:actualKey,baseKey:key,text:actualText,uses:[],...(mapped?{replacementTarget:replacement.targetKey,replacementName:replacement.name,replacementStockIds:replacement.stockIds,replacementPurchasePack:replacement.purchasePack,replacementPurchaseUnit:replacement.purchaseUnit,replacementPurchaseFormat:replacement.purchaseFormat,replacementBrand:replacement.brand,replacementStore:replacement.store,replacementFamily:replacement.family}:{}),...(replacement?.issue?{replacementIssue:replacement.issue}:{})});
    rows.get(actualKey).uses.push({date,slot,name:r.name,recipeId:r.id,portions,referencePortions:r.portions,text:actualText,originalText:text,purchaseCount:mapped?replacement.purchaseCount:null,quantity:mapped?replacement.quantity:quantity,unit:mapped?replacement.unit:p.unit});
   }
  }
 }
 for(const row of data.manualShopping||[]){
  if(row.shoppingWeek&&row.shoppingWeek!==start)continue;
  if(data.confirmedIngredients?.[row.key]&&data.stock?.[row.key]!==false)continue;
  // A deliberately added purchase remains separate from the calculated recipe need.
  if(!rows.has(row.key))rows.set(row.key,{...row,uses:[],manual:true});
 }
 return [...rows.values()];
}
function aggregate(rows,{tools,storeOf,familyOf}){
 const groups=new Map();
 for(const item of rows){
  const p=tools.parseIngredient(item.text),dimension=tools.unitInfo(p.unit)[0];
  const product=item.replacementTarget?'replacement:'+item.replacementTarget+'|'+dimension:item.replacementIssue?'uncertain:'+item.key:p.quantity===null?'text:'+tools.key(item.text):p.normalized+'|'+dimension;
  const store=storeOf(item),family=familyOf(item);
  const identity=JSON.stringify([item.manual?'manual:'+item.key:product,store,family]);
  if(!groups.has(identity))groups.set(identity,{...item,identity,product,store,family,name:p.name,unit:p.unit,required:0,known:p.quantity!==null,uses:[],sourceKeys:[],baseKeys:[],texts:[]});
  const g=groups.get(identity);g.sourceKeys.push(item.key);g.baseKeys.push(item.baseKey||item.key);g.texts.push(item.text);
  if(item.replacementStockIds)g.replacementStockIds=[...new Set([...(g.replacementStockIds||[]),...item.replacementStockIds])];
  const uses=item.uses||[];
  const contributions=uses.length?uses.map(u=>({...tools.parseIngredient(u.text||item.text),quantity:u.quantity??tools.parseIngredient(u.text||item.text).quantity,unit:u.unit||p.unit})):[p];
  for(const c of contributions){const q=tools.quantityIn({quantity:c.quantity,unit:c.unit},g.unit);if(q===null)g.known=false;else g.required+=q;}
  for(const u of uses){if(!g.uses.some(v=>v.date===u.date&&v.slot===u.slot&&v.recipeId===u.recipeId&&v.name===u.name&&v.originalText===u.originalText))g.uses.push(u);}
 }
 return [...groups.values()].map(g=>({...g,required:g.known?Math.round(g.required*1e8)/1e8:null,sourceKeys:[...new Set(g.sourceKeys)],baseKeys:[...new Set(g.baseKeys)]}));
}
function quantity(g,value=g.required){let unit=g.unit;if(value!==1&&['pièce','gousse','tranche','brique','boîte','sachet','pot','bouteille','paquet'].includes(unit))unit+='s';return value===null?'Quantité non précisée':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:8}).format(value)+(unit?' '+unit:'');}
const api={collect,aggregate,quantity};root.BazarShoppingNeeds=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
