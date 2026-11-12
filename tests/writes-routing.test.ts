import {describe,it,expect,vi,afterEach} from 'vitest';
import {LegacyClient,keyOf,requestFor,type Change,type Request} from '../src/api';
import {createWriteTransport,createReadOnlyTransport,readIntegrationConfig,createIntegration} from '../src/integration';
import {NetworkRouting,LEGACY_HOME_IP} from '../src/routing';
import {SongStore,project} from '../src/store';
import {mac,now,songA,songB,origins,config} from './fixtures/integration';
const json=(body:unknown)=>({ok:true,json:async()=>body}) as Response;
const ip=(value:string)=>({ok:true,text:async()=>value}) as Response;
const verified=(song=songA)=>({status:200,outcome:'verified',message:'set',match:song,selection:mac(song).selection});
afterEach(()=>vi.useRealTimers());
describe('live write primitives and safety',()=>{
 it('requires explicit write mode; default and read-only remain safe',async()=>{
  expect(readIntegrationConfig({}).mode).toBe('sample');
  const result=readIntegrationConfig({VITE_PLAYBACK_MODE:'write-enabled',VITE_LASTFM_USERNAME:'fixture',VITE_LASTFM_API_KEY:'fixture',VITE_MAC_INTERNAL_ORIGIN:origins.internal,VITE_MAC_EXTERNAL_ORIGIN:origins.external});expect(result).toMatchObject({mode:'write-enabled',config:{writeEnabled:true,routing:'automatic'}});
  const fetcher=vi.fn();for(const route of ['/rate','/loved','/energy','/mood','/tag'])await expect(createReadOnlyTransport(origins.internal,fetcher)({route,query:{}} as Request)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
 });
 it('encodes every supported primitive and preserves tuple and raw metadata',async()=>{
  const fetcher=vi.fn().mockResolvedValue(json(verified()));const client=new LegacyClient(createWriteTransport(origins.external,fetcher));
  const changes:Change[]=[{field:'rating',value:50},{field:'rating',value:0},{field:'loved',value:false},{field:'energy',value:0},{field:'energy',value:6},{field:'mood',value:0},{field:'mood',value:2},{field:'tag',token:'[lgptphobic]',value:true},{field:'tag',token:'scratch',value:false}];
  for(const change of changes){expect((await client.write(songA,change)).outcome).toBe('verified');const [url,init]=fetcher.mock.calls.at(-1)!;expect(String(url)).toBe(origins.external+requestFor(songA,change).route+'?'+new URLSearchParams(requestFor(songA,change).query));expect(init).toMatchObject({method:'GET',credentials:'omit'});expect(init.headers).toBeUndefined();expect(init.body).toBeUndefined();}
  for(const request of [{route:'/album',query:{}},{route:'/tag',query:{...requestFor(songA).query,tag:'full',type:'add'}},{route:'/rate',query:{...requestFor(songA).query,rating:'-1'}}])await expect(createWriteTransport(origins.internal,fetcher)(request as Request)).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(changes.length);
 });
 it('deduplicates rapid live taps, shows confirmed state until verified, and preserves captured target/origin',async()=>{
  let release!:(v:Response)=>void;let origin=origins.internal;const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(r=>release=r)).mockResolvedValue(json(verified({...songB,rating:40})));
  const client=new LegacyClient(createWriteTransport(()=>origin,fetcher));const store=new SongStore(client,false,true);store.load(songA,mac().selection);store.load(songB,mac(songB).selection);
  const a=store.edit(songA,{field:'rating',value:40});const repeat=store.edit(songA,{field:'rating',value:40});const b=store.edit(songB,{field:'rating',value:40});origin=origins.external;
  await vi.waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));expect(project(store.entries[keyOf(songA)]).rating).toBe(songA.rating);
  release(json(verified({...songA,rating:40})));await Promise.all([a,repeat,b]);expect(fetcher).toHaveBeenCalledTimes(2);for(const [url] of fetcher.mock.calls)expect((url as URL).origin).toBe(origins.internal);expect(store.entries[keyOf(songB)].song.rating).toBe(40);expect(store.entries[keyOf(songA)].status).toBe('✓ Save verified');
 });
 it.each(['failed','uncertain','network','timeout'] as const)('reports %s without retry; manual read reconciles uncertainty',async outcome=>{
  vi.useFakeTimers();const fetcher=vi.fn().mockImplementation(()=>outcome==='timeout'?new Promise(()=>{}):outcome==='network'?Promise.reject(Error('lost response')):Promise.resolve(json({status:400,outcome,message:'fixture failure'})));
  const client=new LegacyClient(createWriteTransport(origins.external,fetcher),100);const store=new SongStore(client,false,true);store.load(songA,mac().selection);
  const task=store.edit(songA,{field:'loved',value:false});await vi.advanceTimersByTimeAsync(101);await task;expect(store.entries[keyOf(songA)].status).toMatch(outcome==='failed'?/Save failed/:/Outcome uncertain/);expect(fetcher).toHaveBeenCalledTimes(1);
  if(outcome!=='failed'){await store.edit(songA,{field:'rating',value:0});expect(fetcher).toHaveBeenCalledTimes(1);fetcher.mockResolvedValueOnce(json(mac()));const read=await client.read(songA);store.load(read.song,read.selection);expect(store.entries[keyOf(songA)].uncertain).toBe(false);}
 });
 it('rejects a changed duplicate identity after dispatch as uncertain and retains prior metadata',async()=>{
  const response=verified({...songA,rating:10});response.selection.selectedIdentity.persistentID='ZZZZ';const store=new SongStore(new LegacyClient(async()=>response),false,true);store.load(songA,mac().selection);await store.edit(songA,{field:'rating',value:10});expect(store.entries[keyOf(songA)].uncertain).toBe(true);expect(store.entries[keyOf(songA)].song.rating).toBe(songA.rating);
 });
});
describe('automatic routing',()=>{
 it('detects home or remote once, invalidates on resume, and handles changed home IP with External',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(ip(LEGACY_HOME_IP)).mockResolvedValueOnce(ip('203.0.113.99'));const routing=new NetworkRouting('automatic',LEGACY_HOME_IP,fetcher,()=>true);
  expect(await routing.resolve()).toBe('internal');expect(await routing.resolve()).toBe('internal');expect(fetcher).toHaveBeenCalledTimes(1);routing.invalidate();expect(await routing.resolve()).toBe('external');expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('uses explicit External fallback on failure, supports persistent manual override and return to Automatic',async()=>{
  const fetcher=vi.fn().mockRejectedValueOnce(Error()).mockResolvedValue(ip(LEGACY_HOME_IP));const routing=new NetworkRouting('automatic',LEGACY_HOME_IP,fetcher,()=>true);expect(await routing.resolve()).toBe('external');expect(routing.snapshot().message).toMatch(/unavailable/);routing.select('external');routing.invalidate();await routing.resolve();expect(fetcher).toHaveBeenCalledTimes(1);routing.select('automatic');expect(await routing.resolve()).toBe('internal');
 });
 it('first refresh waits for detection and never uses initial Internal on remote',async()=>{
  let release!:(v:Response)=>void;const calls:string[]=[];const fetcher=vi.fn((input:RequestInfo|URL)=>{const u=String(input);calls.push(u);if(u.includes('ip.php'))return new Promise<Response>(r=>release=r);if(u.includes('audioscrobbler'))return Promise.resolve(json(now()));return Promise.resolve(json(mac()));});
  const integration=createIntegration({config:{...config,routing:'automatic'},fetcher},vi.fn());const task=integration.session.refresh();await vi.waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(1));release(ip('203.0.113.1'));await task;expect(calls[2]).toContain(origins.external);expect(calls.filter(u=>u.includes('ip.php'))).toHaveLength(1);
 });
});
it('resume and network events invalidate Automatic without changing a pinned target; manual overrides survive',async()=>{
 let home=false;let probes=0;const fetcher=vi.fn((input:RequestInfo|URL)=>{const u=String(input);if(u.includes('ip.php')){probes++;return Promise.resolve(ip(home?LEGACY_HOME_IP:'203.0.113.1'));}return Promise.resolve(json(u.includes('audioscrobbler')?now():mac()));});
 const integration=createIntegration({config:{...config,routing:'automatic'},fetcher},vi.fn());const stop=integration.listen();
 try{
  await integration.session.refresh();integration.session.pin();window.dispatchEvent(new Event('online'));expect(integration.session.snapshot()).toMatchObject({pinned:true,targetKey:keyOf(songA)});home=true;await integration.session.refreshLibrary();expect(integration.routing.snapshot().active).toBe('internal');expect(probes).toBe(2);
  integration.setRoute('external');window.dispatchEvent(new Event('online'));await integration.session.refreshLibrary();expect(integration.routing.snapshot().active).toBe('external');expect(probes).toBe(2);
  integration.setRoute('automatic');Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));await integration.session.refreshLibrary();expect(probes).toBe(3);expect(integration.session.snapshot()).toMatchObject({pinned:true,targetKey:keyOf(songA)});
 }finally{stop();integration.session.dispose();delete (document as unknown as Record<string,unknown>).visibilityState;}
});
it('an obsolete read cannot overwrite a mutation begun after that read',async()=>{
 let release!:(v:unknown)=>void;const transport=vi.fn().mockImplementationOnce(()=>new Promise(r=>release=r)).mockResolvedValue(verified({...songA,rating:20}));const client=new LegacyClient(transport);
 const read=client.read(songA);await vi.waitFor(()=>expect(transport).toHaveBeenCalledTimes(1));const edited=client.write(songA,{field:'rating',value:20});await edited;release(mac());await expect(read).rejects.toMatchObject({kind:'failed',message:'Metadata changed during lookup; refresh again'});
});
it('a metadata refresh submitted immediately after an edit waits for its authoritative completion',async()=>{
 let release!:(v:unknown)=>void;const transport=vi.fn().mockImplementationOnce(()=>new Promise(r=>release=r)).mockResolvedValue(mac({...songA,rating:20}));const client=new LegacyClient(transport);const store=new SongStore(client,false,true);store.load(songA,mac().selection);
 const edit=store.edit(songA,{field:'rating',value:20});const read=client.read(songA);await vi.waitFor(()=>expect(transport).toHaveBeenCalledTimes(1));expect(transport.mock.calls[0][0].route).toBe('/rate');release(verified({...songA,rating:20}));await edit;expect((await read).song.rating).toBe(20);expect(transport.mock.calls[1][0].route).toBe('/song_info');
});
