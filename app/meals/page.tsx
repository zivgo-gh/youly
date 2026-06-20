"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getProfile } from "@/lib/storage";
import { loadProfile, getSavedMeals, createSavedMeal, updateSavedMeal, deleteSavedMeal } from "@/lib/db";
import type { MealType, SavedMeal, SavedMealItem } from "@/lib/types";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

interface ItemForm {
  description: string;
  calories: string;
  protein: string;
}

interface MealForm {
  id: string | null;
  name: string;
  meal: MealType;
  items: ItemForm[];
}

const emptyForm = (): MealForm => ({
  id: null,
  name: "",
  meal: "lunch",
  items: [{ description: "", calories: "", protein: "" }],
});

export default function MealsPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [form, setForm] = useState<MealForm | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (userId: string) => {
    setMeals(await getSavedMeals(userId));
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) {
        router.replace("/login");
        return;
      }
      const p = getProfile(userId) ?? (await loadProfile(userId));
      if (!p || !p.onboardingComplete) {
        router.replace("/onboarding");
        return;
      }
      setUid(userId);
      await refresh(userId);
      setLoading(false);
    }
    init();
  }, [router, refresh]);

  const startCreate = () => setForm(emptyForm());
  const startEdit = (m: SavedMeal) =>
    setForm({
      id: m.id,
      name: m.name,
      meal: m.meal,
      items: m.items.length
        ? m.items.map((i) => ({ description: i.description, calories: String(i.calories), protein: String(i.protein) }))
        : [{ description: "", calories: "", protein: "" }],
    });

  const updateItem = (idx: number, patch: Partial<ItemForm>) =>
    setForm((f) => (f ? { ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) } : f));
  const addItem = () =>
    setForm((f) => (f ? { ...f, items: [...f.items, { description: "", calories: "", protein: "" }] } : f));
  const removeItem = (idx: number) =>
    setForm((f) => (f ? { ...f, items: f.items.filter((_, i) => i !== idx) } : f));

  const save = async () => {
    if (!form || !uid) return;
    const items: SavedMealItem[] = form.items
      .filter((it) => it.description.trim())
      .map((it) => ({ description: it.description.trim(), calories: Number(it.calories) || 0, protein: Number(it.protein) || 0 }));
    if (!form.name.trim() || items.length === 0) return;
    setSaving(true);
    if (form.id) {
      await updateSavedMeal(uid, form.id, form.name.trim(), form.meal, items);
    } else {
      await createSavedMeal(uid, form.name.trim(), form.meal, items);
    }
    await refresh(uid);
    setSaving(false);
    setForm(null);
  };

  const remove = async (id: string) => {
    if (!uid || !confirm("Delete this saved meal?")) return;
    await deleteSavedMeal(uid, id);
    await refresh(uid);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  const mealsByType = MEAL_ORDER.map((type) => ({ type, list: meals.filter((m) => m.meal === type) }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <a href="/chat" className="text-emerald-600 hover:underline text-sm">← Back to chat</a>
        <span className="text-lg font-black tracking-tight uppercase text-emerald-600">Youly</span>
        <span className="text-gray-400 text-sm">Saved meals</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Save meals you eat often, then just say &ldquo;log lunch #2&rdquo; in chat.
          </p>
          <button
            onClick={startCreate}
            className="shrink-0 py-2 px-4 rounded-2xl bg-emerald-500 text-white text-sm font-semibold active:scale-95 transition-transform"
          >
            + New meal
          </button>
        </div>

        {meals.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
            No saved meals yet. Create one, or tell your coach &ldquo;save that as my lunch&rdquo;.
          </div>
        )}

        {mealsByType.map(({ type, list }) =>
          list.length === 0 ? null : (
            <section key={type}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{MEAL_LABELS[type]}</h2>
              <div className="space-y-2">
                {list.map((m) => {
                  const cal = m.items.reduce((s, i) => s + i.calories, 0);
                  const pro = m.items.reduce((s, i) => s + i.protein, 0);
                  return (
                    <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800">
                            <span className="text-emerald-600">{MEAL_LABELS[type]} #{m.categoryNumber}</span>{" "}
                            · {m.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">meal #{m.globalNumber} · {cal} kcal · {pro}g protein</p>
                          <ul className="mt-2 space-y-0.5">
                            {m.items.map((it, i) => (
                              <li key={i} className="text-sm text-gray-600">
                                {it.description} <span className="text-gray-400">({it.calories} kcal, {it.protein}g)</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => startEdit(m)} className="text-xs text-emerald-600 font-medium px-3 py-1 rounded-lg bg-emerald-50">Edit</button>
                          <button onClick={() => remove(m.id)} className="text-xs text-red-400 font-medium px-3 py-1 rounded-lg bg-red-50">Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )
        )}
      </div>

      {/* Create / edit sheet */}
      {form && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setForm(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl pb-10 px-6 pt-6 max-h-[85vh] overflow-y-auto max-w-2xl mx-auto">
            <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
            <p className="font-semibold text-gray-800 mb-4">{form.id ? "Edit saved meal" : "New saved meal"}</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</label>
                <input
                  className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="e.g. Turkey & cottage cheese"
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Meal type</label>
                <div className="mt-1 flex gap-2">
                  {MEAL_ORDER.map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => (f ? { ...f, meal: t } : f))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold ${form.meal === t ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"}`}
                    >
                      {MEAL_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</label>
                <div className="mt-1 space-y-2">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Food"
                        value={it.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                      />
                      <input
                        type="number"
                        className="w-20 rounded-xl border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="kcal"
                        value={it.calories}
                        onChange={(e) => updateItem(idx, { calories: e.target.value })}
                      />
                      <input
                        type="number"
                        className="w-16 rounded-xl border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="g"
                        value={it.protein}
                        onChange={(e) => updateItem(idx, { protein: e.target.value })}
                      />
                      <button
                        onClick={() => removeItem(idx)}
                        className="shrink-0 w-8 h-8 rounded-lg bg-gray-100 text-gray-400 text-sm"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={addItem} className="mt-2 text-sm text-emerald-600 font-medium">+ Add item</button>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setForm(null)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500 font-medium">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
