/* Two views of the existing three tables; local view choice, shared purchase data. */
(function(){'use strict';
 const model=window.BazarPurchaseStock,key='bazar-courses-circuit-v1';let circuit='classic',allDepth=0,forced=null;
 try{if(localStorage.getItem(key)==='restock')circuit='restock';}catch{}
 const all=fn=>{allDepth++;try{return fn();}finally{allDepth--;}};
 const beforeItems=shoppingItems;
 shoppingItems=function(){const wk=datekey(page==='Courses'?coursesWeek():week),items=model.apply(data,beforeItems(),wk,stockTools);if(allDepth)return items;const view=forced||circuit;return items.filter(i=>model.isRestock(i)===(view==='restock'));};
 window.BazarPurchaseCircuits={all,get circuit(){return circuit;},select(value){circuit=value==='restock'?'restock':'classic';try{localStorage.setItem(key,circuit);}catch{}if(page==='Courses')shopping();}};
 const beforePurchaseItems=familyPurchaseItems;familyPurchaseItems=function(){const previous=forced;forced='classic';try{return beforePurchaseItems();}finally{forced=previous;}};
 function userQuantity(item){const el=document.activeElement;if(!el?.matches('[data-list-quantity]')||model.isRestock(item))return false;return shoppingItems()[Number(el.dataset.listQuantity)]?.identity===item.identity;}
 const setQuantity=courseList.setQuantity;courseList.setQuantity=function(d,w,item,value,tools,unit){const user=userQuantity(item);const result=setQuantity(d,w,item,value,tools,unit);if(user)d.shoppingQuantities[w][item.identity].stockPurchaseOverride=true;return result;};
 const setBuy=habitualTools.setBuy;habitualTools.setBuy=function(d,w,item,value,tools,unit){const user=userQuantity(item);const result=setBuy(d,w,item,value,tools,unit);if(user)d.shoppingBuyQuantities[w][item.buyKey].stockPurchaseOverride=true;return result;};
 const beforeShopping=shopping;shopping=function(){beforeShopping();const bar=document.querySelector('.courses-list-toolbar');if(!bar)return;
 let button=document.getElementById('coursesPurchaseCircuit');if(!button){button=document.createElement('button');button.type='button';button.id='coursesPurchaseCircuit';bar.append(button);}button.textContent=circuit==='restock'?'← Courses classiques':'Restock';button.setAttribute('aria-pressed',String(circuit==='restock'));button.title='Circuit actuel : '+(circuit==='restock'?'Restock':'Courses classiques');button.onpointerdown=e=>{if(!visualEditSession)e.preventDefault();};button.onclick=()=>{if(!visualEditSession)BazarPurchaseCircuits.select(circuit==='restock'?'classic':'restock');};
 const items=shoppingItems(),errors=[...new Set(items.map(i=>i.stockIssue).filter(Boolean))],error=document.querySelector('.courses-list-error');if(error&&errors.length&&!error.textContent){error.textContent=errors.length===1?errors[0]:errors.length+' produits : quantité ou unité à préciser pour comparer avec le Stock. Le détail est indiqué au survol de leur quantité.';error.hidden=false;}
 document.querySelectorAll('[data-course-index]').forEach(row=>{const item=items[Number(row.dataset.courseIndex)];if(item?.stockIssue){const input=row.querySelector('[data-list-quantity]');if(input)input.title=item.stockIssue;}});
 applySharedGroups();};
})();
