/* Gabarit commun uniquement aux recettes mises de côté dans la barre Idées. */
function ideaTileSize(){return {width:154,height:64,...(visualEditSession?.draft||data.visualPreferences)?.ideaTiles};}
const ideaTileCleanBefore=cleanVisualPreferences;
cleanVisualPreferences=function(raw){const out=ideaTileCleanBefore(raw);if(raw?.ideaTiles){const p={};for(const [k,min,max] of [['width',130,320],['height',56,120]])if(Number.isFinite(raw.ideaTiles[k]))p[k]=Math.max(min,Math.min(max,raw.ideaTiles[k]));out.ideaTiles=p;}return out;};
const ideaTileStyle=document.createElement('style');ideaTileStyle.id='ideaTileStyle';document.head.append(ideaTileStyle);
function applyIdeaTiles(){const p=ideaTileSize();const s='.planning-view #parkingZone ';const css=`
${s}.parking-cards{gap:6px!important;flex-wrap:nowrap!important;height:${p.height+10}px!important;overflow-x:auto!important;overflow-y:hidden!important;align-items:center!important;padding:0 0 4px!important;scrollbar-width:thin}
${s}.parking-removable{box-sizing:border-box!important;flex:0 0 ${p.width}px!important;width:${p.width}px!important;min-width:${p.width}px!important;max-width:${p.width}px!important;height:${p.height}px!important;margin:0!important}
${s}.parking-card{box-sizing:border-box!important;display:grid!important;grid-template-columns:38px minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr) 16px!important;column-gap:5px!important;row-gap:1px!important;width:${p.width}px!important;min-width:${p.width}px!important;max-width:${p.width}px!important;height:${p.height}px!important;min-height:${p.height}px!important;max-height:${p.height}px!important;padding:4px 19px 4px 4px!important;margin:0!important;overflow:hidden!important;text-align:left}
${s}.parking-card>img{grid-column:1!important;grid-row:1 / 3!important;width:38px!important;height:100%!important;max-height:100%!important;min-height:0!important;object-fit:cover!important;border-radius:5px}
${s}.parking-card>span{grid-column:2!important;grid-row:1!important;min-width:0!important;align-self:center;display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden!important;font-size:12px!important;line-height:15px!important;white-space:normal!important;word-break:normal;overflow-wrap:anywhere}
${s}.parking-card>small{grid-column:2!important;grid-row:2!important;display:block!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis;white-space:nowrap!important;font-size:10px!important;line-height:16px!important}
${s}.parking-card>small .family-avatar-image{width:14px!important;height:14px!important;object-fit:cover!important}
${s}.parking-removable>.remove-cross{box-sizing:border-box!important;top:2px!important;right:2px!important;width:17px!important;height:17px!important;min-width:17px!important;min-height:17px!important;line-height:15px!important;padding:0!important;font-size:12px!important}
`;if(ideaTileStyle.textContent!==css)ideaTileStyle.textContent=css;}
const ideaTileApplyBefore=applyVisualPreferences;
applyVisualPreferences=function(){ideaTileApplyBefore();applyIdeaTiles();};
const ideaTileCandidatesBefore=allVisualCandidates;
allVisualCandidates=function(){const list=ideaTileCandidatesBefore(),el=$('#parkingZone');if(el)list.push({key:'idea-tiles',el,label:'Idées · taille de toutes les vignettes',min:130,max:320});return list;};
const ideaTileSelectorBefore=visualSelector;
visualSelector=function(key){return key==='idea-tiles'?'#parkingZone':ideaTileSelectorBefore(key);};
const ideaTileValuesBefore=visualValues;
visualValues=function(key){return key==='idea-tiles'?ideaTileSize():ideaTileValuesBefore(key);};
const ideaTileUpdateBefore=updateVisualProperty;
updateVisualProperty=function(name,value){if(visualEditSession?.key!=='idea-tiles')return ideaTileUpdateBefore(name,value);if(!['width','height'].includes(name))return;visualEditSession.draft.ideaTiles={...ideaTileSize(),[name]:Number(value)};visualEditSession.draft=cleanVisualPreferences(visualEditSession.draft);applyVisualPreferences();};
const ideaTileResetBefore=resetVisualElement;
resetVisualElement=function(){if(visualEditSession?.key!=='idea-tiles')return ideaTileResetBefore();delete visualEditSession.draft.ideaTiles;applyVisualPreferences();renderVisualEditor();};
const ideaTileEditorBefore=renderVisualEditor;
renderVisualEditor=function(){ideaTileEditorBefore();if(visualEditSession?.key!=='idea-tiles')return;const panel=$('#visualEditorPanel');for(const [name,min,max] of [['width',130,320],['height',56,120]]){const input=panel.querySelector('[data-visual-property="'+name+'"]');if(input){input.min=min;input.max=max;}}};
applyIdeaTiles();

