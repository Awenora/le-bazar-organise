const pendingCartChanges=new Set();
const phoneCartCommits=[];
let phoneCartCommitTimer,phoneCartBatchSettling=false;
function commitNextPhoneCartChange(){
 clearTimeout(phoneCartCommitTimer);phoneCartCommitTimer=undefined;
 const changes=phoneCartCommits.splice(0);if(!changes.length)return;
 const saved=familyCommit(()=>familyShop.withProductReadCache(()=>{
  for(const change of changes)change.apply();
 }),false);
 phoneCartBatchSettling=true;
 try{for(const change of changes)change.settle(saved);}finally{phoneCartBatchSettling=false;}
 window.BazarCloud?.tryApply?.();
}
function queuePhoneCartCommit(change){
 phoneCartCommits.push(change);
 clearTimeout(phoneCartCommitTimer);
 phoneCartCommitTimer=setTimeout(commitNextPhoneCartChange,600);
}
window.addEventListener('pagehide',commitNextPhoneCartChange);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')commitNextPhoneCartChange();});
// Finish the pending batch before opening another action or leaving the list.
document.addEventListener('click',event=>{
 if(phoneCartCommits.length&&!event.target.closest('.courses-cart-check')&&event.target.closest('button,a,select,input'))commitNextPhoneCartChange();
},true);
let lastCartTap=null;
// Preview touch feedback on contact; only a stationary release commits it.
let courseTouchGesture=null,courseTouchClick=null;
function cancelCourseTouch(){
 const gesture=courseTouchGesture;courseTouchGesture=null;
 if(!gesture)return;
 courseTouchClick={input:gesture.input,until:performance.now()+1000};
 gesture.input.checked=gesture.previous;
 gesture.input.closest('.courses-line')?.classList.toggle('is-in-cart',gesture.previous);
}
document.addEventListener('pointerdown',event=>{
 courseTouchClick=null;
 if(event.pointerType!=='touch'||!phoneAppearanceLocked||visualEditSession)return;
 if(courseTouchGesture){cancelCourseTouch();return;}
 const input=event.target.closest('.courses-cart-check')?.querySelector('input[data-cart]');
 if(!input||input.disabled)return;
 courseTouchGesture={input,previous:input.checked,pointer:event.pointerId,x:event.clientX,y:event.clientY};
 input.checked=!input.checked;
 input.closest('.courses-line')?.classList.toggle('is-in-cart',input.checked);
},{capture:true,passive:true});
document.addEventListener('pointermove',event=>{
 const gesture=courseTouchGesture;
 if(gesture?.pointer===event.pointerId&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)cancelCourseTouch();
},{capture:true,passive:true});
document.addEventListener('pointercancel',cancelCourseTouch,{capture:true,passive:true});
document.addEventListener('pointerup',event=>{
 const gesture=courseTouchGesture;
 if(!gesture||gesture.pointer!==event.pointerId)return;
 const label=gesture.input.closest('.courses-cart-check');
 if(!gesture.input.isConnected||!label?.contains(event.target)||Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10){cancelCourseTouch();return;}
 courseTouchGesture=null;
 courseTouchClick={input:gesture.input,until:performance.now()+1000};
 gesture.input.dispatchEvent(new Event('input',{bubbles:true}));
 gesture.input.dispatchEvent(new Event('change',{bubbles:true}));
},{capture:true,passive:true});
document.addEventListener('click',event=>{
 if(event.pointerType!=='touch'&&!event.sourceCapabilities?.firesTouchEvents)return;
 if(!event.isTrusted||!courseTouchClick||performance.now()>courseTouchClick.until)return;
 const label=event.target.closest('.courses-cart-check');
 if(label?.contains(courseTouchClick.input)){
  event.preventDefault();event.stopImmediatePropagation();courseTouchClick=null;
 }
},true);
document.addEventListener('scroll',cancelCourseTouch,{capture:true,passive:true});
let phoneCourseScrollTime=-Infinity;
function phoneCoursesScrolling(){return performance.now()-phoneCourseScrollTime<300;}
document.addEventListener('scroll',event=>{
 if(phoneAppearanceLocked&&page==='Courses'&&event.target.matches?.('#main,.courses-board'))phoneCourseScrollTime=performance.now();
},{capture:true,passive:true});
document.addEventListener('click',event=>{
 if(event.pointerType!=='touch'&&!event.sourceCapabilities?.firesTouchEvents)return;
 const label=event.target.closest('.courses-cart-check,.cart-row');
 const input=label?.querySelector('input[data-cart],input[data-cart-restore]');
 if(!input||input.disabled)return;
 const scope=input.hasAttribute('data-cart')?'list':'caddie';
 // A second tap at the same spot must not select the row that just moved there.
 if(lastCartTap&&lastCartTap.scope===scope&&lastCartTap.input!==input&&
    (!phoneAppearanceLocked||scope==='caddie'||!lastCartTap.input.isConnected)&&
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
 let completed=false,fallback;
 const apply=()=>courseList.setChecked(data,wk,item,desired);
 const settle=saved=>{
  if(completed)return;
  completed=true;clearTimeout(fallback);
  pendingCartChanges.delete(key);
  if(input.isConnected&&(!saved||!keepDisabled))input.disabled=false;
  if(!saved){
   input.checked=!!courseList.weekState(data,wk).checked[item.identity];
   row?.classList.toggle('is-in-cart',input.checked);
  }
  onSettled(saved);
 };
 const commit=()=>{if(!completed)settle(familyCommit(()=>familyShop.withProductReadCache(apply),false));};
 // Persist just the selection immediately; prepare the full cache off the UI thread.
 const cloud=window.BazarCloud,receipt=data.shoppingStockReceipts?.[wk]?.[item.identity];
 if(keepDisabled&&cloud?.cartSelectionsAvailable&&!(receipt?.applied&&!receipt.finalized&&!desired)){
  const before=cloud.captureCartFields(data);
  let saved=false;
  try{apply();saved=cloud.saveCartSelections(before,cloud.captureCartFields(data));}
  catch(error){
   for(const field of ['shoppingCaddie','shoppingExcluded','shoppingStockReceipts']){delete data[field];if(Object.hasOwn(before,field))data[field]=before[field];}
   toast('Enregistrement impossible : la coche a été annulée.');
  }
  settle(saved);return;
 }
 // Older browsers retain the existing save path.
 if(keepDisabled){queuePhoneCartCommit({apply,settle});return;}
 fallback=setTimeout(commit,100);
 requestAnimationFrame(()=>requestAnimationFrame(commit));
}
let lastCartCheck=null;

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
  refreshCoursesAtPosition();
 };
 return created;
}

