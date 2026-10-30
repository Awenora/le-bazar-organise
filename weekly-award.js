/* Uses existing date|meal feedback only; never creates a second ballot. */
function weeklyAwardMonday(date){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;}
function weeklyAwardLive(date){
 const start=weeklyAwardMonday(date),rows=new Map();
 for(let i=0;i<7;i++){const day=datekey(add(start,i));for(const slot of ['midi','soir']){const meal=data.plans?.[day]?.[slot],r=recipe(meal?.recipeId);if(!r)continue;let row=rows.get(r.id);if(!row){row={recipeId:r.id,name:r.name,photo:typeof r.photo==='string'&&r.photo.length<4096?r.photo:'',cooks:[],voters:new Set()};rows.set(r.id,row);}if(meal.cook&&!row.cooks.includes(meal.cook))row.cooks.push(meal.cook);for(const person of data.feedback?.[day+'|'+slot]?.likes||[])if(typeof person==='string'&&person)row.voters.add(person);}}
 const max=Math.max(0,...[...rows.values()].map(r=>r.voters.size));
 return {version:1,start:datekey(start),end:datekey(add(start,6)),votes:max,winners:max?[...rows.values()].filter(r=>r.voters.size===max).map(({voters,...r})=>({...r,votes:voters.size})):[]};
}
function weeklyAwardResult(date){const key=datekey(weeklyAwardMonday(date));return data.weeklyRecipeAwards?.[key]||weeklyAwardLive(date);}
function archiveFinishedWeeklyAwards(){
 if(visualEditSession)return;
 const current=datekey(weeklyAwardMonday(new Date())),keys=[...new Set(Object.keys(data.plans||{}).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)).map(k=>datekey(weeklyAwardMonday(new Date(k+'T12:00:00')))))].filter(k=>k<current&&!data.weeklyRecipeAwards?.[k]);
 const added=keys.map(k=>weeklyAwardLive(new Date(k+'T12:00:00')));if(!added.length)return;
 const before=data.weeklyRecipeAwards?structuredClone(data.weeklyRecipeAwards):null;data.weeklyRecipeAwards??={};for(const r of added)data.weeklyRecipeAwards[r.start]=r;
 if(save()===false){if(before)data.weeklyRecipeAwards=before;else delete data.weeklyRecipeAwards;}
}

