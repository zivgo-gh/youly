import { AppSidebar, AppTabBar } from "./AppNav";

/**
 * The gated app's frame: sidebar from lg up, bottom tab bar below it.
 *
 * Uses h-dvh rather than h-screen — h-screen (100vh) is the iOS bug where the
 * address bar covers the bottom of the layout, which is exactly what the pinned
 * chat composer was suffering from.
 */
export function AppShell({
  children,
  sidebarFooter,
}: {
  children: React.ReactNode;
  sidebarFooter?: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-surface-sunken">
      <AppSidebar footer={sidebarFooter} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <AppTabBar />
      </div>
    </div>
  );
}
