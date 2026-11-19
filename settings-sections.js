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
renderCalendarEvents=function(){calendarEventsBeforeCenteredLabel();document.querySelectorAll('[data-day-event]').forEach(button=>{const event=data.calendarEvents?.find(e=>e.id===button.dataset.dayEvent);if(!event)return;button.textContent='';if(event.kind==='birthday'){const icon=document.createElement('span');icon.className='calendar-birthday-icon';icon.innerHTML='<svg viewBox="0 0 24 24" width="16" height="14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 10h14v10H5z" fill="#864731"/><path d="M5 14h14v3H5z" fill="#fff1ce"/><path d="M4 10c0-2 16-2 16 0v3c-1 2-3-1-4 0s-2 3-4 1-2-2-4 0-4 0-4-1z" fill="#ff80ad"/><ellipse cx="12" cy="9.5" rx="8" ry="2.5" fill="#ffe1ed"/><path d="M7 5v5m5-6v6m5-5v5" stroke="#39a9ca" stroke-width="2"/><path d="M7 1c-3 4 3 4 0 0m5-1c-3 4 3 4 0 0m5 1c-3 4 3 4 0 0" fill="#ffb52e"/><path d="M3 21h18" stroke="#f9d276" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="18.5" r=".7" fill="#ff80ad"/><circle cx="16" cy="18.5" r=".7" fill="#ff80ad"/></svg>';icon.setAttribute('aria-hidden','true');button.append(icon)}const title=document.createElement('span');title.textContent=event.title;button.append(title);button.setAttribute('aria-label',(event.kind==='birthday'?'Anniversaire : ':'Événement : ')+event.title)})};
if(page==='À table !')renderCalendarEvents();