/* Le choix du repas appartient à cette idée, jamais à la recette du catalogue. */
function ideaMealSlot(entry){
 if(['midi','soir'].includes(entry?.ideaSlot))return entry.ideaSlot;
 const categories=(recipe(entry?.meal?.recipeId)?.categories||[]).map(v=>String(v).trim().toLocaleLowerCase('fr'));
 const slots=['midi','soir'].filter(s=>categories.includes(s));
 return slots.length===1?slots[0]:null;
}
function renderIdeaDetails(){
 document.querySelectorAll('#parkingZone .parking-card[data-park]').forEach(card=>{
  const entry=data.parking?.find(p=>p.id===card.dataset.park);if(!entry)return;
  const wrap=card.closest('.parking-removable'),small=card.querySelector('small');if(!wrap||!small)return;
  small.innerHTML='<span class="idea-cook-avatar" aria-label="Cuistot">'+avatar(entry.meal.cook)+'</span>';
  const slot=ideaMealSlot(entry),button=document.createElement('button');button.type='button';button.className='idea-slot-choice';button.textContent=slot==='midi'?'Midi':slot==='soir'?'Soir':'Choisir';button.title='Repas de cette idée : cliquer pour choisir Midi ou Soir';button.setAttribute('aria-label',(slot?button.textContent:'Repas non choisi')+' · changer pour cette idée');button.draggable=false;
  button.onclick=e=>{e.preventDefault();e.stopPropagation();if(visualEditSession)return;const old=entry.ideaSlot;entry.ideaSlot=ideaMealSlot(entry)==='midi'?'soir':'midi';if(!save()){if(old===undefined)delete entry.ideaSlot;else entry.ideaSlot=old;return;}plannerTools();};
  button.onpointerdown=e=>e.stopPropagation();button.ondragstart=e=>{e.preventDefault();e.stopPropagation();};wrap.querySelector('.idea-slot-choice')?.remove();wrap.append(button);
  const cross=wrap.querySelector('.remove-cross');if(cross){cross.title='Retirer cette idée';cross.setAttribute('aria-label','Retirer cette idée');cross.onclick=e=>{e.preventDefault();e.stopPropagation();if(visualEditSession)return;const old=data.parking;rememberRemoval();data.parking=old.filter(p=>p.id!==entry.id);if(!save()){data.parking=old;return;}plannerTools();showRemovalUndo();};}
 });
}
const ideaDetailsPlannerBefore=plannerTools;
plannerTools=function(){ideaDetailsPlannerBefore();renderIdeaDetails();};
const ideaDetailsParkBefore=parkPayload;
parkPayload=function(payload){
 if(!payload.startsWith('meal:'))return ideaDetailsParkBefore(payload);
 const entry=takeMealPayload(payload);if(!entry)return;entry.ideaSlot=entry.slot;data.parking??=[];data.parking.push(entry);save();render();
};
const ideaDetailsPlaceBefore=placePayload;
placePayload=function(payload,date,slot){
 if(payload.startsWith('park:')){const entry=readMealPayload(payload);if(!entry)return;const chosen=ideaMealSlot(entry);if(!chosen){const card=[...document.querySelectorAll('#parkingZone [data-park]')].find(n=>n.dataset.park===entry.id);card?.closest('.parking-removable')?.querySelector('.idea-slot-choice')?.focus();toast('Choisissez Midi ou Soir sur cette idée.');return;}slot=chosen;}
 return ideaDetailsPlaceBefore(payload,date,slot);
};
const ideaDetailsDestinationBefore=parkingDestination;
parkingDestination=function(id){ideaDetailsDestinationBefore(id);const entry=data.parking?.find(p=>p.id===id),select=$('#parkingSlot'),form=$('#parkingForm');if(!entry||!select||!form)return;const slot=ideaMealSlot(entry);if(!slot)select.insertAdjacentHTML('afterbegin','<option value="">Choisir Midi ou Soir</option>');select.value=slot||'';select.required=true;const before=form.onsubmit;form.onsubmit=e=>{if(!['midi','soir'].includes(select.value)){e.preventDefault();select.reportValidity();return;}entry.ideaSlot=select.value;return before(e);};};
const ideaDetailsStyle=document.createElement('style');ideaDetailsStyle.textContent=`
.planning-view #parkingZone .idea-cook-avatar{display:inline-flex!important;align-items:center;justify-content:center;width:16px!important;height:16px!important;font-size:14px!important;line-height:16px!important;vertical-align:top}
.planning-view #parkingZone .idea-cook-avatar img{width:14px!important;height:14px!important;object-fit:cover!important}
.planning-view #parkingZone .idea-slot-choice{position:absolute!important;left:65px!important;bottom:4px!important;z-index:2;box-sizing:border-box!important;display:block!important;width:auto!important;min-width:0!important;max-width:calc(100% - 70px)!important;height:18px!important;min-height:18px!important;margin:0!important;padding:0 2px!important;border:0!important;border-radius:3px!important;box-shadow:none!important;background:transparent!important;color:inherit!important;font:11px/18px 'Segoe UI',sans-serif!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis;cursor:pointer}
.planning-view #parkingZone .idea-slot-choice:hover{background:#e4c59c66!important}
.planning-view #parkingZone .idea-slot-choice:focus-visible{outline:2px solid #845330;outline-offset:0}
`;document.head.append(ideaDetailsStyle);renderIdeaDetails();

