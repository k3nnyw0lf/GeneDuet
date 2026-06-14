// Local-only AI chat via Ollama (Llama). Talks to localhost:11434, so the report
// context never leaves the device. Requires Ollama running (`ollama run llama3.2`).
const OLLAMA = "http://localhost:11434/api/chat";
const MODEL = "llama3.2:3b";
const SYSTEM = `You are GeneDuet's friendly genetics explainer. Answer the user's questions about
THEIR DNA report using ONLY the REPORT CONTEXT below. If something isn't in the context, say
you don't have that result rather than guessing. You are NOT a doctor: never diagnose, never
give medical or treatment advice; for anything health-related, tell them to consult a doctor or
genetic counselor. Remind that polygenic scores and trait odds are tendencies, not certainties,
and that consumer-array data is not clinical-grade. Be concise, warm, and plain-spoken.`;

// Streams the answer; calls onToken(textChunk) as it arrives. Throws if Ollama unreachable.
export async function askLlama(question, context, onToken) {
  const res = await fetch(OLLAMA, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      options: { temperature: 0.3 },
      messages: [
        { role: "system", content: `${SYSTEM}\n\n=== REPORT CONTEXT ===\n${context}` },
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
