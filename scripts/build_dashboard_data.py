#!/usr/bin/env python3
"""
build_dashboard_data.py  — Donewell motor retention pipeline (calibrated)
=========================================================================
Reads raw "Premium Register" (PGIBR005) exports — one file per year — and
recomputes every dashboard dataset in public/data/, including the renewal-timing
breakdown (on-time vs. "took a bit longer to renew" vs. churned).

    python scripts/build_dashboard_data.py --inputs 2020.xls 2021.xls ... 2024.xlsx
    python scripts/build_dashboard_data.py --inputs *.xlsx --check   # headline only

CALIBRATION (reproduces the published 2020-2024 figures to within ~1%):
  - premium            = "Our Share Net Premium" column
  - customer key       = normalized Insured Name + channel
  - latest endorsement = kept per Policy No.
  - renewal            = the customer's NEXT policy starts with a gap to this
                         policy's expiry within [RENEWAL_GAP_MIN, RENEWAL_GAP_MAX]
                         days (early renewals allowed, up to 60 days late)
  - observable         = Period To <= data_end - RENEWAL_GAP_MAX
Verified: retention 40.0% (pub 40.07%), observable 252.6k (pub 251.5k),
premium GHS 196.8M (pub 194.3M), policies 312.2k (pub 310.7k).
"""
import argparse, json, re, sys, warnings
from pathlib import Path
import pandas as pd, numpy as np
warnings.filterwarnings("ignore")

# ----------------------------------------------------------------- CONSTANTS
RENEWAL_GAP_MIN = -45     # next policy may start up to 45 days before expiry
RENEWAL_GAP_MAX = 60      # ... through 60 days after expiry  (the "60-day rule")
LONGER_GAP_MAX  = 120     # "took a bit longer to renew" = (60, 120] days after
MARGIN          = 0.25    # CLV gross-margin assumption (NIC benchmark)
START_YEAR      = 2020    # first year of the analysis window

PREMIUM_TIERS  = [(-1e18,0,"<0 (refund)"),(0,100,"0-100"),(100,300,"100-300"),
                  (300,600,"300-600"),(600,1500,"600-1500"),(1500,1e18,"1500+")]
TIMING_BUCKETS = [(-1e18,0,"Late (\u22640d)"),(1,7,"Last-minute (1-7d)"),
                  (8,30,"Normal (8-30d)"),(31,1e18,"Early (>30d)")]
CHAN_BY_PREFIX = {"AG":"Agent","BO":"Branch Office","BR":"Broker","DI":"Direct / Walk-in",
                  "DM":"Digital Marketing","ME":"Microinsurance",
                  "RI":"Reinsurance / Co-insurance","SC":"Strategic Channel"}
COVID_PHASE = {"2020H1":"Pre-COVID (Jan-Jun 2020)","2020H2":"COVID Onset (Jul-Dec 2020)",
   "2021H1":"COVID Mid (Jan-Jun 2021)","2021H2":"Recovery (Jul-Dec 2021)",
   "2022H1":"Post-COVID (Jan-Jun 2022)","2022H2":"Post-COVID (Jul-Dec 2022)",
   "2023H1":"Post-COVID (Jan-Jun 2023)","2023H2":"Post-COVID (Jul-Dec 2023)",
   "2024H1":"Post-COVID (Jan-Jun 2024)","2024H2":"Post-COVID (Jul-Dec 2024)",
   "2025H1":"2025 (Jan-Jun)","2025H2":"2025 (Jul-Dec)"}

# raw register column index -> internal name (PGIBR005 layout)
REG_COLMAP = {0:"Branch",2:"Class",3:"Product",4:"Policy No.",5:"Endorsement No.",
   6:"Insured Name",7:"Cust. Name (Channel)",8:"Issue Date",9:"Endt. Date",
   10:"Period From",11:"Period To",12:"Approval Date",14:"Our Share %",
   24:"Net Premium 100%",25:"premium",30:"Broker/Agent Name"}

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "public" / "data"


# ------------------------------------------------------------------- LOAD
def _find_header(df):
    for i in range(min(60, len(df))):
        row = [str(v).strip() for v in df.iloc[i].tolist()]
        if "Policy No." in row and "Period From" in row:
            return i
    return None

