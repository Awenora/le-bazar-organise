// Approved Firefox appearance, applied once to this device's visual preferences.
// No shared record, recipe, purchase or Supabase request is changed here.
const revision='courses-october-firefox-20261030-v1';
export function applyPublicationVisuals(engine){
  if(engine.state.publicationVisualMigrations?.includes(revision))return false;
  const next=structuredClone(engine.state);
  const prefs=(next.local??={}).visualPreferences??={version:1};
  const months=prefs.seasonalDecorations??={};
  const october=months[10]??={};
  october.desktop={...october.desktop,width:90,height:102,x:-58};
  const components=prefs.interfaceComponents??={version:1,elements:{}};
  components.elements??={};
  const additions=components.elements['course:additions']??={};
  additions.desktop={...additions.desktop,hidden:true};
  const groups=prefs.sharedCommandGroups??={};
  function desktop(id){
    const group=groups[id]??={version:1,modes:{}};
    group.modes??={};return group.modes.desktop??={items:{}};
  }
  const tools=desktop('courses-tools');tools.items??={};
  tools.items.listExcluded={...tools.items.listExcluded,x:1249,y:1,width:163,height:42,hidden:true,removed:false};
  const organizers=desktop('courses-organizers');organizers.layout='free';organizers.items??={};
  const localItems={
    courseArrange:{x:1542,y:-57,width:183,height:37,hidden:true,removed:false},
    'course:store:Carrefour':{x:232,y:-12,width:146,height:42},
    'course:store:Intermarch%C3%A9':{x:84,y:-12,width:145,height:40,hidden:true,removed:false},
    'course:store:Lidl':{x:0,y:-12,width:81,height:39,hidden:true,removed:false}
  };
  for(const [id,value]of Object.entries(localItems))organizers.items[id]={...organizers.items[id],...value};
  next.publicationVisualMigrations=[...(next.publicationVisualMigrations||[]),revision];
  engine.persist(next);
  return true;
}
