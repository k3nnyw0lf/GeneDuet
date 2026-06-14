#!/usr/bin/env node
// GeneDuet — local DNA report + trio test harness (pure Node, zero dependencies).
//
// Usage:
//   node tools/predict.mjs <A> <B> [child] [flags]
// Flags:
//   --sensitive        include adult-onset / sensitive health for the PARENTS
//                       (APOE, Parkinson's, BRCA, T2D, AMD, CAD)
//   --minor-health     also show adult-onset/sensitive results for the CHILD
//                       (off by default — ACMG advises against for minors)
//
// Reads raw files from disk and prints ONLY computed results. Raw genotypes never
// leave your machine. Educational — NOT a medical device.

import { readFileSync } from "node:fs";
import { CATALOG, CATEGORIES, MODELS, MYTHS } from "../data/catalog.mjs";

// ---------- strand helpers ----------
const COMP = { A: "T", T: "A", C: "G", G: "C" };
const comp = (b) => COMP[b] || b;
const sortGT = (gt) => gt.split("").sort().join("");
// Palindromic SNPs (alleles are complements: A/T or C/G) can't be strand-resolved
// from array data alone, so we must NOT assert a phenotype for them.
const isPalin = (al) => al && al.length === 2 && comp(al[0]) === al[1];
function toAlphabet(gt, allowed) {
  if (!gt || gt.length !== 2) return null;
  const set = new Set(allowed);
  if ([...gt].every((b) => set.has(b))) return gt;
  const flip = [...gt].map(comp).join("");
  if ([...flip].every((b) => set.has(b))) return flip;
  return null;
}

