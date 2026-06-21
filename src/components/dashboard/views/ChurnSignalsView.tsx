'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import type { ChurnSignalsData } from '@/lib/types';
import { fmt, COLORS } from '@/lib/format';
import { ViewHeader, Finding, ChartFrame, Card, DataTable } from '../ui';

export default function ChurnSignalsView({ data }: { data: ChurnSignalsData }) {
  const timing = data.issueTiming.map((t) => ({ timing: t.timing, churn: t.churnPct, n: t.policies }));
  const agents = [...data.topAgents].sort((a, b) => b.retentionPct - a.retentionPct);

  return (
    <div>
      <ViewHeader
        eyebrow="Early warning · Section 11"
        title="The strongest churn signal is renewal timing"
        lede="Individual-policy churn is noisy, but one operational lever stands out: when the policy is issued relative to its start date."
      />

      <Finding tone="brick">{data.finding}</Finding>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartFrame caption="Churn rate by issue timing. 'Late' = back-dated (issued on/after the period starts)." height={340}>
          <ResponsiveContainer>
            <BarChart data={timing} margin={{ top: 24, right: 12, left: 0, bottom: 8 }} barCategoryGap="26%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="timing" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 75]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={40} />
              <Tooltip formatter={(v: number, _n, p: any) => [`${v.toFixed(1)}% churn · n=${fmt.int(p.payload.n)}`, p.payload.timing]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="churn" radius={[4, 4, 0, 0]}>
                {timing.map((t, i) => (
                  <Cell key={i} fill={t.churn > 60 ? COLORS.brick : t.churn < 48 ? COLORS.teal : COLORS.gold} />
                ))}
                <LabelList dataKey="churn" position="top" formatter={(v: number) => `${v.toFixed(1)}%`} style={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <Card title="Correlation signals (Pearson)">
          <DataTable
            columns={[
              { key: 'feature', label: 'Feature' },
              { key: 'correlation', label: 'r w/ churn', align: 'right', render: (v) => v.toFixed(3) },
              { key: 'direction', label: 'Direction' },
            ]}
            rows={data.correlations}
          />
          <p className="mt-3 text-xs italic text-slate-400">
            Linear signals are weak — typical for policy-level churn — but the categorical issue-timing split is
            strong and operationally actionable.
          </p>
        </Card>
      </div>

      <Card className="mt-6" title="The operational takeaway">
        <p className="text-sm leading-relaxed text-slate-600">
          Policies issued <strong className="text-brick-deep">late</strong> (back-dated to cover an
          already-started period) churn at 64.7%, versus 46.4% for those issued 1–7 days ahead — a 14-point
          retention advantage for the &quot;last-minute&quot; window. The implication is concrete: systematically
          flag policies approaching expiry and push renewal quotes 7–30 days before the start date, rather than
          allowing back-dated late renewals that correlate with dramatically higher churn.
        </p>
      </Card>

      <Card className="mt-6" title="Top 15 agents by volume — a 26-point retention spread">
        <DataTable
          columns={[
            { key: 'name', label: 'Agent' },
            { key: 'policies', label: 'Policies', align: 'right', render: (v) => fmt.int(v) },
            { key: 'totalPremium', label: 'Premium', align: 'right', render: (v) => fmt.ghsM(v / 1e6) },
            {
              key: 'retentionPct',
              label: 'Retention',
              align: 'right',
              render: (v) => (
                <span className={v >= 45 ? 'font-semibold text-teal-deep' : v < 33 ? 'font-semibold text-brick-deep' : ''}>
                  {fmt.pct(v)}
                </span>
              ),
            },
          ]}
          rows={agents}
        />
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          The bottom-five agents collectively handle ~24,900 policies at 25–36% retention versus 47–51% for the
          top quintile — an estimated <strong className="text-navy">GHS 3M+</strong> in annual premium leakage.
          Coach, retrain (using top performers as trainers), or sunset.
        </p>
      </Card>
    </div>
  );
}
