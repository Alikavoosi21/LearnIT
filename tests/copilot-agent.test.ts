import { it,expect } from 'vitest';
import { firstValueFrom,toArray } from 'rxjs';
import { EventType } from '@ag-ui/core';
import { LearnITAgent } from '../lib/copilot-agent';
it('exposes the same LangGraph session through AG-UI with controlled tool events',async()=>{
  const events=await firstValueFrom(new LearnITAgent('copilot-owner').run({threadId:'thread',runId:'run',messages:[{id:'question',role:'user',content:'مشتق x^2'}],state:{},tools:[],context:[],forwardedProps:{}}).pipe(toArray()));
  expect(events[0].type).toBe(EventType.RUN_STARTED);expect(events.at(-1)?.type).toBe(EventType.RUN_FINISHED);
  const snapshot=events.find(e=>e.type===EventType.STATE_SNAPSHOT);expect(snapshot&&'snapshot' in snapshot?(snapshot.snapshot as {uiScene:{kind:string}}).uiScene.kind:null).toBe('tangent');
  expect(events.some(e=>e.type===EventType.CUSTOM)).toBe(true);expect(events.some(e=>e.type===EventType.TOOL_CALL_RESULT)).toBe(true);
});
it('rejects invalid forwarded actions without running a free-form chatbot',async()=>{
  const events=await firstValueFrom(new LearnITAgent('copilot-owner').run({threadId:'thread',runId:'run',messages:[],state:{},tools:[],context:[],forwardedProps:{request:{action:'execute_code',code:'alert(1)'}}}).pipe(toArray()));
  expect(events).toHaveLength(1);expect(events[0].type).toBe(EventType.RUN_ERROR);
});
