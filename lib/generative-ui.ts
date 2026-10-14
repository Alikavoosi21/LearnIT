import { z } from 'zod';
import type { ToolResult } from './contracts';
import { polynomial, normalize } from './math';
const scalar=z.number().finite().min(-1000).max(1000);
const coefficients=z.array(scalar).min(1).max(5);
const point=z.tuple([scalar,scalar]);
const common={title:z.string().max(120),caption:z.string().max(500),basis:z.enum(['problem','example'])};
export const UIScene=z.discriminatedUnion('kind',[
  z.object({...common,kind:z.literal('function'),coefficients,domain:z.tuple([scalar,scalar])}).strict(),
  z.object({...common,kind:z.literal('tangent'),coefficients,domain:z.tuple([scalar,scalar]),initialX:scalar}).strict(),
  z.object({...common,kind:z.literal('integral'),coefficients,bounds:z.tuple([scalar,scalar])}).strict(),
  z.object({...common,kind:z.literal('triangle'),legs:z.tuple([z.number().positive().max(30),z.number().positive().max(30)])}).strict(),
  z.object({...common,kind:z.literal('vector'),vectors:z.tuple([point,point])}).strict(),
  z.object({...common,kind:z.literal('matrix'),matrix:z.tuple([point,point])}).strict(),
]);
export type MathScene=z.infer<typeof UIScene>;
// Extract an explicit function assignment without relaxing the solver grammar.
// Reject ambiguous assignments and unsupported tails rather than plotting a prefix.
export function scenePolynomial(question:string):number[]|null {
  const q=normalize(question).replace(/\^\{([12])\}/g,'^$1');
  const assignments=[...q.matchAll(/\bf\s*\(\s*x\s*\)\s*=\s*([^\n،؛؟!?$]+)/gi)];
  if(assignments.length>1)return null;
  if(assignments.length===1){
    const expression=assignments[0][1].trim().replace(/[.)\]}]+$/,'').trim();
    const prefix=expression.match(/^[0-9xX.+\-^*\s]+/);
    if(!prefix)return null;
    const tail=expression.slice(prefix[0].length);
    if(tail&&!/^[\s\u0600-\u06ff]/.test(tail))return null;
    return polynomial(prefix[0].trim());
  }
  return polynomial(q);
}
export function sceneForQuestion(question:string):MathScene|null {
  const q=normalize(question);
  if(/قائم|right triangle/i.test(q)){
    const legs=q.match(/(?:دو\s+)?ضلع\s+عمود\s*(?:به طول\s*|با طول\s*|برابر\s*|[:=]\s*)?([+-]?\d+(?:\.\d+)?)\s*(?:و|،|,)\s*([+-]?\d+(?:\.\d+)?)/);
    if(legs){const a=Number(legs[1]),b=Number(legs[2]);if(a>0&&b>0&&a<=30&&b<=30)return {kind:'triangle',basis:'problem',title:'مثلث قائم و قضیهٔ فیثاغورس',caption:'دو ضلع عمود را تغییر دهید و طول وتر را مقایسه کنید.',legs:[a,b]};}
  }
  if(!/مشتق|مماس|derivative|tangent/i.test(question))return null;
  const c=scenePolynomial(question);if(!c)return null;
  const base=sceneForTool({operation:'derivative',coefficients:c,values:[c[1],2*c[2]],realRoots:true});
  if(!base||base.kind!=='tangent')return null;
  const contacts=[...normalize(question).matchAll(/\bx\s*=\s*([+-]?\d+(?:\.\d+)?)/g)];
  const initial=contacts.length===1?Number(contacts[0][1]):base.initialX;
  if(Math.abs(initial)>35)return base;
  return {...base,initialX:initial,domain:[Math.max(-40,Math.min(base.domain[0],initial-2)),Math.min(40,Math.max(base.domain[1],initial+2))]};
}
// Responses strict JSON Schema does not accept tuple-form `items`.
// Use bounded arrays on the model wire; parse them into tuple-based UIScene
// before the scene enters LangGraph state or a renderer.
const wirePair=z.array(scalar).length(2);
const UIWireScene=z.discriminatedUnion('kind',[
  UIScene.options[0].extend({domain:wirePair}),
  UIScene.options[1].extend({domain:wirePair}),
  UIScene.options[2].extend({bounds:wirePair}),
  UIScene.options[3].extend({legs:z.array(z.number().positive().max(30)).length(2)}),
  UIScene.options[4].extend({vectors:z.array(wirePair).length(2)}),
  UIScene.options[5].extend({matrix:z.array(wirePair).length(2)}),
]);
export const UIProposal=z.object({scene:UIWireScene.nullable()});
export const componentCatalog=[
  {kind:'function',description:'نمودار تابع چندجمله‌ای با ضرایب صعودی؛ برای یافتن ریشه یا شکل تابع'},
  {kind:'tangent',description:'خط مماس متحرک و شیب مشتق تابع چندجمله‌ای'},
  {kind:'integral',description:'انتگرال معین چندجمله‌ای، مساحت علامت‌دار و مستطیل‌های ریمان'},
  {kind:'triangle',description:'مثلث قائم با دو ضلع عمود؛ برای فیثاغورس، نه مثلث عمومی'},
  {kind:'vector',description:'جمع دقیق دو بردار دوبعدی'},
  {kind:'matrix',description:'تبدیل خطی دوبعدی با ماتریس ۲ در ۲'},
];
export function sceneForTool(tool:z.infer<typeof ToolResult>|null):MathScene|null {
  if(!tool)return null;
  if(tool.operation==='vector_add')return tool.coefficients.some(n=>Math.abs(n)>30)?null:{kind:'vector',title:'جمع دو بردار',caption:'مؤلفه‌ها را تغییر دهید و بردار حاصل را ببینید.',basis:'problem',vectors:[[tool.coefficients[0],tool.coefficients[1]],[tool.coefficients[2],tool.coefficients[3]]]};
  const center=tool.coefficients[2]?-tool.coefficients[1]/(2*tool.coefficients[2]):0;
  if(Math.abs(center)>30||tool.coefficients.some(n=>Math.abs(n)>1000))return null;
  const domain:[number,number]=[Math.max(-40,center-5),Math.min(40,center+5)];
  return tool.operation==='derivative'?{kind:'tangent',title:'مشتق و خط مماس',caption:'با حرکت نقطه، شیب خط مماس تغییر می‌کند.',basis:'problem',coefficients:tool.coefficients,domain,initialX:Math.max(domain[0],Math.min(domain[1],0))}:{kind:'function',title:'نمودار تابع',caption:'برخورد با محور افقی، ریشه‌های حقیقی معادله را نشان می‌دهد.',basis:'problem',coefficients:tool.coefficients,domain};
}
export function validateScene(input:unknown,question:string,tool:z.infer<typeof ToolResult>|null,checkSource=true):MathScene|null {
  const parsed=UIScene.safeParse(input);if(!parsed.success)return null;
  const s=parsed.data;
  if('domain' in s&&(s.domain[0]>=s.domain[1]||s.domain.some(n=>Math.abs(n)>40)||s.domain[1]-s.domain[0]<.1))return null;
  if(s.kind==='tangent'&&(s.initialX<s.domain[0]||s.initialX>s.domain[1]))return null;
  if(s.kind==='integral'&&(s.bounds[0]>=s.bounds[1]||s.bounds.some(n=>Math.abs(n)>20)))return null;
  if(s.kind==='vector'&&s.vectors.flat().some(n=>Math.abs(n)>30))return null;
  if(s.kind==='matrix'&&s.matrix.flat().some(n=>Math.abs(n)>10))return null;
  // A model cannot replace an independently computed problem with other data.
  if(tool&&s.basis==='problem') {
    if(tool.operation==='vector_add')return s.kind==='vector'&&s.vectors.flat().every((v,i)=>v===tool.coefficients[i])?s:null;
    if(!('coefficients' in s)||JSON.stringify(s.coefficients)!==JSON.stringify(tool.coefficients))return null;
    if(tool.operation==='polynomial_roots'&&s.kind!=='function')return null;
    if(tool.operation==='derivative'&&!['function','tangent'].includes(s.kind))return null;
  }
  if(checkSource&&!tool&&'coefficients' in s&&s.basis==='problem') {
    const actual=scenePolynomial(question);
    if(actual&&Array.from({length:Math.max(actual.length,s.coefficients.length)},(_,i)=>i).some(i=>(actual[i]??0)!==(s.coefficients[i]??0)))return null;
    if(!actual)return null;
  }
  if(checkSource&&!tool&&s.basis==='problem'){
    const q=normalize(question),values=(q.match(/[+-]?\d+(?:\.\d+)?/g)??[]).map(Number);
    if(s.kind==='integral'&&!s.bounds.every(n=>values.includes(n)))return null;
    if(s.kind==='triangle'&&(!/قائم|فیثاغورس|right triangle|pythagor/i.test(q)||!s.legs.every(n=>values.includes(n))))return null;
    if(s.kind==='vector'&&(!/جمع|sum|add/i.test(q)||!s.vectors.flat().every(n=>values.includes(n))))return null;
    if(s.kind==='matrix'&&!s.matrix.flat().every(n=>values.includes(n)))return null;
  }
  return s;
}
export const derivativeAt=(c:number[],x:number)=>c.reduce((sum,v,i)=>i?sum+i*v*x**(i-1):sum,0);
export const integralBetween=(c:number[],a:number,b:number)=>c.reduce((sum,v,i)=>sum+v*(b**(i+1)-a**(i+1))/(i+1),0);