/* Compact, non-flowing card in the unused space below the weekly rows. */
function weeklyAwardMode(){return innerWidth<=700?'mobile':'desktop';}
function weeklyAwardPreferences(){return {width:0,height:148,x:0,y:0,fontFamily:'Segoe UI',fontSize:15,alpha:88,background:'#fff4df',color:'#382718',radius:15,spacing:7,title:'Recette de la semaine',hidden:false,...(visualEditSession?.draft||data.visualPreferences)?.weeklyRecipeAward?.[weeklyAwardMode()]};}
const weeklyAwardCleanBefore=cleanVisualPreferences;
cleanVisualPreferences=function(raw){const out=weeklyAwardCleanBefore(raw);if(raw?.weeklyRecipeAward){out.weeklyRecipeAward={};for(const mode of ['desktop','mobile']){const p=raw.weeklyRecipeAward[mode];if(!p)continue;const q={};for(const [key,min,max]of [['width',0,800],['height',40,400],['x',-800,800],['y',0,800],['fontSize',10,24],['alpha',0,100],['radius',0,30],['spacing',0,18]])if(Number.isFinite(p[key]))q[key]=Math.max(min,Math.min(max,p[key]));for(const k of ['background','color'])if(/^#[0-9a-f]{6}$/i.test(p[k]||''))q[k]=p[k];if(['Segoe UI','Arial','Verdana','Georgia','Tahoma'].includes(p.fontFamily))q.fontFamily=p.fontFamily;if(typeof p.title==='string')q.title=p.title.slice(0,100);if(typeof p.hidden==='boolean')q.hidden=p.hidden;out.weeklyRecipeAward[mode]=q;}}return out;};
const weeklyAwardBox=document.createElement('section');weeklyAwardBox.id='weeklyRecipeAward';weeklyAwardBox.hidden=true;weeklyAwardBox.setAttribute('aria-label','Recette de la semaine');weeklyAwardBox.dataset.siteVisualKey='weekly-recipe-award';document.body.append(weeklyAwardBox);
const weeklyAwardCSS=document.createElement('style');weeklyAwardCSS.textContent=`
#weeklyRecipeAward{position:fixed;z-index:7;box-sizing:border-box;overflow:hidden;border:1px solid #b99b7180;box-shadow:0 3px 8px #4b2d1426;font-family:'Segoe UI',Arial,sans-serif;line-height:1.2}
#weeklyRecipeAward[hidden]{display:none!important;pointer-events:none!important}
#weeklyRecipeAward .wa-tie{font-size:1.15em;line-height:1.1;font-weight:700;margin:0 0 5px;color:inherit}
#weeklyRecipeAward .wa-list{height:100%;overflow:hidden}
#weeklyRecipeAward.wa-tied .wa-list{height:calc(100% - 26px);display:grid;grid-template-columns:repeat(var(--wa-columns,1),minmax(0,1fr));grid-template-rows:repeat(var(--wa-rows,2),minmax(0,1fr));gap:5px}
#weeklyRecipeAward .wa-recipe{display:flex;align-items:stretch;gap:12px;box-sizing:border-box;width:100%;min-height:0;height:100%;padding:0;border:0;background:transparent;box-shadow:none;color:inherit;text-align:left;font:inherit;overflow:hidden}
#weeklyRecipeAward .wa-photo{position:relative;display:block;flex:0 0 32%;min-width:0;overflow:hidden;border-radius:10px}
#weeklyRecipeAward .wa-photo>img{width:100%;height:100%;display:block;object-fit:cover}
#weeklyRecipeAward .wa-crown{position:absolute;left:3px;top:2px;display:block;width:42px;height:37px;transform:rotate(-11deg);filter:drop-shadow(0 2px 2px #38271860)}
#weeklyRecipeAward .wa-crown svg{display:block;width:100%;height:100%}
#weeklyRecipeAward .wa-copy{display:flex;flex-direction:column;justify-content:space-between;gap:4px;flex:1;min-width:0;padding:3px 3px 1px 0}
#weeklyRecipeAward .wa-award-title{font-size:1.32em;line-height:1.1;font-weight:750;color:inherit}
#weeklyRecipeAward .wa-name{font-size:1em;font-weight:500;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#weeklyRecipeAward .wa-proposer{display:flex;justify-content:flex-end;align-items:center;gap:6px;min-width:0;font-size:.9em}
#weeklyRecipeAward .wa-faces{display:flex;flex-shrink:0;align-items:center;font-size:27px}
#weeklyRecipeAward .wa-faces img{width:29px;height:32px;object-fit:contain;display:block}
#weeklyRecipeAward .wa-wait{height:100%;display:flex;flex-direction:column;justify-content:center;gap:5px;text-align:center;font-size:.9em}
#weeklyRecipeAward .wa-wait>strong{font-size:1.32em}
#weeklyRecipeAward.wa-small{padding:4px!important}
#weeklyRecipeAward.wa-small .wa-copy{gap:3px;padding-top:1px}
#weeklyRecipeAward.wa-small .wa-award-title{font-size:1.24em}
#weeklyRecipeAward.wa-small .wa-name{-webkit-line-clamp:1;font-size:.94em}
#weeklyRecipeAward.wa-small .wa-faces img{width:22px;height:24px}
#weeklyRecipeAward.wa-small .wa-crown{width:36px;height:32px}
#weeklyRecipeAward.wa-tied .wa-recipe{gap:6px}
#weeklyRecipeAward.wa-tied .wa-award-title{display:none}
#weeklyRecipeAward.wa-tied .wa-copy{justify-content:center;gap:2px}
#weeklyRecipeAward.wa-tied .wa-name{font-size:.95em}
#weeklyRecipeAward.wa-tied .wa-proposer{font-size:.75em}
#weeklyRecipeAward.wa-tied .wa-faces img{width:18px;height:21px}
#weeklyRecipeAward.wa-tied .wa-crown{width:30px;height:26px}

/* The crown belongs to the cook, never to the dish photo. */
#weeklyRecipeAward .wa-copy{position:relative;display:block;padding-top:2px;overflow:visible}
#weeklyRecipeAward .wa-award-title{display:block}
#weeklyRecipeAward .wa-name{position:absolute;left:0;top:50%;transform:translateY(-35%);width:calc(100% - 105px);font-size:1.12em;line-height:1.2;font-weight:600}
#weeklyRecipeAward .wa-proposer{position:absolute;right:10px;bottom:1px;display:flex;gap:8px;align-items:flex-end;font-size:.94em}
#weeklyRecipeAward .wa-person{display:inline-flex;flex-direction:row-reverse;align-items:flex-end;gap:5px;min-width:0}
#weeklyRecipeAward .wa-royal-avatar{position:relative;display:inline-flex;align-items:center;justify-content:center;width:46px;height:52px;font-size:42px;overflow:visible}
#weeklyRecipeAward .wa-royal-avatar img{width:46px;height:52px;object-fit:contain}
#weeklyRecipeAward .wa-royal-avatar .wa-crown{left:50%;top:-25px;width:64px;height:46px;transform:translateX(-50%) rotate(-17deg);transform-origin:50% 85%;filter:drop-shadow(0 2px 2px #55340e55)}
#weeklyRecipeAward .wa-person-name{font-weight:500;white-space:nowrap}
#weeklyRecipeAward.wa-small .wa-name{font-size:1.04em;-webkit-line-clamp:2;width:calc(100% - 96px)}
#weeklyRecipeAward.wa-small .wa-royal-avatar,#weeklyRecipeAward.wa-small .wa-royal-avatar img{width:36px;height:42px}
#weeklyRecipeAward.wa-small .wa-royal-avatar .wa-crown{width:52px;height:37px;top:-21px}
#weeklyRecipeAward.wa-tied .wa-copy{display:flex;justify-content:center}
#weeklyRecipeAward.wa-tied .wa-name{position:static;transform:none;width:100%;font-size:.95em}
#weeklyRecipeAward.wa-tied .wa-proposer{position:static;align-self:flex-end;font-size:.75em;margin-top:6px}
#weeklyRecipeAward.wa-tied .wa-royal-avatar,#weeklyRecipeAward.wa-tied .wa-royal-avatar img{width:23px;height:26px}
#weeklyRecipeAward.wa-tied .wa-royal-avatar .wa-crown{width:33px;height:24px;top:-13px}
`;document.head.append(weeklyAwardCSS);
function weeklyAwardCrown(){return '<svg viewBox="0 0 64 54" aria-hidden="true" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wa-gold" x1="8" y1="10" x2="52" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#fff0af"/><stop offset=".34" stop-color="#e8b94f"/><stop offset=".7" stop-color="#c88d2d"/><stop offset="1" stop-color="#f4ce72"/></linearGradient></defs><path d="M9 17Q16 21 24 27L30 10Q32 5 35 10L41 27Q48 21 56 16L51 41Q33 48 14 41Z" fill="url(#wa-gold)" stroke="#805327" stroke-width="2" stroke-linejoin="round"/><path d="M14 37Q32 43 52 36L51 44Q32 51 15 44Z" fill="#e5b34e" stroke="#805327" stroke-width="2"/><path d="M17 39Q33 44 49 38" stroke="#fff1b7" stroke-width="1.8" stroke-linecap="round"/><g fill="#f6d581" stroke="#805327" stroke-width="1.8"><circle cx="8" cy="15" r="4"/><circle cx="32" cy="8" r="4.5"/><circle cx="57" cy="14" r="4"/></g><path d="M32 25L36 30L32 35L28 30Z" fill="#9c632c" stroke="#fff0b0" stroke-width="1"/><path d="M16 23L19 31M29 18L27 24" stroke="#fff0ae" stroke-width="2" stroke-linecap="round"/></svg>';}

function refreshWeeklyAward(){
 const side=document.querySelector('.planning-view .side-panel'),list=document.querySelector('#side .week-list');
 if(!side||!list){weeklyAwardBox.hidden=true;return;}
 archiveFinishedWeeklyAwards();const prefs=weeklyAwardPreferences(),panel=side.getBoundingClientRect(),rows=[...list.querySelectorAll('.weekrow')],last=rows.at(-1)?.getBoundingClientRect();
 if(!last||prefs.hidden){weeklyAwardBox.hidden=true;return;}
 const insideTop=last.bottom+8,insideSpace=Math.min(panel.bottom-10,innerHeight-8)-insideTop,outsideTop=panel.bottom+8,outsideSpace=innerHeight-8-outsideTop,outside=insideSpace<90&&outsideSpace>insideSpace,top=outside?outsideTop:insideTop,maxBottom=outside?innerHeight-8:Math.min(panel.bottom-10,innerHeight-8),available=maxBottom-top,maxWidth=Math.max(0,Math.min(panel.width,innerWidth-panel.left));
 if(available<44||maxWidth<140){weeklyAwardBox.hidden=true;return;}
 const width=maxWidth,height=Math.min(prefs.height,available),left=panel.left,y=Math.min(prefs.y,Math.max(0,available-height));
 const rgb=[1,3,5].map(i=>parseInt(prefs.background.slice(i,i+2),16));Object.assign(weeklyAwardBox.style,{left:left+'px',top:(top+y)+'px',width:width+'px',height:height+'px',padding:prefs.spacing+'px',fontFamily:prefs.fontFamily,fontSize:prefs.fontSize+'px',color:prefs.color,background:'rgba('+rgb.join(',')+','+prefs.alpha/100+')',borderRadius:prefs.radius+'px'});
 const result=weeklyAwardResult(week),ties=result.winners.length>1;weeklyAwardBox.style.setProperty('--wa-columns','2');weeklyAwardBox.style.setProperty('--wa-rows',String(Math.ceil(result.winners.length/2)));weeklyAwardBox.classList.toggle('wa-tied',ties);weeklyAwardBox.classList.toggle('wa-small',height<110);weeklyAwardBox.hidden=false;
 const html=result.winners.length?(ties?'<p class="wa-tie">'+esc(prefs.title)+' · Ex æquo</p>':'')+'<div class="wa-list">'+result.winners.map(w=>{const r=recipe(w.recipeId),photo=w.photo||r?.photo||'',cooks=w.cooks||[];return '<button type="button" class="wa-recipe" data-award-recipe="'+esc(w.recipeId)+'" aria-label="Voir '+esc(w.name)+'"><span class="wa-photo">'+(photo?'<img src="'+esc(photo)+'" alt="">':'')+'</span><span class="wa-copy"><strong class="wa-award-title">'+esc(prefs.title)+'</strong><span class="wa-name">'+esc(w.name)+'</span>'+(cooks.length?'<span class="wa-proposer">'+cooks.map(person=>'<span class="wa-person"><span class="wa-faces wa-royal-avatar">'+avatar(person)+'<span class="wa-crown" aria-hidden="true">'+weeklyAwardCrown()+'</span></span><span class="wa-person-name">'+esc(displayName(person))+'</span></span>').join('')+'</span>':'')+'</span></button>';}).join('')+'</div>':'<div class="wa-wait"><strong>'+esc(prefs.title)+'</strong><span>Aucun vote pour le moment</span></div>';
 if(weeklyAwardBox.innerHTML!==html){weeklyAwardBox.innerHTML=html;weeklyAwardBox.querySelectorAll('[data-award-recipe]').forEach(b=>b.onclick=()=>{if(!visualEditSession&&recipe(b.dataset.awardRecipe))openRecipe(b.dataset.awardRecipe);});}
}
let weeklyAwardFrame=0;
function scheduleWeeklyAward(){if(weeklyAwardFrame)return;weeklyAwardFrame=requestAnimationFrame(()=>{weeklyAwardFrame=0;refreshWeeklyAward();});}
const weeklyAwardRenderBefore=render;render=function(){weeklyAwardRenderBefore();scheduleWeeklyAward();};
const weeklyAwardWeekBefore=weekly;weekly=function(){weeklyAwardWeekBefore();scheduleWeeklyAward();};
const weeklyAwardLikesBefore=refreshWeekMealLikes;refreshWeekMealLikes=function(){weeklyAwardLikesBefore();scheduleWeeklyAward();};
const weeklyAwardApplyBefore=applyVisualPreferences;applyVisualPreferences=function(){weeklyAwardApplyBefore();scheduleWeeklyAward();};
addEventListener('resize',scheduleWeeklyAward);addEventListener('scroll',scheduleWeeklyAward,true);addEventListener('focus',scheduleWeeklyAward);
let weeklyAwardTimer=setInterval(()=>{if(page==='À table !'&&document.visibilityState==='visible')scheduleWeeklyAward();},60000);
const weeklyAwardCandidatesBefore=allVisualCandidates;
allVisualCandidates=function(){const list=weeklyAwardCandidatesBefore();if(document.querySelector('#side .week-list'))list.push({key:'weekly-recipe-award',el:weeklyAwardBox,label:'Semainier · Recette de la semaine',min:140,max:800});return list;};
const weeklyAwardSelectorBefore=visualSelector;visualSelector=function(key){return key==='weekly-recipe-award'?'#weeklyRecipeAward':weeklyAwardSelectorBefore(key);};
const weeklyAwardValuesBefore=visualValues;visualValues=function(key){return key==='weekly-recipe-award'?{}:weeklyAwardValuesBefore(key);};
const weeklyAwardResetBefore=resetVisualElement;resetVisualElement=function(){if(visualEditSession?.key!=='weekly-recipe-award')return weeklyAwardResetBefore();delete visualEditSession.draft.weeklyRecipeAward;scheduleWeeklyAward();renderVisualEditor();};
document.addEventListener('click',e=>{if(!visualEditSession||!e.target.closest('#weeklyRecipeAward'))return;e.preventDefault();e.stopImmediatePropagation();selectVisualTarget('weekly-recipe-award');},true);
const weeklyAwardEditorBefore=renderVisualEditor;
renderVisualEditor=function(){weeklyAwardEditorBefore();if(visualEditSession?.key!=='weekly-recipe-award')return;const panel=$('#visualEditorPanel'),p=weeklyAwardPreferences(),box=document.createElement('fieldset');box.id='weeklyAwardSettings';
 box.innerHTML='<legend>Fiche de la semaine</legend><label class="visual-field">Police<select data-award-property="fontFamily">'+['Segoe UI','Arial','Verdana','Georgia','Tahoma'].map(f=>'<option '+(f===p.fontFamily?'selected':'')+'>'+f+'</option>').join('')+'</select></label><p>Les dimensions et déplacements restent limités à l’espace libre sous les jours.</p><label class="visual-field">Titre de la fiche<input data-award-property="title" value="'+esc(p.title)+'"></label>'+[['height','Hauteur maximale',40,400],['y','Décalage vertical',0,800],['fontSize','Taille du texte',10,24],['alpha','Opacité (%)',0,100],['radius','Arrondi',0,30],['spacing','Espacement intérieur',0,18]].map(([key,label,min,max])=>'<label class="visual-field">'+label+'<input type="number" data-award-property="'+key+'" min="'+min+'" max="'+max+'" step="1" value="'+p[key]+'"></label>').join('')+[['background','Fond'],['color','Texte']].map(([key,label])=>'<label class="visual-field">'+label+'<input type="color" data-award-property="'+key+'" value="'+p[key]+'"></label>').join('')+'<label><input type="checkbox" data-award-property="hidden" '+(p.hidden?'checked':'')+'> Masquer la fiche (récupérable ici)</label>';
 panel.querySelector('#visualReset').before(box);box.querySelectorAll('[data-award-property]').forEach(input=>input.oninput=()=>{const key=input.dataset.awardProperty,value=input.type==='checkbox'?input.checked:input.type==='number'?input.valueAsNumber:input.value;if(input.type==='number'&&!Number.isFinite(value))return;visualEditSession.draft.weeklyRecipeAward??={};visualEditSession.draft.weeklyRecipeAward[weeklyAwardMode()]??={};visualEditSession.draft.weeklyRecipeAward[weeklyAwardMode()][key]=value;visualEditSession.draft=cleanVisualPreferences(visualEditSession.draft);scheduleWeeklyAward();});};
scheduleWeeklyAward();
