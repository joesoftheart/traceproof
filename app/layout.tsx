import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Traceproof — Understand the transaction', description: 'Follow the funds. Read the evidence. A transaction explainer built for clarity.' };
export default function Layout({children}: {children: React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
