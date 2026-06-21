#!/usr/bin/env python3
"""
build_dashboard_data.py
=======================
Recompute every dashboard dataset (public/data/*.json) from RAW motor policy
transactions. Use this to refresh the dashboard when a new year of data (e.g.
2025) becomes available.

WHY YOU MUST FEED IN ALL YEARS AT ONCE
--------------------------------------
Retention is a CROSS-YEAR measure: a policy counts as "renewed" only if the
same customer takes another policy within a grace window after their cover
ends. Adding 2025 therefore also revises 2024's retention (policies that were
not yet observable at the old Dec-2024 cut-off become observable once 2025
data exists). So always run this over the COMPLETE history:

    python scripts/build_dashboard_data.py \
        --inputs raw_2020.xlsx raw_2021.xlsx raw_2022.xlsx \
                 raw_2023.xlsx raw_2024.xlsx raw_2025.xlsx

Each input file must use the column layout of
templates/Donewell_Raw_Data_Template.xlsx (.xlsx or .csv both accepted).

CALIBRATE BEFORE YOU TRUST IT
-----------------------------
This script reconstructs the published methodology. Before relying on a run
that includes new data, run it on the ORIGINAL 2020-2024 files alone with
--check and confirm the headline figures reproduce the numbers already on the
dashboard (overall retention 40.07%, 151,358 customers, etc.). If they differ,
adjust the CONSTANTS block below (most often GRACE_DAYS or the data cut-off)
until they match, then add the new year.

The static narrative ("finding" sentences and titles) is carried over from the
existing JSON files unchanged. Review those by hand after a material data
change, since they quote specific numbers.
"""

import argparse, json, re, sys, unicodedata
from pathlib import Path
from datetime import timedelta
import pandas as pd
import numpy as np

# ------------------------------------------------------------------ CONSTANTS
GRACE_DAYS      = 60          # renewal window after Period To
MARGIN          = 0.25        # gross-margin assumption for CLV (NIC benchmark)
DATA_CUTOFF     = None        # None => use max Period To found in the data
PREMIUM_TIERS   = [(-1e18, 0, "<0 (refund)"), (0, 100, "0-100"), (100, 300, "100-300"),
                   (300, 600, "300-600"), (600, 1500, "600-1500"), (1500, 1e18, "1500+")]
TIMING_BUCKETS  = [(-1e18, 0, "Late (\u22640d)"), (1, 7, "Last-minute (1-7d)"),
                   (8, 30, "Normal (8-30d)"), (31, 1e18, "Early (>30d)")]
CHANNEL_BY_PREFIX = {"AG": "Agent", "BO": "Branch Office", "BR": "Broker",
                     "DI": "Direct / Walk-in", "DM": "Digital Marketing",
                     "ME": "Microinsurance", "RI": "Reinsurance / Co-insurance",
                     "SC": "Strategic Channel"}
COVID_PHASE = {  # half-year -> phase label (extend here for future years)
    "2020H1": "Pre-COVID (Jan-Jun 2020)", "2020H2": "COVID Onset (Jul-Dec 2020)",
    "2021H1": "COVID Mid (Jan-Jun 2021)", "2021H2": "Recovery (Jul-Dec 2021)",
    "2022H1": "Post-COVID (Jan-Jun 2022)", "2022H2": "Post-COVID (Jul-Dec 2022)",
    "2023H1": "Post-COVID (Jan-Jun 2023)", "2023H2": "Post-COVID (Jul-Dec 2023)",
    "2024H1": "Post-COVID (Jan-Jun 2024)", "2024H2": "Post-COVID (Jul-Dec 2024)",
}
SOURCE_COLS = ["Policy No.", "Branch", "Class", "Product", "Insured Name",
               "Cust. Name (Channel)", "Issue Date", "Period From", "Period To",
               "Approval Date", "Net Premium (GHS)", "Our Share %"]

ROOT     = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "public" / "data"


# ------------------------------------------------------------------ LOAD/CLEAN
def _norm_header(h):
    return re.sub(r"\s+", " ", str(h).strip().lower()).rstrip(".")

