// GeneDuet polygenic-score engine. Applies published PGS Catalog scoring files
// (effect allele + weight per SNP) to genomes. Honest about limits:
//   • PGS = population-level TENDENCY, not an individual's value.
//   • Cognitive/EA PGS explain ~7–12% of IQ variance — cannot give an IQ number.
//   • Height PGS is far stronger (~40%).
//   • No population reference here, so scores are ranked RELATIVE TO THESE PEOPLE only.
//   • PGS are derived mostly in European-ancestry cohorts; accuracy drops otherwise.
import { readFileSync, existsSync } from "node:fs";

const COMP = { A: "T", T: "A", C: "G", G: "C" };
const flip = (s) => s.split("").map((b) => COMP[b] || b).join("");

function parseGenome(path) {
  const rs = new Map(), pos = new Map();
  for (let line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line[0] === "#") continue;
    line = line.replace(/"/g, "").trim();
    const f = line.includes("\t") ? line.split("\t") : line.split(",");
    if (f.length < 4) continue;
    const id = f[0]; if (id.toLowerCase() === "rsid") continue;
    let gt, chr, p;
    if (f.length >= 5) { gt = (f[3] + f[4]).toUpperCase(); chr = f[1]; p = f[2]; }
    else { gt = f[3].toUpperCase(); chr = f[1]; p = f[2]; }
    gt = gt.replace(/[^ACGT]/g, "");
    if (gt.length !== 2) continue;
    rs.set(id, gt);
    pos.set(`${chr}:${p}`, gt);
  }
  return { rs, pos };
}

function parseScoring(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  let cols = null; const out = [];
  for (const line of lines) {
    if (!line || line[0] === "#") continue;
    const f = line.split("\t");
    if (!cols) { cols = {}; f.forEach((c, i) => (cols[c] = i)); continue; }
    const rsid = ((cols.hm_rsID != null ? f[cols.hm_rsID] : "") || (cols.rsID != null ? f[cols.rsID] : "") || "").trim();
    const ea = (f[cols.effect_allele] || "").toUpperCase();
    const oa = (cols.other_allele != null ? (f[cols.other_allele] || "") : "").toUpperCase();
    const w = parseFloat(f[cols.effect_weight]);
    const chr = cols.hm_chr != null ? f[cols.hm_chr] : f[cols.chr_name];
    const pos = cols.hm_pos != null ? f[cols.hm_pos] : f[cols.chr_position];
    const key = `${chr}:${pos}`;
    if (!ea || Number.isNaN(w) || (!rsid && !(chr && pos))) continue;
    out.push({ id: rsid || key, rsid, ea, oa, w, key });
  }
  return out;
}

// effect-allele dosage (0/1/2) with strand handling; null if unresolvable
function dosage(gt, ea, oa) {
  if (oa) { // both alleles known: strand-check against the pair
    const set = new Set([ea, oa]);
    let g = gt;
    if (![...g].every((b) => set.has(b))) { const fg = flip(g); if ([...fg].every((b) => set.has(b))) g = fg; else return null; }
    return (g[0] === ea ? 1 : 0) + (g[1] === ea ? 1 : 0);
  }
  // only effect allele known (position-keyed files): count ea, flipping strand if needed
  const obs = new Set(gt);
  if (obs.has(ea)) return (gt[0] === ea ? 1 : 0) + (gt[1] === ea ? 1 : 0);
  const ce = flip(ea);
  if (obs.has(ce)) return (gt[0] === ce ? 1 : 0) + (gt[1] === ce ? 1 : 0);
  return 0; // homozygous for the other allele
}

function coveredSet(genome, variants) {
  const cov = new Map(); // id -> {dosage, weight}
  for (const v of variants) {
    let gt = (v.rsid && genome.rs.get(v.rsid)) || genome.pos.get(v.key);
    if (!gt) continue;
    const d = dosage(gt, v.ea, v.oa);
    if (d == null) continue;
    cov.set(v.id, { d, w: v.w });
  }
  return cov;
}

// normal CDF for percentile (Abramowitz-Stegun erf)
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
function loadFreq(scoringPath) { try { return JSON.parse(readFileSync(scoringPath.replace(/\.txt$/, ".freq.json"), "utf8")).p; } catch { return null; } }

