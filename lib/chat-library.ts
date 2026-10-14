import { z } from 'zod';
import { Draft,Level,Visual,ChatHistory,type TutorImage } from './contracts';
import { UIScene } from './generative-ui';
import { Reference } from './reference-contract';
import type { TutorResult } from './service';
export type ChatReply=TutorResult & {userText?:string;image?:TutorImage;reported?:boolean};
export type Chat={id:string;title:string;projectId:string|null;question:string;results:ChatReply[];updated:number};
export type Project={id:string;name:string};
export const LIBRARY_KEY='learnit.chat-library.v1';
const resultSchema=z.object({
  runId:z.string().uuid(),question:z.string(),imageQuestion:z.string().default(''),level:Level.default('beginner'),
  status:z.enum(['running','needs_clarification','awaiting_feedback','completed','failed']),answer:Draft.nullable(),visual:Visual.nullable(),
  uiSchemaVersion:z.literal(1).default(1),uiScene:UIScene.nullable().default(null),uiNote:z.string().default(''),references:z.array(Reference).max(3),
  retrievalStatus:z.enum(['pending','found','empty','unavailable','disabled']),pending:z.string().default(''),
  verification:z.enum(['pending','passed','inconclusive','failed']),verificationNote:z.string(),attempts:z.number(),trace:z.array(z.string()),
  usage:z.object({modelCalls:z.number(),inputTokens:z.number(),outputTokens:z.number()}),mode:z.string().default('local'),userText:z.string().optional(),reported:z.boolean().optional(),
});
const librarySchema=z.object({version:z.literal(1),projects:z.array(z.object({id:z.string().uuid(),name:z.string().min(1).max(80)})).max(100),chats:z.array(z.object({id:z.string().uuid(),title:z.string().min(1).max(80),projectId:z.string().uuid().nullable(),question:z.string(),results:z.array(resultSchema).max(200),updated:z.number()})).max(100),selected:z.string().uuid().nullable()});
export function decodeLibrary(text:string){
  if(text.length>4_000_000)throw new Error('Library too large');
  const data=librarySchema.parse(JSON.parse(text));
  const projects=new Set(data.projects.map(p=>p.id));
  return {...data,chats:data.chats.map(chat=>({...chat,projectId:chat.projectId&&projects.has(chat.projectId)?chat.projectId:null})),selected:data.chats.some(chat=>chat.id===data.selected)?data.selected:null};
}
export function encodeLibrary(chats:Chat[],projects:Project[],selected:string|null){
  // Keep text/transcription and visual data. Original photos stay in page memory.
  const text=JSON.stringify({version:1,projects,chats:chats.map(chat=>({...chat,results:chat.results.map(({image,...reply})=>reply)})),selected});
  if(text.length>4_000_000)throw new Error('Library too large');
  return text;
}
export function chatHistory(chat:Chat|undefined,limit=chat?.results.length??0):z.infer<typeof ChatHistory>{
  const messages:z.infer<typeof ChatHistory>=[];
  for(const reply of chat?.results.slice(0,limit)??[]){
    if(reply.userText)messages.push({role:'user',content:[reply.userText,reply.imageQuestion].filter(Boolean).join('\n').slice(0,1800)});
    if(reply.answer)messages.push({role:'assistant',content:[reply.answer.introduction,...reply.answer.steps.map(s=>`${s.explanation}\n${s.latex}`),reply.answer.conclusion].join('\n').slice(0,1800)});
  }
  return messages.slice(-6);
}
