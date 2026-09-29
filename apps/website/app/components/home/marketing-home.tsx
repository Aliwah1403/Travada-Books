import { BuiltForHere, WhoItsFor } from "~/components/home/audience"
import { ClosingCta, HomeFaq } from "~/components/home/closing"
import { Hero, WorksWith } from "~/components/home/hero"
import { IntegrationsHub } from "~/components/home/integrations-hub"
import { FeatureRows, Problem, ScreenshotBand, WhatIsTravada } from "~/components/home/product"
import { KeptSafe } from "~/components/home/trust"

// Home page body — the 12 sections of WEBSITE-REDO-PLAN.md §4 "/ Home",
// built on the site/* primitives and the illustration kit.
export function MarketingHome() {
  return (
    <>
      <Hero />
      <WorksWith />
      <Problem />
      <WhatIsTravada />
      <FeatureRows />
      <ScreenshotBand />
      <IntegrationsHub />
      <BuiltForHere />
      <WhoItsFor />
      <KeptSafe />
      <HomeFaq />
      <ClosingCta />
    </>
  )
}
