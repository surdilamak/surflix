# BACKLOG.md — Surflix

> Hal-hal yang sengaja ditunda. Urut dari yang paling berdampak. Update file ini tiap ada yang selesai atau nambah.
> Terakhir diupdate: 2026-10-26 (audit koneksi, perbaikan Jellyseerr, tiga saga baru).

## 🔴 Tindak lanjut cepat (setelah deploy terakhir)

- [x] **Verifikasi deep-link Tonton di Request Hub** (dicek Idrus, 2026-10-20: jalan). Tombol "Watch on Surflix" di detail modal sekarang nyari `jellyfinId` dari snapshot library lalu buka `#/details?id=…&serverId=…`. Film yang belum ada di snapshot jatuh ke home Jellyfin. Cek: buka satu film Available → klik Watch → harus langsung ke filmnya.
- [x] **Aktifin Sync library** (2026-10-20): env Jellyfin ter-deploy, tombol Sync library dicek Idrus dan jalan. (Key lama yang sempat ke-share di chat harus sudah di-revoke.) Tanpa ini snapshot library cuma update kalau import script dijalanin manual, jadi film baru gak punya deep-link / gak bisa dicari di portal. Langkah ada di bagian "Cara" bawah.
- [x] **Angka landing** (2026-10-20): `723 films · 194 series · 706 titles mapped`; `/api/upcoming` keisi lagi (20 film). `/api/most-requested` kosong itu wajar: syaratnya minimal 2 request untuk judul yang sama.
- [~] **Sampling fakta koneksi.**
  - [x] **371 koneksi `talent` diaudit** (2026-10-21, 8 pemeriksa paralel, satu per kelompok orang, wajib dari halaman sumber bukan ingatan): 352 benar, 15 teksnya kelebihan ("stars in both" padahal cameo/suara/satu episode) sudah ditulis ulang, 4 salah dan ditolak (Noriyuki Abe bukan sutradara Hunter × Hunter 1999; Charlotte Gainsbourg ada di Jane Eyre 1996 bukan 1997 yang ada di library; Production I.G tidak menganimasikan Uzumaki 2024; Adam Driver tidak ada di ENJOY 2021). Nol "tidak yakin".
  - [x] **169 koneksi `director` diaudit** (2026-10-21, 4 pemeriksa paralel): 166 benar, 0 salah, 0 tidak yakin. 3 teksnya menyebut sutradara tunggal padahal karyanya digarap berdua — Danny dan Michael Philippou (Talk to Me / Bring Her Back), duo Daniels (Swiss Army Man / Everything Everywhere), dan Hideaki Anno yang di Evangelion 3.0 sutradara kepala, bukan tunggal.
  - Catatan: koneksi `director` **tidak ditulis per baris** — dibuat otomatis dari `scripts/curated/directors.list` (nama = kunci pencarian ke kolom directors Jellyfin). Untuk mengubah kalimatnya pakai `| as: Nama EN || Nama ID`; untuk kasus yang perlu kalimat khusus, keluarkan namanya dari daftar lalu tulis pasangannya di `06-deepen.txt`.
  - [x] **68 koneksi `confidence: medium` diaudit** (2026-10-26, 4 pemeriksa paralel, commit `877bcc8`) — seluruhnya `source: llm` dan belum pernah diverifikasi. Hasil: 35 benar · 21 ditulis ulang · 3 dinaikkan (ternyata terlalu merendah) · **12 ditolak**. Separuh dari yang ditulis model tidak bisa dipertahankan. Empat pola: kalimat pewawancara dicuci jadi ucapan pembuat film (4 baris, termasuk kutipan Cyberpunk: Edgerunners yang tidak pernah ada); reboot diperlakukan sebagai kelanjutan (Superman 2025, The Batman); arah pengaruh terbalik (Aronofsky, Refn, Franz/Fiala, Biller semuanya sudah MENOLAK perbandingan yang kita pajang — dan naskah The Others ditulis ~1998, setahun sebelum film yang diklaim menginspirasinya tayang); serta kebalikannya, 3 baris yang menulis "kritikus membandingkan" padahal ada pernyataan pembuatnya. Setelah ronde ini **tidak ada lagi baris `medium`** — 938 APPROVED, 12 REJECTED.
  - Pelajaran untuk kurasi berikutnya: **ENJOY (2021) adalah magnet kredit karangan** — judul umum, data tipis, dan model mengisinya dengan nama besar. Sudah dua audit berturut-turut menolak baris di film itu (Adam Driver, lalu Ridley Scott). Periksa ekstra kalau ada koneksi baru menyentuhnya.

