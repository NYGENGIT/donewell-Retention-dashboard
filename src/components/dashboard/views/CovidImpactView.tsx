'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import type { CovidImpactData } from '@/lib/types';
import { fmt, COLORS } from '@/lib/format';
import { ViewHeader, Finding, ChartFrame, Card } from '../ui';

// COVID phase → color, matching the report's phase overlay.
function phaseColor(phase: string) {
  if (phase.startsWith('Pre-COVID')) return COLORS.teal;
  if (phase.startsWith('COVID')) return COLORS.brick;
  if (phase.startsWith('Recovery')) return COLORS.gold;
  return COLORS.steel; // Post-COVID
}

export default function CovidImpactView({ data }: { data: CovidImpactData }) {
  const premium = data.premium.map((p) => ({ h: p.halfYear, v: p.totalPremiumM, phase: p.phase }));
  // Retention is unreliable for the last two half-years (non-observation inflation) — flag, don't drop.
  const retention = data.retention.map((r) => ({ h: r.halfYear, v: r.retentionPct, phase: r.phase }));

  return (
    <div>
      <ViewHeader
        eyebrow="Resilience · Section 10"
        title="COVID-19: a stress test Donewell passed"
        lede="The pandemic did not depress the premium trajectory. Premium held firm through onset and tripled into the post-COVID period."
      />

      <Finding tone="teal">{data.finding}</Finding>

      <ChartFrame caption="Half-yearly net premium (GHS M) with COVID-phase coloring. Teal = pre-COVID · red = onset/mid · gold = recovery · blue = post-COVID." height={380}>
        <ResponsiveContainer>
          <BarChart data={premium} margin={{ top: 24, right: 12, left: 0, bottom: 24 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="h" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} angle={-30} textAnchor="end" height={48} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${v}`} tickLine={false} axisLine={false} width={40} />
            <Tooltip formatter={(v: number, _n, p: any) => [`GHS ${v.toFixed(1)}M`, p.payload.phase]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Bar dataKey="v" radius={[3, 3, 0, 0]}>
              {premium.map((p, i) => (
                <Cell key={i} fill={phaseColor(p.phase)} />
              ))}
              <LabelList dataKey="v" position="top" formatter={(v: number) => v.toFixed(1)} style={{ fontSize: 10, fill: '#334155', fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <ChartFrame caption="Half-yearly retention. The last two bars (2024H1/H2) are inflated by non-observation, not real improvement." height={320}>
          <ResponsiveContainer>
            <BarChart data={retention} margin={{ top: 16, right: 12, left: 0, bottom: 24 }} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="h" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} angle={-30} textAnchor="end" height={48} tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 65]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={40} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Retention']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                {retention.map((r, i) => (
                  <Cell key={i} fill={i >= retention.length - 2 ? '#cbd5e1' : phaseColor(r.phase)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <Card title="The counter-cyclical advantage">
          <p className="text-sm leading-relaxed text-slate-600">
            Half-yearly premium rose from GHS 11.6M (2020H1) through GHS 14.5M, GHS 18.3M, and on to GHS 27.5M by
            2024H1 — the highest half-year on record. The broader Ghanaian market contracted 3.4% in 2020 (NIC),
            so Donewell&apos;s agent-intensive model appears to have provided a counter-cyclical buffer.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Retention itself stayed within a tight 4-point band through the pandemic (37–39%), confirming that
            renewal behaviour is driven by structural factors — product, channel, premium tier — not pandemic
            dynamics. Treat the 2024 retention jump with caution until 2025 makes it observable.
          </p>
        </Card>
      </div>
    </div>
  );
}
