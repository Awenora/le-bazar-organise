// Lossless local cache encoding. Business records, revisions and drafts are unchanged.
const prefix='bazar-lzw-v1:';
export function encodeCache(text){
  if(!text.isWellFormed())return text;
  const bytes=new TextEncoder().encode(text), codes=[];
  let dictionary=new Map(), next=257, word='';
  const code=w=>w.length===1?w.charCodeAt(0):dictionary.get(w);
  for(const byte of bytes){
    const char=String.fromCharCode(byte), combined=word+char;
    if(word===''||dictionary.has(combined)){word=combined;continue;}
    codes.push(code(word));
    if(next<65535)dictionary.set(combined,next++);
    else {codes.push(256);dictionary=new Map();next=257;}
    word=char;
  }
  if(word)codes.push(code(word));
  let binary='';for(const value of codes)binary+=value>=55296&&value<=57343?String.fromCharCode(65535,value-55296):String.fromCharCode(value);
  const packed=prefix+binary;
  // Verify before any storage write; retain plain JSON if encoding offers no saving.
  if(decodeCache(packed)!==text)throw Error('Vérification du cache local impossible.');
  return packed.length<text.length?packed:text;
}
export function decodeCache(text){
  if(!text?.startsWith(prefix))return text;
  const binary=text.slice(prefix.length);
  let dictionary=[],next=257,previous='',output=[];
  for(let i=0;i<binary.length;i++){
    let value=binary.charCodeAt(i);
    if(value===65535){if(++i>=binary.length||binary.charCodeAt(i)>2047)throw Error('Cache local incomplet.');value=55296+binary.charCodeAt(i);}
    if(value===256){dictionary=[];next=257;previous='';continue;}
    const word=value<256?String.fromCharCode(value):dictionary[value]??(value===next&&previous?previous+previous[0]:null);
    if(word===null)throw Error('Cache local invalide.');
    output.push(word);
    if(previous&&next<65535)dictionary[next++]=previous+word[0];
    previous=word;
  }
  const raw=output.join(''),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
