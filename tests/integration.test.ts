import {describe,it,expect,vi} from 'vitest';
import {createLastFmSource,normalizePlayback} from '../src/playback';
import {apiOrigin,createReadOnlyTransport,PlaybackSession,readIntegrationConfig} from '../src/integration';
import {LegacyClient,keyOf,requestFor,type Request} from '../src/api';
import {SongStore} from '../src/store';
import {now,recent,mac,noMatch,config,origins,songA,songB} from './fixtures/integration';
const json=(body:unknown)=>({ok:true,json:async()=>body}) as Response;
const deferred=<T,>()=>{let resolve!:(v:T)=>void;const promise=new Promise<T>(r=>resolve=r);return {promise,resolve};};
describe('Last.fm fixture boundary',()=>{
 it('recognizes confirmed playback, recent-only, none and singleton track shapes',()=>{
  expect(normalizePlayback(now())).toEqual({kind:'now-playing',identity:{name:songA.name,artist:songA.artist,album:songA.album}});
  expect(normalizePlayback(recent).kind).toBe('recent');expect(normalizePlayback({recenttracks:{track:[]}}).kind).toBe('none');
  expect(normalizePlayback({recenttracks:{track:now().recenttracks.track[0]}}).kind).toBe('now-playing');
 });
 it.each(['name','artist','album'])('does not fabricate missing identity field %s',field=>{
  const body=now();delete (body.recenttracks.track[0] as Record<string,unknown>)[field];expect(normalizePlayback(body).kind).toBe('invalid');
 });
 it('allows an explicitly empty album string but never promotes a latest scrobble',()=>{
  const body=now({...songA,album:''});expect(normalizePlayback(body).kind).toBe('now-playing');
  body.recenttracks.track[0]['@attr'].nowplaying='false';expect(normalizePlayback(body).kind).toBe('recent');
  expect(normalizePlayback({error:10,message:'bad key'}).kind).toBe('unavailable');expect(normalizePlayback({recenttracks:{}}).kind).toBe('invalid');
 });
 it('uses configured public request values and handles timeout/failure without retries',async()=>{
  const fetcher=vi.fn().mockResolvedValue(json(now()));expect((await createLastFmSource(config,fetcher)()).kind).toBe('now-playing');
  const url=fetcher.mock.calls[0][0] as URL;expect(url.searchParams.get('method')).toBe('user.getRecentTracks');expect(url.searchParams.get('api_key')).toBe(config.apiKey);
  const stalled=vi.fn(()=>new Promise<Response>(()=>{}));expect(await createLastFmSource(config,stalled,5)()).toMatchObject({kind:'unavailable',message:'Last.fm read timed out'});expect(stalled).toHaveBeenCalledTimes(1);
  const failed=vi.fn().mockRejectedValue(Error('connection failed'));expect((await createLastFmSource(config,failed)()).kind).toBe('unavailable');
 });
});
describe('read-only Mac boundary and configuration',()=>{
 it('defaults to sample and invalid explicit integration never falls back to sample',()=>{
  expect(readIntegrationConfig({})).toEqual({mode:'sample'});expect(readIntegrationConfig({VITE_PLAYBACK_MODE:'read-only'}).mode).toBe('invalid');
 });
 it('selects only configured internal/external/local origins without probes',()=>{
  expect(apiOrigin(config)).toBe(origins.internal);expect(apiOrigin(config,'external')).toBe(origins.external);expect(apiOrigin(config,'local')).toBe(origins.local);
  expect(()=>apiOrigin({...config,origins:{}})).toThrow();expect(()=>apiOrigin({...config,origins:{internal:'http://user:secret@example.invalid'}})).toThrow();
 });
 it('blocks every mutation and unknown route before fetch, including forged requests',async()=>{
  const fetcher=vi.fn();const transport=createReadOnlyTransport(origins.internal,fetcher);
  for(const route of ['/rate','/loved','/energy','/mood','/tag','/album','/now_playing','/ip','/alive'])await expect(transport({route,query:{}} as Request)).rejects.toThrow('blocks all mutations');
  expect(fetcher).not.toHaveBeenCalled();const store=new SongStore(new LegacyClient(transport),true);store.load(songA);await store.edit(songA,{field:'rating',value:10});expect(fetcher).not.toHaveBeenCalled();expect(store.entries[keyOf(songA)].pending).toHaveLength(0);
 });
 it('normalizes successful/ambiguous reads with case-insensitive tuple matching and preserves unknown fields',async()=>{
  const fetcher=vi.fn().mockResolvedValue(json(mac({...songA,name:songA.name.toLowerCase(),custom:{retain:true}},true)));
  const client=new LegacyClient(createReadOnlyTransport(origins.internal,fetcher));const result=await client.read(songA,true);
  expect(result.selection?.ambiguous).toBe(true);expect(result.song.custom).toEqual({retain:true});const url=fetcher.mock.calls[0][0] as URL;
  expect(url.pathname).toBe('/song_info');expect(url.searchParams.get('refresh')).toBe('true');expect(url.searchParams.get('album')).toBe(songA.album);
 });
 it('distinguishes no match, invalid/partial responses and a Mac read timeout',async()=>{
  for(const [body,message] of [[noMatch,'no matches'],[{status:200,match:{name:'partial'}},'Invalid Mac API'],[null,'Invalid Mac API']] as const){
   const client=new LegacyClient(async()=>body);await expect(client.read(songA)).rejects.toThrow(message);
  }
  const fetcher=vi.fn(()=>new Promise<Response>(()=>{}));const client=new LegacyClient(createReadOnlyTransport(origins.internal,fetcher),undefined,5);await expect(client.read(songA)).rejects.toThrow('Mac API read timed out');expect(fetcher).toHaveBeenCalledTimes(1);
 });
});
describe('manual playback/metadata orchestration',()=>{
 it('reads the same song twice and independently refreshes library data',async()=>{
  const source=vi.fn().mockResolvedValue(normalizePlayback(now()));const read=vi.fn().mockResolvedValue(mac());const loaded=vi.fn();const session=new PlaybackSession(source,new LegacyClient(read),loaded);
  await session.refresh();await session.refresh();expect(read).toHaveBeenCalledTimes(2);await session.refreshLibrary();expect(source).toHaveBeenCalledTimes(2);expect(read).toHaveBeenCalledTimes(3);expect(loaded).toHaveBeenCalledTimes(3);
 });
 it('pins A while playback changes to B, retains separate target and resumes B explicitly',async()=>{
  const source=vi.fn().mockResolvedValueOnce(normalizePlayback(now())).mockResolvedValueOnce(normalizePlayback(now(songB)));
  const read=vi.fn().mockResolvedValueOnce(mac()).mockResolvedValueOnce(mac(songB));const session=new PlaybackSession(source,new LegacyClient(read),vi.fn());
  await session.refresh();session.pin();await session.refresh();expect(session.snapshot().targetKey).toBe(keyOf(songA));expect(session.snapshot().detected).toMatchObject({identity:{name:songB.name}});expect(read).toHaveBeenCalledTimes(1);
  await session.resume();expect(session.snapshot().targetKey).toBe(keyOf(songB));
 });
 it('ignores delayed A lookup after B becomes active',async()=>{
  const a=deferred<unknown>();const source=vi.fn().mockResolvedValueOnce(normalizePlayback(now())).mockResolvedValueOnce(normalizePlayback(now(songB)));
  const read=vi.fn().mockReturnValueOnce(a.promise).mockResolvedValueOnce(mac(songB));const loaded=vi.fn();const session=new PlaybackSession(source,new LegacyClient(read),loaded);
  const first=session.refresh();await Promise.resolve();await Promise.resolve();await session.refresh();a.resolve(mac());await first;expect(session.snapshot().targetKey).toBe(keyOf(songB));expect(loaded).toHaveBeenCalledTimes(1);
 });
 it('ignores two Last.fm refreshes arriving in reverse order',async()=>{
  const a=deferred<ReturnType<typeof normalizePlayback>>();const source=vi.fn().mockReturnValueOnce(a.promise).mockResolvedValueOnce(normalizePlayback(now(songB)));
  const read=vi.fn().mockResolvedValue(mac(songB));const session=new PlaybackSession(source,new LegacyClient(read),vi.fn());const first=session.refresh();await session.refresh();a.resolve(normalizePlayback(now()));await first;
  expect(session.snapshot().targetKey).toBe(keyOf(songB));expect(read).toHaveBeenCalledTimes(1);
 });
 it('never resolves recent, stopped, incomplete or unavailable playback through the Mac',async()=>{
  const read=vi.fn();for(const response of [normalizePlayback(recent),normalizePlayback({recenttracks:{track:[]}}),normalizePlayback({}),{kind:'unavailable',message:'Last.fm unavailable'}] as const){const s=new PlaybackSession(async()=>response,new LegacyClient(read),vi.fn());await s.refresh();expect(s.snapshot().targetKey).toBeUndefined();}expect(read).not.toHaveBeenCalled();
 });
});
it('validates all configured origins before activation',()=>{
 expect(readIntegrationConfig({VITE_PLAYBACK_MODE:'read-only',VITE_LASTFM_USERNAME:'fixture',VITE_LASTFM_API_KEY:'fixture',VITE_MAC_INTERNAL_ORIGIN:origins.internal,VITE_MAC_EXTERNAL_ORIGIN:'http://user:secret@example.invalid'}).mode).toBe('invalid');
});
it('session distinguishes Mac no-match/failure and exposes library-pending',async()=>{
 for(const [body,phase] of [[noMatch,'no-match'],[{...noMatch,message:'target unavailable'},'lookup-failed']] as const){
  const pending=deferred<unknown>();const session=new PlaybackSession(async()=>normalizePlayback(now()),new LegacyClient(()=>pending.promise),vi.fn());const task=session.refresh();await Promise.resolve();await Promise.resolve();expect(session.snapshot().phase).toBe('library-pending');pending.resolve(body);await task;expect(session.snapshot().phase).toBe(phase);expect(session.snapshot().targetKey).toBeUndefined();
 }
});