// Keep the first surviving article in view when the mobile list changes.
function rememberPhoneCoursePosition(removed){
 if(!phoneAppearanceLocked||page!=='Courses')return ()=>{};
 const board=$('#main .courses-board');
 if(!board)return ()=>{};
 const collapsed=[...board.querySelectorAll('.courses-primary-category:not([open]),.courses-restock-store:not([open])')].map(group=>group.id).filter(Boolean);
 const bounds=board.getBoundingClientRect(),scrollTop=board.scrollTop;
 const visible=[...board.querySelectorAll('[data-cart-item]')].filter(row=>row!==removed&&!row.classList.contains('is-in-cart')).map(row=>[row,row.getBoundingClientRect()]).filter(([,rect])=>rect.height&&rect.bottom>bounds.top&&rect.top<bounds.bottom).sort((a,b)=>Number(a[1].top<bounds.top)-Number(b[1].top<bounds.top)||a[1].top-b[1].top);
 const anchors=scrollTop?visible.map(([row,rect])=>[row.dataset.cartItem,rect.top]):[];
 return ()=>{
  const current=$('#main .courses-board');
  if(!current||page!=='Courses'||current.dataset.courseWeek!==board.dataset.courseWeek)return;
  if(current!==board)for(const id of collapsed){
   const group=current.querySelector('#'+CSS.escape(id));
   if(group)group.open=false;
  }
  for(const [id,offset]of anchors){
   const row=current.querySelector('[data-cart-item='+CSS.escape(id)+']');
   if(!row?.getClientRects().length)continue;
   current.scrollTop+=row.getBoundingClientRect().top-Math.max(offset,current.getBoundingClientRect().top);
   return;
  }
  current.scrollTop=scrollTop;
 };
}

function refreshCoursesAtPosition(){
 const restore=rememberPhoneCoursePosition();
 shopping();
 restore();
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
 changeCourseCart(input,wk,item,saved=>{
  if(input.isConnected)input.disabled=false;
  if(saved)lastCartCheck=input.checked?{week:wk,item}:null;
  if(page!=='Courses'||datekey(coursesWeek())!==wk)return;
  if(!row?.isConnected){if(saved)refreshCoursesAtPosition();return;}
  if(saved){
   const count=courseCartCounts(items,wk);
   updateCourseCartCount(count.checked);
   const remaining=$('#main .courses-remaining');
   if(remaining)remaining.textContent=count.remaining+' article'+(count.remaining!==1?'s':'')+' restant'+(count.remaining!==1?'s':'');
   if(count.remaining)$('#main .courses-list-empty')?.remove();
   window.updateCourseCheckout?.(items,wk);

  }
  if(!phoneCartBatchSettling&&!window.BazarCloud?.cartSelectionsPending)window.BazarCloud?.tryApply?.();
 },!!(phoneAppearanceLocked&&row));
}
function coursesCaddieDialog(){const wk=datekey(coursesWeek()),state=courseList.weekState(data,wk),items=shoppingItems().filter(i=>state.checked[i.identity]&&!state.excluded[i.identity]);modal('<h2>Dans mon caddie</h2><p>Décoche un produit pour le remettre dans les courses restantes.</p><div class="cart-rows">'+items.map((item,i)=>'<label class="cart-row"><input type="checkbox" checked data-cart-restore="'+i+'"><strong>'+esc(needsTools.quantity({...item,unit:item.purchaseDisplay?.unit||item.unit},item.purchaseDisplay?item.purchaseDisplay.quantity:item.purchase))+'</strong><span>'+esc(item.name)+'</span></label>').join('')+(!items.length?'<p>Le caddie est vide.</p>':'')+'</div>');document.querySelectorAll('[data-cart-restore]').forEach(input=>input.onchange=()=>{changeCourseCart(input,wk,items[+input.dataset.cartRestore],saved=>{if(saved)lastCartCheck=null;const refreshDialog=input.isConnected&&$('#dialog').open;if(page==='Courses'&&datekey(coursesWeek())===wk)refreshCoursesAtPosition();if(refreshDialog)coursesCaddieDialog();});});}
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
