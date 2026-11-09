const pendingCartChanges=new Set();
let lastCartTap=null;
document.addEventListener('click',event=>{
 if(event.pointerType!=='touch'&&!event.sourceCapabilities?.firesTouchEvents)return;
 const label=event.target.closest('.courses-cart-check,.cart-row');
 const input=label?.querySelector('input[data-cart],input[data-cart-restore]');
 if(!input||input.disabled)return;
 const scope=input.hasAttribute('data-cart')?'list':'caddie';
 // A second tap at the same spot must not select the row that just moved there.
 if(lastCartTap&&lastCartTap.scope===scope&&lastCartTap.input!==input&&
    event.timeStamp-lastCartTap.time<420&&
    Math.hypot(event.clientX-lastCartTap.x,event.clientY-lastCartTap.y)<20){
  event.preventDefault();
  event.stopImmediatePropagation();
  return;
 }
 lastCartTap={scope,input,x:event.clientX,y:event.clientY,time:event.timeStamp};
},true);
function changeCourseCart(input,wk,item,onSettled){
 if(!item)return;
 const previous=!!courseList.weekState(data,wk).checked[item.identity];
 const desired=input.checked;
 const key=JSON.stringify([wk,item.identity]);
 if(visualEditSession||pendingCartChanges.has(key)){
  input.checked=previous;
  return;
 }
 if(previous===desired)return;
 pendingCartChanges.add(key);
 input.disabled=true;
 const row=input.closest('.courses-line');
 row?.classList.toggle('is-in-cart',desired);
 let completed=false;
 const commit=()=>{
  if(completed)return;
  completed=true;
  clearTimeout(fallback);
  const saved=familyCommit(()=>familyShop.withProductReadCache(()=>{
   courseList.setChecked(data,wk,item,desired);
  }),false);
  pendingCartChanges.delete(key);
  if(input.isConnected)input.disabled=false;
  if(!saved){
   input.checked=!!courseList.weekState(data,wk).checked[item.identity];
   row?.classList.toggle('is-in-cart',input.checked);
  }
  onSettled(saved);
 };
 // Give the browser a frame to show the checkmark before saving and rebuilding.
 const fallback=setTimeout(commit,100);
 requestAnimationFrame(()=>requestAnimationFrame(commit));
}
let lastCartCheck=null;
function coursesCaddieDialog(){const wk=datekey(coursesWeek()),state=courseList.weekState(data,wk),items=shoppingItems().filter(i=>state.checked[i.identity]&&!state.excluded[i.identity]);modal('<h2>Dans mon caddie</h2><p>Décoche un produit pour le remettre dans les courses restantes.</p><div class="cart-rows">'+items.map((item,i)=>'<label class="cart-row"><input type="checkbox" checked data-cart-restore="'+i+'"><strong>'+esc(needsTools.quantity({...item,unit:item.purchaseDisplay?.unit||item.unit},item.purchaseDisplay?item.purchaseDisplay.quantity:item.purchase))+'</strong><span>'+esc(item.name)+'</span></label>').join('')+(!items.length?'<p>Le caddie est vide.</p>':'')+'</div>');document.querySelectorAll('[data-cart-restore]').forEach(input=>input.onchange=()=>{changeCourseCart(input,wk,items[+input.dataset.cartRestore],saved=>{if(saved)lastCartCheck=null;const refreshDialog=input.isConnected&&$('#dialog').open;if(page==='Courses'&&datekey(coursesWeek())===wk)shopping();if(refreshDialog)coursesCaddieDialog();});});}
const shoppingBeforeImmediateCart=shopping;
shopping=function(){shoppingBeforeImmediateCart();if(page!=='Courses')return;const wk=datekey(coursesWeek()),items=shoppingItems(),state=courseList.weekState(data,wk),count=courseList.counts(items,state);const button=$('#listHideChecked');if(button){button.textContent='Dans mon caddie ('+count.checked+')';button.removeAttribute('aria-pressed');button.onclick=coursesCaddieDialog;}
 document.querySelectorAll('[data-cart]').forEach(input=>{const previous=input.onchange;input.onchange=()=>{const item=items[+input.dataset.cart];if(input.checked&&item)lastCartCheck={week:wk,item};previous();};});
 if(lastCartCheck?.week===wk&&state.checked[lastCartCheck.item.identity]){const notice=document.createElement('div');notice.className='cart-undo';notice.setAttribute('role','status');notice.innerHTML=esc(lastCartCheck.item.name)+' ajouté au caddie. <button type="button">Annuler la coche</button>';notice.querySelector('button').onclick=()=>{courseList.setChecked(data,wk,lastCartCheck.item,false);lastCartCheck=null;save();shopping();};$('#main .courses-list-toolbar')?.after(notice);}
};
visualSiteRegistry.push({key:'ui:cartbutton',selector:'#listHideChecked',label:'Bouton Dans mon caddie',min:100,max:500});
