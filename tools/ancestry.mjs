// Coarse continental ancestry via supervised admixture (EM) over ancestry-
// informative markers, using LIVE 1000-Genomes frequencies from Ensembl.
// COARSE by design (small AIM panel) — AncestryDNA's own ethnicity estimate is
// more accurate. This is an independent cross-check, not a replacement.
import { readFileSync } from "node:fs";

const POPS = ["AFR", "AMR", "EAS", "EUR", "SAS"];
const POPNAME = { AFR: "African", AMR: "Admixed American", EAS: "East Asian", EUR: "European", SAS: "South Asian" };
const COMP = { A: "T", T: "A", C: "G", G: "C" };
const flip = (s) => s.split("").map((b) => COMP[b] || b).join("");

// High-Fst ancestry-informative markers (Ensembl validates; unknown ones drop out)
const AIMS = ["rs2814778","rs1426654","rs16891982","rs3827760","rs1042602","rs12913832",
  "rs1800414","rs260690","rs4988235","rs3811801","rs1129038","rs1834640","rs174570",
  "rs2065160","rs7349332","rs6058017","rs735480","rs2238151","rs2470102","rs4918664",
  "rs6422347","rs2306969","rs1024611","rs772262","rs2125345"];

function parseGenome(path) {
  const m = new Map();
  for (let line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line[0] === "#") continue;
    line = line.replace(/"/g, "").trim();
    const f = line.includes("\t") ? line.split("\t") : line.split(",");
    if (f.length < 4) continue;
    const id = f[0]; if (id.toLowerCase() === "rsid") continue;
    const gt = (f.length >= 5 ? f[3] + f[4] : f[3]).toUpperCase().replace(/[^ACGT]/g, "");
    if (gt.length === 2) m.set(id, gt);
  }
  return m;
}

async function fetchFreqs(ids) {
  const res = await fetch("https://rest.ensembl.org/variation/homo_sapiens?pops=1", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ids }),
  });
  const j = await res.json();
  const table = {}; // rsid -> { refAllele, p:{pop:freqRef} }
  for (const rs in j) {
    const byPopAllele = {};
    for (const pop of POPS) byPopAllele[pop] = {};
    for (const e of j[rs].populations || []) {
      const m = /1000GENOMES:phase_3:(AFR|AMR|EAS|EUR|SAS)$/.exec(e.population);
      if (m) byPopAllele[m[1]][e.allele] = e.frequency;
    }
    const alleles = [...new Set(POPS.flatMap((p) => Object.keys(byPopAllele[p])))].filter((a) => /^[ACGT]$/.test(a));
    if (alleles.length !== 2) continue;
    const ref = alleles.sort()[0], other = alleles[1];
    const p = {};
    let ok = true;
    for (const pop of POPS) {
      let v = byPopAllele[pop][ref];
      if (v == null && byPopAllele[pop][other] != null) v = 1 - byPopAllele[pop][other];
      if (v == null) { ok = false; break; }
      p[pop] = Math.min(0.999, Math.max(0.001, v));
    }
    if (ok) table[rs] = { ref, other, p };
  }
  return table;
}

function admix(genome, table) {
  // collect usable SNP observations: dosage of ref allele + per-pop ref freq
  const obs = [];
  for (const rs in table) {
    const gt = genome.get(rs); if (!gt) continue;
    const { ref, other, p } = table[rs];
    let g = gt; const set = new Set([ref, other]);
    if (![...g].every((b) => set.has(b))) { const fg = flip(g); if ([...fg].every((b) => set.has(b))) g = fg; else continue; }
    const d = (g[0] === ref ? 1 : 0) + (g[1] === ref ? 1 : 0);
    obs.push({ d, p });
  }
  // EM over allele copies
  let q = Object.fromEntries(POPS.map((k) => [k, 1 / POPS.length]));
  for (let it = 0; it < 200; it++) {
    const sum = Object.fromEntries(POPS.map((k) => [k, 0]));
    let total = 0;
    for (const { d, p } of obs) {
      for (const [isRef, n] of [[true, d], [false, 2 - d]]) {
        if (!n) continue;
        let denom = 0; const r = {};
        for (const k of POPS) { r[k] = q[k] * (isRef ? p[k] : 1 - p[k]); denom += r[k]; }
        for (const k of POPS) { sum[k] += (r[k] / denom) * n; }
        total += n;
      }
    }
    for (const k of POPS) q[k] = sum[k] / total;
  }
  return { q, n: obs.length };
}

// Usage: node tools/ancestry.mjs <dna1.txt> <dna2.txt> ...
const files = process.argv.slice(2);
if (!files.length) { console.error("Usage: node tools/ancestry.mjs <dna1.txt> <dna2.txt> ..."); process.exit(1); }
const nameOf = (p) => p.split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
console.log("════════  GeneDuet — coarse continental ancestry  ════════");
console.log("Supervised admixture (EM) over AIMs, live 1000G frequencies.");
console.log("⚠️ COARSE — your testing company's own ethnicity estimate is more accurate.\n");

const table = await fetchFreqs(AIMS);
console.log(`Usable AIMs with full 1000G frequencies: ${Object.keys(table).length}\n`);
for (const path of files) {
  const { q, n } = admix(parseGenome(path), table);
  const line = POPS.map((k) => [POPNAME[k], q[k]]).sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0.02).map(([nm, v]) => `${nm} ${(v * 100).toFixed(0)}%`).join(" · ");
  console.log(`${nameOf(path).padEnd(10)} (${n} markers): ${line}`);
}
console.log("\n(Coarse 5-population model. For real admixture detail, see your AncestryDNA account.)\n");
