import Anthropic from "@anthropic-ai/sdk";
import type { UserProfile, DailyLogs } from "./types";
import { weeklyStats, aggregateLast, todayStr } from "./calories";
import { AVATARS } from "./types";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "log_food",
    description:
      "Log a food entry for the user. Call this whenever the user mentions eating or drinking something. Estimate calories and protein based on your knowledge of typical portion sizes.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        time: { type: "string", description: "Time in HH:MM 24h format, e.g. 13:30" },
        description: { type: "string", description: "Description of what was eaten" },
        estimated_calories: { type: "number", description: "Estimated calories" },
        estimated_protein: { type: "number", description: "Estimated protein in grams" },
      },
      required: ["date", "time", "description", "estimated_calories", "estimated_protein"],
    },
  },
  {
    name: "correct_food_entry",
    description:
      "Correct an existing food entry. Use when the user says something like 'that was actually yesterday' or 'I had less than that'.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date of the entry to correct (YYYY-MM-DD)" },
        entry_id: { type: "string", description: "ID of the entry to correct" },
        updated_description: { type: "string" },
        updated_calories: { type: "number" },
        updated_protein: { type: "number" },
      },
      required: ["date", "entry_id"],
    },
  },
  {
    name: "delete_food_entry",
    description: "Delete a food entry when the user asks to remove it.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date of the entry (YYYY-MM-DD)" },
        entry_id: { type: "string", description: "ID of the entry to delete" },
      },
      required: ["date", "entry_id"],
    },
  },
  {
    name: "log_weight",
    description: "Record the user's weight when they mention it.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        weight_kg: { type: "number", description: "Weight in kilograms" },
      },
      required: ["date", "weight_kg"],
    },
  },
  {
    name: "get_log",
    description:
      "Retrieve the food log for a specific date. Use when the user asks about a past day or you need context.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
      },
      required: ["date"],
    },
  },
  {
    name: "update_coach_style",
    description:
      "Update your own coaching style based on signals from the user's responses and behavior. Call this when you learn something meaningful about how this specific user prefers to be coached.",
    input_schema: {
      type: "object" as const,
      properties: {
        field: {
          type: "string",
          enum: ["supportLevel", "techDepth", "checkInStyle", "observations"],
          description: "Which aspect of coach style to update",
        },
        value: {
          description:
            "New value: number for supportLevel/techDepth, 'brief'|'conversational' for checkInStyle, string for observations (will be appended)",
        },
        reason: { type: "string", description: "Why you are making this adjustment" },
      },
      required: ["field", "value", "reason"],
    },
  },
];

// ─── System prompt ────────────────────────────────────────────────────────────

