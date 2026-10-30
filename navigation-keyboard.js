/* Raccourci des onglets principaux : réutilise leurs clics, sans modifier la mise en page. */
(()=>{
 function visibleTabs(){return [...document.querySelectorAll('#globalNav > button[data-page]')].filter(b=>!b.disabled&&!b.hidden&&b.getClientRects().length&&getComputedStyle(b).visibility!=='hidden').sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);}
 document.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.key)||event.defaultPrevented||event.repeat||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||visualEditSession)return;
  const target=event.target instanceof Element?event.target:null;
  if(target?.isContentEditable||target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"],[role="spinbutton"],[role="separator"],[role="menu"],[role="listbox"],form,dialog,#visualEditorPanel')||document.querySelector('dialog[open],.bazar-action-menu,.side-notebook-menu,[role="menu"]'))return;
  if(target?.closest('[role="tablist"]')&&!target.closest('#globalNav'))return;
  const tabs=visibleTabs(),index=tabs.findIndex(b=>b.dataset.page===page),next=tabs[index+(event.key==='ArrowRight'?1:-1)];if(index<0||!next)return;
  const keepNavFocus=!!target?.closest('#globalNav'),destination=next.dataset.page;event.preventDefault();next.click();
  if(keepNavFocus)[...document.querySelectorAll('#globalNav > button[data-page]')].find(b=>b.dataset.page===destination)?.focus({preventScroll:true});
 });
})();
