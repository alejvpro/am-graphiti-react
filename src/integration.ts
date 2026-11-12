import {NetworkRouting,LEGACY_HOME_IP,type RouteChoice} from './routing';
import {requestFor,type Change} from './api';
import {LegacyClient,keyOf,type Identity,type Selection,type Song} from './api';
import {createLastFmSource,type PlaybackResult,type PlaybackSource} from './playback';
import {fetchJson,ReadError} from './http';
import {MAC_READ_TIMEOUT_MS,SLOW_LOOKUP_MS} from './read-policy';
import type {Transport} from './api';
export type ApiRoute='internal'|'external'|'local';
export type ReadOnlyConfig={username:string;apiKey:string;route:ApiRoute;origins:Partial<Record<ApiRoute,string>>;macReadTimeoutMs?:number;writeEnabled?:boolean;routing?:RouteChoice;homePublicIp?:string};
export type IntegrationOptions={config:ReadOnlyConfig;fetcher?:typeof fetch};
export function apiOrigin(config:ReadOnlyConfig,route=config.route):string{
 const raw=config.origins[route];if(!raw)throw Error(`Configure the ${route} Mac API origin`);
 const url=new URL(raw);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Mac API configuration must be an HTTP(S) origin without credentials or paths');
 return url.origin;
}
// Route allowlist is enforced before URL creation/fetch, independent of UI state.
export function createReadOnlyTransport(origin:string|(()=>string),fetcher:typeof fetch=fetch):Transport{
 return async (request,context)=>{
  if(request.route!=='/song_info')throw Error('Read-only integration blocks all mutations');
  if(Object.keys(request.query).some(k=>!['name','artist','album','refresh'].includes(k))||!['name','artist','album'].every(k=>typeof request.query[k]==='string')||!request.query.name||request.query.refresh!==undefined&&!['true','false'].includes(request.query.refresh))throw Error('Invalid read request');
  const base=typeof origin==='function'?origin():origin;
  const checked=apiOrigin({username:'',apiKey:'',route:'internal',origins:{internal:base}});
  const url=new URL('/song_info',checked);url.search=new URLSearchParams(request.query).toString();
  return fetchJson(url,fetcher,'Mac API',context?.signal?null:MAC_READ_TIMEOUT_MS,context?.signal);
 };
}
// Only explicit write-enabled mode receives this transport. Validate the complete
// primitive before fetch; never accept an arbitrary route/query as a write.
export function createWriteTransport(origin:string|(()=>string),fetcher:typeof fetch=fetch):Transport{
 const make=(base:string):Transport=>async(request,context)=>{
  if(request.route==='/song_info')return createReadOnlyTransport(base,fetcher)(request,context);
  const q=request.query;let change:Change;
  if(request.route==='/tag'){if(!['add','remove'].includes(q.type))throw Error('Invalid tag action');change={field:'tag',token:q.tag,value:q.type==='add'};}
  else if(request.route==='/loved'){if(!['true','false'].includes(q.loved))throw Error('Invalid loved');change={field:'loved',value:q.loved==='true'};}
  else if(['/rate','/energy','/mood'].includes(request.route)){
   const field=request.route==='/rate'?'rating':request.route.slice(1) as 'energy'|'mood';if(!/^[0-9]+$/.test(q[field]))throw Error('Invalid numeric mutation');change={field,value:Number(q[field])};
  }else throw Error('Unsupported mutation route');
  const checked=requestFor({name:q.name,artist:q.artist,album:q.album},change);
  if(Object.keys(q).some(k=>!(k in checked.query)))throw Error('Unsupported mutation parameter');
  const url=new URL(checked.route,apiOrigin({username:'',apiKey:'',route:'internal',origins:{internal:base}}));url.search=new URLSearchParams(checked.query).toString();
  // LegacyClient owns mutation uncertainty/deadline; URL is fixed before fetch.
  return fetchJson(url,fetcher,'Mac API',null,context?.signal);
 };
 const transport:Transport=(request,context)=>make(typeof origin==='function'?origin():origin)(request,context);
 transport.capture=()=>make(typeof origin==='function'?origin():origin);
 return transport;
}
export function readIntegrationConfig(env:Record<string,unknown>):{mode:'sample'}|{mode:'read-only'|'write-enabled';config:ReadOnlyConfig}|{mode:'invalid';message:string}{
 const mode=env.VITE_PLAYBACK_MODE??'sample';if(mode==='sample')return {mode};
 if(mode!=='read-only'&&mode!=='write-enabled')return {mode:'invalid',message:'VITE_PLAYBACK_MODE must be sample, read-only or write-enabled'};
 const str=(k:string)=>typeof env[k]==='string'?env[k] as string:'';
 const route=str('VITE_MAC_ROUTE')||'internal';if(!['internal','external','local'].includes(route))return {mode:'invalid',message:'Invalid Mac API route'};
 const timeout=str('VITE_MAC_READ_TIMEOUT_MS')||String(MAC_READ_TIMEOUT_MS);
 if(!/^\d+$/.test(timeout)||!Number.isSafeInteger(Number(timeout))||Number(timeout)<1||Number(timeout)>2_147_483_647)return {mode:'invalid',message:'VITE_MAC_READ_TIMEOUT_MS must be a positive timer duration in milliseconds'};
 const routing=str('VITE_MAC_ROUTING')||'automatic';if(!['automatic','internal','external','local'].includes(routing))return {mode:'invalid',message:'Invalid routing choice'};
 const config:ReadOnlyConfig={writeEnabled:mode==='write-enabled',routing:routing as RouteChoice,homePublicIp:str('VITE_MAC_HOME_PUBLIC_IP')||LEGACY_HOME_IP,username:str('VITE_LASTFM_USERNAME'),apiKey:str('VITE_LASTFM_API_KEY'),route:route as ApiRoute,macReadTimeoutMs:Number(timeout),origins:{internal:str('VITE_MAC_INTERNAL_ORIGIN'),external:str('VITE_MAC_EXTERNAL_ORIGIN'),local:str('VITE_MAC_LOCAL_ORIGIN')}};
 try{if(!config.username.trim()||!config.apiKey.trim())throw Error('Configure Last.fm username and public API key');apiOrigin(config);if(config.routing==='automatic')apiOrigin(config,'external');for(const r of ['internal','external','local'] as ApiRoute[])if(config.origins[r])apiOrigin(config,r);}catch(e){return {mode:'invalid',message:e instanceof Error?e.message:'Invalid integration configuration'};}
 return {mode,config};
}
export type SessionState={phase:'idle'|'playback-pending'|'library-pending'|'loaded'|'none'|'recent'|'invalid'|'unavailable'|'lookup-failed'|'no-match'|'timed-out'|'canceled'|'network-failed'|'malformed';message:string;detected?:PlaybackResult;targetKey?:string;pinned:boolean;pending:boolean;slow:boolean};
export class PlaybackSession{
 private state:SessionState={phase:'idle',message:'Read only · Press Refresh',pinned:false,pending:false,slow:false};
 private listeners=new Set<()=>void>();private generation=0;
 private active?:{controller:AbortController;slowTimer:ReturnType<typeof setTimeout>};
 constructor(private source:PlaybackSource,private client:LegacyClient,private resolved:(song:Song,selection?:Selection)=>void,private prepare?:()=>Promise<unknown>){}
 snapshot=()=>this.state;
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private set(patch:Partial<SessionState>){this.state={...this.state,...patch};this.listeners.forEach(f=>f());}
 private cleanup(abort=false){const active=this.active;this.active=undefined;if(active){clearTimeout(active.slowTimer);if(abort)active.controller.abort();}}
 private begin(){++this.generation;this.cleanup(true);return this.generation;}
 private async lookup(identity:Identity,gen:number,preserveKey?:string){
  if(this.prepare)await this.prepare();if(gen!==this.generation)return;
  const captured={...identity};const controller=new AbortController();
  const active={controller,slowTimer:setTimeout(()=>{if(this.active===active&&gen===this.generation)this.set({slow:true});},SLOW_LOOKUP_MS)};
  this.active=active;this.set({phase:'library-pending',message:preserveKey?'Read only · Refreshing pinned metadata':'Read only · Library lookup pending',targetKey:preserveKey,pending:true,slow:false});
  try{
   const result=await this.client.read(captured,undefined,{signal:controller.signal});if(gen!==this.generation||this.active!==active)return;
   this.resolved(result.song,result.selection);this.set({targetKey:keyOf(result.song),phase:'loaded',pending:false,slow:false,message:result.selection?.ambiguous?'Read only · Ambiguous library match':preserveKey?'Read only · Pinned metadata loaded':'Read only · Library loaded'});
  }catch(e){
   if(gen!==this.generation||this.active!==active)return;
   const kind=e instanceof ReadError?e.kind:'failed';
   const phase=kind==='timeout'?'timed-out':kind==='canceled'?'canceled':kind==='network'?'network-failed':kind==='malformed'?'malformed':kind==='no-match'?'no-match':'lookup-failed';
   const message=kind==='timeout'?'Mac request timed out · Refresh to try again':kind==='canceled'?'Lookup canceled · Browser stopped waiting; Music.app may still be processing.':kind==='no-match'?'No matching library song':`${kind==='network'?'Mac network failure':kind==='malformed'?'Malformed Mac response':'Mac library lookup failed'} · ${e instanceof Error?e.message:'Unavailable'}`;
   this.set({phase,message,pending:false,slow:false});
  }finally{if(this.active===active)this.cleanup();}
 }
 cancel(){if(!this.active)return;this.begin();this.set({phase:'canceled',pending:false,slow:false,message:'Lookup canceled · Browser stopped waiting; Music.app may still be processing.'});}
 dispose(){this.begin();}
 async refresh(){
  const gen=this.begin();this.set({phase:'playback-pending',message:'Read only · Checking Last.fm',pending:false,slow:false});
  let detected:PlaybackResult;try{detected=await this.source();}catch{detected={kind:'unavailable',message:'Last.fm unavailable'};}
  if(gen!==this.generation)return;this.set({detected});
  if(this.state.pinned){this.set({phase:'loaded',message:`Read only · Pinned · ${detected.kind==='now-playing'?'Playback updated':detected.kind==='recent'?'Recent scrobble only':detected.message}`});return;}
  if(detected.kind==='now-playing'){await this.lookup(detected.identity,gen);return;}
  this.set({targetKey:undefined,phase:detected.kind,message:detected.kind==='recent'?'Recent scrobble · No confirmed current playback':detected.message});
 }
 async refreshLibrary(){
  const gen=this.begin();
  if(this.state.pinned&&this.state.targetKey){const key=this.state.targetKey;const [name,artist,album]=JSON.parse(key) as string[];await this.lookup({name,artist,album},gen,key);return;}
  if(this.state.detected?.kind==='now-playing')await this.lookup(this.state.detected.identity,gen);
  else this.set({pending:false,slow:false});
 }
 pin(){if(!this.state.targetKey)return;this.begin();this.set({pinned:true,pending:false,slow:false,message:'Read only · Target pinned'});}
 async resume(){const gen=this.begin();this.set({pinned:false,targetKey:undefined,pending:false,slow:false});if(this.state.detected?.kind==='now-playing')await this.lookup(this.state.detected.identity,gen);else this.set({phase:'none',message:'No confirmed current playback · Press Refresh'});}
 changeRoute(){this.begin();this.set({phase:this.state.targetKey?'loaded':'idle',pending:false,slow:false,message:'Read only · Route changed · Refresh metadata'});}
}
export function createIntegration(options:IntegrationOptions,resolved:(song:Song,selection?:Selection)=>void){
 const routing=new NetworkRouting(options.config.routing??options.config.route,options.config.homePublicIp??LEGACY_HOME_IP,options.fetcher??fetch,r=>!!options.config.origins[r]);
 const origin=()=>apiOrigin(options.config,routing.snapshot().active);
 const client=new LegacyClient(options.config.writeEnabled?createWriteTransport(origin,options.fetcher):createReadOnlyTransport(origin,options.fetcher),options.config.writeEnabled?60_000:undefined,options.config.macReadTimeoutMs??MAC_READ_TIMEOUT_MS);
 const source=createLastFmSource(options.config,options.fetcher);
 const session=new PlaybackSession(async()=>{await routing.resolve();return source();},client,resolved,()=>routing.resolve());
 const select=(value:RouteChoice)=>{if(value!=='automatic')apiOrigin(options.config,value);routing.select(value);session.changeRoute();};
 const listen=()=>{const resume=()=>{if(document.visibilityState==='visible'){routing.invalidate();session.changeRoute();}};const online=()=>{routing.invalidate();session.changeRoute();};document.addEventListener('visibilitychange',resume);window.addEventListener('online',online);const connection=(navigator as Navigator&{connection?:EventTarget}).connection;connection?.addEventListener('change',online);return()=>{document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',online);connection?.removeEventListener('change',online);};};
 return {client,session,routing,listen,getRoute:()=>routing.snapshot().choice,setRoute:select};
}
