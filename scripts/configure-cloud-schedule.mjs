import {readFileSync,writeFileSync} from 'node:fs';
const mode=process.argv[2];
if(!['vercel-pro','external'].includes(mode))throw new Error('Choose vercel-pro (requires Pro/Enterprise) or external (authenticated external scheduler required).');
const path=new URL('../vercel.json',import.meta.url);
const config=JSON.parse(readFileSync(path,'utf8'));
config.crons=config.crons.filter(job=>!['/api/cron/follow-ups','/api/cron/calendar-conversations'].includes(job.path));
if(mode==='vercel-pro')config.crons.unshift({path:'/api/cron/follow-ups',schedule:'*/5 * * * *'},{path:'/api/cron/calendar-conversations',schedule:'*/5 * * * *'});
writeFileSync(path,JSON.stringify(config,null,2)+'\n');
console.log(mode==='vercel-pro'?'Deploy to activate five-minute cloud checks.':'Configure an external scheduler every five minutes: GET both https://YOUR-DOMAIN/api/cron/follow-ups and https://YOUR-DOMAIN/api/cron/calendar-conversations with Authorization: Bearer CRON_SECRET. Deploy this configuration.');
