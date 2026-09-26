"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveProfile } from "@/lib/resolve-profile";
import { LoadFailure } from "@/components/shared/LoadFailure";
import {
  getSavedMeals,
  createSavedMeal,
  updateSavedMeal,
  deleteSavedMeal,
} from "@/lib/db";
import type { MealType, SavedMeal, SavedMealItem } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Field, Input } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LoadingScreen, EmptyState, Badge } from "@/components/ui/Feedback";

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
  const [failed, setFailed] = useState(false);
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [form, setForm] = useState<MealForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SavedMeal | null>(null);

  const refresh = useCallback(async (userId: string) => {
    setMeals(await getSavedMeals(userId));
  }, []);

  useEffect(() => {
    async function init() {
      const r = await resolveProfile();
      if (r.status === "error") {
        setFailed(true);
        return;
      }
      if (r.status === "signed-out") {
        router.replace("/login");
        return;
      }
      if (r.status === "needs-onboarding") {
        router.replace("/onboarding");
        return;
      }
      setUid(r.uid);
      await refresh(r.uid);
      setLoading(false);
    }
    init();
  }, [router, refresh]);

  const startEdit = (m: SavedMeal) =>
    setForm({
      id: m.id,
      name: m.name,
      meal: m.meal,
      items: m.items.length
        ? m.items.map((i) => ({
            description: i.description,
            calories: String(i.calories),
            protein: String(i.protein),
          }))
        : [{ description: "", calories: "", protein: "" }],
    });

  const updateItem = (idx: number, patch: Partial<ItemForm>) =>
    setForm((f) =>
      f
        ? {
            ...f,
            items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
          }
        : f
    );
  const addItem = () =>
    setForm((f) =>
      f
        ? { ...f, items: [...f.items, { description: "", calories: "", protein: "" }] }
        : f
    );
  const removeItem = (idx: number) =>
    setForm((f) => (f ? { ...f, items: f.items.filter((_, i) => i !== idx) } : f));

  const nameMissing = form !== null && form.name.trim() === "";
  const itemsMissing =
    form !== null && form.items.every((it) => it.description.trim() === "");

  const save = async () => {
    if (!form || !uid) return;
    const items: SavedMealItem[] = form.items
      .filter((it) => it.description.trim())
      .map((it) => ({
        description: it.description.trim(),
        calories: Number(it.calories) || 0,
        protein: Number(it.protein) || 0,
      }));
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

  const confirmRemove = async () => {
    if (!uid || !pendingDelete) return;
    await deleteSavedMeal(uid, pendingDelete.id);
    setPendingDelete(null);
    await refresh(uid);
  };

  if (failed) return <LoadFailure />;
  if (loading) return <LoadingScreen label="Loading your meals" />;

  const mealsByType = MEAL_ORDER.map((type) => ({
    type,
    list: meals.filter((m) => m.meal === type),
  }));

  return (
    <div className="bg-surface-sunken py-8 sm:py-12">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Saved meals
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Save meals you eat often, then just say &ldquo;log lunch #2&rdquo; in
              chat.
            </p>
          </div>
          <Button size="sm" onClick={() => setForm(emptyForm())}>
            <Icon name="plus" size={18} />
            New meal
          </Button>
        </div>

        <div className="mt-6 space-y-8">
          {meals.length === 0 ? (
            <Card>
              <EmptyState
                icon="meal"
                title="No saved meals yet"
                body="Create one here, or just tell your coach to save what you just logged."
                action={
                  <Button size="sm" onClick={() => setForm(emptyForm())}>
                    Create your first meal
                  </Button>
                }
              />
            </Card>
          ) : null}

          {mealsByType.map(({ type, list }) =>
            list.length === 0 ? null : (
              <section key={type}>
                <CardLabel>{MEAL_LABELS[type]}</CardLabel>
                <ul className="mt-3 space-y-3">
                  {list.map((m) => {
                    const cal = m.items.reduce((s, i) => s + i.calories, 0);
                    const pro = m.items.reduce((s, i) => s + i.protein, 0);
                    return (
                      <Card as="li" key={m.id} padded={false} className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">
                              <Badge tone="brand">
                                {MEAL_LABELS[type]} #{m.categoryNumber}
                              </Badge>{" "}
                              <span className="align-middle">{m.name}</span>
                            </p>
                            <p className="tnum mt-1 text-sm text-ink-muted">
                              meal #{m.globalNumber} · {cal} kcal · {pro}g protein
                            </p>
                            <ul className="mt-2 space-y-0.5">
                              {m.items.map((it, i) => (
                                <li key={i} className="text-sm text-ink-body">
                                  {it.description}{" "}
                                  <span className="tnum text-ink-muted">
                                    ({it.calories} kcal, {it.protein}g)
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <IconButton
                              icon="pencil"
                              label={`Edit ${m.name}`}
                              tone="brand"
                              onClick={() => startEdit(m)}
                            />
                            <IconButton
                              icon="trash"
                              label={`Delete ${m.name}`}
                              tone="danger"
                              onClick={() => setPendingDelete(m)}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </ul>
              </section>
            )
          )}
        </div>
      </Container>

      <Sheet
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit saved meal" : "New saved meal"}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button
              fullWidth
              loading={saving}
              disabled={nameMissing || itemsMissing}
              onClick={save}
            >
              Save meal
            </Button>
          </div>
        }
      >
        {form ? (
          <div className="space-y-5">
            <Field
              label="Name"
              error={nameMissing ? "Give this meal a name." : undefined}
            >
              {(props) => (
                <Input
                  {...props}
                  placeholder="e.g. Turkey and cottage cheese"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, name: e.target.value } : f))
                  }
                />
              )}
            </Field>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink-body">Meal type</p>
              <SegmentedControl
                label="Meal type"
                value={form.meal}
                onChange={(meal) => setForm((f) => (f ? { ...f, meal } : f))}
                options={MEAL_ORDER.map((t) => ({
                  value: t,
                  label: MEAL_LABELS[t],
                }))}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink-body">
                Items
                {itemsMissing ? (
                  <span className="ml-2 font-normal text-danger">
                    Add at least one food.
                  </span>
                ) : null}
              </legend>
              {form.items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    aria-label={`Food ${idx + 1}`}
                    placeholder="Food"
                    className="flex-1"
                    value={it.description}
                    onChange={(e) =>
                      updateItem(idx, { description: e.target.value })
                    }
                  />
                  <Input
                    aria-label={`Calories for food ${idx + 1}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="kcal"
                    className="w-24 px-2 text-center"
                    value={it.calories}
                    onChange={(e) => updateItem(idx, { calories: e.target.value })}
                  />
                  <Input
                    aria-label={`Protein grams for food ${idx + 1}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="g"
                    className="w-20 px-2 text-center"
                    value={it.protein}
                    onChange={(e) => updateItem(idx, { protein: e.target.value })}
                  />
                  <IconButton
                    icon="close"
                    label={`Remove food ${idx + 1}`}
                    size={36}
                    disabled={form.items.length === 1}
                    onClick={() => removeItem(idx)}
                  />
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addItem}>
                <Icon name="plus" size={18} />
                Add item
              </Button>
            </fieldset>
          </div>
        ) : null}
      </Sheet>

      {/* Replaces a native confirm(), which cannot be styled and does not say
          which meal is about to be deleted. */}
      <Sheet
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this saved meal?"
        description={pendingDelete?.name}
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setPendingDelete(null)}
            >
              Keep it
            </Button>
            <Button variant="danger" fullWidth onClick={confirmRemove}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-body">
          This removes the saved meal only. Any food you have already logged from
          it stays in your history.
        </p>
      </Sheet>
    </div>
  );
}
