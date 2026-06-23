# Donewell Motor Retention Dashboard

An internal, single-page analytics dashboard presenting Donewell Insurance's
5-year motor retention analysis (2020–2024). Built with Next.js (static export),
TypeScript, Tailwind CSS, and Recharts. It ships as fully static HTML/JS/CSS and
is designed to be hosted on **GitHub Pages** for internal company use.

The dashboard threads 14 views — from a headline KPI board through cohort,
channel, product, premium-tier, branch, CLV, COVID, and churn-signal analysis —
into a single narrative, and bundles the underlying Excel workbook and Word
report as downloads.

---

## Tech stack

| Layer        | Choice                                  |
|--------------|-----------------------------------------|
| Framework    | Next.js 14 (App Router, `output: export`) |
| Language     | TypeScript (strict)                     |
| Styling      | Tailwind CSS 3                          |
| Charts       | Recharts 2                              |
| Hosting      | GitHub Pages (static)                   |
| CI/CD        | GitHub Actions                         |

There is **no server runtime** — the build produces a folder of static files.
All data is loaded client-side from JSON in `public/data/`.

---

## Quick start (local development)

Requires **Node.js 20+**.

```bash
npm install      # install dependencies
npm run dev      # start dev server at http://localhost:3000
```

### Production build / static export

```bash
npm run build    # generates the static site into ./out
npm run serve    # preview the exported ./out folder locally
```

The exported site lives entirely in `./out`. You can open it with any static
file server; `npm run serve` uses `npx serve` for convenience.

---

## Troubleshooting

**"Could not load the dashboard data (… → 404)" while the page itself is styled.**
This means the page loaded but its `data/*.json` files weren't found at the
served location. The app resolves data relative to its own URL, so this should
work whether the site is hosted at a domain root, at a GitHub Pages project
sub-path, or previewed locally. If you still see it:

- Make sure you are viewing the site over **http**, not by double-clicking the
  built `index.html` (a `file://` page can't fetch local JSON). Locally, use
  `npm run dev`, or `npm run serve` after `npm run build`.
- Confirm the `public/data/` folder was committed and pushed — the GitHub Action
  builds from the repo, so the 12 JSON files must be in version control.
- Confirm the deploy finished: repo **Actions** tab → the latest "Deploy" run is
  green, and **Settings → Pages → Source** is set to **GitHub Actions**.

## Deploying to GitHub Pages

Deployment is automated by the workflow at `.github/workflows/deploy.yml`. It
builds the static export and publishes it whenever you push to `main`.

**One-time setup:**

1. Create a GitHub repository and push this project to the `main` branch.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Push any commit to `main` (or run the workflow manually from the **Actions**
   tab via **Run workflow**).

The workflow injects the correct `basePath` automatically using the Pages
base path output, so the site works whether it is served from
`username.github.io` (root) or `username.github.io/repo-name/` (subpath). No
manual configuration is needed.

After the first successful run, the site URL appears under **Settings → Pages**.

### Why `.nojekyll`?

GitHub Pages runs Jekyll by default, which strips folders beginning with an
underscore — including Next.js's `_next/` asset directory. The empty
`public/.nojekyll` file disables Jekyll so assets resolve correctly. Do not
delete it.

---

## Project structure

```
donewell-retention-dashboard/
├── .github/workflows/deploy.yml   # GitHub Pages CI/CD
├── next.config.js                 # static export + basePath config
├── tailwind.config.ts             # brand palette (navy/gold/teal)
├── tsconfig.json
├── scripts/
│   ├── build_dashboard_data.py    # raw transactions -> the 12 JSON datasets
│   └── requirements.txt           # pandas / numpy / openpyxl
├── templates/
│   └── Donewell_Raw_Data_Template.xlsx   # populate this with a new year of data
├── public/
│   ├── .nojekyll                  # keep — disables Jekyll on Pages
│   ├── data/                      # 12 JSON datasets (the source of truth)
│   ├── charts/                    # 8 source chart PNGs
│   ├── linkedin/                  # 8 LinkedIn carousel slides
│   └── downloads/                 # Excel workbook + Word report
└── src/
    ├── app/
    │   ├── layout.tsx             # metadata (noindex — internal only)
    │   ├── page.tsx               # single-page entry: nav + view switch
    │   └── globals.css
    ├── lib/
    │   ├── asset.ts               # basePath-aware asset paths
    │   ├── format.ts              # number/currency formatters + colors
    │   └── types.ts               # TypeScript interfaces for all datasets
    └── components/dashboard/
        ├── ui.tsx                 # shared primitives (Card, StatTile, etc.)
        └── views/                 # 14 view components
```

---

## Updating the data

All numbers are read at runtime from the JSON files in `public/data/`. To
refresh the dashboard with new figures, edit the relevant JSON file (the shapes
are described by the interfaces in `src/lib/types.ts`) and rebuild. The chart
PNGs in `public/charts/` and the carousel slides in `public/linkedin/` are
static images — regenerate and replace them if the underlying analysis changes.

The raw analysis lives in the two files under `public/downloads/`:

- `Donewell_Retention_Analysis_2020-2024.xlsx` — 19-sheet workbook
- `Donewell_Retention_Analysis_Report.docx` — full written report

---

## Adding a new year of data (e.g. 2025)

The dashboard reads *derived* figures from `public/data/*.json`. Those are
recomputed from the raw **Premium Register (PGIBR005)** exports by
`scripts/build_dashboard_data.py` — the same yearly reports used for the
original 2020–2024 analysis. There is no live upload; refreshing the data means
regenerating the JSON files and pushing, after which GitHub Actions rebuilds.

**Important — retention is computed across years, not appended.** Adding 2025
does not bolt a row onto the existing numbers: it moves the renewal observation
window forward, so 2024's retention is revised (policies not yet observable at
the old cut-off become observable), a 2025 cohort appears, and the headline rate
shifts. You therefore recompute from the full history every time.

