export class AigError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Streams a Lovable AI Gateway Responses call, yielding parsed SSE events. */
export async function* streamResponses(body: Record<string, unknown>, signal?: AbortSignal) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AigError(500, "LOVABLE_API_KEY no configurada");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    signal: signal ?? null,
    headers: {
      Authorization: `Bearer ${key}`,
      "Lovable-API-Key": key,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: "openai/gpt-6-astra", stream: true, store: false, ...body }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    let msg = t;
    try {
      msg = JSON.parse(t)?.error?.message ?? JSON.parse(t)?.message ?? t;
    } catch {
      /* raw */
    }
    throw new AigError(res.status, msg || `Error ${res.status}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          yield JSON.parse(data) as { type: string; delta?: string; error?: { message?: string } };
        } catch {
          /* skip */
        }
      }
    }
  }
}