def load_inputs(paths):
    frames = []
    for p in paths:
        raw = pd.read_excel(p, sheet_name=0, engine="openpyxl", header=None, dtype=str)
        h = _find_header(raw)
        if h is None:
            sys.exit(f"ERROR: could not find a 'Policy No.' header row in {Path(p).name}")
        body = raw.iloc[h+1:].reset_index(drop=True)
        ncol = body.shape[1]
        df = pd.DataFrame({name: body.iloc[:, idx] for idx, name in REG_COLMAP.items() if idx < ncol})
        df = df[df["Class"].astype(str).str.contains("Motor", na=False)]
        df = df[df["Policy No."].astype(str).str.match(r"\s*P/", na=False)]
        frames.append(df)
        print(f"  {Path(p).name}: {len(df):,} motor rows")
    return pd.concat(frames, ignore_index=True)


# ------------------------------------------------------------------- CLEAN + DERIVE
def prepare(df):
    for c in ["Issue Date","Endt. Date","Period From","Period To","Approval Date"]:
        df[c] = pd.to_datetime(df[c], dayfirst=True, errors="coerce")
    for c in ["premium","Net Premium 100%","Our Share %"]:
        df[c] = pd.to_numeric(df[c].astype(str).str.replace(",","",regex=False), errors="coerce")
    df = df.dropna(subset=["Period From","Period To","Policy No."])
    span = (df["Period To"] - df["Period From"]).dt.days
    df = df[(span >= 0) & (span <= 800)]
    # restrict to the analysis window: START_YEAR .. last full data year.
    # Drops a handful of stray pre-2020 rows and post-period spillover; when a
    # new year (e.g. 2025) is added, its issue dates extend the window automatically.
    last_year = int(df["Issue Date"].dropna().dt.year.max())
    py = df["Period From"].dt.year
    df = df[(py >= START_YEAR) & (py <= last_year)]
    # keep latest endorsement per policy
    df["_ord"] = df["Endt. Date"].fillna(df["Approval Date"]).fillna(df["Period From"])
    df = df.sort_values("_ord").drop_duplicates("Policy No.", keep="last").reset_index(drop=True)
    df["premium"] = df["premium"].fillna(0)
    # channel + customer key
    pref = df["Cust. Name (Channel)"].astype(str).str.extract(r"^\s*([A-Za-z]{2})", expand=False)
    df["channel"] = pref.str.upper().map(CHAN_BY_PREFIX).fillna("Unknown")
    df["customer"] = df["Insured Name"].astype(str).str.strip().str.upper() + " | " + df["channel"]
    df["agentCode"] = df["Cust. Name (Channel)"].astype(str).str.extract(r"^\s*([A-Za-z]{2}\d+)", expand=False)
    df["agentName"] = df["Cust. Name (Channel)"].astype(str).str.split(" - ", n=1).str[-1].str.strip()
    df["product"] = df["Product"].astype(str).str.strip()
    df["branch"]  = df["Branch"].astype(str).str.strip()
    df["branchCode"] = df["branch"].str.extract(r"^(\d+)", expand=False)
    df["policyYear"] = df["Period From"].dt.year
    df["tenureDays"] = (df["Period To"] - df["Period From"]).dt.days + 1
    df["issueGap"]   = (df["Period From"] - df["Issue Date"]).dt.days
    df["cohortYear"] = df.groupby("customer")["policyYear"].transform("min")
    return df

def mark_renewal(df, data_end):
    """Next-policy gap method. Adds: gapToNext, observable, renewed, longer, churned."""
    df = df.sort_values(["customer","Period From"]).reset_index(drop=True)
    nxt = df.groupby("customer")["Period From"].shift(-1)
    df["gapToNext"] = (nxt - df["Period To"]).dt.days
    obs_cut = pd.Timestamp(data_end) - pd.Timedelta(days=RENEWAL_GAP_MAX)
    df["observable"] = df["Period To"] <= obs_cut
    df["renewed"] = df["gapToNext"].between(RENEWAL_GAP_MIN, RENEWAL_GAP_MAX) & df["observable"]
    # 120-day extended observation for the "took a bit longer" bucket
    obs_cut_long = pd.Timestamp(data_end) - pd.Timedelta(days=LONGER_GAP_MAX)
    df["observableLong"] = df["Period To"] <= obs_cut_long
    df["longer"]  = df["gapToNext"].between(RENEWAL_GAP_MAX + 1, LONGER_GAP_MAX) & df["observableLong"]
    df["churned"] = df["observable"] & ~df["renewed"]
    return df


