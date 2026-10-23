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

### Line-height — diaudit 2026-10-23

Bukan satu angka untuk semuanya. Tiga kelompok, masing-masing punya alasan:

| Kelompok | Rasio | Contoh |
|---|---|---|
| **Display** | 0,88–1,0 | `.ref-display` (44–80px), `.ref-how-word`. Tipe sebesar ini memang dirapatkan; 1,5 akan membuatnya tercerai-berai |
| **Judul dan label** | 1,05–1,3 | Judul bagian 1,05–1,1, judul kartu 1,2–1,25, label satu baris 1,0. Judul kartu sengaja rapat karena panjangnya satu sampai dua baris |
| **Prosa yang dibaca** | **1,45–1,5** | Nilai akar `.ref-root` 1,5; `.ref-caption` 1,5; `.ref-core-sub` 1,45 |

> Sebelum audit, akar memakai 1,4 dan `.ref-caption` — prosa 19px selebar 60ch, teks paling banyak dibaca di beranda — memakai **1,3**. Keduanya di bawah ambang keterbacaan. Dinaikkan; elemen yang memang perlu rapat sudah menimpanya sendiri sejak awal, jadi tidak ada yang ikut melar.

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

**Aturan dua tingkat, ditegakkan 2026-10-23:**

1. **Spasi tata letak (gap, margin antar blok, padding kontainer) harus kelipatan 4px.** Tidak ada pengecualian. Sudah diperiksa satu per satu dan 114 nilai disnap ke grid.
2. **Detail sejajar boleh 1–3px** — padding lencana, geseran optis ikon, jarak rambut. Memaksa grid 4px pada lencana setinggi 18px menghasilkan benda yang salah, bukan benda yang rapi.

Ilustrasi tiruan antarmuka di landing (`.lp-ui*`) **dikecualikan**: itu gambar sebuah aplikasi, bukan aplikasinya.

Nilai di bawah diambil dari hitungan pemakaian nyata di kelima berkas CSS, bukan dari cita-cita.

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

### Jarak atas isi

Satu token, `--pad-top: 112px` (96px di bawah 1024px), dipakai **semua halaman isi standar**: indeks Watch order, halaman saga, dan peta film. Ditegakkan 2026-10-23 — sebelumnya saga memakai `clamp(84px, 8vw, 96px)` sendiri, jadi menyimpang 16px dari dua lainnya.

**Halaman hero penuh TIDAK memakainya**, dan itu disengaja: beranda Reference memusatkan judulnya di dalam cincin poster, Galaxy menghamparkannya di atas kanvas, Just added menyejajarkannya ke bawah di samping poster besar. Memaksa satu nilai ke ketiganya merusak komposisinya.

Catatan jujur: judul halaman isi standar mendarat di 161–184px dari bilah, bukan di angka yang persis sama. Yang diseragamkan adalah **padding kontainernya**; yang berbeda adalah isi di atas judul — tautan kembali (~22px) di halaman saga versus bilah pencarian (~52px) di dua lainnya. Menambal selisihnya per halaman justru melanggar sistemnya.

### Menandai halaman yang sedang dibuka

**Setiap tautan navigasi lokal wajib menyetel `aria-current="page"` saat halamannya aktif**, termasuk saat pengunjung berada di halaman anaknya — `/timeline/mcu` menyalakan "Watch order", `/movie/299537` menyalakan "All maps". Gayanya sudah ada di `portal-bar.css` (`.pb-nav a[aria-current='page']`).

> Sampai 2026-10-23 `PortalHeader` milik Reference tidak menyetelnya sama sekali, jadi dari bilah atas pengunjung tidak bisa tahu ia sedang di halaman mana. `TopNav` milik Request Hub sudah benar sejak awal. Ini kegagalan **Trunk Test** — uji dasar: dari halaman mana pun, bisakah orang menjawab "saya di mana"?

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

> Katalog ini menulis **apa yang ada di kode**, bukan apa yang diinginkan. Kalau satu jenis komponen punya versi berbeda di tiap permukaan, itu ditulis apa adanya beserta **spesifikasi kanonnya** — target yang dituju kalau komponen itu disentuh lagi.
>
> Temuan utama audit 2026-10-23: Surflix **tidak kekurangan komponen**. Ia punya semua jenis yang dibutuhkan, tetapi tiga dari empat permukaan membangun versinya sendiri-sendiri. Yang benar-benar dipakai bersama baru PortalBar.

### Tombol

**Kanon:** tinggi minimum **48px**, radius `{rounded.md}` 8px, teks 16px berat **600**, target sentuh ≥44px. Hover menerang, ditekan menggelap, nonaktif jadi netral.

