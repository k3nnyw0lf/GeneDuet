# DNA knowledge base (for GeneDuet)

A curated map of the authoritative resources, methods, and research consumer-DNA
interpretation rests on. **Not exhaustive** — genetics changes constantly; verify current
facts at the primary sources below. This is the landscape GeneDuet draws from and where to
go to extend it correctly (never invent rsIDs or effect sizes).

## 1. What a consumer array actually is

AncestryDNA/23andMe/MyHeritage/FTDNA use **SNP genotyping microarrays** that read
~600k–700k pre-selected positions (GRCh37/hg19) — **not** whole-genome sequencing. Implications:
- No rare/novel/private variants; no full-gene reads (e.g. full BRCA), no CNVs/repeats.
- Some clinically important loci (HLA haplotypes, APOE rs429358 on Ancestry, CYP2D6) are
  poorly or not covered. ~0.1–1% per-genotype error → palindromic-SNP and IBS0 caveats.
- Strands differ by vendor; A/T and C/G ("palindromic") SNPs can't be strand-resolved
  from array data alone — GeneDuet refuses to call them.

## 2. Authoritative databases

| Resource | Provides | URL |
|---|---|---|
| **dbSNP** | canonical rsIDs, alleles, positions, MAF | ncbi.nlm.nih.gov/snp |
| **SNPedia** | SNP→phenotype write-ups, genotype meanings (community) | snpedia.com |
| **ClinVar** | clinical significance of variants (pathogenic/benign) | ncbi.nlm.nih.gov/clinvar |
| **ClinGen** | expert-curated gene–disease validity, dosage | clinicalgenome.org |
| **GWAS Catalog** | published trait–variant associations + effect sizes | ebi.ac.uk/gwas |
| **PGS Catalog** | published polygenic scores + harmonized scoring files + REST API | pgscatalog.org |
| **PharmGKB / CPIC** | gene–drug pharmacogenomics + dosing guidelines | pharmgkb.org · cpicpgx.org |
| **gnomAD** | population allele frequencies (large) | gnomad.broadinstitute.org |
| **1000 Genomes** | reference genotypes/frequencies by superpopulation | internationalgenome.org |
| **Ensembl REST** | per-SNP 1000G population frequencies (programmatic) | rest.ensembl.org |
| **OMIM** | Mendelian gene–phenotype catalog | omim.org |
| **PhyloTree / ISOGG** | mtDNA & Y haplogroup trees (defining mutations) | phylotree.org · isogg.org |
| **Allele Frequency Net** | HLA allele/haplotype frequencies | allelefrequencies.net |

## 3. Methods GeneDuet implements

- **Single-locus inheritance (Punnett):** each parent transmits one allele at 50%;
  multiply parent allele distributions → child genotype distribution → map to phenotype
  via penetrance table. Implemented in `engine.js`/`predict.mjs`.
- **Multi-SNP appearance:** eye colour via HERC2 rs12913832 (+OCA2 etc.) — see **IrisPlex /
  HIrisPlex-S** (Walsh et al.) for the validated eye/hair/skin model.
- **Codominant:** ABO blood type from rs8176719 (O) + rs8176746/47; Rh from RHD presence.
- **Relatedness — IBS0 & KING-robust kinship** (Manichaikul et al. 2010): parent–child has
  IBS0≈0 (a parent can't be opposite-homozygote to the child) and kinship≈0.25; full sibs
  share kinship≈0.25 but with substantial IBS0; 2nd-degree≈0.125; unrelated≈0. This is how
  GeneDuet distinguishes paternity from siblings/unrelated.
- **Polygenic scores (PGS/PRS):** weighted allele-dosage sum, score = Σ dosageᵢ·wᵢ using
  PGS Catalog effect weights. Population mean=Σ2pᵢwᵢ, variance=Σ2pᵢ(1−pᵢ)wᵢ² under HWE →
  z=(score−mean)/SD → percentile. Methods: P+T, **LDpred2**, **PRS-CS**.
- **Admixture/ancestry:** supervised EM over ancestry-informative markers with reference
  allele frequencies (mini-ADMIXTURE/STRUCTURE). Production tools: ADMIXTURE, RFMix
  (local ancestry). GeneDuet uses a coarse live-Ensembl version.
- **HLA imputation (not yet implemented):** SNP2HLA / HIBAG impute classical HLA alleles
  from SNP data — required for a real **T1D-GRS2** (Sharp et al. 2019) and celiac typing,
  because HLA-DR/DQ haplotype risk can't be captured by additive position-matching.

## 4. Specific scores/models applied (with sources)

- **Eye colour:** HERC2 rs12913832 (IrisPlex, Walsh 2011).
- **Trait SNPs:** ABCC11 rs17822931 (earwax/odour), MCM6 rs4988235 (lactase), ALDH2 rs671
  (alcohol flush), ACTN3 rs1815739 (muscle), TAS2R38 rs713598 (bitter), CYP1A2 rs762551
  (caffeine), and others — all in `data/catalog.mjs` with per-entry source.
- **Carrier:** HBB rs334 (sickle), HFE rs1800562/rs1799945 (haemochromatosis), SERPINA1
  rs28929474 (alpha-1), G6PD rs1050828.
- **Pharmacogenomics (CPIC):** SLCO1B1 rs4149056 (statin myopathy), CYP2C19 rs4244285/
  rs12248560 (clopidogrel), VKORC1 rs9923231 + CYP2C9 (warfarin).
- **Polygenic (PGS Catalog IDs):** cognition PGS001232, height PGS000297, BMI PGS000298,
  T2D PGS000036, T1D PGS000833 (HLA-limited on arrays), + disease panel in `panel.json`.

## 5. Honesty / limits to keep stating

- PGS explain limited variance (cognition ~7–12%; height ~40%); they are **population
  tendencies, not individual values or diagnoses**, and are less accurate off-European
  ancestry (most training data is European). Children **regress toward the mean**.
- No population reference bundled by default → scores are relative until `pgs-freqs.mjs`
  builds percentile caches; even then the EUR reference may not match the person's ancestry.
- Consumer data is **not clinical**: confirm anything actionable with a clinical lab /
  genetic counsellor. These reports are educational and not a legal paternity test.

## 6. Key references

- Manichaikul et al. *Robust relationship inference (KING).* Bioinformatics 2010.
- Walsh et al. *IrisPlex* (eye) 2011; *HIrisPlex-S* (eye/hair/skin) 2018.
- Sharp et al. *Development and standardization of an improved T1D-GRS (GRS2).* Diabetes Care 2019.
- Lee et al. *GWAS of educational attainment (EA3).* Nat Genet 2018; Okbay et al. EA4 2022.
- Yengo et al. *Saturated map of common variants for height.* Nature 2022.
- Privé et al. *LDpred2.* Bioinformatics 2020. Ge et al. *PRS-CS.* Nat Commun 2019.
- Alexander et al. *ADMIXTURE.* Genome Res 2009. CPIC guidelines: cpicpgx.org/guidelines.
