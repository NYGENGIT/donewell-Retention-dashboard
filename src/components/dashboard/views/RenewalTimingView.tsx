'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
} from 'recharts';
import { RenewalTimingData } from '@/lib/types';
import { ViewHeader, Finding, Card, StatTile, ChartFrame, SourceLine, DataTable } from '@/components/dashboard/ui';

const ON_TIME = '#2a9d8f';   // teal
const LONGER = '#c89b3c';    // gold
const CHURN = '#c0533f';     // brick

export default function RenewalTimingView({ data }: { data: RenewalTimingData }) {
  const o = data.overall;

  // Channel chart: share of the 120-day observable base in each bucket.
  const channelData = data.byChannel
    .filter((c) => (c.observable120 ?? 0) >= 500 && !String(c.channel).startsWith('Reinsurance'))
    .map((c) => {
      const base = c.observable120 || 1;
      const onTime = c.observable60 ? Math.round((c.onTime / c.observable60) * c.observable120) : 0;
      return {
        channel: String(c.channel).replace(' / Walk-in', '').replace(' Channel', ''),
        'On time': +((onTime / base) * 100).toFixed(1),
        'Took longer': +((c.tookLonger / base) * 100).toFixed(1),
        Churned: +((c.churned120 / base) * 100).toFixed(1),
      };
    });

  const cohortRows = data.byCohort.map((c) => ({
    cohort: c.cohort,
    onTime: c.onTime,
    tookLonger: c.tookLonger,
    retention60: c.retention60,
    retention120: c.retention120,
    uplift: +(c.retention120 - c.retention60).toFixed(2),
  }));

  return (
    <div>
      <ViewHeader
        eyebrow="Deeper analysis · renewal timing"
        title="The customers who took a bit longer to come back"
        lede="The headline retention rule counts a customer as churned if their next policy doesn't start within 60 days of expiry. But some return a little later. Stretching the window to 120 days separates genuine losses from slow renewers."
      />

      <Finding tone="teal">{data.finding}</Finding>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile accent="teal" value={`${o.retention60}%`} label="Retention — 60-day rule" sub="next policy within 60 days of expiry" />
        <StatTile accent="gold" value={o.tookLonger.toLocaleString()} label="Took a bit longer to renew" sub="returned 61–120 days after expiry" />
        <StatTile accent="navy" value={`${o.retention120}%`} label="Retention — 120-day view" sub={`+${(o.retention120 - o.retention60).toFixed(1)} pts vs the 60-day rule`} />
        <StatTile accent="brick" value={o.churned120.toLocaleString()} label="Still churned at 120 days" sub="no renewal within four months" />
      </div>

      <ChartFrame caption="Each bar splits a channel's observable policies into on-time renewals (within 60 days), late returners (61–120 days), and those still churned after 120 days.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={channelData} layout="vertical" margin={{ top: 6, right: 28, left: 8, bottom: 4 }} stackOffset="expand">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => `${Math.round(v * 100)}%`} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
            <YAxis type="category" dataKey="channel" width={88} axisLine={false} tickLine={false} tick={{ fontSize: 13 }} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Legend />
            <Bar dataKey="On time" stackId="a" fill={ON_TIME} />
            <Bar dataKey="Took longer" stackId="a" fill={LONGER} />
            <Bar dataKey="Churned" stackId="a" fill={CHURN} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="mt-6">
        <Card title="By acquisition cohort">
          <DataTable
            columns={[
              { key: 'cohort', label: 'Cohort' },
              { key: 'onTime', label: 'On-time renewals', align: 'right', render: (v) => v.toLocaleString() },
              { key: 'tookLonger', label: 'Took longer (61–120d)', align: 'right', render: (v) => v.toLocaleString() },
              { key: 'retention60', label: 'Retention 60d', align: 'right', render: (v) => `${v}%` },
              { key: 'retention120', label: 'Retention 120d', align: 'right', render: (v) => `${v}%` },
              { key: 'uplift', label: 'Uplift', align: 'right', render: (v) => `+${v} pts` },
            ]}
            rows={cohortRows}
          />
        </Card>
      </div>

      <p className="mt-6 text-xs italic text-slate-400">{data.windowNote}</p>
      <SourceLine />
    </div>
  );
}
