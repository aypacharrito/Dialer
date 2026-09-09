import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root=process.cwd();
const self=fileURLToPath(import.meta.url);
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const write=(file,content)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content)};

const legacyPatches=[
  "scripts/apply-pacifica-upgrade.mjs",
  "scripts/apply-pacifica-ui-upgrade.mjs",
  "scripts/apply-pacifica-platform-upgrade.mjs",
  "scripts/apply-pacifica-video-finish.mjs",
  "scripts/apply-pacifica-hybrid-scanner.mjs",
  "scripts/apply-pacifica-ai-media-live.mjs",
  "scripts/apply-pacifica-video-cleanup-v3.mjs",
];

console.log("[consolidate] baking legacy upgrades into source one final time");
for(const relative of legacyPatches){
  const target=path.join(root,relative);
  if(!fs.existsSync(target))continue;
  execFileSync(process.execPath,[target],{cwd:root,stdio:"inherit"});
}

// Make SMS delivery state truthful and refresh rapidly after a manual send.
{
  const file="app/components/MessagesCenter.tsx";
  let source=read(file);
  if(!source.includes("PACIFICA_SMS_DELIVERY_BURST_V1")){
    const anchor='const firstName=(value:string)=>value.trim().split(/\\s+/)[0]||"there";';
    const helper=`${anchor}\n\n// PACIFICA_SMS_DELIVERY_BURST_V1\nfunction smsDeliveryLabel(status:string){\n  const value=String(status||"").toLowerCase();\n  if(["accepted","queued","scheduled","sending"].includes(value))return "Sending";\n  if(value==="sent")return "Carrier accepted";\n  if(value==="delivered")return "Delivered ✓";\n  if(value==="undelivered"||value==="failed")return "Delivery failed";\n  return status||"Unknown";\n}`;
    if(!source.includes(anchor))throw new Error("MessagesCenter firstName anchor changed");
    source=source.replace(anchor,helper);

    const sendAnchor='setSmsMessages(old=>[...old,data.message!]);onPatch(lead.id,{lastSmsAt:new Date().toISOString(),smsConsent:true});';
    const sendReplacement='setSmsMessages(old=>[...old,data.message!]);onPatch(lead.id,{lastSmsAt:new Date().toISOString(),smsConsent:true});[1200,3000,6000,12000,20000,30000].forEach(delay=>window.setTimeout(()=>void load(),delay));';
    if(!source.includes(sendAnchor))throw new Error("MessagesCenter SMS send anchor changed");
    source=source.replace(sendAnchor,sendReplacement);

    const statusAnchor='{new Date(message.sentAt).toLocaleString()} · {message.status} · {message.provider}';
    const statusReplacement='{new Date(message.sentAt).toLocaleString()} · {message.channel==="sms"?smsDeliveryLabel(message.status):message.status} · {message.provider}';
    if(!source.includes(statusAnchor))throw new Error("MessagesCenter status label anchor changed");
    source=source.replace(statusAnchor,statusReplacement);
    write(file,source);
  }
}

// Stop mutating source during every build. Keep only real asset sync/build tasks.
{
  const file="package.json";
  const pkg=JSON.parse(read(file));
  const scripts=pkg.scripts||{};
  for(const key of ["platform:upgrade","video:finish","video:cleanup","scanner:ai","ai:media-live"])delete scripts[key];
  scripts.predev="npm run sync:assets";
  scripts.prebuild="npm run sync:assets";
  scripts["pretest:unit"]="npm run sync:assets";
  delete scripts.prelint;
  pkg.scripts=scripts;
  write(file,JSON.stringify(pkg,null,2)+"\n");
}

// Add native desktop auto-update support. Web/CRM changes already load live from pacificacrm.com.
{
  const file="desktop/package.json";
  const pkg=JSON.parse(read(file));
  pkg.dependencies={...(pkg.dependencies||{}),"electron-updater":"^6.8.9"};
  pkg.build={...(pkg.build||{}),publish:[{provider:"github",owner:"aypacharrito",repo:"Dialer",releaseType:"release"}]};
  write(file,JSON.stringify(pkg,null,2)+"\n");
}

