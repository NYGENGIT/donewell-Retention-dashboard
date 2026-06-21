// Shapes for the 12 JSON files in /public/data. Kept loose where the source
// workbook carries free-form note fields, strict where charts depend on it.

export interface SummaryData {
  title: string;
  period: string;
  headline: {
    retentionRate: number;
    uniqueCustomers: number;
    totalNetPremium: number;
    totalNetPremiumM: number;
    avgCLV: number;
    avgPoliciesPerCustomer: number;
    multiPolicyPct: number;
    observablePolicies: number;
    uniquePolicies: number;
    arpu2020: number;
    arpu2024: number;
    arpuGrowthPct: number;
    churnRate: number;
  };
  metrics: Record<string, { value: string | number; notes: string | null }>;
}

export interface CohortRow {
  cohort: number;
  customersAtN: number;
  n1: number | null;
  n2: number | null;
  n3: number | null;
  n4: number | null;
  n5: number | null;
}
export interface CohortData {
  title: string;
  xLabels: string[];
  cohorts: CohortRow[];
  finding: string;
}

export interface ChannelChurnRow {
  channel: string;
  totalPolicies: number;
  renewed: number;
  churned: number;
  retentionPct: number;
  churnPct: number;
}
export interface ChurnByChannelData {
  title: string;
  channels: ChannelChurnRow[];
  finding: string;
}

export interface ProductChurnRow {
  product: string;
  totalPolicies: number;
  renewed: number;
  churned: number;
  avgPremium: number;
  retentionPct: number;
  churnPct: number;
}
export interface ChurnByProductData {
  title: string;
  products: ProductChurnRow[];
  finding: string;
}

export interface PremiumTierRow {
  tier: string;
  totalPolicies: number;
  renewed: number;
  churned: number;
  retentionPct: number;
  churnPct: number;
}
export interface ChurnByPremiumTierData {
  title: string;
  tiers: PremiumTierRow[];
  finding: string;
}

export interface BranchRow {
  branch: string;
  code: string;
  totalPolicies: number;
  renewed: number;
  churned: number;
  retentionPct: number;
}
export interface ChurnByBranchData {
  title: string;
  branches: BranchRow[];
  finding: string;
}

export interface ChannelMixData {
  title: string;
  channels: string[];
  series: Array<Record<string, number>>;
  finding: string;
}

export interface PortfolioRow {
  product: string;
  policies: number;
  customers: number;
  totalPremium: number;
  avgPremium: number;
  medianPremium: number;
  retentionPct: number;
  observablePolicies: number;
}
export interface ProductPortfolioData {
  title: string;
  products: PortfolioRow[];
  finding: string;
}

export interface RevenueYear {
  year: number;
  policies: number;
  customers: number;
  newCustomers: number;
  totalPremium: number;
  avgPremium: number;
  medianPremium: number;
  arpu: number;
  totalPremiumM: number;
  newCustomerPct: number;
  grossMarginM: number;
}
export interface RevenueTrendData {
  title: string;
  years: RevenueYear[];
  finding: string;
}

export interface CLVChannelRow {
  channel: string;
  customers: number;
  avgCLV: number;
  medianCLV: number;
  totalCLV: number;
  avgPolicies: number;
  avgTenureYears: number;
  totalCLVm: number;
}
export interface CLVCohortRow {
  cohort: number;
  customers: number;
  avgCLV: number;
  medianCLV: number;
  totalCLV: number;
  totalCLVm: number;
}
export interface CLVData {
  title: string;
  byChannel: CLVChannelRow[];
  byCohort: CLVCohortRow[];
  finding: string;
}

export interface CovidPremiumRow {
  halfYear: string;
  policies: number;
  customers: number;
  newCustomers: number;
  totalPremium: number;
  avgPremium: number;
  phase: string;
  newCustomerPct: number;
  totalPremiumM: number;
}
export interface CovidRetentionRow {
  halfYear: string;
  observablePolicies: number;
  renewed: number;
  retentionPct: number;
  phase: string;
}
export interface CovidImpactData {
  title: string;
  premium: CovidPremiumRow[];
  retention: CovidRetentionRow[];
  finding: string;
}

export interface CorrelationRow {
  feature: string;
  correlation: number;
  meanChurned: number;
  meanRenewed: number;
  direction: string;
}
export interface IssueTimingRow {
  timing: string;
  policies: number;
  churned: number;
  churnPct: number;
}
export interface AgentRow {
  code: string;
  name: string;
  policies: number;
  renewed: number;
  totalPremium: number;
  retentionPct: number;
}
export interface ChurnSignalsData {
  title: string;
  correlations: CorrelationRow[];
  issueTiming: IssueTimingRow[];
  topAgents: AgentRow[];
  finding: string;
}
