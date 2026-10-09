import { it,expect } from 'vitest';
import { createTutor } from '../lib/agent';
import type { ModelAdapter } from '../lib/model';
it('uses structured model adapter and bounded repair before teaching',async()=>{
  let reviews=0;
  const model:ModelAdapter={async generate(schema,name){
    const payload=name==='review'?{consistent:++reviews>1,issue:'یک مرحله نیاز به اصلاح دارد'}:{introduction:'توضیح',steps:[{explanation:'مرحله',latex:'x=2'}],conclusion:'پایان'};
    return {value:schema.parse(payload),inputTokens:20,outputTokens:10};
  }};
  const state=await createTutor(model).start('x^2-5x+6=0');
  expect(state.revisions).toBe(1);expect(state.trace).toContain('revise_answer');expect(state.verification).toBe('passed');expect(state.modelCalls).toBe(4);expect(state.inputTokens).toBe(80);
});
it('never teaches a draft rejected twice',async()=>{
  const model:ModelAdapter={async generate(schema,name){return {value:schema.parse(name==='review'?{consistent:false,issue:'نادرست'}:{introduction:'توضیح',steps:[],conclusion:'جواب غلط'}),inputTokens:1,outputTokens:1};}};
  const state=await createTutor(model).start('x^2-5x+6=0');
  expect(state.status).toBe('failed');expect(state.trace).not.toContain('teach');expect(state.revisions).toBe(1);
});
it('passes retrieved source text into generation and review for the user question',async()=>{
  const seen:{name:string;data:unknown}[]=[];
  const model:ModelAdapter={async generate(schema,name,_instructions,data){
    seen.push({name,data});
    const payload=name==='analysis'?{kind:'concept',topic:'general',clarification:''}:name==='review'?{consistent:true,issue:''}:{introduction:'توضیح وابسته به ورودی',steps:[],conclusion:'نتیجه'};
    return {value:schema.parse(payload),inputTokens:30,outputTokens:10};
  }};
  const question='انتگرال معین چه ارتباطی با مساحت دارد؟';
  const state=await createTutor(model).start(question);
  expect(state.retrievalStatus).toBe('found');
  for(const name of ['concept','review']) {
    const data=seen.find(call=>call.name===name)?.data as {question:string;context:{text:string;url:string}[]};
    expect(data.question).toBe(question);expect(data.context.length).toBeGreaterThan(0);expect(data.context[0].text.length).toBeGreaterThan(50);expect(data.context[0].url).toContain('openstax.org');
  }
  expect(state.status).toBe('awaiting_feedback');
});
