(function(){'use strict';
 const previous=document.getElementById('settings').onclick;
 document.getElementById('settings').onclick=function(...args){
  const result=previous.apply(this,args),dialog=document.getElementById('dialog');
  const section=document.createElement('section');section.className='settings-section';
  const heading=document.createElement('h3');heading.textContent='AFFICHAGE';
  const label=document.createElement('label');label.className='display-mode-toggle';
  const input=document.createElement('input');input.type='checkbox';input.role='switch';input.checked=BazarDisplayMode.isDark();
  const text=document.createElement('span');text.textContent='Mode sombre';
  label.append(input,text);
  input.onchange=()=>BazarDisplayMode.set(input.checked);
  const note=document.createElement('small');note.textContent='Mémorisé sur cet appareil.';
  section.append(heading,label,note);
  const sections=dialog.querySelector('.settings-sections');
  if(sections)sections.prepend(section);else dialog.querySelector('h2')?.after(section);
  return result;
 };
})();
