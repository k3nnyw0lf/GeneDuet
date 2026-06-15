// Builds population reference stats so PGS become real PERCENTILES instead of
// "relative to these people". For each score, fetches 1000G EUR effect-allele
// frequencies (Ensembl) and caches them; pgs.mjs then computes pop mean/SD
// (mean=Σ2pw, var=Σ2p(1-p)w²) → z → percentile. EUR reference (PGS are EUR-derived).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const COMP = { A: "T", T: "A", C: "G", G: "C" };
const comp = (b) => COMP[b] || b;
const CAP = 600; // max variants/score to look up (keeps Ensembl calls bounded)
const POPS = ["AFR", "AMR", "EAS", "EUR", "SAS"]; // 1000G super-populations for ancestry-matched percentiles

function parseScoring(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  let cols = null; const out = [];
  for (const line of lines) {
    if (!line || line[0] === "#") continue;
    const f = line.split("\t");
    if (!cols) { cols = {}; f.forEach((c, i) => (cols[c] = i)); continue; }
    const rsid = ((cols.hm_rsID != null ? f[cols.hm_rsID] : "") || (cols.rsID != null ? f[cols.rsID] : "") || "").trim();
    const ea = (f[cols.effect_allele] || "").toUpperCase();
    if (rsid && /^rs\d+$/.test(rsid) && ea) out.push({ rsid, ea });
  }
  return out;
}

async function ensembl(ids) {
  const r = await fetch("https://rest.ensembl.org/variation/homo_sapiens?pops=1", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!r.ok) return {};
  return r.json();
}

async function buildFreq(id, file) {
  const variants = parseScoring(file).slice(0, CAP);
  const byRsid = {}; variants.forEach((v) => (byRsid[v.rsid] = v.ea));
  const ids = Object.keys(byRsid);
  const p = {};
  for (let i = 0; i < ids.length; i += 200) {
    let j; try { j = await ensembl(ids.slice(i, i + 200)); } catch { continue; }
    for (const rs in j) {
      const ea = byRsid[rs], ce = comp(ea);
      const byPop = {};
      for (const e of j[rs].populations || []) {
        const m = /1000GENOMES:phase_3:(AFR|AMR|EAS|EUR|SAS)$/.exec(e.population);
        if (!m) continue;
        if (e.allele === ea) byPop[m[1]] = e.frequency;
        else if (byPop[m[1]] == null && e.allele === ce) byPop[m[1]] = e.frequency; // strand
      }
      if (POPS.every((P) => byPop[P] != null)) { // keep only variants with all super-pops
        p[rs] = {}; for (const P of POPS) p[rs][P] = Math.min(0.999, Math.max(0.001, byPop[P]));
      }
    }
  }
  writeFileSync(`private/pgs/${id}.freq.json`, JSON.stringify({ ref: "1000G", pops: POPS, n: Object.keys(p).length, p }));
  return Object.keys(p).length;
}

const main = [["PGS001232", "private/pgs/PGS001232.txt"], ["PGS000297", "private/pgs/PGS000297.txt"],
  ["PGS000298", "private/pgs/PGS000298.txt"], ["PGS000036", "private/pgs/PGS000036.txt"], ["PGS000833", "private/pgs/PGS000833.txt"]];
const panel = existsSync("private/pgs/panel.json") ? JSON.parse(readFileSync("private/pgs/panel.json", "utf8")).map((s) => [s.id, s.file]) : [];
for (const [id, file] of [...main, ...panel]) {
  if (!existsSync(file)) { console.log(`skip ${id} (no file)`); continue; }
  const n = await buildFreq(id, file);
  console.log(`✓ ${id}: cached EUR freqs for ${n} variants`);
}
console.log("\nDone — re-run pgs.mjs for percentiles.");
