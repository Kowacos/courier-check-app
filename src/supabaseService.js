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
// Uložené kontroly
// ---------------------------------------------------------------------------

/** Načte všechny uložené kontroly, seřazené od nejnovější. */
export async function fetchArchive() {
  if (!supabase) {
    console.warn("⚠️ Supabase není nakonfigurováno - používám pouze localStorage");
    return null;
  }

  console.log("📥 Načítám kontroly ze Supabase...");
  const { data, error } = await supabase
    .from("archive")
    .select("data")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Chyba při načítání z Supabase:", error.message);
    console.error("Detail:", error);
    return null;
  }

  console.log("✅ Načteno kontrol ze Supabase:", data?.length || 0);
  return data.map((row) => row.data);
}

/** Uloží novou kontrolu. */
export async function insertArchiveEntry(inspection) {
  if (!supabase) {
    console.warn("⚠️ Supabase není nakonfigurováno - data se neukládají do cloudu");
    return;
  }

  console.log("💾 Vkládám novou kontrolu do Supabase:", inspection.id);
  const { error } = await supabase.from("archive").insert({
    id: inspection.id,
    data: inspection,
    archived_at: inspection.savedAt || new Date().toISOString(),
  });

  if (error) {
    console.error("❌ Chyba při vkládání do Supabase:", error.message);
    console.error("Detail chyby:", error);
    throw error;
  } else {
    console.log("✅ Kontrola úspěšně vložena do Supabase");
  }
}

/** Aktualizuje existující kontrolu (po editaci). */
export async function updateArchiveEntry(inspection) {
  if (!supabase) {
    console.warn("⚠️ Supabase není nakonfigurováno");
    return;
  }

  console.log("📝 Aktualizuji kontrolu v Supabase:", inspection.id);
  const { error } = await supabase
    .from("archive")
    .update({
      data: inspection,
      archived_at: inspection.savedAt || new Date().toISOString()
    })
    .eq("id", inspection.id);

  if (error) {
    console.error("❌ Chyba při aktualizaci v Supabase:", error.message);
    console.error("Detail chyby:", error);
    throw error;
  } else {
    console.log("✅ Kontrola úspěšně aktualizována v Supabase");
  }
}

/** Smaže kontrolu. */
export async function deleteArchiveEntry(id) {
  if (!supabase) {
    console.warn("⚠️ Supabase není nakonfigurováno");
    return;
  }

  console.log("🗑️ Mažu kontrolu ze Supabase:", id);
  const { error } = await supabase.from("archive").delete().eq("id", id);

  if (error) {
    console.error("❌ Chyba při mazání ze Supabase:", error.message);
    throw error;
  } else {
    console.log("✅ Kontrola úspěšně smazána ze Supabase");
  }
}




