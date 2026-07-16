import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@travada-books/ui/components/tabs";
import { Button } from "@travada-books/ui/components/button";
import { Settings02Icon, TickIcon } from "@travada-books/ui/icons";
import { useAuth } from "@/contexts/auth-context";
import { MetricsFilterBar } from "@/components/dashboard/metrics-filter-bar";
import {
  WidgetProvider,
  useIsCustomizing,
  useWidgetActions,
} from "@/components/dashboard/widget-provider";

import { lookupRate } from "@/lib/queries/exchange-rates";
import { type RevenueType } from "@/lib/queries/metrics";
import {
  DEFAULT_METRICS_RANGE,
  isMetricsRangePreset,
  resolveMetricsRange,
  type MetricsRangePreset,
  type MetricsCustomRange,
} from "@/lib/metrics-range";
import OverviewTab from "./overview";
import MetricsTab from "./metrics";

const DEFAULT_REVENUE_TYPE: RevenueType = "gross";
const BASE_VIEW_CURRENCY = "base";

function CustomizeToggle() {
  const isCustomizing = useIsCustomizing();
  const { setIsCustomizing } = useWidgetActions();

  return (
    <Button
      variant='outline'
      size='icon'
      onClick={() => setIsCustomizing(!isCustomizing)}
      aria-label={isCustomizing ? "Done customizing" : "Customize dashboard"}
    >
      {isCustomizing ?
        <TickIcon size={14} />
      : <Settings02Icon size={14} />}
    </Button>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  return "Evening";
}

export function DashboardPage() {
  const { orgId, org, profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [greeting] = useState(getGreeting);

  const tab = searchParams.get("tab") === "metrics" ? "metrics" : "overview";
  const rangeParam = searchParams.get("range");
  const range =
    isMetricsRangePreset(rangeParam) ? rangeParam : DEFAULT_METRICS_RANGE;

  const customFrom = searchParams.get("customFrom");
  const customTo = searchParams.get("customTo");
  const customRange: MetricsCustomRange | undefined =
    range === "custom" && customFrom && customTo ?
      { from: customFrom, to: customTo }
    : undefined;

  const revenueTypeParam = searchParams.get("revenueType");
  const revenueType: RevenueType =
    revenueTypeParam === "net" ? "net" : DEFAULT_REVENUE_TYPE;

  const viewCurrency = searchParams.get("viewCurrency") ?? BASE_VIEW_CURRENCY;

  const { from, to } = useMemo(
    () => resolveMetricsRange(range, new Date(), customRange),
    [range, customRange],
  );

  function handleTabChange(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "overview") {
          next.delete("tab");
        } else {
          next.set("tab", value);
        }
        return next;
      },
      { replace: true },
    );
  }

  function handleRangeChange(
    value: MetricsRangePreset,
    nextCustomRange?: MetricsCustomRange,
  ) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === DEFAULT_METRICS_RANGE) {
          next.delete("range");
        } else {
          next.set("range", value);
        }
        if (value === "custom" && nextCustomRange) {
          next.set("customFrom", nextCustomRange.from);
          next.set("customTo", nextCustomRange.to);
        } else {
          next.delete("customFrom");
          next.delete("customTo");
        }
        return next;
      },
      { replace: true },
    );
  }

  function handleRevenueTypeChange(value: RevenueType) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === DEFAULT_REVENUE_TYPE) {
          next.delete("revenueType");
        } else {
          next.set("revenueType", value);
        }
        return next;
      },
      { replace: true },
    );
  }

  function handleViewCurrencyChange(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === BASE_VIEW_CURRENCY) {
          next.delete("viewCurrency");
        } else {
          next.set("viewCurrency", value);
        }
        return next;
      },
      { replace: true },
    );
  }

  const baseCurrency = org?.base_currency;
  const isCustomCurrency = viewCurrency !== BASE_VIEW_CURRENCY;

  // Only fetched when the user has picked a non-base view currency — the
  // figures underneath are already correct in base currency, this rate is
  // purely a display-time multiplier (see queries/exchange-rates.ts).
  const { data: fxRateData, isError: fxRateError } = useQuery({
    queryKey: ["fx-rate", baseCurrency, viewCurrency],
    queryFn: () => lookupRate(baseCurrency as string, viewCurrency),
    enabled: Boolean(baseCurrency) && isCustomCurrency,
    staleTime: 5 * 60 * 1000,
  });

  // Null means no rate found in `exchange_rates` — never silently fall back
  // to a 1:1 rate (that was the exact bug fixed elsewhere this session).
  // Surface it and keep displaying in the base currency instead.
  const rateUnavailable =
    isCustomCurrency && (fxRateError || fxRateData === null);

  useEffect(() => {
    if (rateUnavailable) {
      toast.error(
        `No exchange rate found for ${baseCurrency} to ${viewCurrency}`,
        {
          description: "Showing figures in the base currency instead.",
        },
      );
    }
    // Re-fire only when the specific pair actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateUnavailable, baseCurrency, viewCurrency]);

  const displayCurrency =
    isCustomCurrency && !rateUnavailable ? viewCurrency : (baseCurrency ?? "");
  const fxRate = isCustomCurrency && !rateUnavailable ? (fxRateData ?? 1) : 1;

  if (!orgId || !org || !user) return null;

  const firstName = profile?.full_name?.split(" ")[0];
  const greetingText = firstName ? `${greeting}, ${firstName}` : greeting;

  return (
    <WidgetProvider orgId={orgId} userId={user.id}>
      <div className='flex flex-col'>
        <Tabs
          value={tab}
          onValueChange={(value) => handleTabChange(value as string)}
          className='gap-0'
        >
          <div className='flex items-start justify-between gap-4 border-b px-6 py-4'>
            <div>
              <h1 className='text-xl leading-tight font-semibold'>
                {greetingText}
              </h1>
              <p className='text-xs text-muted-foreground'>
                Here's a quick look at how things are going
              </p>
            </div>

            <TabsList className='self-center'>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='metrics'>Metrics</TabsTrigger>
            </TabsList>

            <div className='flex items-center gap-2 self-center'>
              {tab === "overview" && <CustomizeToggle />}
              <MetricsFilterBar
                orgId={orgId}
                baseCurrency={org.base_currency}
                range={range}
                customRange={customRange}
                onRangeChange={handleRangeChange}
                revenueType={revenueType}
                onRevenueTypeChange={handleRevenueTypeChange}
                viewCurrency={viewCurrency}
                onViewCurrencyChange={handleViewCurrencyChange}
              />
            </div>
          </div>

          <TabsContent value='overview'>
            <OverviewTab
              orgId={orgId}
              currency={org.base_currency}
              from={from}
              to={to}
              revenueType={revenueType}
              displayCurrency={displayCurrency}
              fxRate={fxRate}
            />
          </TabsContent>
          <TabsContent value='metrics'>
            <MetricsTab
              orgId={orgId}
              currency={org.base_currency}
              from={from}
              to={to}
              revenueType={revenueType}
              displayCurrency={displayCurrency}
              fxRate={fxRate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </WidgetProvider>
  );
}
