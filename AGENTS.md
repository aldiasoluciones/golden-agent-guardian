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
- The home route contains only unresolved human reviews, while /analitica owns historical decision and budget reporting — resolved invoices leave the operational view without losing audit history.
- Reconciliation is generated in the browser through a dynamically imported ExcelJS module using active-tenant invoices and audit events — exports remain isolated and require no new server persistence.
- Treasury reporting uses shared pure selectors in src/lib/treasury.ts and monthly receipt dates for monthly spending — analytics remain independently testable without changing payment rules.
- Simulated channel attachments use browser file reading and the existing extractor, with payer detection before tenant-specific ingestion — channel entry must not bypass invoice safety checks.
- Jury runs use temporary default-policy tenant states and replace only explicitly tagged jury invoices and their audit events afterward — repeated demonstrations stay isolated without bypassing rules or deleting unrelated records.
