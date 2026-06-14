// GeneDuet UI — external module so the strict CSP (script-src 'self', no
// 'unsafe-inline') can stay locked down. Bilingual (EN/ES) via i18n.
import { parseText, analyzePerson, predictOffspring, relationship, estimateSex, MYTHS } from "./engine.js";
import { askLlama } from "./chat.js";
import { ui, tr } from "../data/i18n.js";

const genomes = {};
let lang = "en", analyzed = false, chatContext = "";
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// ---------- language ----------
function applyLang(l) {
  lang = l;
  document.documentElement.lang = l;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.innerHTML = ui(el.dataset.i18n, l); });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = ui(el.dataset.i18nPh, l); });
  const mn = document.getElementById("mythnote");
  if (mn) mn.innerHTML = ui("myths_intro", l) + MYTHS.map((m) => tr(m, l)).join(" · ") + ".";
  document.querySelectorAll("[data-lang]").forEach((a) => a.classList.toggle("on", a.dataset.lang === l));
  if (analyzed) render();
}
document.querySelectorAll("[data-lang]").forEach((a) => a.addEventListener("click", () => applyLang(a.dataset.lang)));

// myth note (translated in applyLang)
const disc = document.querySelector(".disc");
if (disc) disc.insertAdjacentHTML("beforebegin", `<p class="note" id="mythnote"></p>`);

// ---------- file loading ----------
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
      if (!g.total) throw new Error("no SNPs");
      genomes[slot] = g;
      el.classList.add("loaded");
      el.querySelector(".meta").textContent = `✓ ${g.vendor} · ${g.total.toLocaleString()} ${ui("snps", lang)}`;
    } catch (err) { el.querySelector(".meta").innerHTML = `<span class="err">${esc(err.message)}</span>`; }
    document.getElementById("run").disabled = !genomes.you;
  };
  r.readAsText(file);
}

// ---------- render ----------
document.getElementById("run").addEventListener("click", () => { analyzed = true; render(); });
function render() {
  const sensitive = document.getElementById("sensitive").checked;
  const minor = document.getElementById("minor").checked;
  const opt = (slot) => ({ sensitive: slot === "child" ? !minor : sensitive, adultOnset: slot === "child" ? !minor : sensitive, lang });
  const tabs = [], panels = {};
  for (const slot of ["you", "partner", "child"]) {
    if (!genomes[slot]) continue;
    const a = analyzePerson(genomes[slot], opt(slot));
    tabs.push(slot); panels[slot] = personHTML(genomes[slot], a, ui(`tab_${slot}`, lang));
  }
  if (genomes.you && genomes.partner) { tabs.push("child-pred"); panels["child-pred"] = offspringHTML(predictOffspring(genomes.you, genomes.partner, lang)); }
  if (genomes.you && genomes.child) { tabs.push("rel"); panels["rel"] = relHTML(); }

  const labels = { you: ui("tab_you", lang), partner: ui("tab_partner", lang), child: ui("tab_child", lang), "child-pred": ui("tab_pred", lang), rel: ui("tab_rel", lang) };
  const tabEl = document.getElementById("tabs"); tabEl.classList.remove("hide");
  tabEl.innerHTML = tabs.map((t, i) => `<div class="tab ${i ? "" : "active"}" data-t="${t}">${labels[t]}</div>`).join("");
  const out = document.getElementById("output");
  const show = (t) => { out.innerHTML = panels[t]; tabEl.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x.dataset.t === t)); };
  tabEl.querySelectorAll(".tab").forEach((x) => x.addEventListener("click", () => show(x.dataset.t)));
  show(tabs[0]);
  chatContext = reportText();
  document.getElementById("chat").classList.remove("hide");
}

