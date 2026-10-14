import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { handleTutor } from '../lib/service';
describe('session ownership and event application',()=>{
  it('defaults to direct solving and preserves a deliberate source choice on resume',async()=>{
    const direct=await handleTutor('sources-test',{action:'start',question:'x^2-5x+6=0',level:'beginner'});
    expect(direct.retrievalStatus).toBe('disabled');expect(direct.references).toEqual([]);expect(direct.trace).not.toContain('retrieve_context');
    const sourced=await handleTutor('sources-test',{action:'start',question:'x^2-5x+6=0',level:'beginner',useSources:true});
    expect(sourced.retrievalStatus).toBe('found');expect(sourced.references.length).toBeGreaterThan(0);
    const next=await handleTutor('sources-test',{action:'resume',runId:sourced.runId,eventId:randomUUID(),event:'confused',text:''});
    expect(next.references).toEqual(sourced.references);
  });
  it('isolates owners and makes repeated feedback idempotent',async()=>{
    const started=await handleTutor('alice',{action:'start',question:'x^2-5x+6=0',level:'beginner'});
    const event={action:'resume' as const,runId:started.runId,eventId:randomUUID(),event:'confused' as const,text:''};
    await expect(handleTutor('bob',event)).rejects.toThrow('منقضی');
    const first=await handleTutor('alice',event),second=await handleTutor('alice',event);
    expect(first.attempts).toBe(2);expect(second.attempts).toBe(2);expect(second.trace).toEqual(first.trace);
  });
});
