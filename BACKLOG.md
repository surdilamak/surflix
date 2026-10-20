# BACKLOG.md — Surflix

> Hal-hal yang sengaja ditunda. Urut dari yang paling berdampak. Update file ini tiap ada yang selesai atau nambah.
> Terakhir diupdate: 2026-10-20 (setelah upgrade keamanan Next 15 / React 19).

## 🔴 Tindak lanjut cepat (setelah deploy terakhir)

- [x] **Verifikasi deep-link Tonton di Request Hub** (dicek Idrus, 2026-10-20: jalan). Tombol "Watch on Surflix" di detail modal sekarang nyari `jellyfinId` dari snapshot library lalu buka `#/details?id=…&serverId=…`. Film yang belum ada di snapshot jatuh ke home Jellyfin. Cek: buka satu film Available → klik Watch → harus langsung ke filmnya.
- [x] **Aktifin Sync library** (2026-10-20): env Jellyfin ter-deploy, tombol Sync library dicek Idrus dan jalan. (Key lama yang sempat ke-share di chat harus sudah di-revoke.) Tanpa ini snapshot library cuma update kalau import script dijalanin manual, jadi film baru gak punya deep-link / gak bisa dicari di portal. Langkah ada di bagian "Cara" bawah.
- [x] **Angka landing** (2026-10-20): `723 films · 194 series · 706 titles mapped`; `/api/upcoming` keisi lagi (20 film). `/api/most-requested` kosong itu wajar: syaratnya minimal 2 request untuk judul yang sama.
- [ ] **Sampling fakta koneksi.** 739 koneksi ditulis dari pengetahuan (belum diverifikasi online). Paling perlu dicek: kategori `talent` (siapa main/nulis apa) dan koneksi `visual` / `inspired` yang dulunya `confidence: medium`. Edit/hapus lewat `/admin/connections` → Manage.

## 🟠 Keamanan & hygiene

- [x] **Vulnerability npm runtime** (2026-10-20, PR #1): `npm audit --omit=dev` 14 → 0 (3 critical hilang). Next 14.2.15 → 15.5.28, React 18 → 19, axios 1.20, `node-telegram-bot-api` dibuang (tidak dipakai; Telegram pakai `fetch`), `overrides` postcss ^8.5.31. `eslint` + `eslint-config-next` + script `lint` dihapus (tidak ada konfigurasi eslint, tidak pernah jalan). Diverifikasi di produksi oleh Idrus (login admin, deep-link Watch).
- [ ] **Migrasi Tailwind 3 → 4** untuk menutup 7 temuan `npm audit` yang tersisa (dev-only, rantai `tailwindcss` 3: braces / micromatch / chokidar / postcss-nested). Tidak ikut image produksi, jadi tidak mendesak. Config & utilitas custom (`ios-*`, `surflix-*`) perlu dipindah ke CSS-first config; uji visual semua halaman.
- [ ] **Pasang linter lagi (opsional)**: eslint dibuang saat upgrade. Kalau mau, tambah `eslint` + `eslint-config-next` 15 dengan flat config.
- [ ] **Warning next/image logo** di `components/ui/top-nav.tsx` dan `footer.tsx` (kosmetik, sudah ada sebelum upgrade): set `width`/`height` auto pada logo.
- [x] **`/api/health` statis** (2026-10-20): beres sendiri oleh Next 15, GET handler tidak lagi di-cache default (dicek live: timestamp berubah tiap request). Yang wajib sehat cuma DB; Jellyseerr down tidak membuat container unhealthy.
- [ ] **Jellyseerr API key user-level** (known issue #1): `getMediaCount()` masih 403. Stats sudah dialihkan ke snapshot library, tapi kalau mau akurat untuk status "Available" di hub, regenerate key admin.

## 🟡 Konten Referensi

- [ ] **211 judul belum dipetakan** (lihat tab Coverage → *Not mapped yet*). Tambah manual via Manage → Add a connection. Prioritas: judul yang sering ditonton. Jangan ngarang hubungan demi angka.
- [ ] **Review terjemahan Indonesia** di `lib/i18n.ts` dan kolom `reason` (dibuat bareng teks Inggris, belum dibaca penutur native).
- [ ] **Nama file kotor di library Jellyfin** (`Requiem.for.a.Dream.2000.PROPER…`, `MIRCrew`). Snapshot sudah dibersihin otomatis (nama folder / OriginalTitle), tapi rapihin di Jellyfin kalau sempat (rename atau refresh metadata).
- [x] **Auto-sync library** (2026-10-20, menunggu deploy): webhook Jellyseerr `MEDIA_AVAILABLE` / `MEDIA_PARTIALLY_AVAILABLE` memanggil `scheduleLibrarySync()` (debounce 30 dtk, satu sync per rentetan event, tidak pernah melempar error, log di EventLog `library.autosync`). Berlaku juga untuk judul yang bukan dari request Surflix. Syarat di produksi: webhook Jellyseerr terpasang (Settings → Notifications → Webhook, URL `…/api/webhooks/jellyseerr`, header `Bearer <WEBHOOK_SECRET>`) dan env Jellyfin ada. Webhook sekarang menolak semua request kalau `WEBHOOK_SECRET` kosong.
- [ ] **Pipeline LLM (`/api/admin/connections/generate`) dorman.** Butuh `ANTHROPIC_API_KEY` + env Jellyfin. Sekarang kurasi manual; hapus atau hidupkan lagi nanti.

## 🟢 Produk & UX

- [x] **Metadata per film untuk share/SEO** (2026-10-20, menunggu deploy): `app/referensi/[type]/[id]/layout.tsx` (server) memasang `generateMetadata` dari `getFilmMeta()`: judul tab `Film (tahun): N connections · Surflix Referensi`, deskripsi dari satu alasan terbaik, og:image poster (TMDB kalau ada, kalau tidak gambar Primary Jellyfin publik), `metadataBase` di layout portal (`NEXT_PUBLIC_REFERENCE_URL` untuk override). Sisa ide: gambar OG komposit (poster + judul) dan sitemap.xml untuk halaman peta.
- [ ] **Galaxy**: filter per jenis koneksi, label kelompok, versi aksesibel (daftar teks), dan layout O(n²) di server perlu diganti (worker / precompute) kalau library > ~2000 titik.
- [ ] **Request Hub masih campur Indonesia/English**; portal Referensi dan landing sudah English. Putuskan: i18n hub atau seragamin satu bahasa.
- [ ] **Landing nge-hardcode URL** (`request.` / `reference.surflix.my.id`), jadi di lokal klik kartu keluar ke produksi. Turunkan dari hostname seperti `lib/hooks/use-portal.ts`.
- [ ] **Compose di Dockge ketinggalan dari repo** (`docker-compose.prod.yml` di repo sudah punya env Jellyfin/Anthropic; versi Dockge belum). Samain.

## 🧹 Bersih-bersih

- [ ] Hapus `components/connections/surflix-reference-graph-prototype.jsx` (prototype, gak dipakai) dan `lib/jellyseerr.ts.bak`.
- [ ] Dua gambar di `public/` (`HD.png`, `WhatsApp-Image-…png`) masih untracked sejak sebelum fitur Referensi: pakai atau hapus.
- [ ] `scripts/connections-seed.json` (hasil build kurasi, 44 masih "pending") vs `scripts/connections-live.json` (foto keputusan review): pilih satu sumber kebenaran setelah admin jadi alur utama, dan dokumentasikan di `WORKFLOW.md`.

---

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
