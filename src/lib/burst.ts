import { addInvoice, runAgent, SAMPLES, type SampleKey } from "./agent";
import { store } from "./store";
import type { Channel } from "./types";

export const BURST_SIZE = 300;
export const BURST_PER_MINUTE = 300;

const MIX: SampleKey[] = ["valida", "valida", "valida", "validaUsd", "validaUsd", "nuevo", "noCuadra", "limite", "presupuesto", "cuenta", "tasaAlterada"];
const PHONES = ["+57 310 555 0142", "+57 315 220 8891", "+57 300 774 1203", "+1 305 555 0199"];
const MAILS = ["facturacion@papeleria-andina.co", "billing@devstudio-remote.com", "cobros@translogix.co", "cartera@aseointegral.co"];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;

export type BurstStats = { sent: number; done: number; pagada: number; frenada: number; activa: number; lote: number; avgMs: number; perMin: number; elapsed: number };

/** Sends BURST_SIZE invoices at BURST_PER_MINUTE through WhatsApp and email, decided only by the rule engine. */
export async function runBurst(onStats: (s: BurstStats) => void, signal: { stop: boolean }) {
  const t0 = performance.now();
  const gap = 60_000 / BURST_PER_MINUTE;
  const st: BurstStats = { sent: 0, done: 0, pagada: 0, frenada: 0, activa: 0, lote: 0, avgMs: 0, perMin: 0, elapsed: 0 };
  let totalMs = 0;
  const lote = `RAFAGA-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}`;
  const jobs: Promise<void>[] = [];
  for (let i = 0; i < BURST_SIZE && !signal.stop; i++) {
    const wait = t0 + i * gap - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const channel: Channel = i % 2 === 0 ? "whatsapp" : "correo";
    const sample = SAMPLES[pick(MIX)]();
    const inv = addInvoice({ ...sample, channel, sender: channel === "whatsapp" ? pick(PHONES) : pick(MAILS), source: `${channel === "whatsapp" ? "WhatsApp" : "Correo"} · ${lote} #${i + 1}` });
    st.sent++;
    jobs.push(
      (async () => {
        const a = performance.now();
        await runAgent(inv.id, { onCheck: () => {}, onText: () => {} }, { ai: false, delay: 0 });
        const ms = performance.now() - a;
        totalMs += ms;
        const r = store.get().invoices.find((x) => x.id === inv.id);
        if (r) {
          const latencyMs = Math.round(ms * 10) / 10;
          store.set((s) => ({ ...s, invoices: s.invoices.map((x) => (x.id === inv.id ? { ...x, latencyMs } : x)) }));
          if (r.status === "pagada") st.pagada++;
          else if (r.status === "frenada") st.frenada++;
          else if (r.queue === "lote") st.lote++;
          else st.activa++;
        }
        st.done++;
        st.elapsed = (performance.now() - t0) / 1000;
        st.avgMs = totalMs / st.done;
        st.perMin = st.elapsed > 1 ? Math.round((st.done / st.elapsed) * 60) : st.done * 60;
        onStats({ ...st });
      })(),
    );
  }
  await Promise.all(jobs);
  return st;
}
