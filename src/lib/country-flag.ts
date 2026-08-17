/** Best-effort country name → flag emoji for profile display. */
const NAME_TO_CODE: Record<string, string> = {
  nepal: "NP",
  india: "IN",
  bangladesh: "BD",
  pakistan: "PK",
  "sri lanka": "LK",
  "united states": "US",
  usa: "US",
  "united kingdom": "GB",
  uk: "GB",
  china: "CN",
  japan: "JP",
  "south korea": "KR",
  korea: "KR",
  australia: "AU",
  canada: "CA",
  germany: "DE",
  france: "FR",
  brazil: "BR",
  argentina: "AR",
  spain: "ES",
  portugal: "PT",
  italy: "IT",
  netherlands: "NL",
  qatar: "QA",
  uae: "AE",
  "saudi arabia": "SA",
  malaysia: "MY",
  singapore: "SG",
  thailand: "TH",
  indonesia: "ID",
  philippines: "PH",
  vietnam: "VN",
};

function codeToFlag(code: string): string {
  const c = code.toUpperCase();
  if (c.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + c.charCodeAt(0) - 65, A + c.charCodeAt(1) - 65);
}

export function countryFlag(country: string | null | undefined): string | null {
  if (!country?.trim()) return null;
  const raw = country.trim();
  if (/^[A-Za-z]{2}$/.test(raw)) return codeToFlag(raw);
  const key = raw.toLowerCase();
  const code = NAME_TO_CODE[key];
  if (code) return codeToFlag(code);
  const first = key.split(/[\s,]+/)[0];
  if (NAME_TO_CODE[first]) return codeToFlag(NAME_TO_CODE[first]);
  return null;
}
