# Database connection type-only cleanup (2026-10-31)

The MySQL and PostgreSQL connection modules now describe the optional
`HYPERDRIVE.connectionString` shape instead of explicitly annotating the
placeholder environment as `any`. The non-null assertion preserves the
existing behavior after the existing `in` check; it is erased by TypeScript.

The actual environment value in both modules remains `{}`. Consequently this
change does **not** wire or validate a Hyperdrive binding, test database
connectivity, or address transaction semantics. Do not infer that Hyperdrive is
available from this cleanup.

In an isolated dependency-complete candidate, targeted ESLint and full
TypeScript checks passed. TypeScript `transpileModule` produced byte-identical
JavaScript before and after for both files. After applying to the workspace,
`git diff --check` passed, project tests passed 81/81, and lint reported 113
errors and 199 warnings. No database or production system was contacted.
