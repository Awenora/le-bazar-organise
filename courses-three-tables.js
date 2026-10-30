/* Reuse existing rows and their handlers. No business migration, no inventory list. */
const coursesPrimaryStores=['Lidl','Intermarché','Autres'];
let coursesOrderGesture=null;
function startCoursesOrderGesture(group,item,event){coursesOrderGesture={group,item,pointer:event.pointerId,before:group.items.map(i=>i.id)};try{document.documentElement.setPointerCapture(event.pointerId);}catch{};}
window.addEventListener('pointermove',event=>{const d=coursesOrderGesture;if(!d||d.pointer!==event.pointerId)return;event.preventDefault();const candidates=d.group.items.filter(i=>i!==d.item&&i.el.getClientRects().length);const target=candidates.find(i=>event.clientY<i.el.getBoundingClientRect().top+i.el.getBoundingClientRect().height/2);if(target)d.group.root.insertBefore(d.item.el,target.el);else d.group.root.append(d.item.el);},true);
window.addEventListener('pointerup',event=>{const d=coursesOrderGesture;if(!d||d.pointer!==event.pointerId)return;coursesOrderGesture=null;const order=[...d.group.root.children].map(el=>d.group.items.find(i=>i.el===el)?.id).filter(Boolean);sharedChange(d.group,c=>{c.order=order;},true);try{document.documentElement.releasePointerCapture(event.pointerId);}catch{};},true);
window.addEventListener('pointercancel',()=>{const d=coursesOrderGesture;if(!d)return;coursesOrderGesture=null;for(const id of d.before){const i=d.group.items.find(i=>i.id===id);if(i)d.group.root.append(i.el);}},true);
function coursesPrimaryStore(store){return ['Lidl','Intermarché'].includes(store)?store:'Autres';}
const storeBeforeExplicitRouting=storeOf,familyBeforeExplicitRouting=familyOf;
function courseExplicitRoute(item){const keys=[item.key,item.baseKey,...(item.baseKeys||[])].filter(Boolean),original=item.uses?.[0]?.originalText||item.text,route=data.shoppingRouting?.products?.['ingredient:'+stockTools.parseIngredient(original).normalized]||data.shoppingRouting?.products?.[shoppingProduct(original)];const product=item.habitualProduct||(item.replacementTarget?.startsWith('catalog:')?(data.shoppingCatalog||[]).find(p=>'catalog:'+p.id===item.replacementTarget):null);return {store:data.shops?.[item.key]||item.routingStore||item.replacementStore||item.purchaseStore||keys.map(k=>data.shops?.[k]).find(Boolean)||product?.store||route?.store,family:data.productFamilies?.[item.key]||item.replacementFamily||item.purchaseFamily||keys.map(k=>data.productFamilies?.[k]).find(Boolean)||product?.family||route?.family};}
storeOf=function(item){if(item.orphan)return storeBeforeExplicitRouting(item);return courseExplicitRoute(item).store||'À affecter';};
familyOf=function(item){if(item.orphan)return familyBeforeExplicitRouting(item);return courseExplicitRoute(item).family||'Sans catégorie';};
function coursesPresentation(){return (visualEditSession?.draft||data.visualPreferences)?.coursesPresentation||{categories:{}};}
const cleanBeforeCoursesPresentation=cleanVisualPreferences;
cleanVisualPreferences=function(value){const out=cleanBeforeCoursesPresentation(value);if(value?.coursesPresentation&&typeof value.coursesPresentation==='object')out.coursesPresentation=structuredClone(value.coursesPresentation);return out;};
function changeCoursesPresentation(mutator){if(!visualEditSession)return;visualEditSession.draft.coursesPresentation??={categories:{}};mutator(visualEditSession.draft.coursesPresentation);shopping();renderVisualEditor();}
function coursesCategoryId(store,family){return 'course-category-'+encodeURIComponent(store+'|'+family).replace(/%/g,'_');}
function coursesCategorySettings(store,family){const oldId=encodeURIComponent(store+'|'+family),legacy=componentSettings(['course:category:'+oldId,'course:table:'+oldId]);return {hidden:!!(legacy.hidden||legacy.removed),...coursesPresentation().categories?.[store]?.[family]};}
const storeCategoriesBeforePresentation=storeCategories;
storeCategories=function(store){const primary=coursesPrimaryStore(store),extra=Object.entries(coursesPresentation().categories?.[primary]||{}).filter(([name,cfg])=>!cfg.removed).map(([name])=>name);return [...new Set([...storeCategoriesBeforePresentation(store),...extra])];};
function courseCategoryTools(store){
 if(!visualEditSession)startVisualEditor();page='Courses';shopping();
 const families=[...new Set([...(store==='Autres'?shoppingStores.filter(s=>!coursesPrimaryStores.slice(0,2).includes(s)).flatMap(storeCategories):storeCategories(store)),...Object.keys(coursesPresentation().categories?.[store]||{})])];
 modal('<h2>Catégories · '+esc(store)+'</h2><p>Modifications dans le brouillon. Enregistrer dans Personnaliser le site pour les conserver. Retirer une catégorie visuelle conserve ses produits.</p><div id="courseCategoryRows">'+families.map((family,i)=>{const cfg=coursesCategorySettings(store,family);return '<div class="course-category-settings"><label>'+esc(family)+'<input data-category-name="'+i+'" value="'+esc(cfg.label||family)+'"></label><label><input type="checkbox" data-category-hidden="'+i+'" '+(cfg.hidden?'checked':'')+'> Masquer</label><label><input type="checkbox" data-category-collapsed="'+i+'" '+(cfg.collapsed?'checked':'')+'> Replier</label><button type="button" data-category-remove="'+i+'">'+(cfg.removed?'Restaurer':'Retirer')+'</button></div>';}).join('')+'</div><form id="courseCategoryAdd"><label class="field">Nouvelle catégorie<input id="courseCategoryNew" required maxlength="80"></label><button>Ajouter</button></form><button type="button" id="courseCategoryDone">Revenir à l’éditeur</button>');
 function change(family,fn){changeCoursesPresentation(p=>{p.categories??={};p.categories[store]??={};p.categories[store][family]??={};fn(p.categories[store][family]);});}
 document.querySelectorAll('[data-category-name]').forEach(el=>el.onchange=()=>change(families[+el.dataset.categoryName],c=>{c.label=el.value.trim();}));
 document.querySelectorAll('[data-category-hidden]').forEach(el=>el.onchange=()=>change(families[+el.dataset.categoryHidden],c=>{c.hidden=el.checked;}));
 document.querySelectorAll('[data-category-remove]').forEach(el=>el.onclick=()=>{const f=families[+el.dataset.categoryRemove],cfg=coursesCategorySettings(store,f);if(!cfg.removed&&!confirm('Retirer seulement le regroupement « '+(cfg.label||f)+' » ? Ses produits restent dans ce tableau.'))return;change(f,c=>{c.removed=!cfg.removed;});courseCategoryTools(store);});
 $('#courseCategoryAdd').onsubmit=e=>{e.preventDefault();const name=$('#courseCategoryNew').value.trim();if(!name)return;change(name,c=>{c.hidden=false;c.removed=false;});courseCategoryTools(store);};
 document.querySelectorAll('[data-category-collapsed]').forEach(el=>el.onchange=()=>change(families[+el.dataset.categoryCollapsed],c=>{c.collapsed=el.checked;}));
 $('#courseCategoryDone').onclick=()=>{$('#dialog').close();renderVisualEditor();};
}
function coursesBuildPrimaryTables(){
 const board=$('#main .courses-board');if(!board||board.dataset.primary==='true')return;
 const items=shoppingItems(),rows=[...board.querySelectorAll('[data-course-index]')];board.dataset.primary='true';
 const cards=[];
 for(const store of coursesPrimaryStores){
  const card=document.createElement('section');card.className='courses-table courses-primary-table';card.dataset.coursePrimary=store;card.innerHTML='<header class="courses-table-heading"><div><h3>'+esc(store)+'</h3></div><button type="button" class="course-primary-add" aria-label="Ajouter un article · '+esc(store)+'">＋</button><button type="button" class="course-primary-categories" aria-label="Personnaliser les catégories · '+esc(store)+'">⋯</button></header><div class="courses-category-stack" id="'+coursesCategoryId(store,'stack')+'"></div>';
  const stack=card.querySelector('.courses-category-stack');
  const families=[...new Set([...rows.filter(row=>storeOf(items[+row.dataset.courseIndex])!=='À affecter'&&coursesPrimaryStore(storeOf(items[+row.dataset.courseIndex]))===store).map(row=>familyOf(items[+row.dataset.courseIndex])),...Object.keys(coursesPresentation().categories?.[store]||{})])];const oldOrder=data.shoppingCategoryOrder?.[store]||[];families.sort((a,b)=>orderPosition(oldOrder,a)-orderPosition(oldOrder,b));
  const ungrouped=[];
  for(const family of families){const cfg=coursesCategorySettings(store,family),selected=rows.filter(row=>{const item=items[+row.dataset.courseIndex];return storeOf(item)!=='À affecter'&&coursesPrimaryStore(storeOf(item))===store&&familyOf(item)===family;});if(cfg.removed){ungrouped.push(...selected);continue;}
   const category=document.createElement('details');category.className='courses-primary-category';category.id=coursesCategoryId(store,family);category.dataset.family=family;category.setAttribute('aria-label',cfg.label||family);category.open=!cfg.collapsed;category.hidden=!!cfg.hidden;category.innerHTML='<summary title="Déplacer dans Personnaliser le site">⠿ '+esc(cfg.label||family)+'</summary><div class="courses-category-products"></div>';for(const row of selected){row.dataset.siteVisualKey='product:'+items[+row.dataset.courseIndex].identity;category.lastElementChild.append(row);}
   category.lastElementChild.id=category.id+'-products';const productGroupId='courses-products-'+store+'|'+family;if(!sharedVisualGroups.some(e=>e.id===productGroupId))sharedVisualGroups.push({id:productGroupId,name:'Courses · Produits '+store+' · '+family,selector:'#'+CSS.escape(category.lastElementChild.id),items:':scope > .courses-line',essential:true,reorder:true});
   category.addEventListener('toggle',()=>{if(category.open===!coursesCategorySettings(store,family).collapsed)return;if(!visualEditSession)return;const p=visualEditSession.draft.coursesPresentation??={categories:{}};p.categories??={};p.categories[store]??={};p.categories[store][family]={...coursesCategorySettings(store,family),collapsed:!category.open};});stack.append(category);
  }
  for(const row of ungrouped)stack.append(row);
  const descriptorId='courses-categories-'+store;
  if(!sharedVisualGroups.some(e=>e.id===descriptorId))sharedVisualGroups.push({id:descriptorId,name:'Courses · Catégories '+store,selector:'#'+CSS.escape(stack.id),items:':scope > .courses-primary-category',essential:true,reorder:true});
  card.querySelector('.course-primary-add').onclick=()=>shoppingIngredientDialog(store);
  card.querySelector('.course-primary-categories').onclick=()=>courseCategoryTools(store);cards.push(card);
 }
 document.querySelector('#coursesUnassigned')?.remove();const unknown=rows.map(row=>items[+row.dataset.courseIndex]).filter(item=>storeOf(item)==='À affecter');if(unknown.length){const pending=document.createElement('div');pending.id='coursesUnassigned';const choose=document.createElement('button');choose.type='button';choose.id='coursePendingOpen';choose.dataset.siteVisualKey='course:control-unassigned';choose.dataset.pendingCount=unknown.length;choose.textContent='À affecter ('+unknown.length+')';choose.onclick=coursePendingDialog;document.querySelector('.courses-list-toolbar').append(choose);}
 board.replaceChildren(...cards);$('#courseStoreHandles')?.remove();courseDecorateLayout();
 for(const row of rows){const item=items[+row.dataset.courseIndex];if(!item)continue;const familySelect=row.querySelector('[data-list-family]');if(familySelect)for(const option of familySelect.options){const cfg=coursesCategorySettings(coursesPrimaryStore(storeOf(item)),option.value);option.textContent=cfg.label||option.value;}const title=row.querySelector('.courses-product');const names=[...new Set((item.uses||[]).map(u=>u.name))];if(names.length){const from=document.createElement('small');from.className='courses-recipe-provenance';from.textContent='Pour : '+names.join(', ');title.append(from);}if(coursesPrimaryStore(storeOf(item))==='Autres'){const shop=document.createElement('small');shop.className='courses-shop-provenance';shop.textContent=storeOf(item);title.append(shop);}if(storeOf(item)==='À affecter'){const select=row.querySelector('[data-list-shop]');if(select){const option=document.createElement('option');option.value='';option.textContent='Choisir le magasin…';option.selected=true;select.prepend(option);}const choose=document.createElement('button');choose.type='button';choose.textContent='Choisir magasin et catégorie';choose.onclick=()=>{row.querySelector('.courses-line-details').open=true;select?.focus();};title.append(choose);}}
}
function coursesLightToolbar(){
 const bar=$('#main .courses-list-toolbar');if(!bar)return;
 /* Original controls retain their stable editor IDs and all stored preferences. */
 const undo=$('#listUndo');if(undo)undo.hidden=!(typeof coursesUndoStack!=='undefined'&&coursesUndoStack.length);
}
const shoppingBeforeThreeTables=shopping;
shopping=function(){shoppingBeforeThreeTables();coursesBuildPrimaryTables();coursesLightToolbar();applySharedGroups();};
const applyBeforeThreeTables=applyVisualPreferences;
applyVisualPreferences=function(){applyBeforeThreeTables();for(const el of document.querySelectorAll('.courses-primary-category')){const store=el.closest('[data-course-primary]')?.dataset.coursePrimary,cfg=coursesCategorySettings(store,el.dataset.family);el.hidden=!!cfg.hidden;const summary=el.querySelector('summary'),label=(visualEditSession?.draft||data.visualPreferences)?.sharedCommandGroups?.['courses-categories-'+store]?.modes?.[sharedMode()]?.items?.[el.id]?.label||cfg.label||el.dataset.family;if(summary.textContent!==label)summary.textContent=label;}if(page==='Courses')applySharedGroups();};
sharedVisualGroups.push({id:'courses-secondary',name:'Courses · Commandes secondaires',selector:'.courses-secondary-content',items:':scope > *'});
const cancelBeforeThreeTables=cancelVisualChanges;
cancelVisualChanges=function(){cancelBeforeThreeTables();if(page==='Courses')shopping();};
const closeBeforeThreeTables=closeVisualEditor;
closeVisualEditor=function(){closeBeforeThreeTables();if(page==='Courses')shopping();};
const renderBeforeCoursesCategories=renderVisualEditor;
renderVisualEditor=function(){renderBeforeCoursesCategories();if(!visualEditSession||page!=='Courses')return;const panel=$('#visualEditorPanel');if(!panel)return;const box=document.createElement('div');box.id='coursesCategoryEditorAccess';for(const store of coursesPrimaryStores){const button=document.createElement('button');button.type='button';button.textContent='Catégories · '+store;button.onclick=()=>courseCategoryTools(store);box.append(button);}panel.querySelector('.visual-editor-actions')?.before(box);};
if(page==='Courses')shopping();
