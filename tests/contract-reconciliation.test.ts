import {describe,it,expect,vi} from 'vitest';
import {LegacyClient,requestFor,tokensOf} from '../src/api';
import {createReadOnlyTransport,PlaybackSession} from '../src/integration';
import {normalizePlayback} from '../src/playback';
import {SongStore} from '../src/store';
import {mac,noMatch,now,songA,origins} from './fixtures/integration';
const json=(body:unknown)=>({ok:true,json:async()=>body}) as Response;
describe('source-verified legacy-v0 reads',()=>{
 it('preserves all UTF-8 tuple strings and empty keys in a simple credential-free GET',async()=>{
  const fetcher=vi.fn().mockResolvedValue(json(noMatch));const transport=createReadOnlyTransport(origins.internal,fetcher);
  for(const identity of [{name:'  Café + 東京 & "Live"? #🎵 ',artist:'',album:''},{name:'Título',artist:'Björk & 宇多田',album:'Álbum + 1'}]){
   await transport(requestFor({...identity,albumArtist:'Never substitute'}));
   const [url,options]=fetcher.mock.calls.at(-1)! as unknown as [URL,RequestInit];
   expect([...url.searchParams.keys()]).toEqual(['name','artist','album']);
   for(const key of ['name','artist','album'] as const)expect(url.searchParams.get(key)).toBe(identity[key]);
   expect(options).toMatchObject({method:'GET',credentials:'omit'});expect(options.headers).toBeUndefined();expect(options.body).toBeUndefined();
  }
  expect(normalizePlayback(now({...songA,artist:'',album:''}))).toMatchObject({kind:'now-playing',identity:{artist:'',album:''}});
 });
 it('omits refresh for every ordinary read, including same-song and metadata-only refresh',async()=>{
  const transport=vi.fn().mockResolvedValue(mac());const session=new PlaybackSession(async()=>normalizePlayback(now()),new LegacyClient(transport),vi.fn());
  await session.refresh();await session.refresh();await session.refreshLibrary();
  expect(transport).toHaveBeenCalledTimes(3);for(const [request] of transport.mock.calls)expect(request.query).not.toHaveProperty('refresh');
  expect(requestFor(songA,undefined,true).query.refresh).toBe('true');expect(requestFor(songA,undefined,false).query.refresh).toBe('false');
  expect(()=>requestFor(songA,undefined,'yes' as unknown as boolean)).toThrow('Boolean');
 });
 it('uses only match and selection diagnostics, including cached singleton arrays',async()=>{
  const selected={...songA,rating:40,loved:false,comment:'unpro e6 m- custom:unknown [lgptphobic]',interpreted:{tags:['lossy']}};
  const body=mac(selected,true);body.results=[{...songA,rating:100}];body.matches=[{...songA,rating:100}];
  const {song,selection}=await new LegacyClient(async()=>body).read(songA);
  expect(song.rating).toBe(40);expect(song.loved).toBe(false);expect(song.comment).toBe(selected.comment);
  expect(tokensOf(song)).toContain('e6');expect(tokensOf(song)).toContain('m-');expect(tokensOf(song)).toContain('custom:unknown');expect(tokensOf(song)).not.toContain('lossy');
  expect(selection).toMatchObject({ambiguous:true,matchCount:2,fromCache:true,selectedIdentity:{libraryId:'FIXTURE-LIBRARY',persistentID:'000A'}});
  const unambiguous=mac();unambiguous.results=[songA,songA];unambiguous.matches=[songA,songA];
  expect((await new LegacyClient(async()=>unambiguous).read(songA)).selection?.ambiguous).toBe(false);
 });
 it('flags changed identifiers for the same request without replacing a pinned editor',async()=>{
  const initial=mac(),changed=mac({...songA,rating:10});changed.selection.selectedIdentity.persistentID='009Z';
  const transport=vi.fn().mockResolvedValueOnce(initial).mockResolvedValue(changed);const client=new LegacyClient(transport);const store=new SongStore(client,true);
  const session=new PlaybackSession(async()=>normalizePlayback(now()),client,(song,selection)=>store.load(song,selection));
  await session.refresh();session.pin();const key=session.snapshot().targetKey!;await session.refreshLibrary();
  expect(session.snapshot()).toMatchObject({targetKey:key,pinned:true,phase:'loaded'});
  expect(store.entries[key].song.rating).toBe(songA.rating);expect(store.entries[key].selection).toMatchObject({identityChanged:true,selectedIdentity:{persistentID:'009Z'}});
  await session.refreshLibrary();expect(store.entries[key].selection?.identityChanged).toBe(true);
 });
 it.each([null,{},'<html>fallback</html>',{status:400,message:'no matches found'},{...noMatch,status:'400'},{...mac(),selection:{ambiguous:1,matchCount:2}},{...mac(),match:undefined}])('rejects malformed envelopes rather than reporting no-match: %j',async body=>{
  await expect(new LegacyClient(async()=>body).read(songA)).rejects.toMatchObject({kind:'malformed'});
 });
 it('distinguishes valid no-match, application error, and invalid JSON/HTML',async()=>{
  await expect(new LegacyClient(async()=>noMatch).read(songA)).rejects.toMatchObject({kind:'no-match'});
  await expect(new LegacyClient(async()=>({...noMatch,message:'selected reference unavailable'})).read(songA)).rejects.toMatchObject({kind:'failed'});
  for(const text of ['{broken','<html>Hello World</html>']){
   const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>JSON.parse(text)});
   await expect(new LegacyClient(createReadOnlyTransport(origins.internal,fetcher)).read(songA)).rejects.toMatchObject({kind:'malformed'});expect(fetcher).toHaveBeenCalledTimes(1);
  }
 });
});
