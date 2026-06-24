// Formats numbers using Myanmar digits when lang === "my".
// Use sparingly — only for human-facing standalone numbers, not for
// strings that already contain Latin digits inside translated copy.
const MM_DIGITS = ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"];

export function fmtNumber(n: number | string, lang: "en" | "my"): string {
  const s = String(n);
  if (lang !== "my") return s;
  return s.replace(/\d/g, (d) => MM_DIGITS[Number(d)]);
}
