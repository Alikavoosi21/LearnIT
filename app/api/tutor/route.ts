import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { RequestBody } from '@/lib/contracts';
import { handleTutor, ServiceError } from '@/lib/service';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import type { TutorUIMessage } from '@/lib/ui-messages';
export const runtime='nodejs';
const maxBody=4*1024*1024+64000;
export async function POST(request:NextRequest) {
  const origin=request.headers.get('origin');
  if(origin&&origin!==request.nextUrl.origin) return NextResponse.json({error:'مبدأ درخواست معتبر نیست.'},{status:403});
  if(Number(request.headers.get('content-length')??0)>maxBody) return NextResponse.json({error:'درخواست بزرگ‌تر از حد مجاز است.'},{status:413});
  let body;
  try {
    const reader=request.body?.getReader();if(!reader)throw new Error('Empty body');
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBody){await reader.cancel();return NextResponse.json({error:'درخواست بزرگ‌تر از حد مجاز است.'},{status:413});}chunks.push(value);}
    body=RequestBody.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  }
  catch {return NextResponse.json({error:'ساختار درخواست معتبر نیست.'},{status:400});}
  if(!body.success) return NextResponse.json({error:'متن سؤال یا نوع درخواست معتبر نیست.'},{status:400});
  const previous=request.cookies.get('milo-session')?.value;
  const owner=previous&&/^[a-f0-9-]{36}$/.test(previous)?previous:randomUUID();
  if(request.headers.get('accept')?.includes('text/event-stream')) {
    const cancellation=new AbortController();
    const signal=AbortSignal.any([request.signal,cancellation.signal]);
    const stream=createUIMessageStream<TutorUIMessage>({execute:async({writer})=>{
      writer.write({type:'start',messageId:randomUUID()});
      const result=await handleTutor(owner,body.data,node=>writer.write({type:'data-progress',data:{node},transient:true}),signal);
      if(result.uiScene){const toolCallId=`scene-${result.runId}-${result.attempts}`;writer.write({type:'tool-input-available',toolCallId,toolName:'display_math',input:{spec:result.uiScene},dynamic:true});writer.write({type:'tool-output-available',toolCallId,output:{validated:true},dynamic:true});}
      writer.write({type:'data-result',data:result});writer.write({type:'finish'});
    },onError:error=>error instanceof ServiceError?error.message:'اجرای معلم کامل نشد. تنظیمات مدل و اتصال را بررسی کنید و دوباره تلاش کنید.'});
    const reader=stream.getReader();
    const cancelable=new ReadableStream({async pull(controller){try{const next=await reader.read();if(next.done)controller.close();else controller.enqueue(next.value);}catch(error){controller.error(error);}},cancel(reason){cancellation.abort();return reader.cancel(reason);}});
    const response=createUIMessageStreamResponse({stream:cancelable});
    response.headers.set('Cache-Control','no-store');
    response.headers.append('Set-Cookie',`milo-session=${owner}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${process.env.NODE_ENV==='production'?'; Secure':''}`);
    return response;
  }
  try {
    const result=await handleTutor(owner,body.data);
    const response=NextResponse.json(result);
    response.headers.set('Cache-Control','no-store');
    response.cookies.set('milo-session',owner,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:3600});
    return response;
  } catch(error) {
    const status=error instanceof ServiceError?error.status:500;
    const message=error instanceof ServiceError?error.message:'اجرای معلم کامل نشد. تنظیمات مدل و اتصال را بررسی کنید و دوباره تلاش کنید.';
    return NextResponse.json({error:message},{status});
  }
}
