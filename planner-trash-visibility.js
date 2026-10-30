/* Hide only the optional trash drop-zone; keep it recoverable in the editor. */
const plannerTrashCleanBefore=cleanVisualPreferences;
cleanVisualPreferences=function(raw){const out=plannerTrashCleanBefore(raw);if(typeof raw?.showPlannerTrash==='boolean')out.showPlannerTrash=raw.showPlannerTrash;return out;};
const plannerTrashStyle=document.createElement('style');plannerTrashStyle.textContent='html[data-planner-trash-visible="false"] #trashZone{display:none!important;pointer-events:none!important}';document.head.append(plannerTrashStyle);
function applyPlannerTrashVisibility(){document.documentElement.dataset.plannerTrashVisible=String((visualEditSession?.draft||data.visualPreferences)?.showPlannerTrash===true);}
const plannerTrashApplyBefore=applyVisualPreferences;
applyVisualPreferences=function(){plannerTrashApplyBefore();applyPlannerTrashVisibility();};
const plannerTrashCandidatesBefore=allVisualCandidates;
allVisualCandidates=function(){const list=plannerTrashCandidatesBefore(),el=$('#trashZone');if(el&&!list.some(c=>c.key==='ui:trash'))list.push({key:'ui:trash',el,label:'Corbeille',min:90,max:500});return list;};
const plannerTrashEditorBefore=renderVisualEditor;
renderVisualEditor=function(){plannerTrashEditorBefore();if(visualEditSession?.key!=='ui:trash')return;const label=document.createElement('label');label.className='visual-field';label.innerHTML='<input id="plannerTrashShow" type="checkbox" '+(visualEditSession.draft.showPlannerTrash===true?'checked':'')+'> Afficher la corbeille';const panel=$('#visualEditorPanel');panel.querySelector('#visualReset').before(label);label.querySelector('input').onchange=e=>{visualEditSession.draft.showPlannerTrash=e.target.checked;applyPlannerTrashVisibility();};};
const plannerTrashResetBefore=resetVisualElement;
resetVisualElement=function(){if(visualEditSession?.key==='ui:trash')delete visualEditSession.draft.showPlannerTrash;return plannerTrashResetBefore();};
applyPlannerTrashVisibility();
