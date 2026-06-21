'use client';

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { CohortData } from '@/lib/types';
import { fmt, COHORT_COLORS } from '@/lib/format';
import { ViewHeader, Finding, ChartFrame, Card, StatTile } from '../ui';

export default function CohortRetentionView({ data }: { data: CohortData }) {
  // Reshape cohort rows into one row per x-position (N, N+1 … N+4) with a series per cohort year.
  const points = data.xLabels.map((label, idx) => {
    const row: Record<string, number | string | null> = { x: label };
    data.cohorts.forEach((c) => {
      const seq = [100, c.n1, c.n2, c.n3, c.n4];
      row[String(c.cohort)] = seq[idx] ?? null;
    });
    return row;
  });

  return (
    <div>
      <ViewHeader
        eyebrow="Finding 01 · Core performance"
        title="Customer cohort retention: a steep drop-off after Year 1"
        lede="Tracking each acquisition year's customers through subsequent years isolates the intrinsic stickiness of a vintage from period-specific noise. The picture is worsening."
      />

      <Finding tone="brick">{data.finding}</Finding>

      <div className="grid gap-5 sm:grid-cols-3">
        <StatTile value="46.8%" label="2020 cohort retained at N+1" sub="Best vintage on record" accent="navy" />
        <StatTile value="31.3%" label="2023 cohort retained at N+1" sub="15 pts below 2020" accent="brick" />
        <StatTile value="19.5%" label="2020 cohort still active at N+4" sub="1 in 5 after four years" accent="gold" />
      </div>

      <div className="mt-6">
        <ChartFrame caption="% of each acquisition cohort still active in years N+1 through N+4. Newer cohorts start lower." height={400}>
          <ResponsiveContainer>
            <LineChart data={points} margin={{ top: 10, right: 24, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="x" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                formatter={(v: number) => (v == null ? '—' : `${v.toFixed(1)}%`)}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {data.cohorts.map((c, i) => (
                <Line
                  key={c.cohort}
                  type="linear"
                  dataKey={String(c.cohort)}
                  name={`${c.cohort} (N=${fmt.int(c.customersAtN)})`}
                  stroke={COHORT_COLORS[i % COHORT_COLORS.length]}
                  strokeWidth={c.cohort === 2020 ? 3 : 2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Why it matters">
          <p className="text-sm leading-relaxed text-slate-600">
            Each successive cohort shows weaker first-year retention (46.8% → 36.5% → 32.7% → 31.3%). The company
            is not only losing customers over time, it is losing them <em>faster</em> in newer cohorts. Two
            hypotheses merit investigation: a higher share of price-sensitive customers acquired during premium
            increases (median premium rose GHS 250 → GHS 380 from 2021 to 2023), and intensifying competition in
            the Private Cars segment where volume is concentrated.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Lifting the 2023 cohort&apos;s N+1 retention to the 2020 level would retain roughly 3,530 more
            customers — about <strong className="text-navy">GHS 2.7M</strong> in incremental premium at the 2023
            ARPU. A 5-point portfolio improvement is worth GHS 8–10M annually.
          </p>
        </Card>

        <Card title="Cohort detail">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-navy/10 text-xs uppercase text-slate-500">
                  <th className="px-2 py-2 text-left">Cohort</th>
                  <th className="px-2 py-2 text-right">N</th>
                  <th className="px-2 py-2 text-right">N+1</th>
                  <th className="px-2 py-2 text-right">N+4</th>
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((c) => (
                  <tr key={c.cohort} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-2 font-semibold text-navy-ink">{c.cohort}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmt.int(c.customersAtN)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{c.n1 != null ? fmt.pct(c.n1) : '—'}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{c.n4 != null ? fmt.pct(c.n4) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