def load_inputs(paths):
    frames = []
    want = {_norm_header(c): c for c in SOURCE_COLS}
    for p in paths:
        p = Path(p)
        if p.suffix.lower() in (".xlsx", ".xlsm"):
            raw = pd.read_excel(p, sheet_name=0, header=None)
            # find the header row (the one containing "Policy No")
            hdr_idx = next((i for i, r in raw.iterrows()
                            if any(_norm_header(v) == "policy no" for v in r.values)), 0)
            df = pd.read_excel(p, sheet_name=0, header=hdr_idx)
        else:
            df = pd.read_csv(p)
        ren = {c: want[_norm_header(c)] for c in df.columns if _norm_header(c) in want}
        df = df.rename(columns=ren)
        missing = [c for c in SOURCE_COLS if c not in df.columns]
        if missing:
            sys.exit(f"ERROR: {p.name} is missing columns: {missing}")
        frames.append(df[SOURCE_COLS])
        print(f"  loaded {p.name}: {len(df):,} rows")
    return pd.concat(frames, ignore_index=True)

def clean(df):
    df = df.copy()
    for c in ["Issue Date", "Period From", "Period To", "Approval Date"]:
        df[c] = pd.to_datetime(df[c], errors="coerce")
    df["Net Premium (GHS)"] = pd.to_numeric(df["Net Premium (GHS)"], errors="coerce")
    # Motor only
    df = df[df["Class"].astype(str).str.contains("Motor", case=False, na=False)]
    # need core dates + premium
    df = df.dropna(subset=["Period From", "Period To", "Net Premium (GHS)", "Policy No."])
    # drop Period To outliers (cover ending before it starts, or absurd spans)
    span = (df["Period To"] - df["Period From"]).dt.days
    df = df[(span >= 0) & (span <= 800)]
    # de-duplicate endorsements: keep latest by Approval/Issue date per Policy No.
    df["_ord"] = df["Approval Date"].fillna(df["Issue Date"]).fillna(df["Period From"])
    df = (df.sort_values("_ord").drop_duplicates("Policy No.", keep="last")
            .drop(columns="_ord").reset_index(drop=True))
    return df


# ------------------------------------------------------------------ DERIVE
def _strip_accents(s):
    return "".join(c for c in unicodedata.normalize("NFKD", str(s)) if not unicodedata.combining(c))

def derive(df):
    df = df.copy()
    # channel from the 2-letter customer-code prefix
    code = df["Cust. Name (Channel)"].astype(str).str.extract(r"^\s*([A-Za-z]{2})", expand=False)
    df["channel"] = code.str.upper().map(CHANNEL_BY_PREFIX).fillna("Unknown")
    # customer = normalized Insured Name + channel (the published composite key).
    # NOTE: the "Cust. Name (Channel)" code (e.g. AG00137) is the AGENT/channel id,
    # not the individual customer, so it must NOT be used as the customer key.
    norm_name = df["Insured Name"].map(lambda x: re.sub(r"\s+", " ", _strip_accents(x).upper().strip()))
    df["customer"] = norm_name + " | " + df["channel"]
    # agent code+name (for top-agents table)
    df["agentCode"] = df["Cust. Name (Channel)"].astype(str).str.extract(r"^\s*([A-Za-z]{2}\d+)", expand=False)
    df["agentName"] = (df["Cust. Name (Channel)"].astype(str)
                       .str.split(" - ", n=1).str[-1].str.strip())
    df["policyYear"]  = df["Period From"].dt.year
    df["tenureDays"]  = (df["Period To"] - df["Period From"]).dt.days + 1
    df["issueGap"]    = (df["Period From"] - df["Issue Date"]).dt.days
    df["premium"]     = df["Net Premium (GHS)"]
    df["branch"]      = df["Branch"].astype(str).str.strip()
    df["branchCode"]  = df["branch"].str.extract(r"^(\d+)", expand=False)
    df["product"]     = df["Product"].astype(str).str.strip()
    # acquisition cohort = first policy year per customer
    df["cohortYear"] = df.groupby("customer")["policyYear"].transform("min")
    return df

def mark_renewal(df, cutoff):
    """Observable + renewed/churned per the published 60-day grace methodology."""
    df = df.copy()
    obs_cut = cutoff - timedelta(days=GRACE_DAYS)
    df["observable"] = df["Period To"] <= obs_cut
    df["renewed"] = False
    # for each customer, a policy is renewed if the same customer has another
    # policy starting within [Period To - GRACE, Period To + GRACE]
    for _, g in df.groupby("customer"):
        starts = g["Period From"].values
        idx = g.index.values
        ends = g["Period To"].values
        for i, end in zip(idx, ends):
            lo = end - np.timedelta64(GRACE_DAYS, "D")
            hi = end + np.timedelta64(GRACE_DAYS, "D")
            mask = (starts >= lo) & (starts <= hi) & (idx != i)
            if mask.any():
                df.at[i, "renewed"] = True
    df["churned"] = df["observable"] & ~df["renewed"]
    return df


