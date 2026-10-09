import { it,expect } from 'vitest';
import { retrieveReferences } from '../lib/retrieval';
import { load } from 'cheerio';
import { mathmlToLatex } from '../scripts/mathml';
import { createTutor } from '../lib/agent';
it.each([
  ['دنباله همگرا چیست؟',['sequences']],
  ['شعاع همگرایی سری توانی چیست؟',['power-series']],
  ['معادله دیفرانسیل تفکیک پذیر چیست؟',['separable-equations']],
  ['دترمینان با قاعده کرامر چیست؟',['determinants']],
  ['حذف گاوس در دستگاه معادلات چیست؟',['linear-systems']],
  ['جدول ارزش گزاره در منطق چیست؟',['logic']],
  ['زیرمجموعه و مجموعه تهی چیست؟',['sets']],
  ['راس و یال در نظریه گراف چیست؟',['graph-theory','graph-structures']],
  ['کانون بیضی چیست؟',['ellipse']],
  ['انتگرال دوگانه و قضیه فوبینی چیست؟',['double-integrals']],
])('retrieves relevant source sections for %s',async(question,expected)=>{
  const refs=await retrieveReferences(question);expect(refs.some(r=>expected.includes(r.sourceId))).toBe(true);
  expect(refs.reduce((n,r)=>n+r.text.length,0)).toBeLessThanOrEqual(3600);
});
it('routes new math subjects into RAG instead of requesting unnecessary clarification',async()=>{
  const state=await createTutor().start('نظریه گراف چیست؟');expect(state.trace).toContain('retrieve_context');expect(state.retrievalStatus).toBe('found');expect(state.trace).not.toContain('clarify_question');
});
it('never solves differential equations as polynomial root questions',async()=>{
  const state=await createTutor().start('معادله دیفرانسیل y\'=x^2 را حل کن');expect(state.analysis?.topic).toBe('general');expect(state.tool).toBeNull();expect(state.references.length).toBeGreaterThan(0);
});
it('retrieves Persian questions reproducibly with provenance and bounded context',async()=>{
  const first=await retrieveReferences('انتگرال معین چه ارتباطی با مساحت دارد؟');
  const second=await retrieveReferences('انتگرال معین چه ارتباطی با مساحت دارد؟');
  expect(first.map(r=>r.id)).toEqual(second.map(r=>r.id));
  expect(first.some(r=>r.sourceId==='integrals')).toBe(true);
  expect(first.length).toBeLessThanOrEqual(3);
  expect(first.reduce((n,r)=>n+r.text.length,0)).toBeLessThanOrEqual(3600);
  for(const r of first){expect(new URL(r.url).hostname).toBe('openstax.org');expect(r.license).toBe('CC BY-NC-SA 4.0');}
});
it('returns no invented references for an unrelated query',async()=>{expect(await retrieveReferences('zzzznonexistenttopic')).toEqual([]);});
it('retains fraction and powers without duplicated MathML annotations',()=>{
  const $=load('<math><semantics><mfrac><msup><mi>x</mi><mn>2</mn></msup><mn>3</mn></mfrac><annotation-xml><mi>duplicated</mi></annotation-xml></semantics></math>',{xmlMode:true});
  expect(mathmlToLatex($,$('math')[0])).toBe('\\frac{{x}^{2}}{3}');
});
