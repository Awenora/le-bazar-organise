/* Repère de la date réelle, indépendant de la sélection du calendrier. */
function calendarTodayAppearance(){return {fontSize:9,background:'#80502f',color:'#fff4de',alpha:100,radius:4,hidden:false,...(visualEditSession?.draft||data.visualPreferences)?.calendarTodayTab};}
const calendarTodayCleanBefore=cleanVisualPreferences;
cleanVisualPreferences=function(raw){const out=calendarTodayCleanBefore(raw);if(raw?.calendarTodayTab){const p=raw.calendarTodayTab,q={};for(const [k,min,max]of [['fontSize',8,11],['alpha',40,100],['radius',0,8]])if(Number.isFinite(p[k]))q[k]=Math.max(min,Math.min(max,p[k]));for(const k of ['background','color'])if(/^#[0-9a-f]{6}$/i.test(p[k]||''))q[k]=p[k];if(typeof p.hidden==='boolean')q.hidden=p.hidden;out.calendarTodayTab=q;}return out;};
const calendarTodayTab=document.createElement('span');calendarTodayTab.id='calendarTodayTab';calendarTodayTab.dataset.siteVisualKey='calendar-today-tab';calendarTodayTab.textContent="AUJOURD'HUI";calendarTodayTab.hidden=true;document.body.append(calendarTodayTab);
const calendarTodayStyle=document.createElement('style');calendarTodayStyle.textContent='#calendarTodayTab{position:fixed;box-sizing:border-box;z-index:8;display:block;font-family:"Segoe UI",Arial,sans-serif;font-weight:700;line-height:12px;padding:1px 5px;white-space:nowrap;letter-spacing:.15px;box-shadow:0 2px 3px #42261150;border:1px solid #fff1d14d;pointer-events:none;max-width:none}#calendarTodayTab[hidden]{display:none!important}.visual-editing #calendarTodayTab{pointer-events:auto;cursor:pointer}';document.head.append(calendarTodayStyle);
function refreshCalendarToday(){
 const real=new Date(),key=datekey(real),cal=document.querySelector('.planning-view #calendar'),p=calendarTodayAppearance();
 if(!cal){calendarTodayTab.hidden=true;return;}
 const cells=[...cal.querySelectorAll('.day[data-drop]')],cell=cells.find(c=>c.dataset.drop===key);
 for(const day of cells){const current=day===cell;day.classList.toggle('current',current);const number=day.querySelector('.dayhead>b');if(current)number?.setAttribute('aria-current','date');else if(number?.getAttribute('aria-current')==='date')number.removeAttribute('aria-current');}
 if(!cell||p.hidden){calendarTodayTab.hidden=true;return;}
 const r=cell.getBoundingClientRect(),c=cal.getBoundingClientRect(),main=$('#main').getBoundingClientRect();
 if(r.bottom<=Math.max(c.top,main.top,0)||r.top>=Math.min(c.bottom,main.bottom,innerHeight)||r.right<=Math.max(c.left,main.left,0)||r.left>=Math.min(c.right,main.right,innerWidth)){calendarTodayTab.hidden=true;return;}
 const rgb=[1,3,5].map(i=>parseInt(p.background.slice(i,i+2),16));Object.assign(calendarTodayTab.style,{fontSize:p.fontSize+'px',lineHeight:Math.max(10,p.fontSize+1)+'px',background:'rgba('+rgb.join(',')+','+p.alpha/100+')',color:p.color,borderRadius:p.radius+'px '+p.radius+'px 2px 2px',width:'auto',left:'0px',top:'0px'});calendarTodayTab.hidden=false;
 const b=calendarTodayTab.getBoundingClientRect(),headers=[...cal.querySelectorAll('.weekday')].map(h=>h.getBoundingClientRect()),headerBottom=Math.max(0,...headers.map(h=>h.bottom));let top=Math.max(r.top-2,headerBottom+2),left=r.left+(r.width-b.width)/2;
 const obstacles=[cell.querySelector('.dayhead>b'),...cell.querySelectorAll('.photo-cook')].filter(Boolean).map(el=>el.getBoundingClientRect()).filter(o=>o.top<top+b.height&&o.bottom>top);
 let start=r.left+2,end=r.right-2;for(const o of obstacles){if(o.left<r.left+r.width/2)start=Math.max(start,o.right+3);else end=Math.min(end,o.left-3);}if(end-start>=b.width)left=Math.max(start,Math.min(end-b.width,left));else left=Math.max(r.left+2,Math.min(r.right-b.width-2,left));
 left=Math.max(Math.max(c.left,main.left,0)+1,Math.min(Math.min(c.right,main.right,innerWidth)-b.width-1,left));Object.assign(calendarTodayTab.style,{left:Math.round(left)+'px',top:Math.round(top)+'px'});calendarTodayTab.setAttribute('aria-label',"Aujourd’hui, "+real.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}));
}
let calendarTodayFrame=0;
function scheduleCalendarToday(){if(calendarTodayFrame)return;calendarTodayFrame=requestAnimationFrame(()=>{calendarTodayFrame=0;refreshCalendarToday();});}
const calendarTodayApplyBefore=applyVisualPreferences;
applyVisualPreferences=function(){calendarTodayApplyBefore();scheduleCalendarToday();};
const calendarTodayRenderBefore=calendar;
calendar=function(){calendarTodayRenderBefore();scheduleCalendarToday();};
window.addEventListener('resize',scheduleCalendarToday);document.addEventListener('scroll',scheduleCalendarToday,true);window.addEventListener('focus',scheduleCalendarToday);window.addEventListener('pageshow',scheduleCalendarToday);document.addEventListener('visibilitychange',scheduleCalendarToday);
let calendarTodayMidnightTimer=0;
function scheduleCalendarTodayMidnight(){clearTimeout(calendarTodayMidnightTimer);const now=new Date(),next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);calendarTodayMidnightTimer=setTimeout(()=>{refreshCalendarToday();scheduleCalendarTodayMidnight();},Math.max(1000,next-now+100));}
scheduleCalendarTodayMidnight();
const calendarTodayCandidatesBefore=allVisualCandidates;
allVisualCandidates=function(){const list=calendarTodayCandidatesBefore();if(document.querySelector('.planning-view #calendar'))list.push({key:'calendar-today-tab',el:calendarTodayTab,label:'Calendrier · languette Aujourd’hui',min:40,max:160});return list;};
const calendarTodaySelectorBefore=visualSelector;
visualSelector=function(key){return key==='calendar-today-tab'?'#calendarTodayTab':calendarTodaySelectorBefore(key);};
const calendarTodayValuesBefore=visualValues;
visualValues=function(key){if(key!=='calendar-today-tab')return calendarTodayValuesBefore(key);const p=calendarTodayAppearance();return Object.fromEntries(['fontSize','background','color','alpha','radius'].map(k=>[k,p[k]]));};
const calendarTodayPropertyBefore=updateVisualProperty;
updateVisualProperty=function(name,value){if(visualEditSession?.key!=='calendar-today-tab')return calendarTodayPropertyBefore(name,value);if(!['fontSize','background','color','alpha','radius'].includes(name))return;visualEditSession.draft.calendarTodayTab??={};visualEditSession.draft.calendarTodayTab[name]=['background','color'].includes(name)?value:Number(value);visualEditSession.draft=cleanVisualPreferences(visualEditSession.draft);refreshCalendarToday();};
const calendarTodayResetBefore=resetVisualElement;
resetVisualElement=function(){if(visualEditSession?.key!=='calendar-today-tab')return calendarTodayResetBefore();delete visualEditSession.draft.calendarTodayTab;refreshCalendarToday();renderVisualEditor();};
const calendarTodayEditorBefore=renderVisualEditor;
renderVisualEditor=function(){calendarTodayEditorBefore();if(visualEditSession?.key!=='calendar-today-tab')return;const panel=$('#visualEditorPanel');for(const [name,min,max]of [['fontSize',8,11],['alpha',40,100],['radius',0,8]]){const input=panel.querySelector('[data-visual-property='+name+']');if(input){input.min=min;input.max=max;}}const label=document.createElement('label');label.className='visual-field';label.innerHTML='<input id="calendarTodayHidden" type="checkbox" '+(calendarTodayAppearance().hidden?'checked':'')+'> Masquer la languette (récupérable ici)';panel.querySelector('.visual-editor-actions').before(label);label.querySelector('input').onchange=e=>{visualEditSession.draft.calendarTodayTab??={};visualEditSession.draft.calendarTodayTab.hidden=e.target.checked;refreshCalendarToday();};};
refreshCalendarToday();