# ------------------------------------------------------------------ HELPERS
def r2(x):  return round(float(x), 2)
def scaffold(name):
    """Load the existing JSON so titles / header rows / findings are preserved."""
    p = DATA_DIR / name
    return json.load(open(p)) if p.exists() else {}

def retention_block(sub):
    obs = sub[sub["observable"]]
    ren = int(obs["renewed"].sum()); ch = int((~obs["renewed"]).sum())
    tot = ren + ch
    ret = r2(100 * ren / tot) if tot else 0.0
    return tot, ren, ch, ret, r2(100 - ret) if tot else 0.0


# ------------------------------------------------------------------ BUILDERS
def build_summary(df, full):
    obs = df[df["observable"]]
    ren = int(obs["renewed"].sum()); ch = int((~obs["renewed"]).sum())
    total = ren + ch
    ret = r2(100 * ren / total) if total else 0
    cust = df["customer"].nunique()
    ppc = r2(len(df) / cust) if cust else 0
    multi = df.groupby("customer").size()
    multi_pct = r2(100 * (multi > 1).sum() / cust) if cust else 0
    # ARPU per year = premium / customers that year
    def arpu(y):
        s = df[df["policyYear"] == y]
        c = s["customer"].nunique()
        return r2(s["premium"].sum() / c) if c else 0
    years = sorted(df["policyYear"].unique())
    y0, y1 = years[0], years[-1]
    sc = scaffold("summary.json")
    head = sc.get("headline", {})
    head.update({
        "retentionRate": ret, "churnRate": r2(100 - ret) if total else 0,
        "uniqueCustomers": int(cust), "totalNetPremium": r2(df["premium"].sum()),
        "totalNetPremiumM": r2(df["premium"].sum() / 1e6),
        "avgPoliciesPerCustomer": ppc, "multiPolicyPct": multi_pct,
        "observablePolicies": int(len(obs)), "uniquePolicies": int(len(df)),
        "arpu2020": arpu(2020) or head.get("arpu2020"),
        "arpu2024": arpu(y1),
        "arpuGrowthPct": r2(100 * (arpu(y1) / arpu(2020) - 1)) if arpu(2020) else head.get("arpuGrowthPct"),
    })
    sc["headline"] = head
    sc.setdefault("title", "Donewell Motor Insurance \u2014 Portfolio Summary")
    sc["period"] = f"{y0} \u2013 {y1}"
    return sc

def build_cohort(df):
    sc = scaffold("cohort-retention.json")
    sc.setdefault("title", "Cohort Retention \u2014 % of original cohort still active")
    sc.setdefault("xLabels", ["N (acq.)", "N+1", "N+2", "N+3", "N+4"])
    cohorts = sorted(c for c in df["cohortYear"].unique())
    # customers active in a given year = have a policy whose cover is live that year
    cust_years = df.groupby("customer")["policyYear"].apply(set)
    cohort_of = df.groupby("customer")["cohortYear"].first()
    rows = []
    max_year = df["policyYear"].max()
    for c in cohorts:
        members = cohort_of[cohort_of == c].index
        base = len(members)
        rec = {"cohort": int(c), "customersAtN": int(base)}
        for k in range(1, 5):
            yr = c + k
            if yr > max_year or base == 0:
                rec[f"n{k}"] = None
            else:
                active = sum(1 for m in members if yr in cust_years.get(m, ()))
                rec[f"n{k}"] = r2(100 * active / base)
        rec["n5"] = None
        rows.append(rec)
    sc["cohorts"] = rows
    return sc

def _table_with_header(sc, key, rows):
    """Prepend the original header-row object (first elem) if the scaffold had one."""
    orig = sc.get(key, [])
    if orig and isinstance(orig[0], dict) and any(isinstance(v, str) for v in orig[0].values()):
        return [orig[0]] + rows
    return rows

