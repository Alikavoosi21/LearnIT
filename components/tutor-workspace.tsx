'use client';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowUp, BookOpen, Check, ChevronDown, CirclePlus, Menu, MessageSquare, RotateCcw, X, Paperclip, Sigma } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupTextarea } from '@/components/ui/input-group';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MAX_IMAGE_BYTES, type Teaching, type VisualSpec, type TutorRequest, type TutorImage } from '@/lib/contracts';
import type { TutorResult } from '@/lib/service';
import { MathContent } from './math-content';
import { MathVisual } from './math-visual';
const MathKeyboard=dynamic(()=>import('./math-keyboard').then(m=>m.MathKeyboard),{ssr:false});
type Lesson={id:string;question:string;image?:TutorImage;results:TutorResult[]};
const routeNames:Record<string,string>={read_image:'خواندن عکس',entry:'شروع',analyze_question:'تحلیل سؤال',solve_problem:'ابزار حل',prepare_concept:'آماده‌سازی مفهوم',verify_result:'بررسی نتیجه',revise_answer:'اصلاح جواب',plan_visual:'انتخاب نمایش',validate_visual:'بررسی نمایش',teach:'آموزش',assess_understanding:'بررسی بازخورد',adapt_teaching:'تغییر روش آموزش',encourage:'بازخورد مثبت',finalize:'پایان',clarify_question:'رفع ابهام',retrieve_context:'بازیابی منابع'};
  function Answer({answer,visual,result}:{answer:Teaching|null;visual:VisualSpec|null;result?:TutorResult}) {
    return <article className="answer">
      {answer&&<><MathContent>{answer.introduction}</MathContent>{answer.steps.map((step,i)=><div className="teaching-step" key={i}><MathContent>{step.explanation}</MathContent>{step.latex&&<div className="equation" dir="ltr"><MathContent>{`$$\n${step.latex}\n$$`}</MathContent></div>}</div>)}<MathContent>{answer.conclusion}</MathContent></>}
      {visual&&<Collapsible defaultOpen className="plot-section"><CollapsibleTrigger className="plot-trigger"><ChevronDown size={17}/> نمایش {visual.kind==='plot2d'?'نمودار':'بردارها'}</CollapsibleTrigger><CollapsibleContent><MathVisual spec={visual}/></CollapsibleContent></Collapsible>}
      {result&&result.references.length>0&&<Collapsible className="sources-section">
        <CollapsibleTrigger className="sources-trigger"><BookOpen size={16}/> منابع بازیابی‌شده <ChevronDown size={14}/></CollapsibleTrigger>
        <CollapsibleContent>
          {result.references.map(reference=><section key={reference.id} className="source-reference">
            <a href={reference.url} target="_blank" rel="noreferrer" dir="auto">{reference.book} · {reference.title}</a>
            <details><summary>بخش مرتبط از منبع</summary><div dir="ltr" lang="en" className="source-excerpt"><MathContent>{reference.text}</MathContent></div></details>
          </section>)}
          <p className="source-license">متن منابع و اقتباس‌های آن: OpenStax، Rice University · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a>. قطعه‌بندی و حذف تمرین‌ها برای بازیابی انجام شده است. منبع بازیابی‌شده به‌تنهایی تأیید صحت جواب نیست.</p>
        </CollapsibleContent>
      </Collapsible>}
      {result&&result.retrievalStatus==='unavailable'&&<p className="retrieval-notice">دسترسی به ایندکس منابع ممکن نشد؛ این پاسخ از RAG استفاده نکرده است.</p>}
      {result&&<div className="verification"><Collapsible><CollapsibleTrigger className="verification-trigger">{result.verification==='passed'?<Check size={18}/>:<ChevronDown size={18}/>} {result.verification==='passed'?'بررسی با ابزار محاسبه':result.verification==='inconclusive'?'تأیید مستقل نشده':result.status==='needs_clarification'?'نیاز به توضیح بیشتر':'وضعیت پاسخ'} <ChevronDown size={14}/></CollapsibleTrigger><CollapsibleContent><p>{result.verificationNote}</p><p className="trace">{result.trace.map(n=>routeNames[n]??n).join(' ← ')}</p>{result.usage.modelCalls>0&&<p>{result.usage.modelCalls} فراخوانی مدل · {result.usage.inputTokens} توکن ورودی · {result.usage.outputTokens} توکن خروجی، مجموع این سؤال</p>}</CollapsibleContent></Collapsible></div>}
    </article>;
  }
