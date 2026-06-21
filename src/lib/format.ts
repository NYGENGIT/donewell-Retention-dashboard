// Formatting helpers shared across views, plus the brand color tokens that
// keep Recharts visuals consistent with the static chart PNGs.

export const fmt = {
  int: (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  num: (n: number, d = 1) =>
    n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }),
  pct: (n: number, d = 1) => `${n.toFixed(d)}%`,
  ghs: (n: number) => `GHS ${Math.round(n).toLocaleString('en-US')}`,
  ghsM: (n: number) => `GHS ${n.toFixed(1)}M`,
};

export const COLORS = {
  navy: '#1a2f52',
  navyDeep: '#12203c',
  gold: '#c89b3c',
  goldLight: '#dbb455',
  teal: '#2a9d8f',
  brick: '#c0533f',
  steel: '#5b8bbf',
  steelLight: '#86abd2',
  slate: '#64748b',
};

// Sequential cohort ramp matching the cohort-retention chart (dark navy → gold).
export const COHORT_COLORS = ['#12203c', '#3f6c9e', '#86abd2', '#c89b3c', '#dbb455'];

// Distribution-channel stack ramp.
export const CHANNEL_COLORS = [
  '#1a2f52',
  '#3f6c9e',
  '#86abd2',
  '#c89b3c',
  '#dbb455',
  '#2a9d8f',
  '#c0533f',
  '#64748b',
];
