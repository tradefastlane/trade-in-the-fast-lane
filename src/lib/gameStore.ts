import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GameSnapshot, PersistedGame } from "../game/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const supabase: SupabaseClient | null = hasSupabase
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: window.sessionStorage,
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

export async function ensureIdentity() {
  const client = onlineClient();
  const session = await client.auth.getSession();
  if (session.data.session?.user.id) return session.data.session.user.id;
  const auth = await client.auth.signInAnonymously();
  if (auth.error) throw auth.error;
  return auth.data.user!.id;
}

export async function createPersistedGame(snapshot: GameSnapshot) {
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

export async function loadPersistedGame(code: string): Promise<PersistedGame | null> {
  const normalized = code.toUpperCase();
  const result = await onlineClient()
    .from("games")
    .select("snapshot, version")
    .eq("code", normalized)
    .maybeSingle();
  if (result.error) throw result.error;
  return (result.data as PersistedGame | null) ?? null;
}

export async function updatePersistedGame(
  code: string,
  reducer: (snapshot: GameSnapshot) => void,
) {
  const normalized = code.toUpperCase();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await loadPersistedGame(normalized);
    if (!current) throw new Error("Game not found");
    const snapshot = structuredClone(current.snapshot);
    reducer(snapshot);

    const result = await onlineClient()
      .from("games")
      .update({ snapshot, version: current.version + 1 })
      .eq("code", normalized)
      .eq("version", current.version)
      .select("snapshot, version")
      .maybeSingle();
    if (result.error) throw result.error;
    if (result.data) return result.data as PersistedGame;
  }
  throw new Error("The game changed too quickly. Please try again.");
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
