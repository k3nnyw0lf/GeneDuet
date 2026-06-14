// GeneDuet knowledge base — curated, well-established SNPs only (clean-room).
// Genotyping arrays read ~600–700k pre-selected SNPs; this looks up the ones
// with established meaning. NOT a substitute for clinical sequencing.
// Sources: SNPedia, dbSNP, ClinVar, CPIC, published GWAS. Educational only.
//
// Entry shape (single-SNP): { id, name, category, conf, rsid, alleles:[+strand set],
//   pheno:{ <sortedGenotype>: { <label>: prob } }, heritable, carrier, sensitive,
//   adultOnset, note }
// Multi-SNP entries use { model:"apoe"|"abo"|"warfarin"|"clopidogrel"|"brca" }.

export const CATEGORIES = [
  "Physical",
  "Taste & Diet",
  "Wellness & Fitness",
  "Nutrition",
  "Carrier status",
  "Health predisposition",
  "Pharmacogenomics",
];

// "Traits" sold by consumer DNA sites that have NO reliable single-gene basis.
// We deliberately DON'T fake-predict these (honesty > trait count).
export const MYTHS = [
  "Tongue rolling", "Hitchhiker's thumb", "Widow's peak", "Finger length (2D:4D)",
  "Cleft chin", "Ear wiggling", "Earlobe attached/free (as simple Mendelian)",
  "Dimples", "Double-jointedness", "Personality/behavioral traits (leader, optimist, artist…)",
];

