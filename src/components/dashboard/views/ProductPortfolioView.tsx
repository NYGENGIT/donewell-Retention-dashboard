'use client';

import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { ProductPortfolioData } from '@/lib/types';
import { fmt, COLORS } from '@/lib/format';
import { ViewHeader, ChartFrame, Card, DataTable, Finding } from '../ui';

export default function ProductPortfolioView({ data }: { data: ProductPortfolioData }) {
  // Quadrant view: retention (x) vs avg premium (y, log-friendly), bubble = policy volume.
  const points = data.products.map((p) => ({
    name: p.product.replace(/^\d+ - /, ''),
    retention: p.retentionPct,
    premium: p.avgPremium,
    policies: p.policies,
  }));

  const avgRetention = 40.07;

  function color(retention: number, premium: number) {
    if (retention >= avgRetention && premium >= 1000) return COLORS.teal; // stars
    if (retention >= avgRetention) return COLORS.navy; // solid mass
    if (premium >= 1000) return COLORS.gold; // high-value, needs retention fix
    return COLORS.brick; // question marks
  }

  return (
    <div>
      <ViewHeader
        eyebrow="Portfolio strategy · Section 07"
        title="Stars, question marks, and a fix-list"
        lede="Plotting retention against average premium turns ten products into a prioritisation map. Bubble size is policy volume."
      />

      <Finding tone="navy">{data.finding}</Finding>

      <ChartFrame caption="Avg premium (log scale) vs retention. Vertical line = portfolio average retention (40.1%). Bubble area ∝ policy volume." height={420}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 16, right: 24, left: 8, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="retention"
              name="Retention"
              domain={[10, 50]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{ value: 'Retention rate', position: 'insideBottom', offset: -8, fontSize: 12, fill: '#64748b' }}
            />
            <YAxis
              type="number"
              dataKey="premium"
              name="Avg Premium"
              scale="log"
              domain={[100, 40000]}
              tickFormatter={(v) => `GHS ${v >= 1000 ? `${v / 1000}k` : v}`}
              tickLine={false}
              axisLine={false}
              width={70}
            />
            <ZAxis type="number" dataKey="policies" range={[80, 1200]} />
            <ReferenceLine x={avgRetention} stroke="#94a3b8" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(v: number, name) =>
                name === 'Avg Premium' ? [fmt.ghs(v), name] : name === 'Retention' ? [`${v.toFixed(1)}%`, name] : [fmt.int(v), 'Policies']
              }
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              labelFormatter={() => ''}
            />
            <Scatter data={points} fillOpacity={0.78}>
              {points.map((p, i) => (
                <Cell key={i} fill={color(p.retention, p.premium)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card title="The prioritisation frame">
          <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
            <li><span className="font-semibold text-teal-deep">Stars</span> — high premium, high retention (Private Car Corporate): protect and invest.</li>
            <li><span className="font-semibold text-gold-deep">Fix-list</span> — high premium, low retention (Motor Fleet, Goods Carrying): each retained customer is worth a lot; build a retention play.</li>
            <li><span className="font-semibold text-brick-deep">Question marks</span> — low premium, low retention (Motorcycle): turn around or exit.</li>
            <li><span className="font-semibold text-navy">Mass</span> — Private Cars Individual carries the book; defend the core.</li>
          </ul>
        </Card>
        <Card title="Portfolio detail">
          <DataTable
            columns={[
              { key: 'product', label: 'Product', render: (v) => v.replace(/^\d+ - /, '') },
              { key: 'policies', label: 'Policies', align: 'right', render: (v) => fmt.int(v) },
              { key: 'avgPremium', label: 'Avg Prem', align: 'right', render: (v) => fmt.ghs(v) },
              { key: 'retentionPct', label: 'Retention', align: 'right', render: (v) => fmt.pct(v) },
            ]}
            rows={data.products}
          />
        </Card>
      </div>
    </div>
  );
}
