/* One independent illustration per month, shared across years; original assets unchanged. */
const seasonalDecorationImages=new Map();
const seasonalDecorationRatios={1:1024/1536,2:1024/1536,3:1024/1536,4:1145/1374,5:1024/1536,6:1199/1312,7:1024/1536,8:1310/1200,9:1024/1536,10:1024/1536,11:1024/1536,12:1024/1536};
function juneDecorationMode(){return innerWidth<=700?'mobile':'desktop';}
function seasonalDecorationKey(){return month.getMonth()===5?'june-decoration':'seasonal-decoration';}
function seasonalDecorationSelected(){return ['june-decoration','seasonal-decoration'].includes(visualEditSession?.key);}
function juneDecorationSettings(){const prefs=visualEditSession?.draft||data.visualPreferences,n=month.getMonth()+1,mode=juneDecorationMode(),p=prefs?.seasonalDecorations?.[n]?.[mode]||(n===6?prefs?.juneDecoration?.[mode]:null)||{};return {x:-89,y:0,hidden:false,locked:false,...p,width:p.width??p.scale??80,height:p.height??p.scale??87};}
function cleanSeasonalDecorationModes(raw){const out={};for(const mode of ['desktop','mobile']){const p=raw?.[mode];if(!p)continue;const q={};for(const [k,min,max]of [['scale',20,150],['width',20,200],['height',20,200],['x',-3000,3000],['y',-3000,3000]])if(Number.isFinite(p[k]))q[k]=Math.max(min,Math.min(max,p[k]));for(const k of ['hidden','locked'])if(typeof p[k]==='boolean')q[k]=p[k];out[mode]=q;}return out;}
const juneCleanBefore=cleanVisualPreferences;
cleanVisualPreferences=function(raw){const out=juneCleanBefore(raw);if(raw?.juneDecoration)out.juneDecoration=cleanSeasonalDecorationModes(raw.juneDecoration);if(raw?.seasonalDecorations){out.seasonalDecorations={};for(let n=1;n<=12;n++)if(raw.seasonalDecorations[n])out.seasonalDecorations[n]=cleanSeasonalDecorationModes(raw.seasonalDecorations[n]);}return out;};
function applyJuneDecoration(){
 const n=month.getMonth()+1,url=window.BAZAR_THEME?.months?.[n];if(!url)return;
 if(!seasonalDecorationImages.has(url)){const image=new Image();seasonalDecorationImages.set(url,image);image.onload=()=>{seasonalDecorationRatios[n]=image.naturalWidth/image.naturalHeight;if(month.getMonth()+1===n)applyJuneDecoration();};image.src=url;}
 const p=juneDecorationSettings(),texture='url("assets/Fond texturé Beige.png")',decor='url('+JSON.stringify(url)+')',width=innerHeight*seasonalDecorationRatios[n]*p.width/100;
 Object.assign(document.body.style,{backgroundImage:p.hidden?texture:decor+','+texture,backgroundSize:p.hidden?'100vw 100dvh':width+'px '+p.height+'dvh,100vw 100dvh',backgroundPosition:p.hidden?'center center':'calc(0% + '+p.x+'px) calc(50% + '+p.y+'px),center center',backgroundRepeat:'no-repeat',backgroundAttachment:'fixed'});
}
const juneSeasonBefore=applySeasonalBackground;
applySeasonalBackground=function(image,key){juneSeasonBefore(image,key);if(key===seasonalMonthKey(month))applyJuneDecoration();};
const juneApplyBefore=applyVisualPreferences;
applyVisualPreferences=function(){juneApplyBefore();applyJuneDecoration();};
addEventListener('resize',applyJuneDecoration);
const juneCandidatesBefore=allVisualCandidates;
allVisualCandidates=function(){const list=juneCandidatesBefore();list.push({key:seasonalDecorationKey(),el:document.body,label:'Fond de '+month.toLocaleDateString('fr-FR',{month:'long'})+' · illustration indépendante',min:20,max:200});return list;};
const juneSelectorBefore=visualSelector;
visualSelector=function(key){return ['june-decoration','seasonal-decoration'].includes(key)?'body':juneSelectorBefore(key);};
const juneValuesBefore=visualValues;
visualValues=function(key){return ['june-decoration','seasonal-decoration'].includes(key)?{}:juneValuesBefore(key);};
const juneResetBefore=resetVisualElement;
resetVisualElement=function(){if(!seasonalDecorationSelected())return juneResetBefore();const n=month.getMonth()+1;if(visualEditSession.draft.seasonalDecorations)delete visualEditSession.draft.seasonalDecorations[n];if(n===6)delete visualEditSession.draft.juneDecoration;applyJuneDecoration();renderVisualEditor();};
const juneEditorBefore=renderVisualEditor;
renderVisualEditor=function(){
 juneEditorBefore();if(!seasonalDecorationSelected())return;
 const panel=$('#visualEditorPanel'),p=juneDecorationSettings(),box=document.createElement('fieldset');box.id='juneDecorationSettings';
 box.innerHTML='<legend>Illustration de '+month.toLocaleDateString('fr-FR',{month:'long'})+' — '+(juneDecorationMode()==='mobile'?'Téléphone':'PC')+'</legend><p>Le fond beige reste à 100 %. Réglages indépendants pour ce mois, conservés les années suivantes.</p><label><input type="checkbox" data-june-property="locked" '+(p.locked?'checked':'')+'> Conserver les proportions</label>'+[['width','Largeur (%)',20,200],['height','Hauteur (%)',20,200],['x','Décalage horizontal (px)',-3000,3000],['y','Décalage vertical (px)',-3000,3000]].map(([key,label,min,max])=>'<label class="visual-field">'+label+'<input type="number" data-june-property="'+key+'" min="'+min+'" max="'+max+'" step="1" value="'+p[key]+'"></label>').join('')+'<label><input type="checkbox" data-june-property="hidden" '+(p.hidden?'checked':'')+'> Masquer l’illustration (récupérable ici)</label>';
 panel.querySelector('#visualReset').before(box);
 box.querySelectorAll('[data-june-property]').forEach(input=>input.oninput=()=>{const key=input.dataset.juneProperty,flag=['hidden','locked'].includes(key),value=flag?input.checked:input.valueAsNumber;if(!flag&&!Number.isFinite(value))return;const current=juneDecorationSettings(),n=month.getMonth()+1,root=visualEditSession.draft.seasonalDecorations??={};root[n]??={};const mode=juneDecorationMode();root[n][mode]??={...current};const target=root[n][mode];target[key]=value;if((current.locked&&['width','height'].includes(key))||(key==='locked'&&value)){const size=key==='locked'?current.width:Math.max(20,Math.min(200,value));target.width=target.height=size;for(const name of ['width','height'])box.querySelector('[data-june-property='+name+']').value=size;}visualEditSession.draft=cleanVisualPreferences(visualEditSession.draft);applyJuneDecoration();});
};
applyJuneDecoration();
