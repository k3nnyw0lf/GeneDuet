# GeneDuet 🧬

**Privacy-first, 100% in-browser DNA reader.** Drop your raw genotyping file
(AncestryDNA / 23andMe / MyHeritage / FamilyTreeDNA) and read it — locally. Your DNA
never leaves your device: there's no server, no upload, and the page's Content-Security-Policy
blocks all network access except, optionally, your own local AI.

> ⚠️ **Educational only — not a medical device and not a legal paternity test.** Consumer
> arrays miss rare variants; some markers are flagged as not reliably callable. Confirm
> anything important with a clinician or genetic counselor.

## What it does

- **Per-person report** across 7 categories — physical traits, taste & diet, wellness &
  fitness, nutrition, carrier status, health predisposition, and pharmacogenomics.
- **Offspring prediction** — a couple's hypothetical child's trait/odds, incl. recessive
  disease risk and a ~50/50 boy/girl note.
- **Relationship / paternity check** — IBS0 + KING kinship (parent–child vs sibling vs unrelated).
- **Genetic sex** — from X-heterozygosity + Y calls (>99% confidence).
- **Polygenic scores** (CLI) — height, BMI, cognition, T2D, plus a disease-risk panel, with
  real population percentiles from 1000-Genomes frequencies.
- **Coarse ancestry** (CLI) — supervised admixture over ancestry-informative markers.
- **Free local-AI chat** — ask questions in plain language; answered by your own **Ollama**
  (llama3.2) on-device, grounded in your report. Includes honest diet / muscle / allergy guidance.
- **Bilingual** — full English / Español toggle.

### Honesty by design

GeneDuet refuses to fake what DNA can't do: **palindromic SNPs** are flagged not callable
(no false sickle-cell alarms); **myths** (tongue rolling, widow's peak, finger length, IQ
numbers, full appearance) are explicitly excluded; **sensitive** results (APOE, BRCA,
Parkinson's) are gated and hidden for minors; gene-matched diets and DNA allergy prediction
are called out as unproven.

## Run it

It's a static app plus zero-dependency Node CLI tools.

```bash
# Web app (serve the repo root, then open /web/index.html):
node tools/serve.mjs        # → http://localhost:8099/web/index.html

# CLI full report (put raw files in private/, which is gitignored):
node tools/predict.mjs private/dad.txt private/mom.txt private/son.txt --sensitive
node tools/relationship.mjs private/a.txt private/b.txt private/child.txt
node tools/sex.mjs private/a.txt
node tools/pgs.mjs            # polygenic scores + disease panel
node tools/ancestry.mjs private/a.txt private/b.txt
```

**Local AI chat** needs [Ollama](https://ollama.com): `ollama run llama3.2`. Everything stays
on your machine (the app only ever talks to `localhost:11434`).

## Privacy

- Real DNA, downloaded reference data, and generated reports live in `private/` — **gitignored,
  never committed**.
- The web app's CSP allows no network except local Ollama for the optional chat.

## License

[MIT](LICENSE) © 2026 Kenneth Wolf