def build_channel(df):
    sc = scaffold("churn-by-channel.json")
    sc.setdefault("title", "Retention vs Churn by Distribution Channel")
    rows = []
    for chan, sub in df.groupby("channel"):
        tot, ren, ch, ret, churn = retention_block(sub)
        rows.append({"channel": chan, "totalPolicies": len(sub), "renewed": ren,
                     "churned": ch, "retentionPct": ret, "churnPct": churn})
    rows.sort(key=lambda r: r["totalPolicies"], reverse=True)
    sc["channels"] = _table_with_header(sc, "channels", rows)
    return sc

def build_product(df):
    sc = scaffold("churn-by-product.json")
    sc.setdefault("title", "Churn Rate by Motor Product")
    rows = []
    for prod, sub in df.groupby("product"):
        tot, ren, ch, ret, churn = retention_block(sub)
        rows.append({"product": prod, "totalPolicies": len(sub), "renewed": ren,
                     "churned": ch, "avgPremium": r2(sub["premium"].mean()),
                     "retentionPct": ret, "churnPct": churn})
    rows.sort(key=lambda r: r["retentionPct"], reverse=True)
    sc["products"] = _table_with_header(sc, "products", rows)
    return sc

def build_tier(df):
    sc = scaffold("churn-by-premium-tier.json")
    sc.setdefault("title", "Churn Rate by Premium Tier (GHS, Motor)")
    rows = []
    for lo, hi, lab in PREMIUM_TIERS:
        sub = df[(df["premium"] >= lo) & (df["premium"] < hi)]
        if not len(sub):
            continue
        tot, ren, ch, ret, churn = retention_block(sub)
        rows.append({"tier": lab, "totalPolicies": len(sub), "renewed": ren,
                     "churned": ch, "retentionPct": ret, "churnPct": churn})
    sc["tiers"] = _table_with_header(sc, "tiers", rows)
    return sc

def build_branch(df):
    sc = scaffold("churn-by-branch.json")
    sc.setdefault("title", "Retention by Branch (Motor)")
    rows = []
    for br, sub in df.groupby("branch"):
        if len(sub) < 100:
            continue
        tot, ren, ch, ret, churn = retention_block(sub)
        rows.append({"branch": re.sub(r"^\d+\s*-\s*", "", br), "code": sub["branchCode"].iloc[0] or "",
                     "totalPolicies": len(sub), "renewed": ren, "churned": ch,
                     "retentionPct": ret})
    rows.sort(key=lambda r: r["retentionPct"], reverse=True)
    sc["branches"] = rows
    return sc

def build_channel_mix(df):
    sc = scaffold("channel-mix.json")
    sc.setdefault("title", "Distribution Channel Mix Evolution")
    years = sorted(df["policyYear"].unique())
    channels = sorted(df["channel"].unique(), key=lambda c: -len(df[df["channel"] == c]))
    series = []
    for y in years:
        s = df[df["policyYear"] == y]
        n = len(s)
        row = {"year": int(y)}
        for c in channels:
            row[c] = r2(100 * len(s[s["channel"] == c]) / n) if n else 0
        series.append(row)
    sc["channels"] = channels      # FIX: real names (was null in the original export)
    sc["series"] = series
    return sc

def build_portfolio(df):
    sc = scaffold("product-portfolio.json")
    sc.setdefault("title", "Product Portfolio \u2014 Volume, Value & Retention")
    rows = []
    for prod, sub in df.groupby("product"):
        tot, ren, ch, ret, churn = retention_block(sub)
        rows.append({"product": prod, "policies": len(sub),
                     "customers": int(sub["customer"].nunique()),
                     "totalPremium": r2(sub["premium"].sum()),
                     "avgPremium": r2(sub["premium"].mean()),
                     "medianPremium": int(sub["premium"].median()),
                     "retentionPct": ret, "observablePolicies": int(sub["observable"].sum())})
    rows.sort(key=lambda r: r["totalPremium"], reverse=True)
    sc["products"] = rows
    return sc

