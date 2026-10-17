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
