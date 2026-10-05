import {accountAllows} from '../../../lib/account-access-policy';
import {randomUUID} from 'node:crypto';
import {getPacificaAccess} from '../../../lib/clerk-access';
import {readStoredWorkspace,updateStoredWorkspace} from '../../../lib/workspace-storage';
import {searchMinerSource} from '../../../lib/miner-sources';
import {researchMinerRecords,sourceLead,prepareMinerProspects} from '../../../lib/miner-prospect-tools';
import {mergeNewProspects} from '../../../lib/miner-auto-feed';
import {cleanMinerState,validSearch,csvRecords,sourceRecord,isLeadKind,type MinerSource,type LeadKind} from '../../../lib/miner-leads';
import {runSavedSearch} from '../../../lib/miner-discovery';
export const runtime='nodejs';export const maxDuration=60;
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:Request){
 const user=await getPacificaAccess();if(!user.allowed)return json({error:'Workspace access required.'},403);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Invalid origin.'},403);
 try{
  const text=await request.text();if(text.length>2400000)return json({error:'Request is too large.'},413);
  const body=JSON.parse(text);if(!body||typeof body!=='object')throw Error('Invalid request.');
  if(!['search','analyze','import','save-search','toggle-search','run-search','remove-search','csv-preview','csv-import'].includes(body.action))throw Error('Choose a valid action.');
  if(!accountAllows(user,'/api/miner/prospects','POST',body.action))return json({error:'This feature is outside your account access.'},403);
  if(user.role==='agent'&&!['search','analyze','csv-preview'].includes(body.action))return json({error:'Workspace owner or manager access required.'},403);
  if(['csv-preview','csv-import'].includes(body.action)){
   if(!isLeadKind(body.kind)||typeof body.csv!=='string'||body.csv.length>2000000)throw Error('Choose a category and a CSV smaller than 2 MB.');
   const rows=csvRecords(body.csv);if(rows.length>2000)throw Error('Keep CSV files to 2,000 rows per upload.');
   const records=rows.flatMap(row=>{const record=sourceRecord(row,'Your CSV',body.kind,'');return record?[record]:[]});
   if(!records.length)throw Error('Choose a CSV with a name or business name column and contact details or an address.');
   if(body.action==='csv-preview')return json({records,hasMore:false});
   if(!Array.isArray(body.keys)||!body.keys.length||body.keys.length>50)throw Error('Select up to 50 records.');
   const prospects=records.filter(r=>body.keys.includes(r.key)).slice(0,50).map(r=>sourceLead(r));let accepted:Record<string,unknown>[]=[];
   await updateStoredWorkspace(user.userId,current=>{const merged=mergeNewProspects(current,prospects);accepted=merged.accepted;return merged.workspace});return json({added:accepted.length,skipped:body.keys.length-accepted.length,prospects:accepted});
  }
  if(['toggle-search','remove-search','run-search'].includes(body.action)){
   if(body.action==='run-search')return json(await runSavedSearch(user.userId,String(body.id),request.signal));
   await updateStoredWorkspace(user.userId,current=>{const state=cleanMinerState(current.minerState);if(!state.searches.some(s=>s.id===body.id))throw Error('Search unavailable.');return {...current,minerState:{...state,searches:body.action==='remove-search'?state.searches.filter(s=>s.id!==body.id):state.searches.map(s=>s.id===body.id?{...s,enabled:body.enabled===true}:s)}}});return json({ok:true});
  }
  const page=body.page??0;if(!validSearch(body.source,body.kind,body.zip,page))throw Error('Choose a supported source, category and five-digit ZIP.');
  const source=body.source as MinerSource,kind=body.kind as LeadKind,zip=String(body.zip);
  if(body.action==='save-search'){
   await updateStoredWorkspace(user.userId,current=>{const state=cleanMinerState(current.minerState);if(state.searches.length>=12)throw Error('Keep up to 12 saved searches.');if(state.searches.some(s=>s.source===source&&s.zip===zip&&s.kind===kind))throw Error('This search is already saved.');return {...current,minerState:{...state,searches:[...state.searches,{id:randomUUID(),source,kind,zip,enabled:true,cursor:0,lastRunAt:'',lastStatus:'Scheduled daily',lastAdded:0}]}}});return json({ok:true});
  }
  const workspace=await readStoredWorkspace(user.userId);if(!workspace)throw Error('Workspace unavailable.');
  const found=await searchMinerSource(source,kind,zip,page,request.signal);
  if(body.action==='search')return json(found);
  if(!Array.isArray(body.keys)||body.keys.length<1||body.keys.length>(body.action==='analyze'?10:50)||body.keys.some((k:unknown)=>typeof k!=='string'||k.length>500))throw Error(body.action==='analyze'?'Select up to 10 records.':'Select up to 50 records.');
  const selected=found.records.filter(r=>body.keys.includes(r.key));
  if(!selected.length)throw Error('These records changed. Refresh the search.');
  if(body.action==='analyze')return json({insights:await researchMinerRecords(selected,request.signal)});
  const {prospects,researchNotice}=await prepareMinerProspects(selected,workspace,request.signal);let accepted:Record<string,unknown>[]=[];
  await updateStoredWorkspace(user.userId,current=>{const merged=mergeNewProspects(current,prospects);accepted=merged.accepted;return merged.workspace});
  return json({added:accepted.length,skipped:body.keys.length-accepted.length,prospects:accepted,researchNotice});
 }catch(error){const message=error instanceof Error?error.message:'';return json({error:/^(Choose |Select |Keep |This search|These records|Search unavailable|Workspace unavailable|Connect OpenAI)/.test(message)?message:'The source or workspace is temporarily unavailable. Try again; existing contacts are preserved.'},400);}
}
