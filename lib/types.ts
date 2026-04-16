export type CoachAvatar = "alex" | "maya" | "sam" | "rivera";

export interface CoachStyle {
  supportLevel: number; // 1–10, 1=very tough, 10=very gentle (starts at 5)
  techDepth: number; // 1–10, how much science explanation (starts at 5)
  checkInStyle: "brief" | "conversational";
  observations: string[];
}

export interface UserProfile {
  name: string;
  age: number;
  sex: "male" | "female";
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active";
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  coachAvatar: CoachAvatar;
  coachStyle: CoachStyle;
  interestedInFitness: boolean;
  habits: string;
  challenges: string[];
  predictedGoalDate: string;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface FoodEntry {
  id: string;
  timestamp: string; // ISO
  description: string;
  estimatedCalories: number;
  estimatedProtein: number;
  corrected?: boolean;
}

export interface DayLog {
  entries: FoodEntry[];
  totalCalories: number;
  totalProtein: number;
  weightKg?: number;
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
