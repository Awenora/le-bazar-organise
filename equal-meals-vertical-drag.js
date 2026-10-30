/* Ne pas recalculer le zoom au relâchement : il annulait visuellement le déplacement vertical. */
let stockPositionCommit=false;
const fitBeforePositionCommit=fitReserveCollection;
fitReserveCollection=function(){if(!stockPositionCommit&&!stockBlockDrag)fitBeforePositionCommit()};
const finishBeforePositionCommit=finishStockBlock;
finishStockBlock=function(e,cancel=false){stockPositionCommit=true;try{finishBeforePositionCommit(e,cancel)}finally{stockPositionCommit=false}};
/* La position reste dans la surface visible ; le zoom est constant pendant le geste. */
const moveBeforeStockBounds=moveStockBlock;
moveStockBlock=function(e){moveBeforeStockBounds(e);const d=stockBlockDrag,viewport=$('#freeStockViewport');if(!d||d.pointer!==e.pointerId||!viewport)return;const width=viewport.clientWidth/d.scale,height=viewport.clientHeight/d.scale;d.card.style.left=Math.max(0,Math.min(parseFloat(d.card.style.left)||0,Math.max(0,width-d.card.offsetWidth)))+'px';d.card.style.top=Math.max(0,Math.min(parseFloat(d.card.style.top)||0,Math.max(0,height-d.card.offsetHeight)))+'px'};
/* Les écouteurs document utilisent les fonctions courantes plutôt qu'une ancienne version capturée. */
if(typeof document.removeEventListener==='function')document.removeEventListener('pointermove',moveBeforeStockBounds,true);
document.addEventListener('pointermove',e=>{if(stockBlockDrag)moveStockBlock(e)},{capture:true,passive:false});
/* Conserver le rayon reconnu, même si un ancien retrait l'avait masqué. */
familyOf=function(item){return automaticShoppingFamily(item)};
/* Confirmer la disponibilité sans créer de quantité fictive. */
confirmIngredientReady=function(item){data.confirmedIngredients??={};const key=item.baseKey||ingredientKey(item.text);data.confirmedIngredients[key]=true;data.stock??={};data.stock[key]=true;save();shopping()};
const shoppingBeforeSmallStock=shopping;
shopping=function(){shoppingBeforeSmallStock();document.querySelectorAll('[data-bought]').forEach(b=>{b.textContent='Stock';b.classList.add('ingredient-stock-button');b.title='Déjà en stock : cocher cet ingrédient dans les recettes';const title=b.closest('.shop-item')?.querySelector(':scope > strong');if(title)title.appendChild(b)})};
/* Retours silencieux après les actions réussies ; conserver les erreurs utiles. */
const toastBeforeQuietActions=toast;
toast=function(message){if(/ajouté|ajoutée|enregistré|enregistrée|supprimé|supprimée|déplacé|déplacée|annulée|annulé|remis dans les courses|coché dans|mis à jour/i.test(String(message)))return;toastBeforeQuietActions(message)};
render();
/* Un rayon reconnu qui contient des achats reste visible. */
shoppingGroupNames=function(store,items){const occupied=items.map(familyOf);return [...new Set([...occupied,...(data.shoppingCategories?.[store]||[])])].filter(c=>occupied.includes(c)||!(data.hiddenShoppingCategories?.[store]||[]).includes(c)).sort((a,b)=>orderPosition(data.shoppingCategoryOrder?.[store],a)-orderPosition(data.shoppingCategoryOrder?.[store],b))};
/* Réparer uniquement les classements devenus Sans catégorie et encore reconnaissables. */
function repairUncategorizedIngredients(){let changed=false;for(const r of data.recipes)for(const text of r.ingredients){const key=ingredientKey(text);if(data.productFamilies?.[key]!=='Sans catégorie')continue;const former=data.productFamilies[key];delete data.productFamilies[key];const family=automaticShoppingFamily({key,text});if(family&&family!=='Sans catégorie'&&family!=='Autres'){data.productFamilies[key]=family;changed=true}else data.productFamilies[key]=former}if(changed)save()}
repairUncategorizedIngredients();render();
