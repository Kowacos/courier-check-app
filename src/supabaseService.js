/**
 * supabaseService.js
 *
 * CRUD operace pro uložené kontroly.
 * Pokud Supabase není nakonfigurováno, všechny funkce tiše selžou
 * a aplikace funguje pouze s localStorage.
 *
 * Schéma tabulky (spustit v Supabase SQL editoru):
 *
 * create table if not exists archive (
 *   id         uuid primary key,
 *   data       jsonb not null,
 *   archived_at timestamptz not null,
 *   created_at  timestamptz default now()
 * );
 *
 * create index if not exists idx_archive_created_at on archive(created_at desc);
 * alter table archive disable row level security;
 */

import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Archiv
// ---------------------------------------------------------------------------

/** Načte všechny archivované kontroly, seřazené od nejnovější. */
export async function fetchArchive() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("archive")
    .select("data")
    .order("archived_at", { ascending: false });
  if (error) { console.error("fetchArchive:", error.message); return null; }
  return data.map((row) => row.data);
}

/** Uloží novou archivovanou kontrolu. */
export async function insertArchiveEntry(inspection) {
  if (!supabase) return;
  const { error } = await supabase.from("archive").insert({
    id: inspection.archivedAt, // ISO string jako unikátní ID
    data: inspection,
    archived_at: inspection.archivedAt,
  });
  if (error) console.error("insertArchiveEntry:", error.message);
}

/** Aktualizuje existující archivovanou kontrolu (po editaci). */
export async function updateArchiveEntry(inspection) {
  if (!supabase) return;
  const { error } = await supabase
    .from("archive")
    .update({ data: inspection, updated_at: new Date().toISOString() })
    .eq("id", inspection.archivedAt);
  if (error) console.error("updateArchiveEntry:", error.message);
}

/** Smaže archivovanou kontrolu. */
export async function deleteArchiveEntry(archivedAt) {
  if (!supabase) return;
  const { error } = await supabase.from("archive").delete().eq("id", archivedAt);
  if (error) console.error("deleteArchiveEntry:", error.message);
}