function personHTML(g, a, name) {
  const sx = estimateSex(g, lang);
  let h = `<div class="card"><div class="cat">${esc(name)} — ${g.vendor}, ${g.total.toLocaleString()} ${ui("snps", lang)} · ${ui("genetic_sex", lang)}: ${esc(sx.sex)} (${esc(sx.conf)})</div>`;
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
  if (a.hidden) h += `<div class="note" style="margin-top:10px">${ui("hidden", lang)(a.hidden)}</div>`;
  return h + "</div>";
}
function offspringHTML(groups) {
  let h = `<div class="card"><div class="cat">${ui("pred_title", lang)}</div>`;
  h += `<div class="row"><span class="nm">${ui("sex_ratio", lang)}</span></div>`;
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
  const r = relationship(genomes.you, genomes.child, lang);
  return `<div class="card"><div class="cat">${ui("rel_title", lang)}</div>
    <div class="verdict" style="color:${r.parentChild ? "var(--good)" : "var(--warn)"}">${r.parentChild ? "✅" : "↔"} ${esc(r.verdict)}</div>
    <div class="row"><span class="nm">${ui("kinship", lang)}</span><span class="val">${r.kin.toFixed(4)}</span></div>
    <div class="row"><span class="nm">${ui("ibs0", lang)}</span><span class="val">${(r.ibs0r * 100).toFixed(3)}%</span></div>
    <div class="row"><span class="nm">${ui("snps_compared", lang)}</span><span class="val">${r.n.toLocaleString()}</span></div>
    <div class="note" style="margin-top:8px">${ui("rel_note", lang)}</div></div>`;
}

// ---------- chat context ----------
function reportText() {
  const sensitive = document.getElementById("sensitive").checked;
  const minor = document.getElementById("minor").checked;
  let t = "";
  for (const slot of ["you", "partner", "child"]) {
    if (!genomes[slot]) continue;
    const a = analyzePerson(genomes[slot], { sensitive: slot === "child" ? !minor : sensitive, adultOnset: slot === "child" ? !minor : sensitive, lang });
    t += `\n## ${ui(`tab_${slot}`, lang)} — ${estimateSex(genomes[slot], lang).sex}\n`;
    for (const grp of a.groups) for (const it of grp.items) {
      if (it.muted) continue;
      t += `- [${grp.category}] ${it.name}: ${it.genotype ? it.genotype + " → " : ""}${it.label}\n`;
    }
  }
  if (genomes.you && genomes.partner) {
    t += `\n## ${ui("pred_title", lang)}\n`;
    for (const grp of predictOffspring(genomes.you, genomes.partner, lang)) for (const it of grp.items)
      t += `- ${it.name}: ${it.dist}${it.risk ? ` (! ${it.risk.p}% ${it.risk.label})` : ""}\n`;
  }
  if (genomes.you && genomes.child) {
    const r = relationship(genomes.you, genomes.child, lang);
    t += `\n## ${ui("rel_title", lang)} = ${r.verdict} (kinship ${r.kin.toFixed(3)}, IBS0 ${(r.ibs0r * 100).toFixed(2)}%)\n`;
  }
  return t.trim();
}

// ---------- chat ----------
const chatlog = document.getElementById("chatlog");
const chatq = document.getElementById("chatq");
function addMsg(cls, text) { const d = document.createElement("div"); d.className = "msg " + cls; d.textContent = text; chatlog.appendChild(d); chatlog.scrollTop = chatlog.scrollHeight; return d; }
async function sendChat() {
  const q = chatq.value.trim(); if (!q) return; chatq.value = "";
  addMsg("you", q);
  const bot = addMsg("llama", "…");
  try {
    let first = true;
    await askLlama(q, chatContext, (tok) => { if (first) { bot.textContent = ""; first = false; } bot.textContent += tok; chatlog.scrollTop = chatlog.scrollHeight; }, lang);
    if (first) bot.textContent = "(no response)";
  } catch (e) {
    bot.classList.add("err");
    bot.textContent = `${ui("chat_fail", lang)}   (${e.message})`;
  }
}
document.getElementById("chatsend").addEventListener("click", sendChat);
chatq.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

applyLang("en");
