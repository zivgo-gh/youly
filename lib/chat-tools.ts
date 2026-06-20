// Server-side execution of the coach's tool calls.
// Isomorphic by design: no server-only imports at top level (normalizeFoodName is reused by lib/db.ts).
// All DB access goes through the SupabaseClient passed in (authenticated as the user via cookies).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MealType, SavedMeal, SavedMealItem } from "./types";

// Deterministic food-name key for the shared food_reference table.
// Shared by the lookup (read) and confirm (write) paths so the table doesn't fragment.
export function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/["'`.,;:!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MEAL_HOUR: Record<MealType, string> = {
  breakfast: "08",
  lunch: "13",
  dinner: "19",
  snack: "16",
};

function newId(): string {
  return globalThis.crypto.randomUUID();
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

interface Ctx {
  today: string; // client local date (YYYY-MM-DD)
}

// ─── Saved meals (server-side, mirrors lib/db.ts getSavedMeals numbering) ──────

async function loadSavedMeals(supabase: SupabaseClient, uid: string): Promise<SavedMeal[]> {
  const [{ data: meals }, { data: items }] = await Promise.all([
    supabase.from("saved_meals").select("*").eq("user_id", uid).order("created_at", { ascending: true }),
    supabase.from("saved_meal_items").select("*").eq("user_id", uid).order("position", { ascending: true }),
  ]);
  const itemsByMeal = new Map<string, SavedMealItem[]>();
  for (const it of (items ?? []) as { id: string; meal_id: string; description: string; calories: number; protein: number }[]) {
    const arr = itemsByMeal.get(it.meal_id) ?? [];
    arr.push({ id: it.id, description: it.description, calories: it.calories, protein: it.protein });
    itemsByMeal.set(it.meal_id, arr);
  }
  const perCat: Partial<Record<MealType, number>> = {};
  return ((meals ?? []) as { id: string; name: string; meal: string }[]).map((m, idx) => {
    const meal = m.meal as MealType;
    perCat[meal] = (perCat[meal] ?? 0) + 1;
    return {
      id: m.id,
      name: m.name,
      meal,
      items: itemsByMeal.get(m.id) ?? [],
      categoryNumber: perCat[meal]!,
      globalNumber: idx + 1,
    };
  });
}

// Resolve a reference like "lunch #2", "meal #3", "dinner 1", or a name substring.
function resolveSavedMeal(meals: SavedMeal[], ref: string): SavedMeal | null {
  const r = ref.toLowerCase().trim();
  const numMatch = r.match(/(\d+)/);
  const n = numMatch ? parseInt(numMatch[1], 10) : null;
  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
  const type = mealTypes.find((t) => r.includes(t)) ?? null;

  if (type && n !== null) {
    return meals.find((m) => m.meal === type && m.categoryNumber === n) ?? null;
  }
  if (n !== null && (r.includes("meal") || r.startsWith("#") || /^\s*\d+\s*$/.test(r))) {
    return meals.find((m) => m.globalNumber === n) ?? null;
  }
  // Fallback: name match
  return meals.find((m) => m.name.toLowerCase().includes(r) || r.includes(m.name.toLowerCase())) ?? null;
}

function savedMealLabel(m: SavedMeal): string {
  const cal = m.items.reduce((s, i) => s + i.calories, 0);
  const pro = m.items.reduce((s, i) => s + i.protein, 0);
  return `${m.meal} #${m.categoryNumber} (meal #${m.globalNumber}) "${m.name}" — ${cal}kcal, ${pro}g protein`;
}

export async function getSavedMealsSummary(supabase: SupabaseClient, uid: string): Promise<string> {
  const meals = await loadSavedMeals(supabase, uid);
  if (meals.length === 0) return "none yet";
  return meals.map(savedMealLabel).join("; ");
}

// ─── Tool dispatch ────────────────────────────────────────────────────────────

export async function executeChatTool(
  supabase: SupabaseClient,
  uid: string,
  name: string,
  input: Record<string, unknown>,
  ctx: Ctx
): Promise<unknown> {
  try {
    switch (name) {
      case "log_food": {
        const aiDate = str(input.date) || ctx.today;
        const date = aiDate > ctx.today ? ctx.today : aiDate;
        const time = str(input.time) || "12:00";
        const id = newId();
        const calories = Math.round(num(input.estimated_calories));
        const protein = num(input.estimated_protein);
        const { error } = await supabase.from("food_entries").insert({
          id,
          user_id: uid,
          local_date: date,
          ts: `${date}T${time}:00`,
          description: str(input.description),
          calories,
          protein,
          meal: input.meal ? str(input.meal) : null,
          corrected: false,
          source: "ai",
        });
        if (error) return { success: false, error: error.message };
        return { success: true, id, date, calories, protein };
      }

      case "correct_food_entry": {
        const patch: Record<string, unknown> = { corrected: true };
        if (input.updated_description !== undefined) patch.description = str(input.updated_description);
        if (input.updated_calories !== undefined) patch.calories = Math.round(num(input.updated_calories));
        if (input.updated_protein !== undefined) patch.protein = num(input.updated_protein);
        const { error } = await supabase
          .from("food_entries")
          .update(patch)
          .eq("id", str(input.entry_id))
          .eq("user_id", uid);
        return error ? { success: false, error: error.message } : { success: true };
      }

      case "delete_food_entry": {
        const { error } = await supabase
          .from("food_entries")
          .delete()
          .eq("id", str(input.entry_id))
          .eq("user_id", uid);
        return error ? { success: false, error: error.message } : { success: true, deleted: true };
      }

      case "log_weight": {
        const date = str(input.date) || ctx.today;
        const weight = num(input.weight_lbs);
        const { error } = await supabase
          .from("weights")
          .upsert({ user_id: uid, local_date: date, weight_lbs: weight }, { onConflict: "user_id,local_date" });
        return error ? { success: false, error: error.message } : { success: true, weight_lbs: weight, date };
      }

      case "get_log": {
        const date = str(input.date) || ctx.today;
        const [{ data: entries }, { data: weights }] = await Promise.all([
          supabase.from("food_entries").select("*").eq("user_id", uid).eq("local_date", date),
          supabase.from("weights").select("weight_lbs").eq("user_id", uid).eq("local_date", date).maybeSingle(),
        ]);
        const rows = (entries ?? []) as { id: string; description: string; calories: number; protein: number; meal: string | null }[];
        return {
          date,
          entries: rows.map((r) => ({ id: r.id, description: r.description, calories: r.calories, protein: r.protein, meal: r.meal })),
          totalCalories: rows.reduce((s, r) => s + r.calories, 0),
          totalProtein: rows.reduce((s, r) => s + r.protein, 0),
          weightLbs: (weights as { weight_lbs: number } | null)?.weight_lbs ?? null,
        };
      }

      case "update_coach_style": {
        const { data: row } = await supabase.from("profiles").select("coach_style").eq("user_id", uid).maybeSingle();
        const current = ((row as { coach_style?: Record<string, unknown> } | null)?.coach_style ?? {
          supportLevel: 5,
          techDepth: 5,
          checkInStyle: "conversational",
          observations: [],
        }) as { supportLevel: number; techDepth: number; checkInStyle: string; observations: string[] };
        const field = str(input.field);
        const value = input.value;
        if (field === "observations" && typeof value === "string") {
          current.observations = [...(current.observations ?? []), value];
        } else if (field === "supportLevel" || field === "techDepth") {
          current[field] = num(value);
        } else if (field === "checkInStyle" && typeof value === "string") {
          current.checkInStyle = value;
        }
        const { error } = await supabase.from("profiles").update({ coach_style: current }).eq("user_id", uid);
        return error ? { success: false, error: error.message } : { success: true, coach_style: current };
      }

      case "lookup_food": {
        const normalized = normalizeFoodName(str(input.name));
        let q = supabase.from("food_reference").select("*").eq("normalized_name", normalized);
        if (input.unit) q = q.eq("unit", str(input.unit));
        const { data } = await q.order("confirmations", { ascending: false }).limit(1);
        const row = (data ?? [])[0] as { unit: string; calories: number; protein: number; confirmations: number } | undefined;
        if (!row) return { found: false, name: str(input.name) };
        return { found: true, name: str(input.name), unit: row.unit, calories: row.calories, protein: row.protein, confirmations: row.confirmations };
      }

      case "confirm_food": {
        const normalized = normalizeFoodName(str(input.name));
        const unit = str(input.unit) || "serving";
        const calories = Math.round(num(input.calories));
        const protein = num(input.protein);
        const { data: existing } = await supabase
          .from("food_reference")
          .select("id, confirmations")
          .eq("normalized_name", normalized)
          .eq("unit", unit)
          .maybeSingle();
        if (existing) {
          const e = existing as { id: string; confirmations: number };
          await supabase
            .from("food_reference")
            .update({ calories, protein, confirmations: e.confirmations + 1, updated_at: new Date().toISOString() })
            .eq("id", e.id);
          return { ok: true, normalized_name: normalized, unit, confirmations: e.confirmations + 1 };
        }
        await supabase.from("food_reference").insert({ normalized_name: normalized, unit, calories, protein });
        return { ok: true, normalized_name: normalized, unit, confirmations: 1 };
      }

      case "save_meal": {
        const mealType = str(input.meal) as MealType;
        const rawItems = Array.isArray(input.items) ? (input.items as Record<string, unknown>[]) : [];
        const items: SavedMealItem[] = rawItems.map((it) => ({
          description: str(it.description),
          calories: Math.round(num(it.calories)),
          protein: num(it.protein),
        }));
        const { data: mealRow, error } = await supabase
          .from("saved_meals")
          .insert({ user_id: uid, name: str(input.name), meal: mealType })
          .select("id")
          .single();
        if (error || !mealRow) return { success: false, error: error?.message ?? "insert failed" };
        const mealId = (mealRow as { id: string }).id;
        if (items.length > 0) {
          await supabase.from("saved_meal_items").insert(
            items.map((it, i) => ({ meal_id: mealId, user_id: uid, description: it.description, calories: it.calories, protein: it.protein, position: i }))
          );
        }
        const all = await loadSavedMeals(supabase, uid);
        const created = all.find((m) => m.id === mealId);
        return created
          ? { success: true, name: created.name, meal: created.meal, categoryNumber: created.categoryNumber, globalNumber: created.globalNumber }
          : { success: true };
      }

      case "list_saved_meals": {
        const meals = await loadSavedMeals(supabase, uid);
        return {
          meals: meals.map((m) => ({
            name: m.name,
            meal: m.meal,
            categoryNumber: m.categoryNumber,
            globalNumber: m.globalNumber,
            totalCalories: m.items.reduce((s, i) => s + i.calories, 0),
            totalProtein: m.items.reduce((s, i) => s + i.protein, 0),
            items: m.items.map((i) => ({ description: i.description, calories: i.calories, protein: i.protein })),
          })),
        };
      }

      case "log_saved_meal": {
        const meals = await loadSavedMeals(supabase, uid);
        const target = resolveSavedMeal(meals, str(input.ref));
        if (!target) return { success: false, error: `No saved meal matched "${str(input.ref)}"` };
        const date = str(input.date) && str(input.date) <= ctx.today ? str(input.date) : ctx.today;
        const hour = MEAL_HOUR[target.meal];
        const rows = target.items.map((it, i) => ({
          id: newId(),
          user_id: uid,
          local_date: date,
          ts: `${date}T${hour}:${String(i).padStart(2, "0")}:00`,
          description: it.description,
          calories: it.calories,
          protein: it.protein,
          meal: target.meal,
          corrected: false,
          source: "saved_meal",
        }));
        if (rows.length > 0) await supabase.from("food_entries").insert(rows);
        return {
          success: true,
          name: target.name,
          meal: target.meal,
          logged: rows.length,
          totalCalories: rows.reduce((s, r) => s + r.calories, 0),
          totalProtein: rows.reduce((s, r) => s + r.protein, 0),
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "tool execution failed" };
  }
}
