import type { Metadata } from 'next';
import localFont from 'next/font/local';
import 'katex/dist/katex.min.css';
import './globals.css';
const vazir=localFont({src:[{path:'./fonts/Vazirmatn-Regular.ttf',weight:'400'},{path:'./fonts/Vazirmatn-Bold.ttf',weight:'700'}],variable:'--font-vazir',display:'swap'});
export const metadata:Metadata={title:'LearnIT | یادگیری ریاضی',description:'ریاضی را با توضیح مرحله‌ای و نمودار تعاملی یاد بگیرید.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="fa" dir="rtl" className={`dark ${vazir.variable}`}><body>{children}</body></html>;}
