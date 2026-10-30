/* Retouches limitées à l'en-tête et aux zones d'idées. */
function planningYearText(){return String(month.getFullYear())}
function alignPlanningHeader(){const year=$('#plannerYear');if(!year)return;year.hidden=page!=='À table !';year.textContent=planningYearText();if(page!=='À table !')return;const side=$('.side-panel'),calendar=$('.calendar'),head=$('header');if(side&&head){const r=side.getBoundingClientRect(),h=head.getBoundingClientRect();document.body.style.setProperty('--profiles-panel-left',r.left+'px');document.body.style.setProperty('--profiles-panel-width',Math.max(240,r.width-44)+'px');document.body.style.setProperty('--profiles-panel-top',(h.top+Math.max(0,(h.height-51)/2))+'px')}if(calendar&&head){const r=calendar.getBoundingClientRect(),h=head.getBoundingClientRect();year.style.left='8px';year.style.width=Math.max(55,r.left-28)+'px';year.style.top=(h.top+Math.max(2,(h.height-33)/2))+'px'}}
const yearBadge=document.createElement('div');yearBadge.id='plannerYear';yearBadge.setAttribute('aria-label','Année du calendrier');$('header').appendChild(yearBadge);
const settingsBeforeHistoryMove=$('#settings').onclick;
$('#settings').onclick=()=>{settingsBeforeHistoryMove();const b=document.createElement('button');b.type='button';b.textContent='Historique du planning';b.onclick=historyPicker;$('#dialog').appendChild(b)};
let removalNoticeDeadline=0,removalNoticeTimer=null;
const rememberBeforeShortNotice=rememberRemoval;
rememberRemoval=function(){rememberBeforeShortNotice();removalNoticeDeadline=Date.now()+4000;if(removalNoticeTimer!==null)clearTimeout(removalNoticeTimer);removalNoticeTimer=setTimeout(()=>{const b=$('#removalUndo');if(b)b.hidden=true;removalNoticeTimer=null},4000)};
const showBeforeShortNotice=showRemovalUndo;
showRemovalUndo=function(){showBeforeShortNotice();const b=$('#removalUndo');if(b)b.hidden=!removalUndo||Date.now()>=removalNoticeDeadline};
const renderBeforeHeaderYear=render;
render=function(){renderBeforeHeaderYear();alignPlanningHeader();if(typeof requestAnimationFrame==='function')requestAnimationFrame(alignPlanningHeader)};
window.addEventListener('resize',alignPlanningHeader);
showRemovalUndo();render();
