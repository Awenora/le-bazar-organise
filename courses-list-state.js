(function(root){'use strict';
function weekState(data,week){return {checked:data.shoppingCaddie?.[week]||{},excluded:data.shoppingExcluded?.[week]||{}};}
function setChecked(data,week,item,yes){
 data.shoppingCaddie??={};data.shoppingCaddie[week]??={};
 const was=!!data.shoppingCaddie[week][item.identity];if(!!yes===was)return;
 const previousReceipt=data.shoppingStockReceipts?.[week]?.[item.identity];
 if(yes){
  data.shoppingCaddie[week][item.identity]=true;
  data.shoppingStockReceipts??={};data.shoppingStockReceipts[week]??={};
  const receipt=previousReceipt?.finalized?previousReceipt:{applied:false};
  if(item.coordinatedIds?.length){
   receipt.coordinatedIds=item.coordinatedIds;data.shoppingExcluded??={};data.shoppingExcluded[week]??={};
   for(const id of item.coordinatedIds)data.shoppingExcluded[week][id]={reason:'covered',by:item.identity};
  }
  data.shoppingStockReceipts[week][item.identity]=receipt;
 }else{
  delete data.shoppingCaddie[week][item.identity];
  const target=(data.inventory?.items||[]).find(i=>i.id===previousReceipt?.stockId);
  // Legacy checks may already have added stock. Completed purchases remain in stock.
  if(previousReceipt?.applied&&!previousReceipt.finalized&&target&&Number.isFinite(target.quantity))target.quantity=Math.max(0,target.quantity-previousReceipt.quantity);
  for(const id of previousReceipt?.coordinatedIds||[])if(data.shoppingExcluded?.[week]?.[id]?.by===item.identity)delete data.shoppingExcluded[week][id];
  if(data.shoppingStockReceipts?.[week]&&!previousReceipt?.finalized)delete data.shoppingStockReceipts[week][item.identity];
 }
}
function exclude(data,week,item){data.shoppingExcluded??={};data.shoppingExcluded[week]??={};data.shoppingExcluded[week][item.identity]={name:item.name,unit:item.unit,store:item.store,family:item.family};for(const id of item.coordinatedIds||[])data.shoppingExcluded[week][id]={reason:'covered',by:item.identity};}
function restore(data,week,identity){if(data.shoppingExcluded?.[week]){delete data.shoppingExcluded[week][identity];for(const [id,entry] of Object.entries(data.shoppingExcluded[week]))if(entry?.by===identity)delete data.shoppingExcluded[week][id];}}
function setQuantity(data,week,item,value,tools,unit){const n=tools.amount(value);if(n===null)throw Error('Indique un nombre positif ou zéro.');data.shoppingQuantities??={};data.shoppingQuantities[week]??={};data.shoppingQuantities[week][item.identity]={quantity:n,unit:unit||item.unit,unitExplicit:!!unit,needAtEdit:item.required,item:{key:item.key,text:item.text,baseKey:item.baseKey,name:item.name,unit:item.unit,known:item.known,manual:item.manual,store:item.store,family:item.family,product:item.product,sourceKeys:item.sourceKeys,baseKeys:item.baseKeys,texts:item.texts}};}
function automatic(data,week,item){if(data.shoppingQuantities?.[week])delete data.shoppingQuantities[week][item.identity];}
function counts(items,state){const listed=items.filter(i=>!state.excluded[i.identity]);return {remaining:listed.filter(i=>!state.checked[i.identity]).length,total:listed.length,checked:listed.filter(i=>state.checked[i.identity]).length};}
const api={weekState,setChecked,exclude,restore,setQuantity,automatic,counts};root.BazarCoursesList=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
