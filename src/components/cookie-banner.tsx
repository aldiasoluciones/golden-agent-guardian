import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "aldia-cookie-consent";
export type Consent = { essential: true; analytics: boolean; at: string };

export function openCookiePrefs() {
  window.dispatchEvent(new Event("aldia-cookie-open"));
}

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (!raw) setOpen(true);
    else {
      try { setAnalytics(!!(JSON.parse(raw) as Consent).analytics); } catch { setOpen(true); }
    }
    const h = () => { setOpen(true); setConfig(true); };
    window.addEventListener("aldia-cookie-open", h);
    return () => window.removeEventListener("aldia-cookie-open", h);
  }, []);

  const save = (a: boolean) => {
    const c: Consent = { essential: true, analytics: a, at: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(c));
    setAnalytics(a);
    setOpen(false);
    setConfig(false);
  };

  if (!open) return null;
  return (
    <div role="dialog" aria-label="Preferencias de cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-lg">
      <p className="font-semibold">Cookies y almacenamiento local</p>
      <p className="mt-1 text-muted-foreground">
        Usamos almacenamiento esencial para guardar tu empresa activa, políticas, facturas de prueba e idioma en este navegador. Las analíticas operativas son opcionales. Tratamiento conforme a la Ley 1581 de 2012, GDPR y LGPD.{" "}
        <Link to="/privacidad" className="underline">Ver política</Link>
      </p>
      {config && (
        <div className="mt-3 space-y-2 rounded-md border border-border p-3">
          <label className="flex items-center justify-between gap-3">
            <span>Esenciales (sesión, empresa activa, idioma) · siempre activas</span>
            <input type="checkbox" checked disabled />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Analíticas operativas (métricas de uso anónimas)</span>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
          </label>
        </div>
      )}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {config ? (
          <button onClick={() => save(analytics)} className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">Guardar preferencias</button>
        ) : (
          <button onClick={() => setConfig(true)} className="rounded-md border border-border px-3 py-1.5">Configurar</button>
        )}
        <button onClick={() => save(false)} className="rounded-md border border-border px-3 py-1.5">Solo esenciales</button>
        <button onClick={() => save(true)} className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground">Aceptar todo</button>
      </div>
    </div>
  );
}
