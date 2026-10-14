import { it,expect } from 'vitest';
import { createTutor } from '../lib/agent';
import type { ModelAdapter } from '../lib/model';
it('rebuilds a verified tool answer instead of ending direct AI mode after rejected reviews',async()=>{
  const model:ModelAdapter={async generate(schema,name){const value=name==='review'?{consistent:false,issue:'رد'}:name==='presentation'?{scene:null}:{introduction:'متن ردشده',steps:[],conclusion:'غلط'};return {value:schema.parse(value),inputTokens:1,outputTokens:1};}};
  const state=await createTutor(model).start('x^2-5x+6=0');expect(state.status).toBe('awaiting_feedback');expect(state.verification).toBe('passed');expect(state.trace).toContain('recover_ai_answer');expect(state.answer?.conclusion).toContain('x=2');expect(state.answer?.conclusion).toContain('x=3');expect(state.answer?.introduction).not.toContain('ردشده');
});
it('solves the screenshot triangle with computed geometry even if model reviews and UI planning fail',async()=>{
  const model:ModelAdapter={async generate(schema,name){if(name==='presentation')throw new Error('UI unavailable');const value=name==='analysis'?{kind:'problem',topic:'general',clarification:''}:name==='review'?{consistent:false,issue:'رد'}:{introduction:'متن ردشده',steps:[],conclusion:'غلط'};return {value:schema.parse(value),inputTokens:1,outputTokens:1};}};
  const state=await createTutor(model).start('یک مثلث قائم‌الزاویه با دو ضلع عمود ۳ و ۴ داریم. وتر را حساب کن و شکل تعاملی نشان بده تا طول دو ضلع را تغییر بدهم.');expect(state.status).toBe('awaiting_feedback');expect(state.verification).toBe('passed');expect(state.answer?.conclusion).toContain('$5$');expect(state.uiScene).toMatchObject({kind:'triangle',legs:[3,4]});
});
it('produces a fresh AI repair for general math and asks a concrete follow-up when data is missing',async()=>{
  for(const needsClarification of [false,true]){
    const model:ModelAdapter={async generate(schema,name){const value=name==='analysis'?{kind:'problem',topic:'general',clarification:''}:name==='review'?{consistent:false,issue:'فرضی نادرست'}:name==='presentation'?{scene:null}:name==='recovery'?{answer:{introduction:'حل تازه',steps:[],conclusion:'نتیجه با فرض روشن'},needsClarification,clarification:'تابع موردنظر چیست؟'}:{introduction:'متن ردشده',steps:[],conclusion:'غلط'};return {value:schema.parse(value),inputTokens:1,outputTokens:1};}};
    const state=await createTutor(model).start('حد را حساب کن');expect(state.trace).toContain('recover_ai_answer');expect(state.status).toBe(needsClarification?'needs_clarification':'awaiting_feedback');expect(JSON.stringify(state.answer)).not.toContain('متن ردشده');expect(JSON.stringify(state.answer)).not.toContain('نتوانستم');expect(state.verification).toBe('inconclusive');
  }
});
it('recovers the screenshot derivative question with a verified calculation after both model reviews reject it',async()=>{
  const question='مشتق تابع را حساب کن، مراحل را توضیح بده و خط مماس متحرک را روی نمودار نشان بده. شیب مماس در (x=3) چقدر است؟ $f(x)=x^{2}-4x+3$';
  const model:ModelAdapter={async generate(schema,name){const value=name==='review'?{consistent:false,issue:'رد پاسخ'}:name==='presentation'?{scene:null}:{introduction:'پیش‌نویس ردشده',steps:[],conclusion:'غلط'};return {value:schema.parse(value),inputTokens:1,outputTokens:1};}};
  const state=await createTutor(model).start(question);expect(state.status).toBe('awaiting_feedback');expect(state.verification).toBe('passed');expect(state.trace).toContain('recover_verified_derivative');expect(state.answer?.conclusion).toContain('2x-6');expect(state.answer?.conclusion).toContain('شیب مماس $2$');expect(state.answer?.introduction).not.toContain('ردشده');expect(state.uiScene).toMatchObject({kind:'tangent',initialX:3,coefficients:[3,-4,1]});
});
it('does not substitute a first derivative for an unsupported mixed or higher-order request',async()=>{
  for(const question of ['مشتق دوم f(x)=x^2 را حساب کن','انتگرال و مشتق f(x)=x^2 را حساب کن']){
    const state=await createTutor().start(question);expect(state.trace).not.toContain('recover_verified_derivative');expect(state.tool).toBeNull();
  }
});
it('supplies previous conversation to analysis, teaching and review of a follow-up',async()=>{
  const history=[{role:'user' as const,content:'مشتق x^2'},{role:'assistant' as const,content:'با قاعده توان، مشتق 2x است.'}],seen:{name:string;data:unknown}[]=[];
  const model:ModelAdapter={async generate(schema,name,_instructions,data){seen.push({name,data});const value=name==='analysis'?{kind:'concept',topic:'derivative',clarification:''}:name==='review'?{consistent:true,issue:''}:name==='presentation'?{scene:null}:{introduction:'در مرحله دوم از قاعده توان استفاده کردیم.',steps:[],conclusion:'توان به ضریب تبدیل می‌شود.'};return {value:schema.parse(value),inputTokens:1,outputTokens:1};}};
  const state=await createTutor(model).start('مرحله دوم را توضیح بده','beginner',undefined,undefined,false,history);
  expect(state.status).toBe('awaiting_feedback');for(const name of ['analysis','concept','review'])expect((seen.find(call=>call.name===name)?.data as {history:unknown}).history).toEqual(history);
});
it('passes cancellation to a pending model call and never teaches a stopped answer',async()=>{
  const controller=new AbortController();let began!:()=>void;const started=new Promise<void>(resolve=>began=resolve);
  const model:ModelAdapter={async generate(_schema,_name,_instructions,_data,_image,signal){expect(signal).toBe(controller.signal);began();await new Promise((_,reject)=>signal!.addEventListener('abort',()=>reject(new Error('stopped')),{once:true}));throw new Error('unreachable');}};
  const running=createTutor(model,controller.signal).start('مشتق چیست؟');const rejected=expect(running).rejects.toThrow();await started;controller.abort();await rejected;
});
it('never passes RAG context to the model when sources are disabled, including reteaching',async()=>{
  const seen:{name:string;data:unknown}[]=[];
  const model:ModelAdapter={async generate(schema,name,_instructions,data){seen.push({name,data});const payload=name==='presentation'?{scene:null}:name==='analysis'?{kind:'concept',topic:'derivative',clarification:''}:name==='review'?{consistent:true,issue:''}:{introduction:'مشتق نرخ تغییر است.',steps:[],conclusion:'شیب مماس'};return {value:schema.parse(payload),inputTokens:1,outputTokens:1};}};
  const tutor=createTutor(model),state=await tutor.start('مشتق چیست؟');
  expect(state.retrievalStatus).toBe('disabled');expect(state.references).toEqual([]);expect(state.trace).not.toContain('retrieve_context');
  const next=await tutor.resume(state,'confused');expect(next.useSources).toBe(false);expect(next.references).toEqual([]);
  for(const name of ['concept','review','adaptation'])for(const call of seen.filter(call=>call.name===name))expect((call.data as {context:unknown[]}).context).toEqual([]);
});
it('uses structured model adapter and bounded repair before teaching',async()=>{
  let reviews=0;
  const model:ModelAdapter={async generate(schema,name){
    const payload=name==='presentation'?{scene:null}:name==='review'?{consistent:++reviews>1,issue:'یک مرحله نیاز به اصلاح دارد'}:{introduction:'توضیح',steps:[{explanation:'مرحله',latex:'x=2'}],conclusion:'پایان'};
    return {value:schema.parse(payload),inputTokens:20,outputTokens:10};
  }};
  const state=await createTutor(model).start('x^2-5x+6=0');
  expect(state.revisions).toBe(1);expect(state.trace).toContain('revise_answer');expect(state.verification).toBe('passed');expect(state.modelCalls).toBe(5);expect(state.inputTokens).toBe(100);
});
it('keeps source-mode rejection strict after two reviews',async()=>{
  const model:ModelAdapter={async generate(schema,name){return {value:schema.parse(name==='review'?{consistent:false,issue:'نادرست'}:{introduction:'توضیح',steps:[],conclusion:'جواب غلط'}),inputTokens:1,outputTokens:1};}};
  const state=await createTutor(model).start('x^2-5x+6=0','beginner',undefined,undefined,true);
  expect(state.status).toBe('failed');expect(state.trace).not.toContain('teach');expect(state.revisions).toBe(1);
});
it('passes retrieved source text into generation and review for the user question',async()=>{
  const seen:{name:string;data:unknown}[]=[];
  const model:ModelAdapter={async generate(schema,name,_instructions,data){
    seen.push({name,data});
    const payload=name==='presentation'?{scene:null}:name==='analysis'?{kind:'concept',topic:'general',clarification:''}:name==='review'?{consistent:true,issue:''}:{introduction:'توضیح وابسته به ورودی',steps:[],conclusion:'نتیجه'};
    return {value:schema.parse(payload),inputTokens:30,outputTokens:10};
  }};
  const question='انتگرال معین چه ارتباطی با مساحت دارد؟';
  const state=await createTutor(model).start(question,'beginner',undefined,undefined,true);
  expect(state.retrievalStatus).toBe('found');
  for(const name of ['concept','review']) {
    const data=seen.find(call=>call.name===name)?.data as {question:string;context:{text:string;url:string}[]};
    expect(data.question).toBe(question);expect(data.context.length).toBeGreaterThan(0);expect(data.context[0].text.length).toBeGreaterThan(50);expect(data.context[0].url).toContain('openstax.org');
  }
  expect(state.status).toBe('awaiting_feedback');
});