def build_revenue(df):
    sc = scaffold("revenue-trend.json")
    sc.setdefault("title", "Revenue & ARPU Trend")
    rows = []
    seen = set()
    for y in sorted(df["policyYear"].unique()):
        s = df[df["policyYear"] == y]
        custs = set(s["customer"])
        new = custs - seen
        c = len(custs)
        rows.append({"year": int(y), "policies": len(s), "customers": c,
                     "newCustomers": len(new), "totalPremium": r2(s["premium"].sum()),
                     "totalPremiumM": r2(s["premium"].sum() / 1e6),
                     "grossMarginM": r2(s["premium"].sum() * MARGIN / 1e6),
                     "avgPremium": r2(s["premium"].mean()),
                     "medianPremium": int(s["premium"].median()),
                     "newCustomerPct": r2(100 * len(new) / c) if c else 0,
                     "arpu": r2(s["premium"].sum() / c) if c else 0})
        seen |= custs
    sc["years"] = rows
    return sc

def build_clv(df):
    sc = scaffold("clv.json")
    sc.setdefault("title", "Customer Lifetime Value")
    # CLV per customer = total premium contributed x margin
    cust = df.groupby("customer").agg(premium=("premium", "sum"),
                                      policies=("premium", "size"),
                                      tenure=("tenureDays", "sum"),
                                      channel=("channel", "first"),
                                      cohort=("cohortYear", "first"))
    cust["clv"] = cust["premium"] * MARGIN
    cust["tenureYears"] = cust["tenure"] / 365.0
    byChannel = []
    for chan, g in cust.groupby("channel"):
        byChannel.append({"channel": chan, "customers": int(len(g)),
                          "avgCLV": r2(g["clv"].mean()), "medianCLV": r2(g["clv"].median()),
                          "totalCLV": r2(g["clv"].sum()), "avgPolicies": r2(g["policies"].mean()),
                          "avgTenureYears": r2(g["tenureYears"].mean()),
                          "totalCLVm": r2(g["clv"].sum() / 1e6)})
    byChannel.sort(key=lambda r: r["avgCLV"], reverse=True)
    byCohort = []
    for co, g in cust.groupby("cohort"):
        byCohort.append({"cohort": int(co), "customers": int(len(g)),
                         "avgCLV": r2(g["clv"].mean()), "medianCLV": r2(g["clv"].median()),
                         "totalCLV": r2(g["clv"].sum()), "totalCLVm": r2(g["clv"].sum() / 1e6)})
    byCohort.sort(key=lambda r: r["cohort"])
    sc["byChannel"] = byChannel
    sc["byCohort"] = byCohort
    return sc

def _half(dt):
    return f"{dt.year}H{1 if dt.month <= 6 else 2}"

def build_covid(df):
    sc = scaffold("covid-impact.json")
    sc.setdefault("title", "COVID-19 Impact \u2014 Half-Yearly")
    df = df.copy()
    df["half"] = df["Period From"].apply(_half)
    seen = set()
    prem, ret = [], []
    for h in sorted(df["half"].unique()):
        s = df[df["half"] == h]
        custs = set(s["customer"]); new = custs - seen
        phase = COVID_PHASE.get(h, "Post-COVID")
        prem.append({"halfYear": h, "policies": len(s), "customers": len(custs),
                     "newCustomers": len(new), "totalPremium": r2(s["premium"].sum()),
                     "avgPremium": r2(s["premium"].mean()), "phase": phase,
                     "newCustomerPct": r2(100 * len(new) / len(custs)) if custs else 0})
        o = s[s["observable"]]
        rr = int(o["renewed"].sum()); tt = len(o)
        ret.append({"halfYear": h, "observablePolicies": tt, "renewed": rr,
                    "retentionPct": r2(100 * rr / tt) if tt else 0, "phase": phase})
        seen |= custs
    sc["premium"] = _table_with_header(sc, "premium", prem)
    sc["retention"] = _table_with_header(sc, "retention", ret)
    return sc

