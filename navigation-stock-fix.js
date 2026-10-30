/* Une année et une seule navigation communes à toutes les rubriques. */
const alignBeforeYearEverywhere=alignPlanningHeader;
alignPlanningHeader=function(){alignBeforeYearEverywhere();const year=$('#plannerYear'),nav=$('#globalNav'),head=$('header');if(!year)return;year.hidden=false;year.textContent=planningYearText();if(page!=='À table !'&&nav&&head){const n=nav.getBoundingClientRect(),h=head.getBoundingClientRect();year.style.left='8px';year.style.width=Math.max(55,n.left-20)+'px';year.style.top=(h.top+Math.max(2,(h.height-33)/2))+'px'}};
function trimDuplicateTitles(){document.querySelectorAll('#main>.intro>h2,#main>section.panel>.catalog-heading>h2,#main>section.panel>.toolbar>.courses-title,#main .stock-toolbar>h2').forEach(h=>{if(['Nos recettes','Courses','Stock','Les carnets de famille'].includes(h.textContent.trim()))h.remove()})}
/* Les actions dans Des idées restent silencieuses, sans masquer les erreurs ailleurs. */
let quietIdeasAction=false;
const toastBeforeQuietIdeas=toast;
toast=function(message){if(quietIdeasAction&&!/(impossible|erreur|échec|invalide|introuvable)/i.test(String(message))||/^(?:repas |recette |idée ).*(?:idées|zone de côté)/i.test(String(message)))return;return toastBeforeQuietIdeas(message)};
function withoutIdeasNotice(fn){const previous=quietIdeasAction;quietIdeasAction=true;try{return fn()}finally{quietIdeasAction=previous;removalNoticeDeadline=0;const notice=$('#removalUndo');if(notice)notice.hidden=true}}
const parkBeforeQuiet=parkPayload,trashBeforeQuiet=trashPayload;
parkPayload=function(payload){return withoutIdeasNotice(()=>parkBeforeQuiet(payload))};
trashPayload=function(payload){return String(payload).startsWith('park:')?withoutIdeasNotice(()=>trashBeforeQuiet(payload)):trashBeforeQuiet(payload)};
/* Le bloc semaine et le sélecteur suivent le magasin réellement affiché. */
function syncTopCourseControls(){if(page!=='Courses')return;const visible=Array.from(document.querySelectorAll('.shop-store')).filter(el=>!el.hidden).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left),store=visible[0];if(!store)return;const r=store.getBoundingClientRect();for(const el of [$('#main .courses-arrow-nav'),$('#main .courses-display-controls')]){if(!el)continue;const current=el.getBoundingClientRect().left-(parseFloat(el.style.marginLeft)||0);el.style.width=r.width+'px';el.style.maxWidth='100%';el.style.marginLeft=Math.max(0,r.left-current)+'px'}const picker=$('#coursesStoreView');if(picker)picker.style.width=r.width+'px'}
const shoppingBeforeControlAlignment=shopping;
shopping=function(){shoppingBeforeControlAlignment();trimDuplicateTitles();syncTopCourseControls()};
const applyBeforeControlAlignment=applyCoursesLayout;
applyCoursesLayout=function(){applyBeforeControlAlignment();syncTopCourseControls()};
/* Les anciennes cartes peuvent se chevaucher après un élargissement : trouver un espace proche. */
function nearestStockPosition(desired,size,boxes){const valid=p=>p.x>=0&&p.y>=0&&stockPacks.canPlace({...p,...size},boxes),points=[desired,{x:0,y:desired.y},{x:desired.x,y:0}];for(const b of boxes){for(const x of [desired.x,0,b.x,b.x+b.width+12,Math.max(0,b.x-size.width-12)])for(const y of [desired.y,0,b.y,b.y+b.height+12,Math.max(0,b.y-size.height-12)])points.push({x,y})}const candidates=points.filter(valid);candidates.sort((a,b)=>(a.x-desired.x)**2+(a.y-desired.y)**2-((b.x-desired.x)**2+(b.y-desired.y)**2));return candidates[0]||{x:0,y:Math.max(0,...boxes.map(b=>b.y+b.height))+12}}
function repairStockOverlaps(){if(page!=='Réserves')return;const positions=stockPacks.layout(data,freeMode()),boxes=[];let changed=false;document.querySelectorAll('[data-free-category]').forEach(card=>{const id=card.dataset.freeCategory,size={width:card.offsetWidth,height:card.offsetHeight},desired={x:parseFloat(card.style.left)||0,y:parseFloat(card.style.top)||0};const p=nearestStockPosition(desired,size,boxes);if(p.x!==desired.x||p.y!==desired.y){positions[id]={x:Math.round(p.x),y:Math.round(p.y)};card.style.left=p.x+'px';card.style.top=p.y+'px';changed=true}boxes.push({id,...p,...size})});if(changed)save();freeExpandCanvas();freeWarnOverlaps()}
const freePointerEndBeforeRepair=freePointerEnd;
freePointerEnd=function(e){const drag=stockFreeDrag;if(!drag||drag.kind!=='category')return freePointerEndBeforeRepair(e);if(e.pointerId!==drag.pointer)return;stockFreeDrag=null;drag.card.classList.remove('free-dragging','free-drop-invalid');if(drag.moved){const desired=drag.next||{x:drag.x,y:drag.y},size={width:drag.card.offsetWidth,height:drag.card.offsetHeight},p=nearestStockPosition(desired,size,freeCardBoxes(drag.id));stockPacks.layout(data,stockCanvasMode)[drag.id]={x:Math.round(p.x),y:Math.round(p.y)};drag.card.style.left=p.x+'px';drag.card.style.top=p.y+'px';save()}if(drag.head.hasPointerCapture?.(e.pointerId))drag.head.releasePointerCapture(e.pointerId);freeExpandCanvas();freeWarnOverlaps()};
const freeBindBeforeRepair=freeBindPointers;
freeBindPointers=function(){freeBindBeforeRepair();document.querySelectorAll('[data-free-head]').forEach(head=>{const old=head.onpointerdown;head.onpointerdown=e=>{e.stopPropagation();old(e);if(stockFreeDrag?.kind==='category')stockFreeDrag.fitScale=reserveViewScale};head.onpointerup=e=>freePointerEnd(e)})};
function alignStockCommands(){if(page!=='Réserves')return;const workspace=$('.reserve-workspace'),nav=$('#globalNav button');if(!workspace||!nav)return;const base=workspace.getBoundingClientRect().left-(parseFloat(workspace.style.marginLeft)||0),offset=Math.max(0,nav.getBoundingClientRect().left-base);workspace.style.marginLeft=offset+'px';workspace.style.width='calc(100% - '+offset+'px)'}
const reservesBeforeRepair=reserves;
reserves=function(){reservesBeforeRepair();trimDuplicateTitles();alignStockCommands();repairStockOverlaps()};
const notebooksBeforeTitleCleanup=notebooks;
notebooks=function(){notebooksBeforeTitleCleanup();trimDuplicateTitles()};
const catalogPageBeforeTitleCleanup=catalogPage;
catalogPage=function(){catalogPageBeforeTitleCleanup();trimDuplicateTitles()};
const renderBeforeNavigationFix=render;
render=function(){renderBeforeNavigationFix();trimDuplicateTitles();alignPlanningHeader();if(page==='Réserves')alignStockCommands();if(page==='Courses')syncTopCourseControls()};
window.addEventListener('resize',()=>{alignPlanningHeader();alignStockCommands();syncTopCourseControls()});
document.addEventListener('pointerup',()=>{if(page==='Courses')requestAnimationFrame(syncTopCourseControls)},true);
render();