/* Au-delà de sept idées : gabarit compact, sans modifier les informations. */
function compactIdeaTileSize(){return {width:110,height:34,...(visualEditSession?.draft||data.visualPreferences)?.compactIdeaTiles};}
const adaptiveIdeaCleanBefore=cleanVisualPreferences;
cleanVisualPreferences=function(raw){const out=adaptiveIdeaCleanBefore(raw);if(raw?.compactIdeaTiles){const p={};for(const [k,min,max]of [['width',80,240],['height',34,120]])if(Number.isFinite(raw.compactIdeaTiles[k]))p[k]=Math.max(min,Math.min(max,raw.compactIdeaTiles[k]));out.compactIdeaTiles=p;}return out;};
const adaptiveIdeaStyle=document.createElement('style');adaptiveIdeaStyle.id='adaptiveIdeaStyle';document.head.append(adaptiveIdeaStyle);
let adaptiveIdeaObservedZone=null;
const adaptiveIdeaResize=new ResizeObserver(()=>applyAdaptiveIdeas());
function applyAdaptiveIdeas(){
 const zone=$('#parkingZone');if(!zone)return;if(zone!==adaptiveIdeaObservedZone){adaptiveIdeaResize.disconnect();adaptiveIdeaObservedZone=zone;adaptiveIdeaResize.observe(zone);}const editing=visualEditSession?.key,compact=editing==='idea-compact-tiles'||(editing!=='idea-tiles'&&(data.parking?.length||0)>=8);zone.classList.toggle('ideas-compact-mode',compact);
 const p=compactIdeaTileSize(),s='.planning-view #parkingZone.ideas-compact-mode ';
 // Fit two complete rows inside the existing bar; never resize the calendar.
 const style=getComputedStyle(zone),available=zone.clientHeight-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0),height=Math.max(34,Math.min(p.height,Math.floor((available-4)/2)||34)),columns=Math.max(7,Math.min(11,Math.floor((zone.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0)+4)/(p.width+4)))),width=p.width*columns+4*(columns-1);
 const css=`${s}.parking-cards{display:grid!important;grid-template-columns:repeat(${columns},minmax(0,1fr))!important;grid-auto-flow:row!important;grid-auto-rows:${height}px!important;gap:4px!important;align-items:stretch!important;align-content:start!important;justify-content:start!important;box-sizing:border-box!important;flex:1 1 0!important;width:100%!important;max-width:100%!important;height:${height*2+4}px!important;min-height:0!important;padding:0!important;overflow-x:hidden!important;overflow-y:auto!important;scrollbar-width:thin}
${s}.parking-removable{box-sizing:border-box!important;flex:none!important;width:100%!important;min-width:0!important;max-width:100%!important;height:${height}px!important}
${s}.parking-card{grid-template-columns:16px minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr)!important;align-items:center!important;width:100%!important;min-width:0!important;max-width:100%!important;height:${height}px!important;min-height:${height}px!important;max-height:${height}px!important;padding:2px 19px 2px 3px!important;column-gap:4px!important;row-gap:0!important}
${s}.parking-card>img,${s}.idea-slot-choice{display:none!important}
${s}.parking-card>span{grid-column:2!important;grid-row:1!important;line-height:14px!important;max-height:28px!important}
${s}.parking-card>small{grid-column:1!important;grid-row:1!important;align-self:center!important;width:16px!important;height:16px!important}`;
 if(adaptiveIdeaStyle.textContent!==css)adaptiveIdeaStyle.textContent=css;
}
const adaptiveIdeaApplyBefore=applyIdeaTiles;
applyIdeaTiles=function(){adaptiveIdeaApplyBefore();applyAdaptiveIdeas();};
const adaptiveIdeaPlannerBefore=plannerTools;
plannerTools=function(){adaptiveIdeaPlannerBefore();applyAdaptiveIdeas();};
const adaptiveIdeaCandidatesBefore=allVisualCandidates;
allVisualCandidates=function(){const list=adaptiveIdeaCandidatesBefore(),el=$('#parkingZone');if(el)list.push({key:'idea-compact-tiles',el,label:'Idées · taille des vignettes compactes (8 idées et plus)',min:80,max:240});return list;};
const adaptiveIdeaSelectorBefore=visualSelector;
visualSelector=function(key){return key==='idea-compact-tiles'?'#parkingZone':adaptiveIdeaSelectorBefore(key);};
const adaptiveIdeaValuesBefore=visualValues;
visualValues=function(key){return key==='idea-compact-tiles'?compactIdeaTileSize():adaptiveIdeaValuesBefore(key);};
const adaptiveIdeaUpdateBefore=updateVisualProperty;
updateVisualProperty=function(name,value){if(visualEditSession?.key!=='idea-compact-tiles')return adaptiveIdeaUpdateBefore(name,value);if(!['width','height'].includes(name))return;visualEditSession.draft.compactIdeaTiles={...compactIdeaTileSize(),[name]:Number(value)};visualEditSession.draft=cleanVisualPreferences(visualEditSession.draft);applyVisualPreferences();};
const adaptiveIdeaResetBefore=resetVisualElement;
resetVisualElement=function(){if(visualEditSession?.key!=='idea-compact-tiles')return adaptiveIdeaResetBefore();delete visualEditSession.draft.compactIdeaTiles;applyVisualPreferences();renderVisualEditor();};
const adaptiveIdeaEditorBefore=renderVisualEditor;
renderVisualEditor=function(){adaptiveIdeaEditorBefore();if(visualEditSession?.key!=='idea-compact-tiles')return;const panel=$('#visualEditorPanel');for(const [name,min,max]of [['width',80,240],['height',34,120]]){const input=panel.querySelector('[data-visual-property="'+name+'"]');if(input){input.min=min;input.max=max;}}};
applyAdaptiveIdeas();


