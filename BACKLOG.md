# BACKLOG.md — Surflix

> Hal-hal yang sengaja ditunda. Urut dari yang paling berdampak. Update file ini tiap ada yang selesai atau nambah.
> Terakhir diupdate: 2026-10-21 (setelah Watch order dan perombakan Galaxy).

## 🔴 Tindak lanjut cepat (setelah deploy terakhir)

- [x] **Verifikasi deep-link Tonton di Request Hub** (dicek Idrus, 2026-10-20: jalan). Tombol "Watch on Surflix" di detail modal sekarang nyari `jellyfinId` dari snapshot library lalu buka `#/details?id=…&serverId=…`. Film yang belum ada di snapshot jatuh ke home Jellyfin. Cek: buka satu film Available → klik Watch → harus langsung ke filmnya.
- [x] **Aktifin Sync library** (2026-10-20): env Jellyfin ter-deploy, tombol Sync library dicek Idrus dan jalan. (Key lama yang sempat ke-share di chat harus sudah di-revoke.) Tanpa ini snapshot library cuma update kalau import script dijalanin manual, jadi film baru gak punya deep-link / gak bisa dicari di portal. Langkah ada di bagian "Cara" bawah.
- [x] **Angka landing** (2026-10-20): `723 films · 194 series · 706 titles mapped`; `/api/upcoming` keisi lagi (20 film). `/api/most-requested` kosong itu wajar: syaratnya minimal 2 request untuk judul yang sama.
- [~] **Sampling fakta koneksi.**
  - [x] **371 koneksi `talent` diaudit** (2026-10-21, 8 pemeriksa paralel, satu per kelompok orang, wajib dari halaman sumber bukan ingatan): 352 benar, 15 teksnya kelebihan ("stars in both" padahal cameo/suara/satu episode) sudah ditulis ulang, 4 salah dan ditolak (Noriyuki Abe bukan sutradara Hunter × Hunter 1999; Charlotte Gainsbourg ada di Jane Eyre 1996 bukan 1997 yang ada di library; Production I.G tidak menganimasikan Uzumaki 2024; Adam Driver tidak ada di ENJOY 2021). Nol "tidak yakin".
  - [x] **169 koneksi `director` diaudit** (2026-10-21, 4 pemeriksa paralel): 166 benar, 0 salah, 0 tidak yakin. 3 teksnya menyebut sutradara tunggal padahal karyanya digarap berdua — Danny dan Michael Philippou (Talk to Me / Bring Her Back), duo Daniels (Swiss Army Man / Everything Everywhere), dan Hideaki Anno yang di Evangelion 3.0 sutradara kepala, bukan tunggal.
  - Catatan: koneksi `director` **tidak ditulis per baris** — dibuat otomatis dari `scripts/curated/directors.list` (nama = kunci pencarian ke kolom directors Jellyfin). Untuk mengubah kalimatnya pakai `| as: Nama EN || Nama ID`; untuk kasus yang perlu kalimat khusus, keluarkan namanya dari daftar lalu tulis pasangannya di `06-deepen.txt`.
  - [ ] Koneksi `visual` / `inspired` yang dulunya `confidence: medium`.

## 🟠 Keamanan & hygiene

