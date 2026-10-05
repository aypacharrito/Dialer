import {randomUUID} from 'node:crypto';
import {acquireAutomationLease,releaseAutomationLease,readStoredWorkspace,updateStoredWorkspace,listStoredWorkspaces} from './workspace-storage';
import {workspaceAutomationAccess} from './clerk-access';
import {searchMinerSource} from './miner-sources';
import {prepareMinerProspects} from './miner-prospect-tools';
import {mergeNewProspects} from './miner-auto-feed';
import {cleanMinerState} from './miner-leads';
export async function runSavedSearch(workspaceId:string,id:string,signal?:AbortSignal){
 if(!await workspaceAutomationAccess(workspaceId,'miner'))throw Error('Workspace unavailable.');
 const lease=`miner-search:${workspaceId}:${id}`,token=randomUUID();
 if(!await acquireAutomationLease(lease,token,75))return {added:0,skipped:0,prospects:[],message:'This search is already running.'};
 try{
  const workspace=await readStoredWorkspace(workspaceId),search=cleanMinerState(workspace?.minerState).searches.find(s=>s.id===id);if(!search||!workspace)throw Error('Search unavailable.');
  const found=await searchMinerSource(search.source,search.kind,search.zip,search.cursor||0,signal);
  const {prospects,researchNotice}=await prepareMinerProspects(found.records,workspace,signal);let accepted:Record<string,unknown>[]=[];
  await updateStoredWorkspace(workspaceId,current=>{
   const state=cleanMinerState(current.minerState),active=state.searches.find(s=>s.id===id);
   if(!active||JSON.stringify(active)!==JSON.stringify(search))return current;
   const merged=mergeNewProspects(current,prospects);accepted=merged.accepted;
   return {...merged.workspace,minerState:{...state,searches:state.searches.map(s=>s.id===id?{...s,cursor:found.hasMore&&s.cursor<1000?s.cursor+1:0,lastRunAt:new Date().toISOString(),lastAdded:accepted.length,lastStatus:`${accepted.length} new prospects; ${found.records.length-accepted.length} duplicates or capacity skips. ${researchNotice}`}:s)}};
  });return {added:accepted.length,skipped:found.records.length-accepted.length,prospects:accepted,researchNotice};
 }catch(error){
  await updateStoredWorkspace(workspaceId,current=>{const state=cleanMinerState(current.minerState);return {...current,minerState:{...state,searches:state.searches.map(s=>s.id===id?{...s,lastRunAt:new Date().toISOString(),lastStatus:'Source unavailable; no cursor advancement. Try again later.',lastAdded:0}:s)}}}).catch(()=>{});throw error;
 }finally{await releaseAutomationLease(lease,token)}
}
export async function runAllSavedSearches(){
 const signal=AbortSignal.timeout(45000),summary={searches:0,added:0,errors:0};
 const tasks=(await listStoredWorkspaces(500)).flatMap(r=>cleanMinerState(r.workspace.minerState).searches.filter(s=>s.enabled&&(!s.lastRunAt||Date.now()-Date.parse(s.lastRunAt)>20*3600000)).map(s=>({workspaceId:r.workspaceId,search:s}))).sort((a,b)=>Date.parse(a.search.lastRunAt||'1970-01-01')-Date.parse(b.search.lastRunAt||'1970-01-01'));
 let next=0;async function worker(){while(!signal.aborted){const task=tasks[next++];if(!task)break;try{if(!await workspaceAutomationAccess(task.workspaceId,'miner'))continue;const run=await runSavedSearch(task.workspaceId,task.search.id,signal);summary.searches++;summary.added+=run.added;}catch{summary.errors++;}}}
 await Promise.all(Array.from({length:Math.min(3,tasks.length)},()=>worker()));
 return summary;
}
