export type ManagedAccess={pacificaAccessPaused?:unknown;pacificaTrialEndsAt?:unknown;pacificaManaged?:unknown};
export function managedAccessState(metadata:ManagedAccess,now=Date.now()):'paused'|'trial'|'expired'|'unmanaged'{
 if(metadata.pacificaAccessPaused===true)return 'paused';
 if(metadata.pacificaManaged!==true)return 'unmanaged';
 const end=Date.parse(String(metadata.pacificaTrialEndsAt||''));
 return Number.isFinite(end)&&end>now?'trial':'expired';
}
