import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Reference,type RetrievedReference } from './reference-contract';
export { Reference,type RetrievedReference } from './reference-contract';
type Chunk=Omit<RetrievedReference,'score'> & {keywords:string};
const stop=new Set('the a an to of and or in is are for with at on as by this that from be it what how چیست چه یعنی را از به و در با یک این است کن بده توضیح چرا'.split(' '));
const tokens=(s:string)=>s.toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').match(/[\p{L}\p{N}]+/gu)?.filter(x=>x.length>1&&!stop.has(x))??[];
const aliases:[RegExp,string][]=[[/مشتق|مماس|شیب/g,'derivative differentiation tangent slope'],[/انتگرال|مساحت/g,'integral integration area'],[/حد|پیوستگی/g,'limit continuity'],[/بردار|مولفه|مؤلفه/g,'vector component'],[/درجه دوم|سهمی|دلتا/g,'quadratic parabola'],[/معادله خطی/g,'linear equation'],[/ماتریس/g,'matrix matrices'],[/مختلط|موهومی/g,'complex imaginary'],[/احتمال/g,'probability'],[/نرمال|گاوسی/g,'normal gaussian distribution'],[/زنجیره/g,'chain rule'],[/گرادیان/g,'gradient'],[/سینوس|کسینوس|مثلثات/g,'sine cosine trigonometry'],[/لگاریتم/g,'logarithm']];
let indexPromise:Promise<{chunks:Chunk[];documents:Map<string,number>[];df:Map<string,number>;avg:number}>|undefined;
async function index() {
  return indexPromise??=(async()=>{
    const payload=JSON.parse(await readFile(join(process.cwd(),'rag/index.json'),'utf8'));
    if(payload.version!==1||!Array.isArray(payload.chunks)) throw new Error('Invalid RAG index');
    const chunks=payload.chunks as Chunk[],df=new Map<string,number>();
    const documents=chunks.map(chunk=>{const words=tokens(`${chunk.title} ${chunk.keywords} ${chunk.text}`);const frequencies=new Map<string,number>();for(const word of words)frequencies.set(word,(frequencies.get(word)??0)+1);for(const word of frequencies.keys())df.set(word,(df.get(word)??0)+1);return frequencies;});
    const avg=documents.reduce((n,d)=>n+[...d.values()].reduce((a,b)=>a+b,0),0)/Math.max(1,documents.length);
    return {chunks,documents,df,avg};
  })();
}
export async function retrieveReferences(question:string,topic='general'):Promise<RetrievedReference[]> {
  let query=question;
  for(const [pattern,english] of aliases){pattern.lastIndex=0;if(pattern.test(question))query+=' '+english;}
  if(topic==='quadratic') query+=' quadratic roots';
  const subjectAliases:[RegExp,string][]=[
    [/دنباله/g,'sequence sequences convergence'],[/سری توانی|شعاع همگرایی/g,'power series radius convergence'],[/سری|همگرایی|واگرایی/g,'series convergence divergence'],
    [/دیفرانسیل|تفکیک پذیر|تفکیک‌پذیر/g,'differential equation separable'],[/مرتبه اول|عامل انتگرال/g,'first order integrating factor'],
    [/دوجمله|نیوتن|فاکتوریل/g,'binomial theorem factorial'],[/بیضی|کانون|مقاطع مخروطی/g,'ellipse conic focus'],
    [/گاوس|دستگاه معادلات/g,'gaussian elimination linear system'],[/دترمینان|کرامر/g,'determinant cramer'],
    [/دوگانه|چندگانه|فوبینی/g,'double multiple integral fubini'],[/مجموعه|زیرمجموعه|تهی/g,'set subset membership'],
    [/منطق|گزاره|جدول ارزش|جدول درستی|جدول صدق/g,'logic statement truth table'],
    [/هندسه|اقلیدسی|موازی/g,'geometry point line plane'],[/گراف|یال|رأس|راس/g,'graph vertex edge'],[/چرخه|همبند|گراف کامل/g,'graph cycle connected complete'],
  ];
  for(const [pattern,english] of subjectAliases){pattern.lastIndex=0;if(pattern.test(question))query+=' '+english;}
  const words=[...new Set(tokens(query))];
  if(!words.length)return [];
  const {chunks,documents,df,avg}=await index();
  const ranked=chunks.map((chunk,i)=>{
    const doc=documents[i],length=[...doc.values()].reduce((a,b)=>a+b,0);
    let score=0;
    for(const word of words){const tf=doc.get(word)??0;if(!tf)continue;const idf=Math.log(1+(chunks.length-(df.get(word)??0)+.5)/((df.get(word)??0)+.5));score+=idf*tf*2.2/(tf+1.2*(.25+.75*length/avg));}
    return {chunk,score};
  }).filter(r=>r.score>1).sort((a,b)=>b.score-a.score);
  const selected:RetrievedReference[]=[],count=new Map<string,number>();
  for(const {chunk,score} of ranked){
    if((count.get(chunk.sourceId)??0)>=2)continue;
    const url=new URL(chunk.url);
    if(url.protocol!=='https:'||url.hostname!=='openstax.org')continue;
    const {keywords:_,...reference}=chunk;
    selected.push(Reference.parse({...reference,score:Math.round(score*100)/100}));count.set(chunk.sourceId,(count.get(chunk.sourceId)??0)+1);
    if(selected.length===3)break;
  }
  return selected;
}
