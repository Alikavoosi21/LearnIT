import { randomUUID } from 'node:crypto';
import { createTutor, type AgentState } from './agent';
import { configuredModel } from './model';
import type { TutorRequest } from './contracts';
import { validateImage } from './image';
type Run={owner:string;state:AgentState;updated:number;events:Map<string,AgentState>;busy:boolean};
const globalStore=globalThis as typeof globalThis & {miloRuns?:Map<string,Run>};
const runs=globalStore.miloRuns??=new Map<string,Run>();
const ttl=60*60*1000;
export class ServiceError extends Error { constructor(message:string,public status:number){super(message);} }
function publicResult(id:string,state:AgentState) {
  return {runId:id,question:state.question,imageQuestion:state.imageQuestion,level:state.level,status:state.status,answer:state.answer,visual:state.visual,references:state.references,retrievalStatus:state.retrievalStatus,pending:state.pending,verification:state.verification,verificationNote:state.verificationNote,attempts:state.attempts,trace:state.trace,usage:{modelCalls:state.modelCalls,inputTokens:state.inputTokens,outputTokens:state.outputTokens},mode:process.env.TUTOR_MODE==='openai'?'openai':'local'};
}
export type TutorResult=ReturnType<typeof publicResult>;
export async function handleTutor(owner:string,request:TutorRequest) {
  for(const [id,run] of runs) if(Date.now()-run.updated>ttl&&!run.busy) runs.delete(id);
  const tutor=createTutor(configuredModel());
  if(request.action==='start') {
    if(request.image) {
      try {await validateImage(request.image);}catch(error){throw new ServiceError(error instanceof Error?error.message:'عکس معتبر نیست.',400);}
      if(process.env.TUTOR_MODE!=='openai') throw new ServiceError('برای خواندن عکس، حالت OpenAI و یک مدل با قابلیت بینایی را تنظیم کنید. می‌توانید فعلاً صورت مسئله را تایپ کنید.',422);
    }
    if(runs.size>=200) throw new ServiceError('ظرفیت نشست‌ها پر شده است؛ کمی بعد امتحان کنید.',503);
    const id=randomUUID();
    const initial={owner,state:null as unknown as AgentState,updated:Date.now(),events:new Map<string,AgentState>(),busy:true};
    runs.set(id,initial);
    try { initial.state=await tutor.start(request.question,request.level,request.image);initial.busy=false;initial.updated=Date.now();return publicResult(id,initial.state); }
    catch(error) {runs.delete(id);throw error;}
  }
  const run=runs.get(request.runId);
  if(!run||run.owner!==owner) throw new ServiceError('این نشست منقضی شده است. سؤال تازه‌ای شروع کنید.',404);
  const duplicate=run.events.get(request.eventId);
  if(duplicate) return publicResult(request.runId,duplicate);
  if(run.busy) throw new ServiceError('درخواست قبلی این سؤال هنوز در حال اجراست.',409);
  run.busy=true;
  try {
    const next=await tutor.resume(run.state,request.event,request.text);
    run.state=next;run.updated=Date.now();run.events.set(request.eventId,next);
    return publicResult(request.runId,next);
  } finally {run.busy=false;}
}
