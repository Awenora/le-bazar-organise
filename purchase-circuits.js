/* One view of the three existing tables; independent classic and automatic purchases. */
(function(){'use strict';
 const model=window.BazarPurchaseStock;let allDepth=0,classicDepth=0;
 const all=fn=>{allDepth++;try{return fn();}finally{allDepth--;}};
 const beforeItems=shoppingItems;
 shoppingItems=function(){const wk=datekey(page==='Courses'?coursesWeek():week),items=model.apply(data,beforeItems(),wk,stockTools);return classicDepth&&!allDepth?items.filter(i=>!model.isRestock(i)):items;};
 // Internal compatibility for automatic calculations, with no separate view.
 window.BazarPurchaseCircuits={all,readContext:()=>classicDepth&&!allDepth?'classic-only':'all'};
 const beforePurchaseItems=familyPurchaseItems;familyPurchaseItems=function(){classicDepth++;try{return beforePurchaseItems();}finally{classicDepth--;}};
 function userQuantity(item){const el=document.activeElement;if(!el?.matches('[data-list-quantity]')||model.isRestock(item))return false;return shoppingItems()[Number(el.dataset.listQuantity)]?.identity===item.identity;}
 const setQuantity=courseList.setQuantity;courseList.setQuantity=function(d,w,item,value,tools,unit){const user=userQuantity(item);const result=setQuantity(d,w,item,value,tools,unit);if(user)d.shoppingQuantities[w][item.identity].stockPurchaseOverride=true;return result;};
 const setBuy=habitualTools.setBuy;habitualTools.setBuy=function(d,w,item,value,tools,unit){const user=userQuantity(item);const result=setBuy(d,w,item,value,tools,unit);if(user)d.shoppingBuyQuantities[w][item.buyKey].stockPurchaseOverride=true;return result;};
 const beforeShopping=shopping;shopping=function(){beforeShopping();const bar=document.querySelector('.courses-list-toolbar');if(!bar)return;

 };
})();
