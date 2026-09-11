PACIFICA CRM — LEAD PERSISTENCE FIX ONLY

There are NO scrolling changes in this Pacifica package.

Included fixes:
1. Fresh David's Insurance website leads stay merged correctly.
2. A new received timestamp counts as a real provider update.
3. The newest website submission can refresh the contact instead of appearing briefly and seeming to disappear.
4. Duplicate handling still protects important CRM history.

Files included:
app/lib/provider-lead-merge.ts
app/lib/csv-lead-merge.ts

Replace those two files in the Dialer repo, then commit and push.

git add app/lib/provider-lead-merge.ts app/lib/csv-lead-merge.ts
git commit -m "Fix website lead persistence"
git push
