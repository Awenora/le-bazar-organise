// Preparatory model only. Not loaded by the active site.
// A conflict is explicit; stale browser data must never overwrite a remote edit.
export const LOCAL_KEYS=new Set(['profile','selectedCalendarMonth','shoppingWeekOffset','visualPreferences','notebookLayout','notebookSizes','menuWidths','coursesLayout','stockCardOrder','recipesAlphabetized','profileOrder']);
const unsafe=new Set(['__proto__','prototype','constructor']);
const copy=v=>structuredClone(v);
export function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
export function equal(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
export function identity(item){if(!item||typeof item!=='object')return null;if(typeof item.id==='string'&&item.id)return 'id:'+item.id;if(typeof item.key==='string'&&item.key)return 'key:'+item.key+'|'+(item.shoppingWeek||'');return null;}
export function localPath(path){return LOCAL_KEYS.has(path[0])||(path[0]==='inventory'&&path[1]==='layout');}
export function flatten(data){
 const cells=new Map();const put=(path,value)=>cells.set(JSON.stringify(path),copy(value));
 function visit(value,path){
  if(localPath(path))return;
  if(path.some(k=>unsafe.has(k)))throw Error('Clé non autorisée');
  if(path[0]==='plans'&&path.length===3){put(path,{kind:'value',value});return;}
  if(path[0]==='budget'&&['entries','series'].includes(path[1])&&path.length===3){put(path,{kind:'value',value});return;}
  if(Array.isArray(value)){
   const ids=value.map(identity),keyed=value.length>0&&ids.every(Boolean)&&new Set(ids).size===ids.length;
   if(keyed){put(path,{kind:'keyed-array'});value.forEach((item,index)=>put([...path,'@'+ids[index]],{kind:'item',index,value:item}));return;}
   if(path[0]==='feedback'&&path.at(-1)==='likes'){put(path,{kind:'set-array'});[...new Set(value)].forEach(person=>{if(typeof person!=='string')throw Error('Profil de vote invalide');put([...path,'@'+person],{kind:'member',value:person});});return;}
   put(path,{kind:'value',value});return;
  }
  if(value&&typeof value==='object'){put(path,{kind:'object'});for(const [key,v]of Object.entries(value))if(v!==undefined)visit(v,[...path,key]);return;}
  put(path,{kind:'value',value});
 }
 for(const [key,value]of Object.entries(data))if(value!==undefined)visit(value,[key]);return cells;
}
export function inflate(cells,local={}){
 const roots=new Map(),children=new Map();
 for(const [key,cell]of cells){const path=JSON.parse(key);if(!Array.isArray(path)||path.some(k=>typeof k!=='string'||unsafe.has(k)))throw Error('Chemin invalide');if(localPath(path))continue;roots.set(key,{path,cell});const parent=JSON.stringify(path.slice(0,-1));if(!children.has(parent))children.set(parent,[]);children.get(parent).push(key);}
 function read(key){const {cell}=roots.get(key),child=children.get(key)||[];if(cell.kind==='value')return copy(cell.value);
  if(cell.kind==='keyed-array')return child.map(k=>({k,...roots.get(k).cell})).filter(c=>c.kind==='item').sort((a,b)=>a.index-b.index||a.k.localeCompare(b.k)).map(c=>copy(c.value));
  if(cell.kind==='set-array')return child.map(k=>roots.get(k).cell).filter(c=>c.kind==='member').map(c=>c.value);
  if(cell.kind!=='object')throw Error('Type de cellule invalide');return Object.fromEntries(child.map(k=>[roots.get(k).path.at(-1),read(k)]));
 }
 const out={};for(const key of children.get('[]')||[])out[roots.get(key).path[0]]=read(key);
 for(const k of LOCAL_KEYS)if(Object.hasOwn(local,k))out[k]=copy(local[k]);
 if(local.inventory?.layout){out.inventory??={};out.inventory.layout=copy(local.inventory.layout);}return out;
}
export function changes(base,next){const out=[];for(const key of new Set([...base.keys(),...next.keys()])){const before=base.get(key),value=next.get(key);if(!equal(before,value))out.push({key,deleted:!next.has(key),value:next.has(key)?copy(value):null});}return out;}
export function merge(base,local,remote){
 const out=new Map([...remote].map(([k,v])=>[k,copy(v)])),conflicts=[];
 const remoteChanges=changes(base,remote);
 for(const change of changes(base,local)){const old=base.get(change.key),current=remote.get(change.key),ours=local.get(change.key),path=JSON.parse(change.key);
  const below=(key,parent)=>{const child=JSON.parse(key);return child.length>parent.length&&parent.every((part,i)=>child[i]===part);};
  const structural=(change.deleted||old?.kind!==ours?.kind)&&!equal(ours,current)&&remoteChanges.some(c=>below(c.key,path)&&!equal(local.get(c.key),remote.get(c.key)));
  const lostParent=path.slice(0,-1).some((_,i)=>{const key=JSON.stringify(path.slice(0,i+1));return base.has(key)&&!equal(base.get(key),remote.get(key))&&!equal(local.get(key),remote.get(key));});
  if(structural||lostParent){conflicts.push({key:change.key,reason:'structure-changed'});continue;}
  if(!equal(old,current)&&!equal(ours,current)){conflicts.push({key:change.key,base:copy(old),local:copy(ours),remote:copy(current)});continue;}
  if(change.deleted)out.delete(change.key);else out.set(change.key,copy(change.value));
 }
 return {cells:conflicts.length?new Map([...remote].map(([k,v])=>[k,copy(v)])):out,conflicts};
}
