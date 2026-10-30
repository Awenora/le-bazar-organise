import {flatten,inflate,merge,changes,equal,LOCAL_KEYS} from './records.mjs';
const clone=v=>structuredClone(v), key=p=>JSON.stringify(p);
const cells=rows=>new Map(rows.filter(r=>!r.deleted).map(r=>[key(r.path),clone(r.payload)]));
const array=map=>[...map];
const map=list=>new Map(list);
export class CloudEngine {
  constructor({storage,storageKey,remote,notify=()=>{}}){
    this.storage=storage;this.storageKey=storageKey;this.remote=remote;this.notify=notify;this.busy=false;
    const raw=storage.getItem(storageKey);this.state=raw?JSON.parse(raw):null;
  }
  persist(next){this.storage.setItem(this.storageKey,JSON.stringify(next));this.state=next;}
  initialize(rows,legacy={}){
    if(this.state)return;
    if(!rows.length)throw Error('Bibliothèque familiale absente : aucun amorçage automatique autorisé.');
    const local={};for(const k of LOCAL_KEYS)if(Object.hasOwn(legacy,k))local[k]=clone(legacy[k]);
    if(legacy.inventory?.layout)local.inventory={layout:clone(legacy.inventory.layout)};
    const comparable=m=>[...m].sort(([a],[b])=>a<b?-1:a>b?1:0);
    const divergent=Array.isArray(legacy.recipes)&&!equal(comparable(flatten(legacy)),comparable(cells(rows)));
    this.persist({version:1,rows:clone(rows),want:array(cells(rows)),local,attempt:null,conflicts:[],incoming:null,
      startupDivergence:divergent,drafts:divergent?[{time:new Date().toISOString(),data:clone(legacy),reason:'pre-cloud-local-data'}]:[]});
  }
  shared(view){
    const value=clone(view),base=inflate(cells(this.state.rows));
    // Display coordinates belong to the device even though historical defaults
    // were embedded in imported table descriptors. Preserve those server defaults.
    const tables=base.familyShopping?.stockRooms?.tables||[];
    for(const t of value.familyShopping?.stockRooms?.tables||[]){
      const b=tables.find(x=>x.id===t.id);t.column=b?.column??0;t.order=b?.order??0;
    }
    for(const field of ['revision','sequence','updatedAt'])if(value.budget&&base.budget&&Object.hasOwn(base.budget,field))value.budget[field]=base.budget[field];
    return flatten(value);
  }
  view(){
    const value=inflate(map(this.state.want),this.state.local);
    for(const t of value.familyShopping?.stockRooms?.tables||[])Object.assign(t,this.state.local.tablePositions?.[t.id]||{});
    if(value.budget){
      const entries=[...Object.values(value.budget.entries||{}),...Object.values(value.budget.series||{})];
      value.budget.sequence=Math.max(value.budget.sequence||0,...entries.map(x=>x.recordedOrder||0));
    }
    return value;
  }
  edit(before,nextView,context={}){
    const next=clone(this.state),local={...next.local};
    for(const k of LOCAL_KEYS){if(Object.hasOwn(nextView,k))local[k]=clone(nextView[k]);else delete local[k];}
    if(nextView.inventory?.layout)local.inventory={layout:clone(nextView.inventory.layout)};
    local.tablePositions=Object.fromEntries((nextView.familyShopping?.stockRooms?.tables||[]).map(t=>[t.id,{column:t.column,order:t.order}]));
    const proposed=this.shared(nextView),base=this.shared(before),current=map(next.want);
    const combined=merge(base,proposed,current);
    if(combined.conflicts.length){
      next.drafts.push({time:new Date().toISOString(),data:clone(nextView)});
      next.conflicts=combined.conflicts;next.want=array(proposed);
      next.incoming=clone(next.rows);next.conflictBase=array(base);
    }else next.want=array(combined.cells);
    const diff=changes(base,proposed);
    if(context.page==='Courses'&&diff.length){
      next.actions??=[];next.actions.push({page:'Courses',changes:diff.map(c=>({...c,before:base.get(c.key),hadBefore:base.has(c.key)})),
        layoutBefore:clone(before.coursesLayout||{}),layoutAfter:clone(nextView.coursesLayout||{})});
      next.actions=next.actions.slice(-12);
    }
    if(context.checkpoint){next.drafts.push({time:new Date().toISOString(),data:clone(before)});}
    next.local=local;this.persist(next);this.notify();
  }
  undoCourses(){
    const next=clone(this.state),actions=next.actions||[],action=actions.at(-1);if(!action)return false;
    const current=map(next.want),allKeys=action.changes.map(c=>c.key);
    for(const c of action.changes){
      if(!equal(current.get(c.key),c.deleted?undefined:c.value))throw Error('Annulation suspendue : une valeur a changé ailleurs.');
      if(!c.hadBefore){const p=JSON.parse(c.key);if([...current.keys()].some(k=>{const q=JSON.parse(k);return q.length>p.length&&p.every((v,i)=>q[i]===v)&&!allKeys.includes(k);}))throw Error('Annulation suspendue : de nouveaux éléments ont été ajoutés.');}
    }
    for(const c of action.changes){if(c.hadBefore)current.set(c.key,clone(c.before));else current.delete(c.key);}
    if(equal(next.local.coursesLayout||{},action.layoutAfter))next.local.coursesLayout=clone(action.layoutBefore);
    next.want=array(current);next.actions.pop();this.persist(next);this.notify();return true;
  }
  receive(rows){
    if(this.state.attempt)return; // Resolve a possibly committed request first.
    if(equal(this.state.rows,rows))return;
    const next=clone(this.state),base=cells(next.rows),incoming=cells(rows);
    const result=merge(base,map(next.want),incoming);
    if(result.conflicts.length){next.conflicts=result.conflicts;next.incoming=clone(rows);next.conflictBase=array(base);}
    else if(!next.conflicts.length){next.rows=clone(rows);next.want=array(result.cells);next.incoming=null;}
    else next.incoming=clone(rows);
    this.persist(next);this.notify();
  }
  pending(){return changes(cells(this.state.rows),map(this.state.want));}
  resolve(choice){
    const next=clone(this.state);
    if(!next.incoming||!next.conflicts.length)return;
    if(choice==='local'&&next.conflicts.some(c=>c.reason==='structure-changed'))throw Error('Conflit de structure : exporter votre version avant de reprendre la version partagée.');
    const base=map(next.conflictBase||array(cells(next.rows))),ours=map(next.want),result=cells(next.incoming);
    next.drafts.push({time:new Date().toISOString(),data:this.view()});
    const bad=next.conflicts.map(c=>JSON.parse(c.key));
    const related=(a,b)=>a.slice(0,Math.min(a.length,b.length)).every((p,i)=>p===b[i]);
    for(const change of changes(base,ours)){
      if(choice==='remote'&&bad.some(p=>related(p,JSON.parse(change.key))))continue;
      if(change.deleted)result.delete(change.key);else result.set(change.key,clone(change.value));
    }
    next.rows=next.incoming;next.want=array(result);next.incoming=null;next.conflicts=[];delete next.conflictBase;
    this.persist(next);this.notify();
  }
  async flush(){
    if(this.busy)return;this.busy=true;
    try{
      // Do not create a new request ID after a network timeout. Retry exactly.
      if(this.state.attempt)await this.sendAttempt();
      this.receive(await this.remote.read());
      if(this.state.conflicts.length)return;
      for(let loop=0;loop<5;loop++){
        const diff=this.pending();if(!diff.length)return;
        const revisions=new Map(this.state.rows.map(r=>[key(r.path),Number(r.revision)]));
        const batch=diff.map(c=>({path:JSON.parse(c.key),value:c.value,deleted:c.deleted,expected:revisions.get(c.key)||0}));
        if(batch.length>10000)throw Error('Trop de modifications : conservation locale, aucun remplacement global.');
        const next=clone(this.state);next.attempt={id:crypto.randomUUID(),cursor:Math.max(0,...next.rows.map(r=>Number(r.revision))),changes:batch};
        this.persist(next);await this.sendAttempt();
        if(this.state.conflicts.length)return;
      }
    }finally{this.busy=false;}
  }
  async sendAttempt(){
    const attempt=clone(this.state.attempt),answer=await this.remote.commit(attempt);
    if(!answer?.accepted){
      const next=clone(this.state);next.attempt=null;this.persist(next);
      this.receive(await this.remote.read());
      if(!this.state.conflicts.length)throw Error('Modification refusée ; conservée sur cet appareil.');
      return;
    }
    if(!Array.isArray(answer.records)||answer.records.length!==attempt.changes.length)throw Error('Réponse distante incomplète ; reprise requise.');
    const returned=new Map(answer.records.map(r=>[key(r.path),r]));
    const next=clone(this.state),rows=new Map(next.rows.map(r=>[key(r.path),r]));
    for(const change of attempt.changes){
      const r=returned.get(key(change.path));
      if(!r||r.deleted!==change.deleted||(!r.deleted&&!equal(r.value,change.value))||!Number.isSafeInteger(Number(r.revision)))throw Error('Réponse distante différente ; arrêt sécurisé.');
      rows.set(key(r.path),{path:r.path,payload:r.value,revision:Number(r.revision),deleted:r.deleted});
    }
    next.rows=[...rows.values()];next.attempt=null;this.persist(next);this.notify();
  }
}
