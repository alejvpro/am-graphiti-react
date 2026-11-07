import {useId,useRef} from 'react';
// Ten adjacent half-star radios share five visual stars. No extra slider or hover layout changes.
export function Rating({value,disabled,onChange}:{value:number;disabled:boolean;onChange:(value:number)=>void}){
 const id=useId();
 const refs=useRef<(HTMLButtonElement|null)[]>([]);
 return <div className="stars" role="radiogroup" aria-label="Rating" onKeyDown={e=>{
  const current=refs.current.indexOf(document.activeElement as HTMLButtonElement);
  let next:number|undefined;
  if(e.key==='ArrowRight'||e.key==='ArrowUp')next=Math.min(9,current+1);
  if(e.key==='ArrowLeft'||e.key==='ArrowDown')next=Math.max(0,current-1);
  if(e.key==='Home')next=0;if(e.key==='End')next=9;
  if(next!==undefined&&!disabled){e.preventDefault();refs.current[next]?.focus();onChange((next+1)*10);}
 }}>
  {Array.from({length:5},(_,star)=><span className="star" key={star}><svg className="star-shape" viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id={`${id}-${star}`}><rect width={Math.max(0,Math.min(1,value/20-star))*24} height="24"/></clipPath></defs><path className="star-empty" d="m12 2 3 6.3 7 1-5 4.9 1.2 7L12 18l-6.2 3.2 1.2-7-5-4.9 7-1Z"/><path className="star-gold" clipPath={`url(#${id}-${star})`} d="m12 2 3 6.3 7 1-5 4.9 1.2 7L12 18l-6.2 3.2 1.2-7-5-4.9 7-1Z"/></svg>{[0,1].map(half=>{const i=star*2+half;return <button key={half} ref={el=>{refs.current[i]=el;}} role="radio" aria-label={`${(i+1)/2} stars`} aria-checked={value===(i+1)*10} disabled={disabled} tabIndex={value===(i+1)*10||value===0&&i===0?0:-1} onClick={()=>onChange((i+1)*10)}/>;})}</span>)}
 </div>;
}
