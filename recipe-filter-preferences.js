(function(root){'use strict';
const defaults={hidden:false,placement:'after-notebook',width:0,minHeight:0,x:0,y:0,gap:6,padding:0,fontSize:14,alpha:73,background:'#fff3df',color:'#38281c',borderColor:'#b38b66',borderWidth:1,radius:8};
function defaultItems(categories){return [{id:'all',label:'Toutes',kind:'all',value:'',hidden:false,removed:false},...(categories||[]).map(name=>({id:'category:'+name,label:name,kind:'category',value:name,hidden:false,removed:false}))];}
function clean(value,categories){const result={version:1,items:defaultItems(categories),modes:{desktop:{},mobile:{}}};if(!value||typeof value!=='object')return result;
 if(Array.isArray(value.items)){const ids=new Set();result.items=value.items.slice(0,100).filter(i=>i&&typeof i.id==='string'&&i.id.length<200&&!ids.has(i.id)&&ids.add(i.id)&&['all','category','keyword'].includes(i.kind)&&typeof i.label==='string'&&i.label.trim()).map(i=>({id:i.id,label:i.label.trim().slice(0,80),kind:i.kind,value:typeof i.value==='string'?i.value.slice(0,120):'',hidden:i.hidden===true,removed:i.removed===true}));}
 for(const mode of ['desktop','mobile']){const p=value.modes?.[mode];if(!p||typeof p!=='object')continue;const out=result.modes[mode];for(const [key,min,max] of [['width',0,1800],['minHeight',0,400],['x',-1200,1200],['y',-600,1200],['gap',0,40],['padding',0,40],['fontSize',11,28],['alpha',0,100],['borderWidth',0,5],['radius',0,40]])if(Number.isFinite(p[key]))out[key]=Math.max(min,Math.min(max,p[key]));for(const key of ['background','color','borderColor'])if(/^#[a-f0-9]{6}$/i.test(p[key]||''))out[key]=p[key];if(typeof p.hidden==='boolean')out.hidden=p.hidden;if(['before-search','after-search','after-notebook'].includes(p.placement))out.placement=p.placement;}
 return result;
}
function effective(value,categories,mode){const p=clean(value,categories);return {...defaults,...p.modes[mode],items:p.items};}
const api={defaults,defaultItems,clean,effective};root.BazarRecipeFilterPreferences=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