# ------------------------------------------------------------------- HELPERS
def r2(x): return round(float(x), 2)
def scaffold(name):
    p = DATA_DIR / name
    return json.load(open(p)) if p.exists() else {}
def header_of(sc, key):
    arr = sc.get(key, [])
    if arr and isinstance(arr[0], dict) and any(isinstance(v, str) for v in arr[0].values()):
        return [arr[0]]
    return []
def block(sub):
    obs = sub[sub["observable"]]
    ren = int(obs["renewed"].sum()); tot = int(len(obs)); ch = tot - ren
    ret = r2(100*ren/tot) if tot else 0.0
    return tot, ren, ch, ret, r2(100-ret) if tot else 0.0


# ------------------------------------------------------------------- BUILDERS
def b_summary(df):
    sc = scaffold("summary.json"); head = sc.get("headline", {})
    obs = df[df["observable"]]; ren = int(obs["renewed"].sum()); total = len(obs)
    cust = df["customer"].nunique()
    def arpu(y):
        s = df[df["policyYear"]==y]; c = s["customer"].nunique()
        return r2(s["premium"].sum()/c) if c else 0
    yrs = sorted(df["policyYear"].unique()); y1 = yrs[-1]
    multi = df.groupby("customer").size()
    head.update({"retentionRate":r2(100*ren/total) if total else 0,
        "churnRate":r2(100-100*ren/total) if total else 0,
        "uniqueCustomers":int(cust),"totalNetPremium":r2(df["premium"].sum()),
        "totalNetPremiumM":r2(df["premium"].sum()/1e6),
        "avgPoliciesPerCustomer":r2(len(df)/cust) if cust else 0,
        "multiPolicyPct":r2(100*(multi>1).sum()/cust) if cust else 0,
        "observablePolicies":int(total),"uniquePolicies":int(len(df)),
        "arpu2020":arpu(2020) or head.get("arpu2020"),"arpu2024":arpu(2024) or arpu(y1),
        "arpuGrowthPct":r2(100*(arpu(2024)/arpu(2020)-1)) if arpu(2020) else head.get("arpuGrowthPct")})
    sc["headline"] = head
    sc["period"] = f"{yrs[0]} \u2013 {y1}"
    sc.setdefault("title","Donewell Motor Insurance \u2014 Portfolio Summary")
    return sc

def b_cohort(df):
    sc = scaffold("cohort-retention.json")
    sc.setdefault("title","Cohort Retention \u2014 % of original cohort still active")
    sc.setdefault("xLabels",["N (acq.)","N+1","N+2","N+3","N+4"])
    cust_years = df.groupby("customer")["policyYear"].apply(set)
    cohort_of  = df.groupby("customer")["cohortYear"].first()
    maxy = df["policyYear"].max(); rows=[]
    for c in sorted(df["cohortYear"].unique()):
        members = cohort_of[cohort_of==c].index; base=len(members)
        rec={"cohort":int(c),"customersAtN":int(base)}
        for k in range(1,5):
            yr=c+k
            rec[f"n{k}"] = None if (yr>maxy or not base) else r2(100*sum(yr in cust_years.get(m,()) for m in members)/base)
        rec["n5"]=None; rows.append(rec)
    sc["cohorts"]=rows; return sc

def b_channel(df):
    sc=scaffold("churn-by-channel.json"); sc.setdefault("title","Retention vs Churn by Distribution Channel")
    rows=[]
    for ch,sub in df.groupby("channel"):
        t,r,c,ret,churn=block(sub)
        rows.append({"channel":ch,"totalPolicies":len(sub),"renewed":r,"churned":c,"retentionPct":ret,"churnPct":churn})
    rows.sort(key=lambda x:x["totalPolicies"],reverse=True)
    sc["channels"]=header_of(sc,"channels")+rows; return sc