// ---------- parsing ----------
function detectVendor(text) {
  const h = text.slice(0, 4000);
  if (/23andMe/i.test(h)) return "23andMe";
  if (/AncestryDNA/i.test(h)) return "AncestryDNA";
  if (/MyHeritage/i.test(h)) return "MyHeritage";
  if (/Family ?Tree ?DNA|FTDNA/i.test(h)) return "FamilyTreeDNA";
  return "unknown";
}
function parseGenome(path) {
  const text = readFileSync(path, "utf8");
  const vendor = detectVendor(text);
  const map = new Map();    // ACGT-only (traits/health)
  const raw = new Map();    // includes I/D/-- (for indel models)
  let total = 0;
  for (let line of text.split(/\r?\n/)) {
    if (!line || line[0] === "#") continue;
    line = line.replace(/"/g, "").trim();
    if (!line) continue;
    const f = line.includes("\t") ? line.split("\t") : line.split(",");
    if (f.length < 4) continue;
    const rsid = f[0].trim();
    if (rsid.toLowerCase() === "rsid") continue;
    let token = (f.length >= 5 ? f[3] + f[4] : f[3]).toUpperCase();
    if (token.length === 2) raw.set(rsid, token);
    const clean = token.replace(/[^ACGT]/g, "");
    if (clean.length === 2) { map.set(rsid, clean); total++; }
  }
  return { vendor, map, raw, total };
}

// ---------- inheritance ----------
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

// ---------- formatting ----------
const pct = (x) => (x * 100).toFixed(0) + "%";
const fmt = (d) => Object.entries(d).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v)}`).join(" · ");
const topLabel = (pm) => pm ? Object.entries(pm).sort((a, b) => b[1] - a[1])[0][0] : null;

function getter(genome) {
  return (rsid, alleles) => {
    if (alleles === null) return genome.raw.get(rsid) || null; // indel-aware
    const r = genome.map.get(rsid);
    return r ? toAlphabet(r, alleles) : null;
  };
}

// ---------- per-person report ----------
function personReport(genome, { name, sensitive, adultOnset }) {
  const g = getter(genome);
  console.log(`\n████  ${name}  —  ${genome.vendor}, ${genome.total.toLocaleString()} SNPs  ████`);
  let hidden = 0;
  for (const cat of CATEGORIES) {
    const entries = CATALOG.filter((e) => e.category === cat);
    const lines = [];
    for (const e of entries) {
      if (e.sensitive && !sensitive) { hidden++; continue; }
      if (e.adultOnset && !adultOnset) { hidden++; continue; }
      const tags = [e.conf ? `[${e.conf}]` : "", e.carrier ? "🧬carrier" : "", e.sensitive ? "🔒" : ""].filter(Boolean).join(" ");
      if (e.model) {
        const r = MODELS[e.model](g);
        lines.push(`  • ${e.name} ${tags}\n      ${r.label}${r.detail ? `  (${r.detail})` : ""}`);
      } else {
        const gt = g(e.rsid, e.alleles);
        if (!gt) { lines.push(`  • ${e.name} ${tags} — not typed on this file`); continue; }
        if (isPalin(e.alleles)) { lines.push(`  • ${e.name} ${tags}: ${gt} → ⚠️ strand-ambiguous (palindromic SNP) — not reliably callable from array data`); continue; }
        const label = topLabel(e.pheno[sortGT(gt)]) || "uncommon genotype";
        const warn = /disease|two copies|deficiency|high|PATHO/i.test(label) ? " ⚠️" : "";
        lines.push(`  • ${e.name} ${tags}: ${gt} → ${label}${warn}${e.note ? `\n      note: ${e.note}` : ""}`);
      }
    }
    if (lines.length) { console.log(`\n  ── ${cat} ──`); lines.forEach((l) => console.log(l)); }
  }
  if (hidden) console.log(`\n  (${hidden} sensitive/adult-onset results hidden — re-run with the right flag to reveal)`);
}

// ---------- offspring prediction ----------
function offspring(A, B) {
  const ga = getter(A), gb = getter(B);
  console.log(`\n\n══════  PREDICTED CHILD (Parent A × Parent B)  ══════`);
  for (const cat of CATEGORIES) {
    const entries = CATALOG.filter((e) => e.category === cat && e.heritable && e.pheno);
    const lines = [];
    for (const e of entries) {
      if (isPalin(e.alleles)) continue; // strand-ambiguous; don't predict
      const a = ga(e.rsid, e.alleles), b = gb(e.rsid, e.alleles);
      if (!a || !b) continue;
      const dist = childPhenotypeDist(a, b, e.pheno);
      const risk = Object.entries(dist).find(([k]) => /disease|two copies|deficiency/i.test(k));
      const warn = risk ? `  ⚠️ ${pct(risk[1])} chance: ${risk[0]}` : "";
      lines.push(`  • ${e.name}: ${a} × ${b} → ${fmt(dist)}${warn}`);
    }
    if (lines.length) { console.log(`\n  ── ${cat} ──`); lines.forEach((l) => console.log(l)); }
  }
}

// ---------- trio validation ----------
function validateTrio(A, B, child, childName) {
  const eq = (x, y) => x === y || x === comp(y);
  const inGT = (x, gt) => eq(x, gt[0]) || eq(x, gt[1]);
  const palin = (gt) => gt[0] !== gt[1] && eq(gt[0], gt[1]); // A/T or C/G het
  let checked = 0, ok = 0;
  for (const [rsid, c] of child.map) {
    const a = A.map.get(rsid), b = B.map.get(rsid);
    if (!a || !b || palin(c) || palin(a) || palin(b)) continue;
    const [c1, c2] = c;
    if ((inGT(c1, a) && inGT(c2, b)) || (inGT(c2, a) && inGT(c1, b))) ok++;
    checked++;
  }
  const r = checked ? ok / checked : 0;
  console.log(`\n\n══════  TRIO VALIDATION — is ${childName} the child of A & B?  ══════`);
  console.log(`  SNPs checked: ${checked.toLocaleString()}   consistent: ${ok.toLocaleString()} (${(r * 100).toFixed(2)}%)`);
  console.log(r >= 0.99 ? "  ✅ consistent with a true parent–parent–child trio."
    : r >= 0.9 ? "  ⚠️ mostly consistent — noise/strand or one parent not biological."
    : "  ❌ NOT consistent with both being biological parents.");
}

// ---------- main ----------
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const files = args.filter((a) => !a.startsWith("--"));
const [pA, pB, pC] = files;
if (!pA || !pB) { console.error("Usage: node tools/predict.mjs <A> <B> [child] [--sensitive] [--minor-health]"); process.exit(1); }

const A = parseGenome(pA), B = parseGenome(pB), C = pC ? parseGenome(pC) : null;
const showSensitive = flags.has("--sensitive");

console.log("\n════════════════  GeneDuet — full DNA report  ════════════════");
console.log("Educational only · not a medical device · raw DNA stays on this machine.");

personReport(A, { name: "PARENT A", sensitive: showSensitive, adultOnset: showSensitive });
personReport(B, { name: "PARENT B", sensitive: showSensitive, adultOnset: showSensitive });
if (C) personReport(C, { name: "CHILD", sensitive: flags.has("--minor-health"), adultOnset: flags.has("--minor-health") });

offspring(A, B);
if (C) validateTrio(A, B, C, "CHILD");

console.log(`\n\n── Deliberately NOT predicted (no real single-gene basis) ──`);
console.log("  " + MYTHS.join(" · "));
console.log("\nConfirm anything important with a clinical lab / genetic counselor.\n");
