'use client';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
export function MathContent({children}:{children:string}) {return <div className="math-content"><Markdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex,{throwOnError:false,strict:'ignore',trust:false}]]}>{children}</Markdown></div>;}
