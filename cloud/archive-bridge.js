/* Cloud equivalent of the protected archive transport. No local Node writes. */
function archivePayload(){return {recipes:data.recipes,removedRecipeIds:data.removedRecipeIds||[]};}
async function syncRecipeArchive(){await window.BazarCloud.sync();}
const settingsBeforeCloudArchive=$('#settings').onclick;
$('#settings').onclick=()=>{
  settingsBeforeCloudArchive();
  const box=document.createElement('section');box.className='recipe-archive-settings';
  const title=document.createElement('h3');title.textContent='Conservation des recettes';
  const status=document.createElement('p');status.id='recipeArchiveStatus';
  status.textContent='Copie locale conservée. Validation familiale protégée par les versions.';
  const retry=document.createElement('button');retry.textContent='Enregistrer / réessayer maintenant';retry.onclick=()=>{window.BazarCloud.conflictMuted=false;window.BazarCloud.externalMuted=false;$('#dialog').close();window.BazarCloud.sync();};
  const logout=document.createElement('button');logout.textContent='Déconnecter cet appareil';
  logout.onclick=async()=>{await window.BazarCloud.client.auth.signOut({scope:'local'});location.reload();};
  box.append(title,status,retry,logout);$('#dialog').append(box);
};
