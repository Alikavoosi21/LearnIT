import { test,expect } from '@playwright/test';
test('new chat shows six mathematical previews without running the tutor and prepares the selected question',async({page})=>{
  const requests:string[]=[];page.on('request',request=>{if(request.url().endsWith('/api/tutor'))requests.push(request.url());});
  await page.goto('/');await expect(page.locator('.starter-card')).toHaveCount(6);await expect(page.locator('.starter-preview')).toHaveCount(6);expect(requests).toHaveLength(0);
  await page.screenshot({path:'test-results/screenshots/new-chat-previews-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'انتخاب نمونه هندسه و فیثاغورس',exact:true}).click();await expect(page.getByRole('textbox',{name:'سؤال ریاضی'})).toHaveValue(/مثلث قائم/);await expect(page.getByRole('textbox',{name:'سؤال ریاضی'})).toBeFocused();expect(requests).toHaveLength(0);await expect(page.locator('.answer')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});await page.locator('.lesson-scroll').evaluate(element=>element.scrollTop=0);await page.screenshot({path:'test-results/screenshots/new-chat-previews-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