/* Indications monochromes, visibles uniquement dans la présentation compacte. */
const ideaMealIconDetailsBefore=renderIdeaDetails;
renderIdeaDetails=function(){ideaMealIconDetailsBefore();document.querySelectorAll('#parkingZone .parking-removable').forEach(wrap=>{const card=wrap.querySelector('[data-park]'),button=wrap.querySelector('.idea-slot-choice'),entry=data.parking?.find(p=>p.id===card?.dataset.park),slot=ideaMealSlot(entry);if(!button||!slot)return;const label=button.textContent;button.classList.add('idea-has-meal-icon');button.innerHTML='<span class="idea-meal-label">'+esc(label)+'</span><svg class="idea-meal-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+(slot==='midi'?'<circle cx="10" cy="10" r="3.5"/><path d="M10 1v2m0 14v2M1 10h2m14 0h2M3.6 3.6 5 5m10 10 1.4 1.4M3.6 16.4 5 15M15 5l1.4-1.4"/>':'<path d="M16.8 12.4A7.4 7.4 0 0 1 7.6 3.2a7.5 7.5 0 1 0 9.2 9.2Z"/>')+'</svg>';});};
const ideaMealIconStyle=document.createElement('style');ideaMealIconStyle.textContent=`
.planning-view #parkingZone .idea-meal-icon{display:none}
.planning-view #parkingZone.ideas-compact-mode .idea-slot-choice.idea-has-meal-icon{display:block!important;left:auto!important;right:3px!important;bottom:1px!important;width:14px!important;min-width:14px!important;max-width:14px!important;height:14px!important;min-height:14px!important;line-height:14px!important;padding:0!important;color:#000!important}
.planning-view #parkingZone.ideas-compact-mode .idea-meal-label{display:none!important}
.planning-view #parkingZone.ideas-compact-mode .idea-meal-icon{display:block!important;width:13px!important;height:13px!important;color:#000!important}
`;document.head.append(ideaMealIconStyle);renderIdeaDetails();
window.addEventListener('resize',applyAdaptiveIdeas);

/* Finition ciblée des idées compactes et des deux commandes du panneau Recettes. */
const ideaPolishStyle=document.createElement('style');ideaPolishStyle.textContent=`
.planning-view #parkingZone.ideas-compact-mode .parking-card{border-radius:8px!important}
.planning-view #parkingZone.ideas-compact-mode .idea-slot-choice.idea-has-meal-icon{right:4px!important;bottom:3px!important;width:12px!important;min-width:12px!important;max-width:12px!important;height:12px!important;min-height:12px!important;line-height:12px!important}
.planning-view #parkingZone.ideas-compact-mode .idea-meal-icon{width:12px!important;height:12px!important}
#side .side-compact-item:is([data-side-compact-item="categories"],[data-side-compact-item="longAgo"]){border-radius:10px}
#side .side-compact-item:is([data-side-compact-item="categories"],[data-side-compact-item="longAgo"])>button{display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;border-radius:inherit!important}
#side .side-compact-item[data-side-compact-item="categories"]>button{padding-top:0!important;padding-bottom:4px!important;line-height:1!important}
`;document.head.append(ideaPolishStyle);
