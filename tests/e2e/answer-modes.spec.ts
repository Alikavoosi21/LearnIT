import { test,expect } from '@playwright/test';

test('direct solving skips app sources while the selected source mode retrieves them',async({page})=>{
  const requests:boolean[]=[];
  page.on('request',request=>{if(request.url().endsWith('/api/tutor')){const body=request.postDataJSON();if(body.action==='start')requests.push(body.useSources);}});
  await page.goto('/');
  await expect(page.getByRole('radio',{name:'استفاده از هوش مصنوعی برای حل',exact:true})).toHaveAttribute('aria-checked','true');
  await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('x^2-5x+6=0');
  await page.getByRole('button',{name:'ارسال سؤال'}).click();
  await expect(page.getByText('حل بدون منابع اپ',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/منابع بازیابی‌شده/})).toHaveCount(0);
  await page.getByRole('button',{name:'چت جدید',exact:true}).first().click();
  await page.getByRole('radio',{name:'استفاده از منابع اپ',exact:true}).click();
  await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('x^2-5x+6=0');
  await page.getByRole('button',{name:'ارسال سؤال'}).click();
  await page.getByRole('button',{name:/منابع بازیابی‌شده/}).click();
  await expect(page.locator('.source-reference').first()).toBeVisible();
  expect(requests).toEqual([false,true]);
});

test('connection errors preserve the draft and retry the original request',async({page})=>{
  const requests:unknown[]=[];
  await page.route('**/api/tutor',async route=>{
    requests.push(route.request().postDataJSON());
    if(requests.length===1){await route.fulfill({status:503,contentType:'text/plain',body:'ارتباط موقتاً برقرار نشد.'});return;}
    const result={runId:crypto.randomUUID(),question:'2x+4=0',status:'awaiting_feedback',answer:{introduction:'پاسخ دریافت شد',steps:[],conclusion:'x=-2'},visual:null,uiScene:null,references:[],retrievalStatus:'disabled',verification:'passed',verificationNote:'',attempts:1,trace:['teach'],usage:{modelCalls:0,inputTokens:0,outputTokens:0}};
    await route.fulfill({contentType:'text/event-stream',headers:{'x-vercel-ai-ui-message-stream':'v1'},body:[{type:'start',messageId:crypto.randomUUID()},{type:'data-result',data:result},{type:'finish'}].map(part=>`data: ${JSON.stringify(part)}\n\n`).join('')+'data: [DONE]\n\n'});
  });
  await page.goto('/');await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('2x+4=0');
  await page.getByRole('button',{name:'ارسال سؤال'}).click();
  await expect(page.getByRole('alert').filter({hasText:'ارتباط موقتاً برقرار نشد.'})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'سؤال ریاضی'})).toHaveValue('2x+4=0');
  await page.getByRole('button',{name:'تلاش دوباره',exact:true}).click();
  await expect(page.getByText('پاسخ دریافت شد',{exact:true})).toBeVisible();
  expect(requests).toHaveLength(2);expect(requests[1]).toEqual(requests[0]);
});
