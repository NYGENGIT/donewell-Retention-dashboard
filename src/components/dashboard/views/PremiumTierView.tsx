'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import type { ChurnByPremiumTierData } from '@/lib/types';
import { fmt, COLORS } from '@/lib/format';
import { ViewHeader, Finding, ChartFrame, Card, StatTile } from '../ui';

// Churn bands: High >60% red · Watch 50-60% gold · Healthy <50% teal.
function band(pct: number) {
  if (pct > 60) return COLORS.brick;
  if (pct >= 50) return COLORS.gold;
  return COLORS.teal;
}

export default function PremiumTierView({ data }: { data: ChurnByPremiumTierData }) {
  // Exclude the negative-premium refund bucket from the headline chart.
  const tiers = data.tiers.filter((t) => !t.tier.startsWith('<0'));
  const rows = tiers.map((t) => ({ tier: t.tier, churn: t.churnPct, n: t.totalPolicies }));

  return (
    <div>
      <ViewHeader
        eyebrow="Finding 04 · Churn drivers"
        title="The mid-premium tier is the most churn-prone"
        lede="Churn does not rise linearly with price. It traces a U — the squeezed middle leaks the most."
      />

      <Finding tone="navy">{data.finding}</Finding>

      <div className="grid gap-5 sm:grid-cols-3">
        <StatTile value="49.6%" label="Churn at GHS 0–100" sub="Trivial price → easy renewal" accent="teal" />
        <StatTile value="64.6%" label="Churn at GHS 300–600" sub="Largest tier, worst churn" accent="brick" />
        <StatTile value="56.9%" label="Churn at GHS 1500+" sub="Valued asset → worth protecting" accent="gold" />
      </div>

      <div className="mt-6">
        <ChartFrame caption="Churn rate by premium tier (Motor, GHS). The negative-premium refund bucket is excluded." height={380}>
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 24, right: 16, left: 0, bottom: 8 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="tier" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis domain={[0, 75]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                formatter={(v: number, _n, p: any) => [`${v.toFixed(1)}% churn · n=${fmt.int(p.payload.n)}`, p.payload.tier]}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
              />
              <Bar dataKey="churn" radius={[4, 4, 0, 0]}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={band(r.churn)} />
                ))}
                <LabelList dataKey="churn" position="top" formatter={(v: number) => `${v.toFixed(1)}%`} style={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <Card className="mt-6" title="Reading the U-curve">
        <p className="text-sm leading-relaxed text-slate-600">
          Two distinct profiles sit at the extremes. Very-low-premium customers (minimum-cover third-party
          policies) renew because the price point is trivial; high-premium customers (comprehensive cover on
          valuable assets) renew because the asset is worth protecting. The middle tier — where customers pay
          enough to feel the cost but not enough to perceive comprehensive value — is the most fragile. This is
          precisely where targeted retention offers (bundling, loyalty discounts, claims-free rewards) would
          yield the highest ROI, because it is both the largest tier (108,975 policies) and the leakiest.
        </p>
      </Card>
    </div>
  );
}
