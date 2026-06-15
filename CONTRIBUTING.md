# Contributing to GeneDuet

Thanks for your interest! GeneDuet is a privacy-first, client-side DNA interpreter.
A few principles keep it trustworthy — please read before contributing.

## Ground rules (non-negotiable)

- **Privacy:** never add anything that uploads or transmits raw DNA. The app parses
  locally; the only permitted network call is the optional local Ollama chat
  (`localhost:11434`). Keep the strict CSP in `web/index.html` intact.
- **Honesty over coverage:** never invent rsIDs or effect sizes. Every catalog entry
  must cite a real source (SNPedia / dbSNP / ClinVar / GWAS Catalog / PGS Catalog / CPIC).
  Mark confidence tiers honestly. Don't fake-predict things DNA can't do (appearance,
  IQ numbers, allergies, gene-matched diets) — add them to the `MYTHS` list instead.
- **Refuse the unreliable:** palindromic SNPs (A/T, C/G) stay flagged "not callable";
  sensitive/adult-onset results stay gated; minors' adult-onset stays hidden.
- **Not medical/legal:** keep the educational disclaimers.

## Dev setup

Zero dependencies — just Node ≥ 18.

```bash
npm test          # parity tests (tools/test-web.mjs)
npm run serve     # serve the app → http://localhost:8099/web/index.html
npm run demo      # regenerate the synthetic demo trio (tools/fixtures/demo_*.txt)
npm run report -- private/a.txt private/b.txt   # CLI report (put real files in private/, gitignored)
```

`data/catalog.mjs` is the single source of truth for both the CLI and the web app.

## Adding a trait/health marker

Add an entry to `data/catalog.mjs`:
`{ id, name, category, conf, rsid, alleles:[+strand pair], pheno:{<sortedGenotype>:{label:prob}}, heritable, carrier, sensitive, adultOnset, note }`.
Confirm the rsID **and risk-allele direction** against dbSNP/ClinVar first. Add Spanish
translations for the new `name` and phenotype labels to `data/i18n.js`. Run `npm test`.

## Pull requests

Keep changes focused, run `npm test`, and don't commit anything under `private/`.
