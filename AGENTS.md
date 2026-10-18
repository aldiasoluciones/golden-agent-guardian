<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- The deterministic engine in src/lib/rules.ts decides pagar/frenar/escalar (duplicates and non-whitelisted payees freeze, any other failure escalates); the AI only explains — keeps "zero payments outside the rules" provable.
- All money rules compare in COP via the configured USD rate — one base currency keeps limits and budgets consistent.
- Every decision stores a deterministic plain-language decisionReason — explainability must not depend on the AI being available.
- Client companies (tenants) are generated deterministically in src/lib/tenants.ts; each tenant's state lives under its own localStorage key — keeps the 100 companies' policies, invoices and audit fully isolated.
- The home route (/) is a presentation landing with trust seals; /validaciones contains only unresolved human reviews, while /analitica owns historical decision and budget reporting — resolved invoices leave the operational view without losing audit history.
- Reconciliation is generated in the browser through a dynamically imported ExcelJS module using active-tenant invoices and audit events — exports remain isolated and require no new server persistence.
- Treasury reporting uses shared pure selectors in src/lib/treasury.ts and monthly receipt dates for monthly spending — analytics remain independently testable without changing payment rules.
- Simulated channel attachments use browser file reading and the existing extractor, with payer detection before tenant-specific ingestion — channel entry must not bypass invoice safety checks.
- Jury runs use temporary default-policy tenant states and replace only explicitly tagged jury invoices and their audit events afterward — repeated demonstrations stay isolated without bypassing rules or deleting unrelated records.
- Trust seals are presentation-only in a shared component with explicit scope disclosures — security claims must describe implemented controls without changing payment rules or implying external certification.
- Preventive fraud reports are deterministic tenant-local audit snapshots generated from completed duplicate, whitelist and bank checks; they never change payment decisions — preserve evidence without labeling suspected activity as confirmed fraud.
- Preventive fraud UI uses a read-only tenant-local consolidated scan, waits for pending audits to finish, and shows a nonblocking notice in operational views; dialogs open only on explicit user action and exports include unique current and historical suspicious evidence — preserve workflow and payment rules.

- /integraciones co-locates the REST tester and simulated Blinka exporter; /api-docs stays available for compatibility — centralize controls without changing rules or adding a real outbound API.
- Provider webhooks (/api/public/v1/quickbooks, /api/public/v1/stripe) verify the official Intuit/Stripe signatures via src/lib/provider-signatures.ts and never persist or move money — keeps the QuickBooks → rules → Stripe → QuickBooks flow demonstrable without real credentials.
- Payment corridors live in src/lib/rails.ts (country + vendor currency → Blinka rail, account-format check, demo FX to COP); the rule engine only escalates on rail failures and blinka-connect/treasury reuse the same table — one source for routing, validation and reporting.
- The 100-invoice WOW batch is generated (PDFs + wow-names.json + ZIP) from DEFAULT_POLICIES vendors and existing payer blocks; regenerate it whenever vendors change so the batch stays consistent with the whitelist.
- /demo contains only the jury guide (channel selector → existing batch/burst/attack components → decisions → Stripe/QuickBooks output → audit) plus copy-ready connection snippets; it reuses existing components and never implies real payouts.
