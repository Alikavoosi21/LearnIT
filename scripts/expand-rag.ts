import { readFile,writeFile } from 'node:fs/promises';
const manifest=JSON.parse(await readFile('rag/sources.json','utf8'));
const extra=[
 ['sequences','Calculus Volume 2','calculus-volume-2/pages/5-1-sequences','دنباله همگرایی واگرایی sequence convergence divergence'],
 ['infinite-series','Calculus Volume 2','calculus-volume-2/pages/5-2-infinite-series','سری نامتناهی هندسی infinite series geometric convergence'],
 ['power-series','Calculus Volume 2','calculus-volume-2/pages/6-1-power-series-and-functions','سری توانی شعاع بازه همگرایی power series radius convergence'],
 ['separable-equations','Calculus Volume 2','calculus-volume-2/pages/4-3-separable-equations','معادله دیفرانسیل تفکیک پذیر جداسازی متغیر differential equation separable'],
 ['first-order-equations','Calculus Volume 2','calculus-volume-2/pages/4-5-first-order-linear-equations','معادله دیفرانسیل خطی مرتبه اول عامل انتگرال first order differential integrating factor'],
 ['binomial-theorem','Precalculus 2e','precalculus-2e/pages/11-6-binomial-theorem','بسط دوجمله ای نیوتن ترکیب فاکتوریل binomial theorem combination factorial'],
 ['ellipse','Precalculus 2e','precalculus-2e/pages/10-1-the-ellipse','بیضی هندسه مقاطع مخروطی کانون ellipse geometry conic focus'],
 ['linear-systems','College Algebra 2e','college-algebra-2e/pages/7-6-solving-systems-with-gaussian-elimination','دستگاه معادلات حذف گاوس سطر پلکانی gaussian elimination linear system'],
 ['determinants','College Algebra 2e','college-algebra-2e/pages/7-8-solving-systems-with-cramers-rule','دترمینان کرامر وارون ماتریس determinant cramer inverse matrix'],
 ['double-integrals','Calculus Volume 3','calculus-volume-3/pages/5-1-double-integrals-over-rectangular-regions','انتگرال دوگانه چندگانه فوبینی حجم double multiple integral fubini volume'],
 ['sets','Contemporary Mathematics','contemporary-mathematics/pages/1-1-basic-set-concepts','مجموعه عضو زیرمجموعه تهی set subset empty membership'],
 ['logic','Contemporary Mathematics','contemporary-mathematics/pages/2-3-constructing-truth-tables','منطق گزاره جدول ارزش درستی صدق truth table logic statement'],
 ['geometry','Contemporary Mathematics','contemporary-mathematics/pages/10-1-points-lines-and-planes','هندسه اقلیدسی نقطه خط صفحه موازی geometry point line plane parallel'],
 ['graph-theory','Contemporary Mathematics','contemporary-mathematics/pages/12-1-graph-basics','نظریه گراف رأس راس یال درجه graph vertex edge degree'],
 ['graph-structures','Contemporary Mathematics','contemporary-mathematics/pages/12-2-graph-structures','گراف کامل مسیر دور چرخه همبند graph cycle path connected complete'],
];
for(const [id,book,path,keywords] of extra)if(!manifest.sources.some((s:{id:string})=>s.id===id))manifest.sources.push({id,book,path,keywords});
await writeFile('rag/sources.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`${manifest.sources.length} allowlisted sections configured.`);
