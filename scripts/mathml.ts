import type { CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
// Convert the presentation MathML tree only; annotation-xml repeats the formula.
export function mathmlToLatex($:CheerioAPI,node:AnyNode):string {
  if(node.type==='text') return node.data;
  if(!('tagName' in node))return '';
  const tag=node.tagName.toLowerCase(),element=$(node);
  const children=element.children().toArray().filter(n=>!['annotation','annotation-xml'].includes(n.tagName));
  const values=children.map(n=>mathmlToLatex($,n));
  const group=(s:string)=>`{${s??''}}`;
  if(tag==='semantics')return values[0]??'';
  if(tag==='mfrac')return `\\frac${group(values[0])}${group(values[1])}`;
  if(tag==='msup')return `${group(values[0])}^${group(values[1])}`;
  if(tag==='msub')return `${group(values[0])}_${group(values[1])}`;
  if(tag==='msubsup')return `${group(values[0])}_${group(values[1])}^${group(values[2])}`;
  if(tag==='msqrt')return `\\sqrt${group(values.join(''))}`;
  if(tag==='mroot')return `\\sqrt[${values[1]}]${group(values[0])}`;
  if(tag==='munder')return `\\underset${group(values[1])}${group(values[0])}`;
  if(tag==='mover')return `\\overset${group(values[1])}${group(values[0])}`;
  if(tag==='munderover')return `${group(values[0])}_${group(values[1])}^${group(values[2])}`;
  if(tag==='mtable')return `\\begin{matrix}${values.join('\\\\')}\\end{matrix}`;
  if(tag==='mtr')return values.join('&');
  if(tag==='mspace')return '\\,';
  if(tag==='mfenced')return `${element.attr('open')??'('}${values.join(element.attr('separators')??',')}${element.attr('close')??')'}`;
  if(tag==='mtext')return `\\text{${element.text().replace(/[{}\\$]/g,'')}}`;
  if(['mi','mn','mo'].includes(tag)) {
    const mappings:Record<string,string>={'−':'-','∞':'\\infty ','∫':'\\int ','∑':'\\sum ','→':'\\to ','≤':'\\le ','≥':'\\ge ','±':'\\pm ','⋅':'\\cdot ','×':'\\times ','∂':'\\partial ','π':'\\pi ','θ':'\\theta ','Δ':'\\Delta ','∇':'\\nabla ','≠':'\\ne ','≈':'\\approx '};
    return [...element.text()].map(c=>mappings[c]??c).join('');
  }
  return values.join('');
}
