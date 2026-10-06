# Pacifica V38

## Today

Today reviews each contact's saved notes, sent and received texts and emails,
research, document context, and existing checklist together. New tasks need a
concrete outstanding action and a matching evidence excerpt. Later activity can
resolve a task when it clearly proves completion; failed or queued messages do
not prove completion.

Pictures and PDFs save extracted information as context. They no longer produce
a separate task for every field. Existing automatic “Review information” items
move to Removed, while their document evidence stays available. Done and Removed
decisions made by a person remain protected. Reviews can run while you complete
tasks, without an older response undoing your change.

The review processes contacts in batches. Refresh shows the remaining queue;
the existing server schedule continues it in the background. Connect the existing
OpenAI service in Settings if it is not already configured. Provider failures keep
work pending and show a retry message. This process does not edit existing leads.

## Pacifica AI

- Audience has real Choose contacts, Follow-ups, New leads, and All eligible
  options. Counts and selection use the full workspace rather than the AI's
  smaller detail sample. Existing channel permissions and exclusions still apply.
- Revising a draft retains your selected recipients. AI errors retain the draft,
  channel, and selection. Try again and Open Messages provide recovery paths.
- Voice input records only after you click the microphone. Finish recording
  transcribes into editable text; Send remains a separate action. Cancel or
  leaving the conversation stops the microphone.
- The sidebar language preference also controls message writing and dictation.
  The duplicate selector in Messages is removed.

## Pages & connections

Open Pages & connections beside Pacifica AI. The updated desktop app supports
public HTTPS sites in a separate page panel, with sign-in sessions separated by
workspace. Add page to AI explicitly shares a snapshot of visible page text.
Inputs, editable fields, scripts, cookies, and browser storage are not extracted.
Page snapshots remain attached to this conversation until removed or New request
is selected. AI treats page content as reference material and cannot operate the
site or submit its forms.

Some sites require sign-in in an external browser or block embedded browsers.
Open in browser and Paste text remain available. The website and older desktop
versions use this external-browser path. Password and cookie import is not part
of this release.

Pushing the desktop changes to main triggers the existing Windows release
workflow. Install that updated build, or accept Pacifica's desktop update, to
enable embedded pages. A website refresh alone cannot update Electron. Windows
installer execution and live third-party sign-in require verification on Windows;
the controller, permission boundaries, and browser fallback were checked here.

## Appearance

The CRM uses a self-hosted Manrope variable font, consistent spacing and focus
states, quieter settings navigation, and reduced-motion support. Miner cards now
use the correct light and dark theme colors. The shared quiet scrollbars from
the previous release remain across CRM and public pages.

## Apply the ZIP

Extract all files, run RUN-NOW.bat, and select the Dialer repository folder shown
by GitHub Desktop. The installer checks compatibility before applying changes.
Review, commit, and Push origin in GitHub Desktop, then wait for the website and
Windows workflows to finish. The installer supports V37, V36, V35, and V34 and
does not commit or publish automatically.

Existing Miner lead creation, owner access grants, and account trials from V37
are included when updating an older version. See MINER-AND-ACCOUNT-ACCESS.md.
