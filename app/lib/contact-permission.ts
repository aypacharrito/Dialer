import type {WorkspaceProfile} from './workspace-profile';
export function consentSourceKey(value:unknown){
 const source=String(value||'').trim().toLowerCase();
 const compact=source.replace(/[\s’'._-]/g,'');
 if(compact==='smartfinancial')return 'smartfinancial';
 if(['davidsinsurance','davidsinsuranceorg','davidsinsurancewebsite'].includes(compact))return 'davidsinsurance';
 try{const url=new URL(source);if(['davidsinsurance.org','www.davidsinsurance.org'].includes(url.hostname))return 'davidsinsurance'}catch{}
 return source;
}
type ContactPermission={source?:unknown;smsConsent?:unknown;emailConsent?:unknown;smsOptOut?:unknown;emailOptOut?:unknown;doNotCall?:unknown;deletedAt?:unknown};
export function hasContactPermission(lead:ContactPermission|undefined,profile:Pick<WorkspaceProfile,'smsConsentSources'|'emailConsentSources'>,channel:'sms'|'email'){
  if(!lead||lead.deletedAt||lead.doNotCall||lead[channel==='sms'?'smsOptOut':'emailOptOut'])return false;
  if(channel==='sms'){
    if(lead.smsConsent===true)return true;
    const source=consentSourceKey(lead.source);
    return Boolean(source&&profile.smsConsentSources?.some(item=>consentSourceKey(item)===source));
  }
  if(lead.emailConsent===true)return true;
  const source=consentSourceKey(lead.source);
  return Boolean(source&&profile.emailConsentSources?.some(item=>consentSourceKey(item)===source));
}