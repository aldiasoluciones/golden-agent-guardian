import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  fileName: z.string().max(200),
  mime: z.string().max(100),
  dataUrl: z.string().max(7_000_000).optional(),
  text: z.string().max(50_000).optional(),
});

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["number", "vendorName", "nit", "bankAccount", "amount", "category", "dueDate", "description"],
  properties: {
    number: { type: "string" },
    vendorName: { type: "string" },
    nit: { type: "string" },
    bankAccount: { type: "string", description: "Banco y número de cuenta destino" },
    amount: { type: "number", description: "Total a pagar en COP" },
    category: { type: "string", enum: ["Suministros", "Tecnología", "Logística", "Servicios", "Otro"] },
    dueDate: { type: "string", description: "YYYY-MM-DD" },
    description: { type: "string" },
  },
};

export const extractInvoice = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const { streamResponses } = await import("./aig.server");
    const content: unknown[] = [{ type: "input_text", text: "Extrae los datos de esta factura colombiana. Si un campo falta, usa cadena vacía o 0." }];
    if (data.text) content.push({ type: "input_text", text: `Archivo ${data.fileName}:\n${data.text}` });
    else if (data.dataUrl?.startsWith("data:image/")) content.push({ type: "input_image", image_url: data.dataUrl });
    else if (data.dataUrl) content.push({ type: "input_file", filename: data.fileName, file_data: data.dataUrl });
    let out = "";
    try {
      for await (const ev of streamResponses({
        reasoning: { effort: "low" },
        input: [{ role: "user", content }],
        text: { format: { type: "json_schema", name: "invoice", strict: true, schema } },
      })) {
        if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta;
      }
      return { ok: true as const, invoice: JSON.parse(out) as Record<string, string | number> };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });
