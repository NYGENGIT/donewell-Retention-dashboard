'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import type { ChurnByProductData } from '@/lib/types';
import { fmt, COLORS } from '@/lib/format';
import { ViewHeader, Finding, ChartFrame, Card } from '../ui';

// Health bands match the report: Healthy ≥42%, Watch 35-42%, At-risk <35%.
function band(pct: number) {
  if (pct >= 42) return COLORS.teal;
  if (pct >= 35) return COLORS.gold;
  return COLORS.brick;
}

export default function ProductRetentionView({ data }: { data: ChurnByProductData }) {
  const rows = [...data.products]
    .sort((a, b) => b.retentionPct - a.retentionPct)
    .map((p) => ({
      product: p.product.replace(/^\d+ - /, ''),
      retention: p.retentionPct,
      n: p.totalPolicies,
    }));

  return (
    <div>
      <ViewHeader
        eyebrow="Finding 03 · Churn drivers"
        title="Motorcycle & Fleet are bleeding customers"
        lede="Product-level retention spans a 30-point range. Two product lines behave like single-transaction relationships."
      />

      <Finding tone="brick">{data.finding}</Finding>

      <ChartFrame caption="Retention by motor product (top 10 by volume). Green ≥42% healthy · gold 35–42% watch · red <35% at-risk." height={460}>
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 50]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="product"
              width={210}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(1)}%`, 'Retention']}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
            />
            <Bar dataKey="retention" radius={[0, 4, 4, 0]}>
              {rows.map((r, i) => (
                <Cell key={i} fill={band(r.retention)} />
              ))}
              <LabelList
                dataKey="retention"
                position="right"
                formatter={(v: number) => `${v.toFixed(1)}%`}
                style={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="The motorcycle problem">
          <p className="text-sm leading-relaxed text-slate-600">
            Motorcycle Individual (1020) retains just <strong className="text-brick-deep">15.5%</strong> across
            13,916 policies; Motorcycle Corporate (1021) sits at 16.7%. Combined, roughly 14,900 policies retain
            below 17% — six times worse than Private Cars. For the vast majority of these customers, the
            relationship is a single transaction. Root causes worth probing: renewal pricing, claims experience,
            or distribution gaps.
          </p>
        </Card>
        <Card title="The anchor">
          <p className="text-sm leading-relaxed text-slate-600">
            Private Cars Individual (1001) is the flagship — 179,135 policies at <strong className="text-teal-deep">42.7%</strong> retention,
            slightly above portfolio average. Its concentration is both a strength and a risk: any competitive
            disruption in this segment would have an outsized portfolio impact. Motor Trade lines (Internal Risk
            44.3%, Road Risk 40.1%) round out the healthier end of the book.
          </p>
        </Card>
      </div>
    </div>
  );
}
