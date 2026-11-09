/* Compact Courses actions. The existing editor and save/sync paths remain in use. */
(function(){
 'use strict';
 const model=window.BazarCoursesOrganisation;
 const currentWeek=()=>datekey(coursesWeek());
 const stores=['Lidl','Intermarché','Autres'];
 const productOf=item=>familyShop.productFor(data,item,stockTools);
 const option=(value,label=value)=>'<option value="'+esc(value)+'">'+esc(label)+'</option>';
 const selected=(item)=>data.shoppingWeeklyDestinations?.[currentWeek()]?.[item.identity];
 const autoStore=item=>familyShop.routeFor(data,{catalogId:item.automaticRestock.catalogId}).store;
 const priorDestination=BazarSimpleCourses.destination;
 BazarSimpleCourses.destination=item=>item?.automaticRestock?undefined:priorDestination(item);

 const previousStore=storeOf,previousFamily=familyOf;
 storeOf=function(item){
  return item?.identity&&item.automaticRestock?'Autres':previousStore(item);
 };
 familyOf=function(item){
  if(!item?.identity)return previousFamily(item);
  if(item.automaticRestock)return 'Restock';
  return model.family(selected(item)?.family||previousFamily(item));
 };
 const previousCategorySettings=coursesCategorySettings;
 coursesCategorySettings=function(store,name){
  const categories=coursesPresentation().categories?.[store]||{};
  const older=Object.keys(categories).find(key=>key!==name&&model.family(key)===name);
  return older?{...previousCategorySettings(store,older),...categories[name]}:previousCategorySettings(store,name);
 };
 const beforeItems=shoppingItems;
 shoppingItems=function(){
  const items=beforeItems();
  return page==='Courses'?model.coordinate(data,items,currentWeek(),stockTools):items;
 };
 for(const field of ['shoppingCategories','shoppingProductRoutes','shoppingOccasionalProducts','shoppingCatalog']){
  if(!courseUndoFields.includes(field))courseUndoFields.push(field);
 }
 coursesUndoBaseline=courseUndoState();

 function rayons(store){
  const names=[...model.families(data,store),...storeCategories(store).map(model.family)];
  const seen=new Set();
  return names.filter(name=>{
   const key=model.norm(name);
   if(!key||['restock','magasin a choisir','sans categorie'].includes(key)||seen.has(key))return false;
   seen.add(key);
   return true;
  }).sort((a,b)=>a.localeCompare(b,'fr'));
 }
 function rayonInput(value=''){
  return '<label class="field">Rayon<input name="family" list="courseRayonChoices" maxlength="80" value="'+esc(value)+'" placeholder="Choisir ou saisir un nouveau rayon"></label><datalist id="courseRayonChoices"></datalist>';
 }
 function fillRayons(store){
  $('#courseRayonChoices').innerHTML=rayons(store).map(name=>option(name)).join('');
 }
 function transact(change){
  const before=structuredClone(data);
  try{
   change();
   if(!save())throw Error('Enregistrement impossible.');
   return true;
  }catch(error){
   for(const key of Object.keys(data))delete data[key];
   Object.assign(data,before);
   const status=$('#coursePurchaseError');
   if(status)status.textContent=error.message;
   else toast(error.message);
   return false;
  }
 }
 function actions(label){
  return '<p id="coursePurchaseError" role="alert"></p><div class="actions"><button class="primary">'+label+'</button><button type="button" data-course-cancel>Annuler</button></div>';
 }
 function bindCancel(){
  $('#dialog [data-course-cancel]').onclick=()=>$('#dialog').close();
 }
 function applyAndClose(change){
  if(!transact(change))return;
  $('#dialog').close();
  shopping();
 }
 function classify(item,store,rayon){
  if(visualEditSession)return;
  const product=productOf(item),automatic=!!item.automaticRestock;
  const initialStore=store||(automatic?autoStore(item):storeOf(item));
  const choices=[...new Set([...stores,...(initialStore&&initialStore!=='À affecter'?[initialStore]:[])])];
  const initialRayon=rayon||(automatic?model.family(familyShop.routeFor(data,{catalogId:product?.id}).family):familyOf(item));
  const key=product?'catalog:'+product.id:null;
  const remembered=key&&data.shoppingProductRoutes?.[key]?.confirmed;
  modal('<h2>Classer · '+esc(item.name)+'</h2><form id="courseClassifyForm"><label class="field">Magasin<select name="store" required>'+option('','Choisir…')+choices.map(s=>option(s)).join('')+'</select></label>'+rayonInput(['Magasin à choisir','Sans catégorie','Restock'].includes(initialRayon)?'':initialRayon)+(automatic?'<p>Cet achat reste dans Autres → Restock, sous son magasin habituel.</p>':'<label><input type="checkbox" name="remember"> Mémoriser le magasin et le rayon</label>')+(remembered&&!automatic?'<label><input type="checkbox" name="forget"> Retirer ce classement mémorisé</label>':'')+actions('Enregistrer')+'</form>');
  const form=$('#courseClassifyForm'),shop=form.elements.store;
  shop.value=choices.includes(initialStore)?initialStore:'';
  fillRayons(shop.value);
  shop.onchange=()=>fillRayons(shop.value);
  bindCancel();
  form.onsubmit=event=>{
   event.preventDefault();
   const values=new FormData(form),destination=shop.value,entered=String(values.get('family')||'').trim();
   applyAndClose(()=>{
    const family=entered?model.addFamily(data,destination,entered):'Sans catégorie';
    if(values.has('forget')&&!values.has('remember')&&key)delete data.shoppingProductRoutes[key];
    model.classify(data,item,currentWeek(),destination,family,automatic||values.has('remember'));
    if(automatic)delete data.shoppingWeeklyDestinations[currentWeek()][item.identity];
   });
  };
 }
 window.BazarCourseUI={classify};

 shoppingIngredientDialog=function(store){
  const remembered=Object.values(data.shoppingOccasionalProducts||{});
  modal('<h2>Ajouter un article · '+esc(store)+'</h2><form id="courseOccasionalForm"><label class="field">Produit<input name="product" required maxlength="180" list="courseRememberedPurchases"></label><datalist id="courseRememberedPurchases">'+remembered.map(p=>option(p.name,p.store+' · '+p.family)).join('')+'</datalist><label class="field">Quantité<input name="quantity" type="number" min="0" step="any" required value="1"></label><label class="field">Magasin<select name="store">'+stores.map(s=>option(s)).join('')+'</select></label>'+rayonInput()+'<label><input type="checkbox" name="remember"> Garder ce produit en mémoire</label>'+actions('Ajouter')+'</form>');
  const form=$('#courseOccasionalForm');
  form.elements.store.value=store;
  fillRayons(store);
  form.elements.store.onchange=()=>fillRayons(form.elements.store.value);
  form.elements.product.oninput=()=>{
   const saved=data.shoppingOccasionalProducts?.[model.norm(form.elements.product.value)];
   if(!saved)return;
   form.elements.store.value=stores.includes(saved.store)?saved.store:'Autres';
   form.elements.family.value=saved.family;
   fillRayons(form.elements.store.value);
  };
  bindCancel();
  form.onsubmit=event=>{
   event.preventDefault();
   const values=new FormData(form),name=String(values.get('product')).trim(),quantity=stockTools.amount(values.get('quantity')),destination=String(values.get('store')),rayon=String(values.get('family')).trim();
   applyAndClose(()=>{
    if(!name||quantity===null)throw Error('Indique le produit et sa quantité.');
    const family=rayon?model.addFamily(data,destination,rayon):'Achats ponctuels';
    const key=familyShop.id('one-off'),wk=currentWeek();
    data.manualShopping??=[];data.manualShopping.push({key,text:name,shoppingWeek:wk,oneOff:true});
    data.shops??={};data.shops[key]=destination;
    data.productFamilies??={};data.productFamilies[key]=family;
    const item=shoppingItems().find(i=>(i.sourceKeys||[i.key]).includes(key));
    if(!item)throw Error('L’article n’a pas pu être préparé.');
    courseList.setQuantity(data,wk,item,quantity,stockTools,'article');
    if(values.has('remember'))model.rememberOccasional(data,name,destination,family);
   });
  };
 };

 function stockRows(item){
  const product=productOf(item);
  return product?(data.inventory?.items||[]).filter(row=>productOf(row)?.id===product.id):[];
 }
 function openStock(item){
  const product=productOf(item),rows=stockRows(item);
  if(rows.length===1)return familyStockItemDialog(rows[0].id,product.id);
  if(!rows.length)return correct(item);
  modal('<h2>Choisir la ligne de Stock</h2><div class="actions">'+rows.map((row,i)=>'<button type="button" data-course-stock-choice="'+i+'">'+esc(row.name+' · '+(row.unit||'unité à préciser'))+'</button>').join('')+'</div>');
  $('#dialog').querySelectorAll('[data-course-stock-choice]').forEach(button=>{
   button.onclick=()=>familyStockItemDialog(rows[Number(button.dataset.courseStockChoice)].id,product.id);
  });
 }
 function correct(item){
  const product=productOf(item),rows=stockRows(item);
  const use=(item.uses||[]).find(u=>u.recipeId&&u.originalText&&recipe(u.recipeId)?.ingredients.includes(u.originalText));
  const stockUnits=[...new Set(rows.map(BazarPurchaseStock.unitOf).filter(Boolean))];
  const suggestedUnit=stockUnits.length===1?stockUnits[0]:'';
  const stockText=rows.length?rows.map(row=>row.name+' · '+(row.quantity??'à compter')+' '+(row.unit||'(unité à préciser)')).join(' / '):'Aucune ligne de Stock associée';
  modal('<h2>Corriger · '+esc(item.name)+'</h2><p>'+esc(stockText)+'</p><form id="courseCorrectForm"><label class="field">Nom du produit<input name="name" required maxlength="180" value="'+esc(product?.name||item.name)+'"></label><label class="field">Unité d’achat<input name="unit" maxlength="40" value="'+esc(product?.purchaseUnit||suggestedUnit||item.purchaseDisplay?.unit||item.unit||'')+'" placeholder="paquet, boîte, g…"></label><label class="field">Contenu d’un conditionnement<input name="format" maxlength="40" value="'+esc(product?.purchaseFormat||'')+'" placeholder="Ex. 400 g"></label>'+(use?'<button type="button" id="courseChooseProduct">Associer un produit pour '+esc(recipe(use.recipeId).name)+'</button>':'')+(rows.length?'<button type="button" id="courseOpenStock">Corriger la ligne de Stock</button>':'')+actions('Enregistrer')+'</form>');
  bindCancel();
  if(use)$('#courseChooseProduct').onclick=()=>habitualChoiceDialog(item);
  if(rows.length)$('#courseOpenStock').onclick=()=>openStock(item);
  $('#courseCorrectForm').onsubmit=event=>{
   event.preventDefault();
   const values=new FormData(event.currentTarget),name=String(values.get('name')).trim(),unit=String(values.get('unit')).trim(),format=String(values.get('format')).trim(),wk=currentWeek();
   applyAndClose(()=>{
    if(!name||!unit)throw Error('Indique le nom du produit et son unité d’achat.');
    const pack=format?stockPacks.parseFormat(format):null;
    if(format&&!pack)throw Error('Indique un contenu mesurable, par exemple 400 g ou 1 L.');
    if(product){
     if(name!==product.name){
      product.aliases=[...new Set([...String(product.aliases||'').split(',').map(s=>s.trim()).filter(Boolean),product.name])].join(', ');
      product.name=name;
     }
     product.purchaseUnit=unit;product.purchaseFormat=format;
     if(pack)product.purchasePack=pack;else delete product.purchasePack;
    }else{
     const row=(data.manualShopping||[]).find(r=>r.key===item.key&&r.oneOff);
     if(!row)throw Error('Associe d’abord le produit à une référence existante.');
     row.text=name;
    }
    const adjustment=item.buyManual||item.adjustment;
    if(adjustment){
     if(item.buyManual&&item.buyKey)data.shoppingBuyQuantities[wk][item.buyKey].unit=unit;
     else if(data.shoppingQuantities?.[wk]?.[item.identity])data.shoppingQuantities[wk][item.identity].unit=unit;
    }
   });
  };
 }

 function closeMenu(){
  const menu=$('#courseDestinationChoice');
  if(menu){menu.anchor?.setAttribute('aria-expanded','false');menu.remove();}
 }
 function openMenu(button,item){
  const same=$('#courseDestinationChoice')?.anchor===button;
  closeMenu();
  if(same)return;
  const menu=document.createElement('div');
  menu.id='courseDestinationChoice';menu.anchor=button;
  menu.setAttribute('role','group');menu.setAttribute('aria-label','Actions · '+item.name);
  const entries=[
   ['Corriger le produit',()=>correct(item)],
   ['Déplacer / classer',()=>classify(item)],
   ['Accéder au Stock',()=>openStock(item)],
   ...(!item.automaticRestock?[['Déjà en stock',()=>{
    if(transact(()=>{
     const wk=currentWeek();
     courseList.exclude(data,wk,item);
     data.shoppingExcluded[wk][item.identity].reason='stock';
    }))shopping();
   }]]:[]),
   ['Retirer des courses',()=>{if(transact(()=>courseList.exclude(data,currentWeek(),item)))shopping();}]
  ];
  for(const [label,fn] of entries){
   const action=document.createElement('button');
   action.type='button';action.textContent=label;
   action.onclick=()=>{closeMenu();fn();};
   menu.append(action);
  }
  document.body.append(menu);
  const rect=button.getBoundingClientRect();
  menu.style.left=Math.max(6,Math.min(rect.right-menu.offsetWidth,innerWidth-menu.offsetWidth-6))+'px';
  menu.style.top=Math.max(6,rect.bottom+menu.offsetHeight+6<=innerHeight?rect.bottom+3:rect.top-menu.offsetHeight-3)+'px';
  button.setAttribute('aria-expanded','true');
 }
 window.addEventListener('pointerdown',event=>{
  if(!event.target.closest('#courseDestinationChoice,.course-purchase-menu'))closeMenu();
 },true);
 window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&$('#courseDestinationChoice')){
   const anchor=$('#courseDestinationChoice').anchor;
   closeMenu();anchor?.focus({preventScroll:true});
  }
 },true);
 const previousShopping=shopping;
 shopping=function(...args){
  closeMenu();
  const result=previousShopping.apply(this,args);
  if(page!=='Courses')return result;
  const items=shoppingItems();
  for(const row of document.querySelectorAll('.course-simple-line')){
   const item=items[Number(row.dataset.courseIndex)],actions=row.querySelector('.course-simple-actions');
   if(!item||!actions)continue;
   const button=document.createElement('button');
   button.type='button';button.className='course-purchase-menu';
   button.dataset.siteVisualKey='ui:course-purchase-menu';
   button.textContent='⋯';button.setAttribute('aria-label','Actions · '+item.name);
   button.setAttribute('aria-expanded','false');
   button.onclick=()=>{if(!visualEditSession)openMenu(button,item);};
   actions.replaceChildren(button);
   if(item.automaticRestock)row.querySelector('.course-product-name')?.removeAttribute('draggable');
   const issue=row.querySelector('.course-simple-issue');
   if(issue){
    const short=document.createElement('button');
    short.type='button';short.className='course-purchase-issue';
    short.textContent=/inconnue|sans quantité/.test(item.stockIssue)?'Quantité à préciser':'Unité ou format à préciser';
    short.onclick=()=>{if(!visualEditSession)correct(item);};
    issue.replaceChildren(short);
   }
  }
  return result;
 };
 visualSiteRegistry.push({key:'ui:course-purchase-menu',selector:'.course-purchase-menu',label:'Courses · Menu de l’article',min:18,max:80},{key:'ui:course-purchase-issue',selector:'.course-purchase-issue',label:'Courses · Indication de quantité ou d’unité',min:18,max:300});
 const previousApply=applyVisualPreferences;
 applyVisualPreferences=function(...args){
  const result=previousApply.apply(this,args);
  if(page==='Courses'){
   const prefs=visualEditSession?.draft||data.visualPreferences;
   const width=prefs?.elements?.['ui:course-purchase-menu']?.width;
   $('#main .courses-board')?.style.setProperty('--course-purchase-menu-width',Number.isFinite(width)?width+'px':'30px');
  }
  return result;
 };
 const oldSelect=selectCourseLineCell;
 selectCourseLineCell=function(event){
  const button=event.target.closest('.course-purchase-menu,.course-purchase-issue');
  if(visualEditSession&&button){
   event.preventDefault();event.stopImmediatePropagation();
   delete visualEditSession.courseHeaderFocus;visualEditSession.courseLineCell=null;
   selectVisualTarget(button.matches('.course-purchase-menu')?'ui:course-purchase-menu':'ui:course-purchase-issue');
   return true;
  }
  return oldSelect(event);
 };
})();
