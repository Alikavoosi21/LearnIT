import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { handleTutor } from '../lib/service';
describe('session ownership and event application',()=>{
  it('isolates owners and makes repeated feedback idempotent',async()=>{
    const started=await handleTutor('alice',{action:'start',question:'x^2-5x+6=0',level:'beginner'});
    const event={action:'resume' as const,runId:started.runId,eventId:randomUUID(),event:'confused' as const,text:''};
    await expect(handleTutor('bob',event)).rejects.toThrow('منقضی');
    const first=await handleTutor('alice',event),second=await handleTutor('alice',event);
    expect(first.attempts).toBe(2);expect(second.attempts).toBe(2);expect(second.trace).toEqual(first.trace);
  });
});
