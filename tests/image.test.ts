import { it,expect } from 'vitest';
import sharp from 'sharp';
import { RequestBody,MAX_IMAGE_BYTES } from '../lib/contracts';
import { validateImage } from '../lib/image';
import { handleTutor } from '../lib/service';
import { createTutor } from '../lib/agent';
import type { ModelAdapter } from '../lib/model';
const image={name:'question.png',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='};
it('accepts image-only requests but rejects empty requests and remote image URLs',()=>{
  expect(RequestBody.safeParse({action:'start',image}).success).toBe(true);
  expect(RequestBody.safeParse({action:'start',question:''}).success).toBe(false);
  expect(RequestBody.safeParse({action:'start',image:{...image,dataUrl:'https://example.com/photo'}}).success).toBe(false);
});
it('validates decoded type, byte limit and dimensions',async()=>{
  await expect(validateImage(image)).resolves.toBeUndefined();
  await expect(validateImage({...image,dataUrl:'data:image/jpeg;base64,'+image.dataUrl.split(',')[1]})).rejects.toThrow();
  await expect(validateImage({...image,dataUrl:'data:image/png;base64,'+Buffer.from('not an image').toString('base64')})).rejects.toThrow();
  await expect(validateImage({...image,dataUrl:'data:image/png;base64,'+Buffer.alloc(MAX_IMAGE_BYTES+1).toString('base64')})).rejects.toThrow();
  const huge=await sharp({create:{width:5000,height:4000,channels:3,background:'white'}}).png().toBuffer();
  await expect(validateImage({...image,dataUrl:'data:image/png;base64,'+huge.toString('base64')})).rejects.toThrow();
});
it('explains the model requirement in local mode without creating a fake solution',async()=>{
  await expect(handleTutor('image-owner',{action:'start',question:'',level:'beginner',image})).rejects.toMatchObject({status:422});
});
it('reads an image once, routes its question and removes image bytes from retained state',async()=>{
  const calls:{name:string;imageUrl?:string}[]=[];
  const model:ModelAdapter={async generate(schema,name,_instructions,_data,imageUrl){
    calls.push({name,imageUrl});
    const payload=name==='presentation'?{scene:null}:name==='image_reading'?{legible:true,question:'x^2-5x+6=0',clarification:''}:name==='review'?{consistent:true,issue:''}:{introduction:'حل معادله',steps:[],conclusion:'دو ریشه'};
    return {value:schema.parse(payload),inputTokens:30,outputTokens:10};
  }};
  const tutor=createTutor(model),state=await tutor.start('','beginner',image);
  expect(state.trace.slice(0,3)).toEqual(['entry','read_image','analyze_question']);
  expect(state.inputImage).toBeNull();expect(state.imageQuestion).toBe('x^2-5x+6=0');expect(state.tool?.values).toEqual([2,3]);
  expect(calls.filter(c=>c.imageUrl)).toEqual([{name:'image_reading',imageUrl:image.dataUrl}]);
  const end=await tutor.resume(state,'understood');expect(end.modelCalls).toBe(4);expect(end.inputTokens).toBe(120);
});
it('asks for clarification on unreadable images instead of solving a guessed expression',async()=>{
  const model:ModelAdapter={async generate(schema){return {value:schema.parse({legible:false,question:'',clarification:'ضریب x خوانا نیست؛ آن را بنویسید.'}),inputTokens:40,outputTokens:10};}};
  const state=await createTutor(model).start('','beginner',image);
  expect(state.status).toBe('needs_clarification');expect(state.trace).not.toContain('solve_problem');expect(state.inputImage).toBeNull();expect(state.verification).not.toBe('passed');
});
