'use client';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
export function MathContent({children,restricted=false}:{children:string;restricted?:boolean}) {return <div className="math-content"><Markdown disallowedElements={restricted?['img','a']:['img']} unwrapDisallowed remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex,{throwOnError:false,strict:'ignore',trust:false}]]}>{children}</Markdown></div>;}
