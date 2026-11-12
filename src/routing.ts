import {waitForRead} from './http';
export type Route='internal'|'external'|'local';
export type RouteChoice=Route|'automatic';
// Existing legacy service; no API readiness or mutation probes.
export const LEGACY_IP_URL='http://whosplaying.alejandroveloz.com/ip.php';
export const LEGACY_HOME_IP='104.172.227.53';
export class NetworkRouting{
 private state:{choice:RouteChoice;active:Route;message:string};private pending?:Promise<Route>;private stale=true;private generation=0;
 private listeners=new Set<()=>void>();
 constructor(choice:RouteChoice,private homeIp:string,private fetcher:typeof fetch,private available:(r:Route)=>boolean){this.state={choice,active:choice==='automatic'?'external':choice,message:choice==='automatic'?'Automatic · Detection pending':'Manual route'};}
 snapshot=()=>this.state;
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private set(patch:Partial<typeof this.state>){this.state={...this.state,...patch};this.listeners.forEach(f=>f());}
 invalidate=()=>{this.stale=true;this.generation++;this.pending=undefined;};
 select(choice:RouteChoice){this.invalidate();this.set({choice,...(choice==='automatic'?{message:'Automatic · Detection pending'}:{active:choice,message:'Manual route'})});}
 async resolve():Promise<Route>{
  if(this.state.choice!=='automatic'||!this.stale)return this.state.active;
  if(this.pending)return this.pending;
  const gen=this.generation;
  this.pending=(async()=>{
   let active:Route='external',message='Automatic · Detection unavailable; using External. Manual override available.';
   try{
    const ip=await waitForRead(async signal=>{const fetcher=this.fetcher;const r=await fetcher(LEGACY_IP_URL,{method:'GET',credentials:'omit',redirect:'error',cache:'no-store',signal});if(!r.ok)throw Error();const value=(await r.text()).trim();if(!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)||value.split('.').some(n=>Number(n)>255))throw Error();return value;},2000,undefined,'Network detection');
    active=ip===this.homeIp?'internal':'external';message=`Automatic · ${active==='internal'?'Home network · Internal':'Remote network · External'}`;
   }catch{/* Explicit External fallback, never silently assume LAN. */}
   if(!this.available(active)){active='external';message='Automatic · Internal unavailable; using External';}
   if(gen!==this.generation)return this.resolve();
   this.stale=false;this.pending=undefined;this.set({active,message});return active;
  })();return this.pending;
 }
}
