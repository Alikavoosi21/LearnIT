'use client';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowUp, BookOpen, Check, ChevronDown, Menu, MessageSquare, RotateCcw, X, Paperclip, Sigma, Sparkles, Copy,Folder,Plus,Pencil,Square } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useMemo } from 'react';
import type { TutorUIMessage } from '@/lib/ui-messages';
import { ControlledUIProvider, ControlledMath } from './controlled-math';
import { Button } from '@/components/ui/button';
import { Conversation, ConversationContent, ConversationScrollButton } from './ai-elements/conversation';
import { Sources, SourcesTrigger, SourcesContent, Source } from './ai-elements/sources';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { InputGroup, InputGroupAddon, InputGroupTextarea } from '@/components/ui/input-group';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MAX_IMAGE_BYTES, type Teaching, type VisualSpec, type TutorRequest, type TutorImage } from '@/lib/contracts';
import type { TutorResult } from '@/lib/service';
import { MathContent } from './math-content';
import { MathVisual } from './math-visual';
import { useChatLibrary } from './use-chat-library';
import { ChatLibraryPanel,ChatActions,NameDialog,MoveChatDialog,type LibraryActions } from './chat-library-panel';
import { chatHistory,type Chat,type Project } from '@/lib/chat-library';
import { NewChatIntro } from './new-chat-intro';
const MathKeyboard=dynamic(()=>import('./math-keyboard').then(m=>m.MathKeyboard),{ssr:false});
const routeNames:Record<string,string>={recover_ai_answer:'تکمیل راه‌حل',recover_verified_derivative:'حل مستقل مشتق',skip_context:'حل بدون منابع اپ',read_image:'خواندن عکس',entry:'شروع',analyze_question:'تحلیل سؤال',solve_problem:'حل مسئله',prepare_concept:'آماده‌سازی مفهوم',verify_result:'بررسی نتیجه',revise_answer:'اصلاح جواب',plan_visual:'انتخاب نمایش',validate_visual:'بررسی نمایش',teach:'آموزش',assess_understanding:'بررسی بازخورد',adapt_teaching:'تغییر روش آموزش',encourage:'بازخورد مثبت',finalize:'پایان',clarify_question:'رفع ابهام',retrieve_context:'بازیابی منابع'};
  function Answer({answer,visual,result,onRegenerate,onReport,reported,disabled}:{answer:Teaching|null;visual:VisualSpec|null;result?:TutorResult;onRegenerate?:()=>void;onReport?:()=>void;reported?:boolean;disabled?:boolean}) {
    const [copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
    async function copyAnswer(){if(!answer)return;try{await navigator.clipboard.writeText([answer.introduction,...answer.steps.map(step=>[step.explanation,step.latex].filter(Boolean).join('\n')),answer.conclusion].filter(Boolean).join('\n\n'));setCopied(true);setCopyError(false);setTimeout(()=>setCopied(false),2000);}catch{setCopyError(true);}}
    return <article className="answer">
      <div className="answer-meta"><span>{result?.retrievalStatus==='disabled'?'حل بدون منابع اپ':result?.references.length?'پاسخ با منابع اپ':'پاسخ LearnIT'}</span>{answer&&<Button variant="ghost" size="sm" onClick={()=>void copyAnswer()} aria-label="کپی پاسخ">{copied?<Check/>:<Copy/>}{copied?'کپی شد':'کپی پاسخ'}</Button>}</div>
      {copyError&&<p role="status">دسترسی به کلیپ‌بورد ممکن نشد؛ متن پاسخ را انتخاب و کپی کنید.</p>}
      {onRegenerate&&<div className="reply-actions"><Button disabled={disabled} variant="ghost" size="sm" onClick={onRegenerate}><RotateCcw/> پاسخ دوباره</Button><Button disabled={disabled||reported} variant="ghost" size="sm" onClick={onReport}>{reported?'گزارش ثبت شد':'پاسخ اشتباه است'}</Button>{reported&&<span>بازخورد در این مرورگر ذخیره شد.</span>}</div>}
      {answer&&<><MathContent>{answer.introduction}</MathContent>{answer.steps.map((step,i)=><div className="teaching-step" key={i}><MathContent>{step.explanation}</MathContent>{step.latex&&<div className="equation" dir="ltr"><MathContent>{`$$\n${step.latex}\n$$`}</MathContent></div>}</div>)}<MathContent>{answer.conclusion}</MathContent></>}
      {result?.uiScene?<ControlledMath scene={result.uiScene} id={`scene-${result.runId}-${result.attempts}`}/>:visual&&<Collapsible defaultOpen className="plot-section"><CollapsibleTrigger className="plot-trigger"><ChevronDown size={17}/> نمایش {visual.kind==='plot2d'?'نمودار':'بردارها'}</CollapsibleTrigger><CollapsibleContent><MathVisual spec={visual}/></CollapsibleContent></Collapsible>}
      {result?.uiNote&&<p className="visual-note">{result.uiNote}</p>}
      {result&&result.references.length>0&&<Sources className="sources-section">
        <SourcesTrigger count={result.references.length} className="sources-trigger"><BookOpen size={16}/> منابع بازیابی‌شده ({result.references.length}) <ChevronDown size={14}/></SourcesTrigger>
        <SourcesContent>
          {result.references.map(reference=><section key={reference.id} className="source-reference">
            <Source href={reference.url} title={`${reference.book} · ${reference.title}`} dir="auto"/>
            <details><summary>بخش مرتبط از منبع</summary><div dir="ltr" lang="en" className="source-excerpt"><MathContent>{reference.text}</MathContent></div></details>
          </section>)}
          <p className="source-license">متن منابع و اقتباس‌های آن: OpenStax، Rice University · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a>. قطعه‌بندی و حذف تمرین‌ها برای بازیابی انجام شده است. منبع بازیابی‌شده به‌تنهایی تأیید صحت جواب نیست.</p>
        </SourcesContent>
      </Sources>}
      {result?.retrievalStatus==='empty'&&<p className="retrieval-notice">منبع مرتبطی پیدا نشد؛ پاسخ با تکیه بر حل و بررسی مسئله تهیه شد.</p>}
      {result&&result.retrievalStatus==='unavailable'&&<p className="retrieval-notice">دسترسی به ایندکس منابع ممکن نشد؛ این پاسخ از RAG استفاده نکرده است.</p>}
      {result&&<div className="verification"><Collapsible><CollapsibleTrigger className="verification-trigger">{result.verification==='passed'?<Check size={18}/>:<ChevronDown size={18}/>} {result.verification==='passed'?'بررسی با ابزار محاسبه':result.verification==='inconclusive'?'تأیید مستقل نشده':result.status==='needs_clarification'?'نیاز به توضیح بیشتر':'وضعیت پاسخ'} <ChevronDown size={14}/></CollapsibleTrigger><CollapsibleContent><p>{result.verificationNote}</p><p className="trace">{result.trace.map(n=>routeNames[n]??n).join(' ← ')}</p>{result.usage.modelCalls>0&&<p>{result.usage.modelCalls} فراخوانی مدل · {result.usage.inputTokens} توکن ورودی · {result.usage.outputTokens} توکن خروجی، مجموع این سؤال</p>}</CollapsibleContent></Collapsible></div>}
    </article>;
  }
export function TutorWorkspace({mode}:{mode:string}) {return <ControlledUIProvider><Workspace mode={mode}/></ControlledUIProvider>;}
function Workspace({mode}:{mode:string}) {
  const {chats:lessons,setChats:setLessons,projects,setProjects,selected,setSelected,ready,storageError}=useChatLibrary();
  const [tab,setTab]=useState('learn'),[menu,setMenu]=useState(false),[projectId,setProjectId]=useState<string|null>(null);
  const [nameDialog,setNameDialog]=useState<{kind:'project'|'rename-project'|'rename-chat';id?:string;initial:string}|null>(null);
  const [deleted,setDeleted]=useState<{chat?:Chat;project?:Project;chatIds?:string[]}|null>(null);
  const [editFrom,setEditFrom]=useState<number|undefined>();
  const [moveChat,setMoveChat]=useState<Chat|null>(null);
  const liveRuns=useRef(new Set<string>());
  const [input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [useSources,setUseSources]=useState(false);
  const [lastAttempt,setLastAttempt]=useState<{request:TutorRequest;question?:string;replaceFrom?:number}|null>(null);
  const fileInput=useRef<HTMLInputElement>(null);
  const composerInput=useRef<HTMLTextAreaElement>(null);
  const [image,setImage]=useState<TutorImage|undefined>(),[readingFile,setReadingFile]=useState(false),[mathOpen,setMathOpen]=useState(false);
  const [progress,setProgress]=useState('');
  const pending=useRef<{result?:TutorResult;error?:Error}>({});
  const canceled=useRef(false);
  const [stopped,setStopped]=useState(false);
  const transport=useMemo(()=>new DefaultChatTransport<TutorUIMessage>({api:'/api/tutor',prepareSendMessagesRequest:({body})=>({body:body?.request,headers:{Accept:'text/event-stream'}})}),[]);
  const {sendMessage,stop}=useChat<TutorUIMessage>({transport,onData:part=>{if(part.type==='data-progress')setProgress(routeNames[part.data.node]??'بررسی مسئله');if(part.type==='data-result')pending.current.result=part.data;},onError:e=>{pending.current.error=e;}});
  const active=lessons.find(l=>l.id===selected),latest=active?.results.at(-1);
  async function send(request:TutorRequest,question?:string,replaceFrom?:number) {
    if(busy)return;
    setBusy(true);setError('');setStopped(false);canceled.current=false;setProgress('شروع');setLastAttempt({request,question,replaceFrom});pending.current={};
    try {
      await sendMessage({text:request.action==='start'?(request.question||'سؤال از عکس'):request.event},{body:{request}});
      if(canceled.current)return;
      if(pending.current.error)throw pending.current.error;
      const result=pending.current.result;if(!result)throw new Error('پاسخ کامل دریافت نشد؛ دوباره تلاش کنید.');
      liveRuns.current.add(result.runId);
      if(request.action==='start') {
        const reply={...result,userText:question||'سؤال از عکس',image:request.image};
        if(active)setLessons(ls=>ls.map(chat=>chat.id===active.id?{...chat,results:[...chat.results.slice(0,replaceFrom??chat.results.length),reply],updated:Date.now()}:chat));
        else {const title=(question||result.imageQuestion||'گفتگو دربارهٔ عکس').slice(0,60);setLessons(ls=>[{id:result.runId,title,question:question||'سؤال از عکس',projectId,results:[reply],updated:Date.now()},...ls]);setSelected(result.runId);}
      }
      else setLessons(ls=>ls.map(chat=>chat.id===selected?{...chat,results:[...chat.results,{...result,...(request.event==='clarification'?{userText:request.text}:{})}],updated:Date.now()}:chat));
      setInput('');setImage(undefined);setMathOpen(false);setEditFrom(undefined);setTab('learn');setMenu(false);if(request.action==='resume'&&request.event==='skip')setSelected(null);
    }catch(e){if(!canceled.current)setError(e instanceof Error?e.message:'خطای اتصال. دوباره تلاش کنید.');}finally{setBusy(false);}
  }
  const start=(question:string)=>{
    if(!active&&lessons.length>=100){setError('برای ساخت چت جدید، یکی از گفتگوهای قدیمی را حذف کنید.');return;}
    if(active&&active.results.length>=200){setError('این گفتگو طولانی شده است؛ یک چت جدید بسازید.');return;}
    return send({action:'start',question,level:'beginner',image,useSources,history:chatHistory(active,editFrom)},question,editFrom);
  };
  const feedback=(event:'understood'|'confused'|'skip')=>{
    if(!latest)return;
    if(liveRuns.current.has(latest.runId))return send({action:'resume',runId:latest.runId,eventId:crypto.randomUUID(),event,text:''});
    if(event==='confused')return start('پاسخ قبلی را ساده‌تر و مرحله‌به‌مرحله توضیح بده.');
    setLessons(chats=>chats.map(chat=>chat.id===selected?{...chat,results:chat.results.map((reply,i)=>i===chat.results.length-1?{...reply,status:'completed'}:reply)}:chat));
    if(event==='skip')newLesson();
  };
  function submit(e:FormEvent) {e.preventDefault();if(readingFile||(!input.trim()&&!image))return;if(latest?.status==='needs_clarification'&&!image&&editFrom===undefined&&liveRuns.current.has(latest.runId))void send({action:'resume',runId:latest.runId,eventId:crypto.randomUUID(),event:'clarification',text:input});else void start(input);}
  function newLesson(){if(busy)return;setSelected(null);setInput('');setImage(undefined);setEditFrom(undefined);setMathOpen(false);setTab('learn');setMenu(false);setError('');setStopped(false);setLastAttempt(null);}
  function openChat(chat:Chat){setSelected(chat.id);setProjectId(chat.projectId);setTab('learn');setMenu(false);setInput('');setImage(undefined);setEditFrom(undefined);setError('');setLastAttempt(null);}
  function saveName(name:string){
    if(nameDialog?.kind==='project'){if(projects.length>=100){setError('تعداد پروژه‌ها به سقف ذخیره‌سازی رسیده است.');return;}const id=crypto.randomUUID();setProjects(items=>[...items,{id,name}]);setProjectId(id);setTab('history');setMenu(false);}
    else if(nameDialog?.kind==='rename-project')setProjects(items=>items.map(project=>project.id===nameDialog.id?{...project,name}:project));
    else if(nameDialog?.kind==='rename-chat')setLessons(items=>items.map(chat=>chat.id===nameDialog.id?{...chat,title:name}:chat));
    setNameDialog(null);
  }
  const actions:LibraryActions={onOpen:openChat,onChooseProject:chat=>{setMenu(false);setMoveChat(chat);},onRename:chat=>{setMenu(false);setNameDialog({kind:'rename-chat',id:chat.id,initial:chat.title});},onDelete:chat=>{setDeleted({chat});setLessons(items=>items.filter(item=>item.id!==chat.id));if(selected===chat.id){setSelected(null);setTab('history');setInput('');setImage(undefined);setEditFrom(undefined);}},onMove:(chat,id)=>{setLessons(items=>items.map(item=>item.id===chat.id?{...item,projectId:id}:item));if(selected===chat.id)setProjectId(id);}};
  function deleteProject(project:Project){setDeleted({project,chatIds:lessons.filter(chat=>chat.projectId===project.id).map(chat=>chat.id)});setProjects(items=>items.filter(item=>item.id!==project.id));setLessons(items=>items.map(chat=>chat.projectId===project.id?{...chat,projectId:null}:chat));setProjectId(null);}
  function undoDelete(){if(deleted?.chat){const chat=deleted.chat;setLessons(items=>[chat,...items]);}if(deleted?.project){const project=deleted.project;setProjects(items=>[...items,project]);setLessons(items=>items.map(chat=>deleted.chatIds?.includes(chat.id)?{...chat,projectId:project.id}:chat));}setDeleted(null);}
  const lastQuestionIndex=active?.results.findLastIndex(reply=>Boolean(reply.userText))??-1;
  function editLastQuestion(){if(!active||lastQuestionIndex<0)return;const reply=active.results[lastQuestionIndex];setInput(!reply.image&&reply.imageQuestion?reply.imageQuestion:reply.userText??'');setImage(reply.image);setEditFrom(lastQuestionIndex);setError('');}
  function regenerate(){if(!active||lastQuestionIndex<0||busy)return;const reply=active.results[lastQuestionIndex],question=!reply.image&&reply.imageQuestion?reply.imageQuestion:reply.userText??'';void send({action:'start',question,image:reply.image,level:'beginner',useSources:reply.retrievalStatus!=='disabled',history:chatHistory(active,lastQuestionIndex)},question,lastQuestionIndex);}
  function reportAnswer(){setLessons(items=>items.map(chat=>chat.id===selected?{...chat,results:chat.results.map((reply,index)=>index===chat.results.length-1?{...reply,reported:true}:reply)}:chat));}
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
      <Button className="new-chat" onClick={newLesson} disabled={busy||!ready}><Plus/> چت جدید</Button>
      <nav><button className={`nav-item ${tab==='history'&&!projectId?'active':''}`} disabled={busy} onClick={()=>{setTab('history');setProjectId(null);setMenu(false);}}><MessageSquare/> گفت‌وگوها</button></nav>
      <div className="project-list"><div className="sidebar-section-title"><h2>پروژه‌ها</h2><Button variant="ghost" size="icon" disabled={busy||!ready} onClick={()=>{setMenu(false);setNameDialog({kind:'project',initial:''});}} aria-label="ساخت پروژه"><Plus/></Button></div>{projects.map(project=><button key={project.id} disabled={busy} className={`project-item ${projectId===project.id?'selected':''}`} onClick={()=>{setProjectId(project.id);setTab('history');setMenu(false);}}><Folder/><span>{project.name}</span></button>)}</div>
      <div className="recent"><h2>گفتگوهای اخیر</h2>{lessons.length?lessons.slice().sort((a,b)=>b.updated-a.updated).slice(0,8).map(lesson=><div className="recent-row" key={lesson.id}><button disabled={busy} className={`recent-item ${selected===lesson.id&&tab==='learn'?'selected':''}`} onClick={()=>openChat(lesson)}>{lesson.title}</button><ChatActions chat={lesson} projects={projects} disabled={busy} actions={actions}/></div>):<p className="empty-history">گفتگوی اول را با پیام خودتان شروع کنید.</p>}</div>
      <div className="sidebar-bottom"><span className="mode-label">{mode==='openai'?'پاسخ‌گویی با هوش مصنوعی':'حالت محلی · بدون کلید'}</span><p>گفتگوها در همین مرورگر ذخیره می‌شوند.</p></div>
    </aside>;
  return <div className="workspace">
    <header className="mobile-header"><Button variant="ghost" size="icon" onClick={()=>setMenu(!menu)} aria-label="باز کردن فهرست"><Menu/></Button><img src="/brand/learnit.svg" alt="LearnIT" width="148" height="46"/><Button disabled={busy||!ready} variant="ghost" size="icon" onClick={newLesson} aria-label="چت جدید"><Plus/></Button></header>
    {sidebar()}
    <Sheet open={menu} onOpenChange={setMenu}><SheetContent side="right" className="mobile-sheet"><SheetTitle className="sr-only">فهرست LearnIT</SheetTitle><SheetDescription className="sr-only">انتخاب صفحه و ادامه درس‌های این نشست</SheetDescription>{sidebar(true)}</SheetContent></Sheet>
    <main className="main-panel">
      <div className="main-top"><span>{tab==='history'?(projects.find(project=>project.id===projectId)?.name??'گفت‌وگوها'):active?.title??'چت جدید'}</span>{tab==='learn'&&active&&<ChatActions chat={active} projects={projects} disabled={busy} actions={actions}/>}</div>
      <Conversation key={tab==='history'?'library':selected??'new-chat'} initial={active?'smooth':false} className="conversation-shell" aria-label="گفتگو با معلم ریاضی" aria-busy={busy}>
        <ConversationContent scrollClassName="lesson-scroll" className="lesson-width">
          {tab==='learn' ? (
            active ? <>
              {active.results.map((result,i)=>!result.answer&&!result.visual&&!result.uiScene?null:<section key={`${result.runId}-${i}`}>
                {result.userText&&<div className="question">{result.image&&<img className="question-image" src={result.image.dataUrl} alt="عکس صورت مسئله"/>}<MathContent>{result.userText}</MathContent>{i===lastQuestionIndex&&<Button disabled={busy} variant="ghost" size="sm" onClick={editLastQuestion} aria-label="ویرایش آخرین پیام"><Pencil/> ویرایش</Button>}{result.imageQuestion&&<details className="image-transcription"><summary>صورت مسئله خوانده‌شده از عکس</summary><MathContent>{result.imageQuestion}</MathContent></details>}</div>}
                {i>0&&!result.userText&&<p className="feedback-label">{result.trace.at(-1)==='finalize'?'پایان درس':'ادامه یادگیری'}</p>}
                <Answer answer={result.answer} visual={result.visual} result={result} disabled={busy} onRegenerate={i===active.results.length-1?regenerate:undefined} onReport={reportAnswer} reported={result.reported}/>
              </section>)}
              {latest?.status==='awaiting_feedback'&&<div className="feedback">
                <Button disabled={busy} onClick={()=>feedback('understood')}>فهمیدم <Check size={16}/></Button>
                <Button variant="ghost" disabled={busy} onClick={()=>feedback('confused')}><RotateCcw size={16}/> دوباره توضیح بده</Button>
                <Button variant="ghost" disabled={busy} onClick={()=>feedback('skip')}>پایان درس</Button>
              </div>}
              {latest&&['completed','failed'].includes(latest.status)&&<p className="chat-continue-note">می‌توانید پیام بعدی را در همین گفتگو بنویسید.</p>}
            </> : !busy&&<NewChatIntro onChoose={question=>{setInput(question);setImage(undefined);setMathOpen(false);setError('');requestAnimationFrame(()=>composerInput.current?.focus());}}/>
          ) : <ChatLibraryPanel chats={lessons} projects={projects} projectId={projectId} busy={busy} actions={actions} onNewChat={newLesson} onNewProject={()=>setNameDialog({kind:'project',initial:''})} onRenameProject={project=>setNameDialog({kind:'rename-project',id:project.id,initial:project.name})} onDeleteProject={deleteProject}/>}

          {busy&&lastAttempt?.request.action==='start'&&<div className="question pending-question"><MathContent>{lastAttempt.question||'سؤال از عکس'}</MathContent></div>}
          {busy&&<div className="working" role="status"><span className="spinner"/><div><p>در حال آماده‌سازی پاسخ…</p><span>{progress}</span></div></div>}
          {error&&<div className="error" role="alert"><div><p>{error}</p><span>سؤال و پیوست شما حفظ شده است.</span></div><div className="error-actions">{lastAttempt&&<Button variant="outline" disabled={busy} onClick={()=>void send(lastAttempt.request,lastAttempt.question,lastAttempt.replaceFrom)}>تلاش دوباره</Button>}<Button variant="ghost" onClick={()=>setError('')} aria-label="بستن پیام خطا"><X size={16}/></Button></div></div>}
          {storageError&&<p className="storage-notice" role="status">{storageError}</p>}
          {stopped&&<p className="storage-notice" role="status">پاسخ متوقف شد؛ پیام شما برای ارسال دوباره حفظ شده است.</p>}
          {deleted&&<div className="undo-notice" role="status"><span>{deleted.chat?'چت حذف شد.':'پروژه حذف شد؛ چت‌هایش نگه داشته شدند.'}</span><Button variant="ghost" disabled={busy} onClick={undoDelete}>بازگردانی</Button><Button variant="ghost" size="icon" onClick={()=>setDeleted(null)} aria-label="بستن پیام حذف"><X/></Button></div>}
        </ConversationContent>
        <ConversationScrollButton aria-label="رفتن به آخر گفتگو"/>
      </Conversation>
      {tab==='learn'&&<div className="composer-container">
        {editFrom!==undefined&&<div className="edit-notice"><span>ویرایش آخرین پیام؛ پاسخ قبلی جایگزین می‌شود.</span><Button variant="ghost" size="sm" onClick={()=>{setEditFrom(undefined);setInput('');setImage(undefined);}}>انصراف از ویرایش</Button></div>}
        <div className="answer-options"><ToggleGroup type="single" dir="rtl" value={useSources?'sources':'ai'} onValueChange={value=>{if(value)setUseSources(value==='sources');}} disabled={busy} variant="outline" size="sm" spacing={1} aria-label="روش پاسخ‌گویی"><ToggleGroupItem value="ai"><Sparkles/> استفاده از هوش مصنوعی برای حل</ToggleGroupItem><ToggleGroupItem value="sources"><BookOpen/> استفاده از منابع اپ</ToggleGroupItem></ToggleGroup><p>{latest?.status==='needs_clarification'?'روش انتخاب‌شده برای سؤال تازه اعمال می‌شود؛ توضیح تکمیلی، روش قبلی را حفظ می‌کند.':useSources?'هوش مصنوعی از منابع ریاضی اپ هم کمک می‌گیرد.':'حل مستقیم مسئله؛ منابع اپ وارد پاسخ نمی‌شوند.'}</p></div>
        {mathOpen&&<MathKeyboard onInsert={insertFormula} disabled={busy||readingFile}/>}
        {image&&<div className="attachment-preview"><img src={image.dataUrl} alt="پیش‌نمایش عکس انتخاب‌شده"/><div><p dir="auto">{image.name}</p><span>{mode==='openai'?'عکس همراه سؤال برای OpenAI ارسال می‌شود.':'خواندن عکس به اتصال OpenAI نیاز دارد.'}</span></div><Button type="button" variant="ghost" size="icon" disabled={busy} onClick={()=>setImage(undefined)} aria-label="حذف عکس"><X/></Button></div>}
        <form onSubmit={submit}>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label="انتخاب عکس مسئله" className="sr-only" tabIndex={-1} disabled={busy||readingFile} onChange={e=>{void chooseImage(e.target.files?.[0]);e.target.value='';}}/>
          <InputGroup className="composer">
            <InputGroupTextarea ref={composerInput} value={input} onChange={e=>setInput(e.target.value)} placeholder={image?'در صورت نیاز، درباره عکس توضیح دهید…':latest?.status==='needs_clarification'?'توضیح تکمیلی را بنویسید…':active?'پیام بعدی را بنویسید…':'سؤال ریاضی‌تان را بنویسید…'} aria-label={latest?.status==='needs_clarification'?'پاسخ تکمیلی':'سؤال ریاضی'} maxLength={2000} disabled={busy||readingFile||!ready} onPaste={e=>{const file=[...e.clipboardData.files].find(f=>f.type.startsWith('image/'));if(file){e.preventDefault();void chooseImage(file);}}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/>
            <InputGroupAddon align="block-end" className="composer-actions">
              <Button type="button" variant="ghost" size="icon" disabled={busy||readingFile} onClick={()=>fileInput.current?.click()} aria-label="پیوست عکس" title="پیوست عکس"><Paperclip/></Button>
              <Button type="button" variant="ghost" size="icon" disabled={busy||readingFile} onClick={()=>setMathOpen(!mathOpen)} aria-label="صفحه‌کلید ریاضی" aria-expanded={mathOpen} title="صفحه‌کلید ریاضی"><Sigma/></Button>
              <span className="composer-action-note">{readingFile?'در حال خواندن فایل…':image?'عکس آماده ارسال':'متن، عکس یا فرمول'}</span>
              {busy?<Button key="stop" size="icon" type="button" onClick={event=>{event.preventDefault();canceled.current=true;setStopped(true);void stop();}} aria-label="توقف پاسخ"><Square/></Button>:<Button key="send" size="icon" type="submit" disabled={readingFile||!ready||(!input.trim()&&!image)} aria-label="ارسال سؤال"><ArrowUp/></Button>}
            </InputGroupAddon>
          </InputGroup>
        </form>
        <p className="composer-note">{mode==='openai'?'متن و عکس سؤال برای OpenAI ارسال می‌شود. ':'حالت محلی: جبر تا درجه دو، مشتق مقدماتی و جمع بردار. '}فرمول را می‌توانید با اعداد فارسی هم بنویسید.</p>
      </div>}
    </main>
    {nameDialog&&<NameDialog key={`${nameDialog.kind}-${nameDialog.id??'new'}`} kind={nameDialog.kind} initial={nameDialog.initial} onClose={()=>setNameDialog(null)} onSave={saveName}/>}
    {moveChat&&<MoveChatDialog chat={moveChat} projects={projects} onClose={()=>setMoveChat(null)} onSave={id=>{actions.onMove(moveChat,id);setMoveChat(null);}}/>}
  </div>;
}
