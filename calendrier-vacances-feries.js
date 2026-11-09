/* À TABLE ! — repères vacances scolaires zone A et jours fériés.
   Module autonome : ne modifie ni les données, ni les repas, ni le stock.
   Charger APRÈS app.js et calendar-today-tab.js. */
(function () {
  'use strict';
  const HOLIDAY_RANGES = [
    ['2025-10-18','2025-11-03'], ['2025-12-20','2026-01-05'],
    ['2026-02-07','2026-02-23'], ['2026-04-04','2026-04-20'], ['2026-07-04','2026-09-01'],
    ['2026-10-17','2026-11-02'], ['2026-12-19','2027-01-04'],
    ['2027-02-13','2027-03-01'], ['2027-04-10','2027-04-26'], ['2027-07-03','2027-09-01']
  ];
  // Intervalles [début inclus, reprise des cours exclue].
  function key(d) { return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'); }
  function easter(year) {
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,
      f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
      i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451),
      n=h+l-7*m+114;
    return new Date(year,Math.floor(n/31)-1,(n%31)+1);
  }
  function shifted(d, days) { return new Date(d.getFullYear(),d.getMonth(),d.getDate()+days); }
  function publicHoliday(date) {
    const y=date.getFullYear(), k=key(date), eas=easter(y);
    const fixed={
      [`${y}-01-01`]:'Jour de l’an', [`${y}-05-01`]:'Fête du Travail',
      [`${y}-05-08`]:'Victoire de 1945', [`${y}-07-14`]:'Fête nationale',
      [`${y}-08-15`]:'Assomption', [`${y}-11-01`]:'Toussaint',
      [`${y}-11-11`]:'Armistice', [`${y}-12-25`]:'Noël'
    };
    if (fixed[k]) return fixed[k];
    for (const [offset,label] of [[1,'Lundi de Pâques'],[39,'Ascension'],[50,'Lundi de Pentecôte']]) {
      if (key(shifted(eas,offset))===k) return label;
    }
    return null;
  }
  function schoolHoliday(k) { return HOLIDAY_RANGES.some(([start,end])=>k>=start&&k<end); }
  const style=document.createElement('style');
  style.id='bazar-vacances-feries-style';
  style.textContent=`
    #calendar .day.bazar-special-day { position:relative; isolation:isolate; }
    #calendar .day.bazar-special-day::after {
      content:''; position:absolute; inset:1px; border:4px solid #D9C1A8;
      border-radius:8px; pointer-events:none; z-index:5;
      box-shadow:inset 0 0 0 1px rgba(255,249,239,.8),0 0 0 1px rgba(91,59,34,.55);
    }
    #calendar .day.bazar-public-holiday .dayhead { padding-top:13px; }
    #calendar .day .bazar-holiday-label {
      position:absolute; top:1px; left:50%; transform:translateX(-50%);
      z-index:6; pointer-events:none; white-space:nowrap;
      background:#D9C1A8; color:#382719; border-radius:0 0 4px 4px;
      padding:1px 6px; font:700 9px/12px 'Segoe UI',Arial,sans-serif;
      letter-spacing:.2px;
    }
    #calendar .day.current.bazar-public-holiday .bazar-holiday-label { left:auto; right:5px; transform:none; }
  `;
  document.head.append(style);
  function markCalendar() {
    const cal=document.querySelector('.planning-view #calendar');
    if (!cal) return;
    for (const cell of cal.querySelectorAll('.day[data-drop]')) {
      const k=cell.getAttribute('data-drop');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(k))continue;
      const [y,m,d]=k.split('-').map(Number),date=new Date(y,m-1,d),holiday=publicHoliday(date),vacation=schoolHoliday(k);
      cell.classList.toggle('bazar-special-day',Boolean(holiday||vacation));
      cell.classList.toggle('bazar-public-holiday',Boolean(holiday));
      cell.classList.toggle('bazar-school-holiday',vacation);
      const old=cell.querySelector('.bazar-holiday-label');if(old)old.remove();
      if(holiday){const label=document.createElement('span');label.className='bazar-holiday-label';label.textContent='FÉRIÉ';label.title=holiday;cell.append(label);}
      if(holiday||vacation)cell.setAttribute('data-bazar-calendar-info',[holiday,vacation?'Vacances scolaires zone A':''].filter(Boolean).join(' · '));
      else cell.removeAttribute('data-bazar-calendar-info');
    }
  }
  // Observer le remplacement du contenu du calendrier, sans remplacer ses fonctions existantes.
  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;markCalendar();});}
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.target.id==='calendar'||r.target.closest?.('#calendar') &&
      [...r.addedNodes].some(n=>n.nodeType===1 && !n.classList?.contains('bazar-holiday-label'))))schedule();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  schedule();
})();
