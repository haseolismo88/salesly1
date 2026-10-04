import Dashboard from '@/components/dashboard';
import { settings } from '@/lib/server';
export const dynamic='force-dynamic';
export default function Page(){const config=settings();return <Dashboard maxSeconds={config.maxSeconds} mock={config.mock} ready={config.ready}/>;}
