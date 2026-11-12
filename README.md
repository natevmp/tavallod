# Tavallod Prize Draw

A deliberately silly, handmade birthday prize draw. Plain HTML, CSS, SVG, and JavaScript; no backend, analytics, external fonts, or runtime dependencies.

**Website:** https://natevmp.github.io/tavallod/

## Preview

With a current Node.js installation:

```sh
npm start
```

Open http://127.0.0.1:4173/tavallod/. The preview includes the repository prefix so relative links behave like GitHub Pages. Alternatively, serve `docs/` using any static HTTP server. ES modules require HTTP rather than opening the HTML as a local file.

This previews the final dog-wheel design. Only the two optimised, metadata-stripped WebP cutouts are published; original photographs and local design studies are excluded from Git.

## Tests

```sh
npm ci
npm test
npx playwright install chromium webkit
npm run test:browser
```

Browser tooling is development-only; publishing does not require installing packages or running a build.

## GitHub Pages

The public `natevmp/tavallod` repository publishes **main → /docs** via Settings → Pages → Deploy from a branch. Only `docs/` is served as the website; the local preview server and tests are not deployed. `.nojekyll` keeps the site plain static files.

## Editing

- `docs/index.html`: landing page, result, and playful terms.
- `docs/styles.css`: paper-card layout, wheel, and reduced-motion styles.
- `docs/app.js`: SVG labels, animation, interaction, and confetti.
- `docs/spin.js`: prize names and shared wheel-position logic.

Every spin intentionally wins the eReader. The claim deadline is displayed in the terms, not enforced by a timer. No personal details are collected and there is no online prize-claim or payment flow.