## ✅ Selesai 2026-10-23 (halaman legal, kanonikalisasi host, Search Console)

- [x] **Halaman `/terms` dan `/privacy`** (commit `f58b300`), ditulis dari fakta yang diperiksa — nol pelacak, model Prisma yang betul ada, nama cookie yang betul dipakai — bukan templat. Milik apex; dari subdomain di-308 ke sana. Kontak `admin@surflix.my.id` di ketiga footer, EN + ID.
- [x] **404 bermerek** (`app/not-found.tsx`). Sebelumnya tiap salah ketik jatuh ke layar bawaan Next: tulisan hitam di atas putih, di situs yang seluruhnya gelap.
- [x] **Apex tidak lagi menyajikan salinan kedua**: path selain `/` di-308 ke host pemiliknya. Dipilih redirect, bukan tag canonical — canonical cuma memberi petunjuk ke mesin pencari, URL keduanya tetap hidup dan `/admin` tetap terbuka di host yang salah.
- [x] **Satu host kanonik: apex tanpa `www`** (commit `83cc57b`). Pengalihan lama apex→www ternyata dari **NPM**, bukan Cloudflare — header `server: cloudflare` menyesatkan karena Cloudflare menimpa header itu untuk semua trafik yang diproksikan. Rute tunnel apex sekarang menembak langsung `192.168.68.8:3737`, dan `www`→apex diurus `middleware.ts`. Jebakan rute tunnel dicatat di `~/Developer/Unraid/README.md`.
- [x] **Sitemap lengkap** (commit `c1d5297`): 65 halaman saga dan 2 halaman Hub yang sebelumnya yatim kini masuk. Prod: apex 1 · Hub 4 · Reference 911 URL.
- [x] **Google Search Console**: Domain property `surflix.my.id` (verifikasi TXT) yang mencakup semua subdomain; ketiga sitemap dikirim; ketiga host lolos *Test live URL*. Properti `www` yang lama berjenis URL-prefix sehingga **tidak pernah mencakup `reference.*`** sama sekali.

## 🔵 Tindak lanjut Search Console (cek sekali, lalu lupakan)

- [ ] **Status sitemap di GSC**: saat dikirim 2026-10-23 ketiganya `Couldn't fetch`, dan itu wajar — kolom `Last read` kosong, artinya belum pernah diambil, bukan gagal diambil. Harus sudah berubah jadi `Success` dengan `Discovered pages` terisi. Kalau masih merah, sisi server bukan penyebabnya: ketiga sitemap menjawab 200 ke Googlebot dengan `content-type: application/xml`.

## ✅ Selesai 2026-10-26 (audit koneksi, Jellyseerr, Watch order)

- [x] **Audit 68 koneksi `medium`** (`877bcc8`, `c613010`) — detail di bagian "Sampling fakta koneksi" di atas. Tidak ada lagi baris `medium`: 945 APPROVED, 12 REJECTED.
- [x] **Tiga saga baru** (`8fde309`): Hunger Games (5 film), Back to the Future (3), Breaking Bad (3, termasuk El Camino). 7 koneksi `universe` baru. Back to the Future sengaja TANPA urutan cerita terpisah — perjalanan Marty beruntun, jadi zamannya ditulis sebagai label (`1985 → 1955`), bukan urutan yang berbeda.
- [x] **Jellyseerr 2.7.3 → Seerr 3.5.1.** Jellyfin 12 membuang header auth lama (`X-Emby-Authorization`), jadi sejak ~22 Oktober semua media baru tersangkut `PROCESSING` dan **auto-sync Surflix tidak pernah terpicu**. Sekarang jalan lagi. Seluruh penelusuran dan empat jebakan update-nya ada di `~/Developer/Unraid/README.md` — baca di sana, jangan diulang dari nol.

