/**
 * supabaseService.js
 *
 * CRUD operace pro uložené kontroly a kartotéku kurýrů.
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
 * create table if not exists couriers (
 *   id         uuid primary key,
 *   data       jsonb not null,
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 *
 * create index if not exists idx_archive_created_at on archive(created_at desc);
 * create index if not exists idx_couriers_updated_at on couriers(updated_at desc);
 * alter table archive disable row level security;
 * alter table couriers disable row level security;
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

/** Smaže uloženou kontrolu. */
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

// ---------------------------------------------------------------------------
// Kartotéka kurýrů
// ---------------------------------------------------------------------------

/** Načte všechny kurýry z kartotéky. */
export async function fetchCouriers() {
  if (!supabase) {
    console.warn("⚠️ Supabase není nakonfigurováno - používám pouze localStorage");
    return null;
  }
  
  console.log("📥 Načítám kurýry ze Supabase...");
  const { data, error } = await supabase
    .from("couriers")
    .select("data")
    .order("updated_at", { ascending: false });
    
  if (error) { 
    console.error("❌ Chyba při načítání kurýrů z Supabase:", error.message);
    console.error("Detail:", error);
    return null; 
  }
  
  console.log("✅ Načteno kurýrů ze Supabase:", data?.length || 0);
  return data.map((row) => row.data);
}

/** Uloží nového kurýra. */
export async function insertCourier(courier) {
  if (!supabase) {
    console.warn("⚠️ Supabase není nakonfigurováno - data se neukládají do cloudu");
    return;
  }
  
  console.log("💾 Vkládám kurýra do Supabase:", courier.id);
  const { error } = await supabase.from("couriers").insert({
    id: courier.id,
    data: courier,
  });
  
  if (error) {
    console.error("❌ Chyba při vkládání kurýra do Supabase:", error.message);
    console.error("Detail chyby:", error);
    throw error;
  } else {
    console.log("✅ Kurýr úspěšně vložen do Supabase");
  }
}

/** Aktualizuje existujícího kurýra. */
export async function updateCourier(courier) {
  if (!supabase) {
    console.warn("⚠️ Supabase není nakonfigurováno");
    return;
  }
  
  console.log("📝 Aktualizuji kurýra v Supabase:", courier.id);
  const { error } = await supabase
    .from("couriers")
    .update({ data: courier })
    .eq("id", courier.id);
    
  if (error) {
    console.error("❌ Chyba při aktualizaci kurýra v Supabase:", error.message);
    console.error("Detail chyby:", error);
    throw error;
  } else {
    console.log("✅ Kurýr úspěšně aktualizován v Supabase");
  }
}

/** Smaže kurýra. */
export async function deleteCourier(id) {
  if (!supabase) {
    console.warn("⚠️ Supabase není nakonfigurováno");
    return;
  }
  
  console.log("🗑️ Mažu kurýra ze Supabase:", id);
  const { error } = await supabase.from("couriers").delete().eq("id", id);
  
  if (error) {
    console.error("❌ Chyba při mazání kurýra ze Supabase:", error.message);
    throw error;
  } else {
    console.log("✅ Kurýr úspěšně smazán ze Supabase");
  }
}




