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

Satu aksen untuk seluruh portal: **`#ff5200`**. Dipakai hanya untuk aksi utama dan penanda "kamu di sini". Jangan dipakai sebagai warna dekorasi.

### Aksen — sama di semua permukaan

| Token | Hex | Kegunaan |
|---|---|---|
| `accent` | `#ff5200` | Isian tombol utama, pill navigasi aktif, penanda terpilih |
| `accent-hover` | `#ff6a26` | Hover tombol utama (lebih **terang**, bukan lebih gelap) |
| `accent-active` | `#e04800` | Status ditekan |
| `accent-ink` | `#0d0d0f` | Teks/ikon **di atas** aksen. Jangan putih — kontrasnya kurang |

Arah turunan sengaja **menerang** saat hover karena tiga dari empat permukaan berlatar gelap; menerang membaca sebagai "terangkat".

### Permukaan gelap — landing, Request Hub, PortalBar

| Token | Hex | Kegunaan |
|---|---|---|
| `bg` | `#0d0d0f` | Latar halaman |
| `surface` | `#17171a` | Ubin, kartu |
| `raised` / `surface-2` | `#232327` | Ubin di atas ubin, **isian tombol sekunder** |
| `ink` | `#ffffff` | Teks utama |
| `muted` | `#a3a3ab` | Teks sekunder, placeholder |
| `paper` / `paper-ink` | `#ffffff` / `#0d0d0f` | Blok terang di dalam halaman gelap (landing) |

### Surflix Reference — permukaan terang

Reference adalah satu-satunya permukaan yang **terang**, dengan tinta navy, bukan hitam.

| Token | Hex | Kegunaan |
|---|---|---|
| `bg` | `#ffffff` | Latar halaman |
| `surface` | `#f4f4f2` | Blok netral, **isian tombol sekunder** |
| `ink` | `#1f2b4d` | Teks utama (navy, bukan hitam) |
| `muted` | `#6a7186` | Teks sekunder |
| `field-1` / `field-1-ink` / `field-1-muted` | `#05070a` / `#ffffff` / `#a9aebd` | Bidang gelap: hero, panggung 3D, Galaxy |
| `field-2` / `field-2-ink` | `#e3e1dc` | Bidang krem untuk bagian "cara kerja" |

### Semantik — Request Hub

| Token | Hex | Arti |
|---|---|---|
| `rq-green` | `#30d158` | Tersedia / selesai |
| `rq-blue` | `#64d2ff` | Sedang diproses |
| `rq-yellow` | `#ffd60a` | Menunggu |
| `rq-red` | `#ff6961` | Gagal / ditolak |

### Jenis hubungan — Reference

Tujuh warna untuk tujuh jenis koneksi. Dipakai di peta 3D, Galaxy, dan legenda jalur Watch order. **Jangan dipakai untuk hal lain.**

| Token | Hex | Hubungan |
|---|---|---|
| `rel-homage` | `#f7941d` | Homage |
| `rel-inspired` | `#4f8ff0` | Terinspirasi |
| `rel-visual` | `#8a8576` | Meminjam tampilan |
| `rel-remake` | `#1f9d7d` | Diceritakan ulang |
| `rel-universe` | `#7b859a` | Semesta sama |
| `rel-director` | `#9b59d0` | Sutradara sama |
| `rel-talent` | `#e0405f` | Pemain sama |

---

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

Satu radius untuk seluruh portal: **8px**.

| Bentuk | Nilai |
|---|---|
| Tombol, ubin, kartu, input, dropdown | `8px` |
| Pill navigasi, lencana status | penuh (`999px`) |
| Lencana kecil Request Hub | `6px` |

Tidak ada radius lain. Kalau butuh yang baru, berarti komponennya yang salah.

---

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

| Permukaan | Lebar isi | Margin tepi |
|---|---|---|
| Landing | penuh | `--m: 20px` |
| Request Hub | `rq-wrap` 1280px | sama |
| Reference | penuh | `--margin: clamp(16px, 2.2vw, 32px)` |

Titik henti: **1023px** (panel samping menumpuk), **767px** (telepon). PortalBar menyembunyikan logo, nama, dan tautan lokal di bawah 767px.

Panel samping Reference (`.ref-panel`, `.ref-galaxy-panel`) **menempel di atas panggung** (`position: sticky`), tidak pernah di dasarnya.

---

## 7. Motion

| Hal | Nilai |
|---|---|
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` (token `--ease`, sama di semua permukaan) |
| Tombol, hover | `0.18s` |
| Masuknya elemen | `0.8s` dengan jeda bertingkat 110ms |
| Munculnya canvas Galaxy | `1.2s` |

Semua animasi dimatikan di bawah `@media (prefers-reduced-motion: reduce)`.

---

## 8. Design Tokens — tempatnya

| Berkas | Isi |
|---|---|
| `app/globals.css` | `@theme` Tailwind: token `rq-*` |
| `app/landing/landing.css` | token `lp-*` dan skala landing |
| `app/(guest)/request.css` | komponen Request Hub |
| `app/referensi/referensi.css` | semua token dan komponen Reference |
| `components/portal-bar.css` | `--pb-*` |

CSS buatan sendiri **tidak berlayer**, jadi selalu menang atas utilitas Tailwind. Jangan menaruh `padding`/`margin` pada override seperti `.rq-root .input-ios` supaya `pl-12` dll tetap berlaku.

---

## 9. Positif palsu inspector

`scripts/inspect.mjs` dari taste-skill menandai empat hal yang **bukan cacat** di portal ini:

| Aturan | Kenapa palsu |
|---|---|
| `few-pictures` | Poster digambar ke `<canvas>`, tidak terhitung sebagai gambar |
| `edge-text` | Kartu di luar pandangan tetap punya rect walau sudah dipotong `overflow: hidden` |
| `body-size` | Di saga besar (28+ judul), label kartu peta 13px jumlahnya melebihi prosanya; teks baca sebenarnya 26px |
| `late-title` (Galaxy) | `.ref-galaxy-intro` sengaja `pointer-events: none` supaya langitnya tetap bisa digeser dari balik teks; judulnya tetap di atas secara visual (`z-index: 3`) |

`eyebrow` pada halaman saga juga palsu: "← All sagas" itu tautan kembali, bukan kicker.

Jalankan dengan `--allow edge-text,body-size`.
