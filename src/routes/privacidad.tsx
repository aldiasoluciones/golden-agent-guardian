import { createFileRoute } from "@tanstack/react-router";
import { openCookiePrefs } from "@/components/cookie-banner";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Privacidad, datos y cumplimiento · AL DIA" },
      { name: "description", content: "Política de tratamiento de datos, cookies y marco normativo del agente de pagos AL DIA: Ley 1581, GDPR, LGPD, GLBA y SARLAFT." },
      { property: "og:title", content: "Privacidad, datos y cumplimiento · AL DIA" },
      { property: "og:description", content: "Cómo el agente de pagos AL DIA protege datos personales y financieros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

const NORMS: [string, string][] = [
  ["Ley 1581 de 2012 y Decreto 1377 de 2013 (Colombia)", "Habeas Data: autorización previa, finalidad, acceso, rectificación y supresión. Registro de bases ante la SIC (RNBD)."],
  ["Ley 1266 de 2008 (Colombia)", "Habeas Data financiero: tratamiento de información crediticia y comercial."],
  ["Circular Externa 029 de 2014 SFC / SARLAFT", "Prevención de lavado de activos y financiación del terrorismo en flujos de pago."],
  ["Ley 527 de 1999 y Decreto 358 de 2020 (DIAN)", "Validez de mensajes de datos y factura electrónica de venta."],
  ["Ley 1480 de 2011 y Ley 2300 de 2023", "Protección al consumidor y canales de contacto respetuosos."],
  ["GDPR (Reglamento UE 2016/679) y Directiva ePrivacy", "Minimización, base legal, transferencias internacionales y consentimiento de cookies."],
  ["LGPD (Ley 13.709/2018, Brasil)", "Tratamiento de datos de proveedores brasileños (CNPJ, cuentas)."],
  ["GLBA y CCPA/CPRA (EE. UU.)", "Protección de información financiera no pública y derechos de residentes de California."],
  ["LFPDPPP (México)", "Aviso de privacidad y derechos ARCO para proveedores mexicanos."],
  ["PCI DSS · ISO/IEC 27001 · SOC 2 (referencia)", "Buenas prácticas de seguridad de la información aplicadas al diseño."],
];

const GUARDS: [string, string][] = [
  ["Finalidad única", "Los datos de facturas solo se usan para validar, decidir y conciliar pagos."],
  ["Sin entrenamiento de IA", "La IA lee y explica facturas sin usar los datos para entrenar modelos; la decisión la toma el motor de reglas."],
  ["Aislamiento por empresa", "Cada empresa pagadora ve solo sus proveedores, facturas y bitácora."],
  ["Cifrado", "TLS en tránsito; comprobantes con huella SHA-256 que no exponen datos en claro."],
  ["Trazabilidad", "Cada aprobación o rechazo humano guarda nombre, fecha y justificación."],
  ["Retención y supresión", "En este demo los datos viven solo en tu navegador; reiniciar en Políticas los borra."],
];

function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Privacidad, datos y cumplimiento</h1>
        <p className="mt-2 text-muted-foreground">
          Política de tratamiento de datos personales y financieros del agente de pagos de AL DIA, con los mismos estándares aplicados a los productos de AL DIA y Tecnicapp.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-semibold">Datos del demo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas las empresas, proveedores, identificaciones fiscales y cuentas son ficticias, conforme a las bases del Reto Blinka. No se ejecutan pagos reales ni se mueve dinero.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Marco normativo aplicable</h2>
        <ul className="mt-3 space-y-2">
          {NORMS.map(([n, d]) => (
            <li key={n} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">{n}</p>
              <p className="text-muted-foreground">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Cómo protege los datos el agente</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {GUARDS.map(([n, d]) => (
            <li key={n} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">{n}</p>
              <p className="text-muted-foreground">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Cookies y almacenamiento local</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esenciales: empresa activa, políticas, facturas de prueba, idioma y tu elección de cookies. Analíticas operativas: opcionales, anónimas y solo con tu consentimiento. No usamos cookies publicitarias.
        </p>
        <button onClick={openCookiePrefs} className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm">Cambiar preferencias de cookies</button>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Tus derechos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Conocer, actualizar, rectificar y suprimir tus datos, revocar la autorización y presentar quejas ante la Superintendencia de Industria y Comercio. Responsable: AL DIA · Powered by ALJ. Canal de contacto: privacidad@aldia.co (dirección de ejemplo).
        </p>
      </section>
    </div>
  );
}