def b_product(df):
    sc=scaffold("churn-by-product.json"); sc.setdefault("title","Churn Rate by Motor Product")
    rows=[]
    for p,sub in df.groupby("product"):
        t,r,c,ret,churn=block(sub)
        rows.append({"product":p,"totalPolicies":len(sub),"renewed":r,"churned":c,"avgPremium":r2(sub["premium"].mean()),"retentionPct":ret,"churnPct":churn})
    rows.sort(key=lambda x:x["retentionPct"],reverse=True)
    sc["products"]=header_of(sc,"products")+rows; return sc

def b_tier(df):
    sc=scaffold("churn-by-premium-tier.json"); sc.setdefault("title","Churn Rate by Premium Tier (GHS, Motor)")
    rows=[]
    for lo,hi,lab in PREMIUM_TIERS:
        sub=df[(df["premium"]>=lo)&(df["premium"]<hi)]
        if not len(sub): continue
        t,r,c,ret,churn=block(sub)
        rows.append({"tier":lab,"totalPolicies":len(sub),"renewed":r,"churned":c,"retentionPct":ret,"churnPct":churn})
    sc["tiers"]=header_of(sc,"tiers")+rows; return sc

def b_branch(df):
    sc=scaffold("churn-by-branch.json"); sc.setdefault("title","Retention by Branch (Motor)")
    rows=[]
    for br,sub in df.groupby("branch"):
        if len(sub)<100: continue
        t,r,c,ret,churn=block(sub)
        rows.append({"branch":re.sub(r"^\d+\s*-\s*","",br),"code":sub["branchCode"].iloc[0] or "","totalPolicies":len(sub),"renewed":r,"churned":c,"retentionPct":ret})
    rows.sort(key=lambda x:x["retentionPct"],reverse=True)
    sc["branches"]=rows; return sc

def b_mix(df):
    sc=scaffold("channel-mix.json"); sc.setdefault("title","Distribution Channel Mix Evolution")
    years=sorted(df["policyYear"].unique())
    last=df[df["policyYear"]==years[-1]]
    chans=sorted(df["channel"].unique(), key=lambda c:-(len(last[last["channel"]==c])))
    series=[]
    for y in years:
        s=df[df["policyYear"]==y]; n=len(s); row={"year":int(y)}
        for c in chans: row[c]=r2(100*len(s[s["channel"]==c])/n) if n else 0
        series.append(row)
    sc["channels"]=chans; sc["series"]=series; return sc

def b_portfolio(df):
    sc=scaffold("product-portfolio.json"); sc.setdefault("title","Product Portfolio \u2014 Volume, Value & Retention")
    rows=[]
    for p,sub in df.groupby("product"):
        t,r,c,ret,churn=block(sub)
        rows.append({"product":p,"policies":len(sub),"customers":int(sub["customer"].nunique()),
            "totalPremium":r2(sub["premium"].sum()),"avgPremium":r2(sub["premium"].mean()),
            "medianPremium":int(sub["premium"].median()),"retentionPct":ret,"observablePolicies":int(sub["observable"].sum())})
    rows.sort(key=lambda x:x["totalPremium"],reverse=True)
    sc["products"]=rows; return sc

def b_revenue(df):
    sc=scaffold("revenue-trend.json"); sc.setdefault("title","Revenue & ARPU Trend")
    rows=[]; seen=set()
    for y in sorted(df["policyYear"].unique()):
        s=df[df["policyYear"]==y]; custs=set(s["customer"]); new=custs-seen; c=len(custs)
        rows.append({"year":int(y),"policies":len(s),"customers":c,"newCustomers":len(new),
            "totalPremium":r2(s["premium"].sum()),"totalPremiumM":r2(s["premium"].sum()/1e6),
            "grossMarginM":r2(s["premium"].sum()*MARGIN/1e6),"avgPremium":r2(s["premium"].mean()),
            "medianPremium":int(s["premium"].median()),
            "newCustomerPct":r2(100*len(new)/c) if c else 0,"arpu":r2(s["premium"].sum()/c) if c else 0})
        seen|=custs
    sc["years"]=rows; return sc

