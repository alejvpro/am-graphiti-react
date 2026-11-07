import { allowedTags } from './tags';
export const CONTRACT_COMMIT = '2c33cb3e7dc4954d12ae975b6d2088ac9ee7904a';
export const REQUEST_TIMEOUT_MS = 8000;
export type Identity = { name: string; artist: string; album: string };
export type Song = Identity & { albumArtist: string; genre: string; grouping: string; comment: string; rating: number; loved: boolean; interpreted: { tags: string[] }; [key: string]: unknown };
export type Selection = { ambiguous: boolean; matchCount: number; warning?: string; [key: string]: unknown };
export type Change = { field: 'rating'|'loved'|'energy'|'mood'; value: number|boolean } | { field: 'tag'; token: string; value: boolean };
export type Request = { route: '/song_info'|'/rate'|'/loved'|'/energy'|'/mood'|'/tag'; query: Record<string,string> };
export type Transport = (request: Request) => Promise<unknown>;
export type WriteResult = { outcome: 'verified'|'failed'|'uncertain'; message: string; song?: Song };
export const keyOf = (i: Identity) => JSON.stringify([i.name,i.artist,i.album]);
export const tokensOf = (s: Song) => new Set(s.comment.split(/\s+/u).filter(Boolean));
export function normalizeSong(raw: unknown): Song {
 if (!raw || typeof raw !== 'object') throw Error('Song metadata unavailable');
 const s = raw as Song;
 for (const f of ['name','artist','album','albumArtist','genre','grouping','comment'] as const) if(typeof s[f] !== 'string') throw Error(`Unavailable ${f}`);
 if(!Number.isInteger(s.rating)||s.rating<0||s.rating>100||typeof s.loved!=='boolean'||!s.interpreted||!Array.isArray(s.interpreted.tags)||!s.interpreted.tags.every(t=>typeof t==='string')) throw Error('Invalid song response');
 return structuredClone(s);
}
export function requestFor(target: Identity, change?: Change, refresh = false): Request {
 if(!target.name) throw Error('A song title is required');
 const query: Record<string,string> = {name:target.name,artist:target.artist,album:target.album};
 if(refresh) query.refresh='true';
 if(!change) return {route:'/song_info',query};
 if(change.field==='tag') {
  if(!allowedTags.has(change.token)) throw Error('Unsupported song token');
  return {route:'/tag',query:{...query,tag:change.token,type:change.value?'add':'remove'}};
 }
 if(change.field==='loved') {if(typeof change.value!=='boolean') throw Error('Invalid Favorite');}
 else {const max = {rating:100,energy:6,mood:3}[change.field]; if(typeof change.value!=='number'||!Number.isInteger(change.value)||change.value<0||change.value>max) throw Error('Invalid field value');}
 const route = change.field==='rating'?'/rate':`/${change.field}` as Request['route'];
 return {route,query:{...query,[change.field]:String(change.value)}};
}
export function normalizeWrite(raw: unknown, target: Identity): WriteResult {
 const b = raw as Record<string,unknown> | null;
 if(b?.status===200 && b.outcome==='verified') {
  try {const song=normalizeSong(b.match); if(keyOf(song)!==keyOf(target)) throw Error('Response target differs'); return {outcome:'verified',song,message:String(b.message)};} catch {return {outcome:'uncertain',message:'Readback target or metadata could not be verified'};}
 }
 return {outcome:b?.status===400&&b.outcome==='failed'?'failed':'uncertain', message:typeof b?.message==='string'?b.message:'Completion unknown; inspect target before another edit'};
}
async function bounded(transport: Transport, request: Request, timeout: number): Promise<unknown> {
 let timer: ReturnType<typeof setTimeout>;
 try {return await Promise.race([transport(request),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Timed out; server completion unknown')),timeout);})]);}
 finally {clearTimeout(timer!);}
}
export class LegacyClient {
 private tail = Promise.resolve();
 constructor(private transport: Transport, private timeout=REQUEST_TIMEOUT_MS) {}
 async read(target: Identity, refresh=false): Promise<{song:Song;selection?:Selection}> {
  const raw = await bounded(this.transport,requestFor({...target},undefined,refresh),this.timeout) as Record<string,unknown>;
  if(raw.status!==200) throw Error(String(raw.message??'Lookup failed'));
  const song=normalizeSong(raw.match); if(keyOf(song)!==keyOf(target)) throw Error('Lookup target differs');
  return {song,selection:raw.selection as Selection|undefined};
 }
 write(target: Identity, change: Change): Promise<WriteResult> {
  const captured={name:target.name,artist:target.artist,album:target.album};
  const request=requestFor(captured,change);
  const result=this.tail.then(async()=>{try{return normalizeWrite(await bounded(this.transport,request,this.timeout),captured);}catch(e){return {outcome:'uncertain',message:e instanceof Error?e.message:'Completion unknown'} as WriteResult;}});
  this.tail=result.then(()=>{}); return result;
 }
}
// Unused by App. Future activation requires a separately authorized transport milestone.
// No endpoint or credential is embedded; disabled is the only R1 configuration.
export function createRealTransport(baseUrl: string, enabled = false, fetcher: typeof fetch = fetch): Transport {
 return async request => {
  if (!enabled) throw Error('Live transport disabled in R1. No HTTP request was sent.');
  const url = new URL(encodeLegacyRequest(request), baseUrl);
  const response = await fetcher(url, {method:'GET', cache:'no-store', redirect:'error'});
  if (!response.ok) throw Error(`HTTP ${response.status}; mutation completion may be unknown`);
  return response.json();
 };
}
export function inactiveRealTransport(_request: Request): Promise<never> {
 return Promise.reject(Error('Live transport disabled in R1. No HTTP request was sent.'));
}
export function encodeLegacyRequest(request: Request): string {return `${request.route}?${new URLSearchParams(request.query)}`;}
