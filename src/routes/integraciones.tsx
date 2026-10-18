import { createFileRoute, redirect } from "@tanstack/react-router";

/** Kept for old links: the integration center now lives inside the Demo flow. */
export const Route = createFileRoute("/integraciones")({
  beforeLoad: () => { throw redirect({ to: "/demo", hash: "salida", statusCode: 301 }); },
});
