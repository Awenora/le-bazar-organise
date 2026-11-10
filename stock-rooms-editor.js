/* Table settings share the existing draft, Save, Cancel and Restore controls. */
const srKey=id=>'stock-room-table:'+id;
const srId=key=>typeof key==='string'&&key.startsWith('stock-room-table:')?key.slice(17):null;
const stockRoomPositionLimit=100000;
const srCleanBefore=cleanVisualPreferences;
cleanVisualPreferences=function(raw){const out=srCleanBefore(raw);if(raw?.stockRoomTables){const p=raw.stockRoomTables;out.stockRoomTables={view:structuredClone(p.view||{}),cartSizes:structuredClone(p.cartSizes||{}),modes:{desktop:{},mobile:{}}};for(const mode of ['desktop','mobile'])for(const [id,s]of Object.entries(p.modes?.[mode]||{})){const v={};for(const [k,n]of Object.entries(s)){if(typeof n==='boolean'&&['hidden','separators'].includes(k))v[k]=n;else if(typeof n==='number'&&Number.isFinite(n))v[k]=Math.max(k==='x'?-stockRoomPositionLimit:0,Math.min(['x','y'].includes(k)?stockRoomPositionLimit:3000,n));else if(typeof n==='string'&&['title','emoji','fontFamily','background','color','titleColor','separatorColor','stripeOdd','stripeEven'].includes(k))v[k]=n.slice(0,100);}out.stockRoomTables.modes[mode][id]=v;}}return out;};
const srSelectorBefore=visualSelector;
visualSelector=function(key){return srId(key)?'#sr-table-'+CSS.escape(srId(key)):srSelectorBefore(key);};
const srCandidatesBefore=allVisualCandidates;
allVisualCandidates=function(){const list=srCandidatesBefore();if(page==='Réserves')for(const t of stockRoomState().tables.filter(t=>!t.deletedAt&&t.locationId===stockRoomLocation().id)){const el=document.getElementById('sr-table-'+t.id);if(el)list.push({key:srKey(t.id),el,label:'Stock · '+(stockRoomStyle(t).title||t.name)+(stockRoomStyle(t).hidden?' (masqué)':''),min:180,max:1800});}return list;};
const srValuesBefore=visualValues;
visualValues=function(key){return srId(key)?{}:srValuesBefore(key);};
function stockRoomSelect(id){if(!visualEditSession)startVisualEditor();selectVisualTarget(srKey(id));}
function stockRoomChange(id,key,value){if(!visualEditSession)return;stockRoomFreezeLayout();const prefs=stockRoomPrefs(),layout=stockRoomLayout(),own=layout.find(r=>r.t.id===id),cfg=prefs.modes[sharedMode()][id]??={};if(key==='cartSize'){prefs.cartSizes??={};prefs.cartSizes[sharedMode()]=Math.max(24,Math.min(48,value));}else if(key==='column'||key==='order'){const column=key==='column'?value:own.column,peers=layout.filter(r=>r.t.id!==id&&r.column===column).sort((a,b)=>a.y-b.y),index=key==='order'?Math.max(0,Math.round(value)):peers.length;stockRoomPlaceTable(id,column,peers[index]?.y??(peers.length?peers.at(-1).y+peers.at(-1).height+peers.at(-1).gap:0));}else if(key==='y')stockRoomPlaceTable(id,own.column,Math.max(0,value));else if(key==='height'){cfg.height=Math.max(120,Math.min(3000,value));}else if(key==='tableGap'){cfg.tableGap=Math.max(0,value);const delta=cfg.tableGap-own.gap;for(const r of layout.filter(r=>r.column===own.column&&r.y>own.y))prefs.modes[sharedMode()][r.t.id].y=Math.max(own.y+own.height,r.y+delta);}else cfg[key]=value;applyVisualPreferences();}
const srEditorBefore=renderVisualEditor;
renderVisualEditor=function(){srEditorBefore();const id=srId(visualEditSession?.key);if(!id)return;const t=stockRoomState().tables.find(t=>t.id===id&&!t.deletedAt);if(!t)return;const p={...stockRoomStyle(t),title:stockRoomStyle(t).title||t.name,emoji:stockRoomStyle(t).emoji??t.emoji,y:stockRoomLayout().find(r=>r.t.id===id)?.y||0},box=document.createElement('div');box.id='srStyleControls';const sections=[['Titre et disposition',{title:'Titre',emoji:'Emoji',hidden:'Masquer (récupérable dans la liste)',column:'Colonne (0, 1 ou 2)',order:'Ordre dans la colonne',x:'Position horizontale',y:'Position verticale',width:'Largeur (0 = remplir la colonne)',height:'Hauteur du tableau',tableGap:'Espace après ce tableau'}],['Textes et fond',{fontFamily:'Police',fontSize:'Taille du texte',fontWeight:'Gras (400 normal, 700 gras)',color:'Couleur des textes',titleSize:'Taille du titre',titleColor:'Couleur du titre',background:'Fond',alpha:'Opacité (%)'}],['Lignes et dimensions',{padding:'Marges intérieures',rowSpace:'Espacement des lignes',colGap:'Espacement des colonnes',quantityWidth:'Largeur Stock',formatWidth:'Largeur Format',productWidth:'Largeur minimale Produit (0 = automatique)',headerWeight:'Gras des sous-titres (400 normal, 700 gras)',headerSize:'Taille des sous-titres (0 = automatique)',buyWidth:'Largeur Caddie',cartSize:'Taille des caddies (tous les tableaux)',radius:'Arrondi',borderWidth:'Épaisseur de la bordure',separators:'Séparateurs',separatorColor:'Couleur des séparateurs',stripeOdd:'Lignes impaires',stripeEven:'Lignes paires'}]];box.innerHTML=sections.map(([label,fields],index)=>'<details '+(!index?'open':'')+'><summary>'+label+'</summary>'+Object.entries(fields).map(([k,label])=>'<label class="visual-field">'+label+'<input data-sr-style="'+k+'" type="'+(typeof p[k]==='boolean'?'checkbox':typeof p[k]==='number'?'number':/^#/.test(p[k])?'color':'text')+'" '+(typeof p[k]==='boolean'?(p[k]?'checked':''):'value="'+esc(p[k]??'')+'"')+'></label>').join('')+'</details>').join('');$('#visualEditorPanel .visual-editor-actions').before(box);if($('#visualReset'))$('#visualReset').textContent='Rétablir l’apparence du tableau (conserver sa position)';box.querySelectorAll('[data-sr-style]').forEach(input=>input.oninput=()=>{if(input.type==='number'&&input.value==='')return;let v=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;if(input.dataset.srStyle==='column')v=Math.max(0,Math.min(2,Math.round(v)));stockRoomChange(id,input.dataset.srStyle,v);});};
const srResetBefore=resetVisualElement;
resetVisualElement=function(){const id=srId(visualEditSession?.key);if(!id)return srResetBefore();stockRoomFreezeLayout();const layout=stockRoomLayout(),old=layout.find(r=>r.t.id===id),cfg=stockRoomPrefs().modes[sharedMode()];cfg[id]={column:old.column,order:stockRoomStyle(old.t).order,y:old.y};const next=layout.filter(r=>r.column===old.column&&r.y>old.y).sort((a,b)=>a.y-b.y)[0];cfg[id].height=Math.max(120,Math.min(stockRoomStyle(old.t).height,next?next.y-old.y-4:3000));applyVisualPreferences();renderVisualEditor();};
sharedVisualGroups.push({id:'stock-room-welcome',name:'Stock · Bandeau d’accueil',selector:'.sr-page',items:':scope > #stockRoomWelcome',essential:true},{id:'stock-room-navigation',name:'Stock · Navigation des lieux',selector:'#stockRoomNav',items:':scope > *',essential:true},{id:'stock-room-tools',name:'Stock · Commandes des lieux',selector:'#stockRoomTools',items:':scope > *',essential:true});
const srApplyBefore=applyVisualPreferences;
applyVisualPreferences=function(){srApplyBefore();if(page!=='Réserves'||!document.querySelector('.sr-page'))return;const tables=stockRoomState().tables.filter(t=>!t.deletedAt&&t.locationId===stockRoomLocation().id),layout=stockRoomLayout();for(const t of tables){const el=document.getElementById('sr-table-'+t.id);if(!el)continue;const p=stockRoomStyle(t),r=layout.find(r=>r.t.id===t.id);el.hidden=p.hidden;if(r){el.style.top=r.y+'px';el.style.left=(p.x||0)+'px';}el.style.fontFamily=p.fontFamily+',sans-serif';el.style.fontSize=p.fontSize+'px';el.style.fontWeight=p.fontWeight;el.style.color=p.color;el.style.width=p.width?p.width+'px':'100%';el.style.maxWidth='100%';el.style.height=Math.max(120,p.height)+'px';el.style.marginBottom=p.tableGap+'px';el.style.borderRadius=p.radius+'px';el.style.borderWidth=p.borderWidth+'px';const rgb=[1,3,5].map(i=>parseInt(p.background.slice(i,i+2),16));el.style.background='rgba('+rgb.join(',')+','+p.alpha/100+')';for(const k of ['padding','rowSpace','colGap','quantityWidth','formatWidth','buyWidth','titleSize','borderWidth','cartSize'])el.style.setProperty('--sr-'+k,p[k]+'px');for(const k of ['titleColor','separatorColor','stripeOdd','stripeEven'])el.style.setProperty('--sr-'+k,p[k]);el.style.setProperty('--sr-productWidth',p.productWidth?p.productWidth+'px':'auto');el.style.setProperty('--sr-headerWeight',p.headerWeight);el.style.setProperty('--sr-headerSize',p.headerSize?p.headerSize+'px':'.75em');el.style.setProperty('--sr-separator',p.separators?'1px':'0px');const body=el.querySelector('.sr-body');body.style.maxHeight='';const grid=body.querySelector('table'),required=p.quantityWidth+p.formatWidth+(p.productWidth||72)+Math.max(p.cartSize,p.buyWidth);grid.style.minWidth=required+'px';grid.style.width='100%';grid.querySelector('.sr-product-col').style.width='auto';for(const [selector,value]of [['[data-sr-title]',p.title||t.name],['[data-sr-emoji]',p.emoji??t.emoji]]){const node=el.querySelector(selector);if(node.textContent!==value)node.textContent=value;}}
 for(let n=0;n<3;n++){const col=document.querySelector('[data-sr-column=\"'+n+'\"]');if(col)col.style.height=Math.max(100,...layout.filter(r=>r.column===n).map(r=>r.y+r.height))+'px';}for(let n=0;n<3;n++){const col=document.querySelector('[data-sr-column="'+n+'"]'),desired=tables.filter(t=>stockRoomStyle(t).column===n).sort((a,b)=>stockRoomStyle(a).order-stockRoomStyle(b).order).map(t=>document.getElementById('sr-table-'+t.id));if(col&&desired.some((el,i)=>col.children[i]!==el))for(const el of desired)if(el)col.append(el);}
 stockRoomKeepTablesInBounds();
};

function stockRoomKeepTablesInBounds(){
 const board=document.querySelector('.sr-columns');
 const moved=[...board.querySelectorAll('.sr-table:not([hidden])')].filter(el=>parseFloat(el.style.left));
 if(!moved.length)return;
 const bounds=board.getBoundingClientRect();
 const positions=moved.map(el=>{
  const column=el.parentElement.getBoundingClientRect(),width=el.offsetWidth;
  return [el,Math.max(bounds.left-column.left,Math.min(bounds.right-column.left-width,parseFloat(el.style.left)))];
 });
 for(const [el,x]of positions)el.style.left=x+'px';
}
/* The existing table preferences also back direct manipulation outside the editor. */
function stockRoomLayout(){const tables=stockRoomState().tables.filter(t=>!t.deletedAt&&t.locationId===stockRoomLocation().id),out=[];for(let column=0;column<3;column++){let next=0;for(const t of tables.filter(t=>stockRoomStyle(t).column===column).sort((a,b)=>stockRoomStyle(a).order-stockRoomStyle(b).order)){const p=stockRoomStyle(t);if(p.hidden)continue;const height=Math.max(120,p.height),y=Number.isFinite(p.y)?p.y:next;out.push({t,column,y,height,gap:p.tableGap});next=Math.max(next,y+height+p.tableGap);}}return out;}
function stockRoomPlaceTable(id,column,y){const prefs=stockRoomPrefs().modes[sharedMode()],layout=stockRoomLayout(),r=layout.find(r=>r.t.id===id),own=prefs[id];own.column=column;own.x=0;own.y=y;let bottom=y+r.height+r.gap;for(const p of layout.filter(p=>p.t.id!==id&&p.column===column&&p.y+p.height>y).sort((a,b)=>a.y-b.y)){prefs[p.t.id].y=Math.max(p.y,bottom);bottom=prefs[p.t.id].y+p.height+p.gap;}const same=layout.filter(p=>p.t.id!==id&&p.column===column).map(p=>({id:p.t.id,y:prefs[p.t.id].y}));same.push({id,y});same.sort((a,b)=>a.y-b.y).forEach((p,index)=>prefs[p.id].order=index);}
function stockRoomFreezeLayout(){const layout=stockRoomLayout(),prefs=stockRoomPrefs(),mode=sharedMode();prefs.modes??={};prefs.modes[mode]??={};for(const r of layout){const cfg=prefs.modes[mode][r.t.id]??={};cfg.y=r.y;cfg.height=r.height;}}
function stockRoomGestureStart(){const normal=!visualEditSession;if(normal)stockRoomGesturePrefs=structuredClone(data.visualPreferences);const before=structuredClone(stockRoomPrefs());stockRoomFreezeLayout();return {normal,before};}
function stockRoomGestureFinish(d,cancel){if(d.normal){const next=stockRoomGesturePrefs;stockRoomGesturePrefs=null;if(!cancel){const before=data.visualPreferences;data.visualPreferences=cleanVisualPreferences(next);try{if(!save())throw Error('Enregistrement impossible');}catch(e){data.visualPreferences=before;toast(e.message);}}}else if(cancel)visualEditSession.draft.stockRoomTables=d.before;applyVisualPreferences();if(visualEditSession)renderVisualEditor();}
let stockRoomSkipClick=0,stockRoomResize=null;

function stockRoomSelectGesture(el,id){
 if(!visualEditSession)return;
 visualEditSession.key=srKey(id);
 document.querySelectorAll('[data-visual-selected]').forEach(node=>node.removeAttribute('data-visual-selected'));
 el.setAttribute('data-visual-selected','true');
}

function stockRoomPointerDown(e){
 if(phoneAppearanceLocked||page!=='Réserves'||e.button!==0||stockRoomDrag||stockRoomResize)return;
 const move=e.target.closest('[data-sr-grip],.sr-heading'),size=e.target.closest('[data-sr-resize]');
 const el=(move||size)?.closest('[data-sr-table]');
 if(!el||el.hidden)return;
 e.preventDefault();
 e.stopImmediatePropagation();
 const id=el.dataset.srTable,r=el.getBoundingClientRect();
 const d={id,el,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,width:r.width,height:r.height,moved:false};
 stockRoomSelectGesture(el,id);
 if(size){
  stockRoomResize={...d,...stockRoomGestureStart(),maxWidth:el.parentElement.clientWidth,maxHeight:3000};
 }else{
  const column=el.parentElement,board=column.closest('.sr-columns'),viewport=board.closest('.sr-page'),origin=column.getBoundingClientRect();
  stockRoomDrag={...d,column,board,viewport,mode:sharedMode(),session:visualEditSession,
   offsetX:e.clientX-r.left,offsetY:e.clientY-r.top,x:r.left-origin.left,y:r.top-origin.top,
   scrollLimit:viewport.scrollHeight-viewport.clientHeight,translate:el.style.translate,zIndex:el.style.zIndex,frame:0};
 }
 try{document.documentElement.setPointerCapture(e.pointerId);}catch{}
}

function stockRoomDrop(d,clientX,clientY){
 const board=d.board.getBoundingClientRect(),view=d.viewport.getBoundingClientRect(),col=d.column.getBoundingClientRect();
 const left=Math.max(board.left,view.left,0),right=Math.min(board.right,view.right,innerWidth);
 const top=Math.max(col.top,view.top,0),bottom=Math.min(view.bottom,innerHeight);
 if(right<=left||bottom<=top||d.width>right-left+1)return null;
 const visibleHeight=bottom-top,headerHeight=d.el.querySelector('.sr-header').offsetHeight;
 const height=d.height<=visibleHeight?d.height:Math.min(headerHeight,visibleHeight);
 const x=Math.round(Math.max(left,Math.min(right-d.width,clientX-d.offsetX))-col.left);
 const y=Math.round(Math.max(top,Math.min(bottom-height,clientY-d.offsetY))-col.top);
 if(Math.abs(x)>stockRoomPositionLimit||y>stockRoomPositionLimit)return null;
 return {x,y,left:col.left+x,top:col.top+y};
}

function stockRoomMoveFrame(){
 const d=stockRoomDrag;
 if(!d)return;
 d.frame=0;
 if(!d.el.isConnected){stockRoomEndMove(d,true);return;}
 const view=d.viewport.getBoundingClientRect(),before=d.viewport.scrollTop;
 if(d.clientY<view.top+28&&before>0)d.viewport.scrollTop=Math.max(0,before-12);
 else if(d.clientY>view.bottom-28&&before<d.scrollLimit)d.viewport.scrollTop=Math.min(d.scrollLimit,before+12);
 const drop=stockRoomDrop(d,d.clientX,d.clientY);
 if(drop)d.el.style.translate=(drop.x-d.x)+'px '+(drop.y-d.y)+'px';
 if(d.viewport.scrollTop!==before)d.frame=requestAnimationFrame(stockRoomMoveFrame);
}

function stockRoomPointerMove(e){
 const d=stockRoomResize||stockRoomDrag;
 if(!d||d.pointerId!==e.pointerId)return;
 e.preventDefault();
 e.stopImmediatePropagation();
 if(!d.moved&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)<(stockRoomResize?4:3))return;
 if(stockRoomResize){
  d.moved=true;
  const cfg=stockRoomPrefs().modes[sharedMode()][d.id];
  cfg.width=Math.round(Math.max(180,Math.min(d.maxWidth,d.width+e.clientX-d.startX)));
  cfg.height=Math.round(Math.max(120,Math.min(d.maxHeight,d.height+e.clientY-d.startY)));
  applyVisualPreferences();
  return;
 }
 if(!d.moved){
  d.moved=true;
  d.el.classList.add('sr-dragging');
  d.el.style.zIndex='1';
 }
 d.clientX=e.clientX;
 d.clientY=e.clientY;
 if(!d.frame)d.frame=requestAnimationFrame(stockRoomMoveFrame);
}

function stockRoomSaveMove(d,drop){
 const layout=stockRoomLayout(),own=layout.find(r=>r.t.id===d.id);
 if(!own)return;
 const before=data.visualPreferences;
 const next=d.session?.draft||structuredClone(before);
 const mode=(next.stockRoomTables.modes??={})[d.mode]??={};
 // Pin any automatically stacked neighbours at their current positions.
 for(const peer of layout){
  if(peer.t.id!==d.id&&peer.column===own.column&&!Number.isFinite(stockRoomStyle(peer.t).y)){
   (mode[peer.t.id]??={}).y=peer.y;
  }
 }
 Object.assign(mode[d.id]??={},{x:drop.x,y:drop.y});
 if(d.session)return;
 data.visualPreferences=next;
 try{
  if(!save())throw Error('Enregistrement impossible');
 }catch(error){
  data.visualPreferences=before;
  toast(error.message);
 }
}

function stockRoomEndMove(d,cancel,event){
 stockRoomDrag=null;
 cancelAnimationFrame(d.frame);
 d.el.classList.remove('sr-dragging');
 d.el.style.translate=d.translate;
 d.el.style.zIndex=d.zIndex;
 if(document.documentElement.hasPointerCapture(d.pointerId))document.documentElement.releasePointerCapture(d.pointerId);
 if(page!=='Réserves'||!d.el.isConnected||d.session!==visualEditSession||d.mode!==sharedMode())return;
 if(d.moved&&!cancel){
  const drop=stockRoomDrop(d,event.clientX,event.clientY);
  if(drop&&Math.hypot(drop.x-d.x,drop.y-d.y)>1){
   const occupied=[...d.board.querySelectorAll('.sr-table:not([hidden])')].some(el=>{
    if(el===d.el)return false;
    const r=el.getBoundingClientRect();
    return drop.left<r.right-1&&drop.left+d.width>r.left+1&&drop.top<r.bottom-1&&drop.top+d.height>r.top+1;
   });
   if(occupied)toast('Emplacement occupé : le tableau reste à sa place.');
   else stockRoomSaveMove(d,drop);
  }
 }
 applyVisualPreferences();
 if(visualEditSession)renderVisualEditor();
}

function stockRoomPointerEnd(e){
 const d=stockRoomResize||stockRoomDrag;
 if(!d||d.pointerId!==e.pointerId)return;
 e.preventDefault();
 e.stopImmediatePropagation();
 const cancel=e.type==='pointercancel';
 stockRoomSkipClick=Date.now()+300;
 if(stockRoomDrag)stockRoomEndMove(d,cancel,e);
 else{
  stockRoomResize=null;
  stockRoomGestureFinish(d,cancel||!d.moved);
 }
 if(document.documentElement.hasPointerCapture(e.pointerId))document.documentElement.releasePointerCapture(e.pointerId);
}
window.addEventListener('pointerdown',stockRoomPointerDown,true);
window.addEventListener('pointermove',stockRoomPointerMove,true);
window.addEventListener('pointerup',stockRoomPointerEnd,true);
window.addEventListener('pointercancel',stockRoomPointerEnd,true);
window.addEventListener('lostpointercapture',e=>{if(stockRoomDrag?.pointerId===e.pointerId)stockRoomEndMove(stockRoomDrag,true);},true);
window.addEventListener('blur',()=>{if(stockRoomDrag)stockRoomEndMove(stockRoomDrag,true);});
window.addEventListener('resize',()=>{if(stockRoomDrag)stockRoomEndMove(stockRoomDrag,true);});
window.addEventListener('keydown',e=>{
 if(e.key!=='Escape'||!stockRoomDrag)return;
 e.preventDefault();
 e.stopImmediatePropagation();
 stockRoomEndMove(stockRoomDrag,true);
},true);
window.addEventListener('click',e=>{if(page!=='Réserves'||e.target.closest('#visualEditorPanel,dialog'))return;const el=e.target.closest('[data-sr-table]');if(!el)return;if(Date.now()<stockRoomSkipClick&&e.target.closest('[data-sr-grip],[data-sr-resize],.sr-heading')){e.preventDefault();e.stopImmediatePropagation();return;}if(visualEditSession&&e.target.closest('[data-sr-col]')){e.preventDefault();e.stopImmediatePropagation();stockRoomSelectColumn(el.dataset.srTable,e.target.closest('[data-sr-col]').dataset.srCol);return;}if(!visualEditSession||e.target.closest('input,select,[data-sr-cart],[data-sr-plus],[data-sr-minus]'))return;e.preventDefault();e.stopImmediatePropagation();selectVisualTarget(srKey(el.dataset.srTable));},true);
if(page==='Réserves')reserves();

/* Direct column controls use the existing Stock table visual draft. */
const stockColumnNames={quantityWidth:'Quantité',formatWidth:'Format',productWidth:'Produit',buyWidth:'Caddie'};
let stockColumnDrag=null;
function stockRoomSelectColumn(id,key){visualEditSession.stockColumn={id,key};selectVisualTarget(srKey(id));renderVisualEditor();document.querySelector('#sr-table-'+CSS.escape(id)+' [data-sr-col="'+key+'"]')?.focus();}
function stockRoomColumnWidth(id,key){const th=document.querySelector('#sr-table-'+CSS.escape(id)+' [data-sr-col="'+key+'"]');return Math.round(th?.getBoundingClientRect().width||stockRoomStyle(stockRoomState().tables.find(t=>t.id===id))[key]||64);}
const stockColumnsEditorBefore=renderVisualEditor;
renderVisualEditor=function(){stockColumnsEditorBefore();if(page!=='Réserves'||!visualEditSession)return;const id=srId(visualEditSession.key);if(!id)return;const t=stockRoomState().tables.find(t=>t.id===id),p=stockRoomStyle(t),box=document.querySelector('#srStyleControls');if(!box)return;const section=document.createElement('details');section.open=true;section.id='srColumnsControls';const selected=visualEditSession.stockColumn?.id===id?visualEditSession.stockColumn.key:'formatWidth';section.innerHTML='<summary>Colonnes · '+esc(p.title||t.name)+'</summary><p>Clique sur un en-tête du tableau. Tire son bord droit, ou utilise ← / → sur sa poignée.</p><label>Colonne<select id="srColumnChoice">'+Object.entries(stockColumnNames).map(([key,name])=>'<option value="'+key+'" '+(selected===key?'selected':'')+'>'+name+'</option>').join('')+'</select></label><label>Largeur (px)<input id="srColumnWidth" type="number" min="28" max="1200" step="1" value="'+stockRoomColumnWidth(id,selected)+'"></label><label><input id="srHeadersBold" type="checkbox" '+(p.headerWeight>=700?'checked':'')+'> Sous-titres en gras</label>';box.prepend(section);box.querySelectorAll(':scope > details:not(#srColumnsControls)').forEach(d=>d.open=false);section.querySelector('#srColumnChoice').onchange=e=>stockRoomSelectColumn(id,e.target.value);section.querySelector('#srColumnWidth').oninput=e=>{if(e.target.value!=='')stockRoomChange(id,selected,Math.max(28,Math.min(1200,Number(e.target.value))));};section.querySelector('#srHeadersBold').onchange=e=>stockRoomChange(id,'headerWeight',e.target.checked?700:400);};
const stockColumnsApplyBefore=applyVisualPreferences;
applyVisualPreferences=function(){stockColumnsApplyBefore();if(page!=='Réserves')return;document.querySelectorAll('[data-sr-col]').forEach(th=>{th.removeAttribute('data-sr-selected-col');if(!visualEditSession){th.querySelector('.sr-col-resize')?.remove();th.removeAttribute('tabindex');return;}th.tabIndex=0;const id=th.closest('[data-sr-table]').dataset.srTable,key=th.dataset.srCol,handle=th.querySelector('.sr-col-resize')||document.createElement('span');handle.className='sr-col-resize';handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','Largeur '+stockColumnNames[key]+' : flèches gauche et droite');handle.dataset.srColumnResize=key;th.append(handle);if(visualEditSession.stockColumn?.id===id&&visualEditSession.stockColumn.key===key)th.dataset.srSelectedCol='true';});};
window.addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-sr-column-resize]');if(!handle||page!=='Réserves'||!visualEditSession||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();const id=handle.closest('[data-sr-table]').dataset.srTable,key=handle.dataset.srColumnResize;stockColumnDrag={id,key,x:e.clientX,width:stockRoomColumnWidth(id,key),before:structuredClone(visualEditSession.draft.stockRoomTables),pointerId:e.pointerId};visualEditSession.stockColumn={id,key};visualEditSession.key=srKey(id);},true);
window.addEventListener('pointermove',e=>{const d=stockColumnDrag;if(!d||d.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();stockRoomChange(d.id,d.key,Math.max(28,Math.min(1200,Math.round(d.width+e.clientX-d.x))));},true);
window.addEventListener('pointerup',e=>{if(!stockColumnDrag)return;e.preventDefault();e.stopImmediatePropagation();stockColumnDrag=null;renderVisualEditor();},true);
window.addEventListener('pointercancel',()=>{if(!stockColumnDrag)return;visualEditSession.draft.stockRoomTables=stockColumnDrag.before;stockColumnDrag=null;applyVisualPreferences();},true);
window.addEventListener('keydown',e=>{const handle=e.target.closest('[data-sr-column-resize],[data-sr-col]');if(!handle||!visualEditSession||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();const id=handle.closest('[data-sr-table]').dataset.srTable,key=handle.dataset.srColumnResize||handle.dataset.srCol;visualEditSession.stockColumn={id,key};stockRoomChange(id,key,Math.max(28,(stockRoomPrefs().modes[sharedMode()][id]?.[key]||stockRoomColumnWidth(id,key))+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?10:1)));document.querySelector('#sr-table-'+CSS.escape(id)+' [data-sr-column-resize="'+key+'"]')?.focus();},true);
