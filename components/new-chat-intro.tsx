'use client';
import { ArrowUpLeft } from 'lucide-react';
import { valueAt } from '@/lib/math';
import { derivativeAt } from '@/lib/generative-ui';
type PreviewKind='function'|'tangent'|'integral'|'triangle'|'vector'|'matrix';
export const starterExamples:{kind:PreviewKind;title:string;description:string;question:string}[]=[
  {kind:'function',title:'تابع و معادله',description:'نمودار تابع و محل ریشه‌ها',question:'معادله x^2-5x+6=0 را حل کن و نمودار تعاملی تابع را نشان بده.'},
  {kind:'tangent',title:'مشتق و مماس',description:'شیب در یک نقطهٔ متحرک',question:'مشتق f(x)=x^2-4x+3 را حساب کن و مماس متحرک نشان بده. شیب در x=3 چقدر است؟'},
  {kind:'integral',title:'انتگرال و مساحت',description:'تقریب با مستطیل‌های ریمان',question:'انتگرال معین f(x)=x^2 از 0 تا 1 را حساب کن و نمایش تعاملی مستطیل‌های ریمان بده.'},
  {kind:'triangle',title:'هندسه و فیثاغورس',description:'رابطهٔ ضلع‌ها در مثلث قائم',question:'یک مثلث قائم‌الزاویه با دو ضلع عمود 3 و 4 داریم. وتر را حساب کن و شکل تعاملی بده تا طول دو ضلع را تغییر بدهم.'},
  {kind:'vector',title:'بردار و جابه‌جایی',description:'جمع دو بردار روی صفحه',question:'بردارهای (2,1) و (1,3) را جمع کن و با پیکان‌های تعاملی نشان بده.'},
  {kind:'matrix',title:'ماتریس و تبدیل',description:'مقایسهٔ بردار ورودی و خروجی',question:'ماتریس [[2,0],[0,1]] چه اثری روی بردار (1,1) دارد؟ نمایش تعاملی تبدیل خطی بده.'},
];
const point=(x:number,y:number)=>`${x.toFixed(2)},${y.toFixed(2)}`;
function Preview({kind,title}:{kind:PreviewKind;title:string}){
  const plot=(c:number[],a:number,b:number,map:(x:number,y:number)=>[number,number])=>Array.from({length:61},(_,i)=>{const x=a+(b-a)*i/60;return point(...map(x,valueAt(c,x)));}).join(' ');
  const curve=(x:number,y:number):[number,number]=>[36+x*42,91-y*13];
  return <svg viewBox="0 0 250 120" role="img" aria-label={`پیش‌نمایش ${title}`} className="starter-preview">
    <g className="preview-grid" strokeWidth=".7">{[36,78,120,162,204].map(x=><path key={x} d={`M${x} 15V105`}/>)}{[27,59,91].map(y=><path key={y} d={`M24 ${y}H228`}/>)}</g>
    {kind==='function'||kind==='tangent'?<><path className="preview-axis" d="M24 91H228M36 105V15"/><polyline className="preview-primary" points={plot(kind==='function'?[6,-5,1]:[3,-4,1],0,4.4,curve)} />{kind==='function'?<><circle cx={curve(2,0)[0]} cy="91" r="3" className="preview-point"/><circle cx={curve(3,0)[0]} cy="91" r="3" className="preview-point"/></>:<><polyline className="preview-secondary" points={[1.5,4.4].map(x=>point(...curve(x,derivativeAt([3,-4,1],3)*(x-3)))).join(' ')}/><circle cx={curve(3,0)[0]} cy="91" r="4" className="preview-point"/></>}</>:
    kind==='integral'?<><path className="preview-axis" d="M24 100H228M36 107V15"/>{Array.from({length:6},(_,i)=>{const x=(i+.5)/6,h=x*x*68;return <rect key={i} x={36+i*28} y={100-h} width="28" height={h} className="preview-area"/>;})}<polyline className="preview-primary" points={plot([0,0,1],0,1.1,(x,y)=>[36+x*168,100-y*68])}/></>:
    kind==='triangle'?<><path d="M80 100L137 100L80 24Z" className="preview-shape"/><path d="M80 88H92V100" className="preview-secondary"/><text x="108" y="114">3</text><text x="65" y="67">4</text><text x="122" y="52">5</text></>:
    kind==='vector'?<><path className="preview-axis" d="M30 101H224M48 110V16"/><path d="M48 101L132 83M132 83l-10-3m10 3l-7 8" className="preview-secondary"/><path d="M132 83L174 29M174 29l-10 4m10-4l-1 11" className="preview-muted"/><path d="M48 101L174 29M174 29l-12 0m12 0l-6 10" className="preview-primary"/></>:
    <><path className="preview-axis" d="M25 99H228M48 110V15"/><path d="M48 99L112 39M112 39l-10 2m10-2l-2 10" className="preview-secondary"/><path d="M48 99L176 39M176 39l-11-2m11 2l-6 9" className="preview-primary"/><path d="M112 39H176" strokeDasharray="3 4" className="preview-muted"/></>}
  </svg>;
}
export function NewChatIntro({onChoose}:{onChoose:(question:string)=>void}){
  return <section className="start-learning starter-intro"><span className="starter-eyebrow">LearnIT · ریاضی با نمایش تعاملی</span><h1>از سؤال شما شروع می‌کنیم.</h1><p>سؤال خودتان را بنویسید یا یکی از نمونه‌ها را برای شروع انتخاب کنید.</p>
    <div className="starter-grid">{starterExamples.map(example=><button key={example.kind} type="button" className="starter-card" onClick={()=>onChoose(example.question)} aria-label={`انتخاب نمونه ${example.title}`}><Preview kind={example.kind} title={example.title}/><div className="starter-card-title"><strong>{example.title}</strong><ArrowUpLeft/></div><span className="starter-description">{example.description}</span><p>{example.question}</p></button>)}</div>
    <p className="starter-footnote">این‌ها نمونهٔ نمایش‌های فعلی‌اند؛ می‌توانید دربارهٔ مباحث دیگر ریاضی هم سؤال بپرسید.</p>
  </section>;
}