**`btn-primary`** — aksi utama, usahakan satu per layar
- Latar `{colors.accent}`, teks `{colors.accent-ink}`, padding `0 22px`.
- Hover `{colors.accent-hover}` + naik 2px · Ditekan `{colors.accent-active}` + `scale(0.98)` · Nonaktif latar `{colors.surface}` teks `{colors.muted}`.
- Dipakai: "Watch on Surflix", "Find a title", "Start watching", kirim permintaan.
- Implementasi: `.ref-btn` (Reference) dan `.rq-btn-primary` (Request Hub). **Disamakan 2026-10-23** — beratnya dulu 500 di Reference dan 600 di Hub, dan Hub menuliskan hex hover langsung alih-alih token.

**`btn-secondary`** — aksi kedua di sebelah aksi utama
- Latar `{colors.surface}` di permukaan terang, `{colors.raised}` di gelap. Teks `{colors.ink}`. Hover satu langkah lebih terang.
- Implementasi: `.ref-btn--secondary`, `.rq-btn-secondary`.

**`btn-light`** — primary dibalik untuk bidang gelap
- Latar putih `{colors.field-1-ink}`, teks `{colors.field-1}`. Dipakai saat tombol berdiri di atas hero atau panggung gelap, karena putih lebih menonjol di sana daripada oranye.
- Implementasi: `.ref-btn--light`.

**`btn-text`** — tautan yang berperilaku seperti tombol
- Tanpa latar, tanpa border, mewarisi warna teks. Dipakai di daftar tautan footer landing.
- Implementasi: `.lp-link-btn`.

### Pill dan chip

**`pb-pill`** + **`pb-pill-active`** — pemilih tiga situs dan bahasa
- Diam: latar transparan, teks `{colors.muted}`, tinggi 38px, radius `{rounded.full}`. Aktif: latar `{colors.accent}`, teks `{colors.accent-ink}`.
- Satu-satunya komponen yang **benar-benar dipakai bersama** lintas permukaan.

**`ref-lens`** — kendali tiga pandangan untuk satu judul
- Peta / Urutan tonton / Galaxy. Aktif `{colors.accent}`; sisanya `opacity: 0.6`, menyala saat hover.
- Lensa yang tidak berlaku **disembunyikan**; kalau tersisa satu, kendalinya tidak dirender sama sekali.

**`ref-saga-seg`** — sakelar Story / Release
- Wadah radius `{rounded.md}` berisi dua pill. Muncul **hanya kalau kedua urutan memang berbeda** (`twoOrders`).

**`ref-galaxy-rels`** — penyaring jenis hubungan di Galaxy
- Tujuh chip, satu per warna hubungan. Merangkap legenda warna — mematikan satu chip meredupkan koneksi jenis itu.

### Isian

**`input-text`**
- Kanon: tinggi minimum 48px (52px untuk bilah cari), radius `{rounded.md}`, latar `{colors.surface}` di gelap atau `{colors.bg}` di terang, fokus `outline: 2px solid {colors.accent}`.
- Implementasi: `.rq-input` dan `.ref-search input`. Keduanya setuju soal bentuk tetapi ditulis terpisah.

**`search-bar`** — isian cari dengan tombol menempel
- Isian + `btn-primary` menyatu: radius kiri `{rounded.md}`, kanan 0 pada isian, kebalikannya pada tombol.
- Implementasi: `.ref-search` (hero dan versi ringkas), `.rq-input--search`.

### Lencana

**`badge`** — penanda status kecil
- Kanon: radius `{rounded.sm}` 6px, padding `1px 7px`, teks **12px** berat 600–700, tinta `{colors.accent-ink}` di atas warna status.
- Implementasi: `.rq-badge-*` (empat warna semantik), `.ref-new-badge`, `.ref-galaxy-wait`. **Disamakan ke 12px pada 2026-10-23** — sebelumnya 11/11/12.
- **Lencana menempel pada bendanya, bukan pada teksnya.** `.ref-new-badge` dipindahkan ke sudut kiri-atas poster (8px dari tepi) pada 2026-10-23; sebelumnya ia disisipkan inline di dalam paragraf judul, sehingga memecah ritme baris dan terlempar ke baris sendiri setiap kali judulnya panjang.
- **Inspector menandai ini** (`small-text`, ambangnya 13px) dan itu **bukan positif palsu** melainkan keputusan yang diambil sadar: lencana seukuran teks isi berhenti terbaca sebagai penanda sekunder. Kalau nanti ada keluhan keterbacaan, naikkan ke 13px dan terima bahwa lencananya jadi lebih berat.

### Kartu

