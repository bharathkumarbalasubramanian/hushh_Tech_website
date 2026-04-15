# Manual SQL

This folder holds SQL that is useful for operations, recovery, hotfixes, or historical reference but is not part of the normal timestamped migration flow.

## Subfolders

- `schema/`: Full schema snapshots and schema reference dumps.
- `hotfixes/`: One-off repair scripts and targeted fixes.
- `migrations/`: Legacy or manually-run migration scripts that were not converted into timestamped files.
- `test-data/`: Seed or QA-only data helpers.

## Rules

- Put repeatable, environment-safe schema changes in `supabase/migrations/`.
- Put manual, ad hoc, or historical SQL here.
- Add a short note in the PR or commit message when a script here was actually executed against an environment.
- Do not assume these scripts are safe to run as-is in production.
