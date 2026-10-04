import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'SALESly — Upload. Diagnose. Improve. Sell.',description:'Understand your sales video. Discover seven stronger marketing angles and ready-to-use video prompts.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ms"><body>{children}</body></html>;}
