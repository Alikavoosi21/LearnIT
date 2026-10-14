import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { CopilotRuntime,createCopilotRuntimeHandler } from '@copilotkit/runtime/v2';
import { LearnITAgent,SessionRunner } from '@/lib/copilot-agent';
export const runtime='nodejs';
async function handler(request:NextRequest){
  const origin=request.headers.get('origin');if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:'مبدأ درخواست معتبر نیست.'},{status:403});
  if(Number(request.headers.get('content-length')??0)>4*1024*1024+16000)return NextResponse.json({error:'درخواست بزرگ‌تر از حد مجاز است.'},{status:413});
  const previous=request.cookies.get('milo-session')?.value;
  const owner=previous&&/^[a-f0-9-]{36}$/.test(previous)?previous:randomUUID();
  let incoming:Request=request;
  if(request.method==='POST'&&request.body){
    const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4*1024*1024+16000){await reader.cancel();return NextResponse.json({error:'درخواست بزرگ‌تر از حد مجاز است.'},{status:413});}chunks.push(value);}
    incoming=new Request(request.url,{method:'POST',headers:request.headers,body:Buffer.concat(chunks).toString('utf8'),signal:request.signal});
  }
  const copilotRuntime=new CopilotRuntime({agents:{default:new LearnITAgent(owner)},runner:new SessionRunner()});
  const endpoint=createCopilotRuntimeHandler({runtime:copilotRuntime,basePath:'/api/copilotkit'});
  const response=await endpoint(incoming);
  if(request.nextUrl.pathname.endsWith('/run'))response.headers.append('Set-Cookie',`milo-session=${owner}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${process.env.NODE_ENV==='production'?'; Secure':''}`);
  response.headers.set('Cache-Control','no-store');return response;
}
export const GET=handler;
export const POST=handler;
