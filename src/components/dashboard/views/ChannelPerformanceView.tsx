'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import type { ChurnByChannelData } from '@/lib/types';
import { fmt, COLORS } from '@/lib/format';
import { ViewHeader, Finding, ChartFrame, Card, DataTable } from '../ui';

export default function ChannelPerformanceView({ data }: { data: ChurnByChannelData }) {
  // Drop the B2B reinsurance treaty line from the retail comparison chart (9% is not comparable).
  const retail = data.channels.filter((c) => !c.channel.startsWith('Reinsurance'));
  const chartData = retail.map((c) => ({
    channel: c.channel.replace(' / ', ' /\n'),
    Retention: c.retentionPct,
    Churn: c.churnPct,
    n: c.totalPolicies,
  }));

  return (
    <div>
      <ViewHeader
        eyebrow="Finding 02 · Churn drivers"
        title="Channel performance: Direct beats Agent-led by 9 points"
        lede="Distribution channel is the single largest driver of retention variance — yet the highest-volume channel is not the stickiest."
      />

      <Finding tone="navy">{data.finding}</Finding>

      <ChartFrame caption="Retention and churn by distribution channel. Reinsurance/Co-insurance (B2B treaty, 9.3%) is excluded as non-comparable." height={400}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 24 }} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="channel" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} interval={0} height={48} tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              formatter={(v: number, name) => [`${v.toFixed(1)}%`, name]}
              labelFormatter={(l) => String(l).replace('\n', ' ')}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Retention" fill={COLORS.teal} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Churn" fill={COLORS.brick} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card title="The strategic implication">
          <p className="text-sm leading-relaxed text-slate-600">
            Donewell&apos;s reliance on the Agent channel — currently <strong className="text-navy">71% of new
            business</strong> — is structurally capping portfolio retention. Direct-to-customer channels (walk-in
            and the nascent Digital Marketing unit) deliver materially better stickiness, likely because direct
            customers hold a relationship with the Donewell brand rather than an intermediated agent.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Converting even 20% of agent-sold policies to direct servicing at renewal — at the 47% direct
            retention rate — would lift retention on the treated base by roughly 4.7 points.
          </p>
        </Card>

        <Card title="By channel">
          <DataTable
            columns={[
              { key: 'channel', label: 'Channel' },
              { key: 'totalPolicies', label: 'Policies', align: 'right', render: (v) => fmt.int(v) },
              { key: 'retentionPct', label: 'Retention', align: 'right', render: (v) => (
                <span className={v >= 45 ? 'font-semibold text-teal-deep' : v < 35 ? 'font-semibold text-brick-deep' : ''}>
                  {fmt.pct(v)}
                </span>
              ) },
              { key: 'churnPct', label: 'Churn', align: 'right', render: (v) => fmt.pct(v) },
            ]}
            rows={data.channels}
          />
        </Card>
      </div>
    </div>
  );
}
