import { v4 as uuid } from "uuid";
import { getAllLogs, addFoodEntry, logWeight } from "./storage";
import type { UserProfile, FoodEntry, MealType } from "./types";

const BREAKFAST = [
  { description: "2 scrambled eggs with toast", estimatedCalories: 280, estimatedProtein: 14 },
  { description: "Greek yogurt with granola and berries", estimatedCalories: 320, estimatedProtein: 18 },
  { description: "Protein shake with almond milk", estimatedCalories: 200, estimatedProtein: 30 },
  { description: "Oatmeal with banana and honey", estimatedCalories: 350, estimatedProtein: 8 },
  { description: "Avocado toast with 2 poached eggs", estimatedCalories: 380, estimatedProtein: 16 },
  { description: "Cottage cheese with fruit", estimatedCalories: 180, estimatedProtein: 18 },
];
const LUNCH = [
  { description: "Grilled chicken salad with olive oil", estimatedCalories: 420, estimatedProtein: 38 },
  { description: "Tuna sandwich on whole wheat", estimatedCalories: 400, estimatedProtein: 32 },
  { description: "Chicken and rice bowl", estimatedCalories: 540, estimatedProtein: 42 },
  { description: "Turkey and avocado wrap", estimatedCalories: 460, estimatedProtein: 34 },
  { description: "Salmon with roasted vegetables", estimatedCalories: 440, estimatedProtein: 40 },
  { description: "Ground beef bowl with rice and beans", estimatedCalories: 580, estimatedProtein: 38 },
];
const DINNER = [
  { description: "Grilled chicken breast with sweet potato", estimatedCalories: 520, estimatedProtein: 44 },
  { description: "Salmon fillet with broccoli and rice", estimatedCalories: 580, estimatedProtein: 46 },
  { description: "Ground beef stir fry with vegetables", estimatedCalories: 600, estimatedProtein: 40 },
  { description: "Chicken thighs with roasted potatoes", estimatedCalories: 560, estimatedProtein: 38 },
  { description: "Shrimp pasta with olive oil and garlic", estimatedCalories: 520, estimatedProtein: 32 },
  { description: "Ribeye steak with green beans", estimatedCalories: 640, estimatedProtein: 50 },
];
const SNACKS = [
  { description: "Protein bar", estimatedCalories: 220, estimatedProtein: 20 },
  { description: "Apple with peanut butter", estimatedCalories: 200, estimatedProtein: 7 },
  { description: "Almonds (1 oz)", estimatedCalories: 165, estimatedProtein: 6 },
  { description: "String cheese and crackers", estimatedCalories: 180, estimatedProtein: 9 },
  { description: "2 hard boiled eggs", estimatedCalories: 140, estimatedProtein: 12 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function seedTestData(profile: UserProfile, uid?: string): number {
  const allLogs = getAllLogs(uid);
  const existingDates = Object.keys(allLogs).sort();

  // Anchor: day before the earliest existing log, or yesterday if no logs yet
  const anchor = new Date();
  if (existingDates.length > 0) {
    const [y, m, d] = existingDates[0].split("-").map(Number);
    anchor.setFullYear(y, m - 1, d);
  }
  anchor.setHours(0, 0, 0, 0);
  anchor.setDate(anchor.getDate() - 1);

  let seeded = 0;
  for (let i = 13; i >= 0; i--) {
    const day = new Date(anchor);
    day.setDate(day.getDate() - i);
    const dateStr = localDateStr(day);

    if (allLogs[dateStr]) continue; // never overwrite real data

    // Weight trends from currentWeight+3 lbs (oldest) down to currentWeight+0.2 (most recent)
    const progress = i / 13; // 1.0 = oldest, 0.0 = most recent
    const weightOffset = progress * 3 + (Math.random() - 0.5) * 0.7;
    logWeight(dateStr, Math.round((profile.currentWeightLbs + weightOffset) * 10) / 10, uid);

    // 15% chance of no food logged that day (realistic)
    if (Math.random() < 0.15) { seeded++; continue; }

    const entries: FoodEntry[] = [];
    const addEntry = (food: { description: string; estimatedCalories: number; estimatedProtein: number }, meal: MealType, hour: number) => {
      entries.push({
        id: uuid(),
        timestamp: `${dateStr}T${String(hour).padStart(2, "0")}:00:00`,
        description: food.description,
        estimatedCalories: food.estimatedCalories,
        estimatedProtein: food.estimatedProtein,
        meal,
      });
    };

    if (Math.random() > 0.2) addEntry(pick(BREAKFAST), "breakfast", 8);
    addEntry(pick(LUNCH), "lunch", 13);
    addEntry(pick(DINNER), "dinner", 19);
    if (Math.random() > 0.5) addEntry(pick(SNACKS), "snack", 16);

    for (const entry of entries) addFoodEntry(dateStr, entry, uid);
    seeded++;
  }

  return seeded;
}
