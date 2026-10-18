import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Presentation-only UI translation (ES → EN). Never touches rules or decisions. */
export const translateTexts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ texts: z.array(z.string().max(2000)).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key || !data.texts.length) return { out: data.texts };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Translate each UI string from Spanish to natural English for a fintech app. Keep numbers, codes, currency, brand names (blinkagent, AL DIA, Blinka, QuickBooks, Stripe) and emojis unchanged. If a string is already English or not translatable, return it unchanged. Reply ONLY with a JSON object {\"t\": [..]} with the same length and order." },
          { role: "user", content: JSON.stringify(data.texts) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return { out: data.texts };
    try {
      const j = await res.json();
      const arr = JSON.parse(j.choices[0].message.content).t;
      if (Array.isArray(arr) && arr.length === data.texts.length) return { out: arr.map(String) };
    } catch { /* fallback */ }
    return { out: data.texts };
  });
