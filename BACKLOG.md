# BACKLOG.md — Surflix

> Things deliberately deferred. Ordered from most impactful. Update this file whenever something gets done or added.
> Last updated: 2026-11-03 (18 new titles, three new sagas, one-paragraph stories pilot).

## 🔴 Quick follow-ups (after the last deploy)

- [x] **Verify the Watch deep-link in Request Hub** (checked by Idrus, 2026-10-20: works). The "Watch on Surflix" button in the detail modal now looks up `jellyfinId` from the library snapshot, then opens `#/details?id=…&serverId=…`. A film that is not in the snapshot yet falls back to the Jellyfin home. Check: open one Available film → click Watch → it must go straight to that film.
- [x] **Enable Sync library** (2026-10-20): the Jellyfin env is deployed, and Idrus checked that the Sync library button works. (The old key that got shared in chat must already be revoked.) Without this, the library snapshot only updates when the import script is run manually, so new films have no deep-link / can't be searched in the portal. Steps are in the "How to" section below.
- [x] **Landing numbers** (2026-10-20): `723 films · 194 series · 706 titles mapped`; `/api/upcoming` is populated again (20 films). An empty `/api/most-requested` is expected: it requires at least 2 requests for the same title.
- [~] **Connection fact sampling.**
  - [x] **371 `talent` connections audited** (2026-10-21, 8 parallel checkers, one per group of people, required to work from the source page, not from memory): 352 correct, 15 had overstated text ("stars in both" when it was a cameo/voice/a single episode) and were rewritten, 4 wrong and rejected (Noriyuki Abe is not the director of Hunter × Hunter 1999; Charlotte Gainsbourg is in Jane Eyre 1996, not the 1997 one that is in the library; Production I.G did not animate Uzumaki 2024; Adam Driver is not in ENJOY 2021). Zero "unsure".
  - [x] **169 `director` connections audited** (2026-10-21, 4 parallel checkers): 166 correct, 0 wrong, 0 unsure. 3 had text naming a single director although the work was directed by two people — Danny and Michael Philippou (Talk to Me / Bring Her Back), the Daniels duo (Swiss Army Man / Everything Everywhere), and Hideaki Anno, who on Evangelion 3.0 is chief director, not sole director.
  - Note: `director` connections are **not written per row** — they are generated automatically from `scripts/curated/directors.list` (name = lookup key into the Jellyfin directors column). To change the sentence use `| as: Nama EN || Nama ID`; for cases that need a special sentence, remove the name from the list and write its pair in `06-deepen.txt`.
  - [x] **68 `confidence: medium` connections audited** (2026-10-26, 4 parallel checkers, commit `877bcc8`) — all `source: llm` and never verified. Result: 35 correct · 21 rewritten · 3 raised (turned out to be underrated) · **12 rejected**. Half of what the model wrote could not be kept. Four patterns: interviewer sentences laundered into filmmaker statements (4 rows, including a Cyberpunk: Edgerunners quote that never existed); reboots treated as continuations (Superman 2025, The Batman); influence running the wrong way (Aronofsky, Refn, Franz/Fiala, Biller have all already REJECTED the comparison we were displaying — and the script of The Others was written ~1998, a year before the film it was claimed to have inspired was released); and the reverse, 3 rows that wrote "critics compare" when there is a statement from the filmmaker. After this round **there are no more `medium` rows** — 938 APPROVED, 12 REJECTED.
  - Lesson for the next curation: **ENJOY (2021) is a magnet for invented credits** — generic title, thin data, and the model fills it with big names. Two audits in a row have now rejected rows on that film (Adam Driver, then Ridley Scott). Check extra carefully when a new connection touches it.

## ✅ Done 2026-10-23 (legal pages, host canonicalization, Search Console)

