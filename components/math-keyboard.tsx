'use client';
import { useEffect, useRef, useState } from 'react';
import type { MathfieldElement, VirtualKeyboardLayout } from 'mathlive';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Field, FieldLabel } from './ui/field';

const numeric:VirtualKeyboardLayout={label:'اعداد',rows:[
  ['7','8','9','\\div','[backspace]'],['4','5','6','\\times','x'],['1','2','3','-','y'],['0','.','=','+','[left]','[right]'],
]};
const advanced:VirtualKeyboardLayout={label:'فرمول‌ها',rows:[
  ['x^2','x^{#0}','\\log_{#0}{#0}','\\sqrt{#0}','\\sqrt[#0]{#0}','\\frac{#0}{#0}'],
  ['\\frac{d}{dx}','\\frac{\\partial}{\\partial x}','\\int_{#0}^{#0}','\\lim_{x\\to #0}','\\sum_{#0}^{#0}','\\infty'],
  ['\\le','\\ge','\\theta','\\pi','f(#0)','\\begin{pmatrix}#0&#0\\\\#0&#0\\end{pmatrix}'],
]};
export function MathKeyboard({onInsert,disabled}:{onInsert:(latex:string,plain:string)=>void;disabled:boolean}) {
  const host=useRef<HTMLDivElement>(null),keyboardHost=useRef<HTMLDivElement>(null),field=useRef<MathfieldElement|null>(null);
  const [ready,setReady]=useState(false),[full,setFull]=useState(false),[value,setValue]=useState(''),[error,setError]=useState('');
  useEffect(()=>{
    let disposed=false;let cleanup=()=>{};
    void import('mathlive').then(({MathfieldElement})=>{
      if(disposed||!host.current||!keyboardHost.current)return;
      MathfieldElement.fontsDirectory='/mathlive/fonts';MathfieldElement.soundsDirectory=null;
      const mf=new MathfieldElement();mf.mathVirtualKeyboardPolicy='manual';mf.setAttribute('aria-label','ویرایشگر فرمول');mf.setAttribute('dir','ltr');
      const change=()=>setValue(mf.value);mf.addEventListener('input',change);
      host.current.append(mf);field.current=mf;
      window.mathVirtualKeyboard.container=keyboardHost.current;window.mathVirtualKeyboard.layouts=[numeric];window.mathVirtualKeyboard.editToolbar='none';
      mf.focus();window.mathVirtualKeyboard.show();setReady(true);
      cleanup=()=>{mf.removeEventListener('input',change);window.mathVirtualKeyboard.hide();window.mathVirtualKeyboard.container=null;mf.remove();field.current=null;};
    }).catch(()=>{if(!disposed)setError('بارگذاری صفحه‌کلید انجام نشد. آن را ببندید و دوباره باز کنید.');});
    return ()=>{disposed=true;cleanup();};
  },[]);
  useEffect(()=>{if(ready){window.mathVirtualKeyboard.layouts=full?[advanced,numeric]:[numeric];field.current?.focus();window.mathVirtualKeyboard.show();}},[ready,full]);
  useEffect(()=>{if(field.current)field.current.readOnly=disabled;},[disabled,ready]);
  function insert(){const mf=field.current;if(!mf||!mf.value.trim())return;if(/\\placeholder|\\mathplaceholder/.test(mf.value)){setError('خانه‌های خالی فرمول را تکمیل کنید.');return;}onInsert(mf.value,mf.getValue('ascii-math'));mf.value='';setValue('');setError('');}
  return <section className="math-pad" aria-label="صفحه‌کلید ریاضی">
    <div className="math-pad-header"><span>فرمول را بسازید</span><Field orientation="horizontal" className="w-auto"><FieldLabel htmlFor="full-math-pad">نمادهای پیشرفته</FieldLabel><Switch id="full-math-pad" checked={full} onCheckedChange={setFull} disabled={!ready||disabled}/></Field></div>
    <div ref={host} className="math-field-host"/>
    {!ready&&!error&&<p role="status">در حال بارگذاری ویرایشگر…</p>}
    <div ref={keyboardHost} className="math-keyboard-host" dir="ltr"/>
    {error&&<p role="alert" className="text-destructive">{error}</p>}
    <div className="math-pad-footer"><span>کلیدهای فیزیکی هم کار می‌کنند.</span><Button type="button" size="sm" onClick={insert} disabled={!ready||disabled||!value.trim()}>افزودن به سؤال</Button></div>
  </section>;
}
