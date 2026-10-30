/* One correspondence editor, shared by recipe sheets and weekly shopping. */

const ingredientReplacements=window.BazarIngredientReplacements;

const storeBeforeIngredientReplacement=storeOf,familyBeforeIngredientReplacement=familyOf;

storeOf=function(item){return data.shops?.[item.key]||item.replacementStore||storeBeforeIngredientReplacement(item);};

familyOf=function(item){return data.productFamilies?.[item.key]||item.replacementFamily||familyBeforeIngredientReplacement(item);};

const shoppingBeforeReplacementStock=shoppingItems;

shoppingItems=function(){

 const inputs=shoppingBeforeReplacementStock().map(row=>{

  if(row.replacementTarget||row.replacementIssue||row.manual||row.orphan)return row;

  const texts=row.texts||[row.text],explicitIds=row.habitualProduct?(row.habitualProduct.stockIds||[]):(data.inventory?.items||[]).filter(item=>texts.some(text=>[item.key,...(item.links||[]),...(item.legacyKeys||[])].includes(stockTools.key(text)))).map(item=>item.id);

  return {...row,replacementStockIds:explicitIds};

 });

 const weekKey=datekey(page==='Courses'?coursesWeek():week);

 return ingredientReplacements.purchaseRows(data,ingredientReplacements.stockRemainders(data,inputs,stockTools),weekKey,stockTools).filter(row=>!(row.stockRemainder===0&&!row.adjustment&&!row.buyManual)).map(row=>{

  if(row.adjustment?.unitExplicit&&!row.buyManual)return {...row,purchaseDisplay:{quantity:row.adjustment.quantity,unit:row.adjustment.unit,format:''}};if(row.replacementTarget||row.habitualProduct?.purchaseUnit||!row.purchaseDisplay||row.stockRemainder===undefined||row.adjustment||row.buyManual)return row;

  const product=row.habitualProduct,perPack=product?.purchasePack&&stockTools.quantityIn(product.purchasePack,row.unit),quantity=perPack?Math.ceil((row.purchase-1e-9)/perPack):row.purchaseDisplay.unit===row.unit?row.purchase:null;

  return {...row,purchaseDisplay:{...row.purchaseDisplay,quantity},conversionNeeded:quantity===null};

 });

};

