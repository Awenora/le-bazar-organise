/* Corrections of the existing shopping workflow. Table geometry is untouched. */

courseCategoryTools=function(store){

 const editing=!!visualEditSession,prefs=structuredClone(editing?visualEditSession.draft:cleanVisualPreferences(data.visualPreferences));

 const card=[...document.querySelectorAll('[data-course-primary]')].find(el=>el.dataset.coursePrimary===store),visible=[...(card?.querySelectorAll('.courses-primary-category')||[])].map(el=>el.dataset.family),names=[...new Set([...visible,...(data.shoppingCategories?.[store]||[]),...Object.keys(prefs.coursesPresentation?.categories?.[store]||{})])];

 const seen=new Set(),families=names.filter(name=>{const key=stockTools.norm(name);if(seen.has(key))return false;seen.add(key);return true;});

 modal('<h2>'+(store==='Autres'?'Magasins / sous-catégories':'Rayons')+' · '+esc(store)+'</h2><form id="compactCategoryForm"><label class="field">Action<select id="compactCategoryAction"><option value="add">'+(store==='Autres'?'Ajouter un magasin / sous-catégorie':'Ajouter')+'</option><option value="article">Ajouter un article</option><option value="rename">Renommer</option><option value="move">Déplacer dans l’ordre</option><option value="hide">Masquer</option><option value="remove">Retirer le regroupement</option><option value="restore">Restaurer / réafficher</option></select></label><label class="field" id="compactCategoryChoice">Rayon<select id="compactCategory">'+families.map(name=>'<option value="'+esc(name)+'">'+esc(coursesCategorySettings(store,name).label||name)+(coursesCategorySettings(store,name).removed?' · retiré':coursesCategorySettings(store,name).hidden?' · masqué':'')+'</option>').join('')+'</select></label><label class="field" id="compactCategoryNameField">Nom<input id="compactCategoryName" maxlength="80"></label><label class="field" id="compactCategoryBeforeField">Placer avant<select id="compactCategoryBefore"><option value="">En dernier</option>'+families.map(name=>'<option value="'+esc(name)+'">'+esc(coursesCategorySettings(store,name).label||name)+'</option>').join('')+'</select></label><p id="compactCategoryError" role="alert"></p><small>Les produits sont conservés. Un rayon masqué ou retiré reste récupérable ici.</small><div class="actions"><button class="primary" type="submit">Valider</button><button type="button" id="compactCategoryCancel">Annuler</button></div></form>');

 const dialog=$('#dialog');dialog.classList.add('compact-course-popup');

 const cleanup=()=>{dialog.classList.remove('compact-course-popup');dialog.removeEventListener('click',outside);};

 const outside=e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();};

 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dialog.close();}},{signal:(()=>{const controller=new AbortController();dialog.addEventListener('close',()=>controller.abort(),{once:true});return controller.signal;})()});dialog.addEventListener('click',outside);dialog.addEventListener('close',cleanup,{once:true});$('#compactCategoryCancel').onclick=()=>dialog.close();

 function draw(){const action=$('#compactCategoryAction').value;$('#compactCategoryChoice').hidden=action==='add';$('#compactCategoryNameField').hidden=!['add','rename'].includes(action);$('#compactCategoryBeforeField').hidden=action!=='move';$('#compactCategoryName').required=['add','rename'].includes(action);if(action==='rename')$('#compactCategoryName').value=coursesCategorySettings(store,$('#compactCategory').value).label||$('#compactCategory').value;}

 $('#compactCategoryAction').onchange=draw;$('#compactCategory').onchange=draw;draw();

 $('#compactCategoryForm').onsubmit=e=>{e.preventDefault();const action=$('#compactCategoryAction').value;let family=$('#compactCategory').value,name=$('#compactCategoryName').value.trim();if(action==='article'){dialog.close();shoppingIngredientDialog(store);const select=$('#shoppingIngredientFamily');if(select&&[...select.options].some(o=>o.value===family))select.value=family;return;}if(action==='add'){if(!name)return;family=names.find(n=>stockTools.norm(n)===stockTools.norm(name))||name;}if(!family){$('#compactCategoryError').textContent='Choisis un rayon.';return;}if(action==='remove'&&!confirm('Retirer uniquement ce regroupement ? Ses produits restent dans le tableau.'))return;

  prefs.coursesPresentation??={categories:{}};prefs.coursesPresentation.categories??={};prefs.coursesPresentation.categories[store]??={};const cfg=prefs.coursesPresentation.categories[store][family]??={};

  if(action==='add'||action==='restore'){cfg.hidden=false;cfg.removed=false;}if(action==='rename')cfg.label=name;if(action==='hide')cfg.hidden=true;if(action==='remove')cfg.removed=true;

  const groupId='courses-categories-'+store,group=recipeGroupTools.clean(prefs.sharedCommandGroups?.[groupId],{maxHeight:2400,minPosition:-2000,maxX:10000,maxY:10000}),mode=sharedMode();

  if(action==='move'){const id=coursesCategoryId(store,family),before=$('#compactCategoryBefore').value,order=[...new Set([...(group.modes[mode].order||[]),...families.map(f=>coursesCategoryId(store,f))])].filter(x=>x!==id),at=before?order.indexOf(coursesCategoryId(store,before)):-1;order.splice(at<0?order.length:at,0,id);group.modes[mode].order=order;group.modes[mode].layout='wrap';}

  if(action==='restore'||action==='add')for(const profile of ['desktop','mobile']){group.modes[profile].items??={};group.modes[profile].items[coursesCategoryId(store,family)]={...group.modes[profile].items[coursesCategoryId(store,family)],hidden:false,removed:false};}

  prefs.sharedCommandGroups??={};prefs.sharedCommandGroups[groupId]=group;

  if(editing)visualEditSession.draft=prefs;else{const previous=data.visualPreferences;data.visualPreferences=cleanVisualPreferences(prefs);if(!save()){data.visualPreferences=previous;$('#compactCategoryError').textContent='Enregistrement impossible.';return;}}

  dialog.close();shopping();if(editing)renderVisualEditor();

 };

};



