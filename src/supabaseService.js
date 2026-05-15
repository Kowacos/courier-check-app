/**
 * supabaseService.js
 *
 * CRUD operace pro archiv a drafty.
 * Pokud Supabase není nakonfigurováno, všechny funkce tiše selžou
 * a aplikace funguje pouze s localStorage.
 *
 * Schéma tabulek (spustit v Supabase SQL editoru):
 *
 * create table if not exists archive (
 *   id         uuid primary key,
 *   data       jsonb not null,
 *   archived_at timestamptz not null,
 *   created_at  timestamptz default now()
 * );
 *
 * create table if not exists drafts (
 *   id         uuid primary key,
 *   data       jsonb not null,
 *   updated_at  timestamptz default now()
 * );
 *
 * -- Zapni RLS a přidej politiky podle potřeby (nebo nech vypnuto pro interní použití)
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

// ---------------------------------------------------------------------------
// Drafty
// ---------------------------------------------------------------------------

/** Načte všechny drafty. */
export async function fetchDrafts() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("drafts")
    .select("data")
    .order("updated_at", { ascending: false });
  if (error) { console.error("fetchDrafts:", error.message); return null; }
  return data.map((row) => row.data);
}

/** Uloží nebo aktualizuje draft (upsert podle id). */
export async function upsertDraft(draft) {
  if (!supabase || !draft.id) return;
  const { error } = await supabase.from("drafts").upsert({
    id: draft.id,
    data: draft,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("upsertDraft:", error.message);
}

/** Smaže draft. */
export async function deleteDraft(id) {
  if (!supabase) return;
  const { error } = await supabase.from("drafts").delete().eq("id", id);
  if (error) console.error("deleteDraft:", error.message);
}

