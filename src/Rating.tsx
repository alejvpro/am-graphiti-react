import {useRef} from 'react';
const labels=['0','½','1','½','2','½','3','½','4','½','5'];
export function Rating({value,disabled,onChange}:{value:number;disabled:boolean;onChange:(value:number)=>void}){
 const refs=useRef<(HTMLButtonElement|null)[]>([]);
 return <div className="rating-positions" role="radiogroup" aria-label="Rating" onKeyDown={e=>{
  const current=refs.current.indexOf(document.activeElement as HTMLButtonElement);
  let next:number|undefined;
  if(e.key==='ArrowRight'||e.key==='ArrowUp')next=Math.min(10,current+1);
  if(e.key==='ArrowLeft'||e.key==='ArrowDown')next=Math.max(0,current-1);
  if(e.key==='Home')next=0;if(e.key==='End')next=10;
  if(next!==undefined&&!disabled){e.preventDefault();refs.current[next]?.focus();onChange(next*10);}
 }}>
  {labels.map((label,i)=><button key={i} ref={el=>{refs.current[i]=el;}} role="radio" aria-label={i===0?'0 stars · Unset':`${i/2} stars`} aria-checked={value===i*10} disabled={disabled} tabIndex={value===i*10||value%10!==0&&i===0?0:-1} onClick={()=>onChange(i*10)}>{label}</button>)}
 </div>;
}
