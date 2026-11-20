# Project knowledge

- For architecture questions and changes that span multiple modules, start with a scoped Graphify query. In this Windows workspace, run `.\graphify.ps1 query "<question>" --budget 1000`. Open the relevant source to confirm behavior before editing.
- If the graph is missing or stale, refresh it before relying on it. After finishing a set of source edits, run `.\graphify.ps1 update .`. Use `.\graphify.ps1 update . --force` when an intentional deletion or refactor makes the graph smaller and Graphify declines to overwrite it.
- Express route wiring, cross-tenant data access, and permission checks should be verified in source. Keep organization scoping and server-side authorization intact when changing CRM features.
- Follow the README for manual refreshes and automatic updates while editing. Generated graph files belong in the ignored `graphify-out/` directory.