### Steps

1. **Export the new year's register.** From the core system, run the same
   Premium Register report (PGIBR005) for the new year, exporting the full motor
   book to `.xlsx` (the pipeline auto-detects the header row and the Motor rows).

2. **Install the pipeline's dependencies** (first time only):

   ```bash
   pip install -r scripts/requirements.txt
   ```

3. **Recompute over ALL years together:**

   ```bash
   python scripts/build_dashboard_data.py \
       --inputs 2020.xls 2021.xls 2022.xlsx 2023.xlsx 2024.xlsx 2025.xlsx
   ```

   This rewrites all 13 files in `public/data/` (including `renewal-timing.json`).

4. **Calibrate the first time.** Run on the original 2020–2024 files alone with
   `--check` and confirm the headline reproduces the published basis (overall
   retention ~40.0%, observable ~252k, premium ~GHS 196M):

   ```bash
   python scripts/build_dashboard_data.py --inputs 2020.xls ... 2024.xlsx --check
   ```

   The methodology is locked in the `CONSTANTS` block at the top of the script:
   `RENEWAL_GAP_MIN`/`RENEWAL_GAP_MAX` define the renewal window (a renewal
   counts if the customer's next policy starts between 45 days before and 60 days
   after expiry); `LONGER_GAP_MAX` (120) defines the "took a bit longer to renew"
   band; premium uses the *Our Share Net Premium* column; the customer key is
   normalized Insured Name + channel. Adjust these only if you intend to change
   the definition of retention itself.

5. **Publish.** Commit the changed `public/data/` files and push to `main`.

### A note on the figures

This pipeline reconstructs the original analysis methodology from the published
workbook and reproduces its headline numbers to within ~1% (retention, premium,
observable and policy counts all line up). Customer **count** runs a little
lower than the original (name-matching is inherently fuzzy — titles, spacing),
but this does not affect the retention rates, which calibrate exactly. Per-segment
figures (individual cohort or channel rates) may differ by a point or two from
the original for the same reason; they are internally consistent because every
segment uses the identical window.

### What if I don't have the original raw 2020–2024 files?

The pipeline needs every year's raw transactions because renewals are matched
across year boundaries — you can't recompute correctly from 2025 alone bolted
onto the pre-aggregated older numbers. If you only have 2025, ask whoever
produced the original analysis for the five source files (one per year), or for
the cleaned policy register behind the workbook in `public/downloads/`, then run
all years through the pipeline together.

## A note on `npm audit`

`npm audit` reports a high-severity advisory against Next.js. Those advisories
(image-optimizer DoS, request smuggling in rewrites, RSC request handling) all
target the **Next.js server runtime**. This project is a **pure static export**
— there is no Next.js server, no image optimizer (`images.unoptimized: true`),
and no rewrites at serve time — so those code paths never run in production.
The project pins the latest patched 14.2.x release and overrides bundled
`postcss` to a patched version. Moving to Next.js 16 to silence the audit is a
breaking change and is not required for a static deployment.

---

## License / use

Internal use only. The dashboard is marked `noindex` so it will not be indexed
by search engines, but **GitHub Pages on a public repository is publicly
reachable by URL**. If the data is sensitive, host this in a private repository
with GitHub Pages access restricted to your organization, or behind another
internal access control.
