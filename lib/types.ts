export type CoachAvatar = "alex" | "maya" | "sam" | "rivera";

export interface CoachStyle {
  supportLevel: number; // 1–10, 1=very tough, 10=very gentle (starts at 5)
  techDepth: number; // 1–10, how much science explanation (starts at 5)
  checkInStyle: "brief" | "conversational";
  observations: string[];
}

export interface Milestone {
  label: string;          // "Week 1", "Month 2", etc.
  date: string;           // YYYY-MM-DD
  targetWeightLbs: number;
}

export interface UserProfile {
  name: string;
  age: number;
  sex: "male" | "female";
  heightIn: number;           // total inches (e.g. 5'10" = 70)
  currentWeightLbs: number;
  goalWeightLbs: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active";
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  dailyDeficit: number;       // cal/day deficit chosen by user (250 | 500 | 750)
  coachAvatar: CoachAvatar;
  coachStyle: CoachStyle;
  interestedInFitness: boolean;
  habits: string;
  challenges: string[];
  predictedGoalDate: string;
  onboardingComplete: boolean;
  createdAt: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type EntrySource = "ai" | "manual" | "saved_meal" | "seed" | "migration";

export interface FoodEntry {
  id: string;
  timestamp: string; // ISO
  description: string;
  estimatedCalories: number;
  estimatedProtein: number;
  meal?: MealType;
  corrected?: boolean;
  source?: EntrySource;
}

// ─── Saved meals ──────────────────────────────────────────────────────────────

export interface SavedMealItem {
  id?: string;
  description: string;
  calories: number;
  protein: number;
}

export interface SavedMeal {
  id: string;
  name: string;
  meal: MealType;
  items: SavedMealItem[];
  categoryNumber: number; // 1-based index within its meal type (lunch #1, #2…)
  globalNumber: number;   // 1-based index across all saved meals (meal #N)
}

// ─── Shared food reference (cross-user) ───────────────────────────────────────

export interface FoodReference {
  normalizedName: string;
  unit: string;
  calories: number;
  protein: number;
  confirmations: number;
}

export interface DayLog {
  entries: FoodEntry[];
  totalCalories: number;
  totalProtein: number;
  weightLbs?: number;
  aiReflection?: string;
}

export interface DailyLogs {
  [date: string]: DayLog; // keyed by YYYY-MM-DD
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export const AVATARS: Record<CoachAvatar, { name: string; emoji: string; tagline: string; description: string }> = {
  alex: {
    name: "Alex",
    emoji: "⚡",
    tagline: "Your personal coach",
    description: "Pick the coach you'd like to work with",
  },
  maya: {
    name: "Dr. Maya",
    emoji: "🔬",
    tagline: "Your personal coach",
    description: "Pick the coach you'd like to work with",
  },
  sam: {
    name: "Sam",
    emoji: "😊",
    tagline: "Your personal coach",
    description: "Pick the coach you'd like to work with",
  },
  rivera: {
    name: "Coach Rivera",
    emoji: "💪",
    tagline: "Your personal coach",
    description: "Pick the coach you'd like to work with",
  },
};
