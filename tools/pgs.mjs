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

  console.log(`\n══════  ${label}  (${variants.length.toLocaleString()} variants, ${common.size.toLocaleString()} shared & usable)  ══════`);
  [...scores].sort((a, b) => b.raw - a.raw).forEach((s, i) =>
    console.log(`  ${(i + 1)}. ${s.name.padEnd(7)} relative score z=${s.z >= 0 ? "+" : ""}${s.z.toFixed(2)}   (raw ${s.raw.toFixed(3)}, covered ${s.cov.toLocaleString()})`));
  if (extra.fn) extra.fn(scores);
  return scores;
}

// ---------- main ----------
const base = "private";
const people = [
  { name: "Ken", genome: parseGenome(`${base}/dad.txt`) },
  { name: "Daine", genome: parseGenome(`${base}/mom.txt`) },
  { name: "Daniel", genome: parseGenome(`${base}/son.txt`) },
];

console.log("════════  GeneDuet — polygenic scores  ════════");
console.log("Relative to THESE 3 people only · not a population percentile · not a diagnosis.");

runPGS("COGNITIVE / fluid-intelligence tendency (PGS001232)", `${base}/pgs/PGS001232.txt`, people, {
  fn(scores) {
    const ken = scores.find((s) => s.name === "Ken"), dan = scores.find((s) => s.name === "Daniel"), dai = scores.find((s) => s.name === "Daine");
    const tracks = dan.raw > ken.raw;
    console.log(`\n  Sanity check vs known IQ (Daniel 152 > Ken 142):`);
    console.log(`    DNA cognitive score ordering Daniel>Ken? ${tracks ? "YES — score tracks the known IQs" : "NO — score does NOT track (illustrates PGS ≠ IQ)"}  [n=2, anecdotal]`);
    const mid = (ken.raw + dai.raw) / 2;
    const midz = (mid - (scores.reduce((a, b) => a + b.raw, 0) / 3)) / (Math.sqrt(scores.reduce((a, b) => a + (b.raw - (scores.reduce((x, y) => x + y.raw, 0) / 3)) ** 2, 0) / 3) || 1);
    console.log(`\n  A future Ken+Daine child (cognitive PGS): expected ≈ midpoint of you two (z≈${midz >= 0 ? "+" : ""}${midz.toFixed(2)} vs this trio).`);
    console.log(`    ⚠️ This is NOT an IQ prediction. Cannot produce a number. Children also regress toward the population mean.`);
  },
});

runPGS("HEIGHT tendency (PGS000297)", `${base}/pgs/PGS000297.txt`, people, {
  fn(scores) {
    const ken = scores.find((s) => s.name === "Ken"), dai = scores.find((s) => s.name === "Daine");
    console.log(`\n  A future Ken+Daine child: expected height tendency ≈ midpoint of you two (height PGS is genuinely predictive, ~40% of variance).`);
  },
});

runPGS("BMI / body-size tendency (PGS000298)", `${base}/pgs/PGS000298.txt`, people, {
  fn() { console.log(`\n  Higher score = genetic tendency toward higher BMI. Diet & activity dominate the outcome.`); },
});

runPGS("TYPE-2 DIABETES risk tendency (PGS000036)", `${base}/pgs/PGS000036.txt`, people, {
  fn() { console.log(`\n  Higher score = higher genetic T2D liability — a risk nudge, very modifiable by lifestyle.`); },
});

runPGS("TYPE-1 DIABETES genetic risk — T1D-GRS2 (PGS000833, HLA-based) [UNRELIABLE here]", `${base}/pgs/PGS000833.txt`, people, {
  fn() {
    console.log(`\n  ⚠️ DO NOT TRUST these T1D numbers. Only ~28/66 variants matched, and the`);
    console.log(`     HLA-DQ haplotype terms that drive ~half of T1D risk CANNOT be reproduced`);
    console.log(`     by additive position-matching on array data — they need HLA imputation.`);
    console.log(`  Ken HAS clinically-confirmed T1D, so his true HLA risk is high regardless of`);
    console.log(`     this coarse score. A low score here is a TOOL limitation, not evidence.`);
    console.log(`  Proper path: HLA imputation (e.g. SNP2HLA) → full T1D-GRS2. Flagged for the build.`);
  },
});

// Data-driven disease-risk panel (private/pgs/panel.json from pgs-discover.mjs)
if (existsSync(`${base}/pgs/panel.json`)) {
  const panel = JSON.parse(readFileSync(`${base}/pgs/panel.json`, "utf8"));
  console.log(`\n\n████  DISEASE-RISK PANEL — ${panel.length} published scores  ████`);
  console.log("⚠️ RELATIVE to these people only (no population percentile) · research scores, NOT clinical · adult-onset hidden for Daniel (minor) · small-variant scores are noisy.");
  for (const s of panel) {
    const ppl = s.adultOnset ? people.filter((p) => p.name !== "Daniel") : people;
    runPGS(`${s.label}${s.sensitive ? " 🔒" : ""} (${s.id}, ${s.variants.toLocaleString()} variants)`, s.file, ppl);
  }
}

console.log("\nPGS reflect tendencies, not destiny. Environment, nutrition & chance matter enormously.");
console.log("These are research scores ranked only among the people loaded — not diagnoses, not percentiles.\n");
