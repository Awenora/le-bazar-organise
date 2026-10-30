function stockAZIcon(){return '<svg class="sr-sort-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><title>A Z</title><path d="M5 3v18m-4-4 4 4 4-4M13 10l3.5-8L20 10m-5.7-3h4.4M13 14h7l-7 8h7"/></svg>'; }
/* Stock : texte des lieux et ordre visuel des produits, dans les préférences existantes. */
const stockOrderTextCleanBefore=cleanVisualPreferences;
cleanVisualPreferences=function(raw){const out=stockOrderTextCleanBefore(raw);if(raw?.stockTableRows){out.stockTableRows={};for(const [id,p]of Object.entries(raw.stockTableRows)){if(!p||typeof p!=='object')continue;const q={};if(['manual','alpha'].includes(p.mode))q.mode=p.mode;if(Array.isArray(p.order))q.order=[...new Set(p.order.filter(v=>typeof v==='string'))];if(typeof p.showAZ==='boolean')q.showAZ=p.showAZ;out.stockTableRows[id]=q;}}if(raw?.stockLocationText){out.stockLocationText={modes:{desktop:{},mobile:{}}};for(const mode of ['desktop','mobile'])for(const [id,p]of Object.entries(raw.stockLocationText.modes?.[mode]||{})){const q={};if(['Segoe UI','Arial','Verdana','Georgia','Tahoma'].includes(p.fontFamily))q.fontFamily=p.fontFamily;if(Number.isFinite(p.fontSize))q.fontSize=Math.max(9,Math.min(36,p.fontSize));if([400,700].includes(p.fontWeight))q.fontWeight=p.fontWeight;if(['normal','italic'].includes(p.fontStyle))q.fontStyle=p.fontStyle;out.stockLocationText.modes[mode][id]=q;}}return out;};
function stockRowConfig(id){return (visualEditSession?.draft||data.visualPreferences).stockTableRows?.[id]||{};}
const stockOrderedItemsBefore=stockRoomModel.tableItems;
stockRoomModel.tableItems=function(d,id){const rows=stockOrderedItemsBefore(d,id),prefs=(typeof visualEditSession!=='undefined'&&visualEditSession&&d===data?visualEditSession.draft:d.visualPreferences),p=prefs?.stockTableRows?.[id]||{};if(p.mode==='alpha')return rows;const imported=d.familyShopping?.imports?.['placard-entree-58-v1']?.entries?.filter(e=>e.tableId===id).map(e=>e.itemId),order=p.mode==='manual'?p.order:imported;if(!order?.length)return rows;const positions=new Map(order.map((v,i)=>[v,i])),insertion=new Map(d.inventory.items.map((v,i)=>[v.id,i]));return rows.sort((a,b)=>(positions.get(a.id)??1e9)-(positions.get(b.id)??1e9)||(insertion.get(a.id)-insertion.get(b.id)));};
function stockRowsChange(id,fn){const change=()=>{const root=visualEditSession?.draft||data.visualPreferences;root.stockTableRows??={};root.stockTableRows[id]??={};fn(root.stockTableRows[id]);};if(visualEditSession){change();stockRoomRender();renderVisualEditor();return true;}const ok=familyCommit(change,false);if(ok)stockRoomRender();return ok;}
function stockRowsAlphabetical(id){return stockRowsChange(id,p=>{p.mode='alpha';delete p.order;});}
function stockRowsMove(id,source,before){const order=stockRoomModel.tableItems(data,id).map(i=>i.id).filter(v=>v!==source);if(before===source)return false;const index=before?order.indexOf(before):order.length;if(index<0)return false;order.splice(index,0,source);return stockRowsChange(id,p=>{p.mode='manual';p.order=order;});}
const stockRowsTableBefore=stockRoomTable;
stockRoomTable=function(t){const html=stockRowsTableBefore(t);return html.replace('<button data-sr-add=', '<button type="button" data-sr-az="'+esc(t.id)+'" title="Ranger les produits par ordre alphabétique" aria-label="Tri alphabétique A à Z" '+(stockRowConfig(t.id).showAZ===false?'hidden':'')+'>'+stockAZIcon()+'</button><button data-sr-add=');};
function stockOrderTextBind(){if(page!=='Réserves')return;document.querySelectorAll('[data-sr-az]').forEach(b=>b.onclick=()=>stockRowsAlphabetical(b.dataset.srAz));document.querySelectorAll('.sr-product-cell>span').forEach(span=>{span.classList.add('sr-order-label');span.tabIndex=0;span.title='Glisser pour ranger cette ligne · Alt + haut / bas au clavier';span.onkeydown=e=>{if(!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const row=span.closest('[data-sr-row]'),id=row.closest('[data-sr-table]').dataset.srTable,rows=stockRoomModel.tableItems(data,id),at=rows.findIndex(i=>i.id===row.dataset.srRow),next=e.key==='ArrowUp'?at-1:at+1;if(next<0||next>=rows.length)return;stockRowsMove(id,row.dataset.srRow,e.key==='ArrowUp'?rows[next].id:rows[next+1]?.id);document.querySelector('[data-sr-row="'+CSS.escape(row.dataset.srRow)+'"] .sr-order-label')?.focus();};});}
const stockOrderTextRenderBefore=stockRoomRender;
stockRoomRender=function(){stockOrderTextRenderBefore();stockOrderTextBind();applyStockLocationText();};
if(reserves===stockOrderTextRenderBefore)reserves=stockRoomRender;if(familyRenderStock===stockOrderTextRenderBefore)familyRenderStock=stockRoomRender;
let stockRowGesture=null,stockRowSkipClick=0;
window.addEventListener('pointerdown',e=>{const label=e.target.closest('.sr-order-label');if(page!=='Réserves'||!label||e.button!==0)return;const row=label.closest('[data-sr-row]');e.preventDefault();e.stopImmediatePropagation();stockRowGesture={pointer:e.pointerId,start:e.clientY,row,id:row.closest('[data-sr-table]').dataset.srTable,source:row.dataset.srRow,moved:false,before:null,body:row.closest('.sr-body')};try{row.setPointerCapture(e.pointerId);}catch{}},true);
window.addEventListener('pointermove',e=>{const d=stockRowGesture;if(!d||d.pointer!==e.pointerId)return;if(!d.moved&&Math.abs(e.clientY-d.start)<4)return;e.preventDefault();e.stopImmediatePropagation();d.moved=true;const bounds=d.body.getBoundingClientRect();if(e.clientY<bounds.top+24)d.body.scrollTop-=10;else if(e.clientY>bounds.bottom-24)d.body.scrollTop+=10;const rows=[...d.row.parentElement.querySelectorAll('[data-sr-row]')].filter(r=>r!==d.row),next=rows.find(r=>e.clientY<r.getBoundingClientRect().top+r.getBoundingClientRect().height/2);d.before=next?.dataset.srRow||null;if(!d.marker){d.marker=document.createElement('div');d.marker.className='sr-row-order-marker';document.body.append(d.marker);}const r=(next||rows.at(-1)||d.row).getBoundingClientRect();Object.assign(d.marker.style,{left:r.left+'px',top:(next?r.top:r.bottom)+'px',width:r.width+'px'});},true);
function stockRowEnd(e){const d=stockRowGesture;if(!d||d.pointer!==e.pointerId)return;stockRowGesture=null;d.marker?.remove();try{d.row.releasePointerCapture(e.pointerId);}catch{}if(!d.moved)return;e.preventDefault();e.stopImmediatePropagation();stockRowSkipClick=Date.now()+300;if(e.type!=='pointercancel')stockRowsMove(d.id,d.source,d.before);}
window.addEventListener('pointerup',stockRowEnd,true);window.addEventListener('pointercancel',stockRowEnd,true);
window.addEventListener('click',e=>{if(Date.now()<stockRowSkipClick&&e.target.closest('.sr-order-label')){e.preventDefault();e.stopImmediatePropagation();}},true);
function stockLocationText(id){const p=(visualEditSession?.draft||data.visualPreferences).stockLocationText?.modes||{};return {...p.desktop?.[id],...p[sharedMode()]?.[id]};}
const stockLocationTextStyle=document.createElement('style');document.head.append(stockLocationTextStyle);
const stockActivePlaceAppearanceCSS='#main #stockRoomNav [data-sr-location][aria-pressed="true"]{font-weight:700!important;background:rgba(255,250,238,.98)!important;border-color:#8b5b37!important;box-shadow:inset 0 1px 0 #ffffffd9!important;}#main #stockRoomNav .sr-place-tab:has(>[data-sr-location][aria-pressed="true"]){filter:drop-shadow(0 2px 3px #46271338);}#main #stockRoomNav [data-sr-location][aria-pressed="true"]>.sr-place-label{display:inline-block;transform:scale(1.04);transform-origin:center;}';
function applyStockLocationText(){let css='';for(const l of data.familyShopping?.locations||[]){const button=document.querySelector('#stockRoomNav [data-sr-location='+JSON.stringify(l.id)+']');if(button&&!button.querySelector(':scope>.sr-place-label')){const label=document.createElement('span');label.className='sr-place-label';while(button.firstChild)label.append(button.firstChild);button.append(label);}const p=stockLocationText(l.id);let style='';for(const [k,name,suffix]of [['fontFamily','font-family',''],['fontSize','font-size','px'],['fontWeight','font-weight',''],['fontStyle','font-style','']])if(p[k]!==undefined)style+=name+':'+p[k]+suffix+'!important;';if(style)css+='#main #stockRoomNav [data-sr-location='+JSON.stringify(l.id)+']{'+style+'}';}css+=stockActivePlaceAppearanceCSS;if(stockLocationTextStyle.textContent!==css)stockLocationTextStyle.textContent=css;}
const stockLocationTextApplyBefore=applyVisualPreferences;
applyVisualPreferences=function(){stockLocationTextApplyBefore();applyStockLocationText();};
function stockTextSelect(id){familyClose();if(!visualEditSession)startVisualEditor();const l=familyState().locations.find(l=>l.id===id);selectVisualTarget('shared-item:stock-room-navigation|'+stockRoomLocationKey(l));}
const stockTextLocationDialogBefore=stockSimpleEditLocation;
stockSimpleEditLocation=function(id){stockTextLocationDialogBefore(id);const form=$('#srEditLocation');if(!form)return;const button=document.createElement('button');button.type='button';button.textContent='Police, taille, gras et italique…';button.dataset.stockLocationTypography=id;button.onclick=()=>stockTextSelect(id);form.append(button);};
const stockTextEditorBefore=renderVisualEditor;
renderVisualEditor=function(){stockTextEditorBefore();const panel=$('#visualEditorPanel');if(!panel)return;const target=sharedTarget(visualEditSession?.key),locationId=target?.group.entry.id==='stock-room-navigation'?target.item?.el.dataset.srPlace:null;
 if(locationId){const p=stockLocationText(locationId),button=document.querySelector('[data-sr-location='+JSON.stringify(locationId)+']'),cs=getComputedStyle(button),box=document.createElement('fieldset');box.id='stockLocationTextControls';box.innerHTML='<legend>Texte de ce lieu</legend><label class="visual-field">Police<select data-stock-place-font="fontFamily">'+['Segoe UI','Arial','Verdana','Georgia','Tahoma'].map(n=>'<option '+((p.fontFamily||'Segoe UI')===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label><label class="visual-field">Taille du texte<input type="number" min="9" max="36" data-stock-place-font="fontSize" value="'+(p.fontSize||parseFloat(cs.fontSize))+'"></label><label><input type="checkbox" data-stock-place-font="fontWeight" '+((p.fontWeight??parseFloat(cs.fontWeight))>=700?'checked':'')+'> Gras</label> <label><input type="checkbox" data-stock-place-font="fontStyle" '+((p.fontStyle||cs.fontStyle)==='italic'?'checked':'')+'> Italique</label>';panel.querySelector('#sharedGroupControls')?.prepend(box);box.querySelectorAll('[data-stock-place-font]').forEach(input=>input.oninput=()=>{if(input.type==='number'&&input.value==='')return;const root=visualEditSession.draft;root.stockLocationText??={modes:{desktop:{},mobile:{}}};const mode=sharedMode();root.stockLocationText.modes[mode]??={};const cfg=root.stockLocationText.modes[mode][locationId]??={};cfg[input.dataset.stockPlaceFont]=input.dataset.stockPlaceFont==='fontWeight'?(input.checked?700:400):input.dataset.stockPlaceFont==='fontStyle'?(input.checked?'italic':'normal'):input.type==='number'?Number(input.value):input.value;applyVisualPreferences();});}
 const id=srId(visualEditSession?.key);if(id){const box=document.createElement('fieldset');box.innerHTML='<legend>Rangement des produits</legend><label><input type="checkbox" data-stock-show-az '+(stockRowConfig(id).showAZ!==false?'checked':'')+'> Afficher le bouton A Z</label><p>Glissez le nom d’un produit pour conserver votre ordre sur l’étagère. A Z remet un ordre alphabétique.</p>';panel.querySelector('#srStyleControls')?.prepend(box);box.querySelector('input').onchange=e=>stockRowsChange(id,p=>p.showAZ=e.target.checked);}
};
const stockTextResetBefore=resetVisualElement;
resetVisualElement=function(){const target=sharedTarget(visualEditSession?.key),id=target?.group.entry.id==='stock-room-navigation'?target.item?.el.dataset.srPlace:null;if(id){delete visualEditSession.draft.stockLocationText?.modes?.[sharedMode()]?.[id];}stockTextResetBefore();};
const recipeAZPrepareBefore=prepareRecipeGroup;
prepareRecipeGroup=function(){recipeAZPrepareBefore();const frame=$('#catalog [data-recipe-layout-item=sort]'),button=frame?.querySelector('button');if(!button)return;frame.dataset.recipeLayoutName='A Z';button.dataset.recipeOriginalLabel='A Z';const label=recipeGroupConfig().items.sort?.label;if(!label||/trier/i.test(label)){if(!button.querySelector('.sr-sort-icon'))button.innerHTML=stockAZIcon();button.title='A Z — classer les recettes par ordre alphabétique';button.setAttribute('aria-label',button.title);}};
const stockOrderTextCSS=document.createElement('style');stockOrderTextCSS.textContent='.sr-page .sr-order-label{cursor:grab;touch-action:none}.sr-page .sr-order-label:focus-visible{outline:1px solid #805230;outline-offset:2px}.sr-row-order-marker{position:fixed;z-index:5000;height:2px;background:#805230;pointer-events:none}.sr-page [data-sr-az][hidden]{display:none!important}#stockLocationTextControls{display:block;margin:0 0 10px;padding:8px}';document.head.append(stockOrderTextCSS);
if(page==='Réserves')stockRoomRender();if(page==='Recettes')prepareRecipeGroup();

const stockSortIconStyle=document.createElement('style');stockSortIconStyle.textContent='.sr-sort-icon{display:inline-block;width:20px;height:20px;vertical-align:middle;pointer-events:none}.sr-page .sr-header [data-sr-az]{margin:0;font-size:12px;font-weight:400;padding:4px 6px;border:1px solid #b79c7c80;background:#fff4e29c;border-radius:7px;white-space:nowrap}.sr-page .sr-header [data-sr-az] .sr-sort-icon{width:16px;height:16px;stroke-width:1.2}.sr-page [data-sr-az],#catalog [data-recipe-layout-item=sort]>button{display:inline-flex;align-items:center;justify-content:center}';document.head.append(stockSortIconStyle);

/* One saved Stock action; restore only its changes, never an old database. */
const stockUndoStorageKey='bazar-stock-last-undo-v1';
let stockUndoApplying=false;
function stockUndoRead(){try{const v=JSON.parse(localStorage.getItem(stockUndoStorageKey));return v?.version===1&&Array.isArray(v.changes)?v:null;}catch{return null;}}
function stockUndoSame(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function stockUndoChanges(a,b,path=[],out=[]){
 if(stockUndoSame(a,b))return out;
 if(path.join('.')==='visualPreferences.stockRoomTables.view')return out;
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
  for(const k of new Set([...Object.keys(a),...Object.keys(b)]))stockUndoChanges(a[k],b[k],[...path,k],out);
 }else out.push({path,before:a,after:b,hadBefore:a!==undefined,hadAfter:b!==undefined});
 return out;
}
function stockUndoCurrent(path){let v=data;for(const k of path)v=v?.[k];return v;}
function stockUndoAssign(change,side){let target=data;const path=change.path;for(const k of path.slice(0,-1))target=target[k]??={};const key=path.at(-1);if(change[side==='before'?'hadBefore':'hadAfter'])target[key]=structuredClone(change[side]);else delete target[key];}
const stockUndoSaveBefore=save;
save=function(){
 if(stockUndoApplying||page!=='Réserves')return stockUndoSaveBefore();
 let previous;try{previous=JSON.parse(localStorage.getItem('bazar-organise-v1'));}catch{}
 const changes=[];if(previous)for(const key of new Set([...Object.keys(previous),...Object.keys(data)].filter(k=>['inventory','familyShopping','visualPreferences','shops','productFamilies','manualShopping'].includes(k)||k.startsWith('shopping'))))stockUndoChanges(previous[key],data[key],[key],changes);
 if(!changes.length)return stockUndoSaveBefore();
 const old=localStorage.getItem(stockUndoStorageKey);
 try{localStorage.setItem(stockUndoStorageKey,JSON.stringify({version:1,changes}));}catch{toast('Enregistrement impossible : aucune modification validée.');return false;}
 const ok=stockUndoSaveBefore();if(ok===false){if(old===null)localStorage.removeItem(stockUndoStorageKey);else localStorage.setItem(stockUndoStorageKey,old);return false;}
 queueMicrotask(()=>{if(page==='Réserves')stockRoomRenderUndo();});return ok;
};
function stockUndoLastAction(){
 if(visualEditSession)return;
 const record=stockUndoRead();if(!record)return;
 if(!record.changes.every(c=>stockUndoSame(stockUndoCurrent(c.path),c.after))){toast('Cette action ne peut plus être annulée sans écraser des changements plus récents.');return;}
 stockUndoApplying=true;let ok=false;
 try{ok=familyCommit(()=>{for(const c of record.changes)stockUndoAssign(c,'before');},false);if(ok){localStorage.removeItem(stockUndoStorageKey);stockRoomLastUndo=null;stockRoomRender();}}finally{stockUndoApplying=false;}
}
stockRoomRenderUndo=function(){
 document.querySelector('#srUndo')?.remove();const nav=document.querySelector('#stockRoomNav');if(!nav)return;
 const button=document.createElement('button');button.type='button';button.id='srUndo';button.className='sr-undo';button.textContent='↶ Annuler';button.title='Annuler la dernière action enregistrée dans Stock';button.setAttribute('aria-label',button.title);button.disabled=!stockUndoRead()||!!visualEditSession;button.onclick=stockUndoLastAction;
 const menu=nav.querySelector('#srLocations');if(menu)menu.after(button);else nav.append(button);applyVisualPreferences();
};
/* Legacy delete handlers must not replace the common saved-action undo. */
stockRoomUndo=function(){stockRoomRenderUndo();};
const stockUndoPlacementBefore=sharedConfig;
sharedConfig=function(group){
 const cfg=stockUndoPlacementBefore(group);
 if(group.entry.id==='stock-room-navigation'&&cfg.layout==='free'&&!sharedPrefs().sharedCommandGroups?.[group.entry.id]?.modes?.[sharedMode()]?.items?.srUndo){
  const item=group.items.find(i=>i.id==='srUndo'),menu=group.items.find(i=>i.id==='srLocations');
  if(item&&menu){const p=cfg.items.srLocations||{},x=p.x??menu.el.offsetLeft,y=p.y??menu.el.offsetTop,w=98,mw=p.width||menu.el.offsetWidth,limit=innerWidth-group.root.getBoundingClientRect().left-8-w;
   cfg.items.srUndo={x:Math.max(0,x+mw+8<=limit?x+mw+8:Math.min(limit,x-w-8)),y,width:w,height:34};}
 }
 return cfg;
};
if(page==='Réserves')stockRoomRenderUndo();
