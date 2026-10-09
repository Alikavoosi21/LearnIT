import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { RequestBody } from '@/lib/contracts';
import { handleTutor, ServiceError } from '@/lib/service';
export const runtime='nodejs';
const maxBody=4*1024*1024+16000;
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