/* No generic category or fuzzy catalogue rule chooses a new shop. Existing explicit routes stay authoritative. */

habitualStore=function(item){return courseExplicitRoute(item).store||'À affecter';};



/* Keep the meal form and its event handlers while editing an ingredient. */

const editMealBeforeDirectProducts=editMeal;

editMeal=function(date,slot,preselect){editMealBeforeDirectProducts(date,slot,preselect);const form=$('#mealform');if(!form)return;const oldMeal=data.plans[date]?.[slot],drafts=new Map();if(oldMeal?.recipeId)drafts.set(oldMeal.recipeId,structuredClone(oldMeal.ingredientReplacements||{}));

 const draw=()=>{const r=recipe($('#mealrecipe')?.value);form.querySelector('#mealProductChoices')?.remove();if(!r)return;let rules=drafts.get(r.id);if(!rules){rules={};drafts.set(r.id,rules);}form.bazarReplacements=rules;const section=document.createElement('section');section.id='mealProductChoices';section.innerHTML='<h3>Produits à acheter pour ce repas</h3>';

  for(const text of r.ingredients){const key=stockTools.key(text),rule=rules[key]===undefined?ingredientReplacements.find(data,r.id,text,stockTools).rule:rules[key],product=rule&&!rule.disabled?ingredientReplacements.product(data,rule.target):null,row=document.createElement('div');row.className='meal-product-choice';const label=document.createElement('span');label.textContent=text+(product?' → '+product.name:'');const button=document.createElement('button');button.type='button';button.className='ingredient-replacement-access';button.textContent=product?'Modifier mon produit':'Choisir mon produit';button.onclick=()=>{const dialog=$('#dialog'),nodes=[...dialog.childNodes],restore=()=>{dialog.replaceChildren(...nodes);if(!dialog.open)dialog.showModal();draw();};const parsed=stockTools.parseIngredient(text),base=Number(r.portions),chosen=Number(oldMeal?.recipeId===r.id?oldMeal.portions:NaN),quantity=parsed.quantity===null?null:parsed.quantity*(Number.isFinite(chosen)&&chosen>0&&base>0?chosen/base:1);ingredientReplacementDialog(r.id,text,restore,null,{rules,quantity,date,slot,onSave:rule=>{rules[key]=structuredClone(rule);}});};row.append(label,button);section.append(row);}

  $('#mealIngredients')?.after(section);

 };

 const previous=form.querySelector('#mealrecipe').onchange;form.querySelector('#mealrecipe').onchange=e=>{previous?.(e);draw();};draw();

 /* The old global stock checkbox is not a substitute for a meal-specific product choice. */

};



