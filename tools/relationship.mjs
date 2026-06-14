// Rigorous relatedness check using IBS0 (opposite homozygotes) — the standard
// genetic test for parent-child. Same-vendor data, so allele letters compare directly.
//   Parent-child: IBS0 ≈ 0%   (a true parent can't be AA when the child is BB)
//   Full sibling: IBS0 ≈ 3-4% Unrelated: IBS0 ≈ 5-10%
// Plus genome-wide genotype concordance and a kinship-style estimate.
import { readFileSync } from "node:fs";

function parse(path) {
  const m = new Map();
  for (let line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line[0] === "#") continue;
    line = line.replace(/"/g, "").trim();
    const f = line.includes("\t") ? line.split("\t") : line.split(",");
    if (f.length < 4) continue;
    const rs = f[0]; if (rs.toLowerCase() === "rsid") continue;
    const gt = (f.length >= 5 ? f[3] + f[4] : f[3]).toUpperCase().replace(/[^ACGT]/g, "");
    if (gt.length === 2) m.set(rs, gt.split("").sort().join(""));
  }
  return m;
}

function compare(name, p, c) {
  let n = 0, ibs0 = 0, ibs2 = 0, het1 = 0, het2 = 0, hethet = 0;
  for (const [rs, g1] of p) {
    const g2 = c.get(rs); if (!g2) continue;
    n++;
    const h1 = g1[0] !== g1[1], h2 = g2[0] !== g2[1];
    if (h1) het1++; if (h2) het2++; if (h1 && h2) hethet++;
    if (!h1 && !h2 && g1[0] !== g2[0]) ibs0++;       // opposite homozygotes = exclusion
    if (g1 === g2) ibs2++;
  }
  const ibs0r = ibs0 / n, conc = ibs2 / n;
  // KING-robust kinship coefficient
  const kin = (hethet - 2 * ibs0) / (het1 + het2);
  let degree;
  if (kin > 0.354) degree = "identical / same person";
  else if (kin > 0.177) degree = "FIRST-degree (parent–child or full sibling)";
  else if (kin > 0.0884) degree = "SECOND-degree (half-sib, grandparent, aunt/uncle)";
  else if (kin > 0.0442) degree = "THIRD-degree (first cousin)";
  else degree = "UNRELATED";
  // parent-child vs full-sib split: PC has IBS0≈0, FS has IBS0≈3-4%
  let refine = "";
  if (kin > 0.177) refine = ibs0r < 0.012 ? " → pattern fits PARENT–CHILD" : " → pattern fits FULL SIBLINGS (not parent–child)";
  console.log(`\n${name}`);
  console.log(`  SNPs compared      : ${n.toLocaleString()}`);
  console.log(`  KING kinship       : ${kin.toFixed(4)}   [${degree}]${refine}`);
  console.log(`  IBS0 (exclusions)  : ${ibs0.toLocaleString()}  (${(ibs0r * 100).toFixed(3)}%)`);
  console.log(`  identical genotype : ${(conc * 100).toFixed(2)}%`);
  return { kin, ibs0r };
}

// Usage: node tools/relationship.mjs <dna1.txt> <dna2.txt> [dna3.txt ...]
const files = process.argv.slice(2);
if (files.length < 2) { console.error("Usage: node tools/relationship.mjs <dna1.txt> <dna2.txt> [more...]"); process.exit(1); }
const nameOf = (p) => p.split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
const G = files.map(parse), N = files.map(nameOf);
console.log("==========  Relationship analysis (IBS0 + KING)  ==========");
for (let i = 0; i < G.length; i++)
  for (let j = i + 1; j < G.length; j++)
    compare(`${N[i]}  vs  ${N[j]}`, G[i], G[j]);
console.log("\n(IBS0 is genetically rigorous but this is NOT a legal paternity test.)\n");