- [x] **`/terms` and `/privacy` pages** (commit `f58b300`), written from verified facts — zero trackers, the Prisma models that actually exist, the cookie names actually used — not a template. Owned by the apex; from subdomains they are 308-redirected there. Contact `admin@surflix.my.id` in all three footers, EN + ID.
- [x] **Branded 404** (`app/not-found.tsx`). Before, every typo fell to the default Next screen: black text on white, on a site that is entirely dark.
- [x] **The apex no longer serves a second copy**: paths other than `/` are 308-redirected to the host that owns them. Redirect was chosen over a canonical tag — canonical is only a hint to search engines, both URLs stay alive and `/admin` stays reachable on the wrong host.
- [x] **One canonical host: apex without `www`** (commit `83cc57b`). The old apex→www redirect turned out to come from **NPM**, not Cloudflare — the `server: cloudflare` header is misleading because Cloudflare overwrites that header for all proxied traffic. The apex tunnel route now points directly at `192.168.68.8:3737`, and `www`→apex is handled by `middleware.ts`. The tunnel route pitfall is recorded in `~/Developer/Unraid/README.md`.
- [x] **Complete sitemap** (commit `c1d5297`): 65 saga pages and 2 Hub pages that were previously orphaned are now included. Prod: apex 1 · Hub 4 · Reference 911 URLs.
- [x] **Google Search Console**: Domain property `surflix.my.id` (TXT verification) covering all subdomains; all three sitemaps submitted; all three hosts passed *Test live URL*. The old `www` property was a URL-prefix type, so it **never covered `reference.*`** at all.

## 🔵 Search Console follow-ups (check once, then forget)

- [ ] **Sitemap status in GSC**: when submitted on 2026-10-23 all three showed `Couldn't fetch`, and that is expected — the `Last read` column is empty, meaning it has never been fetched, not that fetching failed. It must have changed to `Success` with `Discovered pages` filled in. If it is still red, the server side is not the cause: all three sitemaps answer 200 to Googlebot with `content-type: application/xml`.

## ✅ Done 2026-10-26 (connection audit, Jellyseerr, Watch order)

- [x] **Audit of 68 `medium` connections** (`877bcc8`, `c613010`) — details in the "Connection fact sampling" section above. There are no more `medium` rows: 945 APPROVED, 12 REJECTED.
- [x] **Three new sagas** (`8fde309`): Hunger Games (5 films), Back to the Future (3), Breaking Bad (3, including El Camino). 7 new `universe` connections. Back to the Future deliberately has NO separate story order — Marty's journey is consecutive, so the eras are written as labels (`1985 → 1955`), not a different order.
- [x] **Jellyseerr 2.7.3 → Seerr 3.5.1.** Jellyfin 12 dropped the old auth header (`X-Emby-Authorization`), so since ~22 October all new media got stuck in `PROCESSING` and **Surflix auto-sync was never triggered**. It works again now. The whole investigation and the four update pitfalls are in `~/Developer/Unraid/README.md` — read it there, don't redo it from scratch.

### Two pitfalls found today — READ BEFORE EDITING CONNECTIONS

1. **Audit results MUST be written to `scripts/curated/*.txt`, not to `connections-live.json`.** The 68-row audit was at one point written directly into the derived file; 18 of them still had the old sentence in the source, and the next `build-connections.js` would bring them back to life — including claims that had been rejected. Already backported. How to check: compare `reasonEn` seed vs live, there must be zero differences.
2. **The story-label column in `sagas.txt` does not support `EN || ID`.** The row is split on `|` first, so the translation gets sucked into the notes column and shows up as garbage text starting with `|` — and that note is **rendered** in the detail panel (`saga-stage.tsx:479`). This bug has been visible in production on the Ballerina card since the John Wick saga was created. Fixed; the pitfall is documented in the header of `sagas.txt`.

### Working order proven correct for new titles

`Sync library` (admin) → `export-library.js` on prod → copy to the repo → **align `dev.db` with `connections-live.json` first** (otherwise the export wipes out audit decisions — 32 statuses once differed) → write the curation → `build-connections.js` → import into dev.db → `export-connections.js` → `build-sagas.js`. The builder rejects text longer than **220 characters**.

## ✅ Done 2026-11-03 (18 new titles from Jellyfin)

