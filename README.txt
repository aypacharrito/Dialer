PACIFICA CRM A2P SITE FIXES

Drop these files into the ROOT of your GitHub repo and allow them to replace the matching existing files.

Included:
- app/sms/page.tsx                 NEW
- app/terms/page.tsx               REPLACE
- app/privacy/page.tsx             REPLACE
- app/landing/LandingClient.tsx    REPLACE

IMPORTANT:
Before deploying, open app/sms/page.tsx and replace:
+1 (XXX) XXX-XXXX
with the actual Pacifica CRM Twilio number used for this messaging campaign.

After deployment verify:
https://pacificacrm.com/sms
https://pacificacrm.com/terms
https://pacificacrm.com/privacy
