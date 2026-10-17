import { getTenants, flag } from "@/lib/tenants";
import { CookieBanner, openCookiePrefs } from "@/components/cookie-banner";
import { setTenant, useTenantId } from "@/lib/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import aldiaMark from "../assets/aldia-mark.png";
import blinkaLogo from "../assets/blinka-logo.svg";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { setLang, t, useLang, type Lang, type TKey } from "../lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta página no existe.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">La página no cargó</h1>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "blinkagent by AL DIA" },
      { name: "description", content: "Agente de IA que paga cuentas dentro de las reglas de la empresa y pide permiso cuando algo se sale de ellas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;600&family=Inter:wght@400;450;500;600&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV: { to: "/" | "/analitica" | "/bandeja" | "/canales" | "/politicas" | "/auditoria" | "/api-docs"; key: TKey }[] = [
  { to: "/", key: "nav_treasury" },
  { to: "/analitica", key: "nav_analytics" },
  { to: "/bandeja", key: "nav_inbox" },
  { to: "/canales", key: "nav_channels" },
  { to: "/politicas", key: "nav_policies" },
  { to: "/auditoria", key: "nav_audit" },
  { to: "/api-docs", key: "nav_api" },
];

function LangSwitch() {
  const lang = useLang();
  return (
    <div className="flex overflow-hidden rounded-md border border-border font-mono text-xs">
      {(["es", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 uppercase ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function TenantSwitch() {
  const id = useTenantId();
  const tenants = getTenants();
  return (
    <select
      aria-label="Empresa cliente"
      value={id}
      onChange={(e) => setTenant(e.target.value)}
      className="max-w-[220px] rounded-md border border-border bg-background px-2 py-1 text-xs"
    >
      {tenants.map((t) => (
        <option key={t.id} value={t.id}>
          {flag(t.country)} {t.name} · {t.profile}
        </option>
      ))}
    </select>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const lang = useLang();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-6 py-3">
            <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
              <img src={blinkaLogo} alt="Isotipo Blinka" width={20} height={30} className="h-7 w-auto" />
              <span className="text-lg font-semibold tracking-tight">blinkagent</span>
              <span className="flex items-center gap-1 border-l border-border pl-2 font-mono text-xs font-normal text-muted-foreground"><img src={aldiaMark} alt="AL DIA" width={14} height={14} className="h-3.5 w-3.5 rounded-sm" />by AL DIA</span>
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: true }}
                  className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
                  activeProps={{ className: "rounded-full px-3 py-1.5 bg-primary text-primary-foreground" }}
                >
                  {t(lang, n.key)}
                </Link>
              ))}
            </nav>
            <span className="ml-auto hidden font-mono text-xs text-muted-foreground md:inline">{t(lang, "tagline")}</span>
            <TenantSwitch />
            <LangSwitch />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </main>
        <footer className="border-t border-border py-6 text-center font-mono text-xs text-muted-foreground">
          <div>{t(lang, "footer")}</div>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Link to="/privacidad" className="underline">Privacidad y datos</Link>
            <span>Ley 1581 · GDPR · LGPD · GLBA</span>
            <button onClick={openCookiePrefs} className="underline">Preferencias de cookies</button>
          </div>
        </footer>
        <CookieBanner />
      </div>
    </QueryClientProvider>
  );
}
