import { expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { handleTutor } from '../lib/service';
import { chatHistory,decodeLibrary,encodeLibrary,type Chat } from '../lib/chat-library';
import { ChatHistory } from '../lib/contracts';
it('persists validated chats and project membership without original photo bytes',async()=>{
  const result=await handleTutor('library-test',{action:'start',question:'2x+4=0',level:'beginner'});
  const project={id:randomUUID(),name:'جبر'},chat:Chat={id:result.runId,title:'معادله',projectId:project.id,question:result.question,updated:Date.now(),results:[{...result,userText:result.question,image:{name:'photo.png',dataUrl:'data:image/png;base64,AAAA'}}]};
  const encoded=encodeLibrary([chat],[project],chat.id);expect(encoded).not.toContain('data:image');
  const decoded=decodeLibrary(encoded);expect(decoded.selected).toBe(chat.id);expect(decoded.chats[0].projectId).toBe(project.id);expect(decoded.chats[0].results[0].answer).toEqual(result.answer);
  const detached=decodeLibrary(encodeLibrary([chat],[],randomUUID()));expect(detached.chats[0].projectId).toBeNull();expect(detached.selected).toBeNull();
  expect(()=>decodeLibrary('{broken')).toThrow();
});
it('bounds conversational context and excludes the edited turn',async()=>{
  const result=await handleTutor('history-test',{action:'start',question:'2x+4=0',level:'beginner'});
  const chat:Chat={id:result.runId,title:'معادلات',projectId:null,question:result.question,updated:Date.now(),results:Array.from({length:8},(_,i)=>({...result,userText:`سؤال ${i}`}))};
  expect(chatHistory(chat)).toHaveLength(6);expect(chatHistory(chat)[0].content).toBe('سؤال 5');
  expect(chatHistory(chat,1)[0].content).toBe('سؤال 0');expect(chatHistory(chat,0)).toEqual([]);
  expect(ChatHistory.safeParse(Array.from({length:7},()=>({role:'user',content:'x'}))).success).toBe(false);
});