function courseAssignProduct(item){

 const current=courseExplicitRoute(item),primary=current.store?coursesPrimaryStore(current.store):'';

 modal('<h2>Magasin et rayon</h2><p>'+esc(item.name)+'</p><form id="courseAssignForm"><label class="field">Magasin<select id="courseAssignStore" required><option value="">Choisir…</option>'+coursesPrimaryStores.map(s=>'<option>'+esc(s)+'</option>').join('')+'</select></label><label class="field">Rayon<select id="courseAssignFamily" required></select></label><p id="courseAssignError" role="alert"></p><button class="primary">Valider et mémoriser</button></form>');

 $('#courseAssignStore').value=primary;$('#courseAssignFamily').value=current.family||'';

 function draw(){const store=$('#courseAssignStore').value,previous=$('#courseAssignFamily').value||current.family||'',names=[...new Set(store?storeCategories(store):[])];if(store===primary&&current.family&&!names.includes(current.family))names.push(current.family);$('#courseAssignFamily').innerHTML='<option value="">Choisir…</option>'+names.map(f=>'<option value="'+esc(f)+'">'+esc(coursesCategorySettings(store,f).label||f)+'</option>').join('');$('#courseAssignFamily').value=names.includes(previous)?previous:'';}$('#courseAssignStore').onchange=draw;draw();
 $('#courseAssignForm').onsubmit=e=>{e.preventDefault();const chosen=$('#courseAssignStore').value,store=chosen==='Autres'&&primary==='Autres'&&current.store?current.store:chosen,family=$('#courseAssignFamily').value.trim();if(!store||!family)return;const fields=['shops','productFamilies','shoppingRouting','shoppingCatalog','shoppingProductRoutes','shoppingQuantities','shoppingBuyQuantities','shoppingCaddie','shoppingExcluded','shoppingLinePresentation'],before=Object.fromEntries(fields.map(k=>[k,structuredClone(data[k])]));data.shops??={};data.productFamilies??={};for(const key of item.sourceKeys||[item.key]){data.shops[key]=store;data.productFamilies[key]=family;}data.shoppingRouting??={};data.shoppingRouting.products??={};for(const text of [...(item.texts||[]),...(item.uses||[]).map(u=>u.originalText||u.text)]){data.shoppingRouting.products[shoppingProduct(text)]={...data.shoppingRouting.products[shoppingProduct(text)],store,family};const normalized='ingredient:'+stockTools.parseIngredient(text).normalized;data.shoppingRouting.products[normalized]={...data.shoppingRouting.products[normalized],store,family};}data.shoppingRouting.stores=[...new Set([...(data.shoppingRouting.stores||[]),store])];data.shoppingRouting.families=[...new Set([...(data.shoppingRouting.families||[]),family])];

  const target=item.replacementTarget||(item.habitualProduct?'catalog:'+item.habitualProduct.id:null);if(target){data.shoppingProductRoutes??={};data.shoppingProductRoutes[target]={...data.shoppingProductRoutes[target],store,family};if(target.startsWith('catalog:')){const product=data.shoppingCatalog?.find(p=>'catalog:'+p.id===target);if(product)Object.assign(product,{store,family});}}

  const next=shoppingItems().find(row=>!row.orphan&&((item.replacementTarget&&row.replacementTarget===item.replacementTarget)||(item.habitualProduct&&row.habitualProduct?.id===item.habitualProduct.id)||(!item.habitualProduct&&!item.replacementTarget&&(row.sourceKeys||[]).some(k=>(item.sourceKeys||[item.key]).includes(k)))));

  if(next&&next.identity!==item.identity){if(!item.habitualProduct&&data.shoppingLinePresentation?.[item.identity]){data.shoppingLinePresentation[next.identity]={...data.shoppingLinePresentation[item.identity],...data.shoppingLinePresentation[next.identity]};}const wk=datekey(coursesWeek());for(const field of ['shoppingQuantities','shoppingCaddie','shoppingExcluded'])if(data[field]?.[wk]?.[item.identity]!==undefined){const value=structuredClone(data[field][wk][item.identity]);if(value&&typeof value==='object'){Object.assign(value,{store,family});if(value.item)Object.assign(value.item,{store,family});}data[field][wk][next.identity]=value;delete data[field][wk][item.identity];}const buys=data.shoppingBuyQuantities?.[wk];if(buys&&item.buyKey&&next.buyKey&&buys[item.buyKey]){buys[next.buyKey]=structuredClone(buys[item.buyKey]);if(buys[next.buyKey].itemSnapshot)Object.assign(buys[next.buyKey].itemSnapshot,{identity:next.identity,store,family,purchaseStore:store,purchaseFamily:family,memberIdentities:next.memberIdentities});delete buys[item.buyKey];}}

  if(!save()){for(const key of fields){if(before[key]===undefined)delete data[key];else data[key]=before[key];}$('#courseAssignError').textContent='Enregistrement impossible.';return;}$('#dialog').close();shopping();

 };

}



function courseSimplifyRows(){const items=shoppingItems(),wk=datekey(coursesWeek());document.querySelectorAll('[data-course-index]').forEach(row=>{const item=items[+row.dataset.courseIndex],details=row.querySelector('.courses-line-details'),input=row.querySelector('[data-list-quantity]');if(!item||!details||!input)return;

 const summary=details.querySelector('summary');summary.textContent='⋯';summary.title='Corriger cet achat';summary.setAttribute('aria-label','Corriger cet achat : '+item.name);

 const manualChoice=item.buyManual||item.adjustment;if(manualChoice?.unitExplicit)row.querySelectorAll('.courses-product .habitual-choice-warning').forEach(el=>el.remove());row.querySelectorAll('.courses-product .habitual-choice-link').forEach(el=>el.remove());const need=details.querySelector('p');if(need)need.textContent='Besoin calculé : '+(item.known?needsTools.quantity(item):'à préciser')+(item.adjustment?' · Achat manuel conservé pour cette semaine':'');

 /* Retain actions and provenance but remove repeated per-ingredient buttons. */

 details.querySelectorAll('.ingredient-replacement-access').forEach(el=>el.remove());for(const p of [...details.querySelectorAll(':scope > p')].slice(1))if(!p.classList.contains('habitual-choice-warning'))p.remove();

 const actions=details.querySelector('.courses-detail-actions');if(actions){actions.querySelectorAll('label').forEach(el=>el.remove());const route=document.createElement('button');route.type='button';route.textContent='Magasin / rayon';route.onclick=()=>courseAssignProduct(item);actions.prepend(route);}

 const productButtons=[...details.querySelectorAll(':scope > button')].filter(b=>!b.hasAttribute('data-list-auto'));for(const b of productButtons)b.remove();if(item.uses?.length){const product=document.createElement('button');product.type='button';product.textContent='Modifier le produit';product.onclick=()=>habitualChoiceDialog(item);details.append(product);}

 const missing=[...row.querySelectorAll('.courses-product button')].find(b=>/Choisir magasin/.test(b.textContent));if(missing)missing.onclick=()=>courseAssignProduct(item);

 const span=input.parentElement.querySelector('span'),unit=item.purchaseDisplay?.unit||item.unit||'',packageUnit=item.habitualProduct?.purchaseUnit||item.replacementPurchaseUnit,select=document.createElement(packageUnit&&unit?'span':'select');select.className='course-inline-unit';select.setAttribute('aria-label','Unité à acheter : '+item.name);

 if(select.tagName==='SELECT'){select.innerHTML='<option value="">Unité…</option>'+[...new Set(['pièce','paquet','barquette','g','kg','ml','L','boîte','bouteille',unit].filter(Boolean))].map(u=>'<option>'+esc(u)+'</option>').join('');select.value=unit;}else{select.textContent=unit;select.value=unit;}

 if(span)span.replaceWith(select);else input.after(select);input.placeholder='Nombre';

 row.querySelectorAll('.habitual-choice-warning').forEach(el=>{if(/Conversion|conversion/.test(el.textContent))el.remove();});

 const auto=details.querySelector('[data-list-auto]');if(auto&&(item.replacementTarget||packageUnit))auto.textContent='Retirer ma correction de quantité';



 function commit(){if(!input.isConnected)return;const typed=input.value.trim().match(/^([0-9.,/ ]+)\s+(g|kg|ml|l|pièces?|pieces?|paquets?|barquettes?|boîtes?|bouteilles?)$/i);if(typed){input.value=typed[1].trim();const requested=stockTools.norm(typed[2]).replace(/s$/,''),match=[...(select.options||[])].find(o=>stockTools.norm(o.value).replace(/s$/,'')===requested);if(match)select.value=match.value;}

  if(!select.value)select.value=item.habitualProduct?.purchaseUnit||item.replacementPurchaseUnit||'pièce';const error=$('#main .courses-list-error');if(!select.value||stockTools.amount(input.value)===null){input.setAttribute('aria-invalid','true');if(error){error.hidden=false;error.textContent='Indique une quantité et son unité.';}return;}

  const old={shoppingQuantities:structuredClone(data.shoppingQuantities),shoppingBuyQuantities:structuredClone(data.shoppingBuyQuantities)};try{courseList.setQuantity(data,wk,item,input.value,stockTools,select.value);if(!save())throw Error('Enregistrement impossible.');shopping();}catch(e){for(const key of Object.keys(old)){if(old[key]===undefined)delete data[key];else data[key]=old[key];}if(error){error.hidden=false;error.textContent=e.message;}}

 }

 input.oninput=()=>input.removeAttribute('aria-invalid');input.onchange=()=>queueMicrotask(()=>{if(document.activeElement!==select)commit();});input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();commit();}};select.onchange=()=>{if(stockTools.amount(input.value)!==null)commit();};

 });}

