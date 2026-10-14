import { describe,it,expect } from 'vitest';
import { createTutor } from '../lib/agent';
import { polynomial,solve,verifyTool } from '../lib/math';
describe('independent math',()=>{
  it('does not concatenate factors or separate numbers',()=>{
    expect(polynomial('مشتق 2*3x')).toBeNull();expect(polynomial('2 3x=0')).toBeNull();
    expect(polynomial('2**x=0')).toBeNull();expect(polynomial('2*x+4=0')).toEqual([4,2,0]);
    expect(polynomial('x^2 در x=2')).toBeNull();
  });
  it('requires all distinct roots in verification',()=>{
    const result=solve('x^2-5x+6=0','quadratic')!;
    expect(verifyTool({...result,values:[2]})).toBe(false);
    expect(verifyTool({...result,values:[2,2]})).toBe(false);
  });
  it('normalizes Persian digits and both sides',()=>{expect(polynomial('حل کن: ۲x² - ۱۰x + ۱۲ = ۰')).toEqual([12,-10,2]);expect(polynomial('x^2 = 5x - 6')).toEqual([6,-5,1]);});
  it('handles repeated, absent real, and linear roots',()=>{expect(solve('x^2-4x+4=0','quadratic')?.values).toEqual([2]);expect(solve('x^2+1=0','quadratic')?.realRoots).toBe(false);expect(solve('2x+4=0','quadratic')?.values).toEqual([-2]);});
  it('rejects unsafe and unsupported expressions',()=>{expect(polynomial('sin(x)=0')).toBeNull();expect(polynomial('x^3-1=0')).toBeNull();expect(polynomial('1/x=0')).toBeNull();expect(polynomial('process.exit()')).toBeNull();});
  it('computes derivative and vector result independently',()=>{expect(solve('مشتق x^2-5x+6','derivative')?.values).toEqual([-5,2]);expect(solve('جمع بردار (2,1) و (1,3)','vector')?.values).toEqual([3,4]);});
  it('detects deliberately corrupted roots',()=>{const result=solve('x^2-5x+6=0','quadratic')!;expect(verifyTool(result)).toBe(true);expect(verifyTool({...result,values:[8]})).toBe(false);});
});
describe('graph and feedback',()=>{
  it('closes a lesson without repeating its answer or visual or calling a model',async()=>{
    const tutor=createTutor(),state=await tutor.start('x^2-5x+6=0');
    const end=await tutor.resume(state,'skip');expect(end.status).toBe('completed');expect(end.answer).toBeNull();expect(end.visual).toBeNull();expect(end.pending).toBe('');expect(end.modelCalls).toBe(state.modelCalls);expect(end.trace.at(-1)).toBe('close_lesson');
  });
  it.each(['انتگرال x^2 را حساب کن','حد x^2 را حساب کن','مقدار x^2+1 در x=2','مشتق دوم x^2','مشتق x^2 در x=2'])('never substitutes root solving for %s',async question=>{
    const state=await createTutor().start(question);expect(state.tool).toBeNull();expect(state.visual).toBeNull();expect(state.verification).not.toBe('passed');
  });
  it('routes a conceptual question containing an equation to explanation',async()=>{
    const state=await createTutor().start('چرا x^2-5x+6=0 دو ریشه دارد؟');expect(state.analysis?.kind).toBe('concept');expect(state.trace).toContain('prepare_concept');expect(state.tool).toBeNull();
  });
  it('routes user problem through optional RAG, tools, verification and teaching',async()=>{const state=await createTutor().start('x^2-5x+6=0','beginner',undefined,undefined,true);expect(state.tool?.values).toEqual([2,3]);expect(state.verification).toBe('passed');expect(state.status).toBe('awaiting_feedback');expect(state.trace).toEqual(['entry','analyze_question','retrieve_context','solve_problem','verify_result','plan_visual','validate_visual','teach']);expect(state.references.length).toBeGreaterThan(0);expect(state.modelCalls).toBe(0);});
  it('retrieves concept sources without pretending a generated answer exists',async()=>{const state=await createTutor().start('مشتق چیست؟','beginner',undefined,undefined,true);expect(state.trace).toContain('prepare_concept');expect(state.trace).not.toContain('solve_problem');expect(state.verification).toBe('inconclusive');expect(state.references.some(r=>r.sourceId.includes('derivative'))).toBe(true);expect(state.status).toBe('completed');});
  it('adapts at most three times and ends the run',async()=>{const tutor=createTutor();let state=await tutor.start('x^2-5x+6=0');state=await tutor.resume(state,'confused');expect(state.attempts).toBe(2);expect(state.trace).toContain('adapt_teaching');state=await tutor.resume(state,'confused');expect(state.attempts).toBe(3);state=await tutor.resume(state,'confused');expect(state.status).toBe('completed');await expect(tutor.resume(state,'confused')).rejects.toThrow();});
  it('asks for clarification then solves in same state',async()=>{const tutor=createTutor();const state=await tutor.start('حل کن');expect(state.status).toBe('needs_clarification');const next=await tutor.resume(state,'clarification','x^2-5x+6=0');expect(next.verification).toBe('passed');expect(next.clarifications).toBe(1);});
  it('honors explicit understanding',async()=>{const tutor=createTutor();const state=await tutor.start('2x+4=0');const end=await tutor.resume(state,'understood');expect(end.status).toBe('completed');expect(end.trace).toContain('encourage');});
});
