"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { AVATARS } from "@/lib/types";
import { CoachPhoto } from "@/components/shared/CoachPhoto";
import { Composer } from "@/components/chat/Composer";
import { FunnelShell } from "@/components/layout/FunnelShell";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { TypingDots } from "@/components/ui/Feedback";
import type { UserProfile, CoachAvatar } from "@/lib/types";
import { saveProfile, clearAllData, deleteCloudBackups } from "@/lib/storage";
import { saveProfileDb } from "@/lib/db";
import { chatMigratedKey, logsMigratedKey, profileMigratedKey } from "@/lib/migrate";
import { calcTargets, predictGoalDate } from "@/lib/calories";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedAvatar, setSelectedAvatar] = useState<CoachAvatar | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingProfileJson = useRef<string | null>(null);
  const [input, setInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const [uid, setUid] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showReset, setShowReset] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [resetting, setResetting] = useState(false);
  // null = not counted yet; drives the "you are about to destroy N entries" line.
  const [loggedEntries, setLoggedEntries] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUid(data.user.id);
        setEmail(data.user.email ?? undefined);
      }
    });
  }, []);

  // Signing in with the wrong Google account looks exactly like "the app reset" — an
  // empty profile and a fresh coach picker. Make the account visible before onboarding.
  const handleSwitchAccount = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.replace("/login?next=/app/onboarding");
  };

  // This screen is reachable by accident (a profile that merely failed to load lands
  // here), so the reset must state exactly what it will destroy, up front.
  useEffect(() => {
    if (!showReset || !uid || loggedEntries !== null) return;
    createSupabaseBrowserClient()
      .from("food_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .then(({ count }) => setLoggedEntries(count ?? 0));
  }, [showReset, uid, loggedEntries]);

  const handleReset = async () => {
    setResetting(true);
    const supabase = createSupabaseBrowserClient();

    clearAllData(uid);
    if (uid) {
      await deleteCloudBackups(uid); // legacy backup tables
      await Promise.all([
        supabase.from("food_entries").delete().eq("user_id", uid),
        supabase.from("weights").delete().eq("user_id", uid),
        supabase.from("saved_meal_items").delete().eq("user_id", uid),
        supabase.from("saved_meals").delete().eq("user_id", uid),
        supabase.from("chat_messages").delete().eq("user_id", uid),
        supabase.from("profiles").delete().eq("user_id", uid),
      ]);
      localStorage.removeItem(logsMigratedKey(uid));
      localStorage.removeItem(profileMigratedKey(uid));
      localStorage.removeItem(chatMigratedKey(uid));
    }
    localStorage.removeItem("youly_tour_done");
    await supabase.auth.signOut();
    window.location.replace("/");
  };

  const handleProfileComplete = useCallback(
    async (profileJson: string) => {
      pendingProfileJson.current = profileJson;
      try {
        const raw = JSON.parse(profileJson);
        const dailyDeficit: number = raw.dailyDeficit ?? 500;
        const weeklyLossLbs = dailyDeficit / 500;
        const targets = calcTargets(
          raw.sex,
          raw.currentWeightLbs,
          raw.heightIn,
          raw.age,
          raw.activityLevel,
          dailyDeficit
        );
        const predictedGoalDate = predictGoalDate(
          raw.currentWeightLbs,
          raw.goalWeightLbs,
          weeklyLossLbs
        );

        const profile: UserProfile = {
          ...raw,
          dailyDeficit,
          dailyCalorieTarget: targets.calories,
          dailyProteinTarget: targets.protein,
          predictedGoalDate,
          coachStyle: {
            supportLevel: 5,
            techDepth: 5,
            checkInStyle: "conversational",
            observations: [],
          },
          onboardingComplete: true,
          createdAt: new Date().toISOString(),
        };

        saveProfile(profile, uid); // local cache for instant first paint
        if (uid) {
          await saveProfileDb(uid, profile); // DB-primary — throws if it didn't persist
          // fresh account — nothing to migrate
          localStorage.setItem(logsMigratedKey(uid), "1");
          localStorage.setItem(profileMigratedKey(uid), "1");
          localStorage.setItem(chatMigratedKey(uid), "1");
        }
        setSaveError(null);
        setProfileReady(true);
      } catch (e) {
        console.error("Failed to save profile", e);
        setSaveError(
          "We couldn't save your profile. Check your connection and try again — nothing else was lost."
        );
      }
    },
    [uid]
  );

  const { messages, streamingText, isLoading, sendMessage } = useStreamingChat({
    endpoint: "/api/onboarding",
    getBody: (msgs) => ({ messages: msgs, avatar: selectedAvatar, clientTime: new Date().toISOString() }),
    onProfileComplete: handleProfileComplete,
  });

  const submitMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      setInput("");
      setInterimText("");
      await sendMessage(trimmed);
    },
    [isLoading, sendMessage]
  );

  const { isListening, toggle } = useSpeechRecognition({
    onFinalResult: (transcript) => {
      setInterimText("");
      submitMessage(transcript);
    },
    onInterimResult: (interim) => setInterimText(interim),
  });

  // Once avatar is chosen, kick off the intro
  useEffect(() => {
    if (selectedAvatar) {
      sendMessage("start");
    }
  }, [selectedAvatar]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Hide the "start" trigger message from display
  const displayMessages = messages.filter(
    (m, i) => !(i === 0 && m.role === "user" && m.content === "start")
  );

  // ── Avatar picker ──────────────────────────────────────────────────────────
  if (!selectedAvatar) {
    return (
      <>
        <FunnelShell
          eyebrow="Pick your coach"
          title={
            <>
              Who do you want
              <br />
              to work with?
            </>
          }
          subtitle="Same coaching either way — pick whoever you'd rather talk to."
          headerAction={
            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="min-h-9 shrink-0 px-2 text-sm font-medium text-brand-100 underline underline-offset-2"
            >
              Reset
            </button>
          }
        >
          {/* Signing in with the wrong Google account looks exactly like "the app
              wiped my data" — an empty profile and a fresh coach picker. Naming the
              account here is what stops that panic. */}
          {email ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900">
                Setting up a new profile for{" "}
                <span className="font-semibold">{email}</span>.
              </p>
              <p className="mt-1 text-sm text-amber-900">
                Already have a Youly profile? You may be signed in with a different
                account —{" "}
                <button
                  type="button"
                  onClick={() => setShowSwitch(true)}
                  className="font-semibold underline underline-offset-2"
                >
                  switch account
                </button>
                .
              </p>
            </div>
          ) : null}

          <ul className="grid grid-cols-2 gap-4">
            {(
              Object.entries(AVATARS) as [
                CoachAvatar,
                (typeof AVATARS)[CoachAvatar],
              ][]
            ).map(([key, coach]) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setSelectedAvatar(key)}
                  className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-transparent bg-surface-sunken p-5 text-center transition-colors duration-150 hover:border-brand-600 hover:bg-brand-50"
                >
                  <CoachPhoto avatar={key} size={84} />
                  <span className="text-base font-semibold text-ink">
                    {coach.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </FunnelShell>

        <Sheet
          open={showSwitch}
          onClose={() => setShowSwitch(false)}
          title="Sign in with a different account?"
          footer={
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowSwitch(false)}
              >
                Stay here
              </Button>
              <Button fullWidth onClick={handleSwitchAccount}>
                Switch account
              </Button>
            </div>
          }
        >
          <p className="text-sm text-ink-body">
            You&apos;ll be signed out and taken back to the sign-in screen.{" "}
            <strong className="font-semibold text-ink">Nothing is deleted</strong> —
            if you have a profile on another account, signing into it will bring
            everything back.
          </p>
        </Sheet>

        <ResetSheet
          open={showReset}
          onClose={() => setShowReset(false)}
          loggedEntries={loggedEntries}
          busy={resetting}
          onConfirm={handleReset}
        />
      </>
    );
  }

  // ── Conversation ───────────────────────────────────────────────────────────
  const avatar = AVATARS[selectedAvatar];

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <header className="flex shrink-0 items-center gap-3 border-b border-border-subtle bg-surface px-4 py-3 pt-safe">
        <CoachPhoto avatar={selectedAvatar} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{avatar.name}</p>
          <p className="text-xs text-ink-muted">Setting up your plan</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {displayMessages.map((msg, i) => (
            <MessageBubble key={i} message={msg} coachAvatar={selectedAvatar} />
          ))}

          <div aria-live="polite">
            {streamingText ? (
              <MessageBubble
                message={{
                  role: "assistant",
                  content: streamingText,
                  timestamp: new Date().toISOString(),
                }}
                coachAvatar={selectedAvatar}
                isStreaming
              />
            ) : null}
          </div>

          {isLoading && !streamingText ? (
            <div className="flex gap-3">
              <CoachPhoto avatar={selectedAvatar} size={36} className="mt-0.5" />
              <div className="flex h-11 items-center rounded-2xl rounded-tl-sm border border-border-subtle bg-surface px-4 shadow-card">
                <TypingDots label={`${avatar.name} is typing`} />
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      {saveError ? (
        <div className="shrink-0 border-t border-danger/20 bg-danger-soft px-4 py-3">
          <p role="alert" className="text-sm font-medium text-danger">
            {saveError}
          </p>
          <button
            type="button"
            onClick={() => {
              if (pendingProfileJson.current) {
                handleProfileComplete(pendingProfileJson.current);
              }
            }}
            className="mt-1 text-sm font-semibold text-danger underline"
          >
            Try saving again
          </button>
        </div>
      ) : null}

      {profileReady ? (
        <div className="shrink-0 border-t border-border-subtle bg-surface px-4 py-4 pb-safe">
          <div className="mx-auto max-w-3xl">
            <Button
              fullWidth
              size="lg"
              onClick={() => router.replace("/app/chat")}
            >
              I&apos;m ready — let&apos;s go
            </Button>
          </div>
        </div>
      ) : (
        <div className="shrink-0">
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => submitMessage(input)}
            isLoading={isLoading}
            isListening={isListening}
            interimText={interimText}
            onToggleMic={toggle}
            placeholder="Type your answer…"
          />
        </div>
      )}
    </div>
  );
}

