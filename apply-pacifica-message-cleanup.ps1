$ErrorActionPreference = "Stop"

Write-Host "Pacifica patch: STOP cleanup + autocorrect + icon centering" -ForegroundColor Cyan

$repo = (Get-Location).Path
$messages = Join-Path $repo "app\components\MessagesCenter.tsx"
$overlay = Join-Path $repo "desktop\overlay.html"

if (!(Test-Path $messages)) {
  throw "Run this from the root of the Pacifica/Dialer repository. Missing: app\components\MessagesCenter.tsx"
}
if (!(Test-Path $overlay)) {
  throw "Run this from the root of the Pacifica/Dialer repository. Missing: desktop\overlay.html"
}

function Replace-Exact {
  param(
    [string]$Path,
    [string]$Old,
    [string]$New,
    [string]$Label
  )
  $text = [System.IO.File]::ReadAllText($Path)
  if ($text.Contains($New)) {
    Write-Host "Already applied: $Label" -ForegroundColor DarkGray
    return
  }
  if (!$text.Contains($Old)) {
    throw "Could not find expected code for: $Label`nFile: $Path"
  }
  $text = $text.Replace($Old, $New)
  [System.IO.File]::WriteAllText($Path, $text, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Applied: $Label" -ForegroundColor Green
}

# Backups, only once.
foreach ($file in @($messages, $overlay)) {
  $backup = "$file.pacifica-before-message-cleanup.bak"
  if (!(Test-Path $backup)) {
    Copy-Item $file $backup
  }
}

Replace-Exact $messages `
'const firstName=(value:string)=>value.trim().split(/\s+/)[0]||"there";' `
@'
const firstName=(value:string)=>value.trim().split(/\s+/)[0]||"there";
const isSmsStopReply=(value:string)=>/^\s*(stop|stopall|unsubscribe|cancel|end|quit)\s*[.!]?\s*$/i.test(value);
'@ `
"Add shared STOP/opt-out detector"

Replace-Exact $messages `
'  const orderedLeads=useMemo(()=>rankMessageLeads(leads,smsMessages,channel,rankingNow),[leads,smsMessages,channel,rankingNow]);' `
@'
  const orderedLeads=useMemo(()=>rankMessageLeads(leads,smsMessages,channel,rankingNow),[leads,smsMessages,channel,rankingNow]);
  const smsOptOutNumbers=useMemo(()=>new Set(smsMessages.filter(message=>/inbound/i.test(message.direction)&&isSmsStopReply(message.body)).map(message=>digits(message.from)).filter(Boolean)),[smsMessages]);
  const isHiddenSmsOptOut=useCallback((lead:MessageLead)=>channel==="sms"&&(Boolean(lead.smsOptOut)||smsOptOutNumbers.has(digits(lead.phone))),[channel,smsOptOutNumbers]);
'@ `
"Track opt-out numbers immediately from inbound SMS"

Replace-Exact $messages `
'      if(lead.smsOptOut&&lead.stage==="Closed")return false;' `
'      if(isHiddenSmsOptOut(lead))return false;' `
"Hide STOP contacts from normal SMS conversations"

Replace-Exact $messages `
'  },[contactSearch,orderedLeads,inboxFilter,latestMessages]);' `
'  },[contactSearch,orderedLeads,inboxFilter,latestMessages,isHiddenSmsOptOut]);' `
"Keep inbox filtering reactive to STOP replies"

Replace-Exact $messages `
'  const selected=orderedLeads.find(lead=>lead.id===selectedId)||visibleLeads[0];' `
@'
  const selectedCandidate=orderedLeads.find(lead=>lead.id===selectedId);
  const selected=selectedCandidate&&!isHiddenSmsOptOut(selectedCandidate)?selectedCandidate:visibleLeads[0];
'@ `
"Remove a STOP contact from the active SMS thread"

Replace-Exact $messages `
'for(const message of incoming){if(!/inbound/i.test(message.direction)||!/^\s*(stop|stopall|unsubscribe|cancel|end|quit)\s*[.!]?\s*$/i.test(message.body))continue;' `
'for(const message of incoming){if(!/inbound/i.test(message.direction)||!isSmsStopReply(message.body))continue;' `
"Reuse one STOP detector for CRM opt-out state"

Replace-Exact $messages `
'<textarea aria-label="Message body" value={draft} onChange=' `
'<textarea aria-label="Message body" value={draft} spellCheck={true} autoCorrect="on" autoCapitalize="sentences" inputMode="text" onChange=' `
"Enable native spelling/autocorrect in message composer"

Replace-Exact $overlay `
'.icon{width:30px;padding:0;font-size:16px}' `
'.icon{width:30px;padding:0;font-size:16px;display:inline-grid;place-items:center;line-height:1;text-align:center}' `
"Center overlay symbol buttons"

Replace-Exact $overlay `
'.incoming .incoming-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:50%;background:var(--soft);font-size:20px;flex:none}' `
'.incoming .incoming-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:50%;background:var(--soft);font-size:20px;line-height:1;text-align:center;flex:none}' `
"Center incoming-call phone symbol"

Write-Host ""
Write-Host "Patch complete." -ForegroundColor Green
Write-Host "Changed:" -ForegroundColor Cyan
Write-Host "  - STOP/UNSUBSCRIBE/CANCEL/END/QUIT replies disappear from the normal SMS inbox/replies list"
Write-Host "  - Opted-out contacts are still blocked from SMS"
Write-Host "  - Text composer has spellcheck/autocorrect/autocapitalization enabled"
Write-Host "  - Desktop overlay symbols are visually centered"
Write-Host ""
Write-Host "Review with: git diff -- app/components/MessagesCenter.tsx desktop/overlay.html" -ForegroundColor Yellow
