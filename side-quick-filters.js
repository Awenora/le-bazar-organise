/* Sidebar filters reuse the existing visual editor and its draft/save lifecycle. */
function sideQuickContext(){return page==='À table !';}
const sideQuickCleanBefore=cleanVisualPreferences;
cleanVisualPreferences=function(value){const result=sideQuickCleanBefore(value);if(value?.sideQuickRecipeFilters)result.sideQuickRecipeFilters=quickFilterTools.clean(value.sideQuickRecipeFilters,data.categories);return result;};
const sideQuickConfigBefore=quickFilterConfig;
quickFilterConfig=function(){if(!sideQuickContext())return sideQuickConfigBefore();const prefs=quickFilterPreferences();return quickFilterTools.effective(prefs.sideQuickRecipeFilters||prefs.quickRecipeFilters,data.categories,quickFilterMode());};
const sideQuickChangeBefore=changeQuickFilters;
changeQuickFilters=function(mutator,redrawPanel=false){if(!sideQuickContext())return sideQuickChangeBefore(mutator,redrawPanel);if(!visualEditSession)return;const prefs=visualEditSession.draft,cfg=quickFilterTools.clean(prefs.sideQuickRecipeFilters||prefs.quickRecipeFilters,data.categories);mutator(cfg);prefs.sideQuickRecipeFilters=quickFilterTools.clean(cfg,data.categories);applyVisualPreferences();if(redrawPanel)renderVisualEditor();};
const sideQuickResetBefore=resetVisualElement;
resetVisualElement=function(){if(!sideQuickContext()||visualEditSession?.key!==quickFilterKey)return sideQuickResetBefore();delete visualEditSession.draft.sideQuickRecipeFilters;quickFilterActive=null;applyVisualPreferences();renderVisualEditor();};
const sideQuickCandidatesBefore=allVisualCandidates;
allVisualCandidates=function(){const list=sideQuickCandidatesBefore(),el=document.querySelector('#side .recipe-category-tabs');if(el&&!list.some(x=>x.key===quickFilterKey))list.push({key:quickFilterKey,el,label:'À table · Filtres rapides : contenu et ordre',min:0,max:1800});return list;};
const sideQuickRenderBefore=renderVisualEditor;
renderVisualEditor=function(){sideQuickRenderBefore();if(!sideQuickContext()||visualEditSession?.key!==quickFilterKey)return;const controls=document.querySelector('#quickFilterControls');if(!controls)return;
 // Geometry belongs to the existing sidebar toolbar controls; this panel edits content.
 controls.querySelector('fieldset')?.remove();
 for(const id of ['quickFilterMode','quickFilterVisible','quickFilterPlacement'])controls.querySelector('#'+id)?.closest('label')?.remove();
};
function openSideQuickFilters(){startVisualEditor();selectVisualTarget(quickFilterKey);const input=document.querySelector('#quickFilterNewLabel');input?.scrollIntoView({block:'center'});input?.focus();}
function saveSideQuickFilter(label,kind,value){
 label=String(label||'').trim().slice(0,80);value=String(value||'').trim().slice(0,120);
 if(!label||!value||!['category','keyword'].includes(kind)||kind==='category'&&!data.categories.includes(value))return false;
 const prefs=visualEditSession?.draft||data.visualPreferences||{},next=structuredClone(prefs),cfg=quickFilterTools.clean(next.sideQuickRecipeFilters||next.quickRecipeFilters,data.categories);
 const existing=cfg.items.find(i=>i.kind===kind&&i.value===value);if(existing)Object.assign(existing,{label,hidden:false,removed:false});else{if(cfg.items.length>=100)return false;cfg.items.push({id:'custom:'+toolId(),label,kind,value,hidden:false,removed:false});}
 next.sideQuickRecipeFilters=cfg;
 if(visualEditSession)visualEditSession.draft=cleanVisualPreferences(next);
 else{const previous=data.visualPreferences;data.visualPreferences=cleanVisualPreferences(next);if(!save()){if(previous===undefined)delete data.visualPreferences;else data.visualPreferences=previous;return false;}}
 applyVisualPreferences();return true;
}
function addSideQuickFilterDialog(){
 modal('<h2>Ajouter un filtre rapide</h2><form id="sideQuickAddForm"><label class="field">Nom du filtre<input id="sideQuickLabel" maxlength="80" required placeholder="Ex. : Poisson"></label><label class="field">Filtrer par<select id="sideQuickSource"><option value="keyword">Mot à rechercher</option>'+data.categories.map((c,i)=>'<option value="'+i+'">Catégorie : '+esc(c)+'</option>').join('')+'</select></label><label class="field" id="sideQuickWordField">Mot à rechercher<input id="sideQuickWord" maxlength="120" placeholder="Même mot que le nom, si vide"></label><p id="sideQuickError" role="alert"></p><button type="submit" class="primary">Enregistrer le filtre</button><button type="button" id="sideQuickCancel">Annuler</button></form>');
 $('#sideQuickSource').onchange=e=>$('#sideQuickWordField').hidden=e.target.value!=='keyword';
 $('#sideQuickCancel').onclick=()=>$('#dialog').close();
 $('#sideQuickAddForm').onsubmit=e=>{e.preventDefault();const label=$('#sideQuickLabel').value,source=$('#sideQuickSource').value,value=source==='keyword'?($('#sideQuickWord').value.trim()||label):data.categories[Number(source)];if(saveSideQuickFilter(label,source==='keyword'?'keyword':'category',value))$('#dialog').close();else $('#sideQuickError').textContent='Filtre non enregistré. Vérifie le nom et le stockage disponible, puis réessaie.';};
 $('#sideQuickLabel').focus();
}
const sideQuickDropdownBefore=recipeCategoriesDropdown;
recipeCategoriesDropdown=function(button,root){sideQuickDropdownBefore(button,root);if(root?.id!=='side')return;const menu=document.querySelector('.bazar-action-menu');if(!menu)return;for(const [label,run]of [['＋ Ajouter un filtre rapide…',addSideQuickFilterDialog],['Organiser les filtres rapides…',openSideQuickFilters]].reverse()){const add=document.createElement('button');add.type='button';add.setAttribute('role','menuitem');add.textContent=label;add.onclick=()=>{closeActions();run();};menu.prepend(add);}};
applyVisualPreferences();
