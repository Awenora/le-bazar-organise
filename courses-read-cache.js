/* Reuse read results within one render/dialog only. Never cache across edits or sync. */
(function(){'use strict';
 let reads=null;
 function phase(fn,self,args){if(!['Courses','Réserves'].includes(page)||reads)return fn.apply(self,args);return familyShop.withProductReadCache(()=>{reads=new Map();try{return fn.apply(self,args);}finally{reads=null;}});}
 const beforeItems=shoppingItems;shoppingItems=function(){if(!reads)return beforeItems();const key=page+'|'+datekey(page==='Courses'?coursesWeek():week)+'|'+(window.BazarPurchaseCircuits?.readContext()||'all');if(!reads.has(key))reads.set(key,beforeItems());return reads.get(key);};
 const beforeReserves=reserves;reserves=function(...args){return phase(beforeReserves,this,args);};
 const beforeShopping=shopping;shopping=function(...args){return phase(beforeShopping,this,args);};
 const beforeApply=applyVisualPreferences;applyVisualPreferences=function(...args){return phase(beforeApply,this,args);};
 const beforePending=coursePendingDialog;coursePendingDialog=function(...args){return phase(beforePending,this,args);};
 const beforeSave=save;save=function(...args){const frame=reads;reads=null;frame?.clear();familyShop.invalidateProductReadCache();try{return beforeSave.apply(this,args);}finally{reads=frame;familyShop.invalidateProductReadCache();}};
})();