const shoppingBeforeUsability=shopping;

shopping=function(){shoppingBeforeUsability();courseSimplifyRows();readableButtons();};

const manualAddBeforeChoice=shoppingIngredientDialog;

shoppingIngredientDialog=function(store){manualAddBeforeChoice(store);const field=$('#shoppingIngredientFamily');if(field){field.prepend(new Option('Choisir un rayon…',''));field.value='';field.required=true;}};



/* Text-only contrast repair: no backgrounds, decoration or table dimensions change. */

function readableButtons(){for(const button of document.querySelectorAll('button')){if(button.matches('.calendar .meal')){button.classList.remove('bazar-light-button');continue;}let node=button,light=false;while(node&&node!==document.body){const color=getComputedStyle(node).backgroundColor,m=color.match(/[\d.]+/g);if(m&&m.length>=3&&(m.length<4||Number(m[3])>.12)){const brightness=(Number(m[0])*299+Number(m[1])*587+Number(m[2])*114)/1000;light=brightness>155;break;}node=node.parentElement;}button.classList.toggle('bazar-light-button',light);}}

const modalBeforeUsability=modal;modal=function(html){modalBeforeUsability(html);readableButtons();};

const applyBeforeReadable=applyVisualPreferences;applyVisualPreferences=function(){applyBeforeReadable();readableButtons();};

let readableQueued=false;new MutationObserver(()=>{if(readableQueued)return;readableQueued=true;queueMicrotask(()=>{readableQueued=false;readableButtons();});}).observe(document.body,{childList:true,subtree:true});

document.addEventListener('click',e=>{const menu=$('#coursesSecondaryMenu');if(menu?.open&&(!menu.contains(e.target)||e.target.closest('button')))menu.open=false;});

document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=$('#coursesSecondaryMenu');if(menu)menu.open=false;}});

document.addEventListener('pointerover',readableButtons);document.addEventListener('focusin',readableButtons);

if(page==='Courses')shopping();else readableButtons();


/* Existing purchase dialogs close on the backdrop as well as Escape. */
document.querySelector('#dialog').addEventListener('click',e=>{const d=e.currentTarget;if(e.target!==d||!d.querySelector('#ingredientReplacementForm,#courseAssignForm'))return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});

