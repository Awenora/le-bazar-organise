async function invoke(client,mode,url){
  const {data,error,response}=await client.functions.invoke('recipe-import',{body:{mode,url}});
  if(error){
    let message='Importation en ligne indisponible. Réessaie dans un instant.';
    if(error.context?.json){try{const body=await error.context.json();if(typeof body.error==='string')message=body.error;}catch{}}
    throw Error(message);
  }
  if(mode==='image'&&data instanceof Blob){
    const mime=response?.headers.get('x-bazar-image-type')||data.type;
    if(/^image\/(?:jpeg|png|webp|gif|avif)$/.test(mime))return new Blob([data],{type:mime});
  }
  return data;
}
export async function importRecipeByLink(client,url){
  const result=await invoke(client,'recipe',url);
  if(!result?.recipe?.name)throw Error('La réponse du site est incomplète.');
  return result;
}
export async function fetchImportedImage(client,url){
  const blob=await invoke(client,'image',url);
  if(!(blob instanceof Blob)||!/^image\/(?:jpeg|png|webp|gif|avif)$/.test(blob.type))throw Error('La photo n’a pas pu être récupérée.');
  return blob;
}
