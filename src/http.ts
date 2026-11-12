import {LASTFM_READ_TIMEOUT_MS} from './read-policy';
export type ReadErrorKind='timeout'|'canceled'|'network'|'malformed'|'failed'|'no-match';
export class ReadError extends Error{
 constructor(public readonly kind:ReadErrorKind,message:string){super(message);this.name='ReadError';}
}
// One owner for each deadline. The signal also reaches fetch; racing it bounds even an
// executor which ignores AbortSignal. Abort never proves server-side cancellation.
export async function waitForRead<T>(task:(signal:AbortSignal)=>Promise<T>,timeout:number,signal?:AbortSignal,service='Mac API'):Promise<T>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let onCancel:(()=>void)|undefined;
 try{
  if(signal?.aborted)throw new ReadError('canceled',`${service} lookup canceled`);
  const interrupted=new Promise<never>((_,reject)=>{
   onCancel=()=>{reject(new ReadError('canceled',`${service} lookup canceled`));controller.abort();};
   signal?.addEventListener('abort',onCancel,{once:true});
   timer=setTimeout(()=>{reject(new ReadError('timeout',`${service} read timed out`));controller.abort();},timeout);
  });
  return await Promise.race([Promise.resolve().then(()=>{if(controller.signal.aborted)throw new ReadError('canceled',`${service} lookup canceled`);return task(controller.signal);}),interrupted]);
 }finally{clearTimeout(timer);if(onCancel)signal?.removeEventListener('abort',onCancel);}
}
export async function fetchJson(url:URL,fetcher:typeof fetch,service:string,timeout:number|null=LASTFM_READ_TIMEOUT_MS,signal?:AbortSignal):Promise<unknown>{
 const request=async(activeSignal?:AbortSignal)=>{
  let r:Response;
  try{r=await fetcher(url,{method:'GET',cache:'no-store',redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',signal:activeSignal});}
  catch{throw new ReadError('network',`${service} unavailable`);}
  if(!r.ok)throw new ReadError('failed',`${service} HTTP request failed`);
  try{return await r.json();}catch{throw new ReadError('malformed',`${service} returned invalid JSON`);}
 };
 // null means the caller owns the deadline and cancellation race (LegacyClient.read).
 return timeout===null?request(signal):waitForRead(request,timeout,signal,service);
}
