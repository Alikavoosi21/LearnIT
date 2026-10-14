import { AbstractAgent } from '@ag-ui/client';
import { EventType, type BaseEvent, type RunAgentInput } from '@ag-ui/core';
import { Observable, EMPTY } from 'rxjs';
import { AgentRunner, type AgentRunnerRunRequest } from '@copilotkit/runtime/v2';
import { RequestBody } from './contracts';
import { handleTutor, ServiceError } from './service';

// Both UI transports invoke the SAME session service and LangGraph.
export class LearnITAgent extends AbstractAgent {
  constructor(private owner:string){super({agentId:'default',description:'LearnIT controlled mathematics tutor'});}
  run(input:RunAgentInput):Observable<BaseEvent>{
    return new Observable(subscriber=>{
      void (async()=>{
        const forwarded=input.forwardedProps as {request?:unknown}|undefined;
        const last=input.messages.filter(m=>m.role==='user').at(-1);
        const parsed=RequestBody.safeParse(forwarded?.request??{action:'start',question:typeof last?.content==='string'?last.content:'',level:'beginner'});
        if(!parsed.success)throw new ServiceError('صورت سؤال یا درخواست معتبر نیست.',400);
        subscriber.next({type:EventType.RUN_STARTED,threadId:input.threadId,runId:input.runId});
        const result=await handleTutor(this.owner,parsed.data,node=>subscriber.next({type:EventType.CUSTOM,name:'graph_progress',value:{node}}));
        subscriber.next({type:EventType.STATE_SNAPSHOT,snapshot:result});
        if(result.answer){const messageId=`answer-${result.runId}-${result.attempts}`;const content=[result.answer.introduction,...result.answer.steps.map(step=>[step.explanation,step.latex?`$$\n${step.latex}\n$$`:''].filter(Boolean).join('\n\n')),result.answer.conclusion].filter(Boolean).join('\n\n');subscriber.next({type:EventType.TEXT_MESSAGE_START,messageId,role:'assistant'});subscriber.next({type:EventType.TEXT_MESSAGE_CONTENT,messageId,delta:content});subscriber.next({type:EventType.TEXT_MESSAGE_END,messageId});}
        if(result.uiScene){const id=`scene-${result.runId}-${result.attempts}`;subscriber.next({type:EventType.TOOL_CALL_START,toolCallId:id,toolCallName:'display_math'});subscriber.next({type:EventType.TOOL_CALL_ARGS,toolCallId:id,delta:JSON.stringify({spec:result.uiScene})});subscriber.next({type:EventType.TOOL_CALL_END,toolCallId:id});subscriber.next({type:EventType.TOOL_CALL_RESULT,messageId:`result-${id}`,toolCallId:id,role:'tool',content:JSON.stringify({validated:true})});}
        subscriber.next({type:EventType.RUN_FINISHED,threadId:input.threadId,runId:input.runId});subscriber.complete();
      })().catch(error=>{subscriber.next({type:EventType.RUN_ERROR,message:error instanceof ServiceError?error.message:'اجرای ایجنت کامل نشد.'});subscriber.complete();});
    });
  }
}
// Session ownership/persistence live in our service; do not share a global
// CopilotKit replay store across anonymous cookies.
export class SessionRunner extends AgentRunner {
  run(request:AgentRunnerRunRequest){return request.agent.run(request.input);}
  connect(){return EMPTY;}
  async isRunning(){return false;}
  async stop(){return false;}
}
