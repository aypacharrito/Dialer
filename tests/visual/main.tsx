import React from 'react';import {createRoot} from 'react-dom/client';
import CRMClient from '../../app/CRMClient';
import {LanguageProvider} from '../../app/components/LanguageProvider';
import './performance';
import '../../app/typography.css';import '../../app/globals.css';import '../../app/professional-polish.css';import '../../app/professional-v2.css';import '../../app/product-system.css';import '../../app/workspace-layout.css';import '../../app/video-finish.css';import '../../app/pacifica-minimal.css';import '../../app/assistant.css';import '../../app/viewport-quote.css';import '../../app/message-attachments.css';import '../../app/frontier-theme.css';import '../../app/scrollbars.css';import '../../app/refined-workspace.css';import '../../app/responsive-workspace.css';import '../../app/v47-experience.css';import '../../app/v48-experience.css';import '../../app/v49-experience.css';import '../../app/v50-experience.css';import '../../app/polished-workspace.css';

// Review harness only: synthetic records, isolated browser storage, no real API,
// authentication, calling, messages, AI billing, or production mutations.
const workspaceId='visual-review-'+(new URLSearchParams(location.search).get('scenario')||'default');
const names=['Alex Morgan','Jamie Rivera','Taylor Brooks','Jordan Ellis','Casey Park','Sam Wilson'];
const recordCount=Math.max(6,Math.min(5000,Number(new URLSearchParams(location.search).get('records'))||6));
const leads=Array.from({length:recordCount},(_,i)=>({id:i+1,name:names[i%names.length]+(i>=names.length?` ${i+1}`:''),line:'home-auto',phone:String(2025550100+i),email:'',city:['Pasadena','Long Beach','Burbank'][i%3],state:'CA',source:i%2?'Referral':'Website',product:i%2?'Auto Insurance':'Home Insurance',leadCost:i%2?0:19,stage:i%3?'New lead':'Follow-up',status:'New lead',outcome:'Not contacted',received:new Date().toISOString(),followUp:i%3?'':new Date(Date.now()-3600000).toISOString(),attempts:0,notes:'Synthetic visual-review record; calls and external requests are disabled.'}));
localStorage.setItem(`pacifica:${workspaceId}:leads`,JSON.stringify(leads));
// Reproduce the cramped pre-update arrangement without reading private storage.
if(new URLSearchParams(location.search).has('cramped'))localStorage.setItem(`pacifica:dialer-layout:v3:${workspaceId}`,JSON.stringify({version:2,hidden:['calls','conversations','phone','queue'],collapsed:[],panels:{contact:{x:0,y:0,width:300,height:260},mode:{x:0,y:310,width:280,height:86},keypad:{x:320,y:0,width:250,height:460}},showQueueLabel:true}));
localStorage.setItem(`pacifica:${workspaceId}:profile`,JSON.stringify({appearance:new URLSearchParams(location.search).get('theme')==='light'?'light':'dark',displaySize:new URLSearchParams(location.search).get('size')==='extra-large'?'extra-large':'comfortable',onboardingCompleted:true,mode:'insurance'}));
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
