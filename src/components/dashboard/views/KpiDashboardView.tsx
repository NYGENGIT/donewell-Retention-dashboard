'use client';

import React from 'react';
import type { SummaryData } from '@/lib/types';
import { fmt } from '@/lib/format';
import { ViewHeader, StatTile, Card, DataTable } from '../ui';

export default function KpiDashboardView({ data }: { data: SummaryData }) {
  const h = data.headline;

  const tiles = [
    { value: fmt.pct(h.retentionRate), label: 'Policy Retention Rate', sub: `${fmt.int(h.observablePolicies)} observable policies`, accent: 'navy' as const },
    { value: fmt.int(h.uniqueCustomers), label: 'Unique Customers', sub: 'Across 5 years', accent: 'steel' as const },
    { value: fmt.ghsM(h.totalNetPremiumM), label: 'Total Net Premium', sub: 'Motor (GHS) only', accent: 'gold' as const },
    { value: fmt.ghs(h.avgCLV), label: 'Average CLV / customer', sub: 'At 25% gross margin', accent: 'teal' as const },
    { value: fmt.num(h.avgPoliciesPerCustomer, 2), label: 'Avg Policies per Customer', sub: `${fmt.pct(h.multiPolicyPct)} are multi-policy`, accent: 'gold' as const },
    { value: `+${Math.round(h.arpuGrowthPct)}%`, label: 'ARPU Growth 2020 → 2024', sub: `GHS ${Math.round(h.arpu2020)} → GHS ${Math.round(h.arpu2024)}`, accent: 'brick' as const },
  ];

  // Pull a few notable rows straight from the workbook metrics for context.
  const detail = [
    { metric: 'Unique motor policies', value: fmt.int(h.uniquePolicies) },
    { metric: 'Renewed policies', value: fmt.int(100763) },
    { metric: 'Churned policies', value: fmt.int(153543) },
    { metric: 'Overall churn rate', value: fmt.pct(h.churnRate) },
    { metric: 'Average net premium', value: fmt.ghs(625) },
    { metric: 'Median net premium', value: fmt.ghs(302) },
    { metric: 'Average policy tenure', value: '306 days' },
    { metric: 'Multi-policy customers', value: `${fmt.int(61944)} (40.9%)` },
  ];

  return (
    <div>
      <ViewHeader
        eyebrow="Portfolio at a glance"
        title="Donewell Motor Insurance · 2020–2024"
        lede="The numbers that frame every finding that follows. Retention is the constraint; ARPU has been carrying revenue growth."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <StatTile key={t.label} {...t} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Portfolio detail">
          <DataTable
            columns={[
              { key: 'metric', label: 'Metric' },
              { key: 'value', label: 'Value', align: 'right' },
            ]}
            rows={detail}
          />
        </Card>

        <Card title="How to read this report">
          <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-navy" />
              <span>
                <strong className="text-navy-ink">Retention</strong> = a customer issues a new policy within 60
                days of their prior policy&apos;s expiry. Anything else is churn.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal" />
              <span>
                <strong className="text-navy-ink">Observable policies</strong> are those whose expiry falls on or
                before 2024-11-01 — far enough back to judge renewal fairly.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
              <span>
                <strong className="text-navy-ink">CLV</strong> uses a 25% gross-margin benchmark aligned with
                Ghana NIC market reports.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brick" />
              <span>
                Customers are identified by a composite key (normalised name + servicing channel) in the absence
                of a phone or national-ID field — see the report&apos;s limitations.
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