def b_clv(df):
    sc=scaffold("clv.json"); sc.setdefault("title","Customer Lifetime Value")
    cust=df.groupby("customer").agg(premium=("premium","sum"),policies=("premium","size"),
        tenure=("tenureDays","sum"),channel=("channel","first"),cohort=("cohortYear","first"))
    cust["clv"]=cust["premium"]*MARGIN; cust["ty"]=cust["tenure"]/365.0
    bc=[]
    for ch,g in cust.groupby("channel"):
        bc.append({"channel":ch,"customers":int(len(g)),"avgCLV":r2(g["clv"].mean()),"medianCLV":r2(g["clv"].median()),
            "totalCLV":r2(g["clv"].sum()),"avgPolicies":r2(g["policies"].mean()),"avgTenureYears":r2(g["ty"].mean()),"totalCLVm":r2(g["clv"].sum()/1e6)})
    bc.sort(key=lambda x:x["avgCLV"],reverse=True)
    bco=[]
    for co,g in cust.groupby("cohort"):
        bco.append({"cohort":int(co),"customers":int(len(g)),"avgCLV":r2(g["clv"].mean()),"medianCLV":r2(g["clv"].median()),
            "totalCLV":r2(g["clv"].sum()),"totalCLVm":r2(g["clv"].sum()/1e6)})
    bco.sort(key=lambda x:x["cohort"])
    sc["byChannel"]=bc; sc["byCohort"]=bco; return sc

def _half(dt): return f"{dt.year}H{1 if dt.month<=6 else 2}"
def b_covid(df):
    sc=scaffold("covid-impact.json"); sc.setdefault("title","COVID-19 Impact \u2014 Half-Yearly")
    d=df.copy(); d["half"]=d["Period From"].apply(_half); seen=set(); prem=[]; ret=[]
    for h in sorted(d["half"].unique()):
        s=d[d["half"]==h]; custs=set(s["customer"]); new=custs-seen; phase=COVID_PHASE.get(h,"Post-COVID")
        prem.append({"halfYear":h,"policies":len(s),"customers":len(custs),"newCustomers":len(new),
            "totalPremium":r2(s["premium"].sum()),"avgPremium":r2(s["premium"].mean()),"phase":phase,
            "newCustomerPct":r2(100*len(new)/len(custs)) if custs else 0})
        o=s[s["observable"]]; rr=int(o["renewed"].sum()); tt=len(o)
        ret.append({"halfYear":h,"observablePolicies":tt,"renewed":rr,"retentionPct":r2(100*rr/tt) if tt else 0,"phase":phase})
        seen|=custs
    sc["premium"]=header_of(sc,"premium")+prem; sc["retention"]=header_of(sc,"retention")+ret; return sc

def b_signals(df):
    sc=scaffold("churn-signals.json"); sc.setdefault("title","Predictive Churn Signals")
    obs=df[df["observable"]].copy(); churn=obs["churned"].astype(int)
    corr=[]
    for label,col in {"Net Premium":"premium","Tenure (days)":"tenureDays","Issue gap (days)":"issueGap"}.items():
        x=pd.to_numeric(obs[col],errors="coerce"); m=x.notna()
        if m.sum()<2: continue
        c=np.corrcoef(x[m],churn[m])[0,1]
        corr.append({"feature":label,"correlation":r2(c),"meanChurned":r2(x[obs["churned"]].mean()),
            "meanRenewed":r2(x[obs["renewed"]].mean()),"direction":"\u2191 churn" if c>0 else "\u2193 churn"})
    corr.sort(key=lambda x:abs(x["correlation"]),reverse=True)
    timing=[]
    for lo,hi,lab in TIMING_BUCKETS:
        sub=obs[(obs["issueGap"]>=lo)&(obs["issueGap"]<=hi)]
        if not len(sub): continue
        chn=int(sub["churned"].sum())
        timing.append({"timing":lab,"policies":len(sub),"churned":chn,"churnPct":r2(100*chn/len(sub))})
    ag=df[df["channel"]=="Agent"]; rows=[]
    for code,g in ag.groupby("agentCode"):
        if len(g)<200: continue
        o=g[g["observable"]]; ren=int(o["renewed"].sum()); tot=len(o)
        nm = g["agentName"].mode().iloc[0] if len(g["agentName"].mode()) else ""
        rows.append({"code":code,"name":nm,"policies":len(g),"renewed":ren,"totalPremium":r2(g["premium"].sum()),"retentionPct":r2(100*ren/tot) if tot else 0})
    rows.sort(key=lambda x:x["retentionPct"],reverse=True)
    sc["correlations"]=header_of(sc,"correlations")+corr
    sc["issueTiming"]=header_of(sc,"issueTiming")+timing
    sc["topAgents"]=rows[:16]; return sc