- [x] **Vulnerability npm runtime** (2026-10-20, PR #1): `npm audit --omit=dev` 14 → 0 (3 critical hilang). Next 14.2.15 → 15.5.28, React 18 → 19, axios 1.20, `node-telegram-bot-api` dibuang (tidak dipakai; Telegram pakai `fetch`), `overrides` postcss ^8.5.31. `eslint` + `eslint-config-next` + script `lint` dihapus (tidak ada konfigurasi eslint, tidak pernah jalan). Diverifikasi di produksi oleh Idrus (login admin, deep-link Watch).
- [x] **Migrasi Tailwind 3 → 4** (2026-10-21): selesai dengan alat upgrade resmi; screenshot sebelum/sesudah 22 halaman (guest + admin, desktop + telepon) beda <1% kecuali settings (pergeseran 2px). `npm audit` sekarang 0 temuan (termasuk `follow-redirects` lewat `npm audit fix`).
- [ ] **Pasang linter lagi (opsional)**: eslint dibuang saat upgrade. Kalau mau, tambah `eslint` + `eslint-config-next` 15 dengan flat config.
- [x] ~~**Warning next/image logo**~~ — diperbaiki 2026-10-23. Sebabnya halus: prop `width={116} height={32}` memberi rasio 3,625 sedangkan berkas aslinya 1354x372 = 3,640. Dengan `h-8 w-auto`, lebar hasil render 116,47px tidak sama dengan 116 yang dideklarasikan, jadi Next menganggap satu dimensi diubah tanpa yang lain. Prop diganti ke ukuran asli berkas sehingga rasionya persis; ukuran tampilnya tidak berubah karena CSS yang mengatur. `top-nav.tsx` ternyata sudah tidak memakai Image sejak pindah ke PortalBar. Sekalian: atribut wordmark di `portal-bar.tsx` (img biasa, bukan Next) dibetulkan 86 -> 87 supaya ruang yang dipesan sebelum gambar termuat tepat.
- [x] **`/api/health` statis** (2026-10-20): beres sendiri oleh Next 15, GET handler tidak lagi di-cache default (dicek live: timestamp berubah tiap request). Yang wajib sehat cuma DB; Jellyseerr down tidak membuat container unhealthy.
- [x] ~~**Jellyseerr API key user-level** (known issue #1)~~ — Idrus memasang key admin 2026-10-23. Ternyata **tidak ada kode yang perlu berubah**: `getMediaCount()` hanya dipanggil kalau snapshot `LibraryTitle` nol, dan snapshot itu sudah berisi 920 judul, jadi Jellyseerr tidak pernah ditanya. Masalah "stats stuck 0" sudah selesai lebih dulu lewat snapshot Jellyfin, dan urutan itu memang **lebih benar** — Jellyseerr `/media` cuma menghitung media yang pernah lewat Jellyseerr, sedangkan library Jellyfin memuat semuanya termasuk yang ditambah manual. Jangan dibalik. Yang benar-benar berubah: `/api/admin/health` kini melaporkan jenis key dengan benar di halaman Settings. `getMediaCount()` dibiarkan sebagai jaring pengaman untuk instalasi baru yang LibraryTitle-nya masih kosong.

- [x] **Rename "Surflix Reference"** (2026-10-20): portal, metadata, footer, tab admin dan header memakai nama Reference + logo (path `/referensi` tidak berubah). Ikut diperbaiki: subtitle hero tidak center dan tombol search mobile melebar penuh.
- [x] **Landing didesain ulang sebagai papan ubin** (2026-10-20, taste-skill direction `dense-tiles`, Bricolage Grotesque, oranye logo `#ff5200`): hero lembar poster + panel teks, Streaming (foto 2001 dipotong lintas ubin), Request Hub (tiga ubin yang membesar), Reference (masonry + satu koneksi nyata yang berganti tiap kunjungan), angka, About (foto proyektor CC BY-SA, kredit di footer), CTA kopi, footer nama besar. Server component (`lib/landing-data.ts`), CSS sendiri (`app/landing/landing.css`, prefix `lp-`), `lib/portal-urls.ts` dipakai server & client. Inspector taste-skill: 0 FAIL di 1440/768/390, lint 0/0. WARN yang dipertahankan: card-rows (satu foto dipotong jadi ubin), no-footage (tidak ada klip proyektor yang jujur & ringan di koleksi terbuka), blank-gap 420px (nama besar footer, satu jeda sengaja), ragged-edges (judul di dalam ubin), small-title di 768px (kalimat di panel, bukan display).
- [ ] **Isi sampel di landing yang perlu dikonfirmasi**: fragmen Request Hub (nama "Maya", progres 64%, status Approved) adalah contoh, bukan data hub. Kalimat "From silent classics to this year's releases" dan "Whole seasons, ready to binge" ditulis dari isi library, bukan dihitung.

## 🟡 Konten Referensi

- [~] **92 judul belum dipetakan** (turun dari 211 pada 2026-10-21: 825 / 917 punya peta). Sisanya memang sendirian: dokumenter, film indie/arthouse, sitkom, dan anime yang tidak punya pembuat atau pemeran bersama dengan judul lain di library. Tambah manual via Manage → Add a connection kalau tahu hubungan yang terdokumentasi. Jangan ngarang hubungan demi angka.
- [x] **Review 23 koneksi PENDING_REVIEW** (Idrus, 2026-10-21, langsung di production). ⚠️ Keputusannya ada di DB production, belum ditarik ke `scripts/connections-live.json` — lihat catatan di bawah.
- [ ] **Review 16 koneksi berstatus PENDING_REVIEW** di `/admin/connections`. Semuanya sengaja diberi confidence `m` karena buktinya lebih lemah: kemiripan visual, kritikus yang sering memasangkan, kredit dari metadata, atau sumber situs penggemar. Approve atau reject; sampai diputuskan mereka tidak muncul di peta. Yang terbaru: cameo Pawai Siluman Pom Poko (sumbernya situs referensi penggemar, bukan terbitan Ghibli).
- [ ] **Review terjemahan Indonesia** di `lib/i18n.ts` dan kolom `reason` (dibuat bareng teks Inggris, belum dibaca penutur native).
- [ ] **Nama file kotor di library Jellyfin** (`Requiem.for.a.Dream.2000.PROPER…`, `MIRCrew`, dan `Lady Bird 2017 from ExKinoRay` yang ketahuan saat audit talent). Snapshot sudah dibersihin otomatis (nama folder / OriginalTitle), tapi rapihin di Jellyfin kalau sempat (rename atau refresh metadata).
- [x] **Auto-sync library** (2026-10-20, menunggu deploy): webhook Jellyseerr `MEDIA_AVAILABLE` / `MEDIA_PARTIALLY_AVAILABLE` memanggil `scheduleLibrarySync()` (debounce 30 dtk, satu sync per rentetan event, tidak pernah melempar error, log di EventLog `library.autosync`). Berlaku juga untuk judul yang bukan dari request Surflix. Syarat di produksi: webhook Jellyseerr terpasang (Settings → Notifications → Webhook, URL `…/api/webhooks/jellyseerr`, header `Bearer <WEBHOOK_SECRET>`) dan env Jellyfin ada. Webhook sekarang menolak semua request kalau `WEBHOOK_SECRET` kosong.
- [ ] **Pipeline LLM (`/api/admin/connections/generate`) dorman.** Butuh `ANTHROPIC_API_KEY` + env Jellyfin. Sekarang kurasi manual; hapus atau hidupkan lagi nanti.

## 🟢 Produk & UX

- [x] **Metadata per film untuk share/SEO** (2026-10-20, menunggu deploy): `app/referensi/[type]/[id]/layout.tsx` (server) memasang `generateMetadata` dari `getFilmMeta()`: judul tab `Film (tahun): N connections · Surflix Referensi`, deskripsi dari satu alasan terbaik, og:image poster (TMDB kalau ada, kalau tidak gambar Primary Jellyfin publik), `metadataBase` di layout portal (`NEXT_PUBLIC_REFERENCE_URL` untuk override). Sisa ide: gambar OG komposit (poster + judul) dan sitemap.xml untuk halaman peta.
- [~] **Galaxy** (2026-10-21): saringan per jenis koneksi (deretan chip yang sekaligus jadi legenda warna garis), nama kelompok yang muncul saat menjauh dan hilang saat mendekat (diambil dari judul paling banyak koneksi di kelompok itu, bukan karangan), dan tampilan daftar teks sebagai versi aksesibel. **Sisa**: layout O(n²) di server perlu diganti (worker / precompute) kalau library > ~2000 titik.
- [x] **Request Hub masih campur Indonesia/English**; portal Referensi dan landing sudah English. Putuskan: i18n hub atau seragamin satu bahasa.
- [x] **Landing nge-hardcode URL** (2026-10-20, menunggu deploy): kartu landing sekarang diturunkan dari hostname lewat `buildPortalUrls()` (`lib/hooks/use-portal.ts`, diperluas untuk apex/www). Produksi tidak berubah; di lokal kartu ke `/` dan `/referensi`. SSR tetap merender URL produksi.
- [x] **Compose di Dockge** disamakan dengan repo (Idrus, 2026-10-21).

## 🧹 Bersih-bersih

- [x] Prototype `surflix-reference-graph-prototype.jsx` dan `lib/jellyseerr.ts.bak` dihapus (2026-10-20; tetap ada di git history, `FEATURE-CONNECTIONS.md` masih menyebut prototype itu sebagai referensi desain awal).
- [x] **Satu sumber kebenaran data koneksi** (2026-10-21): `scripts/curated/*.txt` adalah sumber tulisan, `connections-seed.json` hanya hasil build (artefak, dikomit supaya perubahannya terlihat di diff), dan `connections-live.json` (diekspor dari database lokal setelah review) adalah satu-satunya file yang diimpor ke production. Alurnya ada di bagian "Cara: update koneksi".

---

## Cara: update koneksi (kurasi di lokal, deploy ke production)

1. Tulis baris baru di `scripts/curated/*.txt` (format ada di header `scripts/build-connections.js`). Judul divalidasi terhadap `scripts/library-seed.json`.
2. `node scripts/build-connections.js` → `scripts/connections-seed.json` (h = APPROVED, m = PENDING_REVIEW).
3. Lokal: `DATABASE_URL="file:./dev.db" node scripts/import-connections.js scripts/connections-seed.json --apply` (dry-run dulu tanpa `--apply`), review yang `m` di `/admin/connections`.
4. `DATABASE_URL="file:./dev.db" node scripts/export-connections.js` → `scripts/connections-live.json` (foto keputusan review).
5. `node scripts/build-sagas.js` → `lib/sagas.json` (Watch order). Koneksi `universe`/`remake` yang baru otomatis jadi saga; tambah `DATABASE_URL="file:./dev.db"` untuk laporan judul yang belum ada di library. **Selalu jalankan ini setelah langkah 4**, kalau tidak Watch order tertinggal dari peta.
6. Commit + push (`curated/`, `connections-seed.json`, `connections-live.json`, `lib/sagas.json`). CI membangun image; folder `scripts/` ikut di image.
7. Dockge **Update**, lalu di Unraid: `docker exec surflix node scripts/import-connections.js scripts/connections-live.json` (dry-run), cek angkanya, ulangi dengan `--apply`. Status baris yang sudah ada tidak pernah diubah; baris buatan admin dilewati.
8. Judul baru di Jellyfin: tombol **Sync library** dulu (admin), supaya judul itu ada di snapshot sebelum dipetakan.

## Cara: aktifin Sync library (env Jellyfin)

1. **Bikin API key Jellyfin**: Jellyfin → Dashboard → Advanced → **API Keys** → **+** → nama `Surflix Referensi`. Copy key-nya (jangan kirim ke chat/commit).
2. **Dockge** (`:5001`) → stack **surflix** → **Edit**.
   - Di compose, bagian `environment:` (di bawah `VAPID_SUBJECT`), tambah:
     ```yaml
     JELLYFIN_URL: ${JELLYFIN_URL:-http://host.docker.internal:8096}
     JELLYFIN_API_KEY: ${JELLYFIN_API_KEY}
     ```
   - Di editor **.env** (bawah compose), tambah `JELLYFIN_API_KEY=<key tadi>`.
   - **Deploy** (bukan cuma Restart: perubahan compose butuh `up -d`).
3. **Cek**: `docker exec surflix sh -c 'wget -qO- --header="Authorization: MediaBrowser Token=\"$JELLYFIN_API_KEY\"" "$JELLYFIN_URL/System/Info" | head -c 150'` → harus keluar JSON server Jellyfin.
4. Admin → `/admin/connections` → **Sync library**: toast `Library synced: N new, N updated`.

## Selesai 2026-10-21 (masukan dari pengguna)
- [x] **Ketiga pandangan terasa terpisah.** Masukan lewat WhatsApp: "di page movie-nya dia ga ada ya? Harus di page Galaxy". Tautannya sebenarnya sudah ada, tapi terkubur — potongan "Part of X" duduk setelah panggung 3D setinggi 560–860px, dan tautan Galaxy cuma teks kecil. Dari Watch order malah belum ada jalan ke Galaxy sama sekali. Sekarang ada satu kendali tiga lensa di ketiga halaman, di atas layar pertama.
- [ ] **Galaxy terlalu jauh saat dibuka** (masukan yang sama). Belum diputuskan: mulai dari zoom lebih dekat, atau biarkan sebagai pemandangan utuh karena nama kelompok justru muncul saat menjauh.

## Catatan: production lebih baru dari repo (2026-10-21)
Review 15 koneksi `PENDING_REVIEW` dilakukan langsung di `/admin/connections` production, bukan di lokal. Akibatnya `scripts/connections-live.json` (dan `lib/sagas.json` yang diturunkan darinya) masih menganggapnya menunggu review. Import ke production tidak akan merusak apa pun — script tidak pernah mengubah status baris yang sudah ada — tapi saga baru dari koneksi `universe`/`remake` yang baru disetujui belum muncul.

Cara menariknya kembali (di Unraid):
```
docker exec surflix node scripts/export-connections.js
docker cp surflix:/app/scripts/connections-live.json ./connections-live.json
```
lalu kirim file itu, taruh di `scripts/`, jalankan `node scripts/build-sagas.js`, commit.

## Selesai 2026-10-21 (Watch order)
- [x] **Watch order** (`/referensi/timeline`): indeks 62 saga + panggung per saga dengan geser/cubit/zoom, urutan Cerita vs Rilis, jalur bercabang. Saga diturunkan otomatis dari koneksi `universe`/`remake` (325 judul), kurasi menang lewat `scripts/curated/sagas.txt`. Saling tertaut dengan peta film, Galaxy, dan hero beranda.
- [x] Urutan tautan Reference dan pill situs diseragamkan; PortalBar sticky di semua halaman; landing dapat blok "tiga cara masuk" bergambar.

## Selesai 2026-10-21 (ide yang tadinya diparkir)
- [x] Sitemap + kartu OG per film untuk Reference. Sisa untuk Idrus: daftarkan sitemap di Google Search Console.
- [x] Halaman "Just added" di Reference (butuh `db push` otomatis saat container start; data terisi setelah satu sync).
- [x] Pratinjau koneksi pending di Galaxy untuk admin.
