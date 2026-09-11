import type {WorkspaceProfile} from './workspace-profile';
type ContactPermission={source?:unknown;smsConsent?:unknown;emailConsent?:unknown;smsOptOut?:unknown;emailOptOut?:unknown;doNotCall?:unknown;deletedAt?:unknown};
export function hasContactPermission(lead:ContactPermission|undefined,profile:Pick<WorkspaceProfile,'smsConsentSources'|'emailConsentSources'>,channel:'sms'|'email'){
  if(!lead||lead.deletedAt||lead.doNotCall||lead[channel==='sms'?'smsOptOut':'emailOptOut'])return false;
  if(lead[channel==='sms'?'smsConsent':'emailConsent']===true)return true;
  const source=String(lead.source||'').trim().toLowerCase();
  const sources=channel==='sms'?profile.smsConsentSources:profile.emailConsentSources;
  return Boolean(source&&sources?.some(item=>item.trim().toLowerCase()===source));
}
