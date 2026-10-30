/* The existing editor owns both automatic layout and true free positioning. */
function recipeFreeRects(group,cfg=recipeGroupConfig()){
 const result={},placed=[];for(const id of cfg.order){const frame=recipeGroupNodes().find(e=>e.dataset.recipeLayoutItem===id);if(!frame||frame.hidden)continue;const p=cfg.items[id]||{};if(!p.width)frame.style.setProperty('width','max-content','important');const width=Math.max(32,p.width||frame.offsetWidth||80),height=Math.max(32,p.height||frame.offsetHeight||36);let rect={x:p.x??0,y:p.y??0,width,height};
 if((p.x===undefined||p.y===undefined)&&placed.some(r=>recipeGroupTools.overlaps(r,rect))){const xs=[0,...placed.map(r=>r.x+r.width+cfg.gap)],ys=[0,...placed.map(r=>r.y+r.height+cfg.rowGap)];let found=false;for(const y of ys.sort((a,b)=>a-b)){for(const x of xs.sort((a,b)=>a-b)){const candidate={x,y,width,height};if(x+width>group.clientWidth&&x!==0)continue;if(!placed.some(r=>recipeGroupTools.overlaps(r,candidate))){rect=candidate;found=true;break;}}if(found)break;}}
 result[id]=rect;placed.push(rect);
 }return result;
}
const recipeAutoLayoutBefore=applyRecipeGroupLayout;
applyRecipeGroupLayout=function(group){const free=recipeGroupConfig().layout==='free';if(!free){group.style.removeProperty('height');for(const frame of recipeGroupNodes())for(const key of ['position','left','top','height'])frame.style.removeProperty(key);}
 recipeAutoLayoutBefore(group);if(!free)return;const rects=recipeFreeRects(group);let bottom=40;for(const frame of recipeGroupNodes()){if(frame.hidden)continue;const r=rects[frame.dataset.recipeLayoutItem];if(!r)continue;for(const [key,value]of Object.entries({position:'absolute',left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px',margin:'0'}))frame.style.setProperty(key,value,'important');bottom=Math.max(bottom,r.y+r.height+4);}group.style.setProperty('height',bottom+'px','important');
};
function recipeFreeSetLayout(layout){if(!visualEditSession)return;const group=$('#catalog .recipe-layout-group'),origin=group.getBoundingClientRect(),rects=recipeGroupNodes().filter(e=>!e.hidden).map(e=>{const r=e.getBoundingClientRect(),id=e.dataset.recipeLayoutItem,p=recipeGroupConfig().items[id]||{},button=e.querySelector("button");let width=r.width,height=r.height;if(button&&!p.width){const oldWidth=button.style.getPropertyValue("width"),oldSpace=button.style.getPropertyValue("white-space");button.style.setProperty("width","max-content","important");button.style.setProperty("white-space","nowrap","important");width=Math.max(width,button.getBoundingClientRect().width);height=Math.max(height,button.getBoundingClientRect().height);button.style.setProperty("width",oldWidth,"important");if(oldSpace)button.style.setProperty("white-space",oldSpace,"important");else button.style.removeProperty("white-space");}return {id,x:Math.round(r.x-origin.x),y:Math.round(r.y-origin.y),width:Math.ceil(width),height:Math.ceil(height)};});recipeGroupChange(p=>{p.layout=layout;if(layout==='free'){p.items??={};for(const r of rects)p.items[r.id]={...p.items[r.id],x:p.items[r.id]?.x??r.x,y:p.items[r.id]?.y??r.y,width:p.items[r.id]?.width||r.width,height:p.items[r.id]?.height||r.height};}});if(layout==="free")recipeGroupChange(p=>{for(const frame of recipeGroupNodes())if(!frame.hidden)Object.assign(p.items[frame.dataset.recipeLayoutItem],{x:frame.offsetLeft,y:frame.offsetTop});});renderVisualEditor();}
function recipeFreeTry(id,props){const group=$('#catalog .recipe-layout-group'),cfg=recipeGroupConfig(),rects=recipeFreeRects(group,cfg),old=rects[id];if(!old)return false;const candidate={...old,...props};candidate.x=Math.round(Math.max(0,Math.min(2400,candidate.x)));candidate.y=Math.round(Math.max(0,Math.min(1600,candidate.y)));candidate.width=Math.round(Math.max(32,Math.min(1400,candidate.width)));candidate.height=Math.round(Math.max(32,Math.min(240,candidate.height)));
 recipeGroupChange(p=>{p.items??={};p.items[id]={...p.items[id],...candidate};});return true;
}
function recipeFreeDrag(d,e){
 const dx=(e.clientX-d.cx)/(d.scaleX||1),dy=(e.clientY-d.cy)/(d.scaleY||1);
 if(!d.moved&&Math.abs(dx)+Math.abs(dy)<3)return;
 d.moved=true;
 const r={x:d.x,y:d.y,width:d.width,height:d.height};
 if(d.resize){r.width=Math.round(Math.max(32,Math.min(d.maxWidth||1400,d.width+dx)));r.height=Math.round(Math.max(32,Math.min(d.maxHeight||240,d.height+dy)));}
 else{r.x=Math.round(Math.max(d.minX??0,Math.min(d.maxX||2400,d.x+dx)));r.y=Math.round(Math.max(d.minY??0,Math.min(d.maxY||1600,d.y+dy)));}
 if(!d.resize)recipeAlignmentPreview(d,r,e);
 else recipeAlignmentClear();
 d.preview=r;
 const rects=d.rects?d.rects():recipeFreeRects(d.group);
 d.invalid=false;
 // Positions remain independent; alignment only assists the current preview.
 // intermediate movement never rewrites preferences or rebuilds the editor.
 for(const [key,value]of Object.entries({left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px','z-index':'10'}))d.frame.style.setProperty(key,value,'important');
 const bottom=Math.max(r.y+r.height+4,...Object.values(rects).map(a=>a.y+a.height+4));
 d.group.style.setProperty('height',(d.lockHeight??bottom)+'px','important');
 d.frame.toggleAttribute('data-free-invalid',d.invalid);
}
const recipeFreeItemBefore=recipeGroupItemChange;
recipeGroupItemChange=function(id,key,value){if(recipeGroupConfig().layout==='free'&&['x','y','width','height'].includes(key)){recipeFreeTry(id,{[key]:value});return;}recipeFreeItemBefore(id,key,value);};

// The same existing layout choice must remain reachable after selecting a child.
// No mode or position is changed merely by opening these controls.
function recipeFreePlacementControl(panel){
 let select=panel.querySelector('#recipeGroupLayout');
 if(!select){
  const label=document.createElement('label');label.className='visual-field';
  label.textContent='Mode de placement';
  select=document.createElement('select');select.id='recipeGroupLayout';
  select.innerHTML='<option value="single">Une seule ligne (défilement si nécessaire)</option><option value="wrap">Retour à la ligne automatique</option><option value="free">Placement libre à la souris</option>';
  label.append(select);panel.querySelector('p').after(label);
  select.addEventListener('change',e=>recipeFreeSetLayout(e.target.value));
 }else select.closest('label').firstChild.textContent='Mode de placement';
 select.setAttribute('aria-label','Mode de placement');
 select.value=recipeGroupConfig().layout;
}
const recipeFreeRenderBefore=renderVisualEditor;
renderVisualEditor=function(){recipeFreeRenderBefore();const key=visualEditSession?.key,panel=$('#recipeGroupControls');if(!panel)return;recipeFreePlacementControl(panel);if(recipeGroupConfig().layout!=='free')return;for(const name of ['spacing','gap','rowGap','padding']){if(name==='padding'&&key?.startsWith(recipeGroupKey+':'))continue;panel.querySelector('[data-recipe-group-property='+name+']')?.closest('label')?.remove();}panel.querySelector('fieldset')?.remove();for(const [name,label]of [['width','Largeur'],['height','Hauteur']]){const input=panel.querySelector('[data-recipe-group-property='+name+']');if(input&&key?.startsWith(recipeGroupKey+':')){input.closest('label').firstChild.textContent=label;input.setAttribute('aria-label',label);input.min='32';}}const text=panel.querySelector('p');if(text)text.textContent='Placement libre : glisse chaque élément où tu veux. Les positions X/Y sont indépendantes des autres commandes. Tout reste en brouillon jusqu’à Enregistrer.';if(!key?.startsWith(recipeGroupKey+':'))return;const id=key.slice(recipeGroupKey.length+1),frame=recipeGroupNodes().find(e=>e.dataset.recipeLayoutItem===id);if(!frame)return;const fields=document.createElement('div');fields.innerHTML=recipeGroupControl('x','Position horizontale',frame.offsetLeft)+recipeGroupControl('y','Position verticale',frame.offsetTop);panel.querySelector('#recipeGroupSelectParent').after(fields);fields.querySelectorAll('input').forEach(input=>input.oninput=()=>{if(input.value!=='')recipeGroupItemChange(id,input.dataset.recipeGroupProperty,Number(input.value));});};
document.addEventListener('pointerup',()=>document.querySelectorAll('[data-free-invalid]').forEach(e=>e.removeAttribute('data-free-invalid')),true);




