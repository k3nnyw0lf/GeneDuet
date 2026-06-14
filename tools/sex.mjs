// Genetic sex estimation from a consumer array. Near-deterministic (unlike trait
// odds): males are hemizygous on X (≈0% heterozygous, non-PAR) and have called Y
// SNPs; females show normal X heterozygosity (~15-40%) and ≈0 Y calls.
// Ambiguous middle ground can indicate a sex-chromosome aneuploidy (XXY/XO/XYY).
import { readFileSync } from "node:fs";

function analyze(path) {
  let xCalled = 0, xHet = 0, yCalled = 0;
  for (let line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line[0] === "#") continue;
    line = line.replace(/"/g, "").trim();
    const f = line.includes("\t") ? line.split("\t") : line.split(",");
    if (f.length < 4) continue;
    if (f[0].toLowerCase() === "rsid") continue;
    const chrom = f[1];
    const tok = (f.length >= 5 ? f[3] + f[4] : f[3]).toUpperCase();
    const acgt = tok.replace(/[^ACGT]/g, "");
    if (chrom === "23" || chrom === "X") {            // X (non-PAR; Ancestry PAR = chrom 25)
      if (acgt.length >= 1) { xCalled++; if (acgt.length === 2 && acgt[0] !== acgt[1]) xHet++; }
    } else if (chrom === "24" || chrom === "Y") {     // Y
      if (acgt.length >= 1) yCalled++;
    }
  }
  const xHetRate = xCalled ? xHet / xCalled : 0;
  // Decision: X heterozygosity is the strong signal; Y call count corroborates.
  let sex, conf;
  if (xHetRate < 0.05 && yCalled > 100) { sex = "Male (XY)"; conf = ">99%"; }
  else if (xHetRate > 0.12 && yCalled < 100) { sex = "Female (XX)"; conf = ">99%"; }
  else if (xHetRate < 0.05) { sex = "Male (XY)"; conf = "~95% (low Y coverage)"; }
  else if (xHetRate > 0.12) { sex = "Female (XX)"; conf = "~95% (some Y calls)"; }
  else { sex = "AMBIGUOUS — possible sex-chromosome variation (XXY/XO/XYY)"; conf = "uncertain"; }
  return { xCalled, xHetRate, yCalled, sex, conf };
}

const files = process.argv.slice(2);
if (!files.length) { console.error("Usage: node tools/sex.mjs <file...>"); process.exit(1); }
console.log("════  Genetic sex estimate  ════\n");
for (const path of files) {
  const r = analyze(path);
  const name = path.split(/[\\/]/).pop();
  console.log(`${name}`);
  console.log(`  X heterozygosity : ${(r.xHetRate * 100).toFixed(1)}%  (${r.xCalled.toLocaleString()} X SNPs)`);
  console.log(`  Y SNPs called    : ${r.yCalled.toLocaleString()}`);
  console.log(`  → ${r.sex}   confidence ${r.conf}\n`);
}
console.log("Genetic (chromosomal) sex ≠ gender identity. Educational only.");