def b_renewal_timing(df):
    """NEW: on-time vs 'took a bit longer to renew' (61-120d) vs churned, with
    both the 60-day and 120-day retention rates — overall, by channel, by cohort."""
    def split(sub):
        o=sub[sub["observable"]]; ol=sub[sub["observableLong"]]
        onTime=int(o["renewed"].sum()); base=len(o)
        longer=int(ol["longer"].sum()); baseLong=len(ol)
        churn60=base-onTime
        churn120=baseLong-int(ol["renewed"].sum())-longer
        return {"observable60":base,"observable120":baseLong,
            "onTime":onTime,"tookLonger":longer,
            "churned60":churn60,"churned120":max(churn120,0),
            "retention60":r2(100*onTime/base) if base else 0,
            "retention120":r2(100*(int(ol["renewed"].sum())+longer)/baseLong) if baseLong else 0}
    overall=split(df)
    byChannel=[{**split(sub),"channel":ch} for ch,sub in df.groupby("channel")]
    byChannel.sort(key=lambda x:-x["observable60"])
    byCohort=[{**split(sub),"cohort":int(co)} for co,sub in df.groupby("cohortYear")]
    byCohort.sort(key=lambda x:x["cohort"])
    return {"title":"Renewal Timing \u2014 on-time vs. late returners (120-day view)",
        "windowNote":(f"On-time = next policy within {RENEWAL_GAP_MAX} days of expiry (the current rule). "
                      f"Took a bit longer = {RENEWAL_GAP_MAX+1}\u2013{LONGER_GAP_MAX} days after expiry. "
                      f"Churned = no renewal within {LONGER_GAP_MAX} days."),
        "overall":overall,"byChannel":byChannel,"byCohort":byCohort,
        "finding":(f"Of customers counted as churned under the {RENEWAL_GAP_MAX}-day rule, "
                   f"{overall['tookLonger']:,} actually came back within {RENEWAL_GAP_MAX+1}\u2013{LONGER_GAP_MAX} days. "
                   f"Counting them as retained lifts overall retention from "
                   f"{overall['retention60']}% to {overall['retention120']}%.")}

BUILDERS = {"summary.json":b_summary,"cohort-retention.json":b_cohort,"churn-by-channel.json":b_channel,
   "churn-by-product.json":b_product,"churn-by-premium-tier.json":b_tier,"churn-by-branch.json":b_branch,
   "channel-mix.json":b_mix,"product-portfolio.json":b_portfolio,"revenue-trend.json":b_revenue,
   "clv.json":b_clv,"covid-impact.json":b_covid,"churn-signals.json":b_signals,
   "renewal-timing.json":b_renewal_timing}


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--inputs",nargs="+",required=True)
    ap.add_argument("--out",default=str(DATA_DIR))
    ap.add_argument("--check",action="store_true")
    a=ap.parse_args()
    print("Loading register reports ...")
    df=load_inputs(a.inputs)
    print(f"Total motor rows: {len(df):,}")
    df=prepare(df)
    data_end=df["Issue Date"].max()
    if pd.isna(data_end): data_end=df["Period From"].max()
    print(f"Unique policies: {len(df):,} | data end: {pd.Timestamp(data_end).date()}")
    df=mark_renewal(df,data_end)
    obs=df[df["observable"]]; ret=100*obs["renewed"].sum()/len(obs) if len(obs) else 0
    print("\n--- HEADLINE ---")
    print(f"  customers   : {df['customer'].nunique():,}")
    print(f"  observable  : {len(obs):,}")
    print(f"  retention   : {ret:.2f}%")
    print(f"  premium     : GHS {df['premium'].sum()/1e6:,.1f}M")
    print(f"  took-longer : {int(df['longer'].sum()):,} policies returned {RENEWAL_GAP_MAX+1}-{LONGER_GAP_MAX}d after expiry")
    if a.check: return
    out=Path(a.out); out.mkdir(parents=True,exist_ok=True)
    print(f"\nWriting JSON -> {out}")
    for name,fn in BUILDERS.items():
        json.dump(fn(df), open(out/name,"w"), indent=1, ensure_ascii=False)
        print(f"  {name}")
    print("\nDone.")

if __name__=="__main__":
    main()
