'use client';
import { useEffect, useId, useMemo, useState } from 'react';
import type { VisualSpec } from '@/lib/contracts';
import { valueAt, display } from '@/lib/math';
// These SVGs are computed mathematics, rather than generated illustration.
export function MathVisual({spec}:{spec:VisualSpec}) {
  const [shift,setShift]=useState(0),[zoom,setZoom]=useState(1);
  const [compact,setCompact]=useState(false);
  useEffect(()=>{const query=window.matchMedia('(max-width:800px)');const update=()=>setCompact(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  const marker=useId().replace(/:/g,'');
  const W=compact?390:680,H=250,left=48,right=24,top=20,bottom=35;
  const bounds=useMemo(()=>{
    if(spec.kind==='vector2d') {const extent=Math.max(4,...spec.vectors.flat().map(Math.abs))+1;return [-extent,extent,-extent,extent];}
    const mid=(spec.domain[0]+spec.domain[1])/2,span=(spec.domain[1]-spec.domain[0])/2/zoom;
    const lo=mid-span,hi=mid+span;
    const samples=Array.from({length:201},(_,i)=>valueAt(spec.coefficients,lo+(hi-lo)*i/200)+shift);
    const ylo=Math.min(-1,...samples),yhi=Math.max(1,...samples),pad=(yhi-ylo)*.12;
    return [lo,hi,ylo-pad,yhi+pad];
  },[spec,shift,zoom]);
  const [xmin,xmax,ymin,ymax]=bounds;
  const px=(x:number)=>left+(x-xmin)/(xmax-xmin)*(W-left-right);
  const py=(y:number)=>H-bottom-(y-ymin)/(ymax-ymin)*(H-top-bottom);
  const xaxis=py(Math.max(ymin,Math.min(ymax,0))),yaxis=px(Math.max(xmin,Math.min(xmax,0)));
  const niceTicks=(min:number,max:number)=>{const raw=(max-min)/5;const power=10**Math.floor(Math.log10(raw));const step=[1,2,5,10].find(n=>n*power>=raw)!*power;const values=[];for(let n=Math.ceil(min/step)*step;n<=max&&values.length<12;n+=step)values.push(Math.abs(n)<step*1e-8?0:n);return values;};
  const xticks=niceTicks(xmin,xmax),yticks=niceTicks(ymin,ymax);
  const tickLabel=(n:number)=>Number(n.toPrecision(4)).toString();
  const path=spec.kind==='plot2d'?Array.from({length:241},(_,i)=>{const x=xmin+(xmax-xmin)*i/240;return `${i?'L':'M'}${px(x).toFixed(2)},${py(valueAt(spec.coefficients,x)+shift).toFixed(2)}`;}).join(' '):'';
  const c=spec.coefficients,rootDisc=c[1]**2-4*c[2]*(c[0]+shift);
  const roots=spec.kind==='plot2d'?(c[2]&&rootDisc>=0?[(-c[1]-Math.sqrt(rootDisc))/(2*c[2]),(-c[1]+Math.sqrt(rootDisc))/(2*c[2])]:!c[2]&&c[1]?[-(c[0]+shift)/c[1]]:[]):[];
  return <section className="visual" aria-label={spec.kind==='plot2d'?'نمودار تعاملی تابع':'نمایش جمع بردارها'}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${marker}-title ${marker}-desc`} style={{direction:'ltr'}}>
      <title id={`${marker}-title`}>{spec.kind==='plot2d'?'نمودار تابع چندجمله‌ای':'جمع دو بردار'}</title>
      <desc id={`${marker}-desc`}>{spec.kind==='plot2d'?`نمودار تابع با ضرایب ${c.join(', ')} و جابه‌جایی عمودی ${shift}. ریشه‌های حقیقی ${roots.map(display).join(' و ')||'ندارد'}.`:`بردار اول ${spec.vectors[0]}، بردار دوم ${spec.vectors[1]} و حاصل ${spec.vectors[2]}.`}</desc>
      <defs><marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="context-stroke"/></marker></defs>
      {xticks.map(x=><g key={`x${x}`}><line className="gridline" x1={px(x)} x2={px(x)} y1={top} y2={H-bottom}/><text x={px(x)} y={H-10} textAnchor="middle">{tickLabel(x)}</text></g>)}
      {yticks.map(y=><g key={`y${y}`}><line className="gridline" x1={left} x2={W-right} y1={py(y)} y2={py(y)}/><text x={left-9} y={py(y)+4} textAnchor="end">{tickLabel(y)}</text></g>)}
      <line className="axis" x1={left} x2={W-right} y1={xaxis} y2={xaxis}/><line className="axis" x1={yaxis} x2={yaxis} y1={top} y2={H-bottom}/><text x={W-12} y={xaxis-8}>x</text><text x={yaxis+8} y={top}>y</text>
      {spec.kind==='plot2d'?<><path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.4"/>{roots.filter(x=>x>=xmin&&x<=xmax&&0>=ymin&&0<=ymax).map((x,i)=><g key={i}><circle cx={px(x)} cy={py(0)} r="4" fill="var(--primary)" stroke="var(--foreground)"/><text x={px(x)} y={py(0)+20} textAnchor="middle">({display(x)}, 0)</text></g>)}</>:spec.vectors.map((v,i)=>{const start=i===1?spec.vectors[0]:[0,0];return <line key={i} x1={px(start[0])} y1={py(start[1])} x2={px(start[0]+v[0])} y2={py(start[1]+v[1])} stroke={i===2?'var(--primary)':'var(--foreground)'} strokeWidth={i===2?2.5:1.6} strokeDasharray={i===1?'6 4':undefined} markerEnd={`url(#${marker})`}/>;})}
    </svg>
    {spec.kind==='plot2d'?<><div className="plot-controls"><label>جابجایی عمودی <input type="range" min="-3" max="3" step="0.25" value={shift} onChange={e=>setShift(Number(e.target.value))} aria-label="جابجایی عمودی"/><output dir="ltr">{shift}</output></label><label>بزرگ‌نمایی <input type="range" min="1" max="3" step="0.25" value={zoom} onChange={e=>setZoom(Number(e.target.value))} aria-label="بزرگ‌نمایی"/></label></div><p className="visual-note" aria-live="polite">{shift===0?'نقاط برخورد با محور x، ریشه‌های معادله‌اند.':'این یک حالت آزمایشی با تغییر جمله ثابت است؛ پاسخ مسئله اصلی تغییر نکرده است.'}</p></>:<p className="visual-note">خط پیوسته: بردار اول · خط‌چین: بردار دوم از انتهای اول · کهربایی: حاصل جمع</p>}
  </section>;
}
