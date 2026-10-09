import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { mathmlToLatex } from './mathml';
const manifest=JSON.parse(await readFile('rag/sources.json','utf8'));
const splitter=new RecursiveCharacterTextSplitter({chunkSize:1200,chunkOverlap:180});
const chunks:unknown[]=[],reports:unknown[]=[];
await mkdir('rag',{recursive:true});
// Bounded concurrency, allowlisted publisher, atomic index replacement.
for(let offset=0;offset<manifest.sources.length;offset+=3) {
  const batch=await Promise.all(manifest.sources.slice(offset,offset+3).map(async(source:{id:string;book:string;path:string;keywords:string})=>{
    const url=`https://openstax.org/books/${source.path}`;
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw new Error(`${source.id}: HTTP ${response.status}`);
    if(new URL(response.url).hostname!=='openstax.org') throw new Error('Unexpected source redirect');
    const html=await response.text(),$=load(html);
    if(!html.includes('creativecommons.org/licenses/by-nc-sa/4.0'))throw new Error(`License could not be verified for ${source.id}`);
    const title=$('h1').first().text().trim()||$('title').text().split('|')[0].trim();
    const content=$('[data-type="page"]').first().length?$('[data-type="page"]').first():$('main');
    content.find('script,style,nav,button,form,svg,img,[data-type="exercise"],[data-type="example"],.os-eob-exercises').remove();
    // Keep MathML in accessible annotation form; do not concatenate duplicate glyphs.
    content.find('math').each((_,el)=>{const math=$(el);const tex=math.find('annotation[encoding="application/x-tex"]').first().text()||mathmlToLatex($,el);math.replaceWith(` $${tex}$ `);});
    content.find('h1,h2,h3,h4,p,li,section,div[data-type="equation"]').each((_,el)=>{$(el).append('\n\n');});
    const text=content.text().replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n\n').trim();
    if(text.length<500||!title) throw new Error(`Empty content for ${source.id}`);
    const sections=await splitter.splitText(text);
    const indexed=sections.map((text,i)=>({id:`${source.id}-${i}`,sourceId:source.id,title,book:source.book,url,keywords:source.keywords,text,license:manifest.license,licenseUrl:manifest.licenseUrl,publisher:manifest.publisher}));
    return {indexed,report:{id:source.id,url,title,characters:text.length,chunks:indexed.length,sha256:createHash('sha256').update(text).digest('hex')}};
  }));
  for(const result of batch){chunks.push(...result.indexed);reports.push(result.report);}
  console.log(`Indexed ${Math.min(offset+3,manifest.sources.length)}/${manifest.sources.length} sections`);
}
await writeFile('rag/index.json',JSON.stringify({version:1,indexedAt:new Date().toISOString(),chunkSize:1200,chunkOverlap:180,chunks},null,2)+'\n');
await writeFile('rag/report.json',JSON.stringify({indexedAt:new Date().toISOString(),sources:reports,totalChunks:chunks.length},null,2)+'\n');
console.log(`Saved ${chunks.length} chunks from ${reports.length} sections.`);
