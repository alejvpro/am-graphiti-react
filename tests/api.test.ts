import {describe,it,expect,vi} from 'vitest';
import {LegacyClient,normalizeWrite,normalizeSong,requestFor,encodeLegacyRequest,inactiveRealTransport,keyOf} from '../src/api';
import {samples,SampleService} from '../src/sample';
import {SongStore,project} from '../src/store';
const a=samples[0], b=samples[1];
const verified=(song=structuredClone(a))=>({status:200,outcome:'verified',message:'verified',match:song});
describe('committed legacy contract boundary',()=>{
 it('encodes tuple identity and 0–100 rating, independent loved and exact tokens',()=>{
  expect(requestFor(a,{field:'rating',value:90}).query.rating).toBe('90');
  expect(requestFor(a,{field:'loved',value:false}).query.loved).toBe('false');
  const req=requestFor({...a,name:'A+B & Café #'}, {field:'tag',token:'[lgptphobic]',value:true});
  expect(req.route).toBe('/tag');expect(new URLSearchParams(encodeLegacyRequest(req).split('?')[1]).get('name')).toBe('A+B & Café #');
  expect(()=>requestFor(a,{field:'tag',token:'cFlight',value:true})).toThrow();
  expect(()=>requestFor(a,{field:'rating',value:101})).toThrow();
 });
 it('preserves unknown metadata and rejects malformed responses',()=>{
  expect(normalizeSong({...a,unknown:{keep:true}}).unknown).toEqual({keep:true});
  expect(()=>normalizeSong({...a,loved:1})).toThrow();
 });
 it('never equates HTTP/body 200 alone with verified completion',()=>{
  expect(normalizeWrite({status:200,match:a},a).outcome).toBe('uncertain');
  expect(normalizeWrite({status:400,outcome:'failed',message:'bad'},a).outcome).toBe('failed');
  expect(normalizeWrite(verified(b),a).outcome).toBe('uncertain');
 });
 it('disabled real transport never calls fetch',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch');await expect(inactiveRealTransport(requestFor(a))).rejects.toThrow('disabled');expect(fetch).not.toHaveBeenCalled();fetch.mockRestore();
 });
 it('sample primitives preserve unpro, unknown Comments, Grouping, and independent fields',async()=>{
  const service=new SampleService(),client=new LegacyClient(service.transport);
  let r=await client.write(a,{field:'rating',value:0});expect(r.song?.rating).toBe(0);expect(r.song?.loved).toBe(true);
  r=await client.write(a,{field:'energy',value:0});expect(r.song?.comment).not.toContain('e3');
  r=await client.write(a,{field:'mood',value:2});expect(r.song?.comment).toContain('m.');
  r=await client.write(a,{field:'mood',value:0});expect(r.song?.comment).not.toContain('m.');
  expect(r.song?.comment).toContain('unpro');expect(r.song?.comment).toContain('custom:keep-me');expect(r.song?.grouping).toBe(a.grouping);
 });
 it('timeout is uncertain and never retries',async()=>{
  const transport=vi.fn(()=>new Promise(()=>{}));const client=new LegacyClient(transport,5);
  expect((await client.write(a,{field:'rating',value:10})).outcome).toBe('uncertain');expect(transport).toHaveBeenCalledTimes(1);
 });
 it('rapid edits preserve newest intent and serialize dispatch',async()=>{
  let release:(v:unknown)=>void=()=>{};const transport=vi.fn().mockImplementationOnce(()=>new Promise(r=>release=r)).mockResolvedValueOnce(verified({...a,rating:20}));
  const store=new SongStore(new LegacyClient(transport));store.load(structuredClone(a));
  const p1=store.edit(a,{field:'rating',value:10}),p2=store.edit(a,{field:'rating',value:20});
  await Promise.resolve();await Promise.resolve();expect(transport).toHaveBeenCalledTimes(1);expect(project(store.entries[keyOf(a)]).rating).toBe(20);
  release(verified({...a,rating:10}));await p1;expect(project(store.entries[keyOf(a)]).rating).toBe(20);await p2;expect(project(store.entries[keyOf(a)]).rating).toBe(20);
 });
 it('uncertainty stops already queued writes and prevents automatic retries',async()=>{
  const transport=vi.fn().mockResolvedValue({status:400,outcome:'uncertain',message:'unknown'});
  const store=new SongStore(new LegacyClient(transport));store.load(structuredClone(a));
  await Promise.all([store.edit(a,{field:'rating',value:10}),store.edit(a,{field:'rating',value:20})]);
  expect(transport).toHaveBeenCalledTimes(1);expect(store.entries[keyOf(a)].uncertain).toBe(true);expect(store.entries[keyOf(a)].pending).toHaveLength(0);
 });
 it('delayed A response cannot overwrite B and failed edits roll back',async()=>{
  let release:(v:unknown)=>void=()=>{};const transport=vi.fn(()=>new Promise(r=>release=r));const store=new SongStore(new LegacyClient(transport));store.load(structuredClone(a));store.load(structuredClone(b));
  const done=store.edit(a,{field:'rating',value:10});await Promise.resolve();await Promise.resolve();release({status:400,outcome:'failed',message:'not dispatched'});await done;
  expect(project(store.entries[keyOf(a)]).rating).toBe(90);expect(project(store.entries[keyOf(b)]).rating).toBe(0);expect(store.entries[keyOf(a)].status).toContain('failed');
 });
});
it('controlled real transport is inert by default and can be tested with an injected executor',async()=>{
 const {createRealTransport}=await import('../src/api');const executor=vi.fn().mockResolvedValue({ok:true,json:async()=>verified()});
 await expect(createRealTransport('http://example.invalid',false,executor)(requestFor(a))).rejects.toThrow('disabled');expect(executor).not.toHaveBeenCalled();
 await expect(createRealTransport('http://example.invalid',true,executor)(requestFor(a,{field:'mood',value:3}))).rejects.toThrow('blocks all mutations');expect(executor).not.toHaveBeenCalled();
 await createRealTransport('http://example.invalid',true,executor)(requestFor(a));expect(executor).toHaveBeenCalledTimes(1);
});
