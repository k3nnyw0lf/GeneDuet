// Discovers + downloads a panel of published disease/trait polygenic scores from
// the PGS Catalog, picking a tractable GRCh37 score per condition, and writes
// private/pgs/panel.json for pgs.mjs to run. Real weights only — nothing invented.
import { writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// term = PGS Catalog search term; flags drive gating in pgs.mjs.
const TARGETS = [
  { term: "coronary artery disease", label: "Coronary artery disease", adultOnset: true },
  { term: "atrial fibrillation", label: "Atrial fibrillation", adultOnset: true },
  { term: "hypertension", label: "High blood pressure", adultOnset: true },
  { term: "asthma", label: "Asthma" },
  { term: "inflammatory bowel disease", label: "Inflammatory bowel disease", adultOnset: true },
  { term: "rheumatoid arthritis", label: "Rheumatoid arthritis", adultOnset: true },
  { term: "breast carcinoma", label: "Breast cancer", adultOnset: true, sensitive: true },
  { term: "prostate carcinoma", label: "Prostate cancer", adultOnset: true, sensitive: true },
  { term: "Alzheimer disease", label: "Alzheimer's disease", adultOnset: true, sensitive: true },
  { term: "major depressive disorder", label: "Major depression", adultOnset: true, sensitive: true },
];

const j = async (u, opt) => (await fetch(u, opt)).json();
async function searchIds(term) {
  const r = await j(`https://www.pgscatalog.org/rest/trait/search?term=${encodeURIComponent(term)}`);
  const ids = [];
  for (const t of r.results || []) ids.push(...(t.associated_pgs_ids || []));
  return [...new Set(ids)];
}
async function pickScore(ids) {
  let best = null;
  for (const id of ids.slice(0, 8)) {
    let m; try { m = await j(`https://www.pgscatalog.org/rest/score/${id}`); } catch { continue; }
    const n = m.variants_number || 0;
    if (n < 20 || n > 200000) continue; // tractable + meaningful
    if (!best || n < best.n) best = { id, n };
  }
  return best;
}
async function download(id) {
  const url = `https://ftp.ebi.ac.uk/pub/databases/spot/pgs/scores/${id}/ScoringFiles/Harmonized/${id}_hmPOS_GRCh37.txt.gz`;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(`private/pgs/${id}.txt`, gunzipSync(buf));
}

const panel = [];
for (const t of TARGETS) {
  try {
    const ids = await searchIds(t.term);
    const pick = await pickScore(ids);
    if (!pick) { console.log(`✗ ${t.label}: no tractable score`); continue; }
    await download(pick.id);
    panel.push({ label: t.label, id: pick.id, file: `private/pgs/${pick.id}.txt`, variants: pick.n, sensitive: !!t.sensitive, adultOnset: !!t.adultOnset });
    console.log(`✓ ${t.label}: ${pick.id} (${pick.n.toLocaleString()} variants)`);
  } catch (e) { console.log(`✗ ${t.label}: ${e.message}`); }
}
writeFileSync("private/pgs/panel.json", JSON.stringify(panel, null, 2));
console.log(`\nWrote panel.json with ${panel.length} scores.`);
