'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ChannelMixData } from '@/lib/types';
import { CHANNEL_COLORS } from '@/lib/format';
import { ViewHeader, Finding, ChartFrame, Card } from '../ui';

export default function ChannelMixView({ data }: { data: ChannelMixData }) {
  // Order channels by 2024 share (largest at the base of the stack).
  const latest = data.series[data.series.length - 1];
  const ordered = [...data.channels].sort((a, b) => (latest[b] ?? 0) - (latest[a] ?? 0));

  return (
    <div>
      <ViewHeader
        eyebrow="Distribution mix · Section 06"
        title="Five years, almost no rebalancing"
        lede="The channel mix barely moved through COVID and recovery. Discipline — or a missed opportunity to shift toward stickier channels."
      />

      <Finding tone="navy">{data.finding}</Finding>

      <ChartFrame caption="Share of annual policy volume by distribution channel, 2020–2024." height={420}>
        <ResponsiveContainer>
          <AreaChart data={data.series} margin={{ top: 10, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              formatter={(v: number) => `${v.toFixed(1)}%`}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            {ordered.map((ch, i) => (
              <Area
                key={ch}
                type="monotone"
                dataKey={ch}
                stackId="1"
                stroke={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}
                fillOpacity={0.92}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <Card className="mt-6" title="The double-edged stability">
        <p className="text-sm leading-relaxed text-slate-600">
          Agent-sold policies have held 69–73% of volume every year, with Direct/Walk-in at 14–19%, Broker at
          4–7%, and the Digital Marketing unit at under 1.2%. On one hand this reflects a disciplined,
          predictable distribution strategy. On the other, it is a missed opportunity: the highest-retention
          channels (Direct, Microinsurance) remain a thin slice of the book even though they renew far better.
          Brokers, despite lower retention (31.5%), generate the highest average premium per policy (~GHS 1,037,
          nearly 2.5× the agent average) — which is why the channel persists. The strategic question is whether
          the Agent channel&apos;s volume advantage truly compensates for its retention disadvantage.
        </p>
      </Card>
    </div>
  );
}