export const CATALOG = [
  // ---------------- PHYSICAL ----------------
  { id: "eye_color", name: "Eye color", category: "Physical", conf: "medium", heritable: true,
    rsid: "rs12913832", alleles: ["A", "G"],
    pheno: { AA: { brown: .85, green: .14, blue: .01 }, AG: { brown: .56, green: .37, blue: .07 }, GG: { blue: .72, green: .27, brown: .01 } },
    note: "HERC2 primary switch; modified by OCA2 and others." },
  { id: "hair_red", name: "Red-hair odds (MC1R R151C)", category: "Physical", conf: "medium", heritable: true,
    rsid: "rs1805007", alleles: ["C", "T"],
    pheno: { CC: { "typical odds": 1 }, CT: { "increased red-hair odds (carrier)": 1 }, TT: { "greatly increased red-hair odds": 1 } } },
  { id: "hair_red2", name: "Red-hair odds (MC1R R160W)", category: "Physical", conf: "medium", heritable: false,
    rsid: "rs1805008", alleles: ["C", "T"],
    pheno: { CC: { "typical odds": 1 }, CT: { "increased red-hair odds": 1 }, TT: { "greatly increased red-hair odds": 1 } } },
  { id: "hair_light", name: "Lighter vs darker hair (KITLG)", category: "Physical", conf: "low", heritable: true,
    rsid: "rs12821256", alleles: ["C", "T"],
    pheno: { CC: { "darker hair tendency": 1 }, CT: { "slightly lighter": 1 }, TT: { "blond tendency": 1 } } },
  { id: "hair_curl", name: "Hair curl (TCHH)", category: "Physical", conf: "medium", heritable: true,
    rsid: "rs17646946", alleles: ["A", "G"],
    pheno: { AA: { "straighter": 1 }, AG: { "straighter": 1 }, GG: { "slightly curlier": 1 } } },
  { id: "hair_thickness", name: "Hair thickness / shovel incisors (EDAR)", category: "Physical", conf: "medium", heritable: true,
    rsid: "rs3827760", alleles: ["A", "G"],
    pheno: { AA: { "fine hair": 1 }, AG: { "intermediate": 1 }, GG: { "thicker, straight hair": 1 } } },
  { id: "skin_pigment", name: "Skin pigmentation (SLC24A5)", category: "Physical", conf: "medium", heritable: true,
    rsid: "rs1426654", alleles: ["A", "G"],
    pheno: { AA: { "lighter skin": 1 }, AG: { "intermediate": 1 }, GG: { "darker skin": 1 } } },
  { id: "freckles", name: "Freckling / sun sensitivity (IRF4)", category: "Physical", conf: "low", heritable: true,
    rsid: "rs12203592", alleles: ["C", "T"],
    pheno: { CC: { "fewer freckles": 1 }, CT: { "some freckles": 1 }, TT: { "more freckles, sun-sensitive": 1 } } },
  { id: "earwax", name: "Earwax type / body odor (ABCC11)", category: "Physical", conf: "high", heritable: true,
    rsid: "rs17822931", alleles: ["C", "T"],
    pheno: { CC: { "wet earwax, typical odor": 1 }, CT: { "wet earwax, typical odor": 1 }, TT: { "dry earwax, reduced odor": 1 } } },
  { id: "photic", name: "Photic sneeze reflex (ACHOO)", category: "Physical", conf: "low", heritable: true,
    rsid: "rs10427255", alleles: ["C", "T"],
    pheno: { CC: { "more likely to sun-sneeze": 1 }, CT: { "intermediate": 1 }, TT: { "less likely": 1 } } },

  // ---------------- TASTE & DIET ----------------
  { id: "bitter", name: "Bitter taste (PTC, TAS2R38)", category: "Taste & Diet", conf: "high", heritable: true,
    rsid: "rs713598", alleles: ["C", "G"],
    pheno: { GG: { taster: 1 }, CG: { taster: 1 }, CC: { "non-taster": 1 } } },
  { id: "cilantro", name: "Cilantro tastes like soap (OR6A2)", category: "Taste & Diet", conf: "low", heritable: true,
    rsid: "rs72921001", alleles: ["A", "C"],
    pheno: { CC: { "more likely soapy": 1 }, AC: { "possibly soapy": 1 }, AA: { "unlikely soapy": 1 } } },
  { id: "asparagus", name: "Asparagus-pee smell detection", category: "Taste & Diet", conf: "low", heritable: true,
    rsid: "rs4481887", alleles: ["A", "G"],
    pheno: { AA: { "can smell it": 1 }, AG: { "intermediate": 1 }, GG: { "can't smell it": 1 } } },
  { id: "lactose", name: "Lactose tolerance (adult, MCM6)", category: "Taste & Diet", conf: "high", heritable: true,
    rsid: "rs4988235", alleles: ["A", "G"],
    pheno: { AA: { tolerant: 1 }, AG: { tolerant: 1 }, GG: { "likely intolerant": 1 } } },
  { id: "alcohol_flush", name: "Alcohol flush (ALDH2)", category: "Taste & Diet", conf: "high", heritable: true,
    rsid: "rs671", alleles: ["A", "G"],
    pheno: { GG: { "no flush": 1 }, AG: { "moderate flush": 1 }, AA: { "strong flush": 1 } } },
  { id: "alcohol_adh1b", name: "Alcohol metabolism speed (ADH1B)", category: "Taste & Diet", conf: "medium", heritable: true,
    rsid: "rs1229984", alleles: ["A", "G"],
    pheno: { GG: { "typical metabolism": 1 }, AG: { "faster metabolism": 1 }, AA: { "fast metabolism (lower dependence risk)": 1 } } },
  { id: "celiac_hla", name: "Celiac HLA-DQ2.5 risk tag", category: "Taste & Diet", conf: "medium", heritable: false,
    rsid: "rs2187668", alleles: ["C", "T"],
    pheno: { CC: { "low HLA risk": 1 }, CT: { "one DQ2.5 tag (most never develop celiac)": 1 }, TT: { "two DQ2.5 tags (higher; still usually unaffected)": 1 } },
    note: "HLA tag only, NOT a diagnosis. Most carriers never develop celiac." },
  { id: "sweet_pref", name: "Sweet tooth / carb preference (FGF21)", category: "Taste & Diet", conf: "low", heritable: true,
    rsid: "rs838133", alleles: ["A", "G"],
    pheno: { AA: { "higher sweet/carb preference": 1 }, AG: { "intermediate": 1 }, GG: { "lower sweet preference": 1 } } },

  // ---------------- WELLNESS & FITNESS ----------------
  { id: "muscle_actn3", name: "Muscle type (ACTN3 R577X)", category: "Wellness & Fitness", conf: "high", heritable: true,
    rsid: "rs1815739", alleles: ["C", "T"],
    pheno: { CC: { "power/sprint": 1 }, CT: { mixed: 1 }, TT: { endurance: 1 } } },
  { id: "obesity_fto", name: "Obesity / BMI tendency (FTO)", category: "Wellness & Fitness", conf: "medium", heritable: true,
    rsid: "rs1421085", alleles: ["C", "T"],
    pheno: { TT: { "typical": 1 }, CT: { "slightly higher BMI tendency": 1 }, CC: { "higher BMI tendency": 1 } },
    note: "Small effect; diet & activity dominate." },
  { id: "t2d_tcf7l2", name: "Type-2 diabetes tendency (TCF7L2)", category: "Wellness & Fitness", conf: "medium", heritable: true, adultOnset: true,
    rsid: "rs7903146", alleles: ["C", "T"],
    pheno: { CC: { "typical risk": 1 }, CT: { "moderately increased": 1 }, TT: { "higher T2D risk": 1 } } },
  { id: "chronotype", name: "Morning vs evening person (CLOCK)", category: "Wellness & Fitness", conf: "low", heritable: true,
    rsid: "rs1801260", alleles: ["A", "G"],
    pheno: { AA: { "evening tendency": 1 }, AG: { "intermediate": 1 }, GG: { "morning tendency": 1 } } },

  // ---------------- NUTRITION ----------------
  { id: "vit_d", name: "Vitamin D level tendency (GC)", category: "Nutrition", conf: "medium", heritable: true,
    rsid: "rs2282679", alleles: ["A", "C"],
    pheno: { AA: { "typical vitamin D": 1 }, AC: { "tends lower": 1 }, CC: { "tends lower — may need more": 1 } } },
  { id: "mthfr_677", name: "Folate processing (MTHFR C677T)", category: "Nutrition", conf: "medium", heritable: true,
    rsid: "rs1801133", alleles: ["A", "G"],
    pheno: { GG: { "processes folate normally": 1 }, AG: { "processes folate a bit slower (one copy)": 1 }, AA: { "processes folate slower (two copies)": 1 } },
    note: "Very common and usually harmless on its own." },
  { id: "mthfr_1298", name: "Folate metabolism (MTHFR A1298C)", category: "Nutrition", conf: "low", heritable: false,
    rsid: "rs1801131", alleles: ["G", "T"],
    pheno: { TT: { "normal": 1 }, GT: { "mildly reduced (one copy)": 1 }, GG: { "reduced (two copies)": 1 } } },
  { id: "omega_fads1", name: "Omega-3 conversion (FADS1)", category: "Nutrition", conf: "low", heritable: true,
    rsid: "rs174537", alleles: ["G", "T"],
    pheno: { GG: { "efficient ALA→EPA/DHA": 1 }, GT: { "intermediate": 1 }, TT: { "less efficient — dietary EPA/DHA helps": 1 } } },

  // ---------------- CARRIER STATUS (recessive) ----------------
  { id: "sickle", name: "Sickle cell (HBB)", category: "Carrier status", conf: "high", heritable: true, carrier: true,
    rsid: "rs334", alleles: ["A", "T"], palindromeOK: true,
    pheno: { AA: { "not a carrier": 1 }, AT: { "carrier (sickle trait)": 1 }, TT: { "two copies (sickle cell disease)": 1 } } },
  { id: "hfe_c282y", name: "Hemochromatosis (HFE C282Y)", category: "Carrier status", conf: "high", heritable: true, carrier: true,
    rsid: "rs1800562", alleles: ["A", "G"],
    pheno: { GG: { "not a carrier": 1 }, AG: { "carrier": 1 }, AA: { "two copies (iron-overload risk)": 1 } } },
  { id: "hfe_h63d", name: "Hemochromatosis (HFE H63D)", category: "Carrier status", conf: "medium", heritable: true, carrier: true,
    rsid: "rs1799945", alleles: ["C", "G"],
    pheno: { CC: { "not a carrier": 1 }, CG: { "carrier": 1 }, GG: { "two copies": 1 } } },
  { id: "a1at_z", name: "Alpha-1 antitrypsin (SERPINA1 Z)", category: "Carrier status", conf: "high", heritable: true, carrier: true,
    rsid: "rs28929474", alleles: ["C", "T"],
    pheno: { CC: { "not a Z carrier": 1 }, CT: { "Z carrier": 1 }, TT: { "two Z copies (ZZ, deficiency)": 1 } } },
  { id: "g6pd", name: "G6PD deficiency (X-linked)", category: "Carrier status", conf: "medium", heritable: true, carrier: true,
    rsid: "rs1050828", alleles: ["C", "T"], xlinked: true,
    pheno: { CC: { "normal": 1 }, CT: { "carrier / partial (X-linked)": 1 }, TT: { "deficiency (avoid certain drugs/fava)": 1 } } },

  // ---------------- HEALTH PREDISPOSITION ----------------
  { id: "factor_v", name: "Factor V Leiden (clotting, F5)", category: "Health predisposition", conf: "high", heritable: true,
    rsid: "rs6025", alleles: ["A", "G"],
    pheno: { GG: { "typical clotting risk": 1 }, AG: { "one copy — increased clot risk": 1 }, AA: { "two copies — high clot risk": 1 } } },
  { id: "prothrombin", name: "Prothrombin G20210A (clotting, F2)", category: "Health predisposition", conf: "high", heritable: true,
    rsid: "rs1799963", alleles: ["A", "G"],
    pheno: { GG: { "typical": 1 }, AG: { "one copy — increased clot risk": 1 }, AA: { "two copies": 1 } } },
  { id: "amd_cfh", name: "Macular degeneration (CFH Y402H)", category: "Health predisposition", conf: "medium", heritable: true, adultOnset: true,
    rsid: "rs1061170", alleles: ["C", "T"],
    pheno: { TT: { "typical AMD risk": 1 }, CT: { "moderately increased": 1 }, CC: { "higher age-related AMD risk": 1 } } },
  { id: "cad_9p21", name: "Coronary artery disease (9p21)", category: "Health predisposition", conf: "medium", heritable: true, adultOnset: true,
    rsid: "rs10757278", alleles: ["A", "G"],
    pheno: { AA: { "typical": 1 }, AG: { "moderately increased": 1 }, GG: { "increased CAD risk": 1 } } },
  { id: "parkinson_lrrk2", name: "Parkinson's (LRRK2 G2019S)", category: "Health predisposition", conf: "medium", heritable: true, sensitive: true, adultOnset: true,
    rsid: "rs34637584", alleles: ["A", "G"],
    pheno: { GG: { "variant not detected": 1 }, AG: { "one G2019S copy — increased risk": 1 }, AA: { "two copies": 1 } },
    note: "Most people with this variant never develop Parkinson's; most Parkinson's is not from it." },
  { id: "apoe", name: "APOE — Alzheimer's risk", category: "Health predisposition", conf: "medium", model: "apoe",
    sensitive: true, adultOnset: true, snps: ["rs429358", "rs7412"],
    note: "Risk factor, not a diagnosis. e4 raises risk; e2 lowers it. Many e4 carriers never develop Alzheimer's." },
  { id: "brca", name: "BRCA1/2 founder variants", category: "Health predisposition", conf: "medium", model: "brca",
    sensitive: true, adultOnset: true, snps: ["rs80357914", "rs80357906", "rs80359550"],
    note: "Only 3 founder variants (mostly Ashkenazi). A negative here does NOT rule out BRCA risk — that needs full sequencing." },

  // ---------------- PHARMACOGENOMICS ----------------
  { id: "statin_slco1b1", name: "Statin muscle-pain risk (SLCO1B1)", category: "Pharmacogenomics", conf: "high", heritable: true,
    rsid: "rs4149056", alleles: ["C", "T"],
    pheno: { TT: { "statins usually fine": 1 }, CT: { "slightly higher chance of muscle aches from statins": 1 }, CC: { "higher chance of muscle aches from statins": 1 } } },
  { id: "caffeine_cyp1a2", name: "Caffeine metabolism (CYP1A2)", category: "Pharmacogenomics", conf: "medium", heritable: true,
    rsid: "rs762551", alleles: ["A", "C"],
    pheno: { AA: { "fast metabolizer": 1 }, AC: { "slow metabolizer": 1 }, CC: { "slow metabolizer": 1 } } },
  { id: "clopidogrel", name: "Clopidogrel/Plavix response (CYP2C19)", category: "Pharmacogenomics", conf: "medium", model: "clopidogrel",
    snps: ["rs4244285", "rs12248560"],
    note: "*2 = reduced activation (less effective); *17 = increased. Informational; clinicians decide dosing." },
  { id: "warfarin", name: "Warfarin sensitivity (VKORC1 + CYP2C9)", category: "Pharmacogenomics", conf: "medium", model: "warfarin",
    snps: ["rs9923231", "rs1799853", "rs1057910"],
    note: "Predicts dose sensitivity per CPIC. Informational only." },
];

