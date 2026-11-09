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
function changeCourseCart(input,wk,item,onSettled,keepDisabled=false){
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
  if(input.isConnected&&(!saved||!keepDisabled))input.disabled=false;
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
const courseCartRefreshBoards=new WeakSet();

function courseCartCounts(items,wk){
 return courseList.counts(items,courseList.weekState(data,wk));
}

function updateCourseCartCount(count){
 const button=$('#listHideChecked');
 if(!button)return;
 const text='Dans mon caddie ('+count+')',original=button.dataset.commandOriginal;
 if(!original||button.textContent===original)button.textContent=text;
 if(original){
  if(button.getAttribute('aria-label')===original)button.setAttribute('aria-label',text);
  if(button.title===original)button.title=text;
  if(button.dataset.commandAria===original)button.dataset.commandAria=text;
  button.dataset.commandOriginal=text;
 }
}

function updateCourseCartNotice(wk){
 const toolbar=$('#main .courses-list-toolbar');
 if(!toolbar||lastCartCheck?.week!==wk||!courseList.weekState(data,wk).checked[lastCartCheck.item.identity])return false;
 let notice=$('#main .cart-undo');
 const created=!notice;
 if(created){
  notice=document.createElement('div');
  notice.className='cart-undo';
  notice.id='courseCartNotice';
  notice.setAttribute('role','status');
  notice.innerHTML='<span></span> <button type="button">Annuler la coche</button>';
  toolbar.append(notice);
 }
 const item=lastCartCheck.item;
 notice.querySelector('span').textContent=item.name+' ajouté au caddie.';
 notice.querySelector('button').onclick=()=>{
  courseList.setChecked(data,wk,item,false);
  lastCartCheck=null;
  save();
  shopping();
 };
 return created;
}

function finishPhoneCartRow(row,wk,items){
 const board=row.closest('.courses-board');
 const category=row.closest('.courses-primary-category');
 row.remove();
 if(category&&!category.querySelector('.courses-line')){
  const store=category.closest('[data-course-primary]')?.dataset.coursePrimary;
  const configured=Object.keys(coursesPresentation().categories?.[store]||{});
  if(!configured.some(name=>BazarCoursesOrganisation.family(name)===category.dataset.family))category.remove();
 }
 if(board.querySelector('.courses-line.is-in-cart'))return;
 if(courseCartRefreshBoards.delete(board))shopping();
 else updatePhoneCartSummary(wk,items,board);
 window.BazarCloud?.tryApply?.();
}

function updatePhoneCartSummary(wk,items,board){
 const count=courseCartCounts(items,wk);
 if(count.total&&!count.remaining&&!$('.courses-list-empty')){
  const message=document.createElement('p');
  message.className='courses-list-empty';
  message.textContent='Tous les articles sont dans ton caddie.';
  board.after(message);
 }
 const undo=$('#listUndo');
 const showUndo=!!(undo?.hidden&&(window.BazarCloud?(BazarCloud.engine.state.actions||[]).length:coursesUndoStack.length));
 if(showUndo)undo.hidden=false;
 if(updateCourseCartNotice(wk)||showUndo){
  applyDetailedComponents();
  applySharedGroups();
 }
}

function checkCourseListItem(input,wk,item,items){
 const row=input.closest('.courses-line');
 const keepVisible=phoneAppearanceLocked&&row;
 const removeAt=performance.now()+500;
 changeCourseCart(input,wk,item,saved=>{
  if(saved)lastCartCheck={week:wk,item};
  if(page!=='Courses'||datekey(coursesWeek())!==wk)return;
  if(!keepVisible){shopping();return;}
  if(!row.isConnected){if(saved)shopping();return;}
  if(!saved){
   const board=row.closest('.courses-board');
   if(!board.querySelector('.courses-line.is-in-cart')){
    if(courseCartRefreshBoards.delete(board))shopping();
    window.BazarCloud?.tryApply?.();
   }
   return;
  }
  const receipt=data.shoppingStockReceipts?.[wk]?.[item.identity];
  if(receipt?.applied||receipt?.coordinatedIds?.length||item.automaticRestock||
     (!item.manual&&item.uses?.length&&items.some(i=>i.automaticRestock))){
   courseCartRefreshBoards.add(row.closest('.courses-board'));
  }
  updateCourseCartCount(courseCartCounts(items,wk).checked);
  setTimeout(()=>{
   if(row.isConnected&&page==='Courses'&&datekey(coursesWeek())===wk)finishPhoneCartRow(row,wk,items);
  },Math.max(0,removeAt-performance.now()));
 },keepVisible);
}
function coursesCaddieDialog(){const wk=datekey(coursesWeek()),state=courseList.weekState(data,wk),items=shoppingItems().filter(i=>state.checked[i.identity]&&!state.excluded[i.identity]);modal('<h2>Dans mon caddie</h2><p>Décoche un produit pour le remettre dans les courses restantes.</p><div class="cart-rows">'+items.map((item,i)=>'<label class="cart-row"><input type="checkbox" checked data-cart-restore="'+i+'"><strong>'+esc(needsTools.quantity({...item,unit:item.purchaseDisplay?.unit||item.unit},item.purchaseDisplay?item.purchaseDisplay.quantity:item.purchase))+'</strong><span>'+esc(item.name)+'</span></label>').join('')+(!items.length?'<p>Le caddie est vide.</p>':'')+'</div>');document.querySelectorAll('[data-cart-restore]').forEach(input=>input.onchange=()=>{changeCourseCart(input,wk,items[+input.dataset.cartRestore],saved=>{if(saved)lastCartCheck=null;const refreshDialog=input.isConnected&&$('#dialog').open;if(page==='Courses'&&datekey(coursesWeek())===wk)shopping();if(refreshDialog)coursesCaddieDialog();});});}
const shoppingBeforeImmediateCart=shopping;
shopping=function(){
 shoppingBeforeImmediateCart();
 if(page!=='Courses')return;
 const wk=datekey(coursesWeek()),items=shoppingItems(),button=$('#listHideChecked');
 if(button){
  updateCourseCartCount(courseCartCounts(items,wk).checked);
  button.removeAttribute('aria-pressed');
  button.onclick=coursesCaddieDialog;
 }
 updateCourseCartNotice(wk);
};
visualSiteRegistry.push({key:'ui:cartbutton',selector:'#listHideChecked',label:'Bouton Dans mon caddie',min:100,max:500});
