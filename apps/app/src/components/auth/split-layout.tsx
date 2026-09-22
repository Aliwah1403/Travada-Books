import type { ReactNode } from "react";

/**
 * ── Split-column layout shell ───────────────────────────────────────────────
 *
 * Shared by every split-screen preview flow (onboarding, auth): a fixed-width
 * form column on the left and a figure panel on the right, framed as a 16:9
 * card at 2xl and up. Originally lived inside onboarding-split.tsx; pulled out
 * here so auth-split.tsx can reuse it without onboarding-split.tsx becoming a
 * dependency of the auth playground.
 */
export function SplitLayout({
  form,
  figure,
}: {
  form: ReactNode;
  figure: ReactNode;
}) {
  return (
    <div className="relative h-svh overflow-hidden bg-background text-foreground 2xl:flex 2xl:h-auto 2xl:min-h-svh 2xl:items-center 2xl:justify-center 2xl:overflow-visible 2xl:p-6">
      <div className="relative mx-auto flex h-full w-full max-w-[1600px] 2xl:aspect-video 2xl:h-auto 2xl:overflow-hidden 2xl:rounded-2xl 2xl:border 2xl:shadow-2xl">
        <div className="relative flex w-full flex-col items-center justify-center overflow-y-auto px-6 py-10 lg:w-[620px] lg:px-14">
          {form}
        </div>
        <div className="relative hidden flex-1 overflow-hidden border-l lg:block">
          {figure}
        </div>
      </div>
    </div>
  );
}
