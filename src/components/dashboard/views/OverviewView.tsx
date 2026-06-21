'use client';

import React from 'react';
import type { SummaryData } from '@/lib/types';
import { fmt } from '@/lib/format';

export default function OverviewView({ data }: { data: SummaryData }) {
  const h = data.headline;
  const facts = [
    { v: '343,164', l: 'policy transactions' },
    { v: fmt.int(h.uniqueCustomers), l: 'unique customers' },
    { v: 'GHS 194M+', l: 'net premium' },
    { v: '2020–2024', l: 'observation window' },
  ];

  return (
    <div>
      {/* Hero — the most characteristic thing in this brief is the headline tension:
          a big book, decaying retention. Lead with the title, not a vanity metric. */}
      <div className="relative overflow-hidden rounded-xl bg-navy-deep px-8 py-12 text-white md:px-12 md:py-16">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rotate-45 bg-gold/80"
          aria-hidden
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
        />
        <p className="eyebrow relative mb-5 text-gold-light">Insurance Retention Analytics · Ghana</p>
        <h1 className="relative max-w-3xl font-display text-4xl font-bold leading-[1.08] md:text-6xl">
          Decoding 5-Year Customer Retention in Ghana Motor Insurance
        </h1>
        <p className="relative mt-6 max-w-2xl text-base leading-relaxed text-slate-200">
          A data-driven strategic review of Donewell Insurance&apos;s motor portfolio — its dominant line of
          business, representing over 96% of all policy transactions.
        </p>

        <div className="relative mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4">
          {facts.map((f) => (
            <div key={f.l} className="bg-navy-deep/80 px-5 py-4">
              <p className="font-display text-2xl font-bold text-gold-light">{f.v}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-300">{f.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What's inside */}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <Block
          n="01"
          title="The retention problem"
          body="Six in ten customers lapse within 60 days of expiry. Each new cohort is decaying faster than the last."
        />
        <Block
          n="02"
          title="Where the leak is"
          body="Channel, product, premium tier, and branch each carry double-digit retention spreads — all addressable."
        />
        <Block
          n="03"
          title="What to do about it"
          body="Five prioritised interventions worth an estimated +5–7 portfolio points and ~GHS 10M in retained premium."
        />
      </div>

      <p className="mt-8 text-sm text-slate-500">
        Headline retention sits at{' '}
        <strong className="text-navy">{fmt.pct(h.retentionRate)}</strong> across{' '}
        {fmt.int(h.observablePolicies)} observable policies — within the 35–45% emerging-market band, but with
        wide internal variance that points to real upside. Use the navigation to move through all eight findings.
      </p>
    </div>
  );
}

function Block({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-card">
      <span className="font-mono text-sm font-bold text-gold-deep">{n}</span>
      <h3 className="mt-2 font-display text-xl font-semibold text-navy-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
