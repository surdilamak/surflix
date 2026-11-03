# Surflix — Design System

> One document for four surfaces: **landing** (`lp-`), **Request Hub** (`rq-`), **PortalBar** (`pb-`), and **Surflix Reference** (`ref-`). Admin (`ad-`) follows the same language but is not used by guests.
>
> The document structure follows [design-system-skill](https://github.com/albertzhangz10/design-system-skill). The values here are **read from the running CSS**, not aspirational — if the code changes, update the tables.
>
> Master rule that applies on every surface: **flat tiles, one radius, no gradients, no shadows on resting objects, no hairlines, no glass, no emoji.**
>
> Last audited: 2026-10-22.

---

## 1. Colors

> Every color below comes with **where it is used**. If a token has no such sentence, it is not used yet — and that is flagged.
> Contrast figures are **measured**, not estimated. WCAG AA thresholds: 4.5:1 for normal text, 3:1 for large text (≥24px regular / ≥18.7px bold) and for interface components.

### Accent scale

One color for the whole portal, **#ff5200**, with six derived steps. Used only for the primary action and the "you are here" marker — never as a decorative color.

| Token | Hex | Contrast | Used for |
|---|---|---|---|
| `{colors.accent-tint}` | `#fff1ea` | `{colors.ink}` ink on top of it 12.6:1 | Very soft background on light surfaces. **Not used yet** — available for highlight strips and selected rows |
| `{colors.accent-soft}` | `#ffe7dc` | `{colors.ink}` ink on top of it 11.7:1 | Soft background, badges, selected rows. **Not used yet** |
| `{colors.accent}` | `#ff5200` | 5.97:1 on dark fields · **3.25:1 on white** | Primary button fill, active navigation pill, selected marker, the "Start here" dot on the dark stage |
| `{colors.accent-hover}` | `#ff6a26` | 6.79:1 on dark fields | Primary button hover. It goes **lighter**, because three of the four surfaces have dark backgrounds |
| `{colors.accent-active}` | `#e04800` | 4.71:1 on dark fields | Pressed state |
| `{colors.accent-text}` | `#b83a00` | **5.76:1 on white** | Accent-colored text and links **on light surfaces**. Used in `.ref-saga-pairs a:hover` |
| `{colors.accent-ink}` | `#0d0d0f` | — | Ink **on top of** the accent. Never white: `#ffffff` on `#ff5200` is only 2.8:1 |

**The rule that is easiest to break:** `{colors.accent}` on white is only **3.25:1**. Safe for button fills and large headings, **not safe for normal-size text** — use `{colors.accent-text}`. This has already happened: the 15px link in the Watch order index used `{colors.accent}` and failed AA until it was fixed on 2026-10-23.

### Dark surfaces — landing, Request Hub, PortalBar

| Token | Hex | Used for |
|---|---|---|
| `{colors.bg}` | `#0d0d0f` | Page background |
| `{colors.surface}` | `#17171a` | Tiles, cards |
| `{colors.raised}` | `#232327` | Tile on top of a tile, **secondary button fill**, hover state |
| `{colors.ink}` | `#ffffff` | Primary text |
| `{colors.muted}` | `#a3a3ab` | Secondary text, placeholder |
| `{colors.paper}` / `{colors.paper-ink}` | `#ffffff` / `#0d0d0f` | Light blocks inside a dark page (landing) |

### Surflix Reference — light surface

The only light surface, and its ink is **navy, not black**.

| Token | Hex | Used for |
|---|---|---|
| `{colors.bg}` | `#ffffff` | Page background |
| `{colors.surface}` | `#f4f4f2` | Neutral blocks, secondary button fill |
| `{colors.ink}` | `#1f2b4d` | Primary text |
| `{colors.muted}` | `#6a7186` | Secondary text |
| `{colors.field-1}` | `#05070a` | **Dark field**: hero, 3D stage, Watch order stage, Galaxy |
| `{colors.field-1-ink}` / `{colors.field-1-muted}` | `#ffffff` / `#a9aebd` | Text on top of the dark field |
| `{colors.field-2}` / `{colors.field-2-ink}` | `#e3e1dc` / `#1f2b4d` | Cream field for the "how it works" section |

### Semantic — Request Hub

| Token | Hex | Meaning |
|---|---|---|
| `{colors.green}` | `#30d158` | Available / done |
| `{colors.blue}` | `#64d2ff` | Being processed |
| `{colors.yellow}` | `#ffd60a` | Waiting |
| `{colors.red}` | `#ff6961` | Failed / rejected |

### Relationship types — Reference

Seven colors for seven connection types, used in the 3D map, Galaxy, and the Watch order lane legend. **Do not use them for anything else** — once they are borrowed for another purpose, the legend stops meaning anything.

| Token | Hex | Relationship |
|---|---|---|
| `{colors.rel-homage}` | `#f7941d` | Homage |
| `{colors.rel-inspired}` | `#4f8ff0` | Inspired by |
| `{colors.rel-visual}` | `#8a8576` | Borrows the look |
| `{colors.rel-remake}` | `#1f9d7d` | Retold |
| `{colors.rel-universe}` | `#7b859a` | Same universe |
| `{colors.rel-director}` | `#9b59d0` | Same director |
| `{colors.rel-talent}` | `#e0405f` | Same cast |

## 2. Typography

| Surface | Font |
|---|---|
| Landing, Request Hub | **Bricolage Grotesque** |
| Surflix Reference | **Schibsted Grotesk** |
| PortalBar | inherits from its parent page |

The two surfaces have **different characters, and that is deliberate**: landing is a tile board with a medium scale, Reference is an editorial portal with large display type. Do not "unify" them.

### Reference — scale

| Token | Size | Used for |
|---|---|---|
| `--step-display` | `clamp(2.75rem, 1rem + 5.2vw, 5rem)` → 44–80px | **Title of every page (h1). One size for all of them.** |
| `--step-head` | `clamp(2rem, 1.3rem + 3.2vw, 4rem)` → 32–64px | Large section headings |
| `--step-lead` | `clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)` → 20–26px | Opening sentence below the page title; also card h2 |
| `--step-body` | `clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)` → 17–19px | Body text |
| `--step-small` | `clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)` → 13–14px | Captions, meta |

Weight: 800 for display and headings, 600 for emphasis, 400–500 for body. Letter spacing `-0.05em` on display, `-0.03em` on headings, 0 on body.

> **Do not write a new `font-size` for a page title.** Until 2026-10-22 there were five separate h1 rules in `referensi.css` (63px–107px at a 1440 screen) that were born one at a time. They all point to `--step-display` now.

**Deliberate exception:** `.ref-core-sub` (the home hero subtitle) stays at 18px, not `--step-lead`. That hero is a composition enclosed inside the poster ring with `min-height: 5.4em` for rotating text; enlarging it pushes the search box into the posters.

### Line-height — audited 2026-10-23

Not one number for everything. Three groups, each with its own reason:

| Group | Ratio | Examples |
|---|---|---|
| **Display** | 0.88–1.0 | `.ref-display` (44–80px), `.ref-how-word`. Type this large is meant to be tight; 1.5 would make it fall apart |
| **Headings and labels** | 1.05–1.3 | Section headings 1.05–1.1, card headings 1.2–1.25, single-line labels 1.0. Card headings are deliberately tight because they run one to two lines |
| **Prose that is read** | **1.45–1.5** | Root value `.ref-root` 1.5; `.ref-caption` 1.5; `.ref-core-sub` 1.45 |

> Before the audit, the root used 1.4 and `.ref-caption` — 19px prose 60ch wide, the most-read text on the home page — used **1.3**. Both were below the readability threshold. They were raised; elements that need to be tight already overrode it themselves from the start, so nothing else stretched.

### Truncating titles: do not rely on line-clamp (2026-10-23)

**`-webkit-line-clamp` can no longer be used as a layout basis.** Chrome 155 dropped its legacy mode: `display: -webkit-box` is mapped to `flow-root`, so the clamp **dies without any error** — the text still flows onto a third line and is only cut off by `overflow: hidden`, leaving half a line below the box. The replacement, standard `line-clamp`, **is not there yet** (`CSS.supports('line-clamp','2')` → `false`). So for now there is no line-truncation mechanism that works in every browser.

How to check, because `getComputedStyle` alone is misleading (the stylesheet looks correct):

```js
getComputedStyle(el).display                        // 'flow-root' = clamp mati
const r = document.createRange(); r.selectNodeContents(el);
r.getClientRects().length                           // number of lines actually rendered
el.scrollHeight > el.clientHeight                   // true = something is clipped
```

Two approaches are in use now; pick one according to the title's role:

| Title role | Pattern | Example |
|---|---|---|
| Marker in a tight mosaic | one line, `white-space: nowrap` + `text-overflow: ellipsis` — no clamp needed | `.lp-strip` (landing) |
| Main page content | **shown in full**, two-line `min-height` for uniformity, allowed to grow | `.ref-new-strip` (Just added) |

If the title is allowed to grow, the cards must be aligned — see **Cards → Just added card**.

### Reference — usage

| Element | Token |
|---|---|
| Page title (all pages) | `--step-display` |
| Hero opening sentence | `--step-lead` |
| Card / panel title | `--step-lead`, weight 800 |
| Body text | `--step-body` |
| Map card labels, meta, captions | 13px (below `--step-small`; the map is not reading text) |

### Landing — scale

| Size | Used for |
|---|---|
| 40px | h1 and tile titles |
| 64px | `.lp-head`, section headings |
| `--step-fig` 56–92px | **Statistic numbers** ("723 film"), not headings |

---

## 3. Shape

### Radius scale

| Token | Value | Used for | Usage count |
|---|---|---|---|
| `{rounded.none}` | 0px | Full-screen bands: hero, stage, footer | — |
| `{rounded.xs}` | 4px | Small badges, markers | 4 |
| `{rounded.sm}` | 6px | Request Hub status badges, list thumbnails | 5 |
| `{rounded.md}` | **8px** | **The main value**: buttons, tiles, cards, inputs, dropdowns | 13 |
| `{rounded.full}` | 999px | Navigation pills, status badges, play-button discs | 14 |

The rhythm is 4 / 6 / 8 / pill. **If you need a new radius, most likely the component is wrong**, not that the scale is missing a step.

## 4. Elevation

This portal is **flat**. There are only two levels.

| Level | Shadow | Used for |
|---|---|---|
| 0 | none | All resting objects: tiles, cards, panels, buttons |
| 1 | `0 18px 44px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.2)` | **Only** objects floating above the page — currently just the search results panel |

Depth is expressed through **surface color** (`bg` → `surface` → `raised`), not shadows.

---

## 5. Interaction States

| State | Primary button | Secondary button |
|---|---|---|
| Rest | `accent` + `accent-ink` | `surface`/`raised` + `ink` |
| Hover | `accent-hover` `#ff6a26`, rises 2px | one step lighter |
| Pressed | `accent-active` `#e04800`, `scale(.98)` | one more step |
| Disabled | `surface` + `muted`, `cursor: not-allowed`, no transform | `opacity: .4` |
| Focus | `outline: 3px solid var(--accent); outline-offset: 3px` (global `.ref-root :focus-visible`) | same |

Minimum touch target **44px**; standard buttons `min-height: 48px`.

> Until 2026-10-22 Reference buttons had **no color change at all** on hover — `transition` named `background` but no value was defined, so the transition was dead. And there was no secondary button. Both exist now, and their values follow `.rq-btn-*` in Request Hub.

---

## 6. Layout

### Spacing scale

**Two-tier rule, enforced 2026-10-23:**

1. **Layout spacing (gap, margin between blocks, container padding) must be a multiple of 4px.** No exceptions. Checked one by one, and 114 values were snapped to the grid.
2. **Inline details may be 1–3px** — badge padding, optical icon offsets, hairline gaps. Forcing a 4px grid on an 18px-tall badge produces the wrong object, not a tidy one.

The mock interface illustration on landing (`.lp-ui*`) is **excluded**: it is a picture of an app, not the app itself.

The values below are taken from a count of real usage across all five CSS files, not from aspiration.

| Token | Value | Used for | Count |
|---|---|---|---|
| `{spacing.xxs}` | 4px | Gap between badges, icon-text gap | 25 |
| `{spacing.xs}` | **8px** | **Most frequent**: grid gap, inner padding of pills | 51 |
| `{spacing.sm}` | 12px | Small button padding, gap between rows | 40 |
| `{spacing.md}` | 16px | Card padding, phone edge margin | 39 |
| `{spacing.lg}` | 24px | Gap between cards, panel padding | 27 |
| `{spacing.xl}` | 40px | Space between blocks within one section | 13 |
| `{spacing.xxl}` | 64px | Space between sections | 9 |
| `{spacing.section}` | 80px | Breathing room between page chapters | 9 |

Global edge margin for Reference: `--margin: clamp(16px, 2.2vw, 32px)` — 16px on phones, 32px on wide screens.

### Grid and content width

| Surface | Content width | Edge margin |
|---|---|---|
| Landing | full | `--m: 20px` |
| Request Hub | `rq-wrap` 1280px | same |
| Reference | full | `--margin` |

### Vertical rhythm — overhauled 2026-10-23

Previously the vertical rhythm of Reference was written as **14 `clamp()` pairs, each born on its own**: 160/100, 100/120, 160/160, 104/80, 96, 88/0, 72, 40… No two pages breathed the same, and `clamp()` at mid viewports produced values like **86.4px and 100.8px** — violating the 4px grid enforced elsewhere.

Now there are four tokens with **fixed** values (not clamp), with one step down below 1024px:

| Token | ≥1024px | <1024px | Used for |
|---|---|---|---|
| `--pad-top` | **64px** | 40px | Portal bar → start of the content block. Every page. |
| `--gap-block` | **40px** | 32px | Between blocks **within one color field** (header → stage) |
| `--gap-section` | **80px** | 56px | Change of field / between sections |
| `--gap-chapter` | **120px** | 80px | Long narrative chapters (Reference home) |

The rule: **the content block always starts 64px below the bar.** What appears first may differ — search bar, back link, or the title directly; that is content, not spacing.

At a dark → white field boundary, the two paddings stack. The split is fixed: the block above closes with `--gap-block` (40px), the section below opens with `--gap-section` (80px). The total is 120px at every boundary — it used to be 168px on Watch order and 86px on the film map.

### Utility row above the title

A standard content page has one row above the title: a search bar (Watch order index, film map) or a back link (saga page). **Its height is 44px in all three**, with 28px to the title, so the title lands at exactly the same point.

| Page | Title from bar | Notes |
|---|---|---|
| Watch order index | **196px** | search bar |
| Saga page | **196px** | back link |
| Single film map | **196px** | search bar |
| Just added | 210px | has no utility row; the title is centered against the featured card |
| Reference home | 243px | full hero, title centered inside the poster ring |
| Galaxy | 48px | title floats over a screen-height canvas |

> Until 2026-10-23 the numbers were 184 / 164 / 184 / 392 / 243 / 48, because the back link was only as tall as its line (23px) while the search bar was 44px. 44px is also the correct touch target for a back link.
>
> **The last two exceptions are deliberate.** Home centers its title inside the poster ring; Galaxy spreads it over a screen-height canvas — forcing 64px on both ruins their composition rather than tidying it. Just added uses `align-items: center`: `end` sinks the title to 355px, `start` leaves a 200px gap next to the featured poster.

### Marking the page currently open

**Every local navigation link must set `aria-current="page"` when its page is active**, including when the visitor is on a child page — `/timeline/mcu` lights up "Watch order", `/movie/299537` lights up "All maps". The styling already exists in `portal-bar.css` (`.pb-nav a[aria-current='page']`).

> Until 2026-10-23 Reference's `PortalHeader` did not set it at all, so from the top bar a visitor could not tell which page they were on. Request Hub's `TopNav` was correct from the start. This is a **Trunk Test** failure — the basic test: from any page, can a person answer "where am I"?

### Breakpoints

**1023px** — the side panel stops floating and stacks below the stage. **767px** — PortalBar hides the logo, portal name, and local links; buttons stretch to full width.

### Stage pattern (Reference)

All three views — 3D film map, Watch order, and Galaxy — use **one and the same pattern**:

- The stage uses the **full width**, not cut by any column.
- The caption panel **floats**: `position: absolute; right: var(--margin); top: 24px`, width `min(380px, …)`.
- So that the panel does not bury anything, **all centering calculations in JS use the "usable area"** = stage width minus the panel footprint. See `insetOf()` in `saga-stage.tsx` and `panelInset()` in `connection-graph.tsx`; both return 0 when the panel is static, so one piece of code serves two layouts.
- Additionally for the 3D map: the camera is **shifted** by half the panel footprint, because its ring is centered and cannot be panned by the user.

> Until 2026-10-22 the panel took a 400px grid column, so the stage was cut by that much (1040px out of 1440px).

**Do not capture the wheel gesture on the 3D map.** Its stage sits in the middle of a page that needs to scroll; Galaxy may because it is the full screen height.

## 7. Motion

| Item | Value |
|---|---|
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` (token `--ease`, same on all surfaces) |
| Buttons, hover | `0.18s` |
| Element entrance | `0.8s` with a staggered delay of 110ms |
| Galaxy canvas appearing | `1.2s` |

All animation is turned off under `@media (prefers-reduced-motion: reduce)`.

---

## 8. Components

> This catalog writes **what is in the code**, not what is wanted. If one type of component has a different version on each surface, it is written as it is, along with its **canonical spec** — the target to aim for when that component is touched again.
>
> Main finding of the 2026-10-23 audit: Surflix is **not short of components**. It has every type it needs, but three of the four surfaces build their own versions. Only PortalBar is truly shared.

### Buttons

**Canon:** minimum height **48px**, radius `{rounded.md}` 8px, 16px text at weight **600**, touch target ≥44px. Hover goes lighter, pressed goes darker, disabled goes neutral.

**`btn-primary`** — the main action, aim for one per screen
- Background `{colors.accent}`, text `{colors.accent-ink}`, padding `0 22px`.
- Hover `{colors.accent-hover}` + rises 2px · Pressed `{colors.accent-active}` + `scale(0.98)` · Disabled background `{colors.surface}` text `{colors.muted}`.
- Used for: "Watch on Surflix", "Find a title", "Start watching", submit request.
- Implementation: `.ref-btn` (Reference) and `.rq-btn-primary` (Request Hub). **Aligned 2026-10-23** — the weight used to be 500 in Reference and 600 in Hub, and Hub wrote the hover hex directly instead of using the token.

**`btn-secondary`** — the second action next to the primary
- Background `{colors.surface}` on light surfaces, `{colors.raised}` on dark. Text `{colors.ink}`. Hover one step lighter.
- Implementation: `.ref-btn--secondary`, `.rq-btn-secondary`.

**`btn-light`** — primary inverted for dark fields
- White background `{colors.field-1-ink}`, text `{colors.field-1}`. Used when the button sits on a dark hero or stage, because white stands out more there than orange.
- Implementation: `.ref-btn--light`.

**`btn-text`** — a link that behaves like a button
- No background, no border, inherits the text color. Used in the landing footer link list.
- Implementation: `.lp-link-btn`.

### Pills and chips

**`pb-pill`** + **`pb-pill-active`** — selector for the three sites and language
- Resting: transparent background, text `{colors.muted}`, height 38px, radius `{rounded.full}`. Active: background `{colors.accent}`, text `{colors.accent-ink}`.
- The only component that is **truly shared** across surfaces.

**`ref-lens`** — control for the three views of one title
- Map / Watch order / Galaxy. Active `{colors.accent}`; the rest `opacity: 0.6`, lighting up on hover.
- A lens that does not apply is **hidden**; if only one remains, the control is not rendered at all.

**`ref-saga-seg`** — Story / Release switch
- A container with radius `{rounded.md}` holding two pills. Appears **only when the two orders actually differ** (`twoOrders`).

**`ref-galaxy-rels`** — relationship-type filter in Galaxy
- Seven chips, one per relationship color. Doubles as the color legend — turning off one chip dims the connections of that type.

### Inputs

**`input-text`**
- Canon: minimum height 48px (52px for the search bar), radius `{rounded.md}`, background `{colors.surface}` on dark or `{colors.bg}` on light, focus `outline: 2px solid {colors.accent}`.
- Implementation: `.rq-input` and `.ref-search input`. They agree on shape but are written separately.

**`search-bar`** — search input with an attached button
- Input + `btn-primary` fused together: left radius `{rounded.md}`, right 0 on the input, the reverse on the button.
- Implementation: `.ref-search` (hero and compact version), `.rq-input--search`.

### Badges

**`badge`** — small status marker
- Canon: radius `{rounded.sm}` 6px, padding `4px 8px`, **13px** text / line-height 16px (total height exactly **24px**, a multiple of 4), weight 500–700, `{colors.accent-ink}` ink on top of the status color.
- Implementation: `.rq-badge-*` (four semantic colors), `.ref-new-badge`, `.ref-galaxy-wait`. Aligned on 2026-10-23 — previously 11/11/12.
- **A badge attaches to its object, not to the text.** `.ref-new-badge` was moved to the top-left corner of the poster (8px from the edge) on 2026-10-23; before that it was inserted inline inside the title paragraph, which broke the line rhythm and got thrown onto its own line whenever the title was long.
- **12px was tried and reversed.** The reason for holding it at 12px was "a badge the same size as body text stops reading as a secondary marker" — but it was the only remaining `small-text` offender on Just added (16 blocks), and what actually distinguishes a badge from body text is its color, not its size. At 13px it still reads as a badge and the page passes with 0 FAIL.

### Cards

**`tile`** — flat tile, the base language of landing and Request Hub
- Background `{colors.surface}`, radius `{rounded.md}`, no shadow, no hairline.
- Implementation: `.lp-tile`, `.rq-tile`.

**`ref-run`** — saga row in the Watch order index
- Saga name + row of posters + link. The same contact sheet idiom as the Reference home.

**`ref-saga-card`** — one title on the timeline
- 100×150 poster, `{colors.accent}` dot when selected, 13px caption.
- Below 55% zoom the caption is hidden so that the stage reads as a map, not a list.

**`ref-saga-ghost`** — a title not yet in the library
- Gray box reading "Not on Surflix" with a link to Request Hub. The hole is shown, not hidden.

**`ref-panel`** — caption floating above the stage
- `position: absolute`, right `{spacing.md}`–32px, top 24px, width `min(380px, …)`, background `{colors.bg}`, padding `24px 26px 26px`. Below 1024px it becomes static and stacks.

**`ref-new-poster`** — Just added card, derived from landing's `.lp-frame`
- 2/3 ratio poster + title strip **inside** one `overflow: hidden` box with radius `{rounded.md}`; the "New this week" badge attaches to the top-left corner of the poster, not to the title row.
- The title is shown in full, so its height varies. So that one grid row does not become stepped, the `li` uses a three-row **subgrid** (card / caption / link) with `row-gap: 0`; the card bases, captions, and links line up across the whole row.
- The card background is set to `{colors.field-1}` — the same color as the strip, not `{colors.surface}`. If the subgrid stretches the card beyond poster + strip, the leftover space merges with the strip instead of appearing as a light sliver.
- The columns are `repeat(auto-fill, minmax(190px, 1fr))`, not a fixed count: six fixed columns leave ~155px per card at 1024–1280px, and film titles wrap to four lines at that width.

### Full-screen bands

**`hero-dark`** — hero on `{colors.field-1}`
- Height `max(100svh, 760px)` for the Reference home; content centered inside the poster ring.
- Implementation: `.ref-hero`, `.ref-new-intro`, `.lp-hero`.

**`band-paper`** — cream band `{colors.field-2}` for explanatory sections
- Implementation: `.ref-how`, `.lp-section--paper`.

### Navigation and footer

**`pb-bar`** — PortalBar, one sticky row
- Logo + portal name + local links + three-site pill + language pill. Minimum height 56px. Below 767px the logo, name, and local links are hidden.

**`footer`** — Separate implementations: `.lp-footer` and `.ref-footer`. Not yet unified.

### Deliberately NOT present

The PlayStation comparison has several components that were **not built** because there is no need for them: `pagination-dot` (there are no paginated pages), `carousel-paddle` (all rails scroll directly, not with buttons), and `sub-nav` (PortalBar already holds the local links). Do not create them just for completeness.

## 9. Known Gaps

Things that are **not** yet tidy, recorded so they are not rediscovered over and over:

- ~~Spacing off the 4px grid~~ — **reviewed one by one and fixed 2026-10-23.** 114 values snapped (6→8, 10→12, 14→16, 18→20, 22→24, 26→24, 30→32, 38/42→40, 5→4, 7→8, 9→8, 150→144). Only 2px and 3px remain, as inline details, per the two-tier rule in section 6.
- ~~Three stray radii (99px, 10px, 12px)~~ — **unified 2026-10-23**. The scale is now clean: 999px (15×), 8px (15×), 6px (5×), 4px (4×), 50% (2×).
- **Four surfaces build the same components separately.** Buttons, inputs, badges, cards, and footers each have their own version in `lp-`, `rq-`, `ref-`, and `ad-`. Only PortalBar is truly shared. Unifying them is risky refactor work that has not been done; the catalog in section 8 writes out the canonical specs so that the next piece of work heads toward them, not away.
- **`{colors.accent-tint}` and `{colors.accent-soft}` are not used yet.** Both were added 2026-10-23 to complete the scale; no component uses them yet.
- **Landing and Reference have separate typography scales** (40/64px vs `--step-display` 44–80px). This is deliberate — tile board versus editorial page — but it has never been written down as two named scales.
- **Admin uses the same language but has not been audited** as thoroughly as the three guest surfaces.
- **The footer is still three implementations** (`.rq-footer`, `.lp-footer`, `.ref-footer`), but **their values are now identical**: padding `64px … 24px` and `margin-top: auto` on all three. What remains is merging them into one React component; their content really does differ (site map vs a single line), so merging means one component with variants, not one appearance.
- **Contrast has not been audited thoroughly.** What has been measured: the accent scale, and one failure on the 15px link that has been fixed. Other color pairs have not.

## 10. Design Tokens — where they live

| File | Contents |
|---|---|
| `app/globals.css` | Tailwind `@theme`: `rq-*` tokens |
| `app/landing/landing.css` | `lp-*` tokens and the landing scale |
| `app/(guest)/request.css` | Request Hub components |
| `app/referensi/referensi.css` | all Reference tokens and components |
| `components/portal-bar.css` | `--pb-*` |

Hand-written CSS is **not layered**, so it always wins over Tailwind utilities. Do not put `padding`/`margin` on overrides like `.rq-root .input-ios`, so that `pl-12` etc. still apply.

---

## 11. Inspector false positives

`scripts/inspect.mjs` from taste-skill flags four things that are **not defects** in this portal:

| Rule | Why it is a false positive |
|---|---|
| `few-pictures` | Two different causes. On the saga page and film map the posters are drawn to a `<canvas>`. On the Watch order index there are **167 real `<img>`** but it is still reported as 0: the contact sheet posters are too small for the inspector's "picture" threshold. Checked 2026-10-23 by counting `document.querySelectorAll('img')` |
| `edge-text` | Cards outside the view still have a rect even though they are clipped by `overflow: hidden` |
| `body-size` | On large sagas (28+ titles), the 13px map card labels outnumber the prose; the actual reading text is 26px |
| `late-title` (Galaxy) | `.ref-galaxy-intro` is deliberately `pointer-events: none` so the sky can still be dragged from behind the text; the title is still on top visually (`z-index: 3`) |

`eyebrow` on the saga page is also a false positive: "← All sagas" is a back link, not a kicker.

Run with `--allow edge-text,body-size`.

### Prose pages (`/terms`, `/privacy`) and 404 — 2026-10-23

The inspector's Must-Have list is calibrated for SaaS marketing pages. On legal pages most of it **does not apply**, rather than passing:

| Rule | Why it does not apply |
|---|---|
| `few-pictures`, `no-footage` | A terms page has no subject that could be photographed or filmed |
| `first-action` | There is no primary action to make into a button; the back link is enough |
| `still-page`, `focal-point` | A document, not a stage; the 40px title is rightly its dominant element |
| `untitled-section` @390px | The lede, list, and callout box are **inside** the titled section; the inspector's segmentation on a narrow screen does not see the hierarchy |
| `eyebrow`, `small-title` | "← Surflix" is a back link; a document title does not need hero size |
| `off-centre` on 404 | Measured 2026-10-23: the wrapper and its color field are **L293/R1147 at 1440px**, exactly symmetric. What the inspector measured is the edge of the card's *text*, which is left-aligned and ragged-right |

What was **real** and has been fixed: `hairline` (1px line above the footer nav → removed, the 80px spacing already separates), `empty-screens` (600px prose floating in the middle of black → placed on a `--surface` field at ≥1024px), `name-only-title` (the lede at `--step-body` fell to 17.9px at 768px, below the 18px threshold → raised to `--step-lead`).

Run with `--allow eyebrow,few-pictures,no-footage,focal-point,still-page,untitled-section,first-action,small-title`.
