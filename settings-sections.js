/* Lot A : déplacer les vrais éléments, sans remplacer leurs gestionnaires. */
const settingsBeforeSectionLayout=$('#settings').onclick;
$('#settings').onclick=function(){
  settingsBeforeSectionLayout();
  const dialog=$('#dialog');
  const existing=[...dialog.children];
  const body=document.createElement('div');body.className='settings-sections';
  function section(title){const node=document.createElement('section');node.className='settings-section';const h=document.createElement('h3');h.textContent=title;node.appendChild(h);body.appendChild(node);return node}
  const personal=section('PERSONNALISATION');
  for(const label of ['Personnaliser le site','Gérer les fonds saisonniers']){const row=document.createElement('div');row.className='settings-coming';const name=document.createElement('span');name.textContent=label;const status=document.createElement('small');status.textContent='À venir';row.append(name,status);personal.appendChild(row)}
  const family=section('FAMILLE ET ORGANISATION');
  const actions=document.createElement('div');actions.className='settings-action-grid';family.appendChild(actions);
  for(const label of ['Avatars de la famille','Organiser mes courses','Historique du planning','Événements du calendrier']){const button=existing.find(e=>e.tagName==='BUTTON'&&e.textContent.trim()===label);if(button)actions.appendChild(button)}
  const storage=section('MES DONNÉES ET SAUVEGARDES');
  for(const node of existing){if(node.matches('.close,h2')||actions.contains(node))continue;storage.appendChild(node)}
  const archive=storage.querySelector('.recipe-archive-settings>h3');if(archive)archive.textContent='Conservation des recettes et photos';
  dialog.appendChild(body);
};
/* Petite icône vectorielle colorée, indépendante de la police emoji de l’appareil. */
const calendarEventsBeforeCenteredLabel=renderCalendarEvents;
renderCalendarEvents=function(){calendarEventsBeforeCenteredLabel();document.querySelectorAll('[data-day-event]').forEach(button=>{const event=data.calendarEvents?.find(e=>e.id===button.dataset.dayEvent);if(!event)return;button.textContent='';if(event.kind==='birthday'){const icon=document.createElement('span');icon.className='calendar-birthday-icon';icon.innerHTML='<svg viewBox="0 0 16 16" width="12" height="12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 0C4 4 10 5 8 0Z" fill="#ffad16"/><rect x="7" y="4" width="2" height="4" rx=".5" fill="#25a9cf"/><rect x="2" y="8" width="12" height="6" rx="1" fill="#e34b85"/><path d="M2 8h12v3c-2 2-3-2-5-1s-3 3-4 1-2 0-3-1Z" fill="#fff3df"/><path d="M1 15h14" stroke="#75412d" stroke-width="1.5" stroke-linecap="round"/></svg>';icon.setAttribute('aria-hidden','true');button.append(icon)}const title=document.createElement('span');title.textContent=event.kind==='birthday'?(event.title.replace(/^anniversaire(?:\s+de|\s+d['’])?\s*/i,'').trim()||event.title):event.title;button.append(title);button.setAttribute('aria-label',(event.kind==='birthday'?'Anniversaire : ':'Événement : ')+event.title)})};
if(page==='À table !')renderCalendarEvents();
