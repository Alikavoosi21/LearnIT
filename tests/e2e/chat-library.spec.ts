import { test,expect } from '@playwright/test';
test('projects and chats can be created, renamed, persisted, deleted and restored',async({page})=>{
  test.setTimeout(60000);
  await page.goto('/');
  await expect(page.getByRole('button',{name:'سؤال تازه',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'ساخت پروژه',exact:true}).click();
  await page.getByRole('textbox',{name:'نام پروژه',exact:true}).fill('جبر');
  await page.getByRole('dialog').getByRole('button',{name:'ساخت پروژه',exact:true}).click();
  await expect(page.getByRole('heading',{name:'جبر',exact:true})).toBeVisible();
  await page.locator('.main-panel').getByRole('button',{name:'چت جدید',exact:true}).click();
  await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('2x+4=0');await page.getByRole('button',{name:'ارسال سؤال'}).click();
  await expect(page.locator('.answer')).toHaveCount(1);
  await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('3x+6=0');await page.getByRole('button',{name:'ارسال سؤال'}).click();await expect(page.locator('.answer')).toHaveCount(2);
  await expect(page.locator('.recent-item')).toHaveCount(1);
  await page.locator('.main-top').getByRole('button',{name:/مدیریت چت/}).click();await page.getByRole('menuitem',{name:'تغییر نام چت',exact:true}).click();
  await page.getByRole('textbox',{name:'نام چت',exact:true}).fill('تمرین معادلات');await page.getByRole('dialog').getByRole('button',{name:'ذخیره',exact:true}).click();
  await page.reload();await expect(page.locator('.answer')).toHaveCount(2);await expect(page.locator('.main-top')).toContainText('تمرین معادلات');
  await page.getByRole('button',{name:'ویرایش آخرین پیام',exact:true}).click();await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('3x+12=0');await page.getByRole('button',{name:'ارسال سؤال'}).click();await expect(page.locator('.answer')).toHaveCount(2);
  await expect(page.locator('.question').last()).toContainText('3x+12=0');
  await page.getByRole('button',{name:'گفت‌وگوها',exact:true}).click();
  await page.locator('.chat-row').getByRole('button',{name:/مدیریت چت/}).click();await page.getByRole('menuitem',{name:'حذف چت',exact:true}).click();
  await expect(page.locator('.chat-row')).toHaveCount(0);await page.getByRole('button',{name:'بازگردانی',exact:true}).click();await expect(page.locator('.chat-row')).toHaveCount(1);
  await page.getByRole('button',{name:'جبر',exact:true}).click();await page.getByRole('button',{name:'مدیریت پروژه',exact:true}).click();await page.getByRole('menuitem',{name:'تغییر نام پروژه',exact:true}).click();
  await page.getByRole('textbox',{name:'نام پروژه',exact:true}).fill('جبر خطی');await page.getByRole('dialog').getByRole('button',{name:'ذخیره',exact:true}).click();
  await expect(page.getByRole('heading',{name:'جبر خطی',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/screenshots/chat-library-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'مدیریت پروژه',exact:true}).click();await page.getByRole('menuitem',{name:'حذف پروژه',exact:true}).click();
  await expect(page.locator('.chat-row')).toHaveCount(1);await expect(page.locator('.chat-row')).toContainText('بدون پروژه');
  await page.getByRole('button',{name:'بازگردانی',exact:true}).click();await expect(page.locator('.chat-row')).toContainText('جبر خطی');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/screenshots/chat-library-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('follow-up history belongs to the current chat and edit replaces only its last turn',async({page})=>{
  const sent:{question:string;history:{role:string;content:string}[]}[]=[];
  page.on('request',request=>{if(request.url().endsWith('/api/tutor'))sent.push(request.postDataJSON());});
  await page.goto('/');for(const question of ['2x+4=0','3x+6=0']){await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill(question);await page.getByRole('button',{name:'ارسال سؤال'}).click();await expect(page.getByRole('button',{name:'توقف پاسخ'})).toHaveCount(0);await expect(page.locator('.answer')).toHaveCount(sent.length);}
  expect(sent[0].history).toEqual([]);expect(sent[1].history.some(message=>message.role==='user'&&message.content==='2x+4=0')).toBe(true);
  await page.getByRole('button',{name:'ویرایش آخرین پیام',exact:true}).click();await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('3x+12=0');await page.getByRole('button',{name:'ارسال سؤال'}).click();await expect(page.locator('.answer')).toHaveCount(2);await expect(page.getByRole('button',{name:'توقف پاسخ'})).toHaveCount(0);
  expect(sent[2].history.some(message=>message.content==='3x+6=0')).toBe(false);
  await page.getByRole('button',{name:'چت جدید',exact:true}).first().click();await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('4x+8=0');await page.getByRole('button',{name:'ارسال سؤال'}).click();await expect(page.locator('.recent-item')).toHaveCount(2);expect(sent[3].history).toEqual([]);
});
test('stop preserves the draft and suppresses incomplete response output',async({page})=>{
  await page.route('**/api/tutor',async route=>{await new Promise(resolve=>setTimeout(resolve,1500));await route.abort().catch(()=>{});});
  await page.goto('/');await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('مشتق x^2');await page.getByRole('button',{name:'ارسال سؤال'}).click();await page.getByRole('button',{name:'توقف پاسخ',exact:true}).click();
  await expect(page.getByText('پاسخ متوقف شد؛',{exact:false})).toBeVisible();await expect(page.getByRole('textbox',{name:'سؤال ریاضی'})).toHaveValue('مشتق x^2');await expect(page.getByRole('button',{name:'ارسال سؤال'})).toBeEnabled();await expect(page.locator('.answer')).toHaveCount(0);
});
test('chat menus can move a conversation and answer actions persist a local report',async({page})=>{
  await page.goto('/');await page.getByRole('textbox',{name:'سؤال ریاضی'}).fill('2x+4=0');await page.getByRole('button',{name:'ارسال سؤال'}).click();await expect(page.locator('.answer')).toHaveCount(1);
  await page.getByRole('button',{name:'پاسخ دوباره',exact:true}).click();await expect(page.getByRole('button',{name:'توقف پاسخ'})).toHaveCount(0);await expect(page.locator('.answer')).toHaveCount(1);
  await page.getByRole('button',{name:'پاسخ اشتباه است',exact:true}).click();await expect(page.getByText('بازخورد در این مرورگر ذخیره شد.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'ساخت پروژه',exact:true}).click();await page.getByRole('textbox',{name:'نام پروژه'}).fill('تمرین‌ها');await page.getByRole('dialog').getByRole('button',{name:'ساخت پروژه',exact:true}).click();
  await page.getByRole('button',{name:'گفت‌وگوها',exact:true}).click();await page.locator('.chat-row').getByRole('button',{name:/مدیریت چت/}).click();await page.getByRole('menuitem',{name:'انتقال به پروژه',exact:true}).click();await page.getByRole('combobox',{name:'انتخاب پروژه'}).click();await page.getByRole('option',{name:'تمرین‌ها',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'انتقال',exact:true}).click();await expect(page.locator('.chat-row')).toContainText('تمرین‌ها');
  await page.reload();await page.getByRole('button',{name:'گفت‌وگوها',exact:true}).click();await expect(page.locator('.chat-row')).toContainText('تمرین‌ها');await page.locator('.chat-row-open').click();await expect(page.getByRole('button',{name:'گزارش ثبت شد',exact:true})).toBeDisabled();
});
