export function createBackend(client,household,{writes=false}={}){
  let cachedRows=null,cachedRevision=0;
  const table=name=>client.schema('bazar').from(name);
  async function query(value){const {data,error}=await value;if(error)throw Error(error.message||'Accès familial indisponible.');return data;}
  async function head(){const r=await query(table('family_records').select('revision').eq('household_id',household).order('revision',{ascending:false}).limit(1));return Number(r[0]?.revision||0);}
  async function all(name,columns,order){let out=[];for(let start=0;;){const page=await query(table(name).select(columns).eq('household_id',household).order(order).range(start,start+199));if(!page.length)return out;out.push(...page);start+=page.length;}}
  return {
    async read(){
      const current=await head();if(cachedRows&&current===cachedRevision)return structuredClone(cachedRows);
      if(cachedRows&&current>cachedRevision){
        const log=[];
        for(let start=0;;){
          const page=await query(table('change_log').select('path,revision,after_payload,after_deleted')
            .eq('household_id',household).gt('revision',cachedRevision).lte('revision',current)
            .order('revision').range(start,start+199));
          if(!page.length)break;log.push(...page);start+=page.length;
        }
        if(log.length&&Number(log.at(-1).revision)===current){
          const next=new Map(cachedRows.map(r=>[JSON.stringify(r.path),r]));
          for(const r of log)next.set(JSON.stringify(r.path),{path:r.path,payload:r.after_payload,revision:r.revision,deleted:r.after_deleted});
          cachedRows=[...next.values()];cachedRevision=current;return structuredClone(cachedRows);
        }
      }
      // A first load or unavailable journal needs a stable complete snapshot.
      for(let n=0;n<4;n++){
        const before=await head(),rows=await all('family_records','path,payload,revision,deleted','path'),after=await head();
        if(before===after){cachedRows=rows;cachedRevision=after;return structuredClone(rows);}
      }
      throw Error('Des modifications arrivent : lecture différée, cache local conservé.');
    },
    async commit(attempt){
      if(!writes)throw Error('Copie de préparation : écritures dans le foyer réel désactivées.');
      return query(client.schema('bazar').rpc('commit_changes',{p_household:household,p_request:attempt.id,p_base_revision:attempt.cursor,p_changes:attempt.changes}));
    },
    media:()=>all('media_files','object_path,sha256,mime_type,byte_size,source_references,deleted_at','object_path'),
    async download(object){const {data,error}=await client.storage.from('bazar-family-media').download(object);if(error)throw Error('Image privée indisponible.');return data;},
    async newImage(blob,references){
      if(!writes)throw Error('Envoi des nouvelles images désactivé dans la copie de préparation.');
      const bytes=await blob.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
      const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif'}[blob.type];
      if(!ext)throw Error('Format de photo non autorisé.');const path=household+'/'+hash+'.'+ext;
      const upload=await client.storage.from('bazar-family-media').upload(path,blob,{contentType:blob.type,upsert:false});
      if(upload.error&&!['409','400'].includes(String(upload.error.statusCode)))throw Error('Photo non envoyée ; copie locale conservée.');
      const downloaded=await this.download(path),check=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await downloaded.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
      if(check!==hash)throw Error('Photo distante différente ; aucun remplacement.');
      await query(client.schema('bazar').rpc('register_media',{p_household:household,p_object_path:path,p_original_name:hash+'.'+ext,p_mime_type:blob.type,p_byte_size:blob.size,p_sha256:hash,p_source_references:references}));
      return path;
    },
  };
}