def build_signals(df):
    sc = scaffold("churn-signals.json")
    sc.setdefault("title", "Predictive Churn Signals")
    obs = df[df["observable"]].copy()
    # correlations (point-biserial) of numeric features with churn
    feats = {"Net Premium": "premium", "Tenure (days)": "tenureDays",
             "Issue gap (days)": "issueGap", "Our Share %": None}
    corr_rows = []
    churn = obs["churned"].astype(int)
    for label, col in feats.items():
        if col is None or col not in obs:
            continue
        x = pd.to_numeric(obs[col], errors="coerce")
        m = x.notna()
        if m.sum() < 2:
            continue
        c = np.corrcoef(x[m], churn[m])[0, 1]
        corr_rows.append({"feature": label, "correlation": r2(c),
                          "meanChurned": r2(x[obs["churned"]].mean()),
                          "meanRenewed": r2(x[obs["renewed"] & obs["observable"]].mean()),
                          "direction": "↑ churn" if c > 0 else "↓ churn"})
    corr_rows.sort(key=lambda r: abs(r["correlation"]), reverse=True)
    # issue-timing buckets
    timing = []
    for lo, hi, lab in TIMING_BUCKETS:
        sub = obs[(obs["issueGap"] >= lo) & (obs["issueGap"] <= hi)]
        if not len(sub):
            continue
        chn = int(sub["churned"].sum())
        timing.append({"timing": lab, "policies": len(sub), "churned": chn,
                       "churnPct": r2(100 * chn / len(sub))})
    # top agents (Agent channel, >=200 policies)
    ag = df[df["channel"] == "Agent"]
    rows = []
    for code, g in ag.groupby("agentCode"):
        if len(g) < 200:
            continue
        o = g[g["observable"]]; ren = int(o["renewed"].sum()); tot = len(o)
        rows.append({"code": code, "name": g["agentName"].mode().iloc[0] if len(g["agentName"].mode()) else "",
                     "policies": len(g), "renewed": ren, "totalPremium": r2(g["premium"].sum()),
                     "retentionPct": r2(100 * ren / tot) if tot else 0})
    rows.sort(key=lambda r: r["retentionPct"], reverse=True)
    sc["correlations"] = _table_with_header(sc, "correlations", corr_rows)
    sc["issueTiming"]  = _table_with_header(sc, "issueTiming", timing)
    sc["topAgents"]    = rows[:16]
    return sc


BUILDERS = {
    "summary.json": lambda d: build_summary(d, d),
    "cohort-retention.json": build_cohort,
    "churn-by-channel.json": build_channel,
    "churn-by-product.json": build_product,
    "churn-by-premium-tier.json": build_tier,
    "churn-by-branch.json": build_branch,
    "channel-mix.json": build_channel_mix,
    "product-portfolio.json": build_portfolio,
    "revenue-trend.json": build_revenue,
    "clv.json": build_clv,
    "covid-impact.json": build_covid,
    "churn-signals.json": build_signals,
}


def main():
    ap = argparse.ArgumentParser(description="Recompute dashboard data from raw motor transactions.")
    ap.add_argument("--inputs", nargs="+", required=True, help="raw .xlsx/.csv files (one per year, ALL years)")
    ap.add_argument("--out", default=str(DATA_DIR), help="output dir for JSON (default public/data)")
    ap.add_argument("--check", action="store_true", help="print headline metrics and exit without writing")
    args = ap.parse_args()

    print("Loading raw data ...")
    df = load_inputs(args.inputs)
    print(f"Total rows: {len(df):,}")
    df = clean(df)
    print(f"After cleaning + de-duplication: {len(df):,} unique policies")
    df = derive(df)
    cutoff = DATA_CUTOFF or df["Period To"].max()
    print(f"Observation cut-off: {pd.Timestamp(cutoff).date()}  (grace {GRACE_DAYS}d)")
    df = mark_renewal(df, pd.Timestamp(cutoff))

    obs = df[df["observable"]]
    ret = 100 * obs["renewed"].sum() / len(obs) if len(obs) else 0
    print("\n--- HEADLINE CHECK ---")
    print(f"  Unique policies      : {len(df):,}")
    print(f"  Unique customers     : {df['customer'].nunique():,}")
    print(f"  Observable policies  : {len(obs):,}")
    print(f"  Overall retention    : {ret:.2f}%   (published target: 40.07%)")
    print(f"  Total net premium    : GHS {df['premium'].sum()/1e6:,.1f}M  (target: 194.0M)")
    if args.check:
        print("\n--check: not writing files.")
        return

    outdir = Path(args.out); outdir.mkdir(parents=True, exist_ok=True)
    print(f"\nWriting JSON to {outdir} ...")
    for name, fn in BUILDERS.items():
        obj = fn(df)
        with open(outdir / name, "w") as f:
            json.dump(obj, f, indent=1, ensure_ascii=False)
        print(f"  wrote {name}")
    print("\nDone. Review the 'finding' sentences, then commit public/data/ and push to main.")


if __name__ == "__main__":
    main()
