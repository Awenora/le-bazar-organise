/* Weekly purchase presentation only: catalogue habits and purchase identities never move. */
(function(){'use strict';
 const weekKey=()=>datekey(coursesWeek()),field='shoppingWeeklyDestinations';
 const destination=item=>item?.identity?data[field]?.[weekKey()]?.[item.identity]?.store:undefined;
 window.BazarSimpleCourses={destination};
 const priorStore=storeOf,priorFamily=familyOf;
 const unresolved=item=>!item.automaticRestock&&!destination(item)&&priorStore(item)==='À affecter';
 storeOf=function(item){if(!item?.identity)return priorStore(item);if(item.automaticRestock)return priorStore(item);return destination(item)||(unresolved(item)?'Autres':priorStore(item));};
 familyOf=function(item){return item?.identity&&unresolved(item)?'Magasin à choisir':priorFamily(item);};
 if(!courseUndoFields.includes(field))courseUndoFields.push(field);
 coursesUndoBaseline=courseUndoState();
 function move(item,store){
  if(visualEditSession||!['Lidl','Intermarché','Autres','Carrefour'].includes(store))return false;
  const before=structuredClone(data[field]);data[field]??={};data[field][weekKey()]??={};data[field][weekKey()][item.identity]={store};
  if(!save()){if(before===undefined)delete data[field];else data[field]=before;return false;}shopping();return true;
 }
 function remove(item){
  if(visualEditSession)return;const wk=weekKey(),before=structuredClone(data.shoppingExcluded);
  courseList.exclude(data,wk,item);
  if(!save()){if(before===undefined)delete data.shoppingExcluded;else data.shoppingExcluded=before;return;}
  courseLastExcluded=null;shopping();
 }
 let dragged=null;
 function decorate(){
  if(page!=='Courses')return;const items=shoppingItems(),wk=weekKey(),counts=courseList.counts(items,courseList.weekState(data,wk)),bar=document.querySelector('.courses-list-toolbar');if(!bar)return;
  for(const selector of ['.courses-store-filter','#coursePendingOpen','#listOrganizer','#listExcluded','.courses-add-store','#courseStoreHandles'])document.querySelectorAll(selector).forEach(el=>el.remove());
  const total=document.createElement('strong');total.id='courseTotalCount';total.className='courses-remaining';total.dataset.siteVisualKey='course:control-total';total.textContent=counts.total+' article'+(counts.total===1?'':'s')+' au total';bar.append(total);
  const keep=new Set(['courses-arrow-nav']);for(const child of [...bar.children]){if(child.id==='listHideChecked'||child.id==='listUndo'||child.id==='courseTotalCount'||child.classList.contains('courses-remaining')||[...keep].some(c=>child.classList.contains(c)))continue;child.remove();}
  const undo=bar.querySelector('#listUndo');if(undo){undo.hidden=!(window.BazarCloud?(BazarCloud.engine.state.actions||[]).length:(typeof coursesUndoStack!=='undefined'&&coursesUndoStack.length));undo.onclick=()=>undoCoursesAction();}
  for(const labels of document.querySelectorAll('.course-column-labels')){labels.classList.add('course-simple-columns');if(labels.children.length===6)labels.lastElementChild.remove();}
  for(const row of document.querySelectorAll('.courses-line[data-course-index]')){
   const item=items[Number(row.dataset.courseIndex)];if(!item)continue;row.classList.add('course-simple-line');
   const stock=row.querySelector('.course-inline-stock'),menu=row.querySelector('.course-stock-menu'),product=row.querySelector('.courses-product');
   if(stock&&menu){const actions=document.createElement('span');actions.className='course-simple-actions';const cross=document.createElement('button');cross.type='button';cross.className='course-simple-remove';cross.dataset.courseCell='menu';cross.dataset.listRemove=row.dataset.courseIndex;cross.textContent='×';cross.title='Retirer cet achat de la semaine';cross.setAttribute('aria-label','Retirer cet achat : '+item.name);cross.onclick=()=>remove(item);stock.before(actions);actions.append(stock,cross);const legacy=document.createElement('span');legacy.hidden=true;legacy.className='course-simple-legacy';menu.replaceWith(legacy);legacy.append(menu);}
   if(!product)continue;
   product.querySelectorAll('.courses-shop-provenance').forEach(el=>el.remove());
   const name=product.querySelector('.course-product-name');if(name){name.draggable=!visualEditSession;name.addEventListener('dragstart',event=>{if(visualEditSession){event.preventDefault();return;}dragged={item,wk};event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-bazar-purchase',item.identity);});name.addEventListener('dragend',()=>{dragged=null;document.querySelectorAll('.course-simple-drop').forEach(el=>el.classList.remove('course-simple-drop'));});}
   const select=document.createElement('select');select.className='course-simple-destination';select.setAttribute('aria-label','Déplacer vers un magasin pour cette semaine : '+item.name);select.innerHTML='<option value="">Déplacer vers…</option>'+['Lidl','Intermarché','Autres',...(item.automaticRestock?['Carrefour']:[])].map(store=>'<option>'+esc(store)+'</option>').join('');select.onchange=()=>{if(select.value&&!move(item,select.value))select.value='';};product.append(select);
   if(item.stockIssue){const note=document.createElement('small');note.className='course-simple-issue';note.id='course-stock-issue-'+row.dataset.courseIndex;note.textContent=item.stockIssue+' '+(/Stock inconnue|unité du Stock|Unités incompatibles|unités incompatibles/.test(item.stockIssue)?'Dans Stock, vérifie la quantité et le format du produit.':'Renseigne ici la quantité à acheter et le format ; les unités du Stock doivent correspondre.');product.append(note);row.querySelector('[data-list-quantity]')?.setAttribute('aria-describedby',note.id);}
  }
  for(const table of document.querySelectorAll('[data-course-primary]')){
   table.addEventListener('dragover',event=>{if(!dragged||visualEditSession||dragged.wk!==weekKey())return;event.preventDefault();event.dataTransfer.dropEffect='move';table.classList.add('course-simple-drop');});
   table.addEventListener('dragleave',event=>{if(!table.contains(event.relatedTarget))table.classList.remove('course-simple-drop');});
   table.addEventListener('drop',event=>{if(!dragged||visualEditSession||dragged.wk!==weekKey())return;event.preventDefault();event.stopPropagation();const {item}=dragged;dragged=null;move(item,event.target.closest('[data-restock-store]')?.dataset.restockStore||table.dataset.coursePrimary);});
  }
 }
 // A newly added counter gets a free slot without rewriting saved command positions.
 const priorConfig=sharedConfig;sharedConfig=function(group){const cfg=priorConfig(group);if(group.entry.id==='courses-tools'&&cfg.layout==='free'){
  const entry=group.items.find(i=>i.id==='courseTotalCount'),own=cfg.items.courseTotalCount||{};
  if(entry&&!Number.isFinite(own.x)&&!Number.isFinite(own.y)){
   const bounds=group.root.getBoundingClientRect(),peers=group.items.filter(i=>i!==entry&&!i.el.hidden).map(i=>{const p=cfg.items[i.id]||{},r=i.el.getBoundingClientRect();return {x:p.x??r.left-bounds.left,y:p.y??r.top-bounds.top,w:p.width||r.width,h:p.height||r.height};});
   const right=Math.max(0,...peers.map(p=>p.x+p.w)),bottom=Math.max(0,...peers.map(p=>p.y+p.h)),width=entry.el.offsetWidth||160,available=group.root.clientWidth||innerWidth;
   cfg.items.courseTotalCount={...own,x:right+10+width<=available?right+10:0,y:right+10+width<=available?0:bottom+8};
  }
 }return cfg;};
 const priorShopping=shopping;shopping=function(...args){const result=priorShopping.apply(this,args);decorate();return result;};
 visualSiteRegistry.push({key:'ui:course-week-move',selector:'.course-simple-destination',label:'Courses · Déplacer un achat (téléphone)',min:70,max:300});
 visualSiteRegistry.push({key:'ui:course-week-remove',selector:'.course-simple-remove',label:'Courses · Croix de retrait',min:20,max:60});
})();