function runPGS(label, scoringPath, people, extra = {}) {
  const variants = parseScoring(scoringPath);
  const covs = people.map((p) => coveredSet(p.genome, variants));
  // fair comparison: score over variants covered in EVERYONE
  let common = null;
  for (const c of covs) common = common ? new Set([...common].filter((k) => c.has(k))) : new Set(c.keys());
  const scores = people.map((p, i) => {
    let s = 0; for (const k of common) s += covs[i].get(k).d * covs[i].get(k).w;
    return { name: p.name, raw: s, cov: covs[i].size };
  });
  const mean = scores.reduce((a, b) => a + b.raw, 0) / scores.length;
  const sd = Math.sqrt(scores.reduce((a, b) => a + (b.raw - mean) ** 2, 0) / scores.length) || 1;
  scores.forEach((s) => (s.z = (s.raw - mean) / sd));

  // real population percentile from cached EUR frequencies (if available)
  const freq = loadFreq(scoringPath);
  if (freq) scores.forEach((s, i) => {
    let raw = 0, pm = 0, pv = 0, n = 0;
    for (const [k, v] of covs[i]) { const p = freq[k]; if (p == null) continue; raw += v.d * v.w; pm += 2 * p * v.w; pv += 2 * p * (1 - p) * v.w * v.w; n++; }
    if (n >= 10 && pv > 0) { s.pct = Math.round(phi((raw - pm) / Math.sqrt(pv)) * 100); s.pn = n; }
  });

  console.log(`\n══════  ${label}  (${variants.length.toLocaleString()} variants, ${common.size.toLocaleString()} shared & usable)  ══════`);
  [...scores].sort((a, b) => b.raw - a.raw).forEach((s, i) =>
    console.log(`  ${(i + 1)}. ${s.name.padEnd(7)} z=${s.z >= 0 ? "+" : ""}${s.z.toFixed(2)} vs trio` +
      (s.pct != null ? `   ▶ ~${s.pct}th percentile vs EUR population (${s.pn} SNPs)` : "")));
  if (extra.fn) extra.fn(scores);
  return scores;
}

// ---------- main ----------
// Usage: node tools/pgs.mjs <dna1.txt> <dna2.txt> ... [--minor=<name>]
const base = "private";
const argv = process.argv.slice(2);
const files = argv.filter((a) => !a.startsWith("--"));
const minorNames = new Set(argv.filter((a) => a.startsWith("--minor=")).map((a) => a.slice(8)));
if (!files.length) { console.error("Usage: node tools/pgs.mjs <dna1.txt> <dna2.txt> ... [--minor=<name>]"); process.exit(1); }
const nameOf = (p) => p.split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
const people = files.map((p) => ({ name: nameOf(p), genome: parseGenome(p) }));

console.log("════════  GeneDuet — polygenic scores  ════════");
console.log("Relative to the loaded people only · not a population percentile · not a diagnosis.");

runPGS("COGNITIVE / fluid-intelligence tendency (PGS001232)", `${base}/pgs/PGS001232.txt`, people, {
  fn() { console.log(`\n  ⚠️ Explains only ~7–12% of variance — a population tendency, NOT an IQ value. Children regress toward the mean.`); },
});
runPGS("HEIGHT tendency (PGS000297)", `${base}/pgs/PGS000297.txt`, people, {
  fn() { console.log(`\n  A child of two people ≈ midpoint of their scores. Height PGS is genuinely predictive (~40% of variance).`); },
});
runPGS("BMI / body-size tendency (PGS000298)", `${base}/pgs/PGS000298.txt`, people, {
  fn() { console.log(`\n  Higher score = genetic tendency toward higher BMI. Diet & activity dominate the outcome.`); },
});
runPGS("TYPE-2 DIABETES risk tendency (PGS000036)", `${base}/pgs/PGS000036.txt`, people, {
  fn() { console.log(`\n  Higher score = higher genetic T2D liability — a risk nudge, very modifiable by lifestyle.`); },
});
runPGS("TYPE-1 DIABETES genetic risk — T1D-GRS2 (PGS000833, HLA-based) [UNRELIABLE here]", `${base}/pgs/PGS000833.txt`, people, {
  fn() {
    console.log(`\n  ⚠️ DO NOT TRUST these T1D numbers. Only a fraction of variants match, and the`);
    console.log(`     HLA-DQ haplotype terms that drive ~half of T1D risk CANNOT be reproduced by`);
    console.log(`     additive position-matching on array data — they need HLA imputation (e.g. SNP2HLA).`);
    console.log(`     Anyone with clinically-diagnosed T1D has high true HLA risk regardless of this score.`);
  },
});

// Data-driven disease-risk panel (private/pgs/panel.json from pgs-discover.mjs)
if (existsSync(`${base}/pgs/panel.json`)) {
  const panel = JSON.parse(readFileSync(`${base}/pgs/panel.json`, "utf8"));
  console.log(`\n\n████  DISEASE-RISK PANEL — ${panel.length} published scores  ████`);
  console.log("⚠️ RELATIVE to the loaded people only (no population percentile) · research scores, NOT clinical · minors (--minor=) excluded from adult-onset · small-variant scores are noisy.");
  for (const s of panel) {
    const ppl = s.adultOnset ? people.filter((p) => !minorNames.has(p.name)) : people;
    runPGS(`${s.label}${s.sensitive ? " 🔒" : ""} (${s.id}, ${s.variants.toLocaleString()} variants)`, s.file, ppl);
  }
}

console.log("\nPGS reflect tendencies, not destiny. Environment, nutrition & chance matter enormously.");
console.log("These are research scores ranked only among the people loaded — not diagnoses, not percentiles.\n");