function ingredientReplacementDialog(recipeId,text,back,preferredTarget,mealContext){
 const r=recipe(recipeId);if(!r||!r.ingredients.includes(text))return;const key=stockTools.key(text),found=mealContext?.rules?.[key]?{rule:mealContext.rules[key],scope:'meal'}:ingredientReplacements.find(data,recipeId,text,stockTools),existing=found.rule?.disabled?null:found.rule;
 const candidates=[...(data.shoppingCatalog||[]).map(p=>({value:'catalog:'+p.id,target:{type:'catalog',id:p.id},product:p})),...(data.inventory?.items||[]).map(p=>({value:'stock:'+p.id,target:{type:'stock',id:p.id},product:p}))];
 modal('<h2>Choisir mon produit</h2><p>'+esc(r.name)+'<br>Besoin de la recette : <strong>'+esc(text)+'</strong></p><form id="ingredientReplacementForm"><label class="field">Mon choix<select id="replacementProduct" required><option value="">Choisir…</option><option value="home">Maison — rien à acheter</option>'+candidates.map(c=>'<option value="'+esc(c.value)+'">'+esc(c.product.name)+(c.target.type==='stock'?' · Stock':'')+'</option>').join('')+'<option value="new">＋ Ajouter un produit</option></select></label><div id="replacementPurchaseFields"><label class="field" id="replacementNew" hidden>Nom du produit<input id="replacementNewName"></label><label class="field">Marque (facultative)<input id="replacementBrand"></label><label class="field">Conditionnement<select id="replacementPackageKind" required><option value="">Choisir…</option>'+['barquette','paquet','sachet','bouteille','boîte','pièce','salade entière'].map(k=>'<option>'+esc(k)+'</option>').join('')+'</select></label><label class="field">Format habituel<input id="replacementFormat" required placeholder="500 g, 400 g, 1 salade…"></label><label class="field">Quantité à acheter<input id="replacementCount" type="number" min="0" step="1" required placeholder="Nombre de conditionnements"></label><details class="replacement-routing"><summary>Magasin et rayon</summary><label class="field">Magasin<select id="replacementStore" required><option value="">Choisir…</option>'+[...new Set(['Lidl','Intermarché','Autres',...(existing?.store?[existing.store]:[])])].map(s=>'<option>'+esc(s)+'</option>').join('')+'</select></label><label class="field">Rayon<input id="replacementFamily" required list="replacementFamilies"></label><datalist id="replacementFamilies"></datalist></details></div><label><input type="checkbox" id="replacementRemember"> Mémoriser ce choix pour les prochaines recettes</label><small>'+(mealContext?'Sans cette coche, le choix concerne uniquement ce repas.':'Sans cette coche, le choix concerne uniquement cette recette.')+'</small><p id="replacementError" role="alert"></p><div class="actions"><button type="submit" class="primary">Enregistrer</button><button type="button" id="replacementCancel">Annuler</button>'+(existing?'<button type="button" id="replacementDelete">Retirer cette association</button>':'')+'</div></form>');
 const initial=preferredTarget||existing?.target;$('#replacementProduct').value=preferredTarget?.type==='home'||existing?.kind==='home'?'home':initial?initial.type+':'+initial.id:'';$('#replacementRemember').checked=!!mealContext?.commonHabit||!!existing&&(found.scope==='habitual'||existing.habitual);if(mealContext?.commonHabit){$('#replacementRemember').closest('label').hidden=true;$('#replacementRemember').closest('label').nextElementSibling.hidden=true;}
 function families(){$('#replacementFamilies').innerHTML=[...new Set(storeCategories($('#replacementStore').value)||[])].map(f=>'<option value="'+esc(f)+'">').join('');}
 function select(){const value=$('#replacementProduct').value,c=candidates.find(c=>c.value===value),p=c?.product,route=data.shoppingProductRoutes?.[value],same=existing?.target&&value===existing.target.type+':'+existing.target.id,home=value==='home';$('#replacementPurchaseFields').hidden=home;$('#replacementPurchaseFields').querySelectorAll('input,select').forEach(el=>el.disabled=home);$('#replacementNew').hidden=value!=='new';$('#replacementNewName').required=value==='new';$('#replacementBrand').value=(same?existing.purchaseBrand:undefined)??p?.brand??'';const kind=p?.purchaseUnit||(same?existing.purchaseUnit:'')||'';if(kind&&![...$('#replacementPackageKind').options].some(o=>o.value===kind))$('#replacementPackageKind').insertAdjacentHTML('beforeend','<option>'+esc(kind)+'</option>');$('#replacementPackageKind').value=kind;const pack=p?.purchasePack||(same?existing.purchasePack:null);$('#replacementFormat').value=p?.purchaseFormat||(same?existing.purchaseFormat:'')||(pack?pack.quantity+' '+pack.unit:'');$('#replacementCount').value=same&&existing.kind==='purchase-choice'?existing.purchaseCount??'':'';$('#replacementStore').value=route?.store||(same?existing.store:'')||'';$('#replacementFamily').value=route?.family||(same?existing.family:'')||'';$('#ingredientReplacementForm .replacement-routing').open=!$('#replacementStore').value||!$('#replacementFamily').value;families();}
 $('#replacementProduct').onchange=select;$('#replacementStore').onchange=families;select();
 function finish(){if(!mealContext)render();if(back)back();else openRecipe(recipeId);}
 $('#replacementCancel').onclick=finish;
 const fields=['ingredientReplacements','shoppingCatalog','shoppingProductRoutes','shoppingRouting','shoppingLinePresentation','plans'];
 function snapshot(){return Object.fromEntries(fields.map(k=>[k,structuredClone(data[k])]));}function rollback(before){for(const k of fields){if(before[k]===undefined)delete data[k];else data[k]=before[k];}}
 $('#replacementDelete')?.addEventListener('click',()=>{if(!confirm('Retirer cette association ? L’ingrédient original est conservé.'))return;const before=snapshot();try{if(mealContext?.liveMeal){mealContext.liveMeal.ingredientReplacements??={};mealContext.liveMeal.ingredientReplacements[key]={disabled:true};}else if(!mealContext)ingredientReplacements.remove(data,recipeId,text,found.scope,stockTools);if(!save())throw Error('Enregistrement impossible.');if(mealContext&&!mealContext.liveMeal)mealContext.onSave({disabled:true});finish();}catch(e){rollback(before);$('#replacementError').textContent=e.message;}});
 $('#ingredientReplacementForm').onsubmit=e=>{e.preventDefault();const before=snapshot();try{const value=$('#replacementProduct').value,habitual=$('#replacementRemember').checked;let rule;
 if(value==='home')rule={kind:'home',habitual};else{const c=candidates.find(c=>c.value===value),isNew=value==='new';if(!c&&!isNew)throw Error('Choisis un produit.');const p=isNew?{id:'purchase-product-'+toolId(),name:$('#replacementNewName').value.trim()}:structuredClone(c.product),target=isNew?{type:'catalog',id:p.id}:c.target,count=stockTools.amount($('#replacementCount').value),kind=$('#replacementPackageKind').value,format=$('#replacementFormat').value.trim(),pack=stockPacks.parseFormat(format),store=$('#replacementStore').value,family=$('#replacementFamily').value.trim();if(!p.name||count===null||!Number.isInteger(count)||!kind||!format)throw Error('Choisis le produit, son format et le nombre à acheter.');if(!store||!family)throw Error('Choisis le magasin et le rayon.');rule={kind:'purchase-choice',target,purchaseCount:count,purchaseUnit:kind,purchasePack:pack,purchaseFormat:format,purchaseBrand:$('#replacementBrand').value.trim(),store,family};if(data.shoppingLinePresentation?.['product:'+p.id]){data.shoppingLinePresentation['product:'+p.id].brand=rule.purchaseBrand;data.shoppingLinePresentation['product:'+p.id].format=format;}if(target.type==='catalog'){p.brand=$('#replacementBrand').value.trim();p.purchaseUnit=kind;p.purchaseFormat=format;p.store=store;p.family=family;if(pack)p.purchasePack=pack;else delete p.purchasePack;data.shoppingCatalog??=[];if(isNew)data.shoppingCatalog.push(p);else Object.assign(data.shoppingCatalog.find(p=>p.id===target.id),p);}data.shoppingProductRoutes??={};data.shoppingProductRoutes[target.type+':'+target.id]={store,family};data.shoppingRouting??={};data.shoppingRouting.stores=[...new Set([...(data.shoppingRouting.stores||[]),store])];data.shoppingRouting.families=[...new Set([...(data.shoppingRouting.families||[]),family])];}
 const scope=habitual?'habitual':'recipe';if(!mealContext||habitual)ingredientReplacements.put(data,recipeId,text,scope,rule,stockTools);if(habitual&&found.scope==='recipe')ingredientReplacements.remove(data,recipeId,text,'recipe',stockTools);if(mealContext?.liveMeal){mealContext.liveMeal.ingredientReplacements??={};mealContext.liveMeal.ingredientReplacements[key]=structuredClone(rule);}if(!save())throw Error('Enregistrement impossible.');if(mealContext&&!mealContext.liveMeal)mealContext.onSave(rule);finish();}catch(error){rollback(before);$('#replacementError').textContent=error.message;}};
}

