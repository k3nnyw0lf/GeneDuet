// GeneDuet UI — external module so the strict CSP (script-src 'self', no
// 'unsafe-inline') can stay locked down. Imports the shared engine.
import { parseText, analyzePerson, predictOffspring, relationship } from "./engine.js";
const genomes = {}, names = { you: "You", partner: "Partner", child: "Child" };

document.querySelectorAll(".drop").forEach((d) => {
  const slot = d.dataset.slot, input = d.querySelector("input");
  d.addEventListener("click", () => input.click());
  d.addEventListener("dragover", (e) => { e.preventDefault(); d.classList.add("over"); });
  d.addEventListener("dragleave", () => d.classList.remove("over"));
  d.addEventListener("drop", (e) => { e.preventDefault(); d.classList.remove("over"); if (e.dataTransfer.files[0]) load(slot, d, e.dataTransfer.files[0]); });
  input.addEventListener("change", () => { if (input.files[0]) load(slot, d, input.files[0]); });
});
function load(slot, el, file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const g = parseText(r.result);
      if (!g.total) throw new Error("no SNPs found — is this a raw DNA file?");
      genomes[slot] = g;
      el.classList.add("loaded");
      el.querySelector(".meta").textContent = `✓ ${g.vendor} · ${g.total.toLocaleString()} SNPs`;
    } catch (err) { el.querySelector(".meta").innerHTML = `<span class="err">${err.message}</span>`; }
    document.getElementById("run").disabled = !genomes.you;
  };
  r.readAsText(file);
}

document.getElementById("run").addEventListener("click", render);
function render() {
  const sensitive = document.getElementById("sensitive").checked;
  const minor = document.getElementById("minor").checked;
  const tabs = [], panels = {};

  for (const slot of ["you", "partner", "child"]) {
    if (!genomes[slot]) continue;
    const isChild = slot === "child";
    const a = analyzePerson(genomes[slot], { sensitive: isChild ? !minor : sensitive, adultOnset: isChild ? !minor : sensitive });
    tabs.push(slot); panels[slot] = personHTML(genomes[slot], a, names[slot]);
  }
  if (genomes.you && genomes.partner) { tabs.push("child-pred"); panels["child-pred"] = offspringHTML(predictOffspring(genomes.you, genomes.partner)); }
  if (genomes.you && genomes.child) { tabs.push("rel"); panels["rel"] = relHTML(); }

  const labels = { you: "You", partner: "Partner", child: "Child", "child-pred": "Predicted child", rel: "Relationship" };
  const tabEl = document.getElementById("tabs"); tabEl.classList.remove("hide");
  tabEl.innerHTML = tabs.map((t, i) => `<div class="tab ${i ? "" : "active"}" data-t="${t}">${labels[t]}</div>`).join("");
  const out = document.getElementById("output");
  const show = (t) => { out.innerHTML = panels[t]; tabEl.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x.dataset.t === t)); };
  tabEl.querySelectorAll(".tab").forEach((x) => x.addEventListener("click", () => show(x.dataset.t)));
  show(tabs[0]);
}
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
function personHTML(g, a, name) {
  let h = `<div class="card"><div class="cat">${esc(name)} — ${g.vendor}, ${g.total.toLocaleString()} SNPs</div>`;
  for (const grp of a.groups) {
    h += `<div class="cat">${esc(grp.category)}</div>`;
    for (const it of grp.items) {
      const badges = `${it.conf ? `<span class="badge">${it.conf}</span>` : ""}${it.carrier ? `<span class="badge">carrier</span>` : ""}${it.sensitive ? `<span class="badge">🔒</span>` : ""}`;
      const val = it.muted ? `<span class="note">${esc(it.label)}</span>`
        : `${it.genotype ? `<span class="gt">${esc(it.genotype)}</span> ` : ""}${esc(it.label)}${it.detail ? ` <span class="note">(${esc(it.detail)})</span>` : ""}`;
      h += `<div class="row ${it.warn ? "warn" : ""}"><span class="nm">${esc(it.name)}${badges}</span><span class="val">${val}</span></div>`;
      if (it.note) h += `<div class="note">${esc(it.note)}</div>`;
    }
  }
  if (a.hidden) h += `<div class="note" style="margin-top:10px">${a.hidden} sensitive/adult-onset result(s) hidden — toggle above to reveal.</div>`;
  return h + "</div>";
}
function offspringHTML(groups) {
  let h = `<div class="card"><div class="cat">Predicted child (You × Partner)</div>`;
  for (const grp of groups) {
    h += `<div class="cat">${esc(grp.category)}</div>`;
    for (const it of grp.items) {
      const risk = it.risk ? ` <span class="val warn">⚠️ ${it.risk.p}% ${esc(it.risk.label)}</span>` : "";
      h += `<div class="row"><span class="nm">${esc(it.name)} <span class="gt">${esc(it.a)}×${esc(it.b)}</span></span><span class="val">${esc(it.dist)}${risk}</span></div>`;
    }
  }
  return h + "</div>";
}
function relHTML() {
  const r = relationship(genomes.you, genomes.child);
  const ok = r.verdict === "parent–child";
  return `<div class="card"><div class="cat">Relationship — You vs Child</div>
    <div class="verdict" style="color:${ok ? "var(--good)" : "var(--warn)"}">${ok ? "✅" : "↔"} ${esc(r.verdict)}</div>
    <div class="row"><span class="nm">KING kinship</span><span class="val">${r.kin.toFixed(4)}</span></div>
    <div class="row"><span class="nm">IBS0 (exclusions)</span><span class="val">${(r.ibs0r * 100).toFixed(3)}%</span></div>
    <div class="row"><span class="nm">SNPs compared</span><span class="val">${r.n.toLocaleString()}</span></div>
    <div class="note" style="margin-top:8px">Genetically rigorous, but not a court-admissible paternity test.</div></div>`;
}
