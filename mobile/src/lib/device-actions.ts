export function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return `${hasLeadingPlus ? "+" : ""}${digits}`;
}

export function phoneCallUrl(value: string) {
  const phone = normalizePhoneNumber(value);
  return phone ? `tel:${phone}` : "";
}

export function textMessageUrl(value: string) {
  const phone = normalizePhoneNumber(value);
  return phone ? `sms:${phone}` : "";
}

/**
 * Opens a native device action directly. Expo's canOpenURL can report false for
 * tel/sms on otherwise capable devices, so the operating system is the source
 * of truth and any real launch failure is handled by the caller.
 */
export async function openDeviceAction(url: string, opener: (target: string) => Promise<unknown>) {
  if (!url) throw new Error("No phone number is available.");
  await opener(url);
}