const recipeBeforeIngredientReplacement=openRecipe;

openRecipe=function(id){recipeBeforeIngredientReplacement(id);const r=recipe(id),list=$('#dialog [data-stock-recipe-ingredients]');if(!r||!list)return;list.querySelectorAll('li').forEach((li,i)=>{const text=r.ingredients[i];if(!text)return;const found=ingredientReplacements.find(data,id,text,stockTools),product=ingredientReplacements.product(data,found.rule?.target),button=document.createElement('button');button.type='button';button.className='ingredient-replacement-access';button.textContent=product?'Achat : '+product.name:'Choisir mon produit';button.setAttribute('aria-label','Produit à acheter pour '+text);button.onclick=()=>ingredientReplacementDialog(id,text);li.append(button);});};

const shoppingBeforeReplacementUI=shopping;

const legacyHabitualChoiceDialog=habitualChoiceDialog;

habitualChoiceDialog=function(item){const uses=[...new Map((item.uses||[]).map(u=>[JSON.stringify([u.recipeId,u.originalText||u.text]),u])).values()];if(!uses.length)return legacyHabitualChoiceDialog(item);if(uses.length===1)return ingredientReplacementDialog(uses[0].recipeId,uses[0].originalText||uses[0].text,()=>{$('#dialog').close();shopping();},item.habitualProduct?{type:'catalog',id:item.habitualProduct.id}:null);modal('<h2>Ingrédient à personnaliser</h2>'+uses.map((u,i)=>'<button type="button" data-replacement-use="'+i+'">'+esc(u.name)+' · '+esc(u.originalText||u.text)+'</button>').join(''));document.querySelectorAll('[data-replacement-use]').forEach(b=>b.onclick=()=>{const u=uses[+b.dataset.replacementUse];ingredientReplacementDialog(u.recipeId,u.originalText||u.text,()=>{$('#dialog').close();shopping();},item.habitualProduct?{type:'catalog',id:item.habitualProduct.id}:null);});};

shopping=function(){shoppingBeforeReplacementUI();const items=shoppingItems();document.querySelectorAll('[data-course-index]').forEach(row=>{const item=items[+row.dataset.courseIndex];if(!item)return;const details=row.querySelector('.courses-line-details');if(!details)return;const seen=new Set();for(const use of item.uses||[]){const text=use.originalText||use.text,key=JSON.stringify([use.recipeId,text]);if(seen.has(key))continue;seen.add(key);const button=document.createElement('button');button.type='button';button.className='ingredient-replacement-access';button.textContent='Produit pour '+use.name+' · '+text;button.onclick=()=>ingredientReplacementDialog(use.recipeId,text,()=>{$('#dialog').close();shopping();});details.append(button);}if(item.replacementTarget){row.querySelectorAll('.habitual-choice-link').forEach(el=>el.remove());if(item.stockAvailable>0){const note=document.createElement('small');note.textContent='Stock : '+needsTools.quantity(item,item.stockAvailable)+' · Complément : '+needsTools.quantity(item,item.stockRemainder);row.querySelector('.courses-product').append(note);}}if(item.replacementIssue||item.stockUncertain){const note=document.createElement('p');note.className='habitual-choice-warning';note.textContent=item.replacementIssue||'Stock à vérifier : quantité ou unité incertaine. Aucun besoin retiré.';details.prepend(note);}});};

/* Access commands use the existing command component preferences, including recovery. */

visualSiteRegistry.push({key:'ui:ingredientreplacement',selector:'.ingredient-replacement-access',label:'Commande Produit à acheter',min:32,max:700});

for(const key of ['ingredientReplacements','shoppingProductRoutes'])if(!courseUndoFields.includes(key))courseUndoFields.push(key);

coursesUndoBaseline=courseUndoState();