export function buildSystemPrompt(
  profile: UserProfile,
  logs: DailyLogs,
  now: Date
): string {
  const avatar = AVATARS[profile.coachAvatar];
  const today = todayStr();
  const todayLog = logs[today] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
  const stats7 = weeklyStats(logs, 7);
  const agg14 = aggregateLast(logs, 14);
  const loggedDays14 = agg14.filter((d) => d.logged);

  const hour = now.getHours();
  const timeOfDay =
    hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const weightHistory = agg14
    .filter((d) => d.weightKg !== null)
    .map((d) => `${d.date}: ${d.weightKg}kg`)
    .join(", ");

  const coachStyleNote = `
Coach style calibration (self-updated over time):
- Support level: ${profile.coachStyle.supportLevel}/10 (1=very tough, 10=very gentle)
- Scientific depth: ${profile.coachStyle.techDepth}/10 (1=minimal, 10=deep science)
- Check-in style: ${profile.coachStyle.checkInStyle}
- Observations about this user: ${profile.coachStyle.observations.length > 0 ? profile.coachStyle.observations.join("; ") : "none yet"}
`.trim();

  return `You are ${avatar.name}, an expert AI weight loss coach inside the Youly app. You are a combination of:
- A cutting-edge, evidence-based dietitian (up to date on the latest nutrition science)
- A personal fitness coach (if the user is interested)
- A warm personal assistant who is there for the user's mental and emotional journey

Your goal is to help ${profile.name} lose weight sustainably while preserving muscle mass. High protein is always a priority.

PERSONALITY & TONE:
You are proactive, not reactive. You don't wait to be asked — you check in, you notice patterns, you give unsolicited encouragement when earned and honest pushback when needed.
You are never shaming or guilt-inducing. Even when the user slips up, you reframe it constructively and move forward.
You adapt your communication style based on the calibration below.

${coachStyleNote}

USER PROFILE:
- Name: ${profile.name}
- Age: ${profile.age}, Sex: ${profile.sex}
- Height: ${profile.heightCm}cm, Starting weight: ${profile.currentWeightKg}kg, Goal weight: ${profile.goalWeightKg}kg
- Activity level: ${profile.activityLevel}
- Daily calorie target: ${profile.dailyCalorieTarget} kcal
- Daily protein target: ${profile.dailyProteinTarget}g
- Fitness coaching: ${profile.interestedInFitness ? "yes, interested" : "not currently"}
- Eating habits: ${profile.habits}
- Known challenges: ${profile.challenges.join(", ")}
- Predicted goal date: ${profile.predictedGoalDate}

TODAY'S LOG (${today}, ${timeOfDay}):
- Calories so far: ${todayLog.totalCalories} / ${profile.dailyCalorieTarget} kcal (${profile.dailyCalorieTarget - todayLog.totalCalories} remaining)
- Protein so far: ${todayLog.totalProtein} / ${profile.dailyProteinTarget}g
- Entries: ${todayLog.entries.length > 0 ? todayLog.entries.map((e) => `[${e.id}] ${e.description} (~${e.estimatedCalories}kcal, ${e.estimatedProtein}g protein)`).join("; ") : "nothing logged yet"}
- Weight logged today: ${todayLog.weightKg ? `${todayLog.weightKg}kg` : "not logged"}

LAST 7 DAYS SUMMARY:
- Avg calories: ${stats7.avgCalories} kcal/day (${loggedDays14.length > 0 ? stats7.daysLogged : 0} of 7 days logged)
- Avg protein: ${stats7.avgProtein}g/day
- Weight history: ${weightHistory || "no weigh-ins yet"}

BEHAVIOR INSTRUCTIONS:
- When the user mentions eating or drinking anything, immediately call log_food with your best estimate. Don't ask for exact amounts — estimate based on typical portions.
- When you detect the user is correcting a previous entry ("that was yesterday", "I had less"), call correct_food_entry.
- Periodically (not every message) share progress toward goal date.
- If today's protein is tracking low at lunch/dinner time, mention it.
- If the user has gone over calories, don't just report it — coach them through it.
- If you notice a meaningful pattern in how the user communicates or responds, call update_coach_style.
- You know it is currently: ${now.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "numeric" })}. Use this for context on check-ins and logging times.
- For food logging, always use today's date unless the user clearly indicates otherwise.`;
}

// ─── Onboarding system prompt ─────────────────────────────────────────────────

export function buildOnboardingSystemPrompt(now: Date, avatar: import("./types").CoachAvatar): string {
  const coachName = AVATARS[avatar].name;

  return `You are ${coachName}, a personal weight loss coach inside the Youly app.

TONE & FORMAT — critical rules:
- Write like you're texting. Short, warm, human.
- Ask EXACTLY ONE question per message. Never two.
- 1-3 sentences max. No paragraphs, no lists.
- Don't give advice yet — just get to know them.
- Always refer to yourself as ${coachName}.

OPENING MESSAGE (triggered when user sends "start"):
Introduce yourself by name and ask for their name. Keep it natural and brief:
"Hey! I'm ${coachName}, your personal coach. What's your name?"

QUESTION ORDER — one at a time, in order:
1. Their name
2. What's their goal — what are they trying to achieve?
3. Current weight and height (ask together, they're related)
4. Age and biological sex (one question)
5. How active are they day-to-day?
6. What does a typical day of eating look like?
7. What's been the hardest part — what keeps getting in the way?
8. Workout tips too, or just nutrition for now?

After each answer: one sentence acknowledging what they said, then the next question.

Once you have ALL of the above, send a warm closing line (still as ${coachName}), then output:

<profile>
{
  "name": "...",
  "age": 0,
  "sex": "male" or "female",
  "heightCm": 0,
  "currentWeightKg": 0,
  "goalWeightKg": 0,
  "activityLevel": "sedentary" | "light" | "moderate" | "active",
  "interestedInFitness": true | false,
  "habits": "...",
  "challenges": ["...", "..."],
  "coachAvatar": "${avatar}"
}
</profile>

Only output the <profile> block when you have everything. Convert imperial units to metric.

Current time: ${now.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "numeric" })}`;
}
