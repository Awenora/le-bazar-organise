import {CloudEngine} from './engine.mjs';
import {encodeCache} from './cache-codec.mjs';
const fields=['shoppingCaddie','shoppingExcluded','shoppingStockReceipts'];
function overlay(view,values){const result={...view};for(const key of fields){delete result[key];if(Object.hasOwn(values,key))result[key]=values[key];}return result;}
self.onmessage=event=>{
 try{
  const {state,entries}=event.data;
  const engine=new CloudEngine({storage:{getItem:()=>null,setItem:()=>{}},storageKey:'cart',remote:null});
  engine.state=state;
  for(const entry of entries){
   const current=engine.view();
   if(fields.every(key=>JSON.stringify(current[key])===JSON.stringify(entry.after[key])))continue;
   engine.edit(overlay(current,entry.before),overlay(current,entry.after),{page:'Courses'});
  }
  const encoded=encodeCache(JSON.stringify(engine.state));
  self.postMessage({state:engine.state,encoded});
 }catch(error){self.postMessage({error:error.message});}
};
