/* Weekly purchase presentation only: catalogue habits and purchase identities never move. */
(function(){'use strict';
 const weekKey=()=>datekey(coursesWeek()),field='shoppingWeeklyDestinations';
 const destination=item=>item?.identity?data[field]?.[weekKey()]?.[item.identity]?.store:undefined;
 window.BazarSimpleCourses={destination};
 const priorStore=storeOf,priorFamily=familyOf;
 const unresolved=item=>!item.automaticRestock&&!destination(item)&&priorStore(item)==='À affecter';
 storeOf=function(item){if(!item?.identity)return priorStore(item);if(item.automaticRestock)return destination(item)||priorStore(item);return destination(item)||(unresolved(item)?'Autres':priorStore(item));};
 familyOf=function(item){if(item?.identity&&item.automaticRestock&&destination(item)){const family=familyShop.routeFor(data,{catalogId:item.automaticRestock.catalogId},stockTools).family;return family&&family!=='Restock'?family:'Sans catégorie';}return item?.identity&&unresolved(item)?'Magasin à choisir':priorFamily(item);};
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
 function closeDestination(){document.getElementById('courseDestinationChoice')?.remove();}
 function chooseDestination(button,item){
  const old=document.getElementById('courseDestinationChoice');closeDestination();if(old?.dataset.identity===item.identity)return;
  const menu=document.createElement('div');menu.id='courseDestinationChoice';menu.dataset.identity=item.identity;menu.setAttribute('role','menu');menu.setAttribute('aria-label','Déplacer cet achat pour cette semaine');
  for(const store of ['Lidl','Intermarché','Autres']){const option=document.createElement('button');option.type='button';option.setAttribute('role','menuitem');option.textContent=store;option.onclick=()=>{if(move(item,store))closeDestination();};menu.append(option);}
  document.body.append(menu);const rect=button.getBoundingClientRect();menu.style.left=Math.max(6,Math.min(rect.right-menu.offsetWidth,innerWidth-menu.offsetWidth-6))+'px';menu.style.top=Math.max(6,rect.bottom+menu.offsetHeight+6<=innerHeight?rect.bottom+3:rect.top-menu.offsetHeight-3)+'px';
 }
 document.addEventListener('click',event=>{if(!event.target.closest('#courseDestinationChoice,.course-simple-send,.course-purchase-menu'))closeDestination();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDestination();});
 window.addEventListener('resize',closeDestination);
 shoppingIngredientDialog=function(store){
  modal('<h2>Ajouter un article · '+esc(store)+'</h2><form id="shoppingIngredientForm"><label class="field">Produit<input id="shoppingIngredientText" required maxlength="200" autocomplete="off"></label><label class="field">Quantité<input id="shoppingArticleQuantity" type="number" min="0" step="any" required value="1"></label><label class="field">Format (facultatif)<input id="shoppingArticleFormat" maxlength="80" placeholder="Ex. boîte"></label><label class="field">Catégorie (facultative)<select id="shoppingIngredientFamily"><option value="">Achats ponctuels</option>'+storeCategories(store).map(f=>'<option>'+esc(f)+'</option>').join('')+'</select></label><p id="shoppingArticleError" role="alert"></p><div class="actions"><button class="primary" type="submit">Ajouter</button><button type="button" id="shoppingArticleCancel">Annuler</button></div></form>');
  document.getElementById('shoppingArticleCancel').onclick=()=>document.getElementById('dialog').close();
  document.getElementById('shoppingIngredientForm').onsubmit=event=>{
   event.preventDefault();const name=document.getElementById('shoppingIngredientText').value.trim(),quantity=stockTools.amount(document.getElementById('shoppingArticleQuantity').value),format=document.getElementById('shoppingArticleFormat').value.trim(),family=document.getElementById('shoppingIngredientFamily').value||'Achats ponctuels';if(!name||quantity===null)return;
   const fields=['manualShopping','shops','productFamilies','shoppingQuantities','shoppingLinePresentation'],before=Object.fromEntries(fields.map(k=>[k,structuredClone(data[k])])),key=familyShop.id('one-off'),wk=weekKey();
   try{data.manualShopping??=[];data.manualShopping.push({key,text:name,shoppingWeek:wk,oneOff:true});data.shops??={};data.shops[key]=store;data.productFamilies??={};data.productFamilies[key]=family;
    const item=shoppingItems().find(i=>(i.sourceKeys||[i.key]).includes(key));if(!item)throw Error('L’article n’a pas pu être préparé.');courseList.setQuantity(data,wk,item,quantity,stockTools,format||'article');data.shoppingLinePresentation??={};data.shoppingLinePresentation[item.identity]={format};if(!save())throw Error('Enregistrement impossible.');document.getElementById('dialog').close();shopping();
   }catch(error){for(const field of fields){if(before[field]===undefined)delete data[field];else data[field]=before[field];}document.getElementById('shoppingArticleError').textContent=error.message;}
  };
 };
 function decorate(){
  if(page!=='Courses')return;closeDestination();const items=shoppingItems(),wk=weekKey(),counts=courseList.counts(items,courseList.weekState(data,wk)),bar=document.querySelector('.courses-list-toolbar');if(!bar)return;
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
   const send=document.createElement('button');send.type='button';send.className='course-simple-send';send.setAttribute('aria-label','Déplacer cet achat : '+item.name);send.setAttribute('aria-haspopup','menu');send.title='Déplacer pour cette semaine';send.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="m21 3-6 18-4-8-8-4 18-6Z"/><path d="m11 13 10-10"/></svg>';send.onclick=()=>{if(!visualEditSession)chooseDestination(send,item);};row.querySelector('.course-simple-actions')?.insertBefore(send,row.querySelector('.course-simple-remove'));
   if(item.stockIssue){const note=document.createElement('small');note.className='course-simple-issue';note.id='course-stock-issue-'+row.dataset.courseIndex;note.textContent=item.stockIssue+' '+(/Stock inconnue|unité du Stock|Unités incompatibles|unités incompatibles/.test(item.stockIssue)?'Dans Stock, vérifie la quantité et le format du produit.':'Renseigne ici la quantité à acheter et le format ; les unités du Stock doivent correspondre.');product.append(note);row.querySelector('[data-list-quantity]')?.setAttribute('aria-describedby',note.id);}
  }
  for(const table of document.querySelectorAll('[data-course-primary]')){
   table.addEventListener('dragover',event=>{if(!dragged||visualEditSession||dragged.wk!==weekKey()||dragged.item.automaticRestock)return;event.preventDefault();event.dataTransfer.dropEffect='move';table.classList.add('course-simple-drop');});
   table.addEventListener('dragleave',event=>{if(!table.contains(event.relatedTarget))table.classList.remove('course-simple-drop');});
   table.addEventListener('drop',event=>{if(!dragged||visualEditSession||dragged.wk!==weekKey()||dragged.item.automaticRestock)return;event.preventDefault();event.stopPropagation();const {item}=dragged;dragged=null;window.BazarCourseUI?.classify(item,table.dataset.coursePrimary,event.target.closest('.courses-primary-category')?.dataset.family);});
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
 visualSiteRegistry.push({key:'ui:course-send',selector:'.course-simple-send',label:'Courses · Icône déplacer un achat',min:18,max:60});
 visualSiteRegistry.push({key:'ui:course-week-remove',selector:'.course-simple-remove',label:'Courses · Croix de retrait',min:20,max:60});
})();
