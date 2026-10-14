'use client';
import { useState } from 'react';
import { Folder,MessageSquare,MoreHorizontal,Pencil,Trash2,FolderInput,Plus,Search } from 'lucide-react';
import type { Chat,Project } from '@/lib/chat-library';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectGroup,SelectItem } from './ui/select';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from './ui/dialog';
import { Field,FieldLabel } from './ui/field';
import { DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuGroup,DropdownMenuItem } from './ui/dropdown-menu';

export type LibraryActions={onOpen:(chat:Chat)=>void;onRename:(chat:Chat)=>void;onDelete:(chat:Chat)=>void;onMove:(chat:Chat,projectId:string|null)=>void;onChooseProject:(chat:Chat)=>void};
export function ChatActions({chat,projects,disabled,actions}:{chat:Chat;projects:Project[];disabled:boolean;actions:LibraryActions}){
  return <DropdownMenu dir="rtl" modal={false}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={disabled} aria-label={`مدیریت چت ${chat.title}`}><MoreHorizontal/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup>
    <DropdownMenuItem onSelect={()=>actions.onRename(chat)}><Pencil/> تغییر نام چت</DropdownMenuItem>
    <DropdownMenuItem onSelect={()=>actions.onChooseProject(chat)}><FolderInput/> انتقال به پروژه</DropdownMenuItem>
    <DropdownMenuItem variant="destructive" onSelect={()=>actions.onDelete(chat)}><Trash2/> حذف چت</DropdownMenuItem>
  </DropdownMenuGroup></DropdownMenuContent></DropdownMenu>;
}
export function ChatLibraryPanel({chats,projects,projectId,busy,actions,onNewChat,onNewProject,onRenameProject,onDeleteProject}:{chats:Chat[];projects:Project[];projectId:string|null;busy:boolean;actions:LibraryActions;onNewChat:()=>void;onNewProject:()=>void;onRenameProject:(project:Project)=>void;onDeleteProject:(project:Project)=>void}){
  const [query,setQuery]=useState('');const project=projects.find(p=>p.id===projectId);
  const filtered=chats.filter(chat=>(!projectId||chat.projectId===projectId)&&chat.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a,b)=>b.updated-a.updated);
  return <section className="library chat-library">
    <div className="library-heading"><div><h1>{project?.name??'گفت‌وگوها'}</h1><p>{project?'چت‌های این پروژه':'گفتگوهای شما، مرتب و در دسترس'}</p></div><div className="library-heading-actions"><Button disabled={busy} onClick={onNewChat}><Plus/> چت جدید</Button>{!project&&<Button disabled={busy} variant="outline" onClick={onNewProject}><Folder/> ساخت پروژه</Button>}{project&&<DropdownMenu dir="rtl" modal={false}><DropdownMenuTrigger asChild><Button disabled={busy} variant="ghost" size="icon" aria-label="مدیریت پروژه"><MoreHorizontal/></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuItem onSelect={()=>onRenameProject(project)}><Pencil/> تغییر نام پروژه</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={()=>onDeleteProject(project)}><Trash2/> حذف پروژه</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu>}</div></div>
    <div className="library-search"><Search/><Input aria-label="جستجوی چت‌ها" placeholder="جستجو در نام گفتگوها…" value={query} onChange={event=>setQuery(event.target.value)}/></div>
    {filtered.length?filtered.map(chat=><div className="chat-row" key={chat.id}><button disabled={busy} className="chat-row-open" onClick={()=>actions.onOpen(chat)}><MessageSquare/><span><strong>{chat.title}</strong><small>{projects.find(p=>p.id===chat.projectId)?.name??'بدون پروژه'} · {new Date(chat.updated).toLocaleDateString('fa-IR')}</small></span></button><ChatActions chat={chat} projects={projects} disabled={busy} actions={actions}/></div>):<div className="library-empty"><MessageSquare/><p>{query?'گفتگویی با این نام پیدا نشد.':project?'هنوز چتی در این پروژه ندارید.':'هنوز گفتگویی ندارید.'}</p><span>{query?'نام دیگری جستجو کنید.':'با نوشتن پیام خودتان شروع کنید.'}</span></div>}
  </section>;
}
export function NameDialog({kind,initial,onClose,onSave}:{kind:'project'|'rename-project'|'rename-chat';initial:string;onClose:()=>void;onSave:(name:string)=>void}){
  const [name,setName]=useState(initial);const title=kind==='project'?'ساخت پروژه':kind==='rename-project'?'تغییر نام پروژه':'تغییر نام چت';
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent dir="rtl"><form onSubmit={event=>{event.preventDefault();if(name.trim())onSave(name.trim());}}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{kind==='project'?'گفتگوهای مرتبط را در یک پروژه جمع کنید.':'یک نام کوتاه و قابل تشخیص انتخاب کنید.'}</DialogDescription></DialogHeader><Field className="name-field"><FieldLabel htmlFor="library-name">{kind==='rename-chat'?'نام چت':'نام پروژه'}</FieldLabel><Input id="library-name" autoFocus value={name} maxLength={80} onChange={event=>setName(event.target.value)}/></Field><DialogFooter><Button type="submit" disabled={!name.trim()}>{kind==='project'?'ساخت پروژه':'ذخیره'}</Button><Button type="button" variant="ghost" onClick={onClose}>انصراف</Button></DialogFooter></form></DialogContent></Dialog>;
}
export function MoveChatDialog({chat,projects,onClose,onSave}:{chat:Chat;projects:Project[];onClose:()=>void;onSave:(projectId:string|null)=>void}){
  const [value,setValue]=useState(chat.projectId??'none');
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent dir="rtl"><DialogHeader><DialogTitle>انتقال به پروژه</DialogTitle><DialogDescription>{chat.title}</DialogDescription></DialogHeader><Field><FieldLabel htmlFor="move-project">پروژه</FieldLabel><Select dir="rtl" value={value} onValueChange={setValue}><SelectTrigger id="move-project" aria-label="انتخاب پروژه"><SelectValue/></SelectTrigger><SelectContent><SelectGroup><SelectItem value="none">بدون پروژه</SelectItem>{projects.map(project=><SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field><DialogFooter><Button onClick={()=>onSave(value==='none'?null:value)}>انتقال</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></DialogFooter></DialogContent></Dialog>;
}