export function TutorWorkspace({mode}:{mode:string}) {
  const [lessons,setLessons]=useState<Lesson[]>([]),[selected,setSelected]=useState<string|null>(null),[tab,setTab]=useState('learn'),[menu,setMenu]=useState(false);
  const [input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const scrollEnd=useRef<HTMLDivElement>(null);
  const fileInput=useRef<HTMLInputElement>(null);
  const [image,setImage]=useState<TutorImage|undefined>(),[readingFile,setReadingFile]=useState(false),[mathOpen,setMathOpen]=useState(false);
  const active=lessons.find(l=>l.id===selected),latest=active?.results.at(-1);
  async function send(request:TutorRequest,question?:string) {
    if(busy)return;
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'پاسخ دریافت نشد.');
      const result=data as TutorResult;
      if(request.action==='start') {setLessons(ls=>[{id:result.runId,question:question||'سؤال از عکس',image:request.image,results:[result]},...ls]);setSelected(result.runId);}
      else setLessons(ls=>ls.map(l=>l.id===result.runId?{...l,results:[...l.results,result]}:l));
      setInput('');setImage(undefined);setMathOpen(false);setTab('learn');setMenu(false);if(request.action==='resume'&&request.event==='skip')setSelected(null);setTimeout(()=>scrollEnd.current?.scrollIntoView({behavior:'smooth',block:'end'}),30);
    }catch(e){setError(e instanceof Error?e.message:'خطای اتصال. دوباره تلاش کنید.');}finally{setBusy(false);}
  }
  const start=(question:string)=>send({action:'start',question,level:'beginner',image},question);
  const feedback=(event:'understood'|'confused'|'skip')=>latest&&send({action:'resume',runId:latest.runId,eventId:crypto.randomUUID(),event,text:''});
  function submit(e:FormEvent) {e.preventDefault();if(readingFile||(!input.trim()&&!image))return;if(latest?.status==='needs_clarification'&&!image)void send({action:'resume',runId:latest.runId,eventId:crypto.randomUUID(),event:'clarification',text:input});else void start(input);}
  function newLesson(){setSelected(null);setInput('');setImage(undefined);setMathOpen(false);setTab('learn');setMenu(false);setError('');}
  async function chooseImage(file?:File){
    if(!file)return;setError('');
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('عکس باید PNG، JPEG یا WebP باشد.');return;}
    if(file.size>MAX_IMAGE_BYTES){setError('حجم عکس باید حداکثر ۳ مگابایت باشد.');return;}
    setReadingFile(true);
    try{const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('خواندن فایل انجام نشد.'));reader.readAsDataURL(file);});setImage({name:file.name.slice(0,180)||'image',dataUrl});}
    catch(e){setError(e instanceof Error?e.message:'خواندن عکس انجام نشد.');}finally{setReadingFile(false);}
  }
  function insertFormula(latex:string,plain:string){const formula=mode==='openai'?`$${latex}$`:plain;setInput(previous=>[previous,formula].filter(Boolean).join('\n').slice(0,2000));setMathOpen(false);}
  const sidebar=(mobile=false)=><aside className={`sidebar ${mobile?'mobile-sidebar':''}`} aria-label="ناوبری اصلی"><div className="brand"><img src="/brand/learnit.svg" alt="LearnIT" width="180" height="56"/><Button className="close-menu" variant="ghost" size="icon" onClick={()=>setMenu(false)} aria-label="بستن فهرست"><X/></Button></div>
      <nav>{[{key:'learn',label:'یادگیری',icon:BookOpen},{key:'history',label:'گفت‌وگوها',icon:MessageSquare}].map(item=><button key={item.key} className={`nav-item ${tab===item.key?'active':''}`} onClick={()=>{setTab(item.key);setMenu(false);}} aria-current={tab===item.key?'page':undefined}><item.icon size={21}/>{item.label}</button>)}</nav>
      <Button variant="ghost" className="new-lesson" onClick={newLesson} disabled={busy}><CirclePlus size={18}/> سؤال تازه</Button>
      <div className="recent"><h2>درس‌های این نشست</h2>{lessons.length?lessons.slice(0,8).map(lesson=><button key={lesson.id} disabled={busy} className={`recent-item ${selected===lesson.id?'selected':''}`} onClick={()=>{setSelected(lesson.id);setTab('learn');setMenu(false);setError('');}}>{lesson.question.length>62?lesson.question.slice(0,62)+'…':lesson.question}</button>):<p className="empty-history">اولین سؤال شما، آغاز یک درس است.</p>}</div>
      <div className="sidebar-bottom"><span className="mode-label">{mode==='openai'?'پاسخ‌گویی با OpenAI':'حالت محلی · بدون کلید'}</span><p>درس‌ها با پایان نشست سرور پاک می‌شوند.</p></div>
    </aside>;
  return <div className="workspace">
    <header className="mobile-header"><Button variant="ghost" size="icon" onClick={()=>setMenu(!menu)} aria-label="باز کردن فهرست"><Menu/></Button><img src="/brand/learnit.svg" alt="LearnIT" width="148" height="46"/><Button variant="ghost" size="icon" onClick={newLesson} aria-label="سؤال تازه"><CirclePlus/></Button></header>
    {sidebar()}
    <Sheet open={menu} onOpenChange={setMenu}><SheetContent side="right" className="mobile-sheet"><SheetTitle className="sr-only">فهرست LearnIT</SheetTitle><SheetDescription className="sr-only">انتخاب صفحه و ادامه درس‌های این نشست</SheetDescription>{sidebar(true)}</SheetContent></Sheet>
    <main className="main-panel">
      <div className="main-top"><span>{tab==='history'?'گفت‌وگوهای این نشست':'قدم‌به‌قدم، تا روشن شود'}</span></div>
      <div className="lesson-scroll" aria-busy={busy}>
        <div className="lesson-width">
          {tab==='learn' ? (
            active ? <>
              {active.results.map((result,i)=>!result.answer&&!result.visual?null:<section key={i}>
                {i===0&&<div className="question">{active.image&&<img className="question-image" src={active.image.dataUrl} alt="عکس صورت مسئله"/>}<MathContent>{active.question}</MathContent>{result.imageQuestion&&<details className="image-transcription"><summary>صورت مسئله خوانده‌شده از عکس</summary><MathContent>{result.imageQuestion}</MathContent></details>}</div>}
                {i>0&&<p className="feedback-label">{result.trace.at(-1)==='finalize'?'پایان درس':'ادامه یادگیری'}</p>}
                <Answer answer={result.answer} visual={result.visual} result={result}/>
              </section>)}
              {latest?.status==='awaiting_feedback'&&<div className="feedback">
                <Button disabled={busy} onClick={()=>feedback('understood')}>فهمیدم <Check size={16}/></Button>
                <Button variant="ghost" disabled={busy} onClick={()=>feedback('confused')}><RotateCcw size={16}/> دوباره توضیح بده</Button>
                <Button variant="ghost" disabled={busy} onClick={()=>feedback('skip')}>پایان درس</Button>
              </div>}
              {latest&&['completed','failed'].includes(latest.status)&&<Button variant="outline" onClick={newLesson}>شروع سؤال تازه</Button>}
            </> : <section className="start-learning">
              <h1>از سؤال شما شروع می‌کنیم.</h1>
              <p>مسئله یا مفهوم ریاضی‌تان را بنویسید؛ آن را بررسی و قدم‌به‌قدم توضیح می‌دهیم.</p>
            </section>
          ) : <section className="library">
            <h1>گفت‌وگوهای شما</h1>
            <p>{lessons.length?'درس موردنظر را ادامه دهید.':'هنوز سؤالی نپرسیده‌اید. یادگیری با سؤال خود شما شروع می‌شود.'}</p>
            {lessons.map(l=><button className="history-row" key={l.id} disabled={busy} onClick={()=>{setSelected(l.id);setTab('learn');}}>{l.question}<MessageSquare size={18}/></button>)}
            {!lessons.length&&<Button onClick={newLesson}>نوشتن سؤال</Button>}
          </section>}

          {busy&&<p className="working" role="status"><span className="spinner"/> در حال تحلیل و بررسی پاسخ…</p>}
          {error&&<div className="error" role="alert">{error}<Button variant="ghost" onClick={()=>setError('')} aria-label="بستن پیام خطا"><X size={16}/></Button></div>}
          <div ref={scrollEnd}/>
        </div>
      </div>
      <div className="composer-container">
        {mathOpen&&<MathKeyboard onInsert={insertFormula} disabled={busy||readingFile}/>}
        {image&&<div className="attachment-preview"><img src={image.dataUrl} alt="پیش‌نمایش عکس انتخاب‌شده"/><div><p dir="auto">{image.name}</p><span>{mode==='openai'?'عکس همراه سؤال برای OpenAI ارسال می‌شود.':'خواندن عکس به اتصال OpenAI نیاز دارد.'}</span></div><Button type="button" variant="ghost" size="icon" disabled={busy} onClick={()=>setImage(undefined)} aria-label="حذف عکس"><X/></Button></div>}
        <form onSubmit={submit}>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label="انتخاب عکس مسئله" className="sr-only" tabIndex={-1} disabled={busy||readingFile} onChange={e=>{void chooseImage(e.target.files?.[0]);e.target.value='';}}/>
          <InputGroup className="composer">
            <InputGroupTextarea value={input} onChange={e=>setInput(e.target.value)} placeholder={image?'در صورت نیاز، درباره عکس توضیح دهید…':latest?.status==='needs_clarification'?'توضیح تکمیلی را بنویسید…':'سؤال ریاضی‌تان را بنویسید…'} aria-label={latest?.status==='needs_clarification'?'پاسخ تکمیلی':'سؤال ریاضی'} maxLength={2000} disabled={busy||readingFile} onPaste={e=>{const file=[...e.clipboardData.files].find(f=>f.type.startsWith('image/'));if(file){e.preventDefault();void chooseImage(file);}}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/>
            <InputGroupAddon align="block-end" className="composer-actions">
              <Button type="button" variant="ghost" size="icon" disabled={busy||readingFile} onClick={()=>fileInput.current?.click()} aria-label="پیوست عکس" title="پیوست عکس"><Paperclip/></Button>
              <Button type="button" variant="ghost" size="icon" disabled={busy||readingFile} onClick={()=>setMathOpen(!mathOpen)} aria-label="صفحه‌کلید ریاضی" aria-expanded={mathOpen} title="صفحه‌کلید ریاضی"><Sigma/></Button>
              <span className="composer-action-note">{readingFile?'در حال خواندن فایل…':image?'عکس آماده ارسال':'متن، عکس یا فرمول'}</span>
              <Button size="icon" type="submit" disabled={busy||readingFile||(!input.trim()&&!image)} aria-label="ارسال سؤال"><ArrowUp/></Button>
            </InputGroupAddon>
          </InputGroup>
        </form>
        <p className="composer-note">{mode==='openai'?'متن و عکس سؤال برای OpenAI ارسال می‌شود. ':'حالت محلی: جبر تا درجه دو، مشتق مقدماتی و جمع بردار. '}فرمول را می‌توانید با اعداد فارسی هم بنویسید.</p>
      </div>
    </main>
  </div>;
}
