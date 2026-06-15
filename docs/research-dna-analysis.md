# DNA data analysis — research notes (2026-06-14)

Scoped to improving **GeneDuet** (privacy-first, in-browser consumer-DNA interpretation).

> **Provenance / trust:** The methods & competitive sections came from a deep-research
> fan-out (14 sources, 68 claims). Its automated adversarial-verification step was knocked
> out by transient API rate-limiting (all verifiers errored → "abstain"), so claims are
> **manually vetted**, not machine-verified. Items tagged **[primary]** are peer-reviewed /
> official and high-trust; **[blog]** are review sites (medium-trust). The market & regulation
> section came from a Gemini web-search synthesis (June 2026) — **figures approximate; verify
> specifics before quoting.**

## 1. Methods & accuracy — what would most improve GeneDuet

- **Genotype imputation is the biggest coverage lever.** impute.me's documented pipeline:
  phase with **SHAPEIT**, impute with **IMPUTE2** against **1000 Genomes Phase 3**, keep
  best-guess calls at **INFO ≥ 0.9**. Fills markers a vendor chip lacks and is *required*
  for scores to stay valid when mixing different vendors' arrays. **[primary]**
  *(frontiersin.org 10.3389/fgene.2020.00578; PMC7340159)*
  → Heavy (reference panel + phasing); impute.me runs it **server-side**. For GeneDuet this
  is an **optional CLI step**, not in-browser.
- **PRS → percentile via z-scoring against the matching 1000G super-population (mean 0,
  SD 1)** is the standard calibration — exactly what GeneDuet's `pgs-freqs.mjs` already does. **[primary]**
- **Cross-ancestry portability gap is large:** averaged over 14 phenotypes, PRS accuracy is
  ~**51% (South Asian), ~47% (East Asian), ~39% (African)** of European accuracy; GWAS is
  ~**78% European** (GWAS Catalog, Jan 2024). Driven by differences in causal variants, LD,
  allele frequency, effect sizes. → **Use an ancestry-matched reference and warn off-European.** **[primary]**
  *(PMC11367857)*
- **CYP2D6 cannot be called from arrays** — flanked by pseudogenes CYP2D7/8; even ensemble
  callers reach only ~95% on WGS, and hybrid alleles are largely missed. Confirms GeneDuet
  should **skip CYP2D6** and keep array-appropriate PGx (SLCO1B1, CYP2C19, VKORC1, CYP1A2). **[primary]**
  *(Nature s41525-020-0135-2; PMC7398905)*
- **`apriha/snps`** (open-source Python) — multi-vendor parser (Ancestry/23andMe/MyHeritage/
  FTDNA/+), **assembly auto-detect + GRCh36/37/38 liftover**, and **merge with discrepancy
  detection** (QC). Worth borrowing — GeneDuet lacks build liftover. **[primary]** *(github.com/apriha/snps)*
- **Imputation-quality caveat:** the Rsq metric **overestimates** true accuracy for
  under-represented ancestries (up to ~26× in marginal bins). **[primary]** *(academic.oup.com/bib bbad509)*

## 2. State of the art — reliable vs hype
Reinforced GeneDuet's stance. **Reliable:** Mendelian traits, carrier status, relationship/
kinship, broad ancestry, *array-appropriate* pharmacogenomics. **Limited:** PRS off-European.
**Not doable on arrays:** CYP2D6. (The "gene-diet / IQ / appearance" hype-debunk angle
returned thin this run — our existing DIETFITS / no-IQ-number / myth-exclusion stance stands.)

## 3. Competitive landscape
| Tool | Pricing | Method | Note |
|---|---|---|---|
| Promethease | $15/report (+$4/file) | SNPedia (ClinVar+PubMed) | magnitude/repute PDF **[blog]** |
| Genetic Genie | Free | ClinVar via "GenVue Discovery" | strong on MTHFR/methylation; **doesn't disclose client vs server** **[official+blog]** |
| Genomelink | Free 100 traits / ~$29 unlimited (≤500) | trait reports | heavy on "fun" traits **[blog]** |
| SelfDecode | Subscription | imputation + PRS + "DNA coach" | **[blog]** |
| Nebula | Subscription | WGS-focused | **[blog]** |

**Gap GeneDuet fills:** *verifiably* 100% client-side (competitors rarely disclose
architecture), **free + open-source + honest** (myth exclusion, palindromic refusal, real
percentiles), bilingual, with offspring + paternity + local-AI in one tool.

## 4. Market & regulation  *(Gemini synthesis, June 2026 — approximate)*
- **Market:** DTC genetic testing ≈ **$2.5B (2024)**, ~14–17% CAGR → ~$6.5B by 2030;
  third-party raw-data interpretation a smaller (~$1B) but growing (~12%/yr) niche.
- **GINA** protects **health insurance & employment** only — **excludes life, disability,
  and long-term-care insurance**, where DNA can be used in underwriting in most states.
- **HIPAA** generally **doesn't apply** to DTC / third-party tools (only within a clinical
  provider workflow); data is governed by Terms of Service + state privacy laws.
- **FDA** regulates genetic health-risk reports as **Class II devices** (analytical validity +
  user-comprehension requirements). **FTC** polices "unfair/deceptive" practices (data security, accuracy claims).
- **GDPR Art. 9** classifies genetic data as **special-category** — processing prohibited
  without explicit consent / narrow exception; member states may add stricter rules.
- **23andMe:** Oct-2023 credential-stuffing breach hit ~**6.9M** users (notably targeting
  Ashkenazi-Jewish and Chinese-descent data); filed **Chapter 11 in March 2025**; a coalition
  of state AGs moved to block selling DNA as an asset and urged users to delete their data.
  *(exact post-bankruptcy entity/settlement figures need verification)*

→ **For GeneDuet:** being **free, client-side, open-source, no data collection** sidesteps
most of the HIPAA/FTC/GDPR exposure that sank trust in server-side competitors — that's the
core privacy selling point. Add a clear "not a medical device / not insurance-protected
(GINA gaps)" note if health features expand.

## Roadmap items this points to
1. **Ancestry-matched PRS percentiles** + off-European accuracy warning — *implemented 2026-06-14.*
2. **Build liftover GRCh37↔38** (borrow from `apriha/snps`) — *future.*
3. **Optional imputation CLI step** (SHAPEIT/IMPUTE2 or Beagle + 1000G/HRC) — *future; heavy, not in-browser.*
4. Keep **avoiding CYP2D6**; positioning = "verifiably client-side + open-source + honest."