### Dua jebakan yang ditemukan hari ini — BACA SEBELUM MENGEDIT KONEKSI

1. **Hasil audit WAJIB ditulis ke `scripts/curated/*.txt`, bukan ke `connections-live.json`.** Audit 68 baris sempat ditulis langsung ke berkas turunan; 18 di antaranya masih memuat kalimat lama di sumbernya, dan `build-connections.js` berikutnya akan menghidupkannya lagi — termasuk klaim yang sudah ditolak. Sudah di-backport. Cara memeriksa: bandingkan `reasonEn` seed vs live, harus nol beda.
2. **Kolom label cerita di `sagas.txt` tidak mendukung `EN || ID`.** Baris dipotong per `|` dulu, jadi terjemahannya tersedot ke kolom catatan dan tampil sebagai teks sampah berawalan `|` — dan catatan itu **dirender** di panel detail (`saga-stage.tsx:479`). Bug ini sudah tampil di produksi pada kartu Ballerina sejak saga John Wick dibuat. Sudah diperbaiki; jebakannya didokumentasikan di header `sagas.txt`.

### Urutan kerja yang terbukti benar untuk judul baru

`Sync library` (admin) → `export-library.js` di prod → salin ke repo → **selaraskan `dev.db` dengan `connections-live.json` lebih dulu** (kalau tidak, ekspor menghapus keputusan audit — 32 status sempat beda) → tulis kurasi → `build-connections.js` → import ke dev.db → `export-connections.js` → `build-sagas.js`. Builder menolak teks di atas **220 karakter**.

## 🟡 Judul baru yang belum punya peta (2026-10-26)

- [ ] **18 dari 60 judul terbaru masih nol koneksi.** Tiga franchise sudah ditangani; sisanya bukan franchise jadi perlu hubungan yang dicari satu per satu: Lupin, Dark Matter, Heima, Samsara, Witch Hat Atelier, Modern Family, Titans, Invasion, ODDTAXI, April Story, Chainsmoker Cat, The Tunnel to Summer. Catatan: **Modern Family jadi yatim karena audit** — satu-satunya koneksinya (ke The Office) ditolak sebab tidak bisa disumberkan. Itu konsekuensi yang disetujui, bukan kemunduran.

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
- [x] **Review 23 koneksi PENDING_REVIEW** (Idrus, 2026-10-21, langsung di production). Keputusannya sudah ditarik ke repo 2026-10-23.
- [x] ~~**Tarik `connections-live.json` dari prod ke repo.**~~ Selesai 2026-10-23 (commit `c365bac`). Diff tepat 33 baris, semuanya perubahan status dan nol derau format. **Sekarang 950 baris, seluruhnya `APPROVED` — tidak ada yang menunggu review.** Dugaan awal saya keliru dan perlu dicatat: 17 baris `REJECTED` saya kira hilang dari prod, ternyata ada dengan status dibalik jadi `APPROVED`. `lib/sagas.json` tidak berubah karena tak satu pun dari 33 itu bertipe `universe`/`remake`. Catatan cara ada di `CLAUDE.md`. Konteks lama: Idrus sudah meng-approve koneksi yang menunggu review, tetapi keputusan itu ada di prod dan belum pernah ditarik balik — berkas di repo adalah ekspor dari database LOKAL, jadi statusnya basi dan setiap hitungan "N menunggu review" yang dibaca dari sana salah. Sudah dua kali membuat laporan keliru. Prod sendiri aman: `import-connections.js` tidak pernah mengubah status baris yang sudah ada. Caranya: `docker exec surflix node scripts/export-connections.js` lalu `docker cp surflix:/app/scripts/connections-live.json /tmp/`, scp ke Mac, lalu import ke dev.db lokal. Lakukan **sebelum** import arah sebaliknya.
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
