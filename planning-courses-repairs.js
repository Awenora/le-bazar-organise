/* Targeted planning / recipes / shopping repairs; no data migration. */
const needsTools=window.BazarShoppingNeeds;
const shoppingBeforeNeeds=shoppingItems;
shoppingItems=function(){
 const rows=shoppingBeforeNeeds();
 const groups=needsTools.aggregate(rows,{tools:stockTools,storeOf,familyOf});
 const wk=datekey(page==='Courses'?coursesWeek():week),adjustments=data.shoppingQuantities?.[wk]||{};
 const totals=new Map();for(const g of groups)if(g.known&&!g.manual)totals.set(g.product,(totals.get(g.product)||0)+stockTools.quantityIn({quantity:g.required,unit:g.unit},stockTools.unitInfo(g.unit)[0]==='mass'?'g':stockTools.unitInfo(g.unit)[0]==='volume'?'ml':g.unit));
 const visible=groups.slice(); // Stock is checked after choosing the actual purchased product.

 for(const [identity,a] of Object.entries(adjustments))if(!groups.some(g=>g.identity===identity)&&!(a.item.sourceKeys||[]).some(k=>data.shoppingHidden?.[wk]?.includes(k)))visible.push({...a.item,key:'achat-manuel:'+encodeURIComponent(identity),identity,routingStore:a.item.store,required:0,uses:[],orphan:true});
 return visible.map(g=>{const a=adjustments[g.identity];return {...g,purchase:a?(stockTools.quantityIn({quantity:a.quantity,unit:a.item.unit},g.unit)??a.quantity):g.required,adjustment:a,needChanged:!!a&&stockTools.quantityIn({quantity:a.needAtEdit,unit:a.item.unit},g.unit)!==g.required};});
};
const storeBeforeRetainedPurchase=storeOf,familyBeforeRetainedPurchase=familyOf;
storeOf=function(item){return item.orphan?item.store:storeBeforeRetainedPurchase(item);};
familyOf=function(item){return item.orphan?item.family:familyBeforeRetainedPurchase(item);};
removeShoppingItem=function(key){return duringCoursesWeek(()=>{const item=shoppingItems().find(i=>i.key===key),keys=[key,...(item?.sourceKeys||[])];rememberRemoval();const wk=datekey(week);data.shoppingHidden??={};data.shoppingHidden[wk]=[...new Set([...(data.shoppingHidden[wk]||[]),...keys])];data.manualShopping=(data.manualShopping||[]).filter(i=>!keys.includes(i.key));finishRemoval('Ingrédient retiré des courses');});};
const moveBeforeGroupedPurchase=moveOrganized;
moveOrganized=function(source,target){if(source.type==='shop-item'&&['shop-item','shop-category','shop-store'].includes(target.type)){const item=shoppingItems().find(i=>i.key===source.id);if(item){data.shops??={};data.productFamilies??={};for(const k of item.sourceKeys){data.shops[k]=target.store;data.productFamilies[k]=target.family||'Autres';}}}return moveBeforeGroupedPurchase(source,target);};
if(!courseUndoFields.includes('shoppingQuantities'))courseUndoFields.push('shoppingQuantities');
coursesUndoBaseline=courseUndoState();
function shoppingQuantityDialog(item){
 const wk=datekey(coursesWeek());
 modal('<h2>'+esc(item.name)+'</h2><p>Besoin des recettes : <strong>'+esc(item.manual?'Ajout manuel':needsTools.quantity(item))+'</strong></p><form id="purchaseQuantityForm"><label class="field">Quantité à acheter'+(item.unit?' ('+esc(item.unit)+')':'')+'<input id="purchaseQuantity" inputmode="decimal" required value="'+esc(item.purchase??'')+'"></label><p id="purchaseQuantityError" role="alert"></p><div class="actions"><button class="primary" type="submit">Enregistrer</button><button type="button" id="purchaseAutomatic">Revenir au calcul automatique</button></div></form>');
 $('#purchaseQuantityForm').onsubmit=e=>{e.preventDefault();const n=stockTools.amount($('#purchaseQuantity').value);if(n===null){$('#purchaseQuantityError').textContent='Indique un nombre positif ou zéro.';return;}data.shoppingQuantities??={};data.shoppingQuantities[wk]??={};data.shoppingQuantities[wk][item.identity]={quantity:n,needAtEdit:item.required,item:{key:item.key,text:item.text,baseKey:item.baseKey,name:item.name,unit:item.unit,known:item.known,manual:item.manual,store:item.store,family:item.family,product:item.product,sourceKeys:item.sourceKeys,baseKeys:item.baseKeys,texts:item.texts}};save();$('#dialog').close();shopping();};
 $('#purchaseAutomatic').onclick=()=>{if(data.shoppingQuantities?.[wk])delete data.shoppingQuantities[wk][item.identity];save();$('#dialog').close();shopping();};
}
const shoppingBeforeQuantityUI=shopping;
shopping=function(){
 shoppingBeforeQuantityUI();const items=shoppingItems();
 document.querySelectorAll('.shop-item').forEach(row=>{
  const stock=row.querySelector('[data-bought]'),key=stock?.dataset.bought,item=items.find(i=>i.key===key);if(!item)return;
  const title=row.querySelector(':scope > strong');if(title){title.replaceChildren(document.createTextNode(item.name+' '));if(!item.orphan)title.append(stock);}
  const block=document.createElement('div');block.className='shopping-quantity';
  const need=item.manual?'Ajout manuel':('Besoin des recettes : '+needsTools.quantity(item));
  block.innerHTML='<small>'+esc(need)+'</small><button type="button" class="purchase-edit" aria-label="Quantité à acheter : '+esc(item.name)+'">À acheter : <strong>'+esc(needsTools.quantity(item,item.purchase))+'</strong> · Modifier</button>'+(item.adjustment?'<small class="purchase-manual">Choix manuel conservé'+(item.needChanged?' · Besoin modifié':'')+(item.orphan?' · Retiré du planning':'')+'</small>':'');
  block.querySelector('button').onclick=()=>shoppingQuantityDialog(item);title?.after(block);
  const uses=row.querySelector(':scope > small');if(uses&&item.uses.length)uses.innerHTML=item.uses.map(u=>esc(u.name)+' · '+fmt(new Date(u.date+'T12:00:00'),{day:'numeric',month:'short'})+' '+esc(u.slot)+' · '+esc(needsTools.quantity({unit:u.unit,required:u.quantity}))).join('<br>');
  if(stock)stock.onclick=()=>{data.confirmedIngredients??={};data.stock??={};for(const k of item.baseKeys){data.confirmedIngredients[k]=true;data.stock[k]=true;}save();shopping();};
  for(const select of row.querySelectorAll('[data-shop],[data-family]')){const old=select.onchange;select.onchange=()=>{const map=select.dataset.shop!==undefined?(data.shops??={}):(data.productFamilies??={});for(const k of item.sourceKeys){if(select.value)map[k]=select.value;else delete map[k];}old?.();};}
 });
 if(typeof placeFreeCourses==='function')placeFreeCourses();
};
/* Top save button submits the existing form and its native validation once. */
const addRecipeBeforeTopSave=addRecipeDialog;
addRecipeDialog=function(...args){
 addRecipeBeforeTopSave(...args);const form=$('#newRecipeForm'),heading=$('#dialog h2');if(!form||!heading)return;
 const bar=document.createElement('div');bar.className='recipe-save-top';heading.replaceWith(bar);bar.append(heading);
 const button=document.createElement('button');button.type='submit';button.setAttribute('form',form.id);button.className='primary';button.textContent='Enregistrer';bar.append(button);
 button.onclick=()=>{const fields=$('#recipeFields');if(fields)fields.hidden=false;};
 const submit=form.onsubmit;let submitting=false;form.onsubmit=e=>{if(submitting||!form.isConnected){e.preventDefault();return;}submitting=true;try{return submit.call(form,e);}finally{submitting=false;}};
};
/* Portaled action menus escape clipped side panels; existing commands stay intact. */
function bindPlanningCommands(){
 if(page!=='À table !')return;
 document.querySelectorAll('.side-category-menu,.trash-menu').forEach(details=>{
  const summary=details.querySelector('summary');if(!summary)return;summary.classList.add('bazar-dots');
  summary.onclick=e=>{e.preventDefault();e.stopPropagation();const wasOpen=activeActions?.dataset.owner===summary.getAttribute('aria-label');if(wasOpen){closeActions();return;}const commands=[...details.querySelectorAll('button')];showActions(summary,commands.map(b=>({label:b.textContent,run:()=>b.click()})));if(activeActions)activeActions.dataset.owner=summary.getAttribute('aria-label');details.open=false;};
 });
 document.querySelectorAll('.edit-dots').forEach(b=>{b.type='button';b.textContent='⋯';b.classList.add('bazar-dots');b.onpointerdown=e=>e.stopPropagation();b.onclick=e=>{e.preventDefault();e.stopPropagation();editMeal(...b.dataset.edit.split('|'));};});
}
const renderBeforePlanningCommands=render;
render=function(){closeActions();renderBeforePlanningCommands();bindPlanningCommands();};
const catalogBeforePlanningCommands=catalog;
catalog=function(el){catalogBeforePlanningCommands(el);if(el?.id==='side')bindPlanningCommands();};
const plannerToolsBeforeCommands=plannerTools;
plannerTools=function(){plannerToolsBeforeCommands();bindPlanningCommands();};
render();
