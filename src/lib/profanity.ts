/**
 * Client-side content filter — English, Hindi, Nepali abusive terms.
 * Blocks common leetspeak (0→o, 1→i, $→s). Server RLS still recommended.
 */

const BANNED = [
  // English
  "fuck", "fucker", "fucking", "motherfucker", "shit", "bitch", "asshole",
  "bastard", "cunt", "dickhead", "piss off", "slut", "whore", "dick", "cock",
  "nigger", "nigga", "faggot", "retard", "rape", "rapist", "porn", "porno",
  "kill yourself", "kys",
  // Hindi / Hinglish
  "madarchod", "madar chod", "behenchod", "bhenchod", "bhenchod", "bhosdi",
  "bhosdike", "bhosada", "bhosdiwale", "gandu", "ganduu", "gaand",
  "haraamzada", "haramzada", "kutta", "kutti", "saala", "sali", "saali",
  "randi", "randii", "rand", "chutiya", "chutia", "chut", "chod", "chodu",
  "loda", "lode", "lund", "lauda", "lawda", "bhadwa", "bhadwe",
  "harami", "kamina", "kamine", "suar", "suar ke",
  // Nepali / romanized
  "muji", "mujii", "mujhi", "mujiko", "teri muji", "terimuji",
  "chikne", "chikney", "machikne", "machikney", "randiko",
  "boka", "lado", "puti", "radi", "rado", "khate", "sale",
  "bitchass",
];

const PATTERN = new RegExp(
  `\\b(${BANNED.map((w) => w.replace(/\s+/g, "\\s+")).join("|")})\\b`,
  "i",
);

export function containsProfanity(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[0@]/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/\$/g, "s")
    .replace(/[!._*-]+/g, " ");
  return PATTERN.test(normalized);
}

export function profanityMessage(): string {
  return "Please remove abusive language (English / हिन्दी / नेपाली) before posting.";
}

export function assertCleanText(
  text: string,
): { ok: true } | { ok: false; error: string } {
  if (containsProfanity(text)) return { ok: false, error: profanityMessage() };
  return { ok: true };
}
