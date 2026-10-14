import { test,expect } from '@playwright/test';
test('the screenshot compound derivative question solves with a tangent instead of a rejection notice',async({page})=>{
  await page.goto('/');await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('مشتق تابع را حساب کن، مراحل را توضیح بده و خط مماس متحرک را روی نمودار نشان بده. شیب مماس در (x=3) چقدر است؟ $f(x)=x^{2}-4x+3$');await page.getByRole('button',{name:'ارسال سؤال'}).click();
  await expect(page.locator('[data-component=tangent]')).toBeVisible();await expect(page.getByRole('slider',{name:'نقطه روی تابع'})).toHaveValue('3');await expect(page.getByText('f(3) = 0 · f′(3) = 2',{exact:true})).toBeVisible();await expect(page.getByText('نتوانستم جواب قابل اتکایی تأیید کنم.',{exact:false})).toHaveCount(0);
});
const baseline={runId:'11111111-1111-4111-8111-111111111111',question:'',status:'awaiting_feedback',answer:{introduction:'توضیح مفهوم',steps:[],conclusion:'با شکل کار کنید.'},visual:null,references:[],retrievalStatus:'empty',pending:'',verification:'inconclusive',verificationNote:'توضیح مدل، همراه نمایش محاسبه‌شده.',attempts:1,trace:['plan_visual','validate_visual','teach'],usage:{modelCalls:0,inputTokens:0,outputTokens:0},mode:'local'};
test('LangGraph streamed output renders through CopilotKit; tangent changes are local',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));let requests=0;
  page.on('request',r=>{if(r.url().endsWith('/api/tutor'))requests++;});
  await page.goto('/');await expect(page.getByRole('combobox',{name:'سطح آموزش'})).toHaveCount(0);
  await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('مشتق x^2');await page.getByRole('button',{name:'ارسال سؤال'}).click();
  await expect(page.locator('[data-component=tangent]')).toBeVisible();
  await page.getByRole('slider',{name:'نقطه روی تابع'}).fill('2');await expect(page.getByText('f(2) = 4 · f′(2) = 4',{exact:true})).toBeVisible();
  const before=requests;await page.getByRole('slider',{name:'نقطه روی تابع'}).fill('3');expect(requests).toBe(before);
  await page.getByRole('button',{name:'بازنشانی',exact:true}).click();await expect(page.getByRole('slider',{name:'نقطه روی تابع'})).toHaveValue('0');
  await page.screenshot({path:'test-results/screenshots/controlled-tangent-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'پایان درس',exact:true}).click();await expect(page.locator('[data-component]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('controlled geometry, integral and matrix render with computed values on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const scenes=[
    {kind:'triangle',title:'فیثاغورس',caption:'دو ضلع عمود هستند.',basis:'example',legs:[3,4]},
    {kind:'integral',title:'انتگرال',caption:'مساحت علامت‌دار زیر نمودار',basis:'example',coefficients:[0,0,1],bounds:[0,1]},
    {kind:'matrix',title:'تبدیل خطی',caption:'اثر ماتریس بر بردار',basis:'example',matrix:[[2,0],[0,1]]},
  ];let index=0;
  await page.route('**/api/tutor',async route=>{const data={...baseline,runId:crypto.randomUUID(),uiScene:scenes[index++]};await route.fulfill({contentType:'text/event-stream',headers:{'x-vercel-ai-ui-message-stream':'v1'},body:[{type:'start',messageId:crypto.randomUUID()},{type:'data-result',data},{type:'finish'}].map(chunk=>`data: ${JSON.stringify(chunk)}\n\n`).join('')+'data: [DONE]\n\n'});});
  await page.goto('/');
  for(const scene of scenes){await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('این مفهوم را با نمایش توضیح بده');await page.getByRole('button',{name:'ارسال سؤال'}).click();await expect(page.locator(`[data-component=${scene.kind}]`)).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await expect(page.getByText('(1, 1) → (2, 1)',{exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/screenshots/controlled-matrix-mobile.png',fullPage:true});
});
