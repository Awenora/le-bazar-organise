// Month settings are shared by every year. Keep later device adjustments editable.
const revision='all-months-approved-framing-20261030-v1';
export function applyAllMonthVisuals(engine){
  if(engine.state.publicationVisualMigrations?.includes(revision))return false;
  const next=structuredClone(engine.state);
  const prefs=(next.local??={}).visualPreferences??={version:1};
  const months=prefs.seasonalDecorations??={};
  for(let month=1;month<=12;month++){
    const settings=months[month]??={};
    settings.desktop={...settings.desktop,width:90,height:102,x:-58};
  }
  next.publicationVisualMigrations=[...(next.publicationVisualMigrations||[]),revision];
  engine.persist(next);
  return true;
}
