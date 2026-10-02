// Imported CSV, scanner and provider values can be numbers even in text fields.
// Keep their contents while making the CRM's text operations safe.
const textFields = new Set((
  "notesUpdatedAt workflowUpdatedAt quoteDetailsUpdatedAt lastCallResult lastCallStartedAt lastCallDetectionAt lastDetectedCallSid " +
  "deletedAt deletionUpdatedAt name phone city status email stage outcome notes followUp followUpUtc lastContact source product " +
  "sourceDisposition importedAt vendorId sourceSyncStatus providerUpdatedAt address state zip territory brand profileName received " +
  "returnStatus employeeCount searchPro csvFileName csvUpdatedAt lastSmsAt lastEmailAt lastAttemptAt lastConnectedAt assignedTo " +
  "closedAt automationSequenceId automationNextAt automationStatus automationLastError automationDeadLetterAt automationUpdatedAt " +
  "lastInboundAt dateOfBirth policyNumber policyEffectiveDate policyExpirationDate renewalDate licenseNumber licenseState licenseExpiration vin vehicle"
).split(" "));

function text(value: unknown): string {
  if (value == null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function normalizeContactRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid saved contact");
  const lead = {...value} as Record<string, unknown>;
  for (const key of Object.keys(lead)) {
    if (textFields.has(key)) lead[key] = text(lead[key]);
    else if ((key === "importedFields" || key === "extraFields") && lead[key] && typeof lead[key] === "object") {
      lead[key] = Object.fromEntries(Object.entries(lead[key]).map(([name, entry]) => [name, text(entry)]));
    }
  }
  return lead;
}
