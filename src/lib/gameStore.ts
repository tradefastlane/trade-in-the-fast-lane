import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GameSnapshot, PersistedGame } from "../game/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const READ_RETRY_DELAYS = [120, 300];
const UPDATE_ATTEMPTS = 6;
const RATE_LIMIT_RETRY_DELAYS = [750, 1_500, 3_000];
const REFRESH_SESSION_WITHIN_MS = 15 * 1000;
const AUTH_RETRY_DELAY_MS = 2 * 60 * 1000;

function isValidSupabaseUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
}

export const hasSupabase = Boolean(
  isValidSupabaseUrl(SUPABASE_URL) && SUPABASE_ANON_KEY?.trim(),
);
let mutationQueue: Promise<void> = Promise.resolve();
let identityRequest: Promise<string> | null = null;
let cachedIdentity = "";
let cachedExpiresAt = 0;
let authRetryAt = 0;

function migrateAuthStorage() {
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (!key?.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
    if (!window.localStorage.getItem(key)) {
      const value = window.sessionStorage.getItem(key);
      if (value) window.localStorage.setItem(key, value);
    }
  }
}

if (hasSupabase) migrateAuthStorage();

const supabase: SupabaseClient | null = hasSupabase
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: window.localStorage,
      },
    })
  : null;

function onlineClient() {
  if (!supabase) {
    throw new Error(
      "Online services are not configured. Add the Supabase URL and publishable key, then restart the game.",
    );
  }
  return supabase;
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

function isRateLimitError(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    error.code === "429"
  );
}

async function ensureIdentityNow() {
  if (cachedIdentity && cachedExpiresAt - Date.now() > REFRESH_SESSION_WITHIN_MS) {
    return cachedIdentity;
  }

  const client = onlineClient();
  const session = await client.auth.getSession();
  if (session.error) throw session.error;
  if (session.data.session?.user.id) {
    const expiresAt = (session.data.session.expires_at ?? 0) * 1000;
    if (expiresAt && expiresAt - Date.now() <= REFRESH_SESSION_WITHIN_MS) {
      const refreshed = await client.auth.refreshSession(session.data.session);
      if (refreshed.error) throw refreshed.error;
      if (refreshed.data.user?.id) {
        cachedIdentity = refreshed.data.user.id;
        cachedExpiresAt = (refreshed.data.session?.expires_at ?? 0) * 1000;
        return cachedIdentity;
      }
    }
    cachedIdentity = session.data.session.user.id;
    cachedExpiresAt = expiresAt;
    return cachedIdentity;
  }

  if (Date.now() < authRetryAt) {
    const seconds = Math.max(1, Math.ceil((authRetryAt - Date.now()) / 1000));
    throw new Error(`Online sign-in is cooling down. Try again in ${seconds} seconds.`);
  }

  const auth = await client.auth.signInAnonymously();
  if (auth.error) {
    authRetryAt = Date.now() + AUTH_RETRY_DELAY_MS;
    if (auth.error.message.toLowerCase().includes("rate limit")) {
      throw new Error("Online sign-in was temporarily rate-limited. Wait at least two minutes, then refresh once.");
    }
    throw auth.error;
  }
  cachedIdentity = auth.data.user!.id;
  cachedExpiresAt = (auth.data.session?.expires_at ?? 0) * 1000;
  authRetryAt = 0;
  return cachedIdentity;
}

export function ensureIdentity() {
  if (!identityRequest) {
    identityRequest = ensureIdentityNow().finally(() => {
      identityRequest = null;
    });
  }
  return identityRequest;
}

export async function createPersistedGame(snapshot: GameSnapshot) {
  await ensureIdentity();
  const result = await onlineClient()
    .from("games")
    .insert({
      id: snapshot.id,
      code: snapshot.code,
      snapshot,
      version: 0,
    })
    .select("snapshot, version")
    .single();
  if (result.error) throw result.error;
  return result.data as PersistedGame;
}

async function readPersistedGame(normalizedCode: string) {
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS.length; attempt += 1) {
    const result = await onlineClient()
      .from("games")
      .select("snapshot, version")
      .eq("code", normalizedCode)
      .maybeSingle();
    if (!result.error) return (result.data as PersistedGame | null) ?? null;
    if (!isRateLimitError(result.error) || attempt === RATE_LIMIT_RETRY_DELAYS.length) {
      throw result.error;
    }
    await wait(RATE_LIMIT_RETRY_DELAYS[attempt]);
  }
  return null;
}

export async function loadPersistedGame(code: string): Promise<PersistedGame | null> {
  const normalized = code.toUpperCase();
  await ensureIdentity();

  for (let attempt = 0; attempt <= READ_RETRY_DELAYS.length; attempt += 1) {
    const persisted = await readPersistedGame(normalized);
    if (persisted) return persisted;
    if (attempt < READ_RETRY_DELAYS.length) {
      await wait(READ_RETRY_DELAYS[attempt]);
    }
  }

  return null;
}

async function updatePersistedGameNow(
  code: string,
  reducer: (snapshot: GameSnapshot) => void,
): Promise<PersistedGame> {
  const normalized = code.toUpperCase();
  let foundGame = false;
  await ensureIdentity();

  for (let attempt = 0; attempt < UPDATE_ATTEMPTS; attempt += 1) {
    const current = await readPersistedGame(normalized);
    if (!current) {
      await wait(100 + attempt * 100);
      continue;
    }
    foundGame = true;
    const snapshot = structuredClone(current.snapshot);
    reducer(snapshot);

    const result = await onlineClient()
      .from("games")
      .update({ snapshot, version: current.version + 1 })
      .eq("code", normalized)
      .eq("version", current.version)
      .select("snapshot, version")
      .maybeSingle();
    if (result.error) {
      if (isRateLimitError(result.error)) {
        const retryDelay =
          RATE_LIMIT_RETRY_DELAYS[Math.min(attempt, RATE_LIMIT_RETRY_DELAYS.length - 1)];
        await wait(retryDelay);
        continue;
      }
      throw result.error;
    }
    if (result.data) return result.data as PersistedGame;
    await wait(40 + attempt * 35 + Math.random() * 60);
  }

  throw new Error(
    foundGame
      ? "The room is temporarily busy. Your action was not charged—please try once more."
      : "The room could not be synchronized. Refresh the page and try again.",
  );
}

export function updatePersistedGame(
  code: string,
  reducer: (snapshot: GameSnapshot) => void,
): Promise<PersistedGame> {
  const operation = mutationQueue.then(
    () => updatePersistedGameNow(code, reducer),
    () => updatePersistedGameNow(code, reducer),
  );
  mutationQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

export function subscribeToGame(
  code: string,
  onUpdate: (persisted: PersistedGame) => void,
) {
  const normalized = code.toUpperCase();
  const client = onlineClient();
  const channel = client
    .channel(`game-${normalized}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `code=eq.${normalized}`,
      },
      (payload) => {
        const row = payload.new as { snapshot: GameSnapshot; version: number };
        onUpdate({ snapshot: row.snapshot, version: row.version });
      },
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
