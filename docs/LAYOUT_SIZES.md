# Timeline layout – sizes and spacing

Reference for panel sizes, footer, and how they relate so nothing overlaps.

## Variables (from `styles/variables.css`)

| Token | Value | Use |
|-------|--------|-----|
| `--header-height` | 60px | Header and top of fixed panels |
| `--footer-height` | 65px | Footer and bottom of fixed panels (was 52px; caused overlap) |
| `--panel-event-width` | 600px | Event slide panel width |
| `--panel-filters-width` | 800px | Filters panel width |
| `--panel-music-width` | 800px | Music panel width |
| `--panel-events-manage-width` | 900px | Event management panel width |

## Footer (with headlines)

- **Height:** `--footer-height` = **65px** (full bar at bottom).
- **When timeline loaded:** 75% white (headlines ticker), 25% blue/gray.
  - White area ≈ 49px tall (headlines).
  - Colored bar ≈ 16px tall.
- **Atlas News:** Red trapezoid on the left (120×100px desktop; smaller on mobile). Ticker sits to its right in the white area.

## Fixed panels (desktop)

All panels use `top: var(--header-height)` (60px) and **`bottom: var(--footer-height)`** (65px) so they sit above the footer and do not overlap the headlines area.

| Panel | Width | Top | Bottom |
|-------|--------|-----|--------|
| Event slide (event info) | 600px | 60px | **65px** (was 52px → overlap) |
| Filters | 800px | 60px | 65px |
| Music | 800px | 60px | 65px |
| Event management | 900px | 60px | **65px** (was 52px → overlap) |
| Event image overlay | full | 60px | **65px** (was 52px → overlap) |
| Sidebar | 200px | 60px | **65px** (was 52px) |

## Event pagination (number buttons 1–10)

- **Position:** `position: fixed; bottom: 70px;` (above the 65px footer).
- **Rough height:** ~110px (page row ~50px + gap + number buttons ~40px).

## Zoom controls

- **Position:** `position: fixed; left: 20px; top: 50%; transform: translateY(-50%);` (vertically centered, no bottom overlap).

## Overlap fix (applied)

Several elements used **`bottom: 52px`** while the footer is **65px**, so they overlapped the white headlines strip by **13px**. All of these were changed to **`bottom: var(--footer-height)`** (65px):

- `styles/components/panels/events-manage.css` – Event management panel  
- `styles/components/panels/event-slide.css` – Event slide (mobile media query)  
- `styles/components/event-image-overlay.css` – Event image overlay  
- `styles/components/event-manager.css` – Event manager panel  
- `styles/components/sidebar.css` – Sidebar and sidebar trigger  
- `styles/mobile/viewport.css` – Panels, event slide, sidebar (mobile)  
- `styles/mobile/events-manage.css` – Events panel (mobile)

Panels and overlays now end at the top of the footer, so the footer (including the white headlines area) is no longer covered.