{
  const file="desktop/main.mjs";
  let source=read(file);
  if(!source.includes('from "electron-updater"')){
    source=source.replace('import { app, BrowserWindow, ipcMain, session, shell, screen } from "electron";','import { app, BrowserWindow, ipcMain, session, shell, screen } from "electron";\nimport electronUpdater from "electron-updater";');
  }
  if(!source.includes("PACIFICA_DESKTOP_AUTO_UPDATE_V1")){
    const vars='let lastCallState={active:false};';
    const replacement=`${vars}\nconst {autoUpdater}=electronUpdater; // PACIFICA_DESKTOP_AUTO_UPDATE_V1\nlet updateTimer=null;`;
    if(!source.includes(vars))throw new Error("desktop updater variable anchor changed");
    source=source.replace(vars,replacement);

    const ready='app.whenReady().then(()=>{';
    const updater=`function startDesktopUpdater(){\n  if(!app.isPackaged||process.platform!=="win32")return;\n  autoUpdater.autoDownload=true;\n  autoUpdater.autoInstallOnAppQuit=true;\n  autoUpdater.allowPrerelease=false;\n  autoUpdater.on("error",error=>console.warn("[Pacifica updater]",error?.message||error));\n  const check=()=>void autoUpdater.checkForUpdatesAndNotify().catch(error=>console.warn("[Pacifica updater check]",error?.message||error));\n  check();\n  updateTimer=setInterval(check,4*60*60*1000);\n}\n\n${ready}`;
    if(!source.includes(ready))throw new Error("desktop app.whenReady anchor changed");
    source=source.replace(ready,updater);

    const windowCreate='  createWindow();\n  app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});';
    const windowCreateNext='  createWindow();\n  setTimeout(startDesktopUpdater,6000);\n  app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});';
    if(!source.includes(windowCreate))throw new Error("desktop createWindow anchor changed");
    source=source.replace(windowCreate,windowCreateNext);

    const close='app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});';
    const closeNext='app.on("window-all-closed",()=>{if(updateTimer){clearInterval(updateTimer);updateTimer=null}if(process.platform!=="darwin")app.quit()});';
    if(source.includes(close))source=source.replace(close,closeNext);
    write(file,source);
  }
}

// Desktop releases now publish updater metadata and get a unique semver build version.
{
  const workflow=[
    'name: Pacifica Desktop Release',
    '',
    'on:',
    '  push:',
    '    branches:',
    '      - main',
    '    paths:',
    '      - "desktop/**"',
    '      - ".github/workflows/pacifica-desktop-release.yml"',
    '  workflow_dispatch:',
    '',
    'permissions:',
    '  contents: write',
    '',
    'jobs:',
    '  build-windows:',
    '    runs-on: windows-latest',
    '',
    '    steps:',
    '      - name: Checkout Pacifica',
    '        uses: actions/checkout@v4',
    '',
    '      - name: Set up Node',
    '        uses: actions/setup-node@v4',
    '        with:',
    '          node-version: "22"',
    '',
    '      - name: Install desktop dependencies',
    '        working-directory: desktop',
    '        run: npm install --no-audit --no-fund',
    '',
    '      - name: Set release version',
    '        working-directory: desktop',
    '        shell: pwsh',
    '        run: npm version "0.2.${{ github.run_number }}" --no-git-tag-version',
    '',
    '      - name: Build Pacifica Windows installer',
    '        working-directory: desktop',
    '        env:',
    '          CSC_IDENTITY_AUTO_DISCOVERY: "false"',
    '        run: npm run dist:win',
    '',
    '      - name: Save installer artifact',
    '        uses: actions/upload-artifact@v4',
    '        with:',
    '          name: Pacifica-Windows-Installer',
    '          path: |',
    '            desktop/dist/*.exe',
    '            desktop/dist/latest*.yml',
    '          if-no-files-found: error',
    '',
    '      - name: Publish Pacifica Desktop release',
    '        uses: softprops/action-gh-release@v2',
    '        with:',
    '          tag_name: pacifica-desktop-${{ github.run_number }}',
    '          name: Pacifica Desktop ${{ github.run_number }}',
    '          make_latest: true',
    '          files: |',
    '            desktop/dist/*.exe',
    '            desktop/dist/latest*.yml',
    '',
  ].join("\n");
  write(".github/workflows/pacifica-desktop-release.yml",workflow);
}

// Remove only migration/patch code that is now baked into the actual source.
for(const relative of legacyPatches){
  const target=path.join(root,relative);
  if(fs.existsSync(target))fs.rmSync(target);
}

// This migration and its workflow remove themselves after the runner executes once.
const onceWorkflow=path.join(root,".github/workflows/pacifica-consolidate-once.yml");
if(fs.existsSync(onceWorkflow))fs.rmSync(onceWorkflow);
if(fs.existsSync(self))fs.rmSync(self);

console.log("[consolidate] complete: source baked, legacy patch scripts removed, SMS status burst enabled, desktop updater enabled");
