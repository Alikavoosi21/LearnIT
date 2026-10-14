import { configuredModel } from '../lib/model';
import { UIProposal,componentCatalog } from '../lib/generative-ui';
try {
  const model=configuredModel();if(!model)throw new Error('Model not configured');
  const result=await model.generate(UIProposal,'presentation','برای مثلث قائم با اضلاع 3 و 4 یک scene از catalog انتخاب کن. basis=problem، عنوان و توضیح فارسی کوتاه. هیچ کدی تولید نکن.',{question:'در مثلث قائم با اضلاع 3 و 4 وتر را حساب کن',catalog:componentCatalog});
  console.log(JSON.stringify({component:result.value.scene?.kind,inputTokens:result.inputTokens,outputTokens:result.outputTokens}));
}catch(error){const e=error as {name?:string;status?:number;code?:string;message?:string};console.log(JSON.stringify({name:e.name,status:e.status,code:e.code,message:e.message?.replace(/[A-Za-z]{2}-[A-Za-z0-9*._-]{8,}/g,'[REDACTED]')}));process.exitCode=1;}
