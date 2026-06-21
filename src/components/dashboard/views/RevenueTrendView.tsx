'use client';

import React from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { RevenueTrendData } from '@/lib/types';
import { fmt, COLORS } from '@/lib/format';
import { ViewHeader, Finding, ChartFrame, Card, StatTile } from '../ui';

export default function RevenueTrendView({ data }: { data: RevenueTrendData }) {
  const rows = data.years.map((y) => ({
    year: y.year,
    premium: y.totalPremiumM,
    arpu: y.arpu,
    newCustPct: y.newCustomerPct,
  }));

  return (
    <div>
      <ViewHeader
        eyebrow="Finding 05 · Revenue"
        title="Revenue is up 88% — but the engine is ARPU, not customers"
        lede="The book is growing in value per customer, not in customer count. That model has a ceiling without retention."
      />

      <Finding tone="navy">{data.finding}</Finding>

      <div className="grid gap-5 sm:grid-cols-3">
        <StatTile value="+88%" label="Premium growth 2020→2024" sub="GHS 26.1M → GHS 49.2M" accent="navy" />
        <StatTile value="+70%" label="ARPU growth" sub="GHS 588 → GHS 999" accent="gold" />
        <StatTile value="+11%" label="Customer-base growth" sub="44,392 → 49,237" accent="brick" />
      </div>

      <div className="mt-6">
        <ChartFrame caption="Total net premium (bars, GHS M) and ARPU (line, GHS per customer), 2020–2024." height={400}>
          <ResponsiveContainer>
            <ComposedChart data={rows} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => `${v}M`}
                tickLine={false}
                axisLine={false}
                width={44}
                label={{ value: 'Premium (GHS M)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => v}
                tickLine={false}
                axisLine={false}
                width={48}
                label={{ value: 'ARPU (GHS)', angle: 90, position: 'insideRight', fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                formatter={(v: number, name) =>
                  name === 'Premium' ? [`GHS ${v.toFixed(1)}M`, name] : [`GHS ${Math.round(v)}`, name]
                }
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="premium" name="Premium" fill={COLORS.navy} radius={[3, 3, 0, 0]} barSize={48} />
              <Line yAxisId="right" type="monotone" dataKey="arpu" name="ARPU" stroke={COLORS.gold} strokeWidth={3} dot={{ r: 5, fill: COLORS.gold }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <Card className="mt-6" title="The leaky-bucket dynamic">
        <p className="text-sm leading-relaxed text-slate-600">
          New-customer share fell from a greenfield 100% in 2020 to 43.6% in 2024 — expected as a book matures.
          But combined with structurally low retention, it creates a leaky bucket: Donewell must acquire roughly
          21,000 new customers a year simply to hold the base flat, because ~60% of existing customers churn
          annually. At a Ghana motor CAC of GHS 80–120 per policy, that churn represents{' '}
          <strong className="text-navy">GHS 1.7M–2.5M</strong> in annual acquisition-cost leakage — capital that
          would earn a far higher return redirected into retention.
        </p>
      </Card>
    </div>
  );
}
