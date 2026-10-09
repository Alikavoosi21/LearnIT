import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createTutor } from './lib/agent';
import { configuredModel } from './lib/model';
async function main() {
  const tutor=createTutor(configuredModel());
  const args=process.argv.slice(2);
  const json=args.includes('--json'),oneShot=args.includes('--once')||json;
  const question=args.filter(x=>!['--json','--once'].includes(x)).join(' ');
  const rl=createInterface({input:stdin,output:stdout});
  if(!json) console.log(process.env.TUTOR_MODE==='openai'?'LearnIT · متن سؤال برای OpenAI ارسال می‌شود.':'LearnIT · حالت محلی، بدون فراخوانی مدل');
  const show=(state:Awaited<ReturnType<typeof tutor.start>>)=>{
    if(json) {console.log(JSON.stringify(state));return;}
    if(state.answer) {console.log('\n'+state.answer.introduction);for(const [i,step] of state.answer.steps.entries()) console.log(`${i+1}. ${step.explanation}\n   ${step.latex}`);console.log(state.answer.conclusion);}
    console.log(`\nبررسی: ${state.verificationNote}\nمسیر: ${state.trace.join(' → ')}`);
  };
  try {
    let state=await tutor.start(question||await rl.question('سؤال ریاضی: '));show(state);
    while(!oneShot&&['awaiting_feedback','needs_clarification'].includes(state.status)) {
      if(state.status==='needs_clarification') state=await tutor.resume(state,'clarification',await rl.question('توضیح تکمیلی: '));
      else {const feedback=await rl.question('فهمیدم / نفهمیدم / رد کردن: ');state=await tutor.resume(state,/نفهم|confused/i.test(feedback)?'confused':/فهمید|understood/i.test(feedback)?'understood':'skip',feedback);}
      show(state);
    }
  } finally {rl.close();}
}
main().catch(()=>{console.error('اجرای معلم ناموفق بود؛ ورودی، اتصال و تنظیمات مدل را بررسی کنید.');process.exitCode=1;});
