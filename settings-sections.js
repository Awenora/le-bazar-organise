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
/* Le gâteau utilise explicitement une police emoji, sans toucher aux événements enregistrés. */
const calendarEventsBeforeCenteredLabel=renderCalendarEvents;
renderCalendarEvents=function(){calendarEventsBeforeCenteredLabel();document.querySelectorAll('[data-day-event]').forEach(button=>{const event=data.calendarEvents?.find(e=>e.id===button.dataset.dayEvent);if(!event)return;button.textContent='';if(event.kind==='birthday'){const icon=document.createElement('span');icon.className='calendar-birthday-icon';icon.textContent='🎂';icon.setAttribute('aria-hidden','true');button.append(icon)}const title=document.createElement('span');title.textContent=event.title;button.append(title);button.setAttribute('aria-label',(event.kind==='birthday'?'Anniversaire : ':'Événement : ')+event.title)})};
if(page==='À table !')renderCalendarEvents();
