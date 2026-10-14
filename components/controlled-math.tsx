'use client';
import { useState, useMemo } from 'react';
import { Mafs, Coordinates, Plot, Point, Line, Polygon, Vector, Text } from 'mafs';
import { CopilotKit, useRenderTool, useRenderToolCall } from '@copilotkit/react-core/v2';
import { UIScene, validateScene, derivativeAt, integralBetween, type MathScene } from '@/lib/generative-ui';
import { valueAt, display } from '@/lib/math';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { MathContent } from './math-content';
import { Button } from './ui/button';
import { z } from 'zod';
function Grid({xSpan,ySpan}:{xSpan:number;ySpan:number}) {
  const interval=(span:number)=>{const raw=span/6,power=10**Math.floor(Math.log10(raw));return ([1,2,5,10].find(n=>n*power>=raw)??10)*power;};
  const label=(n:number)=>Number(n.toPrecision(4)).toString();
  return <Coordinates.Cartesian xAxis={{lines:interval(xSpan),labels:label}} yAxis={{lines:interval(ySpan),labels:label}}/>;
}

function Range({label,value,min,max,step=0.1,onChange}:{label:string;value:number;min:number;max:number;step?:number;onChange:(n:number)=>void}) {
  return <label className="scene-control"><span>{label}</span><input type="range" aria-label={label} value={value} min={min} max={max} step={step} onChange={e=>onChange(Number(e.target.value))}/><output dir="ltr">{display(value)}</output></label>;
}
function Curve({scene}:{scene:Extract<MathScene,{kind:'function'|'tangent'|'integral'}>}) {
  const [x,setX]=useState(scene.kind==='tangent'?scene.initialX:0),[shift,setShift]=useState(0),[zoom,setZoom]=useState(1),[n,setN]=useState(8);
  const bounds=scene.kind==='integral'?scene.bounds:scene.domain;
  const middle=(bounds[0]+bounds[1])/2,half=(bounds[1]-bounds[0])/2/zoom;
  const domain:[number,number]=scene.kind==='integral'?[bounds[0]-1,bounds[1]+1]:[middle-half,middle+half];
  const ys=useMemo(()=>Array.from({length:80},(_,i)=>valueAt(scene.coefficients,domain[0]+(domain[1]-domain[0])*i/79)+shift),[scene.coefficients,domain[0],domain[1],shift]);
  const low=Math.min(0,...ys),high=Math.max(1,...ys),padding=Math.max(.5,(high-low)*.15);
  const slope=derivativeAt(scene.coefficients,x),y=valueAt(scene.coefficients,x);
  const dx=scene.kind==='integral'?(scene.bounds[1]-scene.bounds[0])/n:0;
  const approximation=scene.kind==='integral'?Array.from({length:n},(_,i)=>valueAt(scene.coefficients,scene.bounds[0]+(i+.5)*dx)*dx).reduce((a,b)=>a+b,0):0;
  return <>
    <div role="img" aria-label={scene.kind==='tangent'?'نمودار تابع و خط مماس':scene.kind==='integral'?'انتگرال و مستطیل‌های ریمان':'نمودار تابع چندجمله‌ای'}>
      <Mafs height={290} viewBox={{x:domain,y:[low-padding,high+padding]}} preserveAspectRatio={false}>
        <Grid xSpan={domain[1]-domain[0]} ySpan={high-low+2*padding}/>
        {scene.kind==='integral'&&Array.from({length:n},(_,i)=>{const a=scene.bounds[0]+i*dx,b=a+dx,h=valueAt(scene.coefficients,(a+b)/2);return <Polygon key={i} points={[[a,0],[a,h],[b,h],[b,0]]} color="var(--primary)" fillOpacity={.16} weight={1}/>;})}
        <Plot.OfX y={v=>valueAt(scene.coefficients,v)+shift} color="var(--primary)"/>
        {scene.kind==='tangent'&&<><Line.PointSlope point={[x,y]} slope={slope} color="var(--scene-secondary)"/><Point x={x} y={y} color="var(--primary)"/><Text x={x} y={y} attach="ne">P</Text></>}
      </Mafs>
    </div>
    <div className="scene-controls">
      {scene.kind==='tangent'?<><Range label="نقطه روی تابع" value={x} min={bounds[0]} max={bounds[1]} onChange={setX}/><p aria-live="polite" dir="ltr">{`f(${display(x)}) = ${display(y)} · f′(${display(x)}) = ${display(slope)}`}</p></>:scene.kind==='integral'?<><Range label="تعداد مستطیل‌ها" value={n} min={2} max={40} step={1} onChange={setN}/><p aria-live="polite">مقدار دقیق: <b dir="ltr">{display(integralBetween(scene.coefficients,scene.bounds[0],scene.bounds[1]))}</b> · تقریب ریمان: <b dir="ltr">{display(approximation)}</b></p></>:<><Range label="جابجایی عمودی" value={shift} min={-3} max={3} onChange={setShift}/><Range label="بزرگ‌نمایی" value={zoom} min={1} max={3} onChange={setZoom}/></>}
    </div>
    {(shift!==0||scene.kind!=='function')&&<p className="visual-note">این یک حالت آزمایشی برای کاوش است؛ پاسخ مسئلهٔ اصلی تغییر نمی‌کند.</p>}
  </>;
}
function Triangle({scene}:{scene:Extract<MathScene,{kind:'triangle'}>}) {
  const [a,setA]=useState(scene.legs[0]),[b,setB]=useState(scene.legs[1]);const c=Math.hypot(a,b);
  return <><div role="img" aria-label="مثلث قائم و رابطه فیثاغورس"><Mafs height={290} viewBox={{x:[-1,a+2],y:[-1,b+2]}}><Grid xSpan={a+3} ySpan={b+3}/><Polygon points={[[0,0],[a,0],[0,b]]} color="var(--primary)" fillOpacity={.1}/><Polygon points={[[0,0],[.3,0],[.3,.3],[0,.3]]} color="var(--scene-secondary)"/><Text x={a/2} y={-.4}>a</Text><Text x={-.4} y={b/2}>b</Text><Text x={a/2+.4} y={b/2+.4}>c</Text></Mafs></div><div className="scene-controls"><Range label="ضلع افقی" value={a} min={.5} max={30} onChange={setA}/><Range label="ضلع عمودی" value={b} min={.5} max={30} onChange={setB}/><p aria-live="polite" dir="ltr">{`c = √(${display(a)}² + ${display(b)}²) = ${display(c)}`}</p></div><p className="visual-note">زاویهٔ قائم حفظ می‌شود؛ مقدارها برای کاوش تغییر می‌کنند.</p></>;
}
function VectorScene({scene}:{scene:Extract<MathScene,{kind:'vector'|'matrix'}>}) {
  const [factor,setFactor]=useState(1);
  const first=scene.kind==='vector'?scene.vectors[0]:[1,1],second=scene.kind==='vector'?scene.vectors[1]:[0,0];
  const u:[number,number]=[first[0]*factor,first[1]*factor];
  const v:[number,number]=scene.kind==='vector'?[u[0]+second[0],u[1]+second[1]]:[scene.matrix[0][0]*u[0]+scene.matrix[0][1]*u[1],scene.matrix[1][0]*u[0]+scene.matrix[1][1]*u[1]];
  const extent=Math.max(3,...u.map(Math.abs),...v.map(Math.abs))+1;
  return <><div role="img" aria-label={scene.kind==='vector'?'جمع دو بردار':'تبدیل خطی با ماتریس'}><Mafs height={290} viewBox={{x:[-extent,extent],y:[-extent,extent]}}><Grid xSpan={2*extent} ySpan={2*extent}/><Vector tip={u} color="var(--scene-secondary)"/>{scene.kind==='vector'&&<Vector tail={u} tip={v} color="var(--muted-foreground)"/>}<Vector tip={v} color="var(--primary)"/></Mafs></div><div className="scene-controls"><Range label="مقیاس بردار ورودی" value={factor} min={-2} max={2} onChange={setFactor}/><p aria-live="polite" dir="ltr">{`(${u.map(display).join(', ')}) → (${v.map(display).join(', ')})`}</p></div><p className="visual-note">بردار ورودی آبی و نتیجه کهربایی است؛ تغییرها محلی محاسبه می‌شوند.</p></>;
}
function MathSceneView({scene}:{scene:MathScene}) {
  const [revision,setRevision]=useState(0);
  return <Collapsible defaultOpen className="controlled-scene" data-component={scene.kind}>
    <CollapsibleTrigger className="plot-trigger"><ChevronDown/> نمایش {['function','tangent','integral'].includes(scene.kind)?'نمودار':scene.kind==='triangle'?'شکل':'بردارها'}</CollapsibleTrigger>
    <CollapsibleContent><div className="scene-header"><h3>{scene.title}</h3><Button variant="ghost" size="sm" onClick={()=>setRevision(n=>n+1)}>بازنشانی</Button></div>{scene.basis==='example'&&<p className="scene-basis">مثال آموزشی ساخته‌شده برای توضیح مفهوم</p>}<MathContent restricted>{scene.caption}</MathContent><div key={revision}>{['function','tangent','integral'].includes(scene.kind)?<Curve scene={scene as Extract<MathScene,{kind:'function'|'tangent'|'integral'}>}/>:scene.kind==='triangle'?<Triangle scene={scene}/>:<VectorScene scene={scene as Extract<MathScene,{kind:'vector'|'matrix'}>}/>}</div></CollapsibleContent>
  </Collapsible>;
}
function Registry() {
  useRenderTool({name:'display_math',parameters:UIProposalParams,render:({status,parameters})=>{
    if(status==='inProgress')return <p role="status">در حال آماده‌سازی نمایش…</p>;
    const scene=validateScene(parameters.spec,'',null,false);
    return scene?<MathSceneView scene={scene}/>:<p role="status">نمایش معتبر نیست؛ توضیح متنی را دنبال کنید.</p>;
  }},[]);
  return null;
}
const UIProposalParams=z.object({spec:UIScene}).strict();
export function ControlledUIProvider({children}:{children:React.ReactNode}) {return <CopilotKit runtimeUrl="/api/copilotkit" enableInspector={false}><Registry/>{children}</CopilotKit>;}
export function ControlledMath({scene,id}:{scene:MathScene;id:string}) {
  const renderToolCall=useRenderToolCall();
  return renderToolCall({toolCall:{id,type:'function',function:{name:'display_math',arguments:JSON.stringify({spec:scene})}},toolMessage:{id:`result-${id}`,role:'tool',toolCallId:id,content:JSON.stringify({validated:true})}});
}
