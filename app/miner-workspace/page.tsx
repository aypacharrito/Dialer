import {readStoredWorkspace} from '../lib/workspace-storage';
import Link from 'next/link';
import MinerStudio from '../components/MinerStudio';
import ClerkTopAuth from '../components/ClerkTopAuth';
import {requirePacificaWorkspacePage} from '../lib/clerk-access';
import {accessScope} from '../lib/account-access-policy';
import {redirect} from 'next/navigation';
import {isPacificaPlatformOwnerEmail} from '../lib/clerk-access';
export const dynamic='force-dynamic';
export default async function MinerWorkspace(){
 const access=await requirePacificaWorkspacePage(),scopes=[accessScope(access.accessMetadata||{}),accessScope(access.memberMetadata||{})];
 if(!isPacificaPlatformOwnerEmail(access.email))redirect('/dashboard');
 const workspace=await readStoredWorkspace(access.userId);
 return <main className="miner-only-page"><header className="miner-only-header"><Link href="/">Pacifica</Link><span>{access.displayName} · {scopes.includes('read-only')?'View-only Miner':'Miner workspace'}</span>{scopes.every(s=>s==='full')&&<Link href="/dashboard">Open CRM</Link>}<ClerkTopAuth/></header><MinerStudio initialKind={workspace?.profile.industry==='real-estate'?'real-estate':'auto'} readOnly={scopes.includes('read-only')||access.role==='agent'}/></main>;
}
