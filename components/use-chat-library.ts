'use client';
import { useEffect,useState } from 'react';
import { LIBRARY_KEY,decodeLibrary,encodeLibrary,type Chat,type Project } from '@/lib/chat-library';
export function useChatLibrary(){
  const [chats,setChats]=useState<Chat[]>([]),[projects,setProjects]=useState<Project[]>([]),[selected,setSelected]=useState<string|null>(null);
  const [ready,setReady]=useState(false),[storageError,setStorageError]=useState('');
  useEffect(()=>{try{const saved=localStorage.getItem(LIBRARY_KEY);if(saved){const data=decodeLibrary(saved);setChats(data.chats);setProjects(data.projects);setSelected(data.selected);}}catch{setStorageError('تاریخچهٔ ذخیره‌شده قابل خواندن نیست؛ گفتگوهای این صفحه همچنان قابل استفاده‌اند.');}setReady(true);},[]);
  useEffect(()=>{if(!ready)return;try{localStorage.setItem(LIBRARY_KEY,encodeLibrary(chats,projects,selected));}catch{setStorageError('ذخیرهٔ تاریخچه در این مرورگر ممکن نشد؛ قبل از بستن صفحه، پاسخ‌های مهم را کپی کنید.');}},[chats,projects,selected,ready]);
  return {chats,setChats,projects,setProjects,selected,setSelected,ready,storageError};
}
