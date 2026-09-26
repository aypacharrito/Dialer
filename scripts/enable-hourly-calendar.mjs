import fs from 'node:fs';
const file=new URL('../vercel.json',import.meta.url),config=JSON.parse(fs.readFileSync(file,'utf8'));
config.crons=[...(config.crons||[]).filter(c=>c.path!=='/api/cron/calendar-conversations'),{path:'/api/cron/calendar-conversations',schedule:'0 * * * *'}];
fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');console.log('Hourly calendar review added. Set CRON_SECRET and deploy on a plan supporting hourly cron jobs.');