/* Compact Stock-style cells inside the existing Courses tables. */
function courseStockStyleRows(){
 const items=shoppingItems(),wk=datekey(coursesWeek());
 document.querySelectorAll('.course-column-labels').forEach(el=>{el.innerHTML='<span></span><span>Qté</span><span>Produit / marque</span><span>Format</span><span>⋯</span>';});
 document.querySelectorAll('[data-course-index]').forEach(row=>{
  const item=items[+row.dataset.courseIndex];if(!item)return;
  const quantity=row.querySelector('.courses-inline-quantity'),number=quantity?.querySelector('input'),product=row.querySelector('.courses-product'),menu=row.querySelector('.courses-line-details');if(!number||!product||!menu)return;
  row.classList.add('course-stock-line');
  const p=item.habitualProduct||(item.replacementTarget?ingredientReplacements.product(data,{type:item.replacementTarget.split(':')[0],id:item.replacementTarget.slice(item.replacementTarget.indexOf(':')+1)}):null),id=p?'product:'+p.id:item.identity,meta=data.shoppingLinePresentation?.[id]||{},unit=item.purchaseDisplay?.unit||item.unit||'';
  const saveField=(key,value,input)=>{if(visualEditSession)return;const before=structuredClone(data.shoppingLinePresentation),old=p?structuredClone(ingredientReplacements.product(data,{type:item.replacementTarget?.startsWith('stock:')?'stock':'catalog',id:p.id})):null;data.shoppingLinePresentation??={};data.shoppingLinePresentation[id]??={};data.shoppingLinePresentation[id][key]=value;const real=p&&ingredientReplacements.product(data,{type:item.replacementTarget?.startsWith('stock:')?'stock':'catalog',id:p.id});if(real&&!item.replacementTarget?.startsWith('stock:')&&key==='brand')real.brand=value;if(real&&!item.replacementTarget?.startsWith('stock:')&&key==='format'){real.purchaseFormat=value;const pack=stockPacks.parseFormat(value);if(pack)real.purchasePack=pack;else delete real.purchasePack;}if(!save()){data.shoppingLinePresentation=before;if(real&&old){for(const k of Object.keys(real))delete real[k];Object.assign(real,old);}input.setAttribute('aria-invalid','true');return;}input.removeAttribute('aria-invalid');};
  number.title='Quantité à acheter'+(unit?' · '+unit:'');number.setAttribute('aria-label','Quantité à acheter : '+item.name+(unit?' ('+unit+')':''));number.placeholder='?';
  /* Keep the existing save handler, including its unit, without showing a second unit control. */
  quantity.querySelectorAll('.course-inline-unit').forEach(el=>{el.hidden=true;el.setAttribute('aria-hidden','true');});
  const names=[...new Set((item.uses||[]).map(u=>u.name))],headline=document.createElement('span');headline.className='course-product-headline';const name=document.createElement('span');name.className='course-product-name';name.textContent=item.name;const brand=document.createElement('input');brand.className='course-product-brand';brand.type='text';brand.placeholder='Marque';brand.value=meta.brand??p?.brand??item.purchaseDisplay?.brand??'';brand.setAttribute('aria-label','Marque : '+item.name);brand.onchange=()=>saveField('brand',brand.value.trim(),brand);brand.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();brand.blur();}};headline.append(name,brand);product.replaceChildren(headline);if(names.length){const from=document.createElement('small');from.className='courses-recipe-provenance';from.textContent='Pour : '+names.join(', ');product.append(from);}
  const format=document.createElement('input');format.className='course-product-format';format.type='text';format.value=meta.format??item.purchaseDisplay?.format??p?.purchaseFormat??(unit||'');format.placeholder='Format';format.setAttribute('aria-label','Format : '+item.name);format.onchange=()=>saveField('format',format.value.trim(),format);format.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();format.blur();}};
  const remove=row.querySelector('.courses-delete'),check=row.querySelector('.courses-cart-check');
  menu.classList.add('course-stock-menu');menu.querySelector('summary').textContent='⋯';menu.querySelector('summary').setAttribute('aria-label','Modifier ou retirer : '+item.name);
  const actions=document.createElement('div');actions.className='course-stock-actions';
  const modify=[...menu.querySelectorAll('button')].find(b=>b.textContent==='Modifier le produit');if(modify){modify.textContent='Modifier le produit';actions.append(modify);}
  const route=[...menu.querySelectorAll('button')].find(b=>b.textContent==='Magasin / rayon');if(route)actions.append(route);
  const stocked=menu.querySelector('[data-list-stock]')||document.createElement('button');stocked.type='button';stocked.textContent='Déjà en stock';stocked.onclick=()=>{if(visualEditSession)return;const before=structuredClone(data.shoppingExcluded);courseList.exclude(data,wk,item);data.shoppingExcluded[wk][item.identity].reason='stock';if(!save()){data.shoppingExcluded=before;return;}shopping();};actions.append(stocked);
  if(check){check.title='Acheté';}
  if(remove){remove.textContent='Retirer de la liste';actions.append(remove);}
  const oldSummary=menu.querySelector('summary');menu.replaceChildren(oldSummary,actions);row.replaceChildren(...(check?[check]:[]),quantity,product,format,menu);
  menu.ontoggle=()=>{if(menu.open)document.querySelectorAll('.course-stock-menu[open]').forEach(other=>{if(other!==menu)other.open=false;});};
 });
}
const shoppingBeforeStockCells=shopping;
shopping=function(){shoppingBeforeStockCells();courseStockStyleRows();readableButtons();};
document.addEventListener('click',e=>{document.querySelectorAll('.course-stock-menu[open]').forEach(menu=>{if(!menu.contains(e.target))menu.open=false;});});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.course-stock-menu[open]').forEach(menu=>menu.open=false);});
visualSiteRegistry.push({key:'ui:coursebrand',selector:'.course-product-brand',label:'Courses · marque du produit',min:24,max:300},{key:'ui:courseformat',selector:'.course-product-format',label:'Courses · format du produit',min:32,max:300});
if(!courseUndoFields.includes('shoppingLinePresentation'))courseUndoFields.push('shoppingLinePresentation');
if(page==='Courses')shopping();

