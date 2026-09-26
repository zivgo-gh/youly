import { AppShell } from "@/components/layout/AppShell";
import { AccountMenuTrigger } from "@/components/app/AccountMenu";

/**
 * Wraps the screens that share persistent navigation. This is a route group, so
 * the URLs stay /app/chat, /app/progress and /app/meals.
 *
 * Onboarding, consent and /app/start deliberately sit OUTSIDE it — a linear setup
 * flow shouldn't offer tabs to wander off into.
 */
export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell sidebarFooter={<AccountMenuTrigger />}>{children}</AppShell>;
}
