# V44 · Pacifica AI folder scanning

Open **Pacifica AI → Scan folder → Choose folder → Scan with AI** on the computer containing your files. You can also ask Pacifica AI, “Scan my folder for home and auto contacts.” That opens the scanner with your request as its instructions; choose the folder and start the scan there.

## Reading and extraction

- **Pacifica AI** mode uses the same server OpenAI connection and model as the assistant. Local code reads files and performs English OCR; the model reads extracted text for contact details in prose, irregular tables and scattered documents. Each request contains a bounded text section, its source filename/page and your instructions. Original files and the whole folder are not uploaded. Extracted text **is sent to OpenAI** and API usage is charged. This is not offline AI.
- **Local parser** mode remains available for local-only parsing and OCR without OpenAI calls. It works best with structured or labeled contact details.
- Supported inputs: PDF text and scanned PDF pages, browser-decodable images, CSV, TSV, TXT, Markdown, LOG, JSON and VCF. Unsupported formats, encrypted or unreadable documents and parsing errors appear under **Files need attention**. ZIP, DOCX, XLSX and email archive files are not supported; export or convert those first.
- AI extracts name, phone, email, address, city, state, ZIP and explicitly stated product. Nonempty fields must have supporting quotes in the supplied text; unsupported values are discarded, and uncertain results require review. These checks reduce invented details but cannot guarantee perfect identity association or OCR accuracy.

## Duplicates and adding contacts

- Matching phone, email, or name plus address identifies a staged duplicate. Complementary details combine across files. Name alone never merges two people. Conflicting values and overlapping identities require review; sources and conflicting alternatives remain visible. Details with no reliable shared identity cannot automatically be joined across unrelated files.
- **Add ready contacts** appends new records to the selected CRM queue. Matching existing or deleted contacts are skipped. Existing leads are never enriched or overwritten. New records do not claim messaging consent or enable automated outreach.
- **Export CSV** includes extracted fields, review flags, source references and conflicting alternatives. Where supported, export streams to a selected destination; other browsers have a 32 MB text export limit.

## Usage, progress and capacity

- The default **AI request limit** is 25 per scan; adjustable from 1 to 500. This is a request limit, not a dollar cap. Actual charges depend on the configured model and tokens. Displayed tokens are usage reported by successful responses; failed requests may also incur charges. Set project spending controls in your OpenAI account for budget management.
- Successful text sections are cached locally. At the limit or a provider error, scanning stops and retains progress; start another pass to continue. Reselect the same folder after a restart. Unchanged completed files and cached sections avoid repeat AI requests. Changing the model or instructions starts a new extraction pass. Failed or interrupted requests without a saved response may be charged again when explicitly retried; there is no automatic retry loop or silent local-parser fallback.
- **Pause**, **Resume**, **Stop** and minimize keep navigation available. Keep Pacifica open during scanning. Progress, contact candidates and extracted result caches are stored in this browser's IndexedDB per workspace. They do not follow you automatically to a different device. Source files are never modified.
- **Clear local results** removes scan checkpoints and extraction caches, not original files or contacts already added to the CRM. Browser storage may also be cleared by the browser/user.
- No total folder-size cap is imposed: files/pages are processed sequentially rather than loading 27 GB at once. Practical capacity depends on file count, device memory, local storage and document quality. Per-file limits: PDF 256 MB; image 64 MB; TXT/MD/LOG/JSON/VCF 32 MB. CSV/TSV stream in chunks with a 1 MB maximum record. Large files need splitting.

Automated tests use mocked AI responses and synthetic files; no live AI credits or customer calls are used. A full 27 GB dataset was not available for scale testing. Model extraction accuracy still needs checking against your actual documents.
