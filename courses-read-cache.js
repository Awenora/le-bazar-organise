/* Reuse read results within one render/dialog only. Never cache across edits or sync. */
(function(){'use strict';
 let reads=null;
 function phase(fn,self,args){if(!['Courses','Réserves'].includes(page)||reads)return fn.apply(self,args);const run=()=>{reads=new Map();try{return fn.apply(self,args);}finally{reads=null;}};return familyShop.withProductReadCache(()=>page==='Courses'&&stockTools.withReadCache?stockTools.withReadCache(run):run());}
 const beforeItems=shoppingItems;shoppingItems=function(){if(!reads)return beforeItems();const key=page+'|'+datekey(page==='Courses'?coursesWeek():week)+'|'+(window.BazarPurchaseCircuits?.readContext()||'all');if(!reads.has(key))reads.set(key,beforeItems());return reads.get(key);};
 const beforeRoute=courseExplicitRoute;courseExplicitRoute=function(item){
  if(!reads||page!=='Courses'||!item?.identity)return beforeRoute(item);
  let routes=reads.get('resolved-routes');if(!routes)reads.set('resolved-routes',routes=new WeakMap());
  if(!routes.has(item))routes.set(item,beforeRoute(item));return {...routes.get(item)};
 };
 const beforeReserves=reserves;reserves=function(...args){return phase(beforeReserves,this,args);};
 let buildingCourses=0,layoutPending=false,groupsPending=false,applyPending=false;
 const beforeGroups=applySharedGroups;applySharedGroups=function(...args){if(buildingCourses){groupsPending=true;return;}return beforeGroups.apply(this,args);};
 const beforeLayout=applyCoursesFreeLayout;applyCoursesFreeLayout=function(...args){if(buildingCourses){layoutPending=true;return;}return beforeLayout.apply(this,args);};
 const beforeShopping=shopping;shopping=function(...args){if(visualEditSession)return phase(beforeShopping,this,args);buildingCourses++;try{return phase(beforeShopping,this,args);}finally{if(!--buildingCourses){if(applyPending){applyPending=groupsPending=layoutPending=false;applyVisualPreferences();}else{if(groupsPending){groupsPending=false;applySharedGroups();}if(layoutPending){layoutPending=false;applyCoursesFreeLayout();}}}}};
 const beforeApply=applyVisualPreferences;applyVisualPreferences=function(...args){if(buildingCourses){applyPending=true;return;}return phase(beforeApply,this,args);};
 const beforePending=coursePendingDialog;coursePendingDialog=function(...args){return phase(beforePending,this,args);};
 const beforeSave=save;save=function(...args){const frame=reads;reads=null;frame?.clear();familyShop.invalidateProductReadCache();stockTools.invalidateReadCache?.();try{return beforeSave.apply(this,args);}finally{reads=frame;familyShop.invalidateProductReadCache();stockTools.invalidateReadCache?.();}};
})();
