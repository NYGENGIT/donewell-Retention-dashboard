'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { asset } from '@/lib/asset';
import type {
  SummaryData, CohortData, ChurnByChannelData, ChurnByProductData, ChurnByPremiumTierData,
  ChurnByBranchData, ChannelMixData, ProductPortfolioData, RevenueTrendData, CLVData,
  CovidImpactData, ChurnSignalsData,
} from '@/lib/types';

import OverviewView from '@/components/dashboard/views/OverviewView';
import KpiDashboardView from '@/components/dashboard/views/KpiDashboardView';
import CohortRetentionView from '@/components/dashboard/views/CohortRetentionView';
import ChannelPerformanceView from '@/components/dashboard/views/ChannelPerformanceView';
import ProductRetentionView from '@/components/dashboard/views/ProductRetentionView';
import PremiumTierView from '@/components/dashboard/views/PremiumTierView';
import BranchView from '@/components/dashboard/views/BranchView';
import ChannelMixView from '@/components/dashboard/views/ChannelMixView';
import ProductPortfolioView from '@/components/dashboard/views/ProductPortfolioView';
import RevenueTrendView from '@/components/dashboard/views/RevenueTrendView';
import ClvView from '@/components/dashboard/views/ClvView';
import CovidImpactView from '@/components/dashboard/views/CovidImpactView';
import ChurnSignalsView from '@/components/dashboard/views/ChurnSignalsView';
import ActionPlanView from '@/components/dashboard/views/ActionPlanView';

// All datasets, fetched once on mount.
interface Bundle {
  summary: SummaryData;
  cohort: CohortData;
  channel: ChurnByChannelData;
  product: ChurnByProductData;
  premiumTier: ChurnByPremiumTierData;
  branch: ChurnByBranchData;
  channelMix: ChannelMixData;
  portfolio: ProductPortfolioData;
  revenue: RevenueTrendData;
  clv: CLVData;
  covid: CovidImpactData;
  signals: ChurnSignalsData;
}

const FILES: Record<keyof Bundle, string> = {
  summary: 'summary.json',
  cohort: 'cohort-retention.json',
  channel: 'churn-by-channel.json',
  product: 'churn-by-product.json',
  premiumTier: 'churn-by-premium-tier.json',
  branch: 'churn-by-branch.json',
  channelMix: 'channel-mix.json',
  portfolio: 'product-portfolio.json',
  revenue: 'revenue-trend.json',
  clv: 'clv.json',
  covid: 'covid-impact.json',
  signals: 'churn-signals.json',
};

// Navigation, grouped to match the report's narrative arc.
const NAV: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: 'Start here',
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'kpi', label: 'Portfolio at a glance' },
    ],
  },
  {
    group: 'The findings',
    items: [
      { id: 'cohort', label: '01 · Cohort retention' },
      { id: 'channel', label: '02 · Channel performance' },
      { id: 'product', label: '03 · Product retention' },
      { id: 'premium', label: '04 · Premium tiers' },
      { id: 'branch', label: '04b · Branch variance' },
      { id: 'revenue', label: '05 · Revenue & ARPU' },
    ],
  },
  {
    group: 'Deeper analysis',
    items: [
      { id: 'mix', label: 'Channel mix' },
      { id: 'portfolio', label: 'Product portfolio' },
      { id: 'clv', label: 'Lifetime value' },
      { id: 'covid', label: 'COVID resilience' },
      { id: 'signals', label: 'Churn signals & agents' },
    ],
  },
  {
    group: 'So what',
    items: [{ id: 'action', label: 'Action plan & downloads' }],
  },
];

export default function Page() {
  const [data, setData] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState('overview');
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const entries = await Promise.all(
          (Object.keys(FILES) as (keyof Bundle)[]).map(async (key) => {
            const res = await fetch(asset(`/data/${FILES[key]}`));
            if (!res.ok) throw new Error(`${FILES[key]} → ${res.status}`);
            return [key, await res.json()] as const;
          }),
        );
        if (!cancelled) setData(Object.fromEntries(entries) as unknown as Bundle);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    switch (active) {
      case 'overview': return <OverviewView data={data.summary} />;
      case 'kpi': return <KpiDashboardView data={data.summary} />;
      case 'cohort': return <CohortRetentionView data={data.cohort} />;
      case 'channel': return <ChannelPerformanceView data={data.channel} />;
      case 'product': return <ProductRetentionView data={data.product} />;
      case 'premium': return <PremiumTierView data={data.premiumTier} />;
      case 'branch': return <BranchView data={data.branch} />;
      case 'mix': return <ChannelMixView data={data.channelMix} />;
      case 'portfolio': return <ProductPortfolioView data={data.portfolio} />;
      case 'revenue': return <RevenueTrendView data={data.revenue} />;
      case 'clv': return <ClvView data={data.clv} />;
      case 'covid': return <CovidImpactView data={data.covid} />;
      case 'signals': return <ChurnSignalsView data={data.signals} />;
      case 'action': return <ActionPlanView />;
      default: return <OverviewView data={data.summary} />;
    }
  }, [active, data]);

  function go(id: string) {
    setActive(id);
    setNavOpen(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-navy-deep px-4 py-3 text-white lg:hidden">
        <span className="font-display text-lg font-bold">Donewell · Retention</span>
        <button
          onClick={() => setNavOpen((o) => !o)}
          className="rounded-md border border-white/20 px-3 py-1.5 text-sm"
          aria-expanded={navOpen}
        >
          {navOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${navOpen ? 'block' : 'hidden'} w-full shrink-0 border-b border-navy-line/40 bg-navy-deep text-slate-200 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-72 lg:overflow-y-auto lg:border-b-0`}
      >
        <div className="hidden px-6 pb-2 pt-7 lg:block">
          <p className="font-display text-xl font-bold leading-tight text-white">Donewell Insurance</p>
          <p className="mt-1 text-xs uppercase tracking-eyebrow text-gold-light">Motor Retention · 2020–2024</p>
        </div>
        <nav className="px-3 py-4 lg:px-4">
          {NAV.map((section) => (
            <div key={section.group} className="mb-5">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-eyebrow text-slate-400">
                {section.group}
              </p>
              <ul>
                {section.items.map((item) => {
                  const on = active === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => go(item.id)}
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                          on
                            ? 'bg-gold/15 font-semibold text-gold-light'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                        aria-current={on ? 'page' : undefined}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? 'bg-gold' : 'bg-transparent'}`} />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <p className="px-6 pb-6 text-[11px] leading-relaxed text-slate-500">
          Internal Strategic Insights · Confidential
        </p>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1 bg-paper px-5 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-5xl">
          {error && (
            <div className="rounded-lg border border-brick/30 bg-white p-6 text-sm text-brick-deep shadow-card">
              Could not load the dashboard data ({error}). If you are running locally, start the dev server with{' '}
              <code className="rounded bg-mist px-1.5 py-0.5 font-mono">npm run dev</code> so the JSON files in{' '}
              <code className="rounded bg-mist px-1.5 py-0.5 font-mono">public/data</code> are served.
            </div>
          )}

          {!error && !data && (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-navy" />
                <p className="mt-3 text-sm text-slate-500">Loading analysis…</p>
              </div>
            </div>
          )}

          {view}

          {data && (
            <footer className="mt-14 border-t border-slate-200 pt-5 text-xs text-slate-400">
              Donewell Insurance · Internal Strategic Insights · Analysis window 2020–2024 ·{' '}
              {data.summary.headline.uniquePolicies.toLocaleString()} unique motor policies
            </footer>
          )}
        </div>
      </main>
    </div>
  );
}