/**
 * The full-wipe confirmation.
 *
 * This replaces two stacked native confirm() calls. They were the only guard on the
 * most destructive action in the product, and this screen is reachable by accident —
 * a profile that merely failed to load can land you here. So the count of what will
 * be destroyed is shown, and destructive confirmation requires typing.
 */
function ResetSheet({
  open,
  onClose,
  loggedEntries,
  busy,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  loggedEntries: number | null;
  busy: boolean;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const armed = typed.trim().toUpperCase() === "DELETE";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Delete everything?"
      description="This cannot be undone."
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            fullWidth
            disabled={!armed}
            loading={busy}
            onClick={onConfirm}
          >
            Delete forever
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-body">
          This permanently deletes your profile, weights, saved meals, and chat
          history from both this device and our database.
        </p>

        {loggedEntries === null ? (
          <p className="text-sm text-ink-muted">Checking what you have logged…</p>
        ) : loggedEntries > 0 ? (
          <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            Including{" "}
            <span className="tnum">{loggedEntries.toLocaleString()}</span> logged
            food {loggedEntries === 1 ? "entry" : "entries"}.
          </p>
        ) : null}

        <p className="text-sm text-ink-body">
          If you only meant to use a different account, close this and choose{" "}
          <strong className="font-semibold text-ink">switch account</strong> instead
          — that deletes nothing.
        </p>

        <Field label="Type DELETE to confirm">
          {(props) => (
            <Input
              {...props}
              value={typed}
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
              placeholder="DELETE"
            />
          )}
        </Field>
      </div>
    </Sheet>
  );
}
