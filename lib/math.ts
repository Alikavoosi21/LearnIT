import type { z } from 'zod';
import { ToolResult, Visual } from './contracts';
export function normalize(text:string) {
  return text.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/−/g,'-').replace(/²/g,'^2').replace(/³/g,'^3').replace(/×/g,'*').replace(/𝑥/g,'x');
}
// Deliberately narrow grammar: sums of constant, x and x^2 monomials.
// No eval, implicit functions, parentheses, arbitrary code or division.
function side(input:string):number[]|null {
  // Whitespace must never concatenate separate numbers; only coefficient*x
  // multiplication is part of this grammar (2*3x is not 23x).
  if(/\d\s+\d/.test(input)) return null;
  const clean=input.replace(/\s/g,'').replace(/(\d|\.)\*(?=x)/gi,'$1');
  if(!clean || !/^[0-9xX.+\-^]+$/.test(clean)) return null;
  const terms=clean.match(/[+-]?[^+-]+/g);
  if(!terms || terms.join('')!==clean) return null;
  const c=[0,0,0];
  for(const term of terms) {
    const m=term.match(/^([+-]?)(\d+(?:\.\d+)?|\.\d+)?(x(?:\^([12]))?)?$/i);
    if(!m || (!m[2]&&!m[3])) return null;
    const exponent=m[3]?Number(m[4]??1):0;
    c[exponent]+=(m[1]==='-'?-1:1)*Number(m[2]??1);
  }
  return c.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6)?c:null;
}
export function polynomial(question:string):number[]|null {
  const normalized=normalize(question);
  if(/[<>≤≥/()]/.test(normalized) || /\b[a-z]+\s*\(/i.test(normalized)) return null;
  const candidates=normalized.match(/[+-]?(?:\d|\.\d|x)[0-9xX.+\-^*\s]*(?:=[0-9xX.+\-^*\s]+)?/g)??[];
  if(candidates.filter(candidate=>/x/i.test(candidate)).length!==1) return null;
  for(const candidate of candidates.sort((a,b)=>b.length-a.length)) {
    if(!/x/i.test(candidate)) continue;
    const position=normalized.indexOf(candidate);
    if(/[a-zA-Z(/]/.test(normalized[position-1]??'') || /[a-zA-Z)/]/.test(normalized[position+candidate.length]??'')) continue;
    const parts=candidate.trim().split('=');
    if(parts.length>2) continue;
    const left=side(parts[0]),right=side(parts[1]??'0');
    if(left&&right) return left.map((v,i)=>v-right[i]);
  }
  return null;
}
export const valueAt=(c:number[],x:number)=>c.reduce((sum,v,i)=>sum+v*x**i,0);
// A recognized expression is not permission to solve a different operation.
export function supportsLocalOperation(question:string,topic:string):boolean {
  const q=normalize(question);
  if(/دیفرانسیل|دنباله|سری|هندسه|بیضی|گراف|دترمینان|گاوس|منطق|گزاره|مجموعه|دوجمله|فاکتوریل|differential|sequence|series|geometry|ellipse|graph|determinant|gaussian|logic|binomial/i.test(q)) return false;
  if(/انتگرال|integral|integrat|(?:^|\s)حد(?:\s|$)|\blimit\b|مقدار|ارزیابی|evaluate|مساحت|area|مشتق دوم|second derivative|مختلط|complex|دستگاه|system|لگاریتم|logarithm|\blog\b|احتمال|probability|ماتریس|matrix/i.test(q)) return false;
  if(/چرا|چیست|یعنی|مفهوم|توضیح|\bwhy\b|\bwhat\b|concept|explain/i.test(q)) return false;
  if(topic==='derivative') return /مشتق|derivative|differentiat/i.test(q)&&!/در\s*(?:نقطه|x\s*=)|\bat\b/i.test(q);
  if(topic==='quadratic') return !/مشتق|derivative|بردار|vector/i.test(q);
  return topic==='vector'&&!/ضرب|dot|cross/i.test(q);
}
export function solve(question:string,topic:string):z.infer<typeof ToolResult>|null {
  if(!supportsLocalOperation(question,topic)) return null;
  if(topic==='vector') {
    const pairs=[...normalize(question).matchAll(/[([]\s*([+-]?\d+(?:\.\d+)?)\s*[,،]\s*([+-]?\d+(?:\.\d+)?)\s*[)\]]/g)];
    if(pairs.length!==2 || !/جمع|\+|add|sum/i.test(question)) return null;
    const c=pairs.flatMap(m=>[Number(m[1]),Number(m[2])]);
    if(c.some(v=>Math.abs(v)>1e6)) return null;
    return {operation:'vector_add',coefficients:c,values:[c[0]+c[2],c[1]+c[3]],realRoots:true};
  }
  const c=polynomial(question);
  if(!c) return null;
  if(topic==='derivative') return {operation:'derivative',coefficients:c,values:[c[1],2*c[2]],realRoots:true};
  const [constant,b,a]=c;
  if(a===0) return b===0?null:{operation:'polynomial_roots',coefficients:c,values:[-constant/b],realRoots:true};
  const discriminant=b*b-4*a*constant;
  if(discriminant<0) return {operation:'polynomial_roots',coefficients:c,values:[],realRoots:false};
  // Stable quadratic formula: avoids subtracting almost equal positive numbers.
  const q=-.5*(b+(b>=0?1:-1)*Math.sqrt(discriminant));
  const values=discriminant===0?[-b/(2*a)]:[q/a,constant/q].sort((x,y)=>x-y);
  return ToolResult.parse({operation:'polynomial_roots',coefficients:c,values,realRoots:true});
}
export function verifyTool(tool:z.infer<typeof ToolResult>):boolean {
  const c=tool.coefficients;
  if(tool.operation==='polynomial_roots') {
    if(c.length!==3) return false;
    const discriminant=c[1]**2-4*c[2]*c[0];
    if(!tool.realRoots) return c[2]!==0&&discriminant<0&&tool.values.length===0;
    const count=c[2]===0?(c[1]===0?0:1):discriminant<0?0:discriminant===0?1:2;
    return count>0&&tool.values.length===count&&new Set(tool.values).size===count&&tool.values.every(x=>Math.abs(valueAt(c,x))<=1e-8*(1+c.reduce((s,v,i)=>s+Math.abs(v*x**i),0)));
  }
  if(tool.operation==='derivative') return tool.values[0]===c[1]&&tool.values[1]===2*c[2];
  return tool.values[0]===c[0]+c[2]&&tool.values[1]===c[1]+c[3];
}
export function visualFor(tool:z.infer<typeof ToolResult>|null) {
  if(!tool) return null;
  if(tool.operation==='vector_add') return Visual.parse({kind:'vector2d',coefficients:[],vectors:[[tool.coefficients[0],tool.coefficients[1]],[tool.coefficients[2],tool.coefficients[3]],tool.values],domain:[-6,6]});
  const c=tool.coefficients;
  const center=c[2]!==0?-c[1]/(2*c[2]):0;
  const spread=Math.max(3,...tool.values.map(x=>Math.abs(x-center)+2));
  // Exclude poorly scaled visualizations instead of rendering misleading charts.
  if(!Number.isFinite(center)||Math.abs(center)>100||spread>100||c.some(v=>Math.abs(v)>1000)) return null;
  return Visual.parse({kind:'plot2d',coefficients:c,vectors:[],domain:[center-spread,center+spread]});
}
export function display(n:number) { return Number(n.toPrecision(8)).toString(); }
export function polynomialLatex(c:number[]) {
  const terms=c.map((v,i)=>!v?'':`${v<0?'-':'+'}${i&&Math.abs(v)===1?'':display(Math.abs(v))}${i===2?'x^2':i===1?'x':''}`).reverse().filter(Boolean).join('');
  return terms.replace(/^\+/,'')||'0';
}
