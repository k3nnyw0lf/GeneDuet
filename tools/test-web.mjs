// Verifies the browser engine (web/engine.js) on the synthetic fixtures, so we
// know the same code the web app runs produces correct results — without a browser.
import { readFileSync } from "node:fs";
import { parseText, analyzePerson, predictOffspring, relationship } from "../web/engine.js";

const read = (p) => parseText(readFileSync(p, "utf8"));
const dad = read("tools/fixtures/dad.txt"), mom = read("tools/fixtures/mom.txt"), son = read("tools/fixtures/son.txt");

let pass = 0, fail = 0;
const check = (name, cond) => { (cond ? pass++ : fail++); console.log(`${cond ? "✓" : "✗ FAIL"}  ${name}`); };

check("dad parsed as 23andMe with SNPs", dad.vendor === "23andMe" && dad.total > 0);
const a = analyzePerson(dad, { sensitive: true, adultOnset: true });
check("analyzePerson returns category groups", a.groups.length >= 5);
const sickle = a.groups.flatMap((g) => g.items).find((i) => i.name.startsWith("Sickle"));
check("palindromic sickle flagged, not 'disease'", sickle && /strand-ambiguous/.test(sickle.label));
const apoe = a.groups.flatMap((g) => g.items).find((i) => i.name.startsWith("APOE"));
check("APOE model resolves a genotype", apoe && /e\d\/e\d/.test(apoe.label));

const aMinor = analyzePerson(son, { sensitive: false, adultOnset: false });
check("minor: sensitive results hidden", aMinor.hidden > 0);

const off = predictOffspring(dad, mom);
const eye = off.flatMap((g) => g.items).find((i) => i.name === "Eye color");
check("offspring eye-color distribution present", eye && /%/.test(eye.dist));

// Relationship needs realistic heterozygosity, so simulate a true trio + an
// unrelated person with a deterministic RNG (reproducible, no Math.random).
let seed = 12345; const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const al = () => (rng() < 0.5 ? "A" : "G");
const pick = (g) => g[rng() < 0.5 ? 0 : 1];
const mk = () => ({ map: new Map(), raw: new Map() });
const simDad = mk(), simChild = mk(), simUnrel = mk();
for (let i = 0; i < 4000; i++) {
  const rs = "rs" + i, d = al() + al(), m = al() + al();
  simDad.map.set(rs, d);
  simChild.map.set(rs, pick(d) + pick(m));
  simUnrel.map.set(rs, al() + al());
}
check("simulated true trio reads as parent–child", relationship(simDad, simChild).verdict === "parent–child");
check("unrelated pair reads as unrelated", relationship(simDad, simUnrel).verdict === "unrelated");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
