PACIFICA ONE-TIME CONSOLIDATION

1. Extract this ZIP into the ROOT of aypacharrito/Dialer.
2. Overwrite/merge folders.
3. Push all files to main.

GitHub Actions will run "Pacifica One-Time Consolidation" once. It will:
- run all legacy apply-pacifica-* patches one final time so the final behavior is baked into source;
- remove those obsolete patch scripts and their package.json prebuild hooks;
- add truthful SMS delivery labels and fast post-send status refreshes;
- add Windows desktop auto-update support;
- update the desktop release workflow so it publishes latest.yml + a unique version;
- delete the one-time migration script and workflow after it commits the cleanup.

IMPORTANT: the currently installed Pacifica 0.2.0 EXE does not contain updater code. After the new desktop release is published, install that new EXE one final time. Future native desktop updates can then update automatically. Web/CRM updates continue to load without reinstalling.
