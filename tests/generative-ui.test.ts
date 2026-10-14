import { expect,it } from 'vitest';
import { UIScene,validateScene,derivativeAt,integralBetween,sceneForTool,type MathScene } from '../lib/generative-ui';
import { solve } from '../lib/math';
import { createTutor } from '../lib/agent';
import type { ModelAdapter } from '../lib/model';
import { zodTextFormat } from 'openai/helpers/zod';
import { UIProposal } from '../lib/generative-ui';
import { sceneForQuestion,scenePolynomial } from '../lib/generative-ui';
const compoundQuestion='مشتق تابع f(x)=x^2-4x+3 را حساب کن، مراحل را توضیح بده و خط مماس متحرک را روی نمودار نشان بده. شیب مماس در x=3 چقدر است؟';
it('extracts explicit function data and preserves the requested tangent contact',()=>{
  expect(scenePolynomial(compoundQuestion)).toEqual([3,-4,1]);
  const fallback=sceneForQuestion(compoundQuestion)!;
  expect(fallback).toMatchObject({kind:'tangent',coefficients:[3,-4,1],initialX:3});
  expect(validateScene(fallback,compoundQuestion,null)).toEqual(fallback);
  expect(scenePolynomial('f(x)=x^2/2')).toBeNull();
  expect(scenePolynomial('f(x)=x^2+sin(x)')).toBeNull();
  expect(scenePolynomial('f(x)=x^2\nf(x)=x+1')).toBeNull();
});
it('renders a source-derived tangent even when model UI is rejected and removes TikZ',async()=>{
  const model:ModelAdapter={async generate(schema,name){const data=name==='analysis'?{kind:'problem',topic:'derivative',clarification:''}:name==='presentation'?{scene:{...scene,coefficients:[0,0,9]}}:name==='review'?{consistent:true,issue:''}:{introduction:'مشتق',steps:[{explanation:'\\begin{tikzpicture}bad diagram\\end{tikzpicture}',latex:''}],conclusion:'شیب ۲ است'};return {value:schema.parse(data),inputTokens:10,outputTokens:10};}};
  const state=await createTutor(model).start(compoundQuestion);
  expect(state.uiScene).toMatchObject({kind:'tangent',coefficients:[3,-4,1],initialX:3});
  expect(JSON.stringify(state.answer)).not.toContain('tikzpicture');
  expect(state.uiNote).toBe('');
});
const scene:MathScene={kind:'tangent',basis:'problem',title:'مماس',caption:'شیب را ببینید.',coefficients:[0,0,1],domain:[-5,5],initialX:2};
it('serializes the presentation contract for real strict Structured Outputs',()=>{
  expect(()=>zodTextFormat(UIProposal,'presentation')).not.toThrow();
  expect(UIProposal.safeParse({scene:{...scene,domain:[-5]}}).success).toBe(false);
});
it('rejects unregistered components, arbitrary props and malformed ranges',()=>{
  expect(UIScene.safeParse({...scene,kind:'iframe'}).success).toBe(false);expect(UIScene.safeParse({...scene,code:'alert(1)'}).success).toBe(false);
  expect(validateScene({...scene,domain:[5,-5]},'مشتق x^2',null)).toBeNull();expect(validateScene({...scene,initialX:8},'مشتق x^2',null)).toBeNull();
});
it('rejects a scene that changes a verified problem or quietly adds polynomial terms',()=>{
  const tool=solve('مشتق x^2','derivative')!;
  expect(validateScene(scene,'مشتق x^2',tool)).toEqual(scene);
  expect(validateScene({...scene,coefficients:[0,1,1]},'مشتق x^2',tool)).toBeNull();
  expect(validateScene({...scene,coefficients:[0,0,1,4]},'مشتق x^2',null)).toBeNull();
  expect(validateScene({...scene,kind:'function'},'مشتق x^2',tool)).toBeNull(); // strict schema rejects initialX on function
});
it('computes tangent and signed polynomial integral independently',()=>{
  expect(derivativeAt([0,0,1],2)).toBe(4);expect(integralBetween([0,0,1],0,1)).toBeCloseTo(1/3);
  expect(integralBetween([0,1],-1,1)).toBe(0);
});
it('bounds generated examples and ensures tool fallbacks also validate',()=>{
  expect(validateScene({kind:'triangle',basis:'example',title:'مثال',caption:'قائم',legs:[3,4]},'',null)?.kind).toBe('triangle');
  expect(validateScene({kind:'triangle',basis:'problem',title:'مثال',caption:'قائم',legs:[3,4]},'مثلث با اضلاع 7 و 8',null)).toBeNull();
  const tool=solve('مشتق x^2-20x','derivative')!,fallback=sceneForTool(tool)!;expect(validateScene(fallback,'مشتق x^2-20x',tool)).toEqual(fallback);
});
it('streams real graph progress and keeps the final session state',async()=>{
  const nodes:string[]=[];const state=await createTutor().start('مشتق x^2','beginner',undefined,node=>nodes.push(node));
  expect(nodes).toEqual(state.trace);expect(state.uiScene?.kind).toBe('tangent');expect(state.status).toBe('awaiting_feedback');
});
it('lets the model choose a controlled scene and falls back if it changes tool data',async()=>{
  const model:ModelAdapter={async generate(schema,name){const data=name==='presentation'?{scene:{...scene,coefficients:[0,0,9]}}:name==='review'?{consistent:true,issue:''}:{introduction:'مشتق',steps:[],conclusion:'پایان'};return {value:schema.parse(data),inputTokens:10,outputTokens:10};}};
  const state=await createTutor(model).start('مشتق x^2');expect(state.uiScene?.kind).toBe('tangent');expect(state.uiScene&&'coefficients' in state.uiScene?state.uiScene.coefficients:null).toEqual([0,0,1]);expect(state.uiNote).toBe('');
});
it('clears a previous scene if a later explanation fails verification',async()=>{
  let reviews=0;const model:ModelAdapter={async generate(schema,name){const data=name==='presentation'?{scene}:name==='review'?{consistent:++reviews===1,issue:'رد'}:{introduction:'مشتق',steps:[],conclusion:'پایان'};return {value:schema.parse(data),inputTokens:10,outputTokens:10};}};
  const tutor=createTutor(model),state=await tutor.start('مشتق x^2','beginner',undefined,undefined,true);expect(state.uiScene).not.toBeNull();
  const end=await tutor.resume(state,'confused');expect(end.status).toBe('failed');expect(end.uiScene).toBeNull();expect(end.visual).toBeNull();
});
