import { notFound } from 'next/navigation';
import Hub from '@/components/hub';
export function generateStaticParams() {return ['', 'explain', 'how-it-works', 'agent'].map(page=>({locale:'en',slug:page?[page]:[]}));}
export default async function Page({params}:{params:Promise<{locale:string;slug?:string[]}>}) {
 const {locale,slug=[]}=await params;
 if(locale!=='en'||slug.length>1||!['','explain','how-it-works','agent'].includes(slug[0]||'')) notFound();
 return <Hub page={slug[0]||'home'}/>;
}
