# Project Guidance

- Use `digikala.com` as the primary UX and interaction inspiration while preserving Talasho's own purple-and-gold identity.
- Fix issues at their shared root cause whenever possible so the same visual or behavioral bug does not recur on other pages.
- In Persian RTL layouts, keep units and counters visually to the left of their numeric values using the shared `numeric-measure` pattern.
- Treat `assets/partials/site-header.html` and `assets/partials/site-footer.html` as the global shell derived from `index.html`; run `npm run sync:shell` after changing either partial.
