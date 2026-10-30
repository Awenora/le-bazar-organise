/* Temporary editor assistance; coordinates and preferences remain in its draft. */
function recipeAlignmentMatch(rect,others,axis,tolerance){
 const size=axis==='x'?'width':'height';let best=null;
 for(const other of others)for(const fraction of [.5,0,1]){
  const line=other[axis]+other[size]*fraction,delta=line-(rect[axis]+rect[size]*fraction);
  if(Math.abs(delta)<=tolerance&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta,line,other,fraction};
 }
 return best;
}
function recipeAlignmentClear(){document.querySelector('#recipeAlignmentOverlay')?.remove();}
function recipeAlignmentPreview(d,rect,e){
 const cfg=d.config?d.config():recipeGroupConfig(),others=Object.entries(d.rects?d.rects():recipeFreeRects(d.group,cfg)).filter(([id])=>id!==d.id).map(([,r])=>r);
 const sx=d.scaleX||1,sy=d.scaleY||1,tolerance=cfg.snapDistance??5;
 const x=recipeAlignmentMatch(rect,others,'x',tolerance/sx),y=recipeAlignmentMatch(rect,others,'y',tolerance/sy);
 if(cfg.alignmentSnap!==false&&!e.altKey){
  if(x)rect.x=Math.max(d.minX??0,Math.min(d.maxX||2400,Math.round(rect.x+x.delta)));
  if(y)rect.y=Math.max(d.minY??0,Math.min(d.maxY||1600,Math.round(rect.y+y.delta)));
 }
 recipeAlignmentClear();
 if(cfg.alignmentGuides===false||e.altKey)return;
 const lines=[],distance=cfg.alignmentSnap!==false?1:tolerance;
 for(const [axis,match,scale]of [['x',x,sx],['y',y,sy]]){
  if(!match)continue;const size=axis==='x'?'width':'height';
  if(Math.abs(rect[axis]+rect[size]*match.fraction-match.line)*scale>distance)continue;
  const cross=axis==='x'?'y':'x',extent=axis==='x'?'height':'width';
  lines.push({axis,value:match.line,start:Math.min(rect[cross],match.other[cross])-6,end:Math.max(rect[cross]+rect[extent],match.other[cross]+match.other[extent])+6});
 }
 if(!lines.length)return;
 const overlay=document.createElement('div');overlay.id='recipeAlignmentOverlay';overlay.setAttribute('aria-hidden','true');
 overlay.style.cssText='position:fixed;inset:0;pointer-events:none!important;z-index:90000;overflow:hidden;';
 const bounds=d.group.getBoundingClientRect(),ox=bounds.left+(d.group.clientLeft-d.group.scrollLeft)*sx,oy=bounds.top+(d.group.clientTop-d.group.scrollTop)*sy;
 const drawn=new Set();
 for(const line of lines){
  const key=JSON.stringify(line);if(drawn.has(key))continue;drawn.add(key);
  const el=document.createElement('span');el.dataset.guideAxis=line.axis;
  el.style.cssText='position:absolute;pointer-events:none!important;opacity:.85;box-sizing:border-box;';
  const color=cfg.guideColor||'#805230';
  if(line.axis==='x'){el.style.left=(ox+line.value*sx)+'px';el.style.top=(oy+line.start*sy)+'px';el.style.height=((line.end-line.start)*sy)+'px';el.style.borderLeft='1px solid '+color;}
  else{el.style.left=(ox+line.start*sx)+'px';el.style.top=(oy+line.value*sy)+'px';el.style.width=((line.end-line.start)*sx)+'px';el.style.borderTop='1px solid '+color;}
  overlay.append(el);
 }
 document.body.append(overlay);
}
const finishBeforeRecipeAlignment=finishRecipeLayout;
finishRecipeLayout=function(e,cancel=false){try{return finishBeforeRecipeAlignment(e,cancel);}finally{if(!recipeLayoutGesture)recipeAlignmentClear();}};
const closeBeforeRecipeAlignment=closeVisualEditor;
closeVisualEditor=function(){recipeAlignmentClear();return closeBeforeRecipeAlignment();};
const cancelBeforeRecipeAlignment=cancelVisualChanges;
cancelVisualChanges=function(){recipeAlignmentClear();return cancelBeforeRecipeAlignment();};
window.addEventListener('blur',()=>{const d=recipeLayoutGesture;if(d?.free)finishRecipeLayout({pointerId:d.pointer},true);else recipeAlignmentClear();});
function recipeAlignmentSettings(panel,cfg,change){
 const box=document.createElement('details');box.id='recipeAlignmentSettings';
 box.innerHTML='<summary>Aide à l’alignement</summary><label><input type="checkbox" data-alignment="alignmentGuides" '+(cfg.alignmentGuides!==false?'checked':'')+'> Guides temporaires</label><label><input type="checkbox" data-alignment="alignmentSnap" '+(cfg.alignmentSnap!==false?'checked':'')+'> Aimant léger</label><label class="visual-field">Distance de l’aimant (pixels)<input type="number" min="1" max="12" data-alignment="snapDistance" value="'+(cfg.snapDistance??5)+'"></label><label class="visual-field">Couleur des guides<input type="color" data-alignment="guideColor" value="'+(cfg.guideColor||'#805230')+'"></label><small>Maintiens Alt pendant le déplacement pour ignorer l’alignement. Rien n’est enregistré avant Enregistrer.</small>';
 panel.querySelector('p').after(box);
 box.querySelectorAll('input').forEach(input=>input.oninput=()=>{
  if(input.type==='number'&&!input.value)return;
  const value=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
  change(input.dataset.alignment,value);recipeAlignmentClear();
 });
}
const renderBeforeRecipeAlignment=renderVisualEditor;
renderVisualEditor=function(){renderBeforeRecipeAlignment();const panel=document.querySelector('#recipeGroupControls');if(!panel||recipeGroupConfig().layout!=='free')return;recipeAlignmentSettings(panel,recipeGroupConfig(),(key,value)=>recipeGroupChange(p=>p[key]=value));};
