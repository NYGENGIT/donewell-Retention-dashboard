'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import type { ChurnByBranchData } from '@/lib/types';
import { fmt, COLORS } from '@/lib/format';
import { ViewHeader, Finding, ChartFrame, Card } from '../ui';

export default function BranchView({ data }: { data: ChurnByBranchData }) {
  // Show the larger branches (already filtered to >100 policies); rank by retention.
  const ranked = [...data.branches].sort((a, b) => b.retentionPct - a.retentionPct);
  const top = ranked.slice(0, 12);
  const avg = 40.07;

  const rows = top.map((b) => ({
    branch: b.branch,
    retention: b.retentionPct,
    n: b.totalPolicies,
  }));

  return (
    <div>
      <ViewHeader
        eyebrow="Finding 04b · Churn drivers"
        title="Branch variance is an exploitable asset"
        lede="A 20-point gap separates the best branch from the worst. The leader's playbook is sitting there, waiting to be copied."
      />

      <Finding tone="teal">{data.finding}</Finding>

      <ChartFrame caption={`Retention by branch (top 12 by retention, >100 observable policies). Dashed line = portfolio average ${fmt.pct(avg)}.`} height={460}>
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 55]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="branch" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v: number, _n, p: any) => [`${v.toFixed(1)}% · ${fmt.int(p.payload.n)} policies`, p.payload.branch]}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
            />
            <Bar dataKey="retention" radius={[0, 4, 4, 0]}>
              {rows.map((r, i) => (
                <Cell key={i} fill={r.retention >= avg ? COLORS.navy : COLORS.steel} />
              ))}
              <LabelList dataKey="retention" position="right" formatter={(v: number) => `${v.toFixed(1)}%`} style={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Replicate Dansoman">
          <p className="text-sm leading-relaxed text-slate-600">
            Dansoman leads at <strong className="text-navy">50.4%</strong> across 19,849 policies — about 17
            points above Koforidua (30.1%) and Tamale (27.3%). That is not a rounding difference; it is a
            different operating model. A structured audit (manager interview, agent observation, renewal-process
            mapping) should codify the Dansoman playbook for deployment to bottom-quartile branches.
          </p>
        </Card>
        <Card title="Where to intervene first">
          <p className="text-sm leading-relaxed text-slate-600">
            Spintex (33.2%), Koforidua (30.1%), and Wejia (36.1%) are the clearest underperformers relative to
            their volume. Main Office (38.0% across 47,972 policies) sits near average but, given its size, even a
            small lift there moves the whole portfolio. Codifying and replicating the leading branches&apos;
            practices is one of the highest-leverage interventions in this analysis.
          </p>
        </Card>
      </div>
    </div>
  );
}