- [x] **Library 946 → 964**, 25 new connections (`connections-live.json` 957 → 982, 12 REJECTED intact, zero old rows changed), three new sagas (**It**, **The Apu Trilogy**, **Suicide Club**), Batman +2 titles (Burton lane, now three continuities), DC on screen +The Flash. 863 / 964 titles connected. All claims were researched by 4 parallel agents from Wikipedia pages and the key claims were re-checked directly — not from memory. Candidates that could not be sourced were not written (list below).
- **A Story of Derry (2026) is NOT a feature film**: it is a 30-minute special episode of the HBO series *It: Welcome to Derry* (TMDB lists it as `movie`). In the `it` saga it is marked as such, and the series appears as "Not on Surflix" so it can be requested.
- **Noriko's Dinner Table is a prequel to Suicide Club** even though it was released in 2005 ("before, during, and after" — Wikipedia), so story order and release order are reversed.
- **Logan ↔ X-Men: Apocalypse is deliberately `talent` only** (Hugh Jackman cameo), not `universe`: where Logan sits relative to the Fox timeline is disputed by Jackman and Mangold themselves, and Days of Future Past is not in the library. Do not promote it to a saga.
- **Rejected for lack of a source** (do not repeat without a new source): all the "both are Stephen King" links for The Mist/Shawshank/Carrie/Shining with It; Hallorann is only proven in the NOVEL It, not the 2017 film; the influence of Burton's Batman on Joker/The Batman/Nolan; "Corpse Bride is a relative of Nightmare" (Burton only said "a different movie, a different process"); the influence of the Apu trilogy on Scorsese/Wes Anderson/Kurosawa (the source names the people, not a specific film); Young Sherlock ↔ Sherlock/Conan/Ritchie's films (the source calls Ritchie's films "unrelated"); Deadpool & Wolverine ↔ Apocalypse.
- **Data oddity, not yet fixed**: `Sherlock` (2010, TMDB 19885) in the snapshot has the director "Toshiyuki Yahagi, Ai Yoshimura" — wrong metadata from Jellyfin for the BBC series. It breaks nothing right now (neither is in `directors.list`), but never add that name to the director list.
- **Not yet shipped to production**: the order is import-connections to prod (dry-run first), then the new `connections-live.json`; see "How to: update connections" steps 6–7.

## ✅ Done 2026-11-03 (one-paragraph stories, pilot of 23)

- [x] **Connections can now carry a one-paragraph explanation** (`storyEn` / `story`, both optional) instead of a single line. 23 connections have one so far, written in a film-critic voice in English and Indonesian (each language written natively, not translated). Rows without a paragraph keep showing their short reason, so this rolls out gradually. Source of truth: `scripts/curated/stories.txt` (format and rules are in its header; `build-connections.js` rejects unknown or reversed pairs, paragraphs outside 200–1100 characters, and a missing `||`).
- **Why this exists:** 553 of 970 approved connections were under 60 characters (talent median 30, director 32, universe 73). Visitors could not tell what a connection was or why it was interesting.
- **Rules for writing a paragraph:** every factual sentence needs a source quoted in the comment above its line (Wikipedia page or a named interview); no invented quotes; no "critics say" without a named critic; no claim about what a filmmaker intended unless quoted; interpretation is allowed but has to read as interpretation. Leave a fact out rather than soften it.
- **Seven live short texts were wrong or unsourced and were corrected** (found while researching the pilot): Scary Movie > Scary Movie 5 (said it "picks up after" the fifth film; it is a spiritual sequel to the first two and skips it), Akira > Blade Runner (Mizutani's remark was about one background, from a single secondary source), Decision to Leave > Vertigo (Park's "subconsciously" quote is about Hitchcock in general), Saint Maud > Taxi Driver (the "lonely, self-appointed saviour" wording was not Glass's), Kiki > Totoro ("per Ghibli's own theatre programme" had no source; the cameo is a fan observation), Dragon Ball Z Kai > Dragon Ball Z (the "weekly schedule" reason is unsourced), The Dark Knight > Batman: The Killing Joke (Ledger only said the comic was "handed to me" and "explains… not too much").

## ✅ Done 2026-11-03 (audit of the homage / inspired / visual / remake rows)

- [x] **90 approved rows audited** (the 7 already checked during the stories pilot excluded), six agents in parallel, each verdict backed by quotes it actually fetched. Result: **19 confirmed as written, 63 rewritten, 8 rejected.** Only about one row in five survived untouched, which is why this had to happen before writing more paragraphs. Rewrites were applied to `scripts/curated/*.txt` (not to `connections-live.json`), the two live-only rows that were rewritten were backported to `03-references.txt`, and the 8 rejections were removed from the curated files and set to `REJECTED` in `dev.db`.
- **What was wrong, by pattern** (check new rows against these): a critic's reading or an interviewer's words presented as the filmmaker's statement; "critics compare…" with no named critic; invented scene details (a soda cup, a food tray, "Elisabeth pounds on a door", "Bates Motel dread", "screened The Thing for his cast"); reversed or impossible direction (Star Wars 1977 "inspired by" Dune 2021); a recut or a second adaptation of the same novel labelled "remake"; and the filmmaker actually denying or qualifying the link (Aronofsky on Pi and Eraserhead, Phillips on Taxi Driver, Park on Vertigo).
- **Rejected (8), do not re-add without a new source:** Meitantei Conan > Sherlock (only a shared source, no link between the shows; also the Sherlock metadata is wrong), Under the Silver Lake > Vertigo (the sourced homage is to Rear Window), Becoming Jane > Pride & Prejudice (the link is to the novel, not the 2005 film), Star Wars > Dune (2021; the comparison is to the 1965 novel, and the direction was impossible), The Batman > Se7en (no source; Reeves cited the Zodiac killer), The Love Witch > Vertigo (Biller cited The Birds and Marnie, neither is in the library), ONE PIECE (2023) > One Piece (1999) (the live action adapts the manga, not the anime), Pokémon: Origins > Pokemon (1997) (it adapts the games).
- **One agent verdict was overturned after checking:** Scary Movie 4 > The Village. The agent rejected it for "no source found", but Wikipedia's "Scary Movie (franchise)" page says the film's main spoof targets were The Grudge, War of the Worlds, The Village and the Saw franchise. "Not found" is not "wrong"; check a second source before rejecting.
- **Sources that were blocked** (Forbes, Criterion, Entertainment Weekly, Guardian, Vulture, THR): several rewrites rely on secondary reproductions and are marked confidence `m`. Where a primary interview could be opened, the row is `h`.

## ✅ Done 2026-11-03 (audit of the `universe` rows)

- [x] **278 approved `universe` rows audited** (the ones written and verified earlier the same day excluded), eight agents in parallel, grouped by franchise. Result: **222 kept (one with a minor wording tweak), 55 rewritten, 1 rejected.** About four in five were right, far better than the homage/inspired/visual/remake rows (about one in five), because most `universe` rows are accurate template sentences.
- **Where the errors were:** almost all in hand-written (`@custom`) sentences with invented or over-literal specifics ("ends minutes before Star Wars" when Wikipedia says a week; "years after Endgame" when it is months; a "crater" and a hammer that "lands"; "Yelena leads the team"; a Man'yoshu poem and a Yotsuha that appear in no source), and in a few template rows that named the **wrong predecessor** (Captain America: The Winter Soldier "after The Avengers" is a sequel to The First Avenger; Thor: The Dark World is a sequel to Thor; I Know What You Did Last Summer (2025) is a sequel to the 1998 film, not 1997; Scary Movie 5 is a standalone sequel, and the 2026 Scary Movie bypasses it).
- **Wrong type of work:** Dragon Ball GT: A Hero's Legacy is a TV special, not a film; Dragon Ball Super: Beerus is a remake of Super, not another entry; Digimon Adventure tri. sits after Adventure 02; The Mandalorian begins five years after Return of the Jedi; Zack Snyder's Justice League is a director's cut, not a direct sequel to Batman v Superman.
- **Rejected (1):** The search for Berserk (2015) > Berserk (1997). The library metadata shows Norwegian original title "Jakten på Berserk" and genres Reality/Adventure/Travel: a Norwegian adventure series, nothing to do with Miura's manga. Its auto-generated saga (`berserk`) disappeared with it.
- **Overturned or softened after checking:** the agent that rejected The Power of One (a Pokémon 2000 special) found no Wikipedia page; the library metadata (Documentary, Music) supports "not a feature film", so it was rewritten, not rejected.
- **Not changed, worth knowing:** One Piece film placements rest on the One Piece Fandom wiki (weaker than Wikipedia; the films are mostly non-canon). Hunter x Hunter (2011) > (1999) is labelled "remake" on weak evidence (both adapt the same manga). The Hobbit films are prequels to The Lord of the Rings: the story continues in The Fellowship of the Ring even though it was released first, so never mark that pair as a sequel in release order.
- **Data anomalies noticed, not fixed:** Fever Pitch: The Rise of the Premier League "Battle" (library year 2022) is probably 2023; Kill Bill: The Whole Bloody Affair is listed as 2011 while Wikipedia gives a 2004 premiere, a 2011 screening and a 2025 theatrical release.
- **Rewrites no longer carry an `@sequel`/`@prequel` marker** (custom text cannot). That is harmless here: every rewritten row sits in a curated saga (which ignores markers) or has release order equal to story order.

## ✅ Done 2026-11-03 (specific relationship labels, `kind`)

- [x] **Labels now say what the connection actually is.** Before, every `universe` row showed "Follows"/"Followed by" and every `remake` row "Remake of", which was wrong for prequels (The First Omen "Follows" The Omen), spin-offs, recuts, crossovers and bring-backs (The Flash "Follows" Batman). A new optional column `kind` refines the label: universe -> sequel, prequel, spinoff, series, shared ("Same universe as"), crossover, cameo ("Brings back"), reboot, revival, film ("Film from the series"), special ("TV special of"), recut, adaptation ("Same source as"), remake, related ("Related to"); remake -> recut, adaptation, retelling, reboot, related. Without a `kind` the generic label is used, so it is still safe to leave a row untagged (21 universe rows and 2 remake rows keep "Follows" / "Remake of" on purpose: they really do follow in the story / are real remakes).
- **How a row gets its kind:** template markers set it automatically (`@sequel` -> sequel, `@prequel` -> prequel, `@spinoff`, `@series`, `@universe` -> shared, `@remake`, `@reboot`, `@film-of-series` -> film, `@adaptation`, `@cut` -> recut); hand-written rows say it in the relationship column: `universe/prequel`. The builder rejects a kind that does not belong to the relationship type. The labels (EN + ID) live in `lib/i18n.ts` (`REL_KINDS` and `rel.<type>.<kind>.out/in`). 289 of the 982 rows now carry a kind. The Galaxy panel gets it too (sixth element of its edge tuple).
- **Import now treats the file as the source of truth for the optional fields** (`kind`, `storyEn`, `story`): a refreshed row that no longer has one loses it.
- **Not done:** the admin connections page does not show or edit `kind` yet; and `landing` still uses its own coarse `lp.rel.*` labels for the spotlight.

## 🟡 Follow-ups from the stories pilot

- [x] ~~**Audit the `h` homage, inspired, visual and remake rows**~~ — done 2026-11-03, see the section below.
- [ ] **16 APPROVED rows exist only in `connections-live.json`** (not in `scripts/curated/*.txt` or the seed), so a paragraph cannot attach to them and a rebuild of the seed does not know them. Examples: Coherence > Primer, The Love Witch > Vertigo, The Others > The Sixth Sense, Star Wars > Dune. The Dark Knight > Killing Joke was backported; the rest should be backported (with their text checked) when they get a paragraph. Five more live-only rows are REJECTED, which is expected.
- [ ] **Talent and director rows (~580) are the one big group not yet audited in full.** The 2026-10-21 audit sampled them (352 of 371 talent and 166 of 169 director correct), so they are the lowest risk. Auditing the rest would mostly confirm.
- [ ] **Scaling to the other ~950 connections needs per-connection research**, roughly the cost of this pilot times dozens. Talent and director rows are the thinnest on the page but their facts are the sparsest. Consider paragraphs only for connections with something genuinely interesting to say, and keep the one-liner for the rest.
- [x] ~~**The 3D map panel with a long paragraph selected**~~ — checked 2026-11-03 in headless Chrome (driven over the DevTools protocol, WebGL via SwiftShader): the Batman (1989) paragraph from The Flash fits the desktop panel (about 565px, no scrolling needed, label and buttons visible) and, on a 390px phone, the panel sits under the stage with a readable measure and full-width buttons.

## 🟡 New titles that don't have a map yet (2026-10-26)

- [ ] **Three of the 18 titles from 2026-11-03 still have zero connections, and genuinely can't be sourced yet:** Belladonna of Sadness (the other two Animerama films are not in the library; research only covered Wikipedia, not magazine criticism yet), Ip Man: Kung Fu Legend (Wikipedia doesn't have its page yet; don't guess a relationship to Kung Fu Master through the Mandarin title), Young Sherlock.

- [ ] **18 of the 60 newest titles still have zero connections.** Three franchises have been handled; the rest are not franchises, so relationships need to be found one by one: Lupin, Dark Matter, Heima, Samsara, Witch Hat Atelier, Modern Family, Titans, Invasion, ODDTAXI, April Story, Chainsmoker Cat, The Tunnel to Summer. Note: **Modern Family became an orphan because of the audit** — its only connection (to The Office) was rejected because it can't be sourced. That is an agreed consequence, not a regression.

## 🟠 Security & hygiene

- [x] **Runtime npm vulnerabilities** (2026-10-20, PR #1): `npm audit --omit=dev` 14 → 0 (3 critical gone). Next 14.2.15 → 15.5.28, React 18 → 19, axios 1.20, `node-telegram-bot-api` removed (unused; Telegram uses `fetch`), `overrides` postcss ^8.5.31. `eslint` + `eslint-config-next` + the `lint` script removed (there was no eslint config, it never ran). Verified in production by Idrus (admin login, Watch deep-link).
- [x] **Tailwind 3 → 4 migration** (2026-10-21): done with the official upgrade tool; before/after screenshots of 22 pages (guest + admin, desktop + phone) differ by <1% except settings (2px shift). `npm audit` now has 0 findings (including `follow-redirects` via `npm audit fix`).
- [ ] **Reinstall a linter (optional)**: eslint was removed during the upgrade. If wanted, add `eslint` + `eslint-config-next` 15 with a flat config.
- [x] ~~**next/image logo warning**~~ — fixed 2026-10-23. The cause was subtle: the props `width={116} height={32}` give a ratio of 3.625 while the original file is 1354x372 = 3.640. With `h-8 w-auto`, the rendered width of 116.47px does not equal the declared 116, so Next concludes one dimension was changed without the other. The props were changed to the file's real size so the ratio is exact; the displayed size does not change because CSS controls it. `top-nav.tsx` turned out to have stopped using Image since moving to PortalBar. While at it: the wordmark attributes in `portal-bar.tsx` (plain img, not Next) were corrected 86 -> 87 so the space reserved before the image loads is exact.
- [x] **Static `/api/health`** (2026-10-20): resolved by itself with Next 15, GET handlers are no longer cached by default (checked live: the timestamp changes on every request). Only the DB must be healthy; Jellyseerr being down does not make the container unhealthy.
- [x] ~~**User-level Jellyseerr API key** (known issue #1)~~ — Idrus installed an admin key 2026-10-23. It turned out **no code needed to change**: `getMediaCount()` is only called when the `LibraryTitle` snapshot is zero, and that snapshot already holds 920 titles, so Jellyseerr is never asked. The "stats stuck 0" problem had already been solved earlier via the Jellyfin snapshot, and that order is indeed **more correct** — Jellyseerr `/media` only counts media that ever went through Jellyseerr, while the Jellyfin library holds everything including what was added manually. Don't reverse it. What actually changed: `/api/admin/health` now reports the key type correctly on the Settings page. `getMediaCount()` was left as a safety net for fresh installs whose LibraryTitle is still empty.

- [x] **Rename "Surflix Reference"** (2026-10-20): portal, metadata, footer, admin tab and header use the name Reference + logo (the `/referensi` path is unchanged). Also fixed along the way: the hero subtitle was not centered and the mobile search button stretched to full width.
- [x] **Landing redesigned as a tile board** (2026-10-20, taste-skill direction `dense-tiles`, Bricolage Grotesque, logo orange `#ff5200`): hero poster sheet + text panel, Streaming (the 2001 photo cropped across tiles), Request Hub (three growing tiles), Reference (masonry + one real connection that changes with each visit), numbers, About (projector photo CC BY-SA, credit in the footer), coffee CTA, big-name footer. Server component (`lib/landing-data.ts`), its own CSS (`app/landing/landing.css`, prefix `lp-`), `lib/portal-urls.ts` used by server & client. taste-skill inspector: 0 FAIL at 1440/768/390, lint 0/0. WARNs kept: card-rows (one photo cut into tiles), no-footage (there is no honest, lightweight projector clip in the open collections), blank-gap 420px (the footer big name, one deliberate pause), ragged-edges (titles inside tiles), small-title at 768px (sentences in the panel, not display).
- [ ] **Sample content on the landing that needs confirmation**: the Request Hub fragment (name "Maya", progress 64%, status Approved) is an example, not hub data. The sentences "From silent classics to this year's releases" and "Whole seasons, ready to binge" were written from the library's contents, not calculated.

## 🟡 Reference content

- [~] **92 titles not yet mapped** (down from 211 on 2026-10-21: 825 / 917 have a map). The rest really are on their own: documentaries, indie/arthouse films, sitcoms, and anime that share no creator or cast with another title in the library. Add manually via Manage → Add a connection if you know a documented relationship. Don't invent relationships for the sake of a number.
- [x] **Review of 23 PENDING_REVIEW connections** (Idrus, 2026-10-21, directly in production). The decisions were pulled into the repo 2026-10-23.
- [x] ~~**Pull `connections-live.json` from prod into the repo.**~~ Done 2026-10-23 (commit `c365bac`). The diff was exactly 33 lines, all status changes and zero format noise. **It now has 950 rows, all `APPROVED` — nothing is waiting for review.** My initial assumption was wrong and needs to be recorded: I thought 17 `REJECTED` rows had vanished from prod, but they were there with their status flipped to `APPROVED`. `lib/sagas.json` did not change because none of those 33 was of type `universe`/`remake`. Notes on the procedure are in `CLAUDE.md`. Old context: Idrus had approved the connections waiting for review, but that decision lived in prod and had never been pulled back — the file in the repo is an export of the LOCAL database, so its statuses were stale and every "N waiting for review" count read from it was wrong. This produced a wrong report twice already. Prod itself is safe: `import-connections.js` never changes the status of an existing row. How: `docker exec surflix node scripts/export-connections.js` then `docker cp surflix:/app/scripts/connections-live.json /tmp/`, scp to the Mac, then import into the local dev.db. Do this **before** importing in the opposite direction.
- [ ] **Review the Indonesian translations** in `lib/i18n.ts` and the `reason` column (made together with the English text, not yet read by a native speaker).
- [ ] **Dirty file names in the Jellyfin library** (`Requiem.for.a.Dream.2000.PROPER…`, `MIRCrew`, and `Lady Bird 2017 from ExKinoRay`, which was spotted during the talent audit). The snapshot is already cleaned automatically (folder name / OriginalTitle), but tidy them up in Jellyfin when there's time (rename or refresh metadata).
- [x] **Auto-sync library** (2026-10-20, awaiting deploy): the Jellyseerr webhook `MEDIA_AVAILABLE` / `MEDIA_PARTIALLY_AVAILABLE` calls `scheduleLibrarySync()` (30 s debounce, one sync per burst of events, never throws an error, logged in EventLog `library.autosync`). It also applies to titles that did not come from a Surflix request. Requirements in production: the Jellyseerr webhook is installed (Settings → Notifications → Webhook, URL `…/api/webhooks/jellyseerr`, header `Bearer <WEBHOOK_SECRET>`) and the Jellyfin env exists. The webhook now rejects all requests if `WEBHOOK_SECRET` is empty.
- [ ] **LLM pipeline (`/api/admin/connections/generate`) is dormant.** It needs `ANTHROPIC_API_KEY` + the Jellyfin env. Curation is manual right now; delete it or revive it later.

## 🟢 Product & UX

- [x] **Per-film metadata for share/SEO** (2026-10-20, awaiting deploy): `app/referensi/[type]/[id]/layout.tsx` (server) attaches `generateMetadata` from `getFilmMeta()`: tab title `Film (tahun): N connections · Surflix Referensi`, description from the single best reason, og:image poster (TMDB if available, otherwise the public Jellyfin Primary image), `metadataBase` in the portal layout (`NEXT_PUBLIC_REFERENCE_URL` to override). Remaining ideas: a composite OG image (poster + title) and a sitemap.xml for the map pages.
- [~] **Galaxy** (2026-10-21): filter per connection type (a row of chips that doubles as the line-color legend), group names that appear when zooming out and disappear when zooming in (taken from the title with the most connections in that group, not invented), and a text list view as the accessible version. **Remaining**: the O(n²) layout on the server needs replacing (worker / precompute) if the library is > ~2000 points.
- [x] **Request Hub is still mixed Indonesian/English**; the Referensi portal and the landing are already English. Decide: i18n the hub or standardize on one language.
- [x] **Landing hardcodes URLs** (2026-10-20, awaiting deploy): the landing cards are now derived from the hostname via `buildPortalUrls()` (`lib/hooks/use-portal.ts`, extended for apex/www). Production is unchanged; locally the cards go to `/` and `/referensi`. SSR still renders the production URLs.
- [x] **Compose in Dockge** aligned with the repo (Idrus, 2026-10-21).

## 🧹 Cleanup

- [x] Prototype `surflix-reference-graph-prototype.jsx` and `lib/jellyseerr.ts.bak` deleted (2026-10-20; they remain in git history, `FEATURE-CONNECTIONS.md` still mentions that prototype as the early design reference).
- [x] **One source of truth for connection data** (2026-10-21): `scripts/curated/*.txt` is the written source, `connections-seed.json` is only a build result (artifact, committed so its changes are visible in the diff), and `connections-live.json` (exported from the local database after review) is the only file imported into production. The flow is in the "How to: update connections" section.

---

## How to: update connections (curate locally, deploy to production)

1. Write new rows in `scripts/curated/*.txt` (the format is in the header of `scripts/build-connections.js`). Titles are validated against `scripts/library-seed.json`.
2. `node scripts/build-connections.js` → `scripts/connections-seed.json` (h = APPROVED, m = PENDING_REVIEW).
3. Locally: `DATABASE_URL="file:./dev.db" node scripts/import-connections.js scripts/connections-seed.json --apply` (dry-run first without `--apply`), review the `m` ones at `/admin/connections`.
4. `DATABASE_URL="file:./dev.db" node scripts/export-connections.js` → `scripts/connections-live.json` (a snapshot of the review decisions).
5. `node scripts/build-sagas.js` → `lib/sagas.json` (Watch order). New `universe`/`remake` connections automatically become sagas; add `DATABASE_URL="file:./dev.db"` for a report of titles not yet in the library. **Always run this after step 4**, otherwise Watch order lags behind the map.
6. Commit + push (`curated/`, `connections-seed.json`, `connections-live.json`, `lib/sagas.json`). CI builds the image; the `scripts/` folder is included in the image.
7. Dockge **Update**, then on Unraid: `docker exec surflix node scripts/import-connections.js scripts/connections-live.json` (dry-run), check the numbers, repeat with `--apply`. The status of existing rows is never changed; rows created by an admin are skipped.
8. New titles in Jellyfin: press the **Sync library** button first (admin), so the title is in the snapshot before it is mapped.

## How to: enable Sync library (Jellyfin env)

1. **Create a Jellyfin API key**: Jellyfin → Dashboard → Advanced → **API Keys** → **+** → name `Surflix Referensi`. Copy the key (don't send it to chat/commit).
2. **Dockge** (`:5001`) → stack **surflix** → **Edit**.
   - In the compose, under `environment:` (below `VAPID_SUBJECT`), add:
     ```yaml
     JELLYFIN_URL: ${JELLYFIN_URL:-http://host.docker.internal:8096}
     JELLYFIN_API_KEY: ${JELLYFIN_API_KEY}
     ```
   - In the **.env** editor (below the compose), add `JELLYFIN_API_KEY=<the key from before>`.
   - **Deploy** (not just Restart: compose changes need `up -d`).
3. **Check**: `docker exec surflix sh -c 'wget -qO- --header="Authorization: MediaBrowser Token=\"$JELLYFIN_API_KEY\"" "$JELLYFIN_URL/System/Info" | head -c 150'` → the Jellyfin server JSON must come out.
4. Admin → `/admin/connections` → **Sync library**: toast `Library synced: N new, N updated`.

## Done 2026-10-21 (user feedback)
- [x] **The three views feel separate.** Feedback via WhatsApp: "di page movie-nya dia ga ada ya? Harus di page Galaxy" (so it's not on the movie page? You have to go to the Galaxy page). The link actually already existed, but it was buried — the "Part of X" snippet sat after the 3D stage that is 560–860px tall, and the Galaxy link was only small text. From Watch order there was no way to Galaxy at all. Now there is a single three-lens control on all three pages, above the first screen.
- [ ] **Galaxy is too far out when opened** (same feedback). Not yet decided: start from a closer zoom, or leave it as a full view since group names appear precisely when zooming out.

## Note: production is newer than the repo (2026-10-21)
The review of 15 `PENDING_REVIEW` connections was done directly at `/admin/connections` in production, not locally. As a result `scripts/connections-live.json` (and `lib/sagas.json` derived from it) still treats them as waiting for review. Importing to production will not break anything — the script never changes the status of existing rows — but new sagas from newly approved `universe`/`remake` connections have not appeared yet.

How to pull it back (on Unraid):
```
docker exec surflix node scripts/export-connections.js
docker cp surflix:/app/scripts/connections-live.json ./connections-live.json
```
then send that file, put it in `scripts/`, run `node scripts/build-sagas.js`, commit.

## Done 2026-10-21 (Watch order)
- [x] **Watch order** (`/referensi/timeline`): an index of 62 sagas + a stage per saga with pan/pinch/zoom, Story vs Release order, branching lanes. Sagas are derived automatically from `universe`/`remake` connections (325 titles), curation wins via `scripts/curated/sagas.txt`. Cross-linked with the film map, Galaxy, and the home hero.
- [x] The order of Reference links and the site pills was standardized; PortalBar is sticky on all pages; the landing got an illustrated "three ways in" block.

## Done 2026-10-21 (ideas that were parked)
- [x] Sitemap + OG card per film for Reference. Remaining for Idrus: register the sitemap in Google Search Console.
- [x] "Just added" page in Reference (needs an automatic `db push` when the container starts; data fills in after one sync).
- [x] Pending-connection preview in Galaxy for admins.
