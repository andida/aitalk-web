# Table browser check — 2026-10-31

The corrected table candidate was bundled from the isolated full-source
candidate using its real table, dropdown, copy, Radix and icon components.
Navigation and the unused image wrapper were replaced by small test fixtures;
the page used synthetic row and menu data and no application login or database.
A temporary localhost server blocked all outside requests. Headless local
Chrome passed the following checks at both 375×812 and 1440×900:

- The synthetic table row and copy button rendered.
- The action menu opened and its Edit entry was present.
- A synthetic external link retained its URL and `noopener noreferrer`.
- Escape closed the menu; no page exception was observed.

This did not exercise clipboard writes, real Next.js navigation, production
styles or data, a real mobile device, or the authenticated application. The
specific temporary harness is a one-off check, not a permanent project E2E
gate. The separate regression summaries remain in the adjacent JSON files.
