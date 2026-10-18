import { useEffect, useRef, useState } from "react";
import type { Invoice } from "@/lib/types";

/** Freezes the visible invoice set; new arrivals appear hourly or on manual refresh. */
export function useHourlyRefresh(invoices: Invoice[], tenantId: string) {
  const [shown, setShown] = useState<Set<string> | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [note, setNote] = useState("");
  const latest = useRef(invoices);
  latest.current = invoices;
  const refresh = (manual: boolean) => {
    const ids = latest.current.map((i) => i.id);
    setShown((prev) => {
      const added = prev ? ids.filter((id) => !prev.has(id)).length : 0;
      if (manual) setNote(added ? `${added} factura(s) nueva(s) agregada(s).` : "Sin novedades.");
      return new Set(ids);
    });
    setLastRefresh(new Date());
  };
  useEffect(() => {
    refresh(false);
    const t = setInterval(() => refresh(false), 60 * 60 * 1000);
    return () => clearInterval(t);
  }, [tenantId]);
  const visible = shown ? invoices.filter((i) => shown.has(i.id)) : invoices;
  const waiting = shown ? invoices.filter((i) => !shown.has(i.id)).length : 0;
  return { visible, waiting, lastRefresh, note, refresh };
}

export function RefreshBar({ waiting, lastRefresh, note, refresh }: { waiting: number; lastRefresh: Date | null; note: string; refresh: (manual: boolean) => void }) {
  return <div className="space-y-1">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>Se actualiza sola cada hora{lastRefresh ? ` · última ${lastRefresh.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
      <button onClick={() => refresh(true)} className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-secondary">Refrescar ahora{waiting ? ` (${waiting} nuevas)` : ""}</button>
    </div>
    {note && <p className="text-xs text-primary" role="status">{note}</p>}
  </div>;
}
