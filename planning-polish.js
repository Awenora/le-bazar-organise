/* Retouches limitées au calendrier, à la corbeille et aux filtres. */
function syncPlannerTrashHeight(){const ideas=$('#parkingZone');if(!ideas?.getBoundingClientRect)return;const rect=ideas.getBoundingClientRect();document.body.style.setProperty('--ideas-top',rect.top+'px');document.body.style.setProperty('--ideas-height',rect.height+'px')}
function requestTrashEmpty(){if(!(data.trash||[]).length)return;modal('<h2>Vider la corbeille ?</h2><p>'+data.trash.length+' repas retiré(s) seront effacés de la corbeille. Les recettes du catalogue seront conservées.</p><button id="confirmEmptyTrash">Vider la corbeille</button>');$('#confirmEmptyTrash').onclick=()=>{rememberRemoval();data.trash=[];save();$('#dialog').close();render();toast('Corbeille vidée')};}
const beforePolishPlannerTools=plannerTools;
let trashSizeObserver=null;
plannerTools=function(){beforePolishPlannerTools();if($('#emptyTrash'))$('#emptyTrash').onclick=requestTrashEmpty;if(typeof requestAnimationFrame==='function')requestAnimationFrame(syncPlannerTrashHeight);if(typeof ResizeObserver==='function'){trashSizeObserver?.disconnect();const ideas=$('#parkingZone');if(ideas){trashSizeObserver=new ResizeObserver(syncPlannerTrashHeight);trashSizeObserver.observe(ideas)}}};
if(typeof window.addEventListener==='function')window.addEventListener('resize',syncPlannerTrashHeight);
function bindWorkingFilters(el){el.querySelectorAll('[data-filter]').forEach(button=>{button.type='button';button.onclick=e=>{e.preventDefault();e.stopPropagation();filter=button.dataset.filter;catalog(el)}})}
const beforePolishCatalog=catalog;
catalog=function(el){beforePolishCatalog(el);if(el.id==='side'){
 el.querySelectorAll('.category-edit').forEach(wrapper=>{const button=wrapper.querySelector('[data-filter]');if(button)wrapper.replaceWith(button)});
 const filters=el.querySelector('.filters'),add=el.querySelector('#sideCategories');
 if(add&&filters){const menu=document.createElement('details');menu.className='side-category-menu';menu.innerHTML='<summary aria-label="Gérer les catégories" title="Catégories">⋯</summary><div><button type="button" data-category-action="add">Ajouter une catégorie</button><button type="button" data-category-action="manage">Gérer / supprimer les catégories</button></div>';add.remove();const tools=document.createElement('div');tools.className='side-filter-toolbar';filters.replaceWith(tools);tools.appendChild(filters);tools.appendChild(menu);menu.querySelectorAll('[data-category-action]').forEach(button=>button.onclick=()=>{categories();if(button.dataset.categoryAction==='add')$('#newcategory')?.focus()})}
 }bindWorkingFilters(el)};
render();
