'use client';

import React from 'react';

/** Section header: eyebrow + title + optional lede, opened by a gold rule. */
export function ViewHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className="mb-7">
      <div className="rule-gold mb-4" />
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h2 className="font-display text-3xl leading-tight text-navy-ink md:text-4xl">{title}</h2>
      {lede && <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-600">{lede}</p>}
    </header>
  );
}

/** Highlighted finding line — the through-thread of the report. */
export function Finding({ children, tone = 'navy' }: { children: React.ReactNode; tone?: 'navy' | 'brick' | 'teal' }) {
  const border = tone === 'brick' ? 'border-brick' : tone === 'teal' ? 'border-teal' : 'border-gold';
  const text = tone === 'brick' ? 'text-brick-deep' : tone === 'teal' ? 'text-teal-deep' : 'text-navy';
  return (
    <div className={`mb-6 border-l-[3px] ${border} bg-white px-5 py-3 shadow-card`}>
      <p className={`text-sm font-semibold leading-relaxed ${text}`}>{children}</p>
    </div>
  );
}

/** White content card. */
export function Card({
  children,
  className = '',
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section className={`rounded-lg bg-white p-5 shadow-card ${className}`}>
      {title && <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>}
      {children}
    </section>
  );
}

/** KPI tile with an accent top border. */
export function StatTile({
  value,
  label,
  sub,
  accent = 'navy',
}: {
  value: string;
  label: string;
  sub?: string;
  accent?: 'navy' | 'gold' | 'teal' | 'brick' | 'steel';
}) {
  const bar: Record<string, string> = {
    navy: 'bg-navy',
    gold: 'bg-gold',
    teal: 'bg-teal',
    brick: 'bg-brick',
    steel: 'bg-steel',
  };
  const val: Record<string, string> = {
    navy: 'text-navy',
    gold: 'text-gold-deep',
    teal: 'text-teal-deep',
    brick: 'text-brick-deep',
    steel: 'text-steel-deep',
  };
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-card">
      <div className={`h-1.5 w-full ${bar[accent]}`} />
      <div className="p-5">
        <p className={`font-display text-3xl font-bold ${val[accent]}`}>{value}</p>
        <p className="mt-2 text-sm font-semibold leading-snug text-navy-ink">{label}</p>
        {sub && <p className="mt-1 text-xs italic text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

/** Frame around a Recharts chart with a caption. */
export function ChartFrame({
  children,
  caption,
  height = 360,
}: {
  children: React.ReactNode;
  caption?: string;
  height?: number;
}) {
  return (
    <Card>
      <div style={{ width: '100%', height }}>{children}</div>
      {caption && <p className="mt-3 text-xs italic text-slate-400">{caption}</p>}
    </Card>
  );
}

/** Static source line repeated in the report charts. */
export function SourceLine() {
  return (
    <p className="mt-6 text-xs italic text-slate-400">
      Source: Donewell Insurance policy register 2020–2024 · Analysis: Retention Analytics
    </p>
  );
}

/** Simple responsive table for ranked data. */
export function DataTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string; align?: 'left' | 'right'; render?: (v: any, row: any) => React.ReactNode }[];
  rows: Record<string, any>[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-navy/10">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                  c.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-mist/60">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2.5 text-navy-ink ${c.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                >
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
