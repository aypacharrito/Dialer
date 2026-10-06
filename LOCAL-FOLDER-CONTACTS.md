# V43 · Local folder contacts

Use **Contacts → Scan folder → Choose folder** on the device containing your files.

- Files are read locally, one file/page or CSV chunk at a time. The folder is not uploaded to OpenAI or the CRM. Parsing and English OCR use bundled browser libraries. This is not an offline general-purpose language model.
- Supported inputs: PDF text, scanned PDF pages, common browser-decodable images, comma-separated CSV, TSV, labeled TXT, JSON records/contacts arrays, and VCF. Unsupported, encrypted, malformed or unreadable files appear under **Files need attention**.
- Extracts name, phone, email, address, city, state, ZIP and an explicitly provided product. Saves source filename and page/row for review. Does not guess missing contact details. Unstructured/OCR results require approval before adding.
- **Add ready contacts** appends new records to the currently selected queue. It skips matching existing and deleted contacts. It does not enrich or overwrite an existing lead. New records do not claim messaging consent or enable automated outreach.
- **Export CSV** includes all extracted records, source references and review flags. Where supported, export streams directly to a selected destination; other browsers have a 32 MB text export limit.
- **Pause**, **Resume**, **Stop** and the minimize button keep navigation available. Keep Pacifica running during a scan. After restart, reselect the same folder: completed files are skipped and incomplete files are re-read with duplicate protection. Progress and extracted fields are stored locally per workspace in IndexedDB. Original files are never modified.
- **Clear local results** removes the local extraction cache and checkpoints, not original files or contacts already added to the CRM.

## Capacity

There is no total folder-size cap. A 27 GB folder is processed incrementally, not loaded into one request. Practical limits depend on file count, device memory, local storage and scan quality. Per-file limits: PDF 256 MB, image 64 MB, TXT/JSON/VCF 32 MB. CSV/TSV stream in chunks; an individual CSV record is capped at 1 MB. Large PDFs need splitting. Browser storage may be cleared by the user/browser. No 27 GB sample was available for a full-scale test.

Contact details are sent to the normal CRM save path only when **Add ready contacts** is selected. The files and raw extracted document text stay local.
