import {createCipheriv,createDecipheriv,randomBytes,randomUUID} from 'node:crypto';
import {workspaceRedis,workspaceRedisConfig} from './workspace-storage';

// Separate from workspace JSON: credentials must never reach a workspace GET/export.
export function sealCalendar(value:unknown,context:string){
 const key=process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY||'';
 if(!/^[a-f\d]{64}$/i.test(key))throw Error('Google Calendar needs its server encryption key configured.');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);
 cipher.setAAD(Buffer.from(context));
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}
export function openCalendar<T>(value:string,context:string):T{
 const key=process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY||'',raw=Buffer.from(value,'base64url');
 const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),raw.subarray(0,12));
 decipher.setAAD(Buffer.from(context));decipher.setAuthTag(raw.subarray(12,28));
 return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString('utf8')) as T;
}
const key=(id:string)=>`pacifica:calendar:v1:${id}`;
async function database(){
 const {getD1}=await import('../../db/index');const db=getD1();
 await db.prepare('CREATE TABLE IF NOT EXISTS crm_calendar_vault (workspace_id TEXT PRIMARY KEY, value TEXT, lock_id TEXT, lock_until INTEGER NOT NULL DEFAULT 0)').run();return db;
}
export async function readCalendarSecret<T>(id:string):Promise<T|null>{
 let raw:unknown;
 if(workspaceRedisConfig().url)raw=await workspaceRedis(['GET',key(id)]);
 else raw=(await (await database()).prepare('SELECT value FROM crm_calendar_vault WHERE workspace_id=?').bind(id).first() as {value:string}|null)?.value;
 return typeof raw==='string'&&raw?openCalendar<T>(raw,id):null;
}
export async function writeCalendarSecret(id:string,value:unknown){
 const raw=value===null?'':sealCalendar(value,id);
 if(workspaceRedisConfig().url){await workspaceRedis(['SET',key(id),raw]);return}
 await (await database()).prepare('INSERT INTO crm_calendar_vault (workspace_id,value) VALUES (?,?) ON CONFLICT(workspace_id) DO UPDATE SET value=excluded.value').bind(id,raw).run();
}
export async function withCalendarLock<T>(id:string,task:()=>Promise<T>):Promise<T>{
 const owner=randomUUID(),until=Date.now()+120_000;
 if(workspaceRedisConfig().url){
  const acquired=await workspaceRedis(['SET',key(id)+':lock',owner,'NX','PX',120000]);
  if(acquired!=='OK')throw Error('Calendar is already syncing. Try again shortly.');
  try{return await task()}finally{await workspaceRedis(['EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",1,key(id)+':lock',owner])}
 }
 const db=await database();
 await db.prepare('INSERT INTO crm_calendar_vault (workspace_id) VALUES (?) ON CONFLICT(workspace_id) DO NOTHING').bind(id).run();
 const result=await db.prepare('UPDATE crm_calendar_vault SET lock_id=?,lock_until=? WHERE workspace_id=? AND lock_until<?').bind(owner,until,id,Date.now()).run();
 if(result.meta.changes!==1)throw Error('Calendar is already syncing. Try again shortly.');
 try{return await task()}finally{await db.prepare('UPDATE crm_calendar_vault SET lock_id=NULL,lock_until=0 WHERE workspace_id=? AND lock_id=?').bind(id,owner).run()}
}
