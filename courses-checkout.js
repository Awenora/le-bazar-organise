(function(){'use strict';
 const model=window.BazarCourseCheckout;
 function status(items=shoppingItems(),wk=datekey(coursesWeek())){
  const count=courseCartCounts(items,wk);
  return {wk,items,count,pending:model.pending(data,wk,items)};
 }
 window.updateCourseCheckout=function(items,wk){
  if(page!=='Courses')return;
  const toolbar=document.querySelector('.courses-list-toolbar');if(!toolbar)return;
  let button=document.getElementById('courseCheckout');
  if(!button){
   button=document.createElement('button');button.type='button';button.id='courseCheckout';
   button.onclick=openCheckout;toolbar.append(button);
  }
  const {count,pending}=status(items,wk);
  button.disabled=!!visualEditSession||!count.total||!!count.remaining||!pending.length||!!pendingCartChanges.size;
  button.textContent=count.total&&!pending.length?'Caddie validé ✓':'Valider mon caddie';
  button.title=count.remaining?'Coche tous les articles pour mettre le Stock à jour.':'Enregistrer les achats dans le Stock et le réfrigérateur';
 };
 function openCheckout(){
  if(visualEditSession||pendingCartChanges.size)return;
  const {wk,items,count,pending}=status();
  if(!count.total||count.remaining||!pending.length)return;
  const tables=stockRoomState().tables.filter(t=>!t.deletedAt);
  const places=familyState().locations;
  const tableName=t=>(places.find(l=>l.id===t.locationId)?.name||'Stock')+' · '+t.name;
  modal('<h2>Valider mon caddie</h2><p>Les quantités achetées seront ajoutées au Stock. Vérifie leur rangement et leur unité.</p><form id="courseCheckoutForm">'+pending.map((item,index)=>{
   const receipt=model.receipt(data,wk,item);
   if(receipt?.applied)return '<p>'+esc(item.name)+' : déjà ajouté au Stock, ne sera pas compté deux fois.</p>';
   const rows=model.matches(data,item).filter(r=>tables.some(t=>t.id===r.tableId));
   return '<fieldset data-checkout-row="'+index+'"><legend>'+esc(item.name)+'</legend><label class="field">Ranger dans<select data-checkout-destination required><option value="">Choisir…</option>'+rows.map(r=>'<option value="stock:'+esc(r.id)+'">'+esc(tableName(tables.find(t=>t.id===r.tableId))+' · '+r.name)+'</option>').join('')+tables.map(t=>'<option value="table:'+esc(t.id)+'">'+esc(tableName(t)+' · nouveau produit')+'</option>').join('')+'</select></label><label class="field">Quantité achetée à ajouter<input data-checkout-quantity type="number" min="0.00000001" step="any" required></label><label class="field">Unité<input data-checkout-unit required placeholder="kg, paquet, pièce…"></label><label class="field" data-checkout-current-label hidden>Stock actuel avant cet achat<input data-checkout-current type="number" min="0" step="any"></label></fieldset>';
  }).join('')+'<p role="alert" id="courseCheckoutError" hidden></p><button type="submit">Valider et mettre le Stock à jour</button> <button type="button" id="courseCheckoutCancel">Annuler</button></form>');
  const form=document.getElementById('courseCheckoutForm');
  for(const field of form.querySelectorAll('[data-checkout-row]')){
   const item=pending[Number(field.dataset.checkoutRow)],select=field.querySelector('[data-checkout-destination]');
   const candidates=model.matches(data,item).filter(r=>tables.some(t=>t.id===r.tableId));
   if(candidates.length===1)select.value='stock:'+candidates[0].id;
   function configure(){
    const row=select.value.startsWith('stock:')?data.inventory.items.find(r=>r.id===select.value.slice(6)):null;
    const defaults=model.defaults(data,item,row),quantity=field.querySelector('[data-checkout-quantity]'),unit=field.querySelector('[data-checkout-unit]');
    quantity.value=defaults.quantity??'';unit.value=defaults.unit;
    unit.readOnly=!!(row&&BazarPurchaseStock.unitOf(row));
    const current=field.querySelector('[data-checkout-current]'),unknown=!!row&&!Number.isFinite(row.quantity);
    current.required=unknown;current.value='';field.querySelector('[data-checkout-current-label]').hidden=!unknown;
   }
   select.onchange=configure;configure();
  }
  document.getElementById('courseCheckoutCancel').onclick=()=>document.getElementById('dialog').close();
  form.onsubmit=event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const choices={};
   for(const field of form.querySelectorAll('[data-checkout-row]')){
    const destination=field.querySelector('[data-checkout-destination]').value;
    choices[pending[Number(field.dataset.checkoutRow)].identity]={stockId:destination.startsWith('stock:')?destination.slice(6):null,
     tableId:destination.startsWith('table:')?destination.slice(6):null,quantity:field.querySelector('[data-checkout-quantity]').valueAsNumber,
     unit:field.querySelector('[data-checkout-unit]').value,current:field.querySelector('[data-checkout-current]').valueAsNumber};
   }
   const current=status();
   if(current.wk!==wk){toast('La semaine a changé. Rouvre ton caddie.');return;}
   if(familyCommit(()=>model.validate(data,wk,current.items,choices),false)){
    lastCartCheck=null;document.getElementById('dialog').close();
    refreshCoursesAtPosition();toast('Caddie validé : le Stock est à jour.');
   }else{
    const error=document.getElementById('courseCheckoutError');error.hidden=false;
    error.textContent='Le caddie n’a pas été validé. Vérifie les quantités et le rangement, puis réessaie.';
   }
  };
 }
 const beforeShopping=shopping;
 shopping=function(...args){const result=beforeShopping.apply(this,args);updateCourseCheckout();return result;};
})();
