// Local-only AI chat via Ollama (Llama). Talks to localhost:11434, so the report
// context never leaves the device. Requires Ollama running (`ollama run llama3.2`).
const OLLAMA = "http://localhost:11434/api/chat";
const MODEL = "llama3.2:3b";
const SYSTEM = `You are GeneDuet's friendly genetics explainer. Answer the user's questions about
THEIR DNA report using the REPORT CONTEXT below; if a result isn't there, say so rather than
guessing. You may give general, evidence-based lifestyle, nutrition and exercise guidance, but
never diagnose conditions or prescribe medical treatment — for medical concerns recommend a
doctor or genetic counselor. Polygenic scores and trait odds are tendencies, not certainties;
consumer-array data is not clinical-grade. Be concise, warm and plain-spoken.

GUIDANCE RULES (be honest about genetics' limits):
- WEIGHT LOSS: a sustained calorie deficit is what drives fat loss. Gene-matched diets
  (low-carb vs low-fat by genotype) are NOT proven to beat general healthy eating — the Stanford
  DIETFITS trial found no gene–diet benefit. Recommend high-protein, high-fiber, whole foods and
  a modest deficit; use the person's markers (FTO, caffeine, lactose, alcohol) only as minor nudges.
- MUSCLE GAIN: progressive-overload resistance training + enough protein (~1.6–2.2 g/kg/day) builds
  muscle for everyone. ACTN3 only hints power-vs-endurance leanings. Name concrete compound lifts
  (squat, deadlift, bench press, row, overhead press, pull-up) plus progressive overload and rest.
- ALLERGIES: consumer-array DNA CANNOT predict specific allergies (peanut, pollen, etc.); at most it
  hints a general atopy/eczema tendency. Note lactose intolerance is an enzyme issue (not an allergy)
  and celiac is autoimmune. Recommend an allergist/doctor for real allergy testing.
Never present a genetic nudge as a strong determinant.`;

// Streams the answer; calls onToken(textChunk) as it arrives. Throws if Ollama unreachable.
// lang "es" makes Llama reply in Spanish.
export async function askLlama(question, context, onToken, lang = "en") {
  const langLine = lang === "es" ? "\n\nIMPORTANT: Always reply in Spanish (español)." : "";
  const res = await fetch(OLLAMA, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      options: { temperature: 0.3 },
      messages: [
        { role: "system", content: `${SYSTEM}${langLine}\n\n=== REPORT CONTEXT ===\n${context}` },
        { role: "user", content: question },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "", buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try { const t = JSON.parse(line).message?.content || ""; if (t) { full += t; onToken(t); } } catch { /* skip partial */ }
    }
  }
  return full;
}
