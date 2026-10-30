/* Extension du registre et de la session existants : aucune donnée métier. */
const commandRegistry=[
 ['course:control-organizer','#listOrganizer','Courses · Organiser mes courses','button','☷'],
 ['course:control-products','#habitualProductsOpen','Courses · Produits habituels','button','▤'],
 ['course:control-period','.courses-arrow-nav','Courses · Période','group'],
 ['course:control-previous','#listPrevious','Courses · Semaine précédente','button','‹'],
 ['course:control-next','#listNext','Courses · Semaine suivante','button','›'],
 ['course:control-store','.courses-store-filter','Courses · Magasin','select'],
 ['course:control-remaining','.courses-remaining','Courses · Articles restants','status'],
 ['course:control-cart','#listHideChecked','Courses · Caddie','button','🛒'],
 ['course:control-excluded','#listExcluded','Courses · Articles retirés','button','▣'],
 ['course:control-undo','#listUndo','Courses · Annuler','button','↶'],
 ['course:control-arrange','#courseArrange','Courses · Ranger les tableaux','button','▦'],
 ['planning-extra:control-week','#weekly','À table · Onglet Cette semaine','button','▦'],
 ['planning-extra:control-recipes','#recipes','À table · Onglet Recettes','button','▤'],
 ['planning-extra:control-search','#side .recipe-compact-search','À table · Recherche','search'],
 ['planning-extra:control-sort','#side .recipe-toolstrip>button:first-of-type','À table · Trier','button','↕'],
 ['planning-extra:control-categories','#side .recipe-toolstrip>button:nth-of-type(2)','À table · Catégories','button','☷'],
 ['planning-extra:control-notebook','#side .side-notebook-label','À table · Carnet','select']
].map(([key,selector,label,kind,icon])=>({key,selector,label,kind,icon}));
function registerCourseCommands(){
 const add=r=>{if(!commandRegistry.some(x=>x.key===r.key))commandRegistry.push(r);};
 document.querySelectorAll('[data-list-add-store]').forEach(el=>{const store=el.dataset.listAddStore;add({key:'course:control-addstore:'+encodeURIComponent(store),selector:'[data-list-add-store='+JSON.stringify(store)+']',label:'Courses · Ajouter un article · '+store,kind:'button',icon:'＋'});});
 document.querySelectorAll('.courses-table[data-course-table]').forEach(table=>{const id=table.dataset.courseTable;add({key:'course:control-addtable:'+id,selector:'.courses-table[data-course-table='+JSON.stringify(id)+'] [data-list-add]',label:'Courses · Ajouter · '+table.dataset.courseStore+' · '+table.dataset.courseFamily,kind:'button',icon:'＋'});});
}
function commandEntry(key){return commandRegistry.find(r=>r.key===key);}
function commandKeys(key){const legacy={'course:control-products':'course:habitual-manager','planning-extra:control-sort':'planning-extra:catalog-sort','planning-extra:control-notebook':'planning-extra:catalog-notebook'};return legacy[key]?[legacy[key],key]:[key];}
const commandDetailsBefore=detailedComponentKeys;
detailedComponentKeys=function(key,target){return commandEntry(key)?commandKeys(key):commandDetailsBefore(key,target);};
const commandSelectorBefore=visualSelector;
visualSelector=function(key){return commandEntry(key)?.selector||commandSelectorBefore(key);};
const commandCandidatesBefore=allVisualCandidates;
allVisualCandidates=function(){registerCourseCommands();const out=commandCandidatesBefore();for(const entry of commandRegistry){const el=document.querySelector(entry.selector);if(el){el.dataset.siteVisualKey=entry.key;el.dataset.componentKey=entry.key;out.push({...entry,el,min:32,max:1400});}}return out.filter(c=>!commandRegistry.some(r=>r.key!==c.key&&document.querySelector(r.selector)===c.el));};
const commandLabelsBefore=componentControlLabels;
componentControlLabels=function(key){const r=commandEntry(key);if(!r)return commandLabelsBefore(key);return {hidden:'Masquer (récupérable dans cette liste)',...(key==='planning-extra:control-sort'?{removed:'Retirer ce bouton facultatif (décocher pour annuler)'}:{}),x:'Déplacement horizontal',y:'Déplacement vertical',autoWidth:'Largeur selon le contenu',width:'Largeur',height:'Hauteur minimale (0 = automatique)',fontSize:'Taille du texte',spacing:'Espacement intérieur',gap:'Espace entre les éléments',alpha:'Opacité du fond (%)',background:'Couleur du fond',color:'Couleur du texte',radius:'Arrondi',borderWidth:'Épaisseur de bordure',borderColor:'Couleur de bordure',...(r.kind==='button'?{title:'Libellé (vide = origine)',iconOnly:'Afficher uniquement l’icône'}:{})};};
function applyCommandControls(){registerCourseCommands();for(const r of commandRegistry){const el=document.querySelector(r.selector);if(!el)continue;el.dataset.siteVisualKey=r.key;el.dataset.componentKey=r.key;el.dataset.commandControl='true';const p=componentSettings(commandKeys(r.key)),raw=componentRaw(commandKeys(r.key));
 el.hidden=!!(p.hidden||p.removed);el.classList.remove('component-hidden-preview');const inherited=commandKeys(r.key).length>1?componentSettings([commandKeys(r.key)[0]]):{x:0,y:0};el.style.setProperty('translate',(p.x-inherited.x)+'px '+(p.y-inherited.y)+'px');
 if(!['BUTTON','INPUT','SELECT','TEXTAREA'].includes(el.tagName)){if(visualEditSession&&!el.hasAttribute('tabindex')){el.tabIndex=0;el.dataset.commandTabStop='true';}else if(!visualEditSession&&el.dataset.commandTabStop){el.removeAttribute('tabindex');delete el.dataset.commandTabStop;}}
 for(const [name,value]of Object.entries({width:raw.width!==undefined&&!p.autoWidth?p.width+'px':'',height:raw.height!==undefined?'auto':'',minHeight:raw.height?Math.max(32,p.height)+'px':'',fontSize:raw.fontSize!==undefined?p.fontSize+'px':'',padding:raw.spacing!==undefined?p.spacing+'px':'',gap:raw.gap!==undefined?p.gap+'px':'',color:raw.color||'',borderRadius:raw.radius!==undefined?p.radius+'px':'',borderWidth:raw.borderWidth!==undefined?p.borderWidth+'px':'',borderColor:raw.borderColor||'',background:raw.alpha!==undefined||raw.background?'rgba('+[1,3,5].map(i=>parseInt(p.background.slice(i,i+2),16)).join(',')+','+p.alpha/100+')':''})){const css=name.replace(/[A-Z]/g,m=>'-'+m.toLowerCase());if(value)el.style.setProperty(css,value,'important');else el.style.removeProperty(css);}
 if(r.kind==='button'){
  if(!el.dataset.commandOriginal)el.dataset.commandOriginal=el.textContent.trim();
  if(!el.dataset.commandAria)el.dataset.commandAria=el.getAttribute('aria-label')||el.dataset.commandOriginal;
  const text=p.title||el.dataset.commandOriginal,shown=p.iconOnly?r.icon:text;
  if(el.textContent!==shown)el.textContent=shown;
  el.setAttribute('aria-label',el.dataset.commandAria);if(p.iconOnly||p.title)el.title=text;else el.title=el.dataset.commandAria;
 }
 const input=el.querySelector('input,select');if(input){input.style.setProperty('min-width','0','important');input.style.setProperty('max-width','100%','important');if(raw.fontSize!==undefined)input.style.setProperty('font-size',p.fontSize+'px','important');else input.style.removeProperty('font-size');}
 if(raw.width!==undefined&&!p.autoWidth)el.style.setProperty('flex','0 1 '+p.width+'px','important');else el.style.removeProperty('flex');
 }
}
function compactNotebookControl(root){if(root?.id!=='side')return;const label=root.querySelector('.side-notebook-label'),select=root.querySelector('#sideNotebook');if(!label||!select)return;
 if(!label.querySelector('.notebook-control-caption')){const caption=document.createElement('span');caption.className='notebook-control-caption';caption.textContent='Carnet';label.prepend(caption);}
 const first=select.querySelector('option[value=""]');if(first&&first.textContent!=='Toutes')first.textContent='Toutes';select.setAttribute('aria-label','Carnet');
}
const commandCatalogBefore=catalog;
catalog=function(root){commandCatalogBefore(root);compactNotebookControl(root);applyCommandControls();};
const commandApplyBefore=applyVisualPreferences;
applyVisualPreferences=function(){commandApplyBefore();compactNotebookControl($('#side'));applyCommandControls();};
// Earliest existing selection handlers read these exact keys. Pointer gestures stay in the same draft.
let commandDrag=null;
document.addEventListener('pointerdown',e=>{if(e.target.closest('.courses-line [data-list-quantity]'))return;if(!visualEditSession||e.button!==0||e.target.closest('#visualEditorPanel,dialog'))return;const el=e.target.closest('[data-command-control]');if(!el||el.hidden||!el.isConnected)return;const key=el.dataset.componentKey;if(!commandEntry(key))return;e.preventDefault();e.stopImmediatePropagation();selectVisualTarget(key);const p=componentSettings(commandKeys(key));commandDrag={el,key,pointer:e.pointerId,cx:e.clientX,cy:e.clientY,x:p.x,y:p.y,before:structuredClone(componentDraft())};el.setPointerCapture(e.pointerId);},true);
document.addEventListener('pointermove',e=>{const d=commandDrag;if(!d||e.pointerId!==d.pointer)return;if(!visualEditSession||d.el.hidden||!d.el.isConnected){commandDrag=null;return;}e.preventDefault();changeComponent(d.key,'x',d.x+e.clientX-d.cx);changeComponent(d.key,'y',d.y+e.clientY-d.cy);},true);
document.addEventListener('pointerup',e=>{const d=commandDrag;if(!d||e.pointerId!==d.pointer)return;commandDrag=null;if(d.el.hasPointerCapture(e.pointerId))d.el.releasePointerCapture(e.pointerId);renderVisualEditor();},true);
document.addEventListener('pointercancel',e=>{if(commandDrag?.pointer!==e.pointerId)return;if(visualEditSession)visualEditSession.draft.interfaceComponents=commandDrag.before;commandDrag=null;applyVisualPreferences();},true);
document.addEventListener('keydown',e=>{if(!visualEditSession||e.target.closest('#visualEditorPanel,dialog')||!e.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;const el=e.target.closest('[data-command-control]');if(!el||el.hidden)return;e.preventDefault();e.stopImmediatePropagation();const key=el.dataset.componentKey,p=componentSettings(commandKeys(key)),step=e.shiftKey?1:8;changeComponent(key,'x',p.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0));changeComponent(key,'y',p.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));},true);
const commandEditorBefore=renderVisualEditor;
renderVisualEditor=function(){commandEditorBefore();const panel=$('#visualEditorPanel');if(!panel||!visualEditSession)return;const key=visualEditSession.key;if(commandEntry(key)){panel.querySelector('#componentArrange')?.remove();const help=panel.querySelector('#componentControls p');if(help)help.textContent='Glisse cet élément sur la page, utilise Alt + flèches ou règle les décalages ci-dessous. Tout reste en brouillon jusqu’à Enregistrer.';for(const input of panel.querySelectorAll('[data-component-property]')){const k=input.dataset.componentProperty;if(k==='width')input.min=32;if(k==='height')input.min=0;if(k==='fontSize')input.min=10;} }
};
applyVisualPreferences();
window.addEventListener('resize',()=>{applyCommandControls();if(visualEditSession&&commandEntry(visualEditSession.key))renderVisualEditor();});