/* Scroll only the category list; keep each table heading and resize handle accessible. */
const coursesLayoutBeforeInternalScroll=applyCoursesFreeLayout;
applyCoursesFreeLayout=function(){coursesLayoutBeforeInternalScroll();for(const table of document.querySelectorAll('.courses-primary-table')){const stack=table.querySelector('.courses-category-stack'),p=componentSettings(courseTableKeys(table));if(!stack)continue;table.style.setProperty('overflow','visible');stack.style.maxHeight=p.height?Math.max(40,p.height-(table.querySelector('.courses-table-heading')?.offsetHeight||0)-(table.querySelector('.course-column-labels')?.offsetHeight||0)-10)+'px':'none';stack.style.overflowY=p.height?'auto':'visible';stack.style.overflowX='visible';}};
sharedVisualGroups.push({id:'courses-unassigned',name:'Courses · Magasin à choisir',selector:'#coursesUnassigned',items:':scope > button',essential:true});
if(page==='Courses'){shopping();applyCoursesFreeLayout();}

/* Same purchase choices for a planned ingredient and for later occurrences. */
function courseChooseUse(item,use,home){const text=use.originalText||use.text,meal=data.plans?.[use.date]?.[use.slot];ingredientReplacementDialog(use.recipeId,text,()=>{$('#dialog').close();shopping();},home?{type:'home'}:item.replacementTarget?{type:item.replacementTarget.split(':')[0],id:item.replacementTarget.slice(item.replacementTarget.indexOf(':')+1)}:item.habitualProduct?{type:'catalog',id:item.habitualProduct.id}:null,meal?{rules:meal.ingredientReplacements||{},liveMeal:meal,date:use.date,slot:use.slot}:undefined);}
habitualChoiceDialog=function(item,home=false){const uses=[...new Map((item.uses||[]).map(u=>[JSON.stringify([u.date,u.slot,u.recipeId,u.originalText||u.text]),u])).values()];if(!uses.length){if(home){const wk=datekey(coursesWeek());courseList.exclude(data,wk,item);data.shoppingExcluded[wk][item.identity].reason='home';if(save())shopping();return;}return legacyHabitualChoiceDialog(item);}if(uses.length===1)return courseChooseUse(item,uses[0],home);modal('<h2>Choisir le repas concerné</h2>'+uses.map((u,i)=>'<button type="button" data-replacement-use="'+i+'">'+esc(u.name)+' · '+esc(u.date)+' '+esc(u.slot)+'</button>').join(''));document.querySelectorAll('[data-replacement-use]').forEach(b=>b.onclick=()=>courseChooseUse(item,uses[+b.dataset.replacementUse],home));};
function coursePurchaseName(name,p){const pack=p?.purchasePack,format=p?.purchaseFormat||(pack?pack.quantity+' '+pack.unit:'');if(!format)return name;const suffix=format.replace(/\s+/g,'').toLocaleLowerCase('fr');let s=name.trim(),compact=s.replace(/\s+/g,'').toLocaleLowerCase('fr');if(compact.endsWith(suffix)){let end=s.length,n=0;while(end>0&&n<suffix.length){end--;if(!/\s/.test(s[end]))n++;}return s.slice(0,end).replace(/[\s\-–—(]+$/,'').trim()||name;}return name;}
const itemsBeforePurchaseHabits=shoppingItems;
shoppingItems=function(){const start=page==='Courses'?coursesWeek():week,end=new Date(start);end.setDate(end.getDate()+6);const rows=itemsBeforePurchaseHabits(),homeKeys=new Set();for(const [date,slots]of Object.entries(data.plans||{})){if(date<datekey(start)||date>datekey(end))continue;for(const slot of ['midi','soir']){const meal=slots[slot],r=recipe(meal?.recipeId);for(const text of r?.ingredients||[]){const key=stockTools.key(text),rule=meal.ingredientReplacements?.[key]??ingredientReplacements.find(data,r.id,text,stockTools).rule;if(rule?.kind==='home')homeKeys.add(key);}}}return rows.filter(row=>!row.orphan||!(row.sourceKeys||[]).some(k=>[...homeKeys].some(h=>k===h||k.startsWith(h+'::')))).map(row=>{if(row.manual||row.orphan)return row;const p=row.habitualProduct,format=p?.purchaseFormat||row.purchaseDisplay?.format||(p?.purchasePack?p.purchasePack.quantity+' '+p.purchasePack.unit:'');if(!p||!format){const manual=row.buyManual||row.adjustment;return {...row,purchaseNeedsChoice:!courseExplicitRoute(row).store,...(!manual?{purchaseDisplay:{quantity:null,unit:'',format:''}}:{})};}return row;});};
const storeBeforePurchaseHabits=storeOf;
storeOf=function(item){return item.purchaseNeedsChoice?'À affecter':storeBeforePurchaseHabits(item);};
const excludedBeforeHome=courseExcludedDialog;
courseExcludedDialog=function(){excludedBeforeHome();const records=[];for(const [key,rule]of Object.entries(data.ingredientReplacements?.habitual||{}))if(rule.kind==='home')records.push({name:key+' · Maison (habitude)',undo:()=>{delete data.ingredientReplacements.habitual[key];for(const slots of Object.values(data.plans||{}))for(const meal of Object.values(slots))for(const [k,v]of Object.entries(meal?.ingredientReplacements||{}))if(v.kind==='home'&&v.habitual&&ingredientReplacements.habitualKey(k,stockTools)===key)delete meal.ingredientReplacements[k];}});
 for(const [rid,rules]of Object.entries(data.ingredientReplacements?.recipes||{}))for(const [key,rule]of Object.entries(rules))if(rule.kind==='home')records.push({name:(recipe(rid)?.name||'Recette')+' · '+key+' · Maison',undo:()=>delete rules[key]});
 for(const [date,slots]of Object.entries(data.plans||{}))for(const [slot,meal]of Object.entries(slots))for(const [key,rule]of Object.entries(meal?.ingredientReplacements||{}))if(rule.kind==='home'&&!rule.habitual)records.push({name:(recipe(meal.recipeId)?.name||'Repas')+' · '+date+' '+slot+' · '+key+' · Maison',undo:()=>delete meal.ingredientReplacements[key]});
 for(const record of records){const row=document.createElement('div');row.className='courses-restore-row';const label=document.createElement('span');label.textContent=record.name;const button=document.createElement('button');button.type='button';button.textContent='Réintégrer';button.onclick=()=>{const before=structuredClone({plans:data.plans,rules:data.ingredientReplacements});record.undo();if(!save()){data.plans=before.plans;data.ingredientReplacements=before.rules;return;}shopping();courseExcludedDialog();};row.append(label,button);$('#dialog').append(row);}
 const state=courseList.weekState(data,datekey(coursesWeek()));Object.values(state.excluded).forEach((entry,i)=>{const row=$('#dialog [data-course-restore="'+i+'"]')?.closest('.courses-restore-row'),small=row?.querySelector('small');if(small&&entry.reason)small.prepend(document.createTextNode((entry.reason==='home'?'Maison':entry.reason==='stock'?'Stock':'Retiré')+' · '));});
};
const compactBeforeHome=courseStockStyleRows;
courseStockStyleRows=function(){compactBeforeHome();const items=shoppingItems();document.querySelectorAll('[data-course-index]').forEach(row=>{const item=items[+row.dataset.courseIndex];if(!item)return;const actions=row.querySelector('.course-stock-actions');if(!actions)return;const stock=[...actions.querySelectorAll('button')].find(b=>b.textContent==='Déjà en stock');if(stock)stock.textContent='Stock';const home=document.createElement('button');home.type='button';home.className='ingredient-replacement-access';home.textContent='Maison';home.onclick=()=>habitualChoiceDialog(item,true);actions.prepend(home);const needs=[...new Set((item.uses||[]).map(u=>u.originalText||u.text))];if(needs.length){const note=document.createElement('small');note.textContent='Besoin : '+needs.join(' · ');actions.prepend(note);}const p=item.habitualProduct,name=row.querySelector('.course-product-name');if(name)name.textContent=coursePurchaseName(item.name,p);});};
if(page==='Courses')shopping();

/* Same product preferences, with habitual selection as the default. */
function coursePendingDialog(){const pending=shoppingItems().filter(i=>storeOf(i)==='À affecter');modal('<h2>À affecter ('+pending.length+')</h2><div class="courses-pending-list">'+pending.map((item,i)=>'<button type="button" data-pending-route="'+i+'">'+esc(item.name)+'</button>').join('')+'</div>');document.querySelectorAll('[data-pending-route]').forEach(button=>button.onclick=()=>courseAssignProduct(pending[+button.dataset.pendingRoute]));}
const chooseBeforeCommonIngredient=habitualChoiceDialog;
habitualChoiceDialog=function(item,home=false,exception=false){if(home||exception)return chooseBeforeCommonIngredient(item,home);const use=item.uses?.[0];if(!use)return legacyHabitualChoiceDialog(item);const target=item.replacementTarget?{type:item.replacementTarget.split(':')[0],id:item.replacementTarget.slice(item.replacementTarget.indexOf(':')+1)}:item.habitualProduct?{type:'catalog',id:item.habitualProduct.id}:null;ingredientReplacementDialog(use.recipeId,use.originalText||use.text,()=>{$('#dialog').close();shopping();},target,{commonHabit:true,onSave:()=>{}});};
const compactBeforeOptionalMeal=courseStockStyleRows;
courseStockStyleRows=function(){compactBeforeOptionalMeal();const items=shoppingItems();document.querySelectorAll('[data-course-index]').forEach(row=>{const item=items[+row.dataset.courseIndex],actions=row.querySelector('.course-stock-actions');if(!item||!actions||!item.uses?.length)return;const button=document.createElement('button');button.type='button';button.className='ingredient-replacement-access';button.textContent='Exception pour un repas';button.onclick=()=>habitualChoiceDialog(item,false,true);actions.append(button);});};
if(page==='Courses')shopping();

/* Reuse the existing Stock action; only its access moves onto the row. */
const rowsBeforeInlineStock=courseStockStyleRows;
courseStockStyleRows=function(){rowsBeforeInlineStock();document.querySelectorAll('[data-course-index]').forEach(row=>{const stock=[...row.querySelectorAll('.course-stock-actions>button')].find(b=>b.textContent==='Stock'),format=row.querySelector('.course-product-format');if(stock&&format){stock.classList.add('course-inline-stock');stock.setAttribute('aria-label','Stock : '+(row.querySelector('.course-product-name')?.textContent||'produit'));row.insertBefore(stock,format);}});document.querySelectorAll('.course-column-labels').forEach(labels=>{if(labels.children.length===5){const label=document.createElement('span');label.textContent='';labels.insertBefore(label,labels.children[3]);}});};
coursesWeekCaption=function(){const start=coursesWeek(),end=new Date(start);end.setDate(end.getDate()+6);const format=new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'});return format.format(start)+' – '+format.format(end);};
visualSiteRegistry.push({key:'ui:course-inline-stock',selector:'.course-inline-stock',label:'Courses · Bouton Stock sur les lignes',min:24,max:120});
if(page==='Courses')shopping();

/* Retain the existing actions and handlers; simplify only their presentation. */
const rowsBeforeThreeActions=courseStockStyleRows;
courseStockStyleRows=function(){rowsBeforeThreeActions();document.querySelectorAll('[data-course-index]').forEach(row=>{const menu=row.querySelector('.course-stock-menu'),actions=menu?.querySelector('.course-stock-actions');if(!actions)return;const buttons=[...actions.querySelectorAll('button')],home=buttons.find(b=>b.textContent==='Maison'),route=buttons.find(b=>b.textContent==='Magasin / rayon'),remove=buttons.find(b=>b.matches('[data-list-remove]'));if(!home||!route||!remove)return;remove.textContent='Supprimer';actions.replaceChildren(home,route,remove);
 /* The same panel opens above clipping scroll containers, without adding a menu. */
 if(typeof actions.showPopover==='function')actions.setAttribute('popover','manual');
 const oldToggle=menu.ontoggle;menu.ontoggle=function(e){oldToggle?.call(menu,e);if(!menu.open){if(actions.matches(':popover-open'))actions.hidePopover();return;}if(actions.hasAttribute('popover')&&!actions.matches(':popover-open'))actions.showPopover();const r=menu.querySelector('summary').getBoundingClientRect(),w=actions.offsetWidth,h=actions.offsetHeight;actions.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px';actions.style.top=Math.max(8,r.bottom+h+8<=innerHeight?r.bottom+3:r.top-h-3)+'px';};
 row.closest('.courses-category-stack')?.addEventListener('scroll',()=>{if(menu.open)menu.open=false;},{passive:true});
 });};
if(page==='Courses')shopping();

const rowsBeforeDirectCellSelection=courseStockStyleRows;
courseStockStyleRows=function(){rowsBeforeDirectCellSelection();const parts={'.courses-cart-check':'checkbox','.courses-inline-quantity':'quantity','.courses-product':'product','.course-product-name':'product','.course-product-brand':'brand','.course-inline-stock':'stock','.course-product-format':'format','.course-stock-menu':'menu'};document.querySelectorAll('.course-stock-line').forEach(row=>{for(const [selector,field]of Object.entries(parts)){const el=row.querySelector(selector);if(el)el.dataset.courseCell=field;}const parent=row.closest('.courses-category-products'),entry=sharedVisualGroups.find(e=>e.id.startsWith('courses-products-')&&document.querySelector(e.selector)===parent),group=entry&&sharedNodes(entry),item=group?.items.find(i=>i.el===row);if(item)courseLineLabel(row,sharedConfig(group).items[item.id]||{});});};
if(page==='Courses')shopping();

// The visible Autres table is a valid manual purchase destination.
const addIngredientBeforeOtherTable=addShoppingIngredient;
addShoppingIngredient=function(store,text,family){
 if(store!=='Autres'||shoppingStores.includes(store))return addIngredientBeforeOtherTable(store,text,family);
 const prior=[...shoppingStores];shoppingStores.push('Autres');
 try{return addIngredientBeforeOtherTable(store,text,family);}finally{shoppingStores.splice(0,shoppingStores.length,...prior);}
};

// Reuse the command canvas for existing undo notifications.
const shoppingBeforeMovableNotices=shopping;
shopping=function(){shoppingBeforeMovableNotices();const toolbar=document.querySelector('.courses-list-toolbar');if(!toolbar)return;
 for(const [selector,id]of [['.courses-remove-undo','courseRemovalNotice'],['.cart-undo','courseCartNotice']]){const notice=document.querySelector('.courses-workspace '+selector);if(notice){notice.id=id;if(notice.parentElement!==toolbar)toolbar.append(notice);}}
 applySharedGroups();
};

function courseFitFixedViewport(){if(page!=='Courses'||innerWidth<=850)return;const main=document.querySelector('#main');if(!main)return;
 const bottom=main.getBoundingClientRect().bottom-6;
 for(const table of document.querySelectorAll('.courses-primary-table')){const stack=table.querySelector('.courses-category-stack');if(!stack||table.hidden)continue;
 const available=Math.max(100,Math.floor(bottom-table.getBoundingClientRect().top));table.style.setProperty('max-height',available+'px','important');
 const headings=(table.querySelector('.courses-table-heading')?.offsetHeight||0)+(table.querySelector('.course-column-labels')?.offsetHeight||0)+10;
 const pref=componentSettings(courseTableKeys(table)).height,limit=Math.min(pref||available,available);
 stack.style.maxHeight=Math.max(40,limit-headings)+'px';stack.style.overflowY='auto';
 }
}
const applyBeforeFixedCourses=applyVisualPreferences;applyVisualPreferences=function(){applyBeforeFixedCourses();courseFitFixedViewport();};
const shoppingBeforeFixedCourses=shopping;shopping=function(){shoppingBeforeFixedCourses();courseFitFixedViewport();};
window.addEventListener('resize',courseFitFixedViewport);
