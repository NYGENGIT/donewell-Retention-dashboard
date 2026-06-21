'use client';

import React, { useState } from 'react';
import { asset } from '@/lib/asset';
import { ViewHeader, Card } from '../ui';

const PLAN = [
  {
    n: 1,
    title: 'Rescue the Motorcycle book',
    body: '15% retention is unsustainable. Launch renewal SMS (14 + 7 days pre-expiry) plus an agent incentive ring-fenced for Products 1020/1021.',
    impact: '+8–12 pts retention',
    risk: 'Low',
    tone: 'brick',
  },
  {
    n: 2,
    title: 'Replicate the Dansoman playbook',
    body: '50% retention vs 33% at Spintex. Audit and codify the local engagement model, then roll out to bottom-quartile branches.',
    impact: '+3–5 pts portfolio',
    risk: 'Medium',
    tone: 'gold',
  },
  {
    n: 3,
    title: 'Convert Agent-sold to Direct servicing',
    body: 'Agent channel = 38% retention, Direct = 47%. Pilot a Direct-servicing programme for renewing customers while preserving agent commission for one cycle.',
    impact: '+5–7 pts on treated base',
    risk: 'Political',
    tone: 'steel',
  },
  {
    n: 4,
    title: 'Win back the 2020 cohort',
    body: 'Only 19% of the 2020 cohort is still active five years on. The other 81% are warm leads — run a targeted reactivation campaign.',
    impact: 'GHS 1.5–2.5M incremental premium',
    risk: 'Low',
    tone: 'teal',
  },
  {
    n: 5,
    title: 'Fix the agent tail (bottom 5 agents)',
    body: '25–29% retention vs 51% for top performers. Coach, retrain, or sunset. Premium leakage is GHS 3M+ annually.',
    impact: '+2–3 pts',
    risk: 'HR-sensitive',
    tone: 'navy',
  },
] as const;

const SLIDES = [
  'LI_01_cover.png',
  'LI_02_kpi_dashboard.png',
  'LI_03_cohort.png',
  'LI_04_channel.png',
  'LI_05_product.png',
  'LI_06_revenue.png',
  'LI_07_covid.png',
  'LI_08_action_plan.png',
];

const toneRing: Record<string, string> = {
  brick: 'border-brick',
  gold: 'border-gold',
  steel: 'border-steel',
  teal: 'border-teal',
  navy: 'border-navy',
};
const toneBadge: Record<string, string> = {
  brick: 'bg-brick',
  gold: 'bg-gold',
  steel: 'bg-steel',
  teal: 'bg-teal',
  navy: 'bg-navy',
};

export default function ActionPlanView() {
  const [slide, setSlide] = useState(0);

  return (
    <div>
      <ViewHeader
        eyebrow="Recommendations · Section 12"
        title="The action plan: five prioritised interventions"
        lede="Sequenced by expected value relative to implementation complexity. Combined addressable impact: +5–7 portfolio points and ~GHS 10M in retained premium."
      />

      <div className="space-y-4">
        {PLAN.map((p) => (
          <div key={p.n} className={`flex gap-4 rounded-lg border-l-[3px] bg-white p-5 shadow-card ${toneRing[p.tone]}`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${toneBadge[p.tone]}`}>
              {p.n}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold text-navy-ink">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.body}</p>
              <p className="mt-2 text-xs font-semibold">
                <span className="text-teal-deep">Impact: {p.impact}</span>
                <span className="mx-2 text-slate-300">·</span>
                <span className="text-slate-500">Risk: {p.risk}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* LinkedIn carousel */}
      <div className="mt-10">
        <div className="rule-gold mb-4" />
        <p className="eyebrow mb-2">Shareable · LinkedIn carousel</p>
        <h3 className="font-display text-2xl text-navy-ink">Eight slides, one story</h3>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          A ready-to-post version of the findings for internal and external sharing.
        </p>

        <Card className="mt-5">
          <div className="relative mx-auto max-w-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset(`/linkedin/${SLIDES[slide]}`)}
              alt={`LinkedIn slide ${slide + 1} of ${SLIDES.length}`}
              className="w-full rounded-lg border border-slate-200"
            />
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length)}
                className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-deep"
                aria-label="Previous slide"
              >
                ← Prev
              </button>
              <div className="flex gap-1.5">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-2.5 w-2.5 rounded-full transition ${i === slide ? 'bg-gold' : 'bg-slate-300 hover:bg-slate-400'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setSlide((s) => (s + 1) % SLIDES.length)}
                className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-deep"
                aria-label="Next slide"
              >
                Next →
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              Slide {slide + 1} of {SLIDES.length}
            </p>
          </div>
        </Card>
      </div>

      {/* Downloads */}
      <div className="mt-10">
        <div className="rule-gold mb-4" />
        <p className="eyebrow mb-2">Take it with you</p>
        <h3 className="font-display text-2xl text-navy-ink">Full deliverables</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <DownloadCard
            href={asset('/downloads/Donewell_Retention_Analysis_Report.docx')}
            label="Full written report"
            meta="Word · 13 sections · methodology, findings, limitations"
            accent="navy"
          />
          <DownloadCard
            href={asset('/downloads/Donewell_Retention_Analysis_2020-2024.xlsx')}
            label="Analysis workbook"
            meta="Excel · 19 sheets · raw sample + all aggregates"
            accent="teal"
          />
        </div>
      </div>
    </div>
  );
}

function DownloadCard({ href, label, meta, accent }: { href: string; label: string; meta: string; accent: 'navy' | 'teal' }) {
  const bar = accent === 'teal' ? 'bg-teal' : 'bg-navy';
  return (
    <a
      href={href}
      download
      className="group flex items-center gap-4 overflow-hidden rounded-lg bg-white shadow-card transition hover:shadow-lift"
    >
      <span className={`h-full w-1.5 self-stretch ${bar}`} />
      <span className="flex-1 py-4">
        <span className="block font-semibold text-navy-ink">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{meta}</span>
      </span>
      <span className="px-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-gold-deep" aria-hidden>
        ↓
      </span>
    </a>
  );
}
