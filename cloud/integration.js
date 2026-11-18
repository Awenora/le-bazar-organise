/* Render integration; styles and business calculations remain untouched. */
(function(){
  const cloud=window.BazarCloud;
  cloud.currentPage=()=>page;
  function same(a,b){
    const keys=Object.keys(a);
    return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&JSON.stringify(a[key])===JSON.stringify(b[key]));
  }
  let menuRefreshDeferred=false,viewRefreshTimer,lastViewScroll=-Infinity;
  document.addEventListener('scroll',event=>{
    if(event.target===document||event.target.closest?.('#main,#side'))lastViewScroll=performance.now();
  },{capture:true,passive:true});
  function recipeMenuOpen(){
    const targeted=page==='Carnets'||page==='Recettes'||(page==='À table !'&&tab==='Recettes');
    return document.querySelector('#courseDestinationChoice')||(targeted&&document.querySelector('#sideNotebookMenu,.bazar-action-menu'));
  }
  function busy(){
    const menu=recipeMenuOpen();if(menu)menuRefreshDeferred=true;
    return menu||document.querySelector('#dialog')?.open||
    (typeof visualEditSession!=='undefined'&&visualEditSession)||
    (phoneAppearanceLocked&&page==='Courses'&&document.querySelector('.courses-line.is-in-cart input[data-cart]:disabled'))||
    document.activeElement?.matches('input,textarea,select,[contenteditable=true]');}
  function exportLocal(){
    const blob=new Blob([JSON.stringify(cloud.engine.view(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='bazar-version-locale-conflit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  let scrollGeneration=0,scrollInteraction=0;
  for(const event of ['wheel','touchstart','pointerdown','keydown'])document.addEventListener(event,()=>{scrollInteraction++;},{capture:true,passive:true});
  function rememberScroll(el){
    const top=el.scrollTop,left=el.scrollLeft;
    if(el===document.scrollingElement)return {find:()=>document.scrollingElement,top,left};
    if(el.id)return {find:()=>document.getElementById(el.id),top,left};
    if(el.matches('[data-course-primary],[data-sr-table]')){
      const attr=el.hasAttribute('data-course-primary')?'data-course-primary':'data-sr-table',selector='['+attr+'="'+CSS.escape(el.getAttribute(attr))+'"]';
      return {find:()=>document.querySelector(selector),top,left};
    }
    if(el.matches('#side .cards'))return {find:()=>document.querySelector('#side .cards'),top,left};
    // Relative child paths belong to a stable ancestor, never the first matching class.
    const anchor=el.parentElement?.closest('[id],[data-course-primary],[data-sr-table]');if(!anchor)return null;
    const path=[];for(let node=el;node!==anchor;node=node.parentElement){path.unshift([...node.parentElement.children].indexOf(node));}
    const selector=anchor.id?'#'+CSS.escape(anchor.id):anchor.hasAttribute('data-course-primary')?'[data-course-primary="'+CSS.escape(anchor.dataset.coursePrimary)+'"]':'[data-sr-table="'+CSS.escape(anchor.dataset.srTable)+'"]',tag=el.tagName;
    return {find:()=>{let node=document.querySelector(selector);for(const i of path)node=node?.children[i];return node?.tagName===tag?node:null;},top,left};
  }
  function restoreScroll(scroll){for(const state of scroll){const node=state.find();if(node){node.scrollTop=state.top;node.scrollLeft=state.left;}}}

  function viewKey(){
    return JSON.stringify([page,page==='À table !'?[tab,datekey(month),datekey(week),phonePlanningMonth]:null,
      page==='Courses'?datekey(coursesWeek()):null,page==='Carnets'?openedNotebook:null,
      page==='Réserves'?stockRoomPrefs().view.locationId:null,page==='Budget'?budgetMonth:null]);
  }
  let displayedView=null,renderDepth=0;
  function preservePosition(fn){return function(...args){
    if(renderDepth)return fn.apply(this,args);
    const view=viewKey(),keep=displayedView===view&&!visualEditSession;
    const scroll=keep?[...document.querySelectorAll('#main,#main *,#side,#side *')].filter(el=>el.scrollTop||el.scrollLeft).map(rememberScroll).filter(Boolean):[];
    if(keep&&document.scrollingElement&&(document.scrollingElement.scrollTop||document.scrollingElement.scrollLeft))scroll.unshift(rememberScroll(document.scrollingElement));
    const groups=keep?[...document.querySelectorAll('#main details[id]')].map(el=>[el.id,el.open]):[];
    const generation=++scrollGeneration,interaction=scrollInteraction;
    renderDepth++;
    let result;
    try{result=fn.apply(this,args);}finally{renderDepth--;displayedView=viewKey();}
    if(keep&&displayedView===view){
      for(const [id,open]of groups){const el=document.getElementById(id);if(el?.tagName==='DETAILS')el.open=open;}
      const restore=()=>{if(generation===scrollGeneration&&interaction===scrollInteraction&&viewKey()===view)restoreScroll(scroll);};
      restore();
      requestAnimationFrame(()=>{restore();requestAnimationFrame(restore);});
    }
    return result;
  };}
  // Local edits and background updates rebuild the same scroll containers.
  // Preserve their position only within the same page and selected view.
  render=preservePosition(render);
  shopping=preservePosition(shopping);
  planning=preservePosition(planning);
  catalogPage=preservePosition(catalogPage);
  notebooks=preservePosition(notebooks);
  stockRoomRender=preservePosition(stockRoomRender);
  reserves=preservePosition(reserves);
  familyRenderStock=preservePosition(familyRenderStock);
  budgetRender=preservePosition(budgetRender);
  cloud.tryApply=()=>{
    if(busy())return;
    if(cloud.authRequired&&navigator.onLine&&!cloud.reconnecting){
      cloud.reconnecting=true;cloud.reconnect().then(()=>{cloud.authRequired=false;cloud.sync();}).finally(()=>cloud.reconnecting=false);return;
    }
    if(cloud.engine.state.conflicts.length){
      if(cloud.conflictMuted)return;
      modal('<h2>Modifications simultanées</h2><p>Deux versions ont été conservées. Aucun écrasement automatique.</p><button id="cloudKeep">Conserver mes modifications</button><button id="cloudRemote">Exporter ma version puis reprendre la version partagée</button><button id="cloudLater">Plus tard</button>');
      const structural=cloud.engine.state.conflicts.some(c=>c.reason==='structure-changed');
      $('#cloudKeep').disabled=structural;$('#cloudKeep').title=structural?'Un élément a été supprimé ou réorganisé ailleurs : conserver une copie avant de reprendre.':'';
      $('#cloudKeep').onclick=()=>{cloud.engine.resolve('local');$('#dialog').close();cloud.sync();};
      $('#cloudRemote').onclick=()=>{exportLocal();cloud.engine.resolve('remote');$('#dialog').close();cloud.sync();};
      $('#cloudLater').onclick=()=>{cloud.conflictMuted=true;$('#dialog').close();};return;
    }
    if(performance.now()-lastViewScroll<300){
      clearTimeout(viewRefreshTimer);
      viewRefreshTimer=setTimeout(()=>cloud.tryApply(),320);
      return;
    }
    const next=cloud.engine.view();if(same(data,next)||cloud.sameData(data,next))return;
    cloud.patch(data,next);cloud.applied(data);
    window.BazarAutomaticRestock?.invalidate?.();
    if(typeof budgetEmpty!=='undefined')budgetEmpty=null;
    render();

  };
  // Whole-database replacement breaks library revision protection even when
  // requested through an old import handler; preserve the file and refuse it.
  const originalSave=save;
  save=function(){
    if(data!==cloud.dataReference){data=cloud.dataReference;toast('Remplacement global bloqué : vos données et le fichier restent conservés.');return false;}
    return originalSave();
  };
  cloud.dataReference=data;
  // Stock already has a value-checked targeted undo. Courses historically
  // restores snapshots: refuse undo if a remote update changed that baseline.
  undoCoursesAction=function(){
    try{if(!cloud.engine.undoCourses()){toast('Aucune action Courses de cette session à annuler.');return;}cloud.tryApply();cloud.sync();}
    catch(error){toast(error.message);}
  };
  // Preserve manual restore, but keep object identity, version checks and a
  // durable pre-restore copy. Never replay a snapshot as an unversioned replace.
  $('#import').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      const incoming=JSON.parse(await file.text());
      if(incoming.version!==1||!Array.isArray(incoming.recipes)||!incoming.plans||!Array.isArray(incoming.categories)||!incoming.feedback||!incoming.recipes.every(r=>r.id&&r.name&&Array.isArray(r.ingredients)&&Array.isArray(r.steps)&&Array.isArray(r.categories)&&Array.isArray(r.favorites)))throw Error('Sauvegarde incompatible.');
      modal('<h2>Restaurer cette sauvegarde ?</h2><p>Une copie de la version actuelle sera conservée. Les modifications seront soumises aux contrôles de versions du foyer.</p><button id="confirmImport">Restaurer avec contrôle des versions</button>');
      $('#confirmImport').onclick=()=>{
        const before=structuredClone(data);
        if(phoneAppearanceLocked){
          for(const key of ['visualPreferences','notebookLayout','notebookSizes','menuWidths','coursesLayout','stockCardOrder','profileOrder']){
            if(Object.hasOwn(before,key))incoming[key]=before[key];
            else delete incoming[key];
          }
          if(before.inventory?.layout)(incoming.inventory??={}).layout=before.inventory.layout;
          else if(incoming.inventory)delete incoming.inventory.layout;
        }
        cloud.restoring=true;
        try{cloud.patch(data,incoming);if(!save()){cloud.patch(data,before);return;}$('#dialog').close();render();}
        finally{cloud.restoring=false;}
      };
    }catch(error){toast(error.message);}event.target.value='';
  };
  cloud.externalConflict=other=>{
    if(busy()||cloud.externalMuted)return;
    modal('<h2>Modifications conservées dans un ancien onglet</h2><p>Un conflit empêche leur envoi. Elles restent enregistrées sur cet appareil.</p><button id="cloudOtherExport">Exporter cette version</button><button id="cloudOtherLater">Plus tard</button>');
    $('#cloudOtherExport').onclick=()=>{
      const blob=new Blob([JSON.stringify(other.view(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='bazar-autre-onglet-conserve.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    $('#cloudOtherLater').onclick=()=>{cloud.externalMuted=true;$('#dialog').close();};
  };
  document.addEventListener('close',()=>setTimeout(()=>cloud.tryApply(),0),true);
  document.addEventListener('focusout',()=>setTimeout(()=>cloud.tryApply(),0),true);
  // Apply queued display updates only after selection, outside click or Escape.
  // The existing menus still own opening, closing and their business actions.
  for(const event of ['click','keydown'])document.addEventListener(event,()=>{
    if(menuRefreshDeferred)setTimeout(()=>{
      if(!recipeMenuOpen()){menuRefreshDeferred=false;cloud.tryApply();}
    },0);
  });
  cloud.tryApply();
})();
