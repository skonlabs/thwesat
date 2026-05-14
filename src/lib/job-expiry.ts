const YANGON_TIME_ZONE = "Asia/Yangon";

export function jobExpiryDateToIso(dateValue: string): string | null {
  if (!dateValue) return null;
  return new Date(`${dateValue}T23:59:59.999+06:30`).toISOString();
}

export function jobExpiryIsoToDateInput(isoValue: string | null | undefined): string {
  if (!isoValue) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: YANGON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(isoValue));
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function isJobExpired(isoValue: string | null | undefined): boolean {
  return !!isoValue && new Date(isoValue).getTime() <= Date.now();
}

export function todayDateInput(): string {
  return jobExpiryIsoToDateInput(new Date().toISOString());
}