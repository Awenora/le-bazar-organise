/* Only cart selections use this durable journal. Stock/checkout keep their usual save. */
const fields=['shoppingCaddie','shoppingExcluded','shoppingStockReceipts'];
export function selectionFields(data){return Object.fromEntries(fields.filter(key=>Object.hasOwn(data,key)).map(key=>[key,structuredClone(data[key])]));}
function overlay(view,values){const result={...view};for(const key of fields){delete result[key];if(Object.hasOwn(values,key))result[key]=values[key];}return result;}
export function createCartSaver({engine,storageKey,native,onSaved,onIdle,onError}){
 const key='bazar-cart-journal:'+storageKey;
 let entries=JSON.parse(native.get.call(localStorage,key)||'[]'),worker=null,timer,inFlight=null,failed=false,stopped=false;
 addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);worker?.terminate();worker=null;inFlight=null;});
 addEventListener('pageshow',event=>{if(event.persisted&&stopped)location.reload();});
 const write=next=>{if(next.length)native.set.call(localStorage,key,JSON.stringify(next));else native.remove.call(localStorage,key);};
 function recover(){
  for(const entry of entries){
   const current=engine.view();
   if(fields.every(key=>JSON.stringify(current[key])===JSON.stringify(entry.after[key])))continue;
   engine.edit(overlay(current,entry.before),overlay(current,entry.after),{page:'Courses'});
  }
  write([]);entries=[];
 }
 function stop(error){
  failed=true;inFlight=null;worker?.terminate();worker=null;
  try{recover();onSaved(selectionFields(engine.view()));onIdle();}
  catch(recoveryError){onError(recoveryError.message||error||'Les coches restent conservées sur cet appareil.');}
 }
 function run(){
  clearTimeout(timer);
  if(!entries.length||inFlight||failed||stopped)return;
  try{
   if(!worker){
    worker=new Worker(new URL('./cart-save-worker.mjs',import.meta.url),{type:'module'});
    worker.onerror=()=>stop();
    worker.onmessage=event=>{
     if(stopped)return;
     const result=event.data,batch=inFlight;inFlight=null;
     if(result.error){stop(result.error);return;}
     // Another save or a remote response won the race: merge again on that state.
     if(engine.state!==batch.state){run();return;}
     try{
      native.set.call(localStorage,storageKey,result.encoded);
      engine.state=result.state;
      entries=entries.slice(batch.count);write(entries);
      onSaved(batch.after);
      if(entries.length)run();else onIdle();
     }catch(error){stop(error.message);}
    };
   }
   const batch=entries.slice();
   inFlight={state:engine.state,count:batch.length,after:batch.at(-1).after};
   worker.postMessage({state:engine.state,entries:batch});
  }catch(error){stop(error.message);}
 }
 return {
  recover,
  get pending(){return entries.length>0;},
  get available(){return typeof Worker!=='undefined'&&!failed&&!stopped;},
  save(before,after){
   const next=[...entries,{before,after}];write(next);entries=next;
   clearTimeout(timer);timer=setTimeout(run,100);
   return true;
  }
 };
}
