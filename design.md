# Surflix — Design System

> Satu dokumen untuk empat permukaan: **landing** (`lp-`), **Request Hub** (`rq-`), **PortalBar** (`pb-`), dan **Surflix Reference** (`ref-`). Admin (`ad-`) mengikuti bahasa yang sama tetapi tidak dipakai tamu.
>
> Struktur dokumen mengikuti [design-system-skill](https://github.com/albertzhangz10/design-system-skill). Nilai di sini **dibaca dari CSS yang berjalan**, bukan diinginkan — kalau kode berubah, perbarui tabelnya.
>
> Aturan induk yang berlaku di semua permukaan: **ubin datar, satu radius, tanpa gradien, tanpa bayangan pada benda diam, tanpa garis tipis, tanpa kaca, tanpa emoji.**
>
> Terakhir diaudit: 2026-10-22.

---

## 1. Colors

> Setiap warna di bawah disertai **di mana ia dipakai**. Kalau sebuah token tidak punya kalimat itu, ia belum terpakai — dan itu ditandai.
> Angka kontras **diukur**, bukan ditaksir. Ambang WCAG AA: 4,5:1 untuk teks normal, 3:1 untuk teks besar (≥24px biasa / ≥18,7px tebal) dan untuk komponen antarmuka.

### Skala aksen

Satu warna untuk seluruh portal, **#ff5200**, dengan enam langkah turunan. Dipakai hanya untuk aksi utama dan penanda "kamu di sini" — jangan jadi warna dekorasi.

| Token | Hex | Kontras | Dipakai untuk |
|---|---|---|---|
| `{colors.accent-tint}` | `#fff1ea` | tinta `{colors.ink}` di atasnya 12,6:1 | Latar sangat lembut di permukaan terang. **Belum terpakai** — tersedia untuk pita sorot dan baris terpilih |
| `{colors.accent-soft}` | `#ffe7dc` | tinta `{colors.ink}` di atasnya 11,7:1 | Latar lembut, lencana, baris terpilih. **Belum terpakai** |
| `{colors.accent}` | `#ff5200` | 5,97:1 di bidang gelap · **3,25:1 di putih** | Isian tombol utama, pill navigasi aktif, penanda terpilih, titik "Start here" di panggung gelap |
| `{colors.accent-hover}` | `#ff6a26` | 6,79:1 di bidang gelap | Hover tombol utama. Arahnya **menerang**, karena tiga dari empat permukaan berlatar gelap |
| `{colors.accent-active}` | `#e04800` | 4,71:1 di bidang gelap | Keadaan ditekan |
| `{colors.accent-text}` | `#b83a00` | **5,76:1 di putih** | Teks dan tautan beraksen **di permukaan terang**. Dipakai di `.ref-saga-pairs a:hover` |
| `{colors.accent-ink}` | `#0d0d0f` | — | Tinta **di atas** aksen. Jangan putih: `#ffffff` di atas `#ff5200` cuma 2,8:1 |

**Aturan yang paling mudah dilanggar:** `{colors.accent}` di atas putih hanya **3,25:1**. Aman untuk isian tombol dan judul besar, **tidak aman untuk teks ukuran normal** — pakai `{colors.accent-text}`. Ini sudah pernah terjadi: tautan 15px di indeks Watch order memakai `{colors.accent}` dan gagal AA sampai diperbaiki 2026-10-23.

### Permukaan gelap — landing, Request Hub, PortalBar

| Token | Hex | Dipakai untuk |
|---|---|---|
| `{colors.bg}` | `#0d0d0f` | Latar halaman |
| `{colors.surface}` | `#17171a` | Ubin, kartu |
| `{colors.raised}` | `#232327` | Ubin di atas ubin, **isian tombol sekunder**, keadaan hover |
| `{colors.ink}` | `#ffffff` | Teks utama |
| `{colors.muted}` | `#a3a3ab` | Teks sekunder, placeholder |
| `{colors.paper}` / `{colors.paper-ink}` | `#ffffff` / `#0d0d0f` | Blok terang di dalam halaman gelap (landing) |

### Surflix Reference — permukaan terang

Satu-satunya permukaan terang, dan tintanya **navy, bukan hitam**.

| Token | Hex | Dipakai untuk |
|---|---|---|
| `{colors.bg}` | `#ffffff` | Latar halaman |
| `{colors.surface}` | `#f4f4f2` | Blok netral, isian tombol sekunder |
| `{colors.ink}` | `#1f2b4d` | Teks utama |
| `{colors.muted}` | `#6a7186` | Teks sekunder |
| `{colors.field-1}` | `#05070a` | **Bidang gelap**: hero, panggung 3D, panggung Watch order, Galaxy |
| `{colors.field-1-ink}` / `{colors.field-1-muted}` | `#ffffff` / `#a9aebd` | Teks di atas bidang gelap |
| `{colors.field-2}` / `{colors.field-2-ink}` | `#e3e1dc` / `#1f2b4d` | Bidang krem untuk bagian "cara kerja" |

### Semantik — Request Hub

| Token | Hex | Arti |
|---|---|---|
| `{colors.green}` | `#30d158` | Tersedia / selesai |
| `{colors.blue}` | `#64d2ff` | Sedang diproses |
| `{colors.yellow}` | `#ffd60a` | Menunggu |
| `{colors.red}` | `#ff6961` | Gagal / ditolak |

### Jenis hubungan — Reference

Tujuh warna untuk tujuh jenis koneksi, dipakai di peta 3D, Galaxy, dan legenda jalur Watch order. **Jangan dipakai untuk hal lain** — begitu dipinjam untuk keperluan lain, legendanya berhenti bermakna.

| Token | Hex | Hubungan |
|---|---|---|
| `{colors.rel-homage}` | `#f7941d` | Homage |
| `{colors.rel-inspired}` | `#4f8ff0` | Terinspirasi |
| `{colors.rel-visual}` | `#8a8576` | Meminjam tampilan |
| `{colors.rel-remake}` | `#1f9d7d` | Diceritakan ulang |
| `{colors.rel-universe}` | `#7b859a` | Semesta sama |
| `{colors.rel-director}` | `#9b59d0` | Sutradara sama |
| `{colors.rel-talent}` | `#e0405f` | Pemain sama |

## 2. Typography

| Permukaan | Font |
|---|---|
| Landing, Request Hub | **Bricolage Grotesque** |
| Surflix Reference | **Schibsted Grotesk** |
| PortalBar | mewarisi dari halaman induknya |

Dua permukaan punya **karakter berbeda dan itu disengaja**: landing adalah papan ubin dengan skala sedang, Reference adalah portal editorial dengan tipe display besar. Jangan "menyeragamkan" keduanya.

### Reference — skala

| Token | Ukuran | Dipakai untuk |
|---|---|---|
| `--step-display` | `clamp(2.75rem, 1rem + 5.2vw, 5rem)` → 44–80px | **Judul setiap halaman (h1). Satu ukuran untuk semuanya.** |
| `--step-head` | `clamp(2rem, 1.3rem + 3.2vw, 4rem)` → 32–64px | Judul bagian besar |
| `--step-lead` | `clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)` → 20–26px | Kalimat pembuka di bawah judul halaman; juga h2 kartu |
| `--step-body` | `clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)` → 17–19px | Teks isi |
| `--step-small` | `clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)` → 13–14px | Keterangan, meta |

Berat: 800 untuk display dan judul, 600 untuk penekanan, 400–500 untuk isi. Jarak huruf `-0.05em` pada display, `-0.03em` pada judul, 0 pada isi.

> **Jangan menulis `font-size` baru untuk judul halaman.** Sampai 2026-10-22 ada lima aturan h1 terpisah di `referensi.css` (63px–107px di layar 1440) yang lahir satu per satu. Semuanya sekarang menunjuk `--step-display`.

**Pengecualian yang disengaja:** `.ref-core-sub` (subjudul hero beranda) tetap 18px, bukan `--step-lead`. Hero itu komposisi terkurung di dalam cincin poster dengan `min-height: 5.4em` untuk teks berganti; membesarkannya mendorong kotak pencarian menabrak poster.

### Reference — pemakaian

| Elemen | Token |
|---|---|
| Judul halaman (semua halaman) | `--step-display` |
| Kalimat pembuka hero | `--step-lead` |
| Judul kartu / panel | `--step-lead`, berat 800 |
| Teks isi | `--step-body` |
| Label kartu peta, meta, keterangan | 13px (di bawah `--step-small`; peta bukan teks baca) |

### Landing — skala

| Ukuran | Dipakai untuk |
|---|---|
| 40px | h1 dan judul ubin |
| 64px | `.lp-head`, judul bagian |
| `--step-fig` 56–92px | **Angka statistik** ("723 film"), bukan judul |

---

## 3. Shape

### Skala radius

| Token | Nilai | Dipakai untuk | Jumlah pemakaian |
|---|---|---|---|
| `{rounded.none}` | 0px | Pita penuh-layar: hero, panggung, footer | — |
| `{rounded.xs}` | 4px | Lencana kecil, penanda | 4 |
| `{rounded.sm}` | 6px | Lencana status Request Hub, thumbnail daftar | 5 |
| `{rounded.md}` | **8px** | **Nilai utama**: tombol, ubin, kartu, isian, dropdown | 13 |
| `{rounded.full}` | 999px | Pill navigasi, lencana status, cakram tombol putar | 14 |

Ritmenya 4 / 6 / 8 / pill. **Kalau butuh radius baru, kemungkinan besar komponennya yang salah**, bukan skalanya yang kurang.

## 4. Elevation

Portal ini **datar**. Hanya ada dua tingkat.

| Level | Bayangan | Dipakai untuk |
|---|---|---|
| 0 | tidak ada | Semua benda diam: ubin, kartu, panel, tombol |
| 1 | `0 18px 44px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.2)` | **Hanya** benda melayang di atas halaman — saat ini cuma panel hasil pencarian |

Kedalaman dinyatakan lewat **warna permukaan** (`bg` → `surface` → `raised`), bukan bayangan.

---

## 5. Interaction States

| Status | Tombol utama | Tombol sekunder |
|---|---|---|
| Rest | `accent` + `accent-ink` | `surface`/`raised` + `ink` |
| Hover | `accent-hover` `#ff6a26`, naik 2px | satu langkah lebih terang |
| Pressed | `accent-active` `#e04800`, `scale(.98)` | satu langkah lagi |
| Disabled | `surface` + `muted`, `cursor: not-allowed`, tanpa transform | `opacity: .4` |
| Focus | `outline: 3px solid var(--accent); outline-offset: 3px` (global `.ref-root :focus-visible`) | sama |

Target sentuh minimal **44px**; tombol standar `min-height: 48px`.

> Sampai 2026-10-22 tombol Reference **tidak punya perubahan warna sama sekali** saat hover — `transition` menyebut `background` tetapi tidak ada nilai yang didefinisikan, jadi transisinya mati. Dan tidak ada tombol sekunder. Keduanya sekarang ada dan nilainya mengikuti `.rq-btn-*` di Request Hub.

---

## 6. Layout

### Skala spasi

**Satuan dasar 4px.** Nilai di bawah diambil dari hitungan pemakaian nyata di kelima berkas CSS, bukan dari cita-cita.

| Token | Nilai | Dipakai untuk | Jumlah |
|---|---|---|---|
| `{spacing.xxs}` | 4px | Jarak antar lencana, gap ikon-teks | 25 |
| `{spacing.xs}` | **8px** | **Paling sering**: gap grid, padding dalam pill | 51 |
| `{spacing.sm}` | 12px | Padding tombol kecil, gap antar baris | 40 |
| `{spacing.md}` | 16px | Padding kartu, margin tepi telepon | 39 |
| `{spacing.lg}` | 24px | Gap antar kartu, padding panel | 27 |
| `{spacing.xl}` | 40px | Jarak antar blok di dalam satu bagian | 13 |
| `{spacing.xxl}` | 64px | Jarak antar bagian | 9 |
| `{spacing.section}` | 80px | Nafas antar bab halaman | 9 |

Margin tepi global Reference: `--margin: clamp(16px, 2.2vw, 32px)` — 16px di telepon, 32px di layar lebar.

### Grid dan lebar isi

| Permukaan | Lebar isi | Margin tepi |
|---|---|---|
| Landing | penuh | `--m: 20px` |
| Request Hub | `rq-wrap` 1280px | sama |
| Reference | penuh | `--margin` |

### Titik henti

**1023px** — panel samping berhenti melayang dan menumpuk di bawah panggung. **767px** — PortalBar menyembunyikan logo, nama portal, dan tautan lokal; tombol melebar penuh.

### Pola panggung (Reference)

Ketiga pandangan — peta film 3D, Watch order, dan Galaxy — memakai **satu pola yang sama**:

- Panggung memakai **seluruh lebar**, tidak dipotong kolom apa pun.
- Panel keterangan **melayang**: `position: absolute; right: var(--margin); top: 24px`, lebar `min(380px, …)`.
- Supaya panel tidak menimbun apa pun, **semua perhitungan pemusatan di JS memakai "area terpakai"** = lebar panggung dikurangi jejak panel. Lihat `insetOf()` di `saga-stage.tsx` dan `panelInset()` di `connection-graph.tsx`; keduanya mengembalikan 0 saat panel statis, jadi satu kode melayani dua tata letak.
- Peta 3D tambahan: kameranya **digeser** sejauh setengah jejak panel, karena cincinnya terpusat dan tidak bisa digeser pengguna.

> Sampai 2026-10-22 panel mengambil kolom grid 400px, jadi panggungnya terpotong selebar itu (1040px dari 1440px).

**Jangan merebut gesture roda di peta 3D.** Panggungnya di tengah halaman yang perlu di-scroll; Galaxy boleh karena ia setinggi layar penuh.

## 7. Motion

| Hal | Nilai |
|---|---|
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` (token `--ease`, sama di semua permukaan) |
| Tombol, hover | `0.18s` |
| Masuknya elemen | `0.8s` dengan jeda bertingkat 110ms |
| Munculnya canvas Galaxy | `1.2s` |

Semua animasi dimatikan di bawah `@media (prefers-reduced-motion: reduce)`.

---

## 8. Components

Setiap entri: nama, satu kalimat tujuan, lalu spesifikasi dan **di mana ia dipakai**. Kalau sebuah komponen tidak punya kalimat "dipakai di", ia belum ada di kode.

### Tombol

**`btn-primary`** — aksi utama, satu per layar kalau bisa
- Latar `{colors.accent}`, teks `{colors.accent-ink}`, `{typography.body}` tebal 500–600, padding `0 22px`, tinggi minimum **48px**, radius `{rounded.md}`.
- Dipakai untuk "Watch on Surflix", "Find a title", "Start watching", kirim permintaan.
- Hover: latar `{colors.accent-hover}`, naik 2px. Ditekan: `{colors.accent-active}`, `scale(0.98)`.
- Nonaktif: latar `{colors.surface}`, teks `{colors.muted}`, tanpa transform, `cursor: not-allowed`.

**`btn-secondary`** — aksi kedua di sebelah aksi utama
- Latar `{colors.surface}` (terang) atau `{colors.raised}` (gelap), teks `{colors.ink}`, sisanya sama dengan primary.
- Hover: satu langkah lebih terang.

**`btn-light`** — primary dibalik untuk bidang gelap
- Latar `{colors.field-1-ink}` putih, teks `{colors.field-1}`. Dipakai saat tombol berdiri di atas hero atau panggung gelap, karena oranye di atas hitam kurang menonjol dibanding putih.

### Pill navigasi

**`pb-pill`** + **`pb-pill-active`**
- Diam: latar transparan, teks `{colors.muted}`, padding `0 14px`, tinggi 38px, radius `{rounded.full}`.
- Aktif: latar `{colors.accent}`, teks `{colors.accent-ink}`.
- Dipakai di PortalBar untuk tiga situs (Streaming / Request Hub / Reference) dan pasangan bahasa EN/ID.

### Lensa (Reference)

**`ref-lens`** — kendali tiga pandangan untuk satu judul
- Baris pill: Peta / Urutan tonton / Galaxy. Yang aktif memakai `{colors.accent}`; sisanya `opacity: 0.6` dan menyala saat hover.
- Muncul di halaman peta film, panel Galaxy, dan panel Watch order. **Lensa yang tidak berlaku disembunyikan** — tanpa saga tidak ada Urutan tonton; kalau tersisa satu, kendalinya tidak dirender sama sekali.

### Panel panggung

**`ref-panel`** — keterangan melayang di atas panggung
- `position: absolute`, kanan `{spacing.md}`–32px, atas 24px, lebar `min(380px, …)`, latar `{colors.bg}`, radius `{rounded.none}`, padding `24px 26px 26px`.
- Di bawah 1024px jadi `position: static` dan menumpuk di bawah panggung.

### Kartu saga

**`ref-saga-card`** — satu judul di garis waktu
- Poster 100×150, titik `{colors.accent}` kalau terpilih, keterangan 13px di bawahnya.
- Di bawah zoom 55% keterangan disembunyikan supaya panggungnya terbaca sebagai peta, bukan daftar.
- Judul yang tidak ada di library tampil sebagai **`ref-saga-ghost`**: kotak abu bertuliskan "Not on Surflix" dengan tautan ke Request Hub.

### Tombol putar di atas gambar (Jellyfin whitelabel)

Bukan bagian portal ini, tetapi memakai bahasa yang sama dan dicatat di `~/Developer/jellyfin-whitelabel/README.md`: diam = cakram gelap tembus pandang, hover = `{colors.accent}`. Orange hanya menyala saat jadi sasaran klik.

## 9. Known Gaps

Hal yang **belum** rapi, dicatat supaya tidak terus-menerus ditemukan ulang:

- **Spasi melenceng dari grid 4px.** Selain skala resmi, kode memakai 10px (34×), 14px (25×), 6px (22×), 22px (16×), 18px (12×) dan 2px (12×). Sebagian besar punya alasan optis, tetapi belum pernah ditinjau satu per satu.
- **Satu radius nyasar:** ada `99px` yang mestinya `999px`, plus `10px` dan `12px` masing-masing sekali — tiga nilai di luar skala.
- **`{colors.accent-tint}` dan `{colors.accent-soft}` belum terpakai.** Keduanya ditambahkan 2026-10-23 untuk melengkapi skala; belum ada komponen yang memakainya.
- **Landing dan Reference punya skala tipografi terpisah** (40/64px vs `--step-display` 44–80px). Itu disengaja — papan ubin versus halaman editorial — tetapi belum pernah ditulis sebagai dua skala bernama.
- **Admin memakai bahasa yang sama tetapi tidak diaudit** seteliti tiga permukaan tamu.
- **Kontras belum diaudit menyeluruh.** Yang sudah diukur: skala aksen, dan satu kegagalan di tautan 15px yang sudah diperbaiki. Pasangan warna lain belum.

## 10. Design Tokens — tempatnya

| Berkas | Isi |
|---|---|
| `app/globals.css` | `@theme` Tailwind: token `rq-*` |
| `app/landing/landing.css` | token `lp-*` dan skala landing |
| `app/(guest)/request.css` | komponen Request Hub |
| `app/referensi/referensi.css` | semua token dan komponen Reference |
| `components/portal-bar.css` | `--pb-*` |

CSS buatan sendiri **tidak berlayer**, jadi selalu menang atas utilitas Tailwind. Jangan menaruh `padding`/`margin` pada override seperti `.rq-root .input-ios` supaya `pl-12` dll tetap berlaku.

---

## 11. Positif palsu inspector

`scripts/inspect.mjs` dari taste-skill menandai empat hal yang **bukan cacat** di portal ini:

| Aturan | Kenapa palsu |
|---|---|
| `few-pictures` | Poster digambar ke `<canvas>`, tidak terhitung sebagai gambar |
| `edge-text` | Kartu di luar pandangan tetap punya rect walau sudah dipotong `overflow: hidden` |
| `body-size` | Di saga besar (28+ judul), label kartu peta 13px jumlahnya melebihi prosanya; teks baca sebenarnya 26px |
| `late-title` (Galaxy) | `.ref-galaxy-intro` sengaja `pointer-events: none` supaya langitnya tetap bisa digeser dari balik teks; judulnya tetap di atas secara visual (`z-index: 3`) |

`eyebrow` pada halaman saga juga palsu: "← All sagas" itu tautan kembali, bukan kicker.

Jalankan dengan `--allow edge-text,body-size`.
