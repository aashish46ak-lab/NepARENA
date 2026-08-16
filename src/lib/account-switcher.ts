/**
 * Lightweight multi-account helper.
 * Stores account metadata only (no passwords/tokens).
 * Switching signs out and routes to auth so the user can sign in as another account.
 */
export type SavedAccount = {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  lastUsedAt: string;
};

const KEY = "neparena_saved_accounts_v1";
const MAX = 6;

function read(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: SavedAccount[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}

export function listSavedAccounts(): SavedAccount[] {
  return read().sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
  );
}

export function rememberAccount(account: {
  id: string;
  email?: string | null;
  name?: string | null;
  avatar?: string | null;
}) {
  if (!account.id) return;
  const email = (account.email || "").trim();
  if (!email) return;
  const list = read().filter((a) => a.id !== account.id && a.email !== email);
  list.unshift({
    id: account.id,
    email,
    name: (account.name || email.split("@")[0] || "Player").trim(),
    avatar: account.avatar ?? null,
    lastUsedAt: new Date().toISOString(),
  });
  write(list);
}

export function removeSavedAccount(id: string) {
  write(read().filter((a) => a.id !== id));
}

export function clearSavedAccounts() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
