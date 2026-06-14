// GeneDuet shared core — pure, browser-safe (no fs/DOM). Used by web/index.html
// and by tools/test-web.mjs. Single source of truth for analysis logic.
import { CATALOG, CATEGORIES, MODELS } from "../data/catalog.mjs";

const COMP = { A: "T", T: "A", C: "G", G: "C" };
const comp = (b) => COMP[b] || b;
const sortGT = (g) => g.split("").sort().join("");
export const isPalin = (al) => al && al.length === 2 && comp(al[0]) === al[1];

function toAlphabet(gt, allowed) {
  if (!gt || gt.length !== 2) return null;
  const set = new Set(allowed);
  if ([...gt].every((b) => set.has(b))) return gt;
  const f = [...gt].map(comp).join("");
  if ([...f].every((b) => set.has(b))) return f;
  return null;
}

export function parseText(text) {
  const head = text.slice(0, 4000);
  const vendor = /23andMe/i.test(head) ? "23andMe" : /AncestryDNA/i.test(head) ? "AncestryDNA"
    : /MyHeritage/i.test(head) ? "MyHeritage" : /Family ?Tree ?DNA|FTDNA/i.test(head) ? "FamilyTreeDNA" : "unknown";
  const map = new Map(), raw = new Map();
  let total = 0;
  for (let line of text.split(/\r?\n/)) {
    if (!line || line[0] === "#") continue;
    line = line.replace(/"/g, "").trim();
    if (!line) continue;
    const f = line.includes("\t") ? line.split("\t") : line.split(",");
    if (f.length < 4) continue;
    const rsid = f[0].trim();
    if (rsid.toLowerCase() === "rsid") continue;
    let tok = (f.length >= 5 ? f[3] + f[4] : f[3]).toUpperCase();
    if (tok.length === 2) raw.set(rsid, tok);
    const clean = tok.replace(/[^ACGT]/g, "");
    if (clean.length === 2) { map.set(rsid, clean); total++; }
  }
  return { vendor, map, raw, total };
}

const getter = (genome) => (rsid, alleles) => {
  if (alleles === null) return genome.raw.get(rsid) || null;
  const r = genome.map.get(rsid);
  return r ? toAlphabet(r, alleles) : null;
};
const alleleDist = (gt) => { const [a, b] = gt; return a === b ? { [a]: 1 } : { [a]: .5, [b]: .5 }; };
function childGenotypeDist(a, b) {
  const da = alleleDist(a), db = alleleDist(b), o = {};
  for (const x in da) for (const y in db) { const g = sortGT(x + y); o[g] = (o[g] || 0) + da[x] * db[y]; }
  return o;
}
function childPhenotypeDist(a, b, pheno) {
  const gd = childGenotypeDist(a, b), o = {};
  for (const g in gd) { const pm = pheno[g]; if (!pm) continue; for (const p in pm) o[p] = (o[p] || 0) + gd[g] * pm[p]; }
  return o;
}
const topLabel = (pm) => pm ? Object.entries(pm).sort((a, b) => b[1] - a[1])[0][0] : null;
export const fmtDist = (d) => Object.entries(d).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(" · ");

export function analyzePerson(genome, { sensitive = false, adultOnset = false } = {}) {
  const g = getter(genome);
  const out = []; let hidden = 0;
  for (const cat of CATEGORIES) {
    const items = [];
    for (const e of CATALOG.filter((x) => x.category === cat)) {
      if ((e.sensitive && !sensitive) || (e.adultOnset && !adultOnset)) { hidden++; continue; }
      if (e.model) {
        const r = MODELS[e.model](g);
        items.push({ name: e.name, conf: e.conf, sensitive: !!e.sensitive, carrier: !!e.carrier, label: r.label, detail: r.detail });
        continue;
      }
      const gt = g(e.rsid, e.alleles);
      if (!gt) { items.push({ name: e.name, conf: e.conf, carrier: !!e.carrier, label: "not typed on this file", muted: true }); continue; }
      if (isPalin(e.alleles)) { items.push({ name: e.name, conf: e.conf, carrier: !!e.carrier, genotype: gt, label: "strand-ambiguous (palindromic SNP) — not reliably callable", warn: true }); continue; }
      const label = topLabel(e.pheno[sortGT(gt)]) || "uncommon genotype";
      items.push({ name: e.name, conf: e.conf, carrier: !!e.carrier, sensitive: !!e.sensitive, genotype: gt, label, note: e.note, warn: /disease|two copies|deficiency|high|increased/i.test(label) });
    }
    if (items.length) out.push({ category: cat, items });
  }
  return { groups: out, hidden };
}

export function predictOffspring(A, B) {
  const ga = getter(A), gb = getter(B), out = [];
  for (const cat of CATEGORIES) {
    const items = [];
    for (const e of CATALOG.filter((x) => x.category === cat && x.heritable && x.pheno)) {
      if (isPalin(e.alleles)) continue;
      const a = ga(e.rsid, e.alleles), b = gb(e.rsid, e.alleles);
      if (!a || !b) continue;
      const dist = childPhenotypeDist(a, b, e.pheno);
      const risk = Object.entries(dist).find(([k]) => /disease|two copies|deficiency/i.test(k));
      items.push({ name: e.name, a, b, dist: fmtDist(dist), risk: risk ? { p: Math.round(risk[1] * 100), label: risk[0] } : null });
    }
    if (items.length) out.push({ category: cat, items });
  }
  return out;
}

// IBS0 + KING kinship between two genomes
export function relationship(A, B) {
  let n = 0, ibs0 = 0, het1 = 0, het2 = 0, hethet = 0, ibs2 = 0;
  for (const [rs, g1] of A.map) {
    const g2 = B.map.get(rs); if (!g2) continue;
    const s1 = sortGT(g1), s2 = sortGT(g2);
    n++;
    const h1 = s1[0] !== s1[1], h2 = s2[0] !== s2[1];
    if (h1) het1++; if (h2) het2++; if (h1 && h2) hethet++;
    if (!h1 && !h2 && s1[0] !== s2[0]) ibs0++;
    if (s1 === s2) ibs2++;
  }
  const kin = (hethet - 2 * ibs0) / ((het1 + het2) || 1);
  const ibs0r = ibs0 / (n || 1);
  let verdict;
  if (kin > 0.354) verdict = "identical / same sample";
  else if (kin > 0.177) verdict = ibs0r < 0.012 ? "parent–child" : "full siblings";
  else if (kin > 0.0884) verdict = "second-degree (half-sib / grandparent / aunt-uncle)";
  else if (kin > 0.0442) verdict = "third-degree (first cousin)";
  else verdict = "unrelated";
  return { n, kin, ibs0r, conc: ibs2 / (n || 1), verdict };
}
