import React from 'react';import {createRoot} from 'react-dom/client';
import CRMClient from '../../app/CRMClient';
import {LanguageProvider} from '../../app/components/LanguageProvider';
import '../../app/typography.css';import '../../app/globals.css';import '../../app/professional-polish.css';import '../../app/professional-v2.css';import '../../app/product-system.css';import '../../app/workspace-layout.css';import '../../app/video-finish.css';import '../../app/pacifica-minimal.css';import '../../app/assistant.css';import '../../app/viewport-quote.css';import '../../app/message-attachments.css';import '../../app/frontier-theme.css';import '../../app/scrollbars.css';import '../../app/refined-workspace.css';import '../../app/responsive-workspace.css';import '../../app/v47-experience.css';import '../../app/v48-experience.css';import '../../app/v49-experience.css';import '../../app/v50-experience.css';

// Review harness only: synthetic records, isolated browser storage, no real API,
// authentication, calling, messages, AI billing, or production mutations.
const workspaceId='visual-review';
const names=['Alex Morgan','Jamie Rivera','Taylor Brooks','Jordan Ellis','Casey Park','Sam Wilson'];
const leads=names.map((name,i)=>({id:i+1,name,line:'home-auto',phone:`20255501${String(i).padStart(2,'0')}`,email:'',city:['Pasadena','Long Beach','Burbank'][i%3],state:'CA',source:i%2?'Referral':'Website',product:i%2?'Auto Insurance':'Home Insurance',leadCost:i%2?0:19,stage:i%3?'New lead':'Follow-up',status:'New lead',outcome:'Not contacted',received:new Date().toISOString(),followUp:i%3?'':new Date(Date.now()-3600000).toISOString(),attempts:0,notes:'Synthetic visual-review record.'}));
localStorage.setItem(`pacifica:${workspaceId}:leads`,JSON.stringify(leads));
localStorage.setItem(`pacifica:${workspaceId}:profile`,JSON.stringify({appearance:new URLSearchParams(location.search).get('theme')==='light'?'light':'dark',displaySize:'comfortable',onboardingCompleted:true,mode:'insurance'}));
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof Request?input.url:input.toString(),location.href);
 if(url.origin!==location.origin)throw Error('External requests are disabled in the design preview.');
 if(!url.pathname.startsWith('/api/'))return originalFetch(input,init);
 if(url.pathname.includes('note-reminders'))return Response.json({configured:true,items:[{id:'sample',leadId:1,title:'Follow up on the coverage question',evidence:'Synthetic review note.',status:'open',dueAt:new Date().toISOString()}],documents:[]});
 if(url.pathname.includes('workspace'))return Response.json({leads,callLogs:[],profile:{appearance:'dark',displaySize:'comfortable'}});
 return Response.json({configured:false,items:[],numbers:[],error:'Disabled in local design review'},{status:404});
};
createRoot(document.getElementById('root')!).render(<LanguageProvider><CRMClient workspaceId={workspaceId} isOwner currentUserName="Design review"/></LanguageProvider>);
