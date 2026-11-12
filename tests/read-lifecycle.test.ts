import {afterEach,describe,it,expect,vi} from 'vitest';
import {LegacyClient,keyOf} from '../src/api';
import {ReadError} from '../src/http';
import {MAC_READ_TIMEOUT_MS,SLOW_LOOKUP_MS,LASTFM_READ_TIMEOUT_MS} from '../src/read-policy';
import {PlaybackSession,createReadOnlyTransport,readIntegrationConfig} from '../src/integration';
import {normalizePlayback} from '../src/playback';
import {songA,songB,now,mac,noMatch,config,origins} from './fixtures/integration';
const deferred=<T,>()=>{let resolve!:(value:T)=>void;let reject!:(reason:unknown)=>void;const promise=new Promise<T>((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};};
const json=(body:unknown)=>({ok:true,json:async()=>body}) as Response;
afterEach(()=>vi.useRealTimers());
function setup(timeout=MAC_READ_TIMEOUT_MS){
 vi.useFakeTimers();const pending=deferred<Response>();const fetcher=vi.fn().mockReturnValue(pending.promise);const loaded=vi.fn();
 const source=vi.fn().mockResolvedValue(normalizePlayback(now()));
 const session=new PlaybackSession(source,new LegacyClient(createReadOnlyTransport(origins.internal,fetcher),undefined,timeout),loaded);
 return {session,pending,fetcher,loaded,source};
}
describe('Mac read lifecycle',()=>{
 it('centralizes the 60-second Mac policy and validates configurable overrides without changing Last.fm',()=>{
  expect(MAC_READ_TIMEOUT_MS).toBe(60000);expect(SLOW_LOOKUP_MS).toBe(3000);expect(LASTFM_READ_TIMEOUT_MS).toBe(8000);
  const env={VITE_PLAYBACK_MODE:'read-only',VITE_LASTFM_USERNAME:config.username,VITE_LASTFM_API_KEY:config.apiKey,VITE_MAC_INTERNAL_ORIGIN:origins.internal,VITE_MAC_ROUTING:'internal'};
  expect(readIntegrationConfig(env)).toMatchObject({mode:'read-only',config:{macReadTimeoutMs:60000}});
  expect(readIntegrationConfig({...env,VITE_MAC_READ_TIMEOUT_MS:'45000'})).toMatchObject({mode:'read-only',config:{macReadTimeoutMs:45000}});
  for(const value of ['0','-1','NaN','Infinity','1.5','999999999999'])expect(readIntegrationConfig({...env,VITE_MAC_READ_TIMEOUT_MS:value}).mode).toBe('invalid');
 });
 it('completes before the slow threshold and never shows obsolete progress',async()=>{
  const {session,pending,loaded}=setup();const task=session.refresh();await vi.advanceTimersByTimeAsync(1000);
  expect(session.snapshot()).toMatchObject({phase:'library-pending',pending:true,slow:false});pending.resolve(json(mac()));await task;
  await vi.advanceTimersByTimeAsync(10000);expect(session.snapshot()).toMatchObject({phase:'loaded',pending:false,slow:false});expect(loaded).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
 });
 it('shows slow feedback at three seconds, cancels fetch/waiting and ignores an executor’s late response',async()=>{
  const {session,pending,fetcher,loaded}=setup();const task=session.refresh();await vi.advanceTimersByTimeAsync(2999);expect(session.snapshot().slow).toBe(false);
  await vi.advanceTimersByTimeAsync(1);expect(session.snapshot()).toMatchObject({phase:'library-pending',pending:true,slow:true});
  const signal=fetcher.mock.calls[0][1].signal as AbortSignal;session.cancel();await task;
  expect(signal.aborted).toBe(true);expect(session.snapshot()).toMatchObject({phase:'canceled',pending:false,slow:false});expect(session.snapshot().message).toContain('Music.app may still be processing');
  pending.resolve(json(mac()));await vi.advanceTimersByTimeAsync(120000);expect(loaded).not.toHaveBeenCalled();expect(fetcher).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
 });
 it('times out only at 60000ms, does not retry, and permits an explicit manual refresh',async()=>{
  const {session,pending,fetcher,loaded}=setup();const task=session.refresh();await vi.advanceTimersByTimeAsync(59999);expect(session.snapshot().pending).toBe(true);
  await vi.advanceTimersByTimeAsync(1);await task;expect(session.snapshot()).toMatchObject({phase:'timed-out',pending:false,slow:false});expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  pending.resolve(json(mac()));await vi.advanceTimersByTimeAsync(60000);expect(fetcher).toHaveBeenCalledTimes(1);expect(loaded).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(json(mac()));await session.refresh();expect(session.snapshot().phase).toBe('loaded');expect(fetcher).toHaveBeenCalledTimes(2);expect(loaded).toHaveBeenCalledTimes(1);
 });
 it('honors an override without an earlier transport deadline and distinguishes explicit cancel from timeout',async()=>{
  const {session}=setup(45000);const task=session.refresh();await vi.advanceTimersByTimeAsync(8001);expect(session.snapshot().pending).toBe(true);
  await vi.advanceTimersByTimeAsync(36999);await task;expect(session.snapshot().phase).toBe('timed-out');
  const retry=session.refresh();await vi.advanceTimersByTimeAsync(1);session.cancel();await retry;expect(session.snapshot().phase).toBe('canceled');
 });
 it.each(['cancel','timeout','network','no-match','malformed'] as const)('keeps pinned A and its metadata after %s while detected playback is B',async outcome=>{
  const {session,pending,fetcher,source,loaded}=setup(5000);fetcher.mockResolvedValueOnce(json(mac()));await session.refresh();session.pin();source.mockResolvedValue(normalizePlayback(now(songB)));await session.refresh();
  expect(session.snapshot().targetKey).toBe(keyOf(songA));expect(fetcher).toHaveBeenCalledTimes(1);const task=session.refreshLibrary();await vi.advanceTimersByTimeAsync(3000);
  expect((fetcher.mock.calls[1][0] as URL).searchParams.get('name')).toBe(songA.name);expect(session.snapshot().targetKey).toBe(keyOf(songA));
  if(outcome==='cancel')session.cancel();if(outcome==='timeout')await vi.advanceTimersByTimeAsync(2000);
  if(outcome==='network')pending.reject(Error('network failure'));
  if(outcome==='no-match')pending.resolve(json(noMatch));if(outcome==='malformed')pending.resolve(json({status:200,match:{}}));await task;
  expect(session.snapshot()).toMatchObject({targetKey:keyOf(songA),pinned:true,pending:false,slow:false,phase:{cancel:'canceled',timeout:'timed-out',network:'network-failed','no-match':'no-match',malformed:'malformed'}[outcome]});
  expect(loaded).toHaveBeenCalledTimes(1);if(outcome==='cancel'||outcome==='timeout'){pending.resolve(json(mac({...songA,rating:10})));await vi.advanceTimersByTimeAsync(10000);expect(loaded).toHaveBeenCalledTimes(1);}
 });
 it('aborts an obsolete A request and prevents it from replacing newer B or clearing B’s slow timer',async()=>{
  const {session,pending,fetcher,loaded,source}=setup();const b=deferred<Response>();const first=session.refresh();await vi.advanceTimersByTimeAsync(1000);
  source.mockResolvedValue(normalizePlayback(now(songB)));fetcher.mockReturnValueOnce(b.promise);const second=session.refresh();await vi.advanceTimersByTimeAsync(3000);
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);expect(session.snapshot().slow).toBe(true);pending.resolve(json(mac()));await first;
  expect(session.snapshot()).toMatchObject({pending:true,slow:true});b.resolve(json(mac(songB)));await second;expect(session.snapshot().targetKey).toBe(keyOf(songB));expect(loaded).toHaveBeenCalledTimes(1);
 });
 it('classifies cancellation of a pre-aborted read without dispatch and cleans up on route change/disposal',async()=>{
  vi.useFakeTimers();const transport=vi.fn();const controller=new AbortController();controller.abort();
  await expect(new LegacyClient(transport).read(songA,true,{signal:controller.signal})).rejects.toMatchObject({kind:'canceled'} as Partial<ReadError>);expect(transport).not.toHaveBeenCalled();
  const {session,loaded}=setup();const first=session.refresh();await vi.advanceTimersByTimeAsync(1);session.changeRoute();await first;expect(session.snapshot().pending).toBe(false);expect(vi.getTimerCount()).toBe(0);
  const next=session.refresh();await vi.advanceTimersByTimeAsync(1);session.dispose();await next;expect(loaded).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
 });
});