// ---------------- multi-SNP interpretation models ----------------
// Each takes a getter gt(rsid, allelesHint) -> "XY"|null and returns {label, detail}.
export const MODELS = {
  apoe(gt) {
    const a = gt("rs429358", ["C", "T"]);   // C is the e4-defining base
    const b = gt("rs7412", ["C", "T"]);     // T is the e2-defining base
    if (!a || !b) return { label: "unable to determine", detail: "needs rs429358 + rs7412" };
    const k = (s) => s.split("").sort().join("");
    const table = {
      "TT|TT": "e2/e2 (lowest Alzheimer's risk)",
      "TT|CT": "e2/e3 (lower risk)",
      "TT|CC": "e3/e3 (typical / population-average risk)",
      "CT|CC": "e3/e4 (≈2–3× increased risk)",
      "CC|CC": "e4/e4 (highest common risk)",
      "CT|CT": "ambiguous (e2/e4 or e1/e3 — needs phasing)",
      "CT|TT": "e2/e4 (mixed)",
      "CC|CT": "e1/e4 (rare)",
    };
    const key = `${k(a)}|${k(b)}`;
    return { label: table[key] || `uncommon combo (${a},${b})`, detail: "risk factor, not a diagnosis" };
  },
  brca(gt) {
    // Indel encoding on consumer arrays is variant-specific and unreliable, so we
    // deliberately DO NOT assert pathogenic/benign here (a wrong BRCA call is harmful).
    const variants = ["rs80357914", "rs80357906", "rs80359550"];
    const typed = variants.filter((rs) => gt(rs, null) != null).length;
    if (typed === 0) return { label: "not covered on this file", detail: "the 3 founder sites weren't typed" };
    return {
      label: `${typed}/3 founder sites present — not safely interpretable from array data`,
      detail: "if BRCA is a concern, get clinical BRCA testing; array data can't confirm or rule it out",
    };
  },
  clopidogrel(gt) {
    const star2 = gt("rs4244285", ["A", "G"]); // A = *2 loss-of-function
    const star17 = gt("rs12248560", ["C", "T"]); // T = *17 increased
    if (!star2) return { label: "unable to determine", detail: "needs rs4244285" };
    const lof = (star2.match(/A/g) || []).length;
    const gain = star17 ? (star17.match(/T/g) || []).length : 0;
    let label = "normal metabolizer (typical response)";
    if (lof === 2) label = "poor metabolizer (clopidogrel likely less effective)";
    else if (lof === 1) label = "intermediate metabolizer (reduced response)";
    else if (gain >= 1) label = "rapid/ultrarapid metabolizer";
    return { label, detail: "informational; clinicians choose therapy" };
  },
  warfarin(gt) {
    const vkorc1 = gt("rs9923231", ["A", "G"]); // A = higher sensitivity
    const c9_2 = gt("rs1799853", ["C", "T"]);   // T = *2
    const c9_3 = gt("rs1057910", ["A", "C"]);   // C = *3
    if (!vkorc1) return { label: "unable to determine", detail: "needs VKORC1 rs9923231" };
    const sens = (vkorc1.match(/A/g) || []).length;
    const reduced = (c9_2 ? (c9_2.match(/T/g) || []).length : 0) + (c9_3 ? (c9_3.match(/C/g) || []).length : 0);
    let label = "typical warfarin dose expected";
    if (sens === 2 || reduced >= 2) label = "high sensitivity — likely needs a LOW dose";
    else if (sens === 1 || reduced === 1) label = "moderate sensitivity — somewhat lower dose";
    return { label, detail: "per CPIC; informational only" };
  },
};
