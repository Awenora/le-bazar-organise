/* The weekly heart toggles only the current profile's meal preference. */
function weekMealLikeSummary(key){return (data.feedback?.[key]?.likes||[]).map(displayName).join(', ');}
function refreshWeekMealLikes(){
 document.querySelectorAll('#side .weekmeal .heart[data-feedback]').forEach(button=>{
  const key=button.dataset.feedback,liked=(data.feedback?.[key]?.likes||[]).includes(data.profile),count=data.feedback?.[key]?.likes?.length||0,symbol=(liked?'♥':'♡')+(count?String(count).split('').map(n=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(n)]).join(''):'');
  button.classList.toggle('liked',liked);button.setAttribute('aria-pressed',String(liked));button.title=weekMealLikeSummary(key);button.setAttribute('aria-label',(liked?'Retirer mon choix':'J’aime ce repas et je souhaite en manger')+' — '+button.title);
  if(button.textContent!==symbol)button.textContent=symbol;
  button.onclick=()=>toggleWeekMealLike(key);
 });
}
function toggleWeekMealLike(key){
 if(visualEditSession)return;
 if(!data.profile)return profiles();
 const [day,slot]=key.split('|');if(!recipe(data.plans?.[day]?.[slot]?.recipeId))return;
 const existed=Object.prototype.hasOwnProperty.call(data.feedback,key),before=existed?structuredClone(data.feedback[key]):null;
 const f=data.feedback[key]??={likes:[],comments:[]},likes=Array.isArray(f.likes)?f.likes:[];
 f.likes=likes.includes(data.profile)?likes.filter(person=>person!==data.profile):[...likes,data.profile];
 if(save()===false){if(existed)data.feedback[key]=before;else delete data.feedback[key];refreshWeekMealLikes();return;}
 refreshWeekMealLikes();
}
const weekMealLikesWeeklyBefore=weekly;
weekly=function(){weekMealLikesWeeklyBefore();refreshWeekMealLikes();};
refreshWeekMealLikes();
