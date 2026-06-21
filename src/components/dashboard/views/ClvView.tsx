'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import type { CLVData } from '@/lib/types';
import { fmt, COLORS, COHORT_COLORS } from '@/lib/format';
import { ViewHeader, Finding, ChartFrame, Card } from '../ui';

export default function ClvView({ data }: { data: CLVData }) {
  // Channel CLV: drop reinsurance (GHS 13k outlier) so retail channels are legible.
  const channels = data.byChannel
    .filter((c) => !c.channel.startsWith('Reinsurance'))
    .sort((a, b) => b.avgCLV - a.avgCLV)
    .map((c) => ({ channel: c.channel, clv: c.avgCLV, n: c.customers }));

  const cohorts = data.byCohort.map((c) => ({ cohort: String(c.cohort), clv: c.avgCLV, n: c.customers }));

  return (
    <div>
      <ViewHeader
        eyebrow="Lifetime value · Section 09"
        title="Where the lifetime value actually sits"
        lede="CLV = avg annual premium × tenure × 25% margin. The distribution is heavily right-skewed toward a few commercial relationships."
      />

      <Finding tone="navy">{data.finding}</Finding>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartFrame caption="Average CLV by channel (Reinsurance excluded as a GHS 13k outlier)." height={360}>
          <ResponsiveContainer>
            <BarChart data={channels} layout="vertical" margin={{ top: 4, right: 72, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 1400]} tickFormatter={(v) => `${v}`} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="channel" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [fmt.ghs(v), 'Avg CLV']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="clv" fill={COLORS.gold} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="clv" position="right" formatter={(v: number) => fmt.ghs(v)} style={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame caption="Average CLV by acquisition cohort. Newer cohorts track lower — partly mechanical (shorter observed tenure), partly real." height={360}>
          <ResponsiveContainer>
            <BarChart data={cohorts} margin={{ top: 24, right: 12, left: 0, bottom: 4 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="cohort" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis domain={[0, 360]} tickFormatter={(v) => `${v}`} tickLine={false} axisLine={false} width={40} />
              <Tooltip formatter={(v: number) => [fmt.ghs(v), 'Avg CLV']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="clv" radius={[4, 4, 0, 0]}>
                {cohorts.map((_, i) => (
                  <Cell key={i} fill={COHORT_COLORS[i % COHORT_COLORS.length]} />
                ))}
                <LabelList dataKey="clv" position="top" formatter={(v: number) => fmt.ghs(v)} style={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <Card className="mt-6" title="The retention-investment test">
        <p className="text-sm leading-relaxed text-slate-600">
          Portfolio mean CLV is GHS 263 (median GHS 107), and total CLV across all 151,358 customers is ~GHS
          39.8M — the gross-profit-creating capacity of the book at current retention. Strategic Channel (GHS 561)
          and Broker (GHS 349) deliver the highest per-customer CLV via commercial clients; the Agent channel,
          despite its volume, returns just GHS 199. By cohort, the 2020 vintage has generated GHS 308 versus GHS
          192 for 2024. If the 2024 cohort eventually matches 2020, that single cohort unlocks ~GHS 2.5M in
          incremental lifetime gross profit. The practical rule: any retention intervention costing less than{' '}
          <strong className="text-navy">GHS 100 per incremental retained customer</strong> is value-accretive at
          the portfolio level.
        </p>
      </Card>
    </div>
  );
}