**`tile`** — ubin datar, bahasa dasar landing dan Request Hub
- Latar `{colors.surface}`, radius `{rounded.md}`, tanpa bayangan, tanpa garis tipis.
- Implementasi: `.lp-tile`, `.rq-tile`.

**`ref-run`** — baris saga di indeks Watch order
- Nama saga + deretan poster + tautan. Idiom contact sheet yang sama dengan beranda Reference.

**`ref-saga-card`** — satu judul di garis waktu
- Poster 100×150, titik `{colors.accent}` kalau terpilih, keterangan 13px.
- Di bawah zoom 55% keterangan disembunyikan supaya panggungnya terbaca sebagai peta, bukan daftar.

**`ref-saga-ghost`** — judul yang belum ada di library
- Kotak abu bertuliskan "Not on Surflix" dengan tautan ke Request Hub. Lubangnya ditampilkan, bukan disembunyikan.

**`ref-panel`** — keterangan melayang di atas panggung
- `position: absolute`, kanan `{spacing.md}`–32px, atas 24px, lebar `min(380px, …)`, latar `{colors.bg}`, padding `24px 26px 26px`. Di bawah 1024px jadi statis dan menumpuk.

### Pita penuh-layar

**`hero-dark`** — hero di atas `{colors.field-1}`
- Tinggi `max(100svh, 760px)` untuk beranda Reference; isi terpusat di dalam cincin poster.
- Implementasi: `.ref-hero`, `.ref-new-intro`, `.lp-hero`.

**`band-paper`** — pita krem `{colors.field-2}` untuk bagian penjelasan
- Implementasi: `.ref-how`, `.lp-section--paper`.

### Navigasi dan footer

**`pb-bar`** — PortalBar, satu baris sticky
- Logo + nama portal + tautan lokal + pill tiga situs + pill bahasa. Tinggi minimum 56px. Di bawah 767px logo, nama, dan tautan lokal disembunyikan.

**`footer`** — Implementasi terpisah: `.lp-footer` dan `.ref-footer`. Belum disatukan.

### Yang sengaja TIDAK ada

Pembanding PlayStation punya beberapa komponen yang **tidak dibuat** karena tidak ada kebutuhannya: `pagination-dot` (tidak ada halaman berhalaman), `carousel-paddle` (semua rel digulir langsung, bukan dengan tombol), dan `sub-nav` (PortalBar sudah menampung tautan lokal). Jangan membuatnya hanya demi kelengkapan.

## 9. Known Gaps

Hal yang **belum** rapi, dicatat supaya tidak terus-menerus ditemukan ulang:

- ~~Spasi melenceng dari grid 4px~~ — **ditinjau satu per satu dan dibereskan 2026-10-23.** 114 nilai disnap (6→8, 10→12, 14→16, 18→20, 22→24, 26→24, 30→32, 38/42→40, 5→4, 7→8, 9→8, 150→144). Yang tersisa hanya 2px dan 3px sebagai detail sejajar, sesuai aturan dua tingkat di bagian 6.
- ~~Tiga radius nyasar (99px, 10px, 12px)~~ — **diseragamkan 2026-10-23**. Skalanya kini bersih: 999px (15×), 8px (15×), 6px (5×), 4px (4×), 50% (2×).
- **Empat permukaan membangun komponen yang sama secara terpisah.** Tombol, isian, lencana, kartu, dan footer masing-masing punya versinya sendiri di `lp-`, `rq-`, `ref-`, dan `ad-`. Yang benar-benar dipakai bersama baru PortalBar. Menyatukannya adalah pekerjaan refaktor berisiko yang belum dilakukan; katalog di bagian 8 menuliskan spesifikasi kanonnya supaya pekerjaan berikutnya menuju ke sana, bukan menjauh.
- **`{colors.accent-tint}` dan `{colors.accent-soft}` belum terpakai.** Keduanya ditambahkan 2026-10-23 untuk melengkapi skala; belum ada komponen yang memakainya.
- **Landing dan Reference punya skala tipografi terpisah** (40/64px vs `--step-display` 44–80px). Itu disengaja — papan ubin versus halaman editorial — tetapi belum pernah ditulis sebagai dua skala bernama.
- **Admin memakai bahasa yang sama tetapi tidak diaudit** seteliti tiga permukaan tamu.
- **Footer masih tiga implementasi** (`.rq-footer`, `.lp-footer`, `.ref-footer`), tetapi **nilainya kini identik**: padding `64px … 24px` dan `margin-top: auto` di ketiganya. Yang belum adalah menyatukannya jadi satu komponen React; isinya memang berbeda (peta situs vs satu baris), jadi penyatuan berarti satu komponen dengan varian, bukan satu tampilan.
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
