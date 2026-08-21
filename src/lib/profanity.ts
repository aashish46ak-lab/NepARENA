/**
 * Client-side profanity / abuse filter (EN + common Nepali insults).
 * Server RLS still required for real enforcement.
 */

const BANNED = [
  "fuck", "fucker", "fucking", "motherfucker", "shit", "bitch", "asshole",
  "bastard", "cunt", "dickhead", "piss off", "slut", "whore",
  "nigger", "nigga", "faggot", "retard", "rape", "rapist",
  "muji", "mujii", "mujhi", "randi", "randii", "chikne", "chikney",
  "madarchod", "madar chod", "behenchod", "bhenchod", "bhosdi", "bhosdike",
  "bhosada", "gandu", "ganduu", "haraamzada", "haramzada", "kutta",
  "sali", "saali", "boka", "lado", "puti", "chut", "chod", "chodu",
  "machikne", "machikney", "terimuji", "teri muji", "mujiko", "randiko",
  "bitchass", "dickhead",
];

const PATTERN = new RegExp(
  `\\b(${BANNED.map((w) => w.replace(/\s+/g, "\\s+")).join("|")})\\b`,
  "i",
);

export function containsProfanity(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = text
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/1/g, "i")
    .replace(/\$/g, "s");
  return PATTERN.test(normalized);
}

export function profanityMessage(): string {
  return "Please remove abusive or banned words before posting.";
}

export function assertCleanText(text: string): { ok: true } | { ok: false; error: string } {
  if (containsProfanity(text)) return { ok: false, error: profanityMessage() };
  return { ok: true };
}
