# GitHub Pages parity checklist

Use this to confirm the site looks and behaves the same on GitHub Pages as locally.

## Paths (all relative)

- **HTML**: No `href="/..."` or `src="/..."` for app assets. All use relative paths (`styles.css`, `src/...`, `assets/...`, `data/...`).
- **Atlas News image**: In HTML the src uses the encoded filename: `assets/images/misc/Atlas%20News.png` (space → `%20`) so it loads on GitHub Pages.
- **CSS**: `styles.css` and `styles/entry.css` use relative `@import url('styles/...')`; resolution is correct when the page is under the repo path.

## Footer and sliding headlines

- **Footer**: `<footer>` contains `.footer-atlas-news` (Atlas image) and a `<p>`; the red trapezoid and image are shown when the footer has class `timeline-loaded` (added by `ComponentOrchestrator` when the globe is ready).
- **News ticker**: `NewsTickerService` creates `.news-ticker-container` and appends it to the footer; it is initialized when the timeline loads and updated with headlines from the current page. No GitHub Pages–specific logic hides it.
- **Script order**: `NewsTickerService.js` is loaded before `component-loader.js` and other services; `ComponentOrchestrator` runs after the globe loads and then calls `newsTickerService.init()` and `updateTicker(currentPageEvents)`.

## Number buttons and hover

- **Styles**: Event number buttons (1–10) and marker-hover highlight (`.number-btn-marker-hover`) are in `styles/components/event-pagination.css`, imported via `styles.css`. Same file for desktop and mobile (media queries inside).
- **Behavior**: `MarkerInteractionService` adds/removes `number-btn-marker-hover` on the corresponding button when a marker is hovered. No conditional that disables this on GitHub Pages.

## Button layouts (desktop and mobile)

- **Globe/pagination**: `styles/components/globe.css`, `styles/components/event-pagination.css`.
- **Zoom, music, palette, event manager, filters, etc.**: `styles/entry.css`, `styles/components/globe.css`, `styles/mobile/viewport.css` (via `styles/mobile.css`).
- All loaded through `styles.css` and `styles/entry.css` with relative imports; no absolute URLs.

## Before you push

1. **Commit the Atlas image** (if not already):  
   `git add "assets/images/misc/Atlas News.png"`

2. **Ensure root files are in the repo**:  
   `index.html`, `main.html`, `404.html`, `.nojekyll`, `styles.css`, `script.js`, `data/`, `assets/`, `src/`, `styles/`.

3. **Open the live site** at  
   `https://<username>.github.io/<repo-name>/main.html`  
   (or `.../` for index). After the globe loads you should see:
   - Footer with Atlas News image (red trapezoid) on the left
   - Sliding headlines in the white part of the footer
   - Number buttons 1–10 below the page controls; hovering a globe marker highlights the matching number button
   - Same desktop/mobile button layout as locally
