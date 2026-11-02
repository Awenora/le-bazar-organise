/* Uses the existing save, shopping and receipt paths; never changes a Stock table. */
(function(){'use strict';
 const model=window.BazarAutomaticRestock;
 const beforeItems=shoppingItems;
 shoppingItems=function(){return beforeItems().map(item=>{if(!item.automaticRestock)return item;const p=data.shoppingCatalog.find(p=>p.id===item.automaticRestock.catalogId);if(!p)return item;const manual=item.adjustment||item.buyManual;return {...item,catalogId:p.id,name:p.name,purchaseDisplay:{...item.purchaseDisplay,quantity:manual?.quantity??item.purchaseDisplay?.quantity??p.restock.quantity,unit:manual?.unit||model.inspect(data,p).unit||p.restock.unit||'',format:p.purchaseFormat||'',brand:p.brand||''}};});};
 function itemsFor(wk){const priorPage=page,priorWeek=week,offset=data.shoppingWeekOffset;page='Courses';week=new Date(wk+'T12:00:00');const beforeCoursesWeek=coursesWeek;coursesWeek=()=>week;try{return window.BazarPurchaseCircuits?BazarPurchaseCircuits.all(()=>shoppingItems()):shoppingItems();}finally{coursesWeek=beforeCoursesWeek;page=priorPage;week=priorWeek;if(offset===undefined)delete data.shoppingWeekOffset;else data.shoppingWeekOffset=offset;}}
 function currentWeek(){const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return datekey(monday(new Date(parts+'T12:00:00')));}
 let reconciling=false;const warned=new Map();function reportIssue(p,info){if(!info.incompatible&&!info.blocked)return;const message=p.name+' : '+info.reason;if(warned.get(p.id)!==message){warned.set(p.id,message);toast(message);}}
 function reconcile(){if(reconciling||visualEditSession)return false;reconciling=true;try{return model.reconcile(data,currentWeek(),{items:itemsFor,product:familyProduct,issue:reportIssue,quantity:(wk,item,n,unit)=>{if(item.habitualProduct&&item.buyKey)habitualTools.setBuy(data,wk,item,n,stockTools,unit);else courseList.setQuantity(data,wk,item,n,stockTools,unit);}});}finally{reconciling=false;}}
 const beforeSave=save;save=function(){reconcile();return beforeSave();};
 const beforeRender=render;render=function(){if(reconcile())beforeSave();return beforeRender();};
 // The origin is available without another label, column or button in product rows.
 const beforeShopping=shopping;shopping=function(){beforeShopping();const state=data.automaticRestock||{},items=shoppingItems();document.querySelectorAll('[data-course-index]').forEach(el=>{const item=items[Number(el.dataset.courseIndex)];if(item&&(item.automaticRestock||Object.values(state).some(r=>r.identity===item.identity)))el.title='Restock · réapprovisionnement automatique';});};
 if(!courseUndoFields.includes('automaticRestock'))courseUndoFields.push('automaticRestock');
 if(!courseUndoFields.includes('shoppingStockReceipts'))courseUndoFields.push('shoppingStockReceipts');
 coursesUndoBaseline=courseUndoState();
})();
