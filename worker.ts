import { createInterface } from 'node:readline';
import { RequestBody } from './lib/contracts';
import { handleTutor } from './lib/service';
const lines=createInterface({input:process.stdin});
// Sequential RPC keeps one CLI session's events ordered; stdout is JSON only.
for await(const line of lines) {
  try {const request=RequestBody.parse(JSON.parse(line));console.log(JSON.stringify({ok:true,result:await handleTutor('python-cli',request)}));}
  catch {console.log(JSON.stringify({ok:false,error:'اجرای درخواست ناموفق بود. ورودی و تنظیمات مدل را بررسی کنید.'}));}
}
